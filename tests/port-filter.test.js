const assert = require('node:assert/strict');
const test = require('node:test');

const { createSearchSummary, filterPorts } = require('../src/shared/port-filter');

const ports = [
  {
    portName: 'COM7',
    alias: '网关AP',
    name: 'USB-SERIAL CH340 (COM7)',
    manufacturer: 'wch.cn',
    service: 'CH341SER_A64',
    groupName: 'AP'
  },
  {
    portName: 'COM8',
    alias: 'R4',
    name: 'USB-SERIAL CH340 (COM8)',
    manufacturer: 'wch.cn',
    service: 'CH341SER_A64',
    groupName: 'Mesh'
  },
  {
    portName: 'COM40',
    alias: '',
    name: 'USB Serial Port (COM40)',
    manufacturer: 'FTDI',
    service: 'FTSER2K',
    groupName: '网关'
  }
];

test('filterPorts matches ports by COM number, alias, device fields and group name', () => {
  assert.deepEqual(filterPorts(ports, 'com7').map((port) => port.portName), ['COM7']);
  assert.deepEqual(filterPorts(ports, '网关AP').map((port) => port.portName), ['COM7']);
  assert.deepEqual(filterPorts(ports, 'ftdi').map((port) => port.portName), ['COM40']);
  assert.deepEqual(filterPorts(ports, 'mesh').map((port) => port.portName), ['COM8']);
  assert.deepEqual(filterPorts(ports, 'CH341SER').map((port) => port.portName), ['COM7', 'COM8']);
});

test('filterPorts returns all ports when query is empty', () => {
  assert.equal(filterPorts(ports, '   ').length, ports.length);
});

test('filterPorts supports regular expression queries wrapped with slashes', () => {
  assert.deepEqual(filterPorts(ports, '/COM(7|8)$/').map((port) => port.portName), ['COM7', 'COM8']);
  assert.deepEqual(filterPorts(ports, '/ch341ser/i').map((port) => port.portName), ['COM7', 'COM8']);
});

test('filterPorts keeps invalid regular expressions from breaking search', () => {
  assert.deepEqual(filterPorts(ports, '/COM(/').map((port) => port.portName), []);
});

test('createSearchSummary describes filtered and unfiltered states', () => {
  assert.equal(createSearchSummary({ visibleCount: 3, totalCount: 3, query: '' }), '共 3 个');
  assert.equal(createSearchSummary({ visibleCount: 1, totalCount: 3, query: 'ap' }), '匹配 1 / 共 3');
});
