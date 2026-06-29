const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CLOSE_RESPONSE,
  getCloseResponseAction,
  showWindowIfAvailable
} = require('../src/main/window-lifecycle');

test('getCloseResponseAction maps dialog responses to lifecycle actions', () => {
  assert.equal(getCloseResponseAction(CLOSE_RESPONSE.MINIMIZE_TO_TRAY), 'hide');
  assert.equal(getCloseResponseAction(CLOSE_RESPONSE.QUIT), 'quit');
  assert.equal(getCloseResponseAction(CLOSE_RESPONSE.CANCEL), 'cancel');
  assert.equal(getCloseResponseAction(99), 'cancel');
});

test('showWindowIfAvailable shows, restores and focuses an existing minimized window', () => {
  const calls = [];
  const win = {
    show: () => calls.push('show'),
    isMinimized: () => true,
    restore: () => calls.push('restore'),
    focus: () => calls.push('focus')
  };

  assert.equal(showWindowIfAvailable(win), true);
  assert.deepEqual(calls, ['show', 'restore', 'focus']);
});

test('showWindowIfAvailable ignores missing windows', () => {
  assert.equal(showWindowIfAvailable(null), false);
});
