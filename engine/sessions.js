// TabPulse - Workspace Sessions Engine (Save & Restore Tab Group Workspaces)

(function (globalScope) {
  const SESSIONS_KEY = 'tabpulse_sessions';

  async function getSessions() {
    const res = await chrome.storage.local.get(SESSIONS_KEY);
    return Array.isArray(res[SESSIONS_KEY]) ? res[SESSIONS_KEY] : [];
  }

  async function saveSession(name, windowId = null, closeAfterSave = false) {
    const query = windowId ? { windowId } : { lastFocusedWindow: true };
    const tabs = await chrome.tabs.query(query);
    const groups = await chrome.tabGroups.query(windowId ? { windowId } : {});

    const groupMeta = {};
    for (const g of groups) {
      groupMeta[g.id] = {
        title: g.title || '',
        color: g.color || 'blue',
        collapsed: Boolean(g.collapsed)
      };
    }

    const validTabs = tabs.filter(t =>
      t.url &&
      !t.url.startsWith('chrome://newtab') &&
      !t.url.startsWith('chrome-extension://')
    );

    if (validTabs.length === 0) {
      return { ok: false, error: 'No saveable tabs in this window' };
    }

    const session = {
      id: 'ws-' + Date.now(),
      name: (name || '').trim() || `Workspace ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      tabCount: validTabs.length,
      groupCount: new Set(validTabs.map(t => t.groupId).filter(id => id && id !== -1)).size,
      tabs: validTabs.map(t => ({
        url: t.url,
        title: t.title || t.url,
        pinned: Boolean(t.pinned),
        groupKey: t.groupId && t.groupId !== -1 ? String(t.groupId) : null,
        groupInfo: t.groupId && t.groupId !== -1 ? groupMeta[t.groupId] : null
      }))
    };

    const sessions = await getSessions();
    const updated = [session, ...sessions].slice(0, 25); // Keep up to 25 saved workspaces
    await chrome.storage.local.set({ [SESSIONS_KEY]: updated });

    if (closeAfterSave) {
      const idsToClose = validTabs.filter(t => !t.pinned).map(t => t.id);
      if (idsToClose.length > 0) {
        // Open a clean new tab first if closing all tabs in window
        if (idsToClose.length >= tabs.length) {
          await chrome.tabs.create({ windowId: validTabs[0].windowId, active: true });
        }
        await chrome.tabs.remove(idsToClose);
      }
    }

    return { ok: true, session, sessions: updated };
  }

  async function restoreSession(sessionId, inNewWindow = true) {
    const sessions = await getSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !Array.isArray(session.tabs) || session.tabs.length === 0) {
      return { ok: false, error: 'Workspace not found' };
    }

    let targetWindowId;
    let firstTabId = null;

    if (inNewWindow) {
      const newWin = await chrome.windows.create({ url: session.tabs[0].url, focused: true });
      targetWindowId = newWin.id;
      firstTabId = newWin.tabs && newWin.tabs[0] ? newWin.tabs[0].id : null;
    } else {
      const curWin = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
      targetWindowId = curWin.id;
    }

    const groupedBuckets = new Map();

    for (let i = 0; i < session.tabs.length; i++) {
      const item = session.tabs[i];
      let createdTabId;

      if (i === 0 && inNewWindow && firstTabId) {
        createdTabId = firstTabId;
        if (item.pinned) {
          try { await chrome.tabs.update(createdTabId, { pinned: true }); } catch (_) {}
        }
      } else {
        const created = await chrome.tabs.create({
          windowId: targetWindowId,
          url: item.url,
          pinned: Boolean(item.pinned),
          active: false
        });
        createdTabId = created.id;
      }

      if (item.groupKey && item.groupInfo) {
        if (!groupedBuckets.has(item.groupKey)) {
          groupedBuckets.set(item.groupKey, { info: item.groupInfo, tabIds: [] });
        }
        groupedBuckets.get(item.groupKey).tabIds.push(createdTabId);
      }
    }

    for (const bucket of groupedBuckets.values()) {
      try {
        const gid = await chrome.tabs.group({
          createProperties: { windowId: targetWindowId },
          tabIds: bucket.tabIds
        });
        await chrome.tabGroups.update(gid, {
          title: bucket.info.title,
          color: bucket.info.color,
          collapsed: false
        });
      } catch (_) {}
    }

    return { ok: true, restoredTabs: session.tabs.length, name: session.name };
  }

  async function deleteSession(sessionId) {
    const sessions = await getSessions();
    const updated = sessions.filter(s => s.id !== sessionId);
    await chrome.storage.local.set({ [SESSIONS_KEY]: updated });
    return { ok: true, sessions: updated };
  }

  const api = {
    SESSIONS_KEY,
    getSessions,
    saveSession,
    restoreSession,
    deleteSession
  };

  globalScope.TabPulseSessions = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
