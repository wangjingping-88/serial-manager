const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('serialApi', {
  getSnapshot: () => ipcRenderer.invoke('serial:get-snapshot'),
  refresh: () => ipcRenderer.invoke('serial:refresh'),
  saveAlias: (deviceKey, alias) => ipcRenderer.invoke('serial:save-alias', deviceKey, alias),
  showWindow: () => ipcRenderer.invoke('window:show'),
  minimizeToTray: () => ipcRenderer.invoke('window:minimize-to-tray'),
  onSnapshot: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('serial:snapshot', listener);
    return () => ipcRenderer.removeListener('serial:snapshot', listener);
  },
  onPortEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('serial:event', listener);
    return () => ipcRenderer.removeListener('serial:event', listener);
  }
});
