function buildNotificationTitle(type) {
  return type === 'attached' ? '串口已插入' : '串口已拔出';
}

function buildNotificationBody(event, port) {
  const lines = [event.label];
  const details = [port.name || port.description, port.manufacturer].filter(Boolean);

  for (const detail of details) {
    if (detail && detail !== event.label && detail !== event.portName && detail !== port.portName && !lines.includes(detail)) {
      lines.push(detail);
    }
  }

  return lines.join('\n');
}

module.exports = {
  buildNotificationBody,
  buildNotificationTitle
};
