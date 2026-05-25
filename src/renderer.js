const MIN_SCAN_MS = 650;

const state = {
  ports: [],
  events: [],
  updatedAt: null,
  editingKey: null,
  aliasDraft: '',
  savingAliasKey: null,
  isScanning: true,
  scanStartedAt: performance.now(),
  portSignature: '',
  eventSignature: ''
};

const elements = {
  portCount: document.querySelector('#portCount'),
  aliasCount: document.querySelector('#aliasCount'),
  updatedAt: document.querySelector('#updatedAt'),
  portsList: document.querySelector('#portsList'),
  eventsList: document.querySelector('#eventsList'),
  scanLoader: document.querySelector('#scanLoader'),
  emptyPorts: document.querySelector('#emptyPorts'),
  emptyEvents: document.querySelector('#emptyEvents'),
  scanStatus: document.querySelector('#scanStatus'),
  refreshButton: document.querySelector('#refreshButton'),
  trayButton: document.querySelector('#trayButton')
};

function formatTime(value) {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date(value));
}

function receiveSnapshot(snapshot) {
  if (!state.isScanning) {
    applySnapshot(snapshot);
    return;
  }

  const elapsed = performance.now() - state.scanStartedAt;
  const delay = Math.max(0, MIN_SCAN_MS - elapsed);
  window.setTimeout(() => {
    state.isScanning = false;
    applySnapshot(snapshot);
  }, delay);
}

function applySnapshot(snapshot) {
  const nextPorts = snapshot.ports || [];
  const nextEvents = snapshot.events || [];
  const nextPortSignature = createPortSignature(nextPorts);
  const nextEventSignature = createEventSignature(nextEvents);
  const shouldRenderPorts = nextPortSignature !== state.portSignature && !isAliasEditingActive();
  const shouldRenderEvents = nextEventSignature !== state.eventSignature;

  state.ports = nextPorts;
  state.events = nextEvents;
  state.updatedAt = snapshot.updatedAt;
  state.portSignature = nextPortSignature;
  state.eventSignature = nextEventSignature;

  renderSummary();
  updateVisibility();

  if (shouldRenderPorts) {
    renderPorts();
  }
  if (shouldRenderEvents) {
    renderEvents();
  }
}

function createPortSignature(ports) {
  return ports
    .map((port) => [
      port.deviceKey,
      port.portName,
      port.alias,
      port.name,
      port.manufacturer,
      port.status,
      port.openState,
      port.service
    ].join('|'))
    .join('\n');
}

function createEventSignature(events) {
  return events.map((event) => event.id).join('|');
}

function isAliasInputActive() {
  return document.activeElement && document.activeElement.classList.contains('alias-input');
}

function isAliasEditingActive() {
  return Boolean(state.editingKey && isAliasInputActive());
}

function renderSummary() {
  elements.portCount.textContent = state.ports.length;
  elements.aliasCount.textContent = state.ports.filter((port) => port.alias).length;
  elements.updatedAt.textContent = formatTime(state.updatedAt);
}

function updateVisibility() {
  elements.scanLoader.hidden = !state.isScanning;
  elements.portsList.hidden = state.isScanning || state.ports.length === 0;
  elements.emptyPorts.hidden = state.isScanning || state.ports.length > 0;
  elements.emptyEvents.hidden = state.events.length > 0;
}

function renderPorts() {
  elements.portsList.replaceChildren(...state.ports.map(createPortCard));
}

function createPortCard(port) {
  const card = document.createElement('article');
  card.className = 'port-card';
  card.append(createStatusDot(port.status));

  const main = document.createElement('div');
  main.className = 'port-main';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'port-title';

  const badge = document.createElement('span');
  badge.className = 'port-badge';
  badge.textContent = port.portName || 'COM?';

  titleGroup.append(badge, createAliasView(port), createDeviceName(port));
  main.append(titleGroup, createPortMeta(port));

  card.append(main);
  return card;
}

function createAliasView(port) {
  if (state.editingKey === port.deviceKey) {
    return createAliasEditor(port);
  }

  const group = document.createElement('div');
  group.className = 'alias-view';

  const title = document.createElement('strong');
  title.textContent = port.alias || '未命名';
  title.className = port.alias ? '' : 'muted-title';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'edit-icon-button';
  editButton.title = '编辑名称';
  editButton.setAttribute('aria-label', `编辑 ${port.portName || '串口'} 名称`);
  editButton.textContent = '✎';
  editButton.addEventListener('click', () => beginAliasEdit(port));

  group.append(title, editButton);
  return group;
}

function createDeviceName(port) {
  const deviceName = document.createElement('span');
  deviceName.className = 'device-name';
  deviceName.textContent = port.name || port.description || '未知设备';
  return deviceName;
}

function beginAliasEdit(port) {
  state.editingKey = port.deviceKey;
  state.aliasDraft = port.alias || '';
  renderPorts();
  const input = document.querySelector('.alias-input');
  if (input) {
    input.focus();
    input.select();
  }
}

function createPortMeta(port) {
  const meta = document.createElement('div');
  meta.className = 'port-meta';
  meta.append(
    createMetaChip('厂商', port.manufacturer || '未知'),
    createMetaChip('服务', port.service || '未知'),
    createMetaChip('', getOpenStateText(port.openState), `open-state ${getOpenStateClass(port.openState)}`)
  );
  return meta;
}

function createStatusDot(status) {
  const dot = document.createElement('span');
  const isOk = String(status || '').toUpperCase() === 'OK';
  dot.className = `status-dot ${isOk ? 'is-ok' : 'is-warn'}`;
  dot.title = `设备状态：${status || '未知'}`;
  return dot;
}

function createMetaChip(label, value, valueClassName = '') {
  const item = document.createElement('span');
  item.className = 'meta-chip';

  if (label) {
    const labelNode = document.createElement('span');
    labelNode.className = 'meta-label';
    labelNode.textContent = label;
    item.append(labelNode);
  }

  const valueNode = document.createElement('strong');
  valueNode.textContent = value;
  if (valueClassName) {
    valueNode.className = valueClassName;
  }

  item.append(valueNode);
  return item;
}

function getOpenStateText(openState) {
  if (openState === 'open') {
    return '已打开';
  }
  if (openState === 'free') {
    return '未打开';
  }
  return '未知';
}

function getOpenStateClass(openState) {
  if (openState === 'open') {
    return 'is-open';
  }
  if (openState === 'free') {
    return 'is-free';
  }
  return 'is-unknown';
}

function createAliasEditor(port) {
  const form = document.createElement('form');
  form.className = 'alias-editor inline';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    commitAliasEdit(port);
  });

  const input = document.createElement('input');
  input.className = 'alias-input';
  input.type = 'text';
  input.value = state.aliasDraft;
  input.placeholder = `${port.portName} 的名称`;
  input.maxLength = 80;
  input.dataset.composing = 'false';
  input.addEventListener('compositionstart', () => {
    input.dataset.composing = 'true';
  });
  input.addEventListener('compositionend', () => {
    input.dataset.composing = 'false';
    state.aliasDraft = input.value;
  });
  input.addEventListener('input', () => {
    state.aliasDraft = input.value;
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing && input.dataset.composing !== 'true') {
      event.preventDefault();
      commitAliasEdit(port);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelAliasEdit();
    }
  });
  input.addEventListener('blur', () => {
    window.setTimeout(() => {
      if (state.editingKey !== port.deviceKey) {
        return;
      }

      if (state.aliasDraft === (port.alias || '')) {
        cancelAliasEdit();
        return;
      }

      commitAliasEdit(port);
    }, 0);
  });

  form.append(input);
  return form;
}

function commitAliasEdit(port) {
  if (state.editingKey !== port.deviceKey) {
    return;
  }

  if (state.savingAliasKey === port.deviceKey) {
    return;
  }

  saveAlias(port.deviceKey, state.aliasDraft);
}

function cancelAliasEdit() {
  state.editingKey = null;
  state.aliasDraft = '';
  renderPorts();
}

function renderEvents() {
  elements.eventsList.replaceChildren(...state.events.map(createEventItem));
}

function createEventItem(event, index) {
  const item = document.createElement('article');
  item.className = `event-item ${event.type === 'attached' ? 'attached' : 'detached'}`;
  item.style.animationDelay = `${Math.min(index * 24, 120)}ms`;

  const mark = document.createElement('span');
  mark.className = 'event-mark';
  mark.textContent = event.type === 'attached' ? '+' : '-';

  const body = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = event.label;
  const meta = document.createElement('span');
  meta.textContent = `${event.type === 'attached' ? '插入' : '拔出'} · ${formatTime(event.timestamp)}`;
  body.append(title, meta);

  item.append(mark, body);
  return item;
}

async function saveAlias(deviceKey, alias) {
  state.savingAliasKey = deviceKey;
  elements.scanStatus.textContent = '保存中';
  try {
    const snapshot = await window.serialApi.saveAlias(deviceKey, alias);
    state.editingKey = null;
    state.aliasDraft = '';
    applySnapshot(snapshot);
    renderPorts();
  } finally {
    state.savingAliasKey = null;
    elements.scanStatus.textContent = '监听中';
  }
}

async function refreshNow() {
  elements.scanStatus.textContent = '刷新中';
  elements.refreshButton.disabled = true;
  try {
    const snapshot = await window.serialApi.refresh();
    applySnapshot(snapshot);
  } finally {
    elements.refreshButton.disabled = false;
    elements.scanStatus.textContent = '监听中';
  }
}

elements.refreshButton.addEventListener('click', refreshNow);
elements.trayButton.addEventListener('click', () => window.serialApi.minimizeToTray());
document.addEventListener('pointerdown', (event) => {
  if (!state.editingKey || event.target.closest('.alias-editor')) {
    return;
  }

  const port = state.ports.find((item) => item.deviceKey === state.editingKey);
  if (!port) {
    cancelAliasEdit();
    return;
  }

  if (state.aliasDraft === (port.alias || '')) {
    cancelAliasEdit();
    return;
  }

  commitAliasEdit(port);
});

window.serialApi.onSnapshot(receiveSnapshot);
window.serialApi.onPortEvent((event) => {
  state.events = [event, ...state.events].slice(0, 80);
  state.eventSignature = createEventSignature(state.events);
  updateVisibility();
  renderEvents();
});

updateVisibility();
window.serialApi.getSnapshot().then(receiveSnapshot);
