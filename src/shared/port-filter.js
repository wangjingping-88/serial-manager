(function initPortFilter(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.PortFilter = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createPortFilterApi() {
  function filterPorts(ports, query) {
    const rawQuery = normalizeRawSearchQuery(query);
    if (!rawQuery) {
      return [...ports];
    }

    const matcher = createSearchMatcher(rawQuery);
    return ports.filter((port) => matcher(port));
  }

  function createSearchSummary({ visibleCount, totalCount, query }) {
    return normalizeSearchTerm(query)
      ? `匹配 ${visibleCount} / 共 ${totalCount}`
      : `共 ${totalCount} 个`;
  }

  function normalizeSearchTerm(value) {
    return normalizeRawSearchQuery(value).toLowerCase();
  }

  function normalizeRawSearchQuery(value) {
    return String(value || '').trim();
  }

  function createSearchMatcher(query) {
    const regexp = parseRegularExpressionQuery(query);
    if (regexp) {
      return (port) => getSearchValues(port).some((value) => {
        regexp.lastIndex = 0;
        return regexp.test(value);
      });
    }

    const term = query.toLowerCase();
    return (port) => getSearchValues(port).join(' ').toLowerCase().includes(term);
  }

  function parseRegularExpressionQuery(query) {
    if (!query.startsWith('/')) {
      return null;
    }

    const patternEnd = query.lastIndexOf('/');
    if (patternEnd <= 0) {
      return null;
    }

    const pattern = query.slice(1, patternEnd);
    const flags = query.slice(patternEnd + 1).replace(/[gy]/g, '');
    if (!pattern) {
      return null;
    }

    try {
      return new RegExp(pattern, flags);
    } catch {
      return null;
    }
  }

  function getSearchValues(port) {
    return [
      port.portName,
      port.alias,
      port.name,
      port.description,
      port.manufacturer,
      port.service,
      port.groupName
    ].map((value) => String(value || ''));
  }

  return {
    createSearchSummary,
    filterPorts,
    normalizeSearchTerm
  };
});
