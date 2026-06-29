const { contextBridge } = require('electron');

const groups = [
  { id: 'mesh', name: 'Mesh测试长分组名称', color: '#1f9d55' },
  { id: 'ap', name: 'AP', color: '#138a8a' },
  { id: 'gateway', name: '网关', color: '#c17900' }
];

const ports = [
  createPort('COM6', '中心', 'USB Serial Port (COM6)', 'FTDI', 'FTSER2K', 'open', 'gateway'),
  createPort('COM7', '网关AP', 'USB-SERIAL CH340 (COM7)', 'wch.cn', 'CH341SER_A64', 'free', 'ap'),
  createPort('COM8', 'R4', 'USB-SERIAL CH340 (COM8)', 'wch.cn', 'CH341SER_A64', 'open', 'mesh'),
  createPort('COM9', 'R3', 'USB-SERIAL CH340 (COM9)', 'wch.cn', 'CH341SER_A64', 'open', 'mesh'),
  createPort('COM10', 'R1', 'USB-SERIAL CH340 (COM10)', 'wch.cn', 'CH341SER_A64', 'free', 'mesh'),
  createPort('COM11', 'R2', 'USB-SERIAL CH340 (COM11)', 'wch.cn', 'CH341SER_A64', 'open', 'mesh')
];

const snapshot = {
  ports,
  groups,
  orders: {},
  events: [
    createEvent('attached', ports[1], 30),
    createEvent('detached', ports[1], 60),
    createEvent('attached', ports[2], 90),
    createEvent('detached', ports[2], 120)
  ],
  updatedAt: new Date().toISOString()
};

function createPort(portName, alias, name, manufacturer, service, openState, groupId) {
  const group = groups.find((item) => item.id === groupId);
  return {
    portName,
    alias,
    deviceKey: `USB\\VID_1A86&PID_7523\\${portName}`,
    name,
    caption: name,
    description: name,
    manufacturer,
    status: 'OK',
    openState,
    service,
    groupId: group ? group.id : '',
    groupName: group ? group.name : '',
    groupColor: group ? group.color : ''
  };
}

function createEvent(type, port, secondsAgo) {
  return {
    id: `fixture-${type}-${port.portName}-${secondsAgo}`,
    type,
    portName: port.portName,
    label: port.alias ? `${port.alias} (${port.portName})` : port.portName,
    name: port.name,
    manufacturer: port.manufacturer,
    deviceKey: port.deviceKey,
    timestamp: new Date(Date.now() - secondsAgo * 1000).toISOString()
  };
}

contextBridge.exposeInMainWorld('serialApi', {
  getSnapshot: () => Promise.resolve(snapshot),
  refresh: () => Promise.resolve({ ...snapshot, updatedAt: new Date().toISOString() }),
  saveAlias: () => Promise.resolve(snapshot),
  saveGroup: () => Promise.resolve(snapshot),
  deleteGroup: () => Promise.resolve(snapshot),
  saveGroupOrder: () => Promise.resolve(snapshot),
  assignGroup: () => Promise.resolve(snapshot),
  saveOrder: () => Promise.resolve(snapshot),
  showWindow: () => Promise.resolve(),
  minimizeToTray: () => Promise.resolve(),
  onSnapshot: () => () => {},
  onPortEvent: () => () => {}
});
