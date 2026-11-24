// TabPulse - Background Service Worker (Manifest V3)
// Handles:
// - Auto Mode real-time tab grouping & duplicate tab cleaning
// - Auto-Sleep Idle Tabs (RAM Saver via chrome.tabs.discard + chrome.alarms)
// - Auto-Collapse inactive tab groups on tab switch
// - Focus Mode & Workspace Sessions
// - Live duplicate tab counter badge & RPC message router

importScripts(
  'engine/dedup.js',
  'engine/classifiers.js',
  'engine/organizer.js',
  'engine/sleeper.js',
  'engine/sessions.js'
);

const SETTINGS_KEY = 'tabpulse_settings';
const AUTO_SLEEP_ALARM = 'tabpulse_auto_sleep_alarm';

const DEFAULT_SETTINGS = {
  autoMode: false,
  strategy: 'topic', // 'topic' | 'domain' | 'custom' | 'tree' | 'recency'
  scope: 'current',  // 'current' | 'all'
  minTabsPerGroup: 2,
  autoCollapseInactive: false,
  ignorePinned: true,
  sortWithinGroups: true,
  ungroupSingletons: true,
  alwaysApplyCustomRules: true,
  // RAM Saver (Tab Sleeper)
  autoSleepMinutes: 0, // 0 = off, 15, 30, 60, 120
  // Duplicate options
  smartNormalize: true,
  ignoreHash: true,
  ignoreQuery: false,
  includeTitleMatch: false,
  keepPolicy: 'newest', // 'newest' | 'oldest'
  autoPreventDuplicates: false,
  // Pre-loaded sample Custom Rules
  customRules: [
    {
      id: 'rule-localhost',
      name: '⚡ Localhost Dev',
      color: 'cyan',
      pattern: 'localhost, 127.0.0.1, 0.0.0.0',
      enabled: true
    },
    {
      id: 'rule-cws',
      name: '🚀 Web Store & Extensions',
      color: 'purple',
      pattern: 'chrome.google.com/webstore, chromewebstore.google.com',
      enabled: true
    }
  ]
};

let cachedSettings = { ...DEFAULT_SETTINGS };
let autoOrganizeTimer = null;
let badgeUpdateTimer = null;
let isOrganizingNow = false;

async function loadSettings() {
  try {
    const res = await chrome.storage.local.get(SETTINGS_KEY);
    if (res && res[SETTINGS_KEY]) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...res[SETTINGS_KEY] };
    } else {
      await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
  } catch (err) {
    console.warn('TabPulse: Failed to load settings', err);
  }
  return cachedSettings;
}

async function saveSettings(partial) {
  cachedSettings = { ...cachedSettings, ...partial };
  await chrome.storage.local.set({ [SETTINGS_KEY]: cachedSettings });
  syncAutoSleepAlarm();
  scheduleBadgeUpdate();
  return cachedSettings;
}

function syncAutoSleepAlarm() {
  if (!chrome.alarms) return;
  if (Number(cachedSettings.autoSleepMinutes) > 0) {
    chrome.alarms.create(AUTO_SLEEP_ALARM, { periodInMinutes: 5 });
  } else {
    chrome.alarms.clear(AUTO_SLEEP_ALARM);
  }
}

// Initialize on install / startup
chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings();
  syncAutoSleepAlarm();
  await updateDuplicateBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  syncAutoSleepAlarm();
  await updateDuplicateBadge();
});

// Periodic Auto-Sleep Idle Tabs Alarm
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== AUTO_SLEEP_ALARM) return;
    await loadSettings();
    const idleMins = Number(cachedSettings.autoSleepMinutes) || 0;
    if (idleMins > 0) {
      await self.TabPulseSleeper.sleepInactiveTabs(null, cachedSettings, idleMins);
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[SETTINGS_KEY]) {
    cachedSettings = { ...DEFAULT_SETTINGS, ...changes[SETTINGS_KEY].newValue };
    syncAutoSleepAlarm();
    scheduleBadgeUpdate();
  }
});

/**
 * Updates the extension toolbar badge with duplicate count or Auto status.
 */
async function updateDuplicateBadge() {
  try {
    const query = cachedSettings.scope === 'all' ? {} : { lastFocusedWindow: true };
    const tabs = await chrome.tabs.query(query);
    const dedupResult = self.TabPulseDedup.findDuplicateClusters(tabs, cachedSettings);
    const dupCount = dedupResult.totalDuplicateTabsToClose;

    if (dupCount > 0) {
      await chrome.action.setBadgeText({ text: String(dupCount) });
      await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    } else if (cachedSettings.autoMode) {
      await chrome.action.setBadgeText({ text: 'ON' });
      await chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.warn('TabPulse: Badge update error', err);
  }
}

function scheduleBadgeUpdate() {
  if (badgeUpdateTimer) clearTimeout(badgeUpdateTimer);
  badgeUpdateTimer = setTimeout(() => {
    updateDuplicateBadge();
  }, 250);
}

/**
 * Cleans all duplicate tabs in the configured scope.
 */
async function cleanDuplicatesInScope(windowId = null) {
  try {
    const query = cachedSettings.scope === 'all'
      ? {}
      : (windowId ? { windowId } : { lastFocusedWindow: true });
    const tabs = await chrome.tabs.query(query);
    const dedup = self.TabPulseDedup.findDuplicateClusters(tabs, cachedSettings);
    if (dedup.allCloseTabIds.length > 0) {
      await chrome.tabs.remove(dedup.allCloseTabIds);
      return dedup.allCloseTabIds.length;
    }
    return 0;
  } catch (err) {
    console.warn('TabPulse: Auto duplicate cleanup error', err);
    return 0;
  }
}

/**
 * Debounced Auto-Mode organizer (and optional duplicate cleaner) for a window.
 */
function scheduleAutoOrganize(windowId) {
  if (!cachedSettings.autoMode || isOrganizingNow) return;
  if (autoOrganizeTimer) clearTimeout(autoOrganizeTimer);

  autoOrganizeTimer = setTimeout(async () => {
    if (!cachedSettings.autoMode || isOrganizingNow) return;
    isOrganizingNow = true;
    try {
      if (cachedSettings.autoPreventDuplicates) {
        await cleanDuplicatesInScope(windowId);
      }
      await self.TabPulseOrganizer.applyGroupingPlanToWindow(
        windowId,
        cachedSettings.strategy,
        cachedSettings,
        false
      );
    } catch (err) {
      console.warn('TabPulse: Auto organize failed', err);
    } finally {
      isOrganizingNow = false;
      scheduleBadgeUpdate();
    }
  }, 550);
}

// Tab Event Listeners
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.status !== 'complete') return;
  scheduleBadgeUpdate();

  if (!cachedSettings.autoMode) return;
  if (!tab || !tab.url || !self.TabPulseDedup.isOrganizableUrl(tab.url)) return;

  // Auto-Clean / Prevent Duplicate Tabs in Auto Mode
  if (cachedSettings.autoPreventDuplicates && (changeInfo.url || changeInfo.status === 'complete')) {
    if (!(cachedSettings.ignorePinned && tab.pinned)) {
      try {
        const query = cachedSettings.scope === 'all' ? {} : { windowId: tab.windowId };
        const scopeTabs = await chrome.tabs.query(query);
        const normTarget = self.TabPulseDedup.normalizeUrl(tab.url, cachedSettings);
        const existing = scopeTabs.find(t =>
          t.id !== tab.id &&
          t.url &&
          self.TabPulseDedup.normalizeUrl(t.url, cachedSettings) === normTarget
        );
        if (existing) {
          if (tab.active) {
            await chrome.tabs.update(existing.id, { active: true });
            if (existing.windowId !== tab.windowId) {
              await chrome.windows.update(existing.windowId, { focused: true });
            }
          }
          await chrome.tabs.remove(tab.id);
          scheduleBadgeUpdate();
          return;
        }
      } catch (_) {}
    }
  }

  scheduleAutoOrganize(tab.windowId);
});

chrome.tabs.onRemoved.addListener(() => {
  scheduleBadgeUpdate();
});

chrome.tabs.onCreated.addListener(() => {
  scheduleBadgeUpdate();
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  scheduleBadgeUpdate();
  if (!cachedSettings.autoMode || !cachedSettings.autoCollapseInactive) return;

  try {
    const activeTab = await chrome.tabs.get(activeInfo.tabId);
    const groups = await chrome.tabGroups.query({ windowId: activeInfo.windowId });

    for (const g of groups) {
      const shouldCollapse = g.id !== activeTab.groupId;
      if (g.collapsed !== shouldCollapse) {
        await chrome.tabGroups.update(g.id, { collapsed: shouldCollapse });
      }
    }
  } catch (_) {}
});

// Keyboard Shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  await loadSettings();
  if (command === 'organize-tabs') {
    await self.TabPulseOrganizer.organizeTabs({
      scope: cachedSettings.scope,
      strategy: cachedSettings.strategy,
      settings: cachedSettings
    });
    scheduleBadgeUpdate();
  } else if (command === 'clean-duplicates') {
    await cleanDuplicatesInScope(null);
    scheduleBadgeUpdate();
  } else if (command === 'sleep-inactive') {
    await self.TabPulseSleeper.sleepInactiveTabs(null, cachedSettings, 0);
  }
});

// Message Router for Popup / Side Panel UI
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    await loadSettings();

    switch (msg.type) {
      case 'GET_STATE': {
        const winId = msg.windowId || (await chrome.windows.getLastFocused({ windowTypes: ['normal'] })).id;
        const tabs = await chrome.tabs.query(cachedSettings.scope === 'all' ? {} : { windowId: winId });
        const allTabs = await chrome.tabs.query({});
        const allWindows = await chrome.windows.getAll({ windowTypes: ['normal'] });
        const groups = await chrome.tabGroups.query(cachedSettings.scope === 'all' ? {} : { windowId: winId });
        const allGroups = await chrome.tabGroups.query({});
        const groupTitleMap = {};
        for (const g of allGroups) {
          groupTitleMap[g.id] = { title: g.title || 'Group', color: g.color || 'grey' };
        }

        const undoData = await chrome.storage.local.get(self.TabPulseOrganizer.UNDO_STORAGE_KEY);
        const sessions = await self.TabPulseSessions.getSessions();
        const plan = self.TabPulseClassifier.buildGroupingPlan(tabs, cachedSettings.strategy, cachedSettings);
        const dedup = self.TabPulseDedup.findDuplicateClusters(tabs, cachedSettings);
        const ramStats = self.TabPulseSleeper.getRamStats(tabs);

        const searchableTabs = allTabs.map(t => ({
          id: t.id,
          windowId: t.windowId,
          title: t.title || t.url || 'Untitled',
          url: t.url || '',
          favIconUrl: t.favIconUrl || '',
          discarded: Boolean(t.discarded),
          audible: Boolean(t.audible),
          active: Boolean(t.active),
          groupTitle: t.groupId && t.groupId !== -1 && groupTitleMap[t.groupId] ? groupTitleMap[t.groupId].title : ''
        }));

        sendResponse({
          ok: true,
          settings: cachedSettings,
          windowId: winId,
          windowCount: allWindows.length,
          totalTabsCount: tabs.length,
          existingGroupsCount: groups.length,
          hasUndoSnapshot: Boolean(undoData && undoData[self.TabPulseOrganizer.UNDO_STORAGE_KEY]),
          plan,
          dedup,
          ramStats,
          sessions,
          searchableTabs
        });
        break;
      }

      case 'UPDATE_SETTINGS': {
        const updated = await saveSettings(msg.settings || {});
        let autoCleanedCount = 0;
        let autoSleptCount = 0;
        if (updated.autoMode && (msg.triggerAutoOrganize || msg.triggerAutoCleanDups)) {
          const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
          if (updated.autoPreventDuplicates) {
            autoCleanedCount = await cleanDuplicatesInScope(win.id);
          }
          if (msg.triggerAutoOrganize) {
            await self.TabPulseOrganizer.organizeTabs({
              scope: updated.scope,
              strategy: updated.strategy,
              settings: updated,
              windowId: win.id
            });
          }
          await updateDuplicateBadge();
        }
        if (msg.triggerAutoSleep && Number(updated.autoSleepMinutes) > 0) {
          const res = await self.TabPulseSleeper.sleepInactiveTabs(
            updated.scope === 'all' ? null : msg.windowId,
            updated,
            Number(updated.autoSleepMinutes)
          );
          autoSleptCount = res.sleptCount;
        }
        sendResponse({ ok: true, settings: updated, autoCleanedCount, autoSleptCount });
        break;
      }

      case 'ORGANIZE_NOW': {
        isOrganizingNow = true;
        try {
          const strategy = msg.strategy || cachedSettings.strategy;
          const result = await self.TabPulseOrganizer.organizeTabs({
            scope: cachedSettings.scope,
            strategy,
            settings: cachedSettings,
            windowId: msg.windowId
          });
          await updateDuplicateBadge();
          sendResponse({ ok: true, result });
        } finally {
          isOrganizingNow = false;
        }
        break;
      }

      case 'ORGANIZE_SINGLE_GROUP': {
        if (Array.isArray(msg.tabIds) && msg.tabIds.length > 0) {
          await self.TabPulseOrganizer.saveUndoSnapshot(msg.windowId);
          const groupId = await chrome.tabs.group({
            createProperties: msg.windowId ? { windowId: msg.windowId } : undefined,
            tabIds: msg.tabIds
          });
          await chrome.tabGroups.update(groupId, {
            title: msg.title || 'Group',
            color: msg.color || 'blue'
          });
        }
        sendResponse({ ok: true });
        break;
      }

      case 'CLEAN_DUPLICATES': {
        const tabIdsToClose = msg.tabIds || [];
        if (tabIdsToClose.length > 0) {
          await chrome.tabs.remove(tabIdsToClose);
        }
        await updateDuplicateBadge();
        sendResponse({ ok: true, closedCount: tabIdsToClose.length });
        break;
      }

      case 'SLEEP_INACTIVE': {
        const res = await self.TabPulseSleeper.sleepInactiveTabs(
          cachedSettings.scope === 'all' ? null : msg.windowId,
          cachedSettings,
          Number(msg.minIdleMinutes) || 0
        );
        sendResponse({ ok: true, result: res });
        break;
      }

      case 'ACTIVATE_FOCUS_MODE': {
        const res = await self.TabPulseSleeper.activateFocusMode(
          cachedSettings.scope === 'all' ? null : msg.windowId,
          cachedSettings
        );
        sendResponse({ ok: true, result: res });
        break;
      }

      case 'SAVE_WORKSPACE': {
        const res = await self.TabPulseSessions.saveSession(
          msg.name,
          msg.windowId,
          Boolean(msg.closeAfterSave)
        );
        sendResponse(res);
        break;
      }

      case 'RESTORE_WORKSPACE': {
        const res = await self.TabPulseSessions.restoreSession(
          msg.sessionId,
          msg.inNewWindow !== false
        );
        sendResponse(res);
        break;
      }

      case 'DELETE_WORKSPACE': {
        const res = await self.TabPulseSessions.deleteSession(msg.sessionId);
        sendResponse(res);
        break;
      }

      case 'JUMP_TO_TAB': {
        if (msg.tabId) {
          try {
            await chrome.tabs.update(msg.tabId, { active: true });
            if (msg.windowId) {
              await chrome.windows.update(msg.windowId, { focused: true });
            }
          } catch (_) {}
        }
        sendResponse({ ok: true });
        break;
      }

      case 'CLOSE_TAB': {
        if (msg.tabId) {
          try {
            await chrome.tabs.remove(msg.tabId);
          } catch (_) {}
        }
        await updateDuplicateBadge();
        sendResponse({ ok: true });
        break;
      }

      case 'COLLAPSE_ALL': {
        const res = await self.TabPulseOrganizer.setAllGroupsCollapsed(
          Boolean(msg.collapsed),
          cachedSettings.scope === 'all' ? null : msg.windowId
        );
        sendResponse({ ok: true, result: res });
        break;
      }

      case 'UNGROUP_ALL': {
        const res = await self.TabPulseOrganizer.ungroupAllTabs(
          cachedSettings.scope === 'all' ? null : msg.windowId
        );
        sendResponse({ ok: true, result: res });
        break;
      }

      case 'UNDO_LAST': {
        const res = await self.TabPulseOrganizer.restoreUndoSnapshot();
        sendResponse({ ok: true, result: res });
        break;
      }

      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }
  })();
  return true;
});
