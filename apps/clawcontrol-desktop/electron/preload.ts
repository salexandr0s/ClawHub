import { contextBridge, ipcRenderer } from 'electron'

interface DirectoryPickerResponse {
  canceled: boolean
  path: string | null
}

contextBridge.exposeInMainWorld('clawcontrolDesktop', {
  pickDirectory: async (defaultPath?: string): Promise<string | null> => {
    const result = await ipcRenderer.invoke('clawcontrol:pick-directory', {
      defaultPath,
    }) as DirectoryPickerResponse

    if (!result || result.canceled) return null
    return result.path
  },
})
