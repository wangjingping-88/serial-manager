const assert = require('node:assert/strict');
const test = require('node:test');

const { buildNotificationBody, buildNotificationTitle } = require('../src/main/notification-content');

test('buildNotificationTitle returns clear Chinese titles by event type', () => {
  assert.equal(buildNotificationTitle('attached'), '串口已插入');
  assert.equal(buildNotificationTitle('detached'), '串口已拔出');
});

test('buildNotificationBody includes label, device name and manufacturer without duplicates', () => {
  const body = buildNotificationBody(
    { label: '网关主控 (COM12)', portName: 'COM12' },
    {
      name: 'USB-SERIAL CH340 (COM12)',
      description: 'USB-SERIAL CH340 (COM12)',
      manufacturer: 'wch.cn'
    }
  );

  assert.equal(body, '网关主控 (COM12)\nUSB-SERIAL CH340 (COM12)\nwch.cn');
});

test('buildNotificationBody does not repeat label or port name as details', () => {
  const body = buildNotificationBody(
    { label: 'COM12', portName: 'COM12' },
    {
      name: 'COM12',
      description: 'COM12',
      manufacturer: 'COM12'
    }
  );

  assert.equal(body, 'COM12');
});
