import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Codex operations
  codex: {
    login: () => ipcRenderer.invoke('codex:login'),
    logout: () => ipcRenderer.invoke('codex:logout'),
    status: () => ipcRenderer.invoke('codex:status'),
    exec: (command, options) => ipcRenderer.invoke('codex:exec', command, options),
    chat: (message, options) => ipcRenderer.invoke('codex:chat', message, options),
    apply: () => ipcRenderer.invoke('codex:apply')
  },

  // File system operations
  fs: {
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath)
  },

  // Settings
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    onChange: (callback) => {
      ipcRenderer.on('settings:changed', (event, data) => callback(data));
    }
  },

  // Dialog operations
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    saveFile: () => ipcRenderer.invoke('dialog:saveFile')
  },

  // Shell operations
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },

  // Window operations
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },

  // Menu event listeners
  menu: {
    onNewFile: (callback) => ipcRenderer.on('menu:newFile', callback),
    onOpenFile: (callback) => ipcRenderer.on('menu:openFile', callback),
    onOpenFolder: (callback) => ipcRenderer.on('menu:openFolder', callback),
    onSave: (callback) => ipcRenderer.on('menu:save', callback),
    onSaveAs: (callback) => ipcRenderer.on('menu:saveAs', callback),
    onToggleSidebar: (callback) => ipcRenderer.on('menu:toggleSidebar', callback),
    onToggleTerminal: (callback) => ipcRenderer.on('menu:toggleTerminal', callback),
    onCodexLogin: (callback) => ipcRenderer.on('menu:codexLogin', callback),
    onCodexLogout: (callback) => ipcRenderer.on('menu:codexLogout', callback),
    onApplyDiff: (callback) => ipcRenderer.on('menu:applyDiff', callback),
    onSettings: (callback) => ipcRenderer.on('menu:settings', callback),
    onAbout: (callback) => ipcRenderer.on('menu:about', callback)
  }
});