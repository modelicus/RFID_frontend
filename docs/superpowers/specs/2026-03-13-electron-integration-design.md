# Electron Integration Design

**Date:** 2026-03-13
**Project:** RFID Frontend
**Goal:** Package the existing Vite + React app as a standalone desktop application using Electron.

---

## Overview

Wrap the existing React + Vite RFID registration app in Electron so it can be distributed and run as a double-clickable desktop application on Windows and macOS — no browser or terminal required.

The Web Serial API (used to communicate with the RFID reader) works natively in Electron's embedded Chromium renderer, so no changes to `RFIDRegistration.tsx` are needed.

---

## Architecture

### Process model

- **Main process** (`electron/main.ts`): Electron entry point. Creates the `BrowserWindow`, configures window size and security settings, and loads either the Vite dev server URL (in development) or `dist/index.html` via `loadFile()` (in production).
- **Renderer process**: The existing React app, unchanged.

No preload script or IPC is needed — the app communicates with the external backend API directly from the renderer via `fetch`, same as today.

### New files

| File | Purpose |
|------|---------|
| `electron/main.ts` | Electron main process entry point |
| `electron/tsconfig.json` | TypeScript config for the main process (targets CommonJS/Node, not browser) |

### Modified files

| File | Change |
|------|--------|
| `package.json` | Add `"main": "dist-electron/main.js"`, new scripts, new devDependencies |
| `vite.config.ts` | Add `electron()` plugin from `vite-plugin-electron/simple` |

---

## Dependencies

All added as `devDependencies`:

- `electron` — Electron runtime
- `vite-plugin-electron` — integrates Electron main process build into Vite pipeline
- `electron-builder` — packages the app into a distributable installer
- `@types/node` — required for TypeScript to type `path`, `__dirname`, and `process` in `electron/main.ts`

> **Note:** This project uses `vite@^7.3.1`. Verify that the installed version of `vite-plugin-electron` declares Vite 7 as a supported peer before proceeding. As of early 2026, v0.29.x is the latest release; confirm peer compatibility at install time and pin to a working version if needed.

---

## `"type": "module"` conflict

The existing `package.json` has `"type": "module"`. Electron's main process requires CommonJS. `vite-plugin-electron` compiles `electron/main.ts` to `dist-electron/main.js` — it handles the CJS output internally, but the `electron/tsconfig.json` must explicitly set `"module": "CommonJS"` to ensure correct compilation regardless of the package-level `"type"` setting.

---

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `electron:dev` | `vite` | Start Vite dev server; the `vite-plugin-electron` plugin auto-launches Electron |
| `electron:build` | `tsc -b && vite build && electron-builder` | Type-check, build React app + compile main process + package with electron-builder |

> `electron:dev` is just `vite` — the plugin handles launching Electron when it detects dev mode. Do **not** use `electron . & vite` (race condition).
>
> **Note:** After wiring in the plugin, `npm run dev` will also launch Electron (because `vite-plugin-electron` is active in the Vite config for all `vite` invocations). The separate `electron:dev` script is kept for clarity, but both scripts are functionally equivalent.

---

## `vite.config.ts` change

Use the `simple` API from `vite-plugin-electron/simple`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      renderer: {},
    }),
  ],
  base: './',
})
```

The `renderer: {}` field is required by the simple API even though no preload script is used.

---

## `electron/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node10",
    "strict": true,
    "outDir": "../dist-electron",
    "rootDir": "."
  },
  "include": ["./**/*.ts"]
}
```

The root `tsconfig.json` (used by Vite/React) must also exclude the electron directory to prevent TypeScript from applying browser settings to Node-targeted code:

```json
// tsconfig.app.json — add:
"exclude": ["electron"]
```

---

## Main process (`electron/main.ts`)

Responsibilities:
1. Create a `BrowserWindow` (900×700, resizable)
2. In development (`VITE_DEV_SERVER_URL` env var is set by the plugin): `win.loadURL(process.env.VITE_DEV_SERVER_URL!)` — use `!` non-null assertion since the plugin guarantees the variable is set when in dev mode
3. In production: `win.loadFile(path.join(__dirname, '../dist/index.html'))` — `__dirname` in the packaged app points inside the asar/app bundle; verify this resolves correctly against the packaged output layout (`release/` → `resources/app/dist-electron/`). If the relative path breaks, use `path.join(app.getAppPath(), 'dist/index.html')` as an alternative.
4. Set `nodeIntegration: false`, `contextIsolation: true` (Electron security defaults)

---

## `package.json` additions

```json
{
  "main": "dist-electron/main.js",
  "scripts": {
    "electron:dev": "vite",
    "electron:build": "tsc -b && vite build && electron-builder"
  },
  "build": {
    "appId": "com.nvlv.rfid-registration",
    "productName": "RFID Registration",
    "files": ["dist/**", "dist-electron/**"],
    "directories": { "output": "release/" }
  }
}
```

> `"main"` points to `dist-electron/main.js` — the compiled output of `electron/main.ts`. The `files` field includes `dist-electron/` (not `electron/`), which is where the plugin writes the compiled main process.

---

## CORS

Both `loadFile()` and `loadURL('file://...')` result in `Origin: null` in the renderer. This means the backend at `http://localhost:3000` must be configured to accept `null` origin (e.g. `Access-Control-Allow-Origin: null` or `*`). `loadFile()` does **not** solve CORS — it is used because it is the idiomatic Electron API for loading local files, but backend CORS configuration is still required.

For this app (local-only deployment), allowing `null` origin on the backend is acceptable.

---

## Distribution (`electron-builder`)

Output goes to `release/` (git-ignored). Targets:
- macOS: `.dmg`
- Windows: `.exe` NSIS installer

Run with `npm run electron:build`.

---

## Out of scope

- Auto-updater
- Tray icon / system notifications
- App signing / notarization
- Preload scripts / IPC
- Switching from Web Serial API to Node.js `serialport` package
