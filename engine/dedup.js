// TabPulse - URL Normalizer & Duplicate Tab Cluster Engine
// Works in both Service Worker (importScripts) and UI (window.TabPulseDedup)

(function (globalScope) {
  const TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'fbclid', 'gclid', 'dclid', 'msclkid', 'twclid', 'igshid', 'mc_cid', 'mc_eid',
    'ref', 'ref_src', 'ref_url', '_hsenc', '_hsmi', 'mkt_tok', 'spm'
  ]);

  function isOrganizableUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (
      url.startsWith('chrome://newtab') ||
      url.startsWith('chrome://extensions') ||
      url.startsWith('edge://newtab') ||
      url.startsWith('about:blank') ||
      url.startsWith('chrome-extension://')
    ) {
      return false;
    }
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://');
  }

  /**
   * Normalizes a URL for duplicate comparison based on user options:
   * - smartNormalize (default true): strips utm_*, fbclid, gclid, www., trailing slash
   * - ignoreHash (default true): strips #anchor fragments
   * - ignoreQuery (default false): strips entire query string
   */
  function normalizeUrl(rawUrl, options = {}) {
    if (!rawUrl) return '';
    const smartNormalize = options.smartNormalize !== false;
    const ignoreHash = options.ignoreHash !== false;
    const ignoreQuery = options.ignoreQuery === true;

    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return rawUrl.trim();
      }

      let host = parsed.hostname.toLowerCase();
      if (smartNormalize && host.startsWith('www.')) {
        host = host.slice(4);
      }

      let pathname = parsed.pathname || '/';
      if (smartNormalize && pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.replace(/\/+$/, '');
      }

      let search = '';
      if (!ignoreQuery) {
        if (smartNormalize) {
          const cleanParams = new URLSearchParams();
          const sortedKeys = Array.from(parsed.searchParams.keys()).sort();
          for (const key of sortedKeys) {
            const lowerKey = key.toLowerCase();
            if (!TRACKING_PARAMS.has(lowerKey) && !lowerKey.startsWith('utm_')) {
              const values = parsed.searchParams.getAll(key);
              for (const val of values) {
                cleanParams.append(key, val);
              }
            }
          }
          const qs = cleanParams.toString();
          if (qs) search = '?' + qs;
        } else {
          search = parsed.search;
        }
      }

      const hash = ignoreHash ? '' : parsed.hash;
      return `${host}${pathname}${search}${hash}`;
    } catch (e) {
      return rawUrl.trim();
    }
  }

  /**
   * Finds all duplicate tab clusters across a list of Chrome tabs.
   * Returns:
   * {
   *   clusters: [
   *     {
   *       key,
   *       displayUrl,
   *       title,
   *       favIconUrl,
   *       tabs: [tab1, tab2, ...],
   *       keepTabId,
   *       closeTabIds: [...]
   *     }
   *   ],
   *   totalDuplicateTabsToClose: number,
   *   allCloseTabIds: number[]
   * }
   */
  function findDuplicateClusters(tabs, options = {}) {
    const keepPolicy = options.keepPolicy || 'newest'; // 'newest' | 'oldest' | 'active'
    const includeTitleMatch = options.includeTitleMatch === true;
    const byKey = new Map();

    for (const tab of tabs) {
      if (!tab || !tab.url) continue;
      // Skip empty new tabs
      if (tab.url.startsWith('chrome://newtab') || tab.url === 'about:blank') continue;
      if (options.ignorePinned && tab.pinned) continue;

      const normUrl = normalizeUrl(tab.url, options);
      if (!normUrl) continue;

      let key = `url:${normUrl}`;
      if (includeTitleMatch && tab.title) {
        try {
          const host = new URL(tab.url).hostname.replace(/^www\./, '').toLowerCase();
          key = `title:${host}::${tab.title.trim().toLowerCase()}`;
        } catch (_) {}
      }

      if (!byKey.has(key)) {
        byKey.set(key, []);
      }
      byKey.get(key).push(tab);
    }

    const clusters = [];
    const allCloseTabIds = [];

    for (const [key, groupTabs] of byKey.entries()) {
      if (groupTabs.length < 2) continue;

      // Sort tabs to determine which tab to keep
      const sorted = [...groupTabs].sort((a, b) => {
        // Always prioritize the currently active tab in a window first if one is active
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        // Never close pinned tab if unpinned duplicate exists
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        const timeA = a.lastAccessed || a.id || 0;
        const timeB = b.lastAccessed || b.id || 0;

        if (keepPolicy === 'oldest') {
          return (a.id || 0) - (b.id || 0);
        }
        // Default: keep newest / most recently accessed
        return timeB - timeA;
      });

      const keepTab = sorted[0];
      const closeTabs = sorted.slice(1);
      const closeTabIds = closeTabs.map(t => t.id).filter(Boolean);

      allCloseTabIds.push(...closeTabIds);

      let displayUrl = keepTab.url;
      try {
        const u = new URL(keepTab.url);
        displayUrl = u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname) + u.search;
      } catch (_) {}

      clusters.push({
        key,
        displayUrl,
        title: keepTab.title || displayUrl,
        favIconUrl: keepTab.favIconUrl || '',
        tabs: sorted,
        keepTabId: keepTab.id,
        closeTabIds
      });
    }

    // Sort clusters by most duplicates first
    clusters.sort((a, b) => b.tabs.length - a.tabs.length);

    return {
      clusters,
      totalDuplicateTabsToClose: allCloseTabIds.length,
      allCloseTabIds
    };
  }

  const api = {
    isOrganizableUrl,
    normalizeUrl,
    findDuplicateClusters
  };

  globalScope.TabPulseDedup = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
