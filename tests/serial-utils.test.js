const assert = require('node:assert/strict');
const test = require('node:test');

const { sortPortNames, sortPorts } = require('../src/main/serial-utils');

test('sortPortNames orders COM names by numeric suffix', () => {
  assert.deepEqual(sortPortNames(['COM12', 'COM2', 'COM1']), ['COM1', 'COM2', 'COM12']);
});

test('sortPorts orders port objects by numeric suffix', () => {
  const result = sortPorts([{ portName: 'COM29' }, { portName: 'COM7' }, { portName: 'COM10' }]);

  assert.deepEqual(result.map((port) => port.portName), ['COM7', 'COM10', 'COM29']);
});
