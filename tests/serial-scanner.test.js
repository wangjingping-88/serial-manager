const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizePort } = require('../src/main/serial-scanner');

test('normalizePort uses device id as stable key and resolves aliases from it', () => {
  const port = normalizePort({
    portName: 'COM12',
    deviceId: 'USB\\VID_1A86&PID_7523\\A1',
    name: 'USB-SERIAL CH340 (COM12)',
    manufacturer: 'wch.cn',
    status: 'OK',
    openState: 'open',
    service: 'CH341SER_A64'
  }, {
    'USB\\VID_1A86&PID_7523\\A1': '网关主控'
  });

  assert.equal(port.deviceKey, 'USB\\VID_1A86&PID_7523\\A1');
  assert.equal(port.alias, '网关主控');
  assert.equal(port.openState, 'open');
});

test('normalizePort falls back to port key and rejects invalid open state', () => {
  const port = normalizePort({
    portName: 'COM5',
    openState: 'busy'
  }, {
    'port:COM5': '备用串口'
  });

  assert.equal(port.deviceKey, 'port:COM5');
  assert.equal(port.alias, '备用串口');
  assert.equal(port.openState, 'unknown');
});
