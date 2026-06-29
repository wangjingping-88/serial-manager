const assert = require('node:assert/strict');
const test = require('node:test');

const { registerSerialIpcHandlers, registerWindowIpcHandlers } = require('../src/main/serial-ipc');

function createFakeIpcMain() {
  const handlers = new Map();
  return {
    handlers,
    handle: (channel, handler) => handlers.set(channel, handler)
  };
}

test('registerSerialIpcHandlers wires serial IPC channels to dependencies', async () => {
  const ipcMain = createFakeIpcMain();
  const calls = [];
  registerSerialIpcHandlers(ipcMain, {
    createSnapshot: () => 'snapshot',
    refreshPorts: (options) => {
      calls.push(['refreshPorts', options]);
      return 'refreshed';
    },
    saveAlias: (deviceKey, alias) => {
      calls.push(['saveAlias', deviceKey, alias]);
      return 'alias';
    },
    saveGroup: (group) => {
      calls.push(['saveGroup', group]);
      return 'group';
    },
    deleteGroup: (groupId) => {
      calls.push(['deleteGroup', groupId]);
      return 'deleted';
    },
    saveGroupOrder: (groupIds) => {
      calls.push(['saveGroupOrder', groupIds]);
      return 'ordered';
    },
    assignGroup: (deviceKey, portName, groupId) => {
      calls.push(['assignGroup', deviceKey, portName, groupId]);
      return 'assigned';
    },
    saveOrder: (groupId, portKeys) => {
      calls.push(['saveOrder', groupId, portKeys]);
      return 'saved-order';
    },
    clearEvents: () => {
      calls.push(['clearEvents']);
      return 'cleared';
    }
  });

  assert.equal(await ipcMain.handlers.get('serial:get-snapshot')(), 'snapshot');
  assert.equal(await ipcMain.handlers.get('serial:refresh')(), 'refreshed');
  assert.equal(await ipcMain.handlers.get('serial:save-alias')(null, 'dev1', '主控'), 'alias');
  assert.equal(await ipcMain.handlers.get('serial:save-group')(null, { name: 'Mesh' }), 'group');
  assert.equal(await ipcMain.handlers.get('serial:delete-group')(null, 'mesh'), 'deleted');
  assert.equal(await ipcMain.handlers.get('serial:save-group-order')(null, ['mesh']), 'ordered');
  assert.equal(await ipcMain.handlers.get('serial:assign-group')(null, 'dev1', 'COM1', 'mesh'), 'assigned');
  assert.equal(await ipcMain.handlers.get('serial:save-order')(null, 'mesh', ['dev1']), 'saved-order');
  assert.equal(await ipcMain.handlers.get('serial:clear-events')(), 'cleared');
  assert.deepEqual(calls[0], ['refreshPorts', { notifyDiff: false }]);
});

test('registerWindowIpcHandlers wires window IPC channels to dependencies', async () => {
  const ipcMain = createFakeIpcMain();
  const calls = [];

  registerWindowIpcHandlers(ipcMain, {
    showWindow: () => calls.push('show'),
    minimizeToTray: () => calls.push('minimize')
  });

  await ipcMain.handlers.get('window:show')();
  await ipcMain.handlers.get('window:minimize-to-tray')();

  assert.deepEqual(calls, ['show', 'minimize']);
});
