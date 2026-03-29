import { app, BrowserWindow, dialog } from 'electron'
import * as path from 'path'

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Allow Web Serial API access
  win.webContents.session.setPermissionCheckHandler((_wc, permission) => {
    if (permission === 'serial') return true
    return false
  })

  win.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') return true
    return false
  })

  // Handle serial port picker (Electron doesn't show browser's native picker)
  win.webContents.session.on('select-serial-port', (event, portList, _wc, callback) => {
    event.preventDefault()
    if (portList.length === 0) {
      callback('')
      return
    }
    if (portList.length === 1) {
      callback(portList[0].portId)
      return
    }
    const buttons = portList.map((p) => p.displayName || p.portName || p.portId)
    dialog.showMessageBox(win, {
      type: 'question',
      title: 'Wybierz port',
      message: 'Wybierz czytnik RFID:',
      buttons,
    }).then(({ response }) => {
      callback(portList[response].portId)
    })
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!)
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist/index.html'))
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
