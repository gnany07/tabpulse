// TabPulse - Smart RAM Saver (Tab Sleeper) & Focus Mode Engine
// Uses native chrome.tabs.discard() to free ~50-150 MB RAM per inactive tab
// Tabs stay in their Chrome Tab Groups and wake up automatically on click!

(function (globalScope) {
  const DISTRACTION_GROUP_KEYWORDS = [
    'media', 'music', 'social', 'comms', 'shopping', 'deals', 'news',
    'youtube', 'netflix', 'reddit', 'twitter', 'instagram', 'twitch', 'amazon'
  ];

  const WORK_GROUP_KEYWORDS = [
    'ai', 'llm', 'dev', 'cloud', 'docs', 'research', 'work', 'productivity', 'github', 'localhost'
  ];

  const AVG_MB_PER_TAB = 95;

  function isSleepEligible(tab, settings = {}) {
    if (!tab || !tab.id) return false;
    if (tab.active) return false;
    if (tab.discarded) return false;
    if (tab.audible) return false; // Never sleep music, videos, or active calls!
    if (settings.ignorePinned !== false && tab.pinned) return false;
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      return false;
    }
    return true;
  }

  function formatRamMB(mb) {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  }

  function getRamStats(tabs = []) {
    const sleepingCount = tabs.filter(t => t && t.discarded).length;
    const eligibleToSleepCount = tabs.filter(t => isSleepEligible(t)).length;
    const estimatedSavedMB = sleepingCount * AVG_MB_PER_TAB;
    return {
      sleepingCount,
      eligibleToSleepCount,
      estimatedSavedMB,
      estimatedSavedLabel: formatRamMB(estimatedSavedMB)
    };
  }

  /**
   * Discards (sleeps) inactive tabs to save RAM.
   * @param {number|null} windowId - null for all windows, or specific windowId
   * @param {object} settings
   * @param {number} minIdleMinutes - 0 = sleep all eligible inactive tabs immediately; >0 = only tabs idle >= minIdleMinutes
   */
  async function sleepInactiveTabs(windowId = null, settings = {}, minIdleMinutes = 0) {
    const query = windowId ? { windowId } : {};
    const tabs = await chrome.tabs.query(query);
    const now = Date.now();
    let sleptCount = 0;

    for (const tab of tabs) {
      if (!isSleepEligible(tab, settings)) continue;

      if (minIdleMinutes > 0) {
        const lastAccessed = tab.lastAccessed || now;
        const idleMins = (now - lastAccessed) / 60000;
        if (idleMins < minIdleMinutes) continue;
      }

      try {
        await chrome.tabs.discard(tab.id);
        sleptCount++;
      } catch (_) {}
    }

    return {
      sleptCount,
      estimatedSavedMB: sleptCount * AVG_MB_PER_TAB,
      estimatedSavedLabel: formatRamMB(sleptCount * AVG_MB_PER_TAB)
    };
  }

  /**
   * Focus Mode: Collapses & sleeps distracting groups (Media, Social, Shopping, News)
   * while keeping Dev, AI, Docs, and Work groups expanded and ready.
   */
  async function activateFocusMode(windowId = null, settings = {}) {
    const query = windowId ? { windowId } : {};
    const groups = await chrome.tabGroups.query(query);
    const tabs = await chrome.tabs.query(query);

    const activeGroupIds = new Set(tabs.filter(t => t.active).map(t => t.groupId));
    const distractionGroupIds = new Set();

    let collapsedGroups = 0;
    let expandedGroups = 0;

    for (const g of groups) {
      const titleLower = (g.title || '').toLowerCase();
      const isDistraction = DISTRACTION_GROUP_KEYWORDS.some(k => titleLower.includes(k));
      const isWork = WORK_GROUP_KEYWORDS.some(k => titleLower.includes(k));

      if (isDistraction) {
        distractionGroupIds.add(g.id);
        if (!activeGroupIds.has(g.id) && !g.collapsed) {
          try {
            await chrome.tabGroups.update(g.id, { collapsed: true });
            collapsedGroups++;
          } catch (_) {}
        }
      } else if (isWork && g.collapsed) {
        try {
          await chrome.tabGroups.update(g.id, { collapsed: false });
          expandedGroups++;
        } catch (_) {}
      }
    }

    // Sleep eligible tabs in distraction groups OR ungrouped tabs classified as Media/Social/Shopping
    let sleptTabs = 0;
    for (const tab of tabs) {
      if (!isSleepEligible(tab, settings)) continue;

      let shouldSleep = distractionGroupIds.has(tab.groupId);
      if (!shouldSleep && globalScope.TabPulseClassifier) {
        const topic = globalScope.TabPulseClassifier.scoreTopicGroup(tab);
        if (topic && ['topic:media', 'topic:social', 'topic:shopping', 'topic:news'].includes(topic.key)) {
          shouldSleep = true;
        }
      }

      if (shouldSleep) {
        try {
          await chrome.tabs.discard(tab.id);
          sleptTabs++;
        } catch (_) {}
      }
    }

    return {
      collapsedGroups,
      expandedGroups,
      sleptTabs,
      estimatedSavedLabel: formatRamMB(sleptTabs * AVG_MB_PER_TAB)
    };
  }

  const api = {
    AVG_MB_PER_TAB,
    isSleepEligible,
    formatRamMB,
    getRamStats,
    sleepInactiveTabs,
    activateFocusMode
  };

  globalScope.TabPulseSleeper = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
