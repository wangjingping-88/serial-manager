const assert = require('node:assert/strict');
const test = require('node:test');

const { addPortEvent, clearEventHistory, createEventHistory } = require('../src/main/port-event-history');

function createPort(portName = 'COM12') {
  return {
    portName,
    deviceKey: `USB\\${portName}`,
    name: `USB-SERIAL CH340 (${portName})`,
    manufacturer: 'wch.cn'
  };
}

test('addPortEvent creates a bounded port event with display label', () => {
  const history = createEventHistory({ limit: 2, dedupeMs: 1200 });
  const event = addPortEvent(history, {
    type: 'attached',
    port: createPort('COM12'),
    label: '网关主控 (COM12)',
    now: 1000
  });

  assert.equal(event.type, 'attached');
  assert.equal(event.portName, 'COM12');
  assert.equal(event.label, '网关主控 (COM12)');
  assert.equal(event.timestamp, new Date(1000).toISOString());
  assert.deepEqual(history.events, [event]);
});

test('addPortEvent suppresses duplicate events inside dedupe window', () => {
  const history = createEventHistory({ dedupeMs: 1200 });
  const first = addPortEvent(history, {
    type: 'attached',
    port: createPort('COM12'),
    label: 'COM12',
    now: 1000
  });
  const duplicate = addPortEvent(history, {
    type: 'attached',
    port: createPort('COM12'),
    label: 'COM12',
    now: 1500
  });

  assert.ok(first);
  assert.equal(duplicate, null);
  assert.equal(history.events.length, 1);
});

test('addPortEvent keeps only the configured number of newest events', () => {
  const history = createEventHistory({ limit: 2, dedupeMs: 0 });

  addPortEvent(history, { type: 'attached', port: createPort('COM1'), label: 'COM1', now: 1000 });
  addPortEvent(history, { type: 'attached', port: createPort('COM2'), label: 'COM2', now: 2000 });
  addPortEvent(history, { type: 'attached', port: createPort('COM3'), label: 'COM3', now: 3000 });

  assert.deepEqual(history.events.map((event) => event.portName), ['COM3', 'COM2']);
});

test('clearEventHistory removes events and allows the next same event immediately', () => {
  const history = createEventHistory({ limit: 2, dedupeMs: 1200 });

  addPortEvent(history, { type: 'attached', port: createPort('COM1'), label: 'COM1', now: 1000 });
  clearEventHistory(history);
  const event = addPortEvent(history, { type: 'attached', port: createPort('COM1'), label: 'COM1', now: 1100 });

  assert.deepEqual(history.events, [event]);
  assert.ok(event);
});
