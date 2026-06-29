const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('serialApi', {
  getSnapshot: () => ipcRenderer.invoke('serial:get-snapshot'),
  refresh: () => ipcRenderer.invoke('serial:refresh'),
  saveAlias: (deviceKey, alias) => ipcRenderer.invoke('serial:save-alias', deviceKey, alias),
  saveGroup: (group) => ipcRenderer.invoke('serial:save-group', group),
  deleteGroup: (groupId) => ipcRenderer.invoke('serial:delete-group', groupId),
  saveGroupOrder: (groupIds) => ipcRenderer.invoke('serial:save-group-order', groupIds),
  assignGroup: (deviceKey, portName, groupId) => ipcRenderer.invoke('serial:assign-group', deviceKey, portName, groupId),
  saveOrder: (groupId, portKeys) => ipcRenderer.invoke('serial:save-order', groupId, portKeys),
  clearEvents: () => ipcRenderer.invoke('serial:clear-events'),
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
