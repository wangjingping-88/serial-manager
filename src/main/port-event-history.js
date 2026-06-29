const DEFAULT_EVENT_LIMIT = 80;
const DEFAULT_EVENT_DEDUPE_MS = 1200;

function createEventHistory({ limit = DEFAULT_EVENT_LIMIT, dedupeMs = DEFAULT_EVENT_DEDUPE_MS } = {}) {
  return {
    events: [],
    recentKeys: new Map(),
    limit,
    dedupeMs
  };
}

function addPortEvent(history, { type, port, label, now = Date.now() }) {
  const timestampMs = normalizeTimestampMs(now);
  if (!shouldAcceptEvent(history, type, port.portName, timestampMs)) {
    return null;
  }

  const event = {
    id: `${timestampMs}-${type}-${port.portName}`,
    type,
    portName: port.portName,
    label,
    name: port.name,
    manufacturer: port.manufacturer,
    deviceKey: port.deviceKey,
    timestamp: new Date(timestampMs).toISOString()
  };

  history.events = [event, ...history.events].slice(0, history.limit);
  return event;
}

function shouldAcceptEvent(history, type, portName, timestampMs = Date.now()) {
  const key = `${type}:${portName}`;
  const hasRecentEvent = history.recentKeys.has(key);
  const lastAt = history.recentKeys.get(key) || 0;

  for (const [eventKey, timestamp] of history.recentKeys) {
    if (timestampMs - timestamp > history.dedupeMs * 4) {
      history.recentKeys.delete(eventKey);
    }
  }

  if (hasRecentEvent && timestampMs - lastAt < history.dedupeMs) {
    return false;
  }

  history.recentKeys.set(key, timestampMs);
  return true;
}

function clearEventHistory(history) {
  history.events = [];
  history.recentKeys.clear();
}

function normalizeTimestampMs(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

module.exports = {
  DEFAULT_EVENT_DEDUPE_MS,
  DEFAULT_EVENT_LIMIT,
  addPortEvent,
  clearEventHistory,
  createEventHistory,
  shouldAcceptEvent
};
