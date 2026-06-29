function getPortNumber(value) {
  return Number(String(value || '').replace(/\D+/g, '')) || 9999;
}

function sortPortNames(portNames) {
  return [...portNames].sort((left, right) => getPortNumber(left) - getPortNumber(right));
}

function sortPorts(list) {
  return [...list].sort((left, right) => getPortNumber(left.portName) - getPortNumber(right.portName));
}

module.exports = {
  getPortNumber,
  sortPortNames,
  sortPorts
};
