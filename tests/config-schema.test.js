const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CURRENT_CONFIG_VERSION,
  normalizeAliasStore,
  normalizeGroupStore
} = require('../src/main/config-schema');

test('normalizeAliasStore migrates legacy alias map to versioned store', () => {
  const store = normalizeAliasStore({
    'USB\\VID_1A86&PID_7523\\A1': ' 网关主控 ',
    empty: '',
    objectValue: { bad: true }
  });

  assert.equal(store.schemaVersion, CURRENT_CONFIG_VERSION);
  assert.deepEqual(store.aliases, {
    'USB\\VID_1A86&PID_7523\\A1': '网关主控',
    objectValue: '[object Object]'
  });
});

test('normalizeAliasStore accepts versioned stores', () => {
  const store = normalizeAliasStore({
    schemaVersion: CURRENT_CONFIG_VERSION,
    aliases: {
      'port:COM12': '中心'
    }
  });

  assert.deepEqual(store.aliases, { 'port:COM12': '中心' });
});

test('normalizeGroupStore migrates legacy group store to versioned store', () => {
  const store = normalizeGroupStore({
    groups: [
      { id: 'mesh', name: ' Mesh测试 ', color: '#1f9d55' },
      { id: 'mesh', name: '重复', color: '#ca3d32' },
      { id: 'bad', name: '', color: '#ca3d32' }
    ],
    assignments: {
      'port:COM8': 'mesh',
      'port:COM9': 'missing'
    },
    orders: {
      all: ['port:COM8', 'port:COM8', 'port:COM9'],
      missing: ['port:COM1']
    }
  });

  assert.equal(store.schemaVersion, CURRENT_CONFIG_VERSION);
  assert.deepEqual(store.groups, [{ id: 'mesh', name: 'Mesh测试', color: '#1f9d55' }]);
  assert.deepEqual(store.assignments, { 'port:COM8': 'mesh' });
  assert.deepEqual(store.orders, { all: ['port:COM8', 'port:COM9'] });
});
