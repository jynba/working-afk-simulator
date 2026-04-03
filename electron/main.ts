import dotenv from 'dotenv'
dotenv.config()
import fetch from 'node-fetch'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { app, BrowserWindow, ipcMain, safeStorage, shell, dialog, protocol, Notification } from 'electron'
import type { WebContents } from 'electron'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

type ElectronProtocolRequest = { url: string }
type ElectronProtocolCallback = (response: { path?: string; error?: number }) => void
type NotificationPayload = { title: string; body: string }
type ResizePayload = { width: number; height: number; horizontalAlign?: 'left' | 'right' }
type TapdConfigPayload = { token: string; userName: string; workspaceId: string; userRoleField: string }

let win: InstanceType<typeof BrowserWindow> | null

function createWindow() {
  win = new BrowserWindow({
    width: 440,
    height: 270,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    transparent: true,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is in development mode
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('web-contents-created', (_event: unknown, contents: WebContents) => {
  contents.on('will-navigate', (event: { preventDefault: () => void }) => {
    event.preventDefault()
  })
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  protocol.registerFileProtocol('local-resource', (request: ElectronProtocolRequest, callback: ElectronProtocolCallback) => {
    const url = request.url.replace(/^local-resource:\/\/\/?/, '');
    try {
      const decodedUrl = decodeURIComponent(url);
      // path.normalize will resolve the correct path on Windows (e.g., C:\Users\...)
      callback({ path: path.normalize(decodedUrl) });
    } catch (error) {
      console.error('ERROR: Could not decode URL', error);
      callback({ error: -6 }); // FILE_NOT_FOUND
    }
  });

  createWindow()

  ipcMain.handle('open-file-dialog', async () => {
    if (!win) {
      return
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    })
    if (!canceled && filePaths.length > 0) {
      const dirPath = filePaths[0]
      const fs = require('node:fs')
      const path = require('node:path')
      try {
        const files = fs.readdirSync(dirPath)
        const modelFile = files.find((file: string) => file.endsWith('.model3.json'))
        if (modelFile) {
          if (win) {
            win.focus();
          }
          return path.join(dirPath, modelFile);
        }
      } catch (error) {
        console.error('Failed to read directory or find model file:', error)
        return null
      }
    }
    return null
  })
})

ipcMain.on('show-notification', (_event: unknown, { title, body }: NotificationPayload) => {
  new Notification({ title, body }).show();
});

// --- IPC Handlers ---
ipcMain.on('resize-window', (_event: unknown, { width, height, horizontalAlign }: ResizePayload) => {
  if (win) {
    if (horizontalAlign === 'right') {
      const bounds = win.getBounds()
      const newX = bounds.x + (bounds.width - width)
      win.setBounds({ x: newX, y: bounds.y, width, height }, true)
    } else {
      win.setBounds({ width, height }, true) // `true` enables animation
    }
  }
})

// --- Secure Store Handlers ---
const configPath = path.join(app.getPath('userData'), 'config.json')

ipcMain.handle('set-tapd-config', async (_event: unknown, config: TapdConfigPayload) => {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error('Safe storage is not available.')
    throw new Error('Safe storage is not available.')
  }
  try {
    const encryptedToken = config.token ? safeStorage.encryptString(config.token) : null
    const newConfig = {
      encryptedToken,
      userName: config.userName,
      workspaceId: config.workspaceId,
      userRoleField: config.userRoleField,
    }
    require('node:fs').writeFileSync(configPath, JSON.stringify(newConfig))
  } catch (error) {
    console.error('Failed to save config:', error)
    throw error
  }
})

ipcMain.on('open-url', (_event: unknown, url: string) => {
  // Security: Ensure the URL is a valid TAPD URL before opening.
  if (url && url.includes('tapd.cn')) {
    shell.openExternal(url)
  }
})

ipcMain.handle('fetch-tapd', async (_event: unknown, url: string, options: any) => {
  try {
    const response = await fetch(url, options)

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('text/html')) {
      // Received an HTML page instead of JSON, likely a login redirect.
      console.error('IPC fetch-tapd Error: Authentication failed, received HTML instead of JSON.')
      return { error: 'Authentication failed. Please check your TAPD token.' }
    }

    if (!response.ok) {
      console.error(`IPC fetch-tapd Error: HTTP error! status: ${response.status} for URL: ${url}`)
      return {
        error: `HTTP error! status: ${response.status}`,
      }
    }

    const data = await response.json()
    console.log('IPC fetch-tapd successful response:', JSON.stringify(data, null, 2))
    return { data }
  } catch (e) {
    console.error('IPC fetch-tapd Error: A network or parsing error occurred.', e)
    const error = e as Error & { type?: string };
    // Add a check for invalid JSON, which can also indicate an auth issue.
    if (error.type === 'invalid-json') {
      return { error: 'Authentication failed. Invalid response from server.' }
    }
    return { error: error.message }
  }
})

ipcMain.handle('get-tapd-config', async () => {
  // Prioritize values from environment variables
  const envToken = process.env.TAPD_API_TOKEN
  const envWorkspaceId = process.env.TAPD_WORKSPACE_ID
  const envUserName = process.env.TAPD_NAME
  const envUserRoleField = process.env.TAPD_USER_ROLE_FIELD
  let fileToken: string | null = null
  let fileUserName: string | null = null
  let fileWorkspaceId: string | null = null
  let fileUserRoleField: string | null = null
  // Read fallback values from the config file
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const fileContent = await require('node:fs/promises').readFile(configPath, 'utf8')
      const config = JSON.parse(fileContent)
      if (config.encryptedToken) {
        // The Buffer object is serialized to a plain object by JSON.stringify.
        // We need to convert it back to a Buffer before passing it to decryptString.
        const encryptedBuffer = Buffer.from(config.encryptedToken.data)
        fileToken = safeStorage.decryptString(encryptedBuffer)
      } else {
        fileToken = null
      }
      fileUserName = config.userName || null
      fileWorkspaceId = config.workspaceId || null
      fileUserRoleField = config.userRoleField || null
    } catch (e) {
      const error = e as Error & { code?: string };
      if (error.code !== 'ENOENT') { // Ignore if the file just doesn't exist
        console.error('Failed to retrieve and parse config:', error)
      }
    }
  }

  // Return the merged configuration, giving precedence to environment variables
  return {
    token: fileToken || envToken,
    workspaceId: fileWorkspaceId || envWorkspaceId,
    userName: fileUserName || envUserName,
    userRoleField: fileUserRoleField || envUserRoleField,
  }
})
