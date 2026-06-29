const CURRENT_CONFIG_VERSION = 1;
const GROUP_COLORS = ['#138a8a', '#1f9d55', '#c17900', '#ca3d32', '#4f6fbd', '#8a5fbf', '#ad5d20', '#4f7c52'];

function createEmptyAliasStore() {
  return {
    schemaVersion: CURRENT_CONFIG_VERSION,
    aliases: {}
  };
}

function createEmptyGroupStore() {
  return {
    schemaVersion: CURRENT_CONFIG_VERSION,
    groups: [],
    assignments: {},
    orders: {}
  };
}

function normalizeAliasStore(value) {
  const sourceAliases = value && typeof value.aliases === 'object' && !Array.isArray(value.aliases)
    ? value.aliases
    : value;
  const aliases = {};

  if (sourceAliases && typeof sourceAliases === 'object' && !Array.isArray(sourceAliases)) {
    for (const [key, alias] of Object.entries(sourceAliases)) {
      const normalizedKey = String(key || '').trim();
      const normalizedAlias = normalizeAlias(alias);
      if (normalizedKey && normalizedAlias) {
        aliases[normalizedKey] = normalizedAlias;
      }
    }
  }

  return {
    schemaVersion: CURRENT_CONFIG_VERSION,
    aliases
  };
}

function normalizeGroupStore(value) {
  const sourceGroups = Array.isArray(value && value.groups) ? value.groups : [];
  const groups = [];
  const seen = new Set();

  for (const item of sourceGroups) {
    const id = String(item && item.id ? item.id : '').trim();
    const name = normalizeGroupName(item && item.name);
    if (!id || !name || seen.has(id)) {
      continue;
    }

    groups.push({ id, name, color: normalizeGroupColor(item && item.color) });
    seen.add(id);
  }

  const validIds = new Set(groups.map((group) => group.id));
  const assignments = {};
  const sourceAssignments = value && typeof value.assignments === 'object' ? value.assignments : {};
  for (const [key, groupId] of Object.entries(sourceAssignments)) {
    const normalizedKey = String(key || '').trim();
    const normalizedGroupId = String(groupId || '').trim();
    if (normalizedKey && validIds.has(normalizedGroupId)) {
      assignments[normalizedKey] = normalizedGroupId;
    }
  }

  const orders = {};
  const sourceOrders = value && typeof value.orders === 'object' ? value.orders : {};
  const allowedOrderKeys = new Set(['all', 'ungrouped', ...groups.map((group) => group.id)]);
  for (const [orderKey, values] of Object.entries(sourceOrders)) {
    if (!allowedOrderKeys.has(orderKey) || !Array.isArray(values)) {
      continue;
    }

    orders[orderKey] = [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))];
  }

  return {
    schemaVersion: CURRENT_CONFIG_VERSION,
    groups,
    assignments,
    orders
  };
}

function normalizeAlias(value) {
  return String(value || '').trim().slice(0, 80);
}

function normalizeGroupName(value) {
  return String(value || '').trim().slice(0, 24);
}

function normalizeGroupColor(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : GROUP_COLORS[0];
}

module.exports = {
  CURRENT_CONFIG_VERSION,
  GROUP_COLORS,
  createEmptyAliasStore,
  createEmptyGroupStore,
  normalizeAlias,
  normalizeAliasStore,
  normalizeGroupColor,
  normalizeGroupName,
  normalizeGroupStore
};
