// TabPulse - Smart RAM Saver (Tab Sleeper) & Focus Mode Engine
// Uses native chrome.tabs.discard() to free ~50-150 MB RAM per inactive tab
// Tabs stay in their Chrome Tab Groups and wake up automatically on click!

(function (globalScope) {
  const DISTRACTION_DOMAINS = [
    'x.com', 'twitter.com', 'reddit.com', 'instagram.com', 'facebook.com',
    'tiktok.com', 'threads.net', 'bsky.app', 'pinterest.com', 'tumblr.com',
    'youtube.com', 'netflix.com', 'hulu.com', 'disneyplus.com', 'max.com',
    'primevideo.com', 'twitch.tv', 'crunchyroll.com', 'vimeo.com',
    'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'bestbuy.com',
    'etsy.com', 'aliexpress.com', 'espn.com', 'news.ycombinator.com', '9gag.com'
  ];

  const DISTRACTION_GROUP_KEYWORDS = [
    'media', 'music', 'social', 'comms', 'shopping', 'deals', 'news',
    'youtube', 'netflix', 'reddit', 'twitter', 'x / twitter', 'instagram',
    'twitch', 'amazon', 'paused (focus)'
  ];

  const WORK_GROUP_KEYWORDS = [
    'ai', 'llm', 'dev', 'cloud', 'docs', 'research', 'work', 'productivity', 'github', 'localhost'
  ];

  const AVG_MB_PER_TAB = 95;

  function isDistractionTab(tab) {
    if (!tab || !tab.url) return false;
    try {
      const host = new URL(tab.url).hostname.toLowerCase().replace(/^www\./, '');
      for (const dom of DISTRACTION_DOMAINS) {
        if (host === dom || host.endsWith('.' + dom)) return true;
      }
    } catch (_) {}

    if (globalScope.TabPulseClassifier) {
      const topic = globalScope.TabPulseClassifier.scoreTopicGroup(tab);
      if (topic && ['topic:media', 'topic:social', 'topic:shopping'].includes(topic.key)) {
        return true;
      }
    }
    return false;
  }

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
   * Focus Mode:
   * 1. Finds all distracting tabs (X/Twitter, YouTube, Reddit, Social, Shopping, Media).
   * 2. If the currently active tab is a distraction, switches focus to a work/non-distraction tab first.
   * 3. Groups all distraction tabs into a collapsed "🎯 Paused (Focus)" group & sleeps them to free RAM.
   * 4. Expands work/dev/AI/docs groups so you can focus immediately.
   */
  async function activateFocusMode(windowId = null, settings = {}) {
    const targetWindows = windowId
      ? [{ id: windowId }]
      : await chrome.windows.getAll({ windowTypes: ['normal'] });

    let totalGroupedDistractions = 0;
    let totalCollapsedGroups = 0;
    let totalSleptTabs = 0;

    for (const win of targetWindows) {
      const tabs = await chrome.tabs.query({ windowId: win.id });
      const groups = await chrome.tabGroups.query({ windowId: win.id });

      const distractionGroupIds = new Set();
      for (const g of groups) {
        const titleLower = (g.title || '').toLowerCase();
        if (DISTRACTION_GROUP_KEYWORDS.some(k => titleLower.includes(k))) {
          distractionGroupIds.add(g.id);
        }
      }

      const distractionTabs = tabs.filter(t => {
        if (settings.ignorePinned !== false && t.pinned) return false;
        if (!t.url || t.url.startsWith('chrome://') || t.url.startsWith('chrome-extension://')) return false;
        return distractionGroupIds.has(t.groupId) || isDistractionTab(t);
      });

      if (distractionTabs.length > 0) {
        const distractionTabIdSet = new Set(distractionTabs.map(t => t.id));

        // If user is currently viewing a distraction tab (e.g. x.com), switch to a non-distraction tab first
        const activeTab = tabs.find(t => t.active);
        if (activeTab && distractionTabIdSet.has(activeTab.id)) {
          const safeWorkTab = tabs.find(t => !distractionTabIdSet.has(t.id));
          if (safeWorkTab) {
            try {
              await chrome.tabs.update(safeWorkTab.id, { active: true });
            } catch (_) {}
          }
        }

        // Group all distraction tabs into a single collapsed "🎯 Paused (Focus)" tab group
        const existingFocusGroup = groups.find(g => (g.title || '').toLowerCase().includes('paused (focus)'));
        const tabIds = distractionTabs.map(t => t.id);

        try {
          let focusGroupId;
          if (existingFocusGroup) {
            focusGroupId = await chrome.tabs.group({ groupId: existingFocusGroup.id, tabIds });
          } else {
            focusGroupId = await chrome.tabs.group({
              createProperties: { windowId: win.id },
              tabIds
            });
          }

          // Re-check active tab before collapsing (Chrome won't collapse if active tab is still inside)
          const updatedTabs = await chrome.tabs.query({ windowId: win.id, active: true });
          const activeIsStillInside = updatedTabs.some(t => t.groupId === focusGroupId);

          await chrome.tabGroups.update(focusGroupId, {
            title: '🎯 Paused (Focus)',
            color: 'grey',
            collapsed: !activeIsStillInside
          });

          totalGroupedDistractions += tabIds.length;
          if (!activeIsStillInside) totalCollapsedGroups++;
        } catch (err) {
          console.warn('TabPulse Focus Mode group error:', err);
        }

        // Sleep (discard) all distraction tabs that are not active & not playing audio
        const refreshedTabs = await chrome.tabs.query({ windowId: win.id });
        for (const t of refreshedTabs) {
          if (!distractionTabIdSet.has(t.id)) continue;
          if (!isSleepEligible(t, settings)) continue;
          try {
            await chrome.tabs.discard(t.id);
            totalSleptTabs++;
          } catch (_) {}
        }
      }

      // Expand work/dev/AI/docs groups so they are ready for deep work
      const latestGroups = await chrome.tabGroups.query({ windowId: win.id });
      for (const g of latestGroups) {
        const titleLower = (g.title || '').toLowerCase();
        if (WORK_GROUP_KEYWORDS.some(k => titleLower.includes(k)) && g.collapsed) {
          try {
            await chrome.tabGroups.update(g.id, { collapsed: false });
          } catch (_) {}
        }
      }
    }

    return {
      groupedDistractions: totalGroupedDistractions,
      collapsedGroups: totalCollapsedGroups,
      sleptTabs: totalSleptTabs,
      estimatedSavedLabel: formatRamMB(totalSleptTabs * AVG_MB_PER_TAB)
    };
  }

  const api = {
    AVG_MB_PER_TAB,
    DISTRACTION_DOMAINS,
    isDistractionTab,
    isSleepEligible,
    formatRamMB,
    getRamStats,
    sleepInactiveTabs,
    activateFocusMode
  };

  globalScope.TabPulseSleeper = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
