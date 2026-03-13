# Electron Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing Vite + React RFID registration app in Electron so it runs as a standalone desktop app (double-clickable, no browser or terminal needed).

**Architecture:** Add `vite-plugin-electron/simple` to the existing Vite config, create an Electron main process entry (`electron/main.ts`), and configure `electron-builder` for packaging. The React renderer and Web Serial API code are unchanged.

**Tech Stack:** Electron, vite-plugin-electron (simple API), electron-builder, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-13-electron-integration-design.md`

---

## Chunk 1: Install dependencies and scaffold main process

### Task 1: Install Electron dependencies

**Files:**
- Modify: `package.json` (devDependencies updated by npm)

**Note:** `@types/node` is already present in devDependencies — skip installing it.

- [ ] **Step 1: Check vite-plugin-electron peer compatibility with Vite 7**

Run:
```bash
npm info vite-plugin-electron peerDependencies
```
Expected: verify `vite` peer range includes `^7`. If the range caps at `^6`, pin to a version that supports Vite 7 or proceed knowing a peer warning will appear (functionally it may still work).

- [ ] **Step 2: Install dependencies**

```bash
npm install --save-dev electron vite-plugin-electron electron-builder
```

Expected: all three packages added to `devDependencies` in `package.json`, no errors. Peer warnings about Vite version are acceptable if the package installs.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install electron, vite-plugin-electron, electron-builder"
```

---

### Task 2: Create Electron main process TypeScript config

**Files:**
- Create: `electron/tsconfig.json`

- [ ] **Step 1: Add `"exclude": ["electron"]` to `tsconfig.app.json`**

Open `tsconfig.app.json` and add `"exclude": ["electron"]` at the top level (alongside `"compilerOptions"` and `"include"`):

```json
{
  "compilerOptions": { ... },
  "include": ["src"],
  "exclude": ["electron"]
}
```

This prevents TypeScript tooling from applying browser settings to Node-targeted main process code.

- [ ] **Step 2: Create `electron/tsconfig.json`**

Create file `electron/tsconfig.json` with this exact content:

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

- [ ] **Step 3: Commit**

```bash
git add tsconfig.app.json electron/tsconfig.json
git commit -m "feat: add electron/tsconfig.json for main process compilation"
```

---

### Task 3: Create Electron main process entry

**Files:**
- Create: `electron/main.ts`

There is no unit-testable logic here — this file is pure Electron integration (window creation, file loading). Correctness is verified by running the app in Task 5.

- [ ] **Step 1: Create `electron/main.ts`**

Create file `electron/main.ts` with this exact content:

```ts
import { app, BrowserWindow } from 'electron'
import path from 'path'

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add electron main process entry"
```

---

## Chunk 2: Wire up Vite config and package.json

### Task 4: Update vite.config.ts to add Electron plugin

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Update `vite.config.ts`**

Replace the entire file content with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// https://vite.dev/config/
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

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add vite-plugin-electron/simple to vite config"
```

---

### Task 5: Update package.json with main field, scripts, and electron-builder config

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update `package.json`**

Add the following fields to `package.json`. The final file should look like:

```json
{
  "name": "rfid-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "electron:dev": "vite",
    "electron:build": "tsc -b && vite build && electron-builder"
  },
  "build": {
    "appId": "com.nvlv.rfid-registration",
    "productName": "RFID Registration",
    "files": [
      "dist/**",
      "dist-electron/**"
    ],
    "directories": {
      "output": "release/"
    }
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "electron": "<installed version>",
    "electron-builder": "<installed version>",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.48.0",
    "vite": "^7.3.1",
    "vite-plugin-electron": "<installed version>"
  }
}
```

> Do not copy the version placeholders (`<installed version>`) — keep whatever versions `npm install` wrote in Task 1. Only add `"main"`, `"build"`, `"electron:dev"`, and `"electron:build"` — leave everything else as-is.

- [ ] **Step 2: Add `release/` and `dist-electron/` to `.gitignore`**

If a `.gitignore` file exists, add these lines. If it doesn't exist, create it:

```
release/
dist-electron/
```

- [ ] **Step 3: Commit**

```bash
git add package.json .gitignore
git commit -m "feat: configure package.json for electron-builder and add scripts"
```

---

## Chunk 3: Verify and package

### Task 6: Verify dev mode works

**Files:** none

- [ ] **Step 1: Run in dev mode**

```bash
npm run electron:dev
```

Expected: Vite dev server starts (terminal prints the local URL, e.g. `http://localhost:5173`), then Electron launches automatically and an Electron window opens displaying the RFID Registration app. The "Połącz z czytnikiem" button should be visible.

Verify the plugin injected `VITE_DEV_SERVER_URL` by confirming the terminal output shows a dev server URL — if it is missing, Electron will attempt `loadFile` instead of `loadURL`, and the app will likely show a blank window.

If the window is blank: open DevTools (`Cmd+Option+I` / `F12`) and check the Console tab for errors. If Electron doesn't launch at all, verify the `"main": "dist-electron/main.js"` field is present in `package.json`.

- [ ] **Step 2: Close the Electron window and terminate the dev server (Ctrl+C)**

---

### Task 7: Build and package the app

**Files:** none (output goes to `release/`)

- [ ] **Step 1: Run the build**

```bash
npm run electron:build
```

Expected:
- `tsc -b` type-checks the project
- Vite compiles the React app to `dist/`
- `vite-plugin-electron` compiles `electron/main.ts` to `dist-electron/main.js`
- `electron-builder` packages everything into `release/`
- On macOS: `release/RFID Registration-<version>.dmg` and/or `release/mac/RFID Registration.app`
- On Windows: `release/RFID Registration Setup <version>.exe`

> **Cross-platform builds:** `electron-builder` builds for the current platform by default. Building a Windows `.exe` from macOS requires Wine and will likely fail without a CI pipeline. To build only for the current platform, `electron-builder` will auto-detect it. If you need a specific target, run `npx electron-builder --mac` or `npx electron-builder --win` explicitly.

- [ ] **Step 2: Test the packaged app**

On macOS: open `release/mac/RFID Registration.app` (or mount the `.dmg`)
On Windows: run the `.exe` installer

Expected: app opens, displays the RFID Registration UI, "Połącz z czytnikiem" button is present and clickable.

**If `loadFile` path fails (blank window in packaged app):**
Edit `electron/main.ts` — `app` is already imported, so only change this one line:
```ts
// change from:
win.loadFile(path.join(__dirname, '../dist/index.html'))
// to:
win.loadFile(path.join(app.getAppPath(), 'dist/index.html'))
```
Then re-run `npm run electron:build` and test again.

- [ ] **Step 3: Commit**

If `electron/main.ts` was modified in the loadFile fallback above, commit it:
```bash
git add electron/main.ts
git commit -m "fix: use app.getAppPath() for loadFile in packaged app"
```

If no source files were changed (packaging succeeded on the first try), there is nothing to commit — skip this step.

---

## Notes

**CORS:** When the packaged app calls `http://localhost:3000/api/register`, the backend will receive `Origin: null`. The backend must allow this origin (`Access-Control-Allow-Origin: null` or `*`) or registration submissions will fail with a CORS error. This is a backend configuration concern, not a frontend one.

**Web Serial API:** Works in Electron's Chromium renderer without any changes. The "Połącz z czytnikiem" button triggers `navigator.serial.requestPort()` which will open the native serial port picker dialog.
