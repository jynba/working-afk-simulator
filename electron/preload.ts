import { ipcRenderer, contextBridge } from 'electron'

// --- Window API ---
export interface IWindowApi {
  resizeWindow: (width: number, height: number) => void
}

const windowApi: IWindowApi = {
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),
}

contextBridge.exposeInMainWorld('windowApi', windowApi)

// --- Secure Store API ---
export interface ITapdConfig {
  token: string | null
  workspaceId: string | undefined
  userName: string | undefined
  userRoleField: string | undefined
}

export interface ISecureStoreApi {
  setTapdConfig: (config: { token: string; userName: string; workspaceId: string; userRoleField: string }) => void
  getTapdConfig: () => Promise<ITapdConfig>
}

const secureStoreApi: ISecureStoreApi = {
  setTapdConfig: (config) => ipcRenderer.send('set-tapd-config', config),
  getTapdConfig: () => ipcRenderer.invoke('get-tapd-config'),
}

contextBridge.exposeInMainWorld('secureStoreApi', secureStoreApi)

// --- Shell API ---
export interface IShellApi {
  openUrl: (url: string) => void
}

const shellApi: IShellApi = {
  openUrl: (url) => ipcRenderer.send('open-url', url),
}

contextBridge.exposeInMainWorld('shellApi', shellApi)

// --- IPC Renderer for general purpose calls ---
const electronApi = {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  showNotification: (options: { title: string; body: string }) => ipcRenderer.send('show-notification', options),
}

contextBridge.exposeInMainWorld('electronApi', electronApi)

// --- IPC Renderer for general purpose calls ---
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
})

