function registerSerialIpcHandlers(ipcMain, deps) {
  ipcMain.handle('serial:get-snapshot', () => deps.createSnapshot());
  ipcMain.handle('serial:refresh', () => deps.refreshPorts({ notifyDiff: false }));
  ipcMain.handle('serial:save-alias', (_event, deviceKey, alias) => deps.saveAlias(deviceKey, alias));
  ipcMain.handle('serial:save-group', (_event, group) => deps.saveGroup(group));
  ipcMain.handle('serial:delete-group', (_event, groupId) => deps.deleteGroup(groupId));
  ipcMain.handle('serial:save-group-order', (_event, groupIds) => deps.saveGroupOrder(groupIds));
  ipcMain.handle('serial:assign-group', (_event, deviceKey, portName, groupId) => deps.assignGroup(deviceKey, portName, groupId));
  ipcMain.handle('serial:save-order', (_event, groupId, portKeys) => deps.saveOrder(groupId, portKeys));
  ipcMain.handle('serial:clear-events', () => deps.clearEvents());
}

function registerWindowIpcHandlers(ipcMain, deps) {
  ipcMain.handle('window:show', () => deps.showWindow());
  ipcMain.handle('window:minimize-to-tray', () => deps.minimizeToTray());
}

module.exports = {
  registerSerialIpcHandlers,
  registerWindowIpcHandlers
};
