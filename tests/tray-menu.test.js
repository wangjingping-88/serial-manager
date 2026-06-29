const assert = require('node:assert/strict');
const test = require('node:test');

const { createTrayMenuTemplate } = require('../src/main/tray-menu');

test('createTrayMenuTemplate creates expected menu labels and actions', () => {
  const calls = [];
  const template = createTrayMenuTemplate({
    showWindow: () => calls.push('show'),
    refresh: () => calls.push('refresh'),
    quit: () => calls.push('quit')
  });

  assert.deepEqual(template.map((item) => item.label || item.type), ['显示窗口', '立即刷新', 'separator', '退出']);

  template[0].click();
  template[1].click();
  template[3].click();

  assert.deepEqual(calls, ['show', 'refresh', 'quit']);
});
