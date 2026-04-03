const FALLBACK_CONFIG_KEY = 'tapd_config_fallback'

export interface TapdConfig {
  token: string | null
  workspaceId?: string
  userName?: string
  userRoleField?: string
}

export interface TapdConfigInput {
  token: string
  workspaceId: string
  userName: string
  userRoleField: string
}

export function hasElectronIpc(): boolean {
  return typeof window !== 'undefined' && typeof window.ipcRenderer?.invoke === 'function'
}

function readFallbackConfig(): TapdConfig {
  try {
    const raw = localStorage.getItem(FALLBACK_CONFIG_KEY)
    if (!raw) return { token: null }
    return JSON.parse(raw)
  } catch (error) {
    console.warn('Failed to read fallback TAPD config:', error)
    return { token: null }
  }
}

function writeFallbackConfig(config: TapdConfigInput) {
  try {
    localStorage.setItem(FALLBACK_CONFIG_KEY, JSON.stringify(config))
  } catch (error) {
    console.warn('Failed to write fallback TAPD config:', error)
  }
}

export async function getTapdConfig(): Promise<TapdConfig> {
  if (window.secureStoreApi?.getTapdConfig) {
    return window.secureStoreApi.getTapdConfig()
  }

  return readFallbackConfig()
}

export async function setTapdConfig(config: TapdConfigInput): Promise<void> {
  if (window.secureStoreApi?.setTapdConfig) {
    await window.secureStoreApi.setTapdConfig(config)
    return
  }

  writeFallbackConfig(config)
}

export function showNotification(title: string, body: string) {
  if (window.electronApi?.showNotification) {
    window.electronApi.showNotification({ title, body })
    return
  }

  console.warn(`[${title}] ${body}`)
}

export async function openFileDialog(): Promise<string | null> {
  if (window.electronApi?.openFileDialog) {
    return window.electronApi.openFileDialog()
  }

  console.warn('openFileDialog is unavailable outside Electron.')
  return null
}

export function openExternalUrl(url: string) {
  if (window.shellApi?.openUrl) {
    window.shellApi.openUrl(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function ipcInvoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
  if (!hasElectronIpc()) {
    throw new Error(`IPC channel "${channel}" is unavailable outside Electron.`)
  }

  return window.ipcRenderer.invoke(channel, ...args)
}
