// TabPulse - Chrome TabGroups Applicator & Undo Snapshot Manager

(function (globalScope) {
  const UNDO_STORAGE_KEY = 'tabpulse_undo_snapshot';

  /**
   * Captures current tab layout (index, groupId, group title/color) before organizing
   * so the user can 1-click Undo.
   */
  async function saveUndoSnapshot(windowId) {
    try {
      const query = windowId ? { windowId } : {};
      const tabs = await chrome.tabs.query(query);
      const groups = await chrome.tabGroups.query(windowId ? { windowId } : {});
      const groupMeta = {};
      for (const g of groups) {
        groupMeta[g.id] = { title: g.title || '', color: g.color || 'grey', collapsed: g.collapsed };
      }

      const snapshot = {
        timestamp: Date.now(),
        windowId: windowId || null,
        tabs: tabs.map(t => ({
          id: t.id,
          windowId: t.windowId,
          index: t.index,
          groupId: t.groupId,
          groupInfo: t.groupId && t.groupId !== -1 ? groupMeta[t.groupId] : null
        }))
      };

      await chrome.storage.local.set({ [UNDO_STORAGE_KEY]: snapshot });
      return snapshot;
    } catch (err) {
      console.warn('TabPulse: Failed to save undo snapshot', err);
      return null;
    }
  }

  /**
   * Restores the most recent pre-organization tab layout.
   */
  async function restoreUndoSnapshot() {
    const data = await chrome.storage.local.get(UNDO_STORAGE_KEY);
    const snapshot = data[UNDO_STORAGE_KEY];
    if (!snapshot || !Array.isArray(snapshot.tabs) || snapshot.tabs.length === 0) {
      return { restored: false, reason: 'No undo snapshot available' };
    }

    const existingTabs = await chrome.tabs.query({});
    const existingIds = new Set(existingTabs.map(t => t.id));

    // 1. Ungroup all tabs that were originally ungrouped
    const toUngroup = snapshot.tabs
      .filter(t => existingIds.has(t.id) && (!t.groupId || t.groupId === -1))
      .map(t => t.id);

    if (toUngroup.length > 0) {
      try {
        await chrome.tabs.ungroup(toUngroup);
      } catch (_) {}
    }

    // 2. Re-create original groups for tabs that were grouped
    const byOldGroup = new Map();
    for (const t of snapshot.tabs) {
      if (existingIds.has(t.id) && t.groupId && t.groupId !== -1 && t.groupInfo) {
        const key = `${t.windowId}:${t.groupId}`;
        if (!byOldGroup.has(key)) {
          byOldGroup.set(key, { windowId: t.windowId, info: t.groupInfo, tabIds: [] });
        }
        byOldGroup.get(key).tabIds.push(t.id);
      }
    }

    for (const grp of byOldGroup.values()) {
      try {
        const newGroupId = await chrome.tabs.group({
          createProperties: { windowId: grp.windowId },
          tabIds: grp.tabIds
        });
        await chrome.tabGroups.update(newGroupId, {
          title: grp.info.title,
          color: grp.info.color,
          collapsed: Boolean(grp.info.collapsed)
        });
      } catch (_) {}
    }

    // 3. Restore original tab ordering
    const sortedByIndex = [...snapshot.tabs]
      .filter(t => existingIds.has(t.id))
      .sort((a, b) => a.index - b.index);

    for (const t of sortedByIndex) {
      try {
        await chrome.tabs.move(t.id, { index: t.index });
      } catch (_) {}
    }

    await chrome.storage.local.remove(UNDO_STORAGE_KEY);
    return { restored: true, count: sortedByIndex.length };
  }

  /**
   * Executes a grouping plan inside a target Chrome window.
   */
  async function applyGroupingPlanToWindow(windowId, strategy, settings = {}, saveSnapshot = true) {
    if (saveSnapshot) {
      await saveUndoSnapshot(windowId);
    }

    const tabs = await chrome.tabs.query({ windowId });
    const existingGroups = await chrome.tabGroups.query({ windowId });

    // Build map of existing groups by title so we can reuse matching group IDs smoothly
    const existingGroupByTitle = new Map();
    for (const g of existingGroups) {
      if (g.title) {
        existingGroupByTitle.set(g.title.trim().toLowerCase(), g);
      }
    }

    const plan = globalScope.TabPulseClassifier.buildGroupingPlan(tabs, strategy, settings);

    let groupsCreatedOrUpdated = 0;

    for (const grp of plan.groups) {
      if (!grp.tabIds || grp.tabIds.length === 0) continue;

      try {
        const existing = existingGroupByTitle.get(grp.title.trim().toLowerCase());
        let groupId;

        if (existing) {
          groupId = await chrome.tabs.group({
            groupId: existing.id,
            tabIds: grp.tabIds
          });
        } else {
          groupId = await chrome.tabs.group({
            createProperties: { windowId },
            tabIds: grp.tabIds
          });
        }

        // Determine if group should be collapsed (if autoCollapseInactive is on and no active tab inside)
        const hasActiveTab = grp.tabs.some(t => t.active);
        const shouldCollapse = settings.autoCollapseInactive === true && !hasActiveTab;

        await chrome.tabGroups.update(groupId, {
          title: grp.title,
          color: grp.color,
          collapsed: shouldCollapse
        });

        groupsCreatedOrUpdated++;
      } catch (err) {
        console.warn('TabPulse: Error applying group', grp.title, err);
      }
    }

    // Ungroup singletons that don't belong to any planned group (if cleanUngroupedSingletons is enabled)
    if (settings.ungroupSingletons !== false && plan.ungroupedTabs.length > 0) {
      const groupedSingletonIds = plan.ungroupedTabs
        .filter(t => t.groupId && t.groupId !== -1)
        .map(t => t.id);

      if (groupedSingletonIds.length > 0) {
        try {
          await chrome.tabs.ungroup(groupedSingletonIds);
        } catch (_) {}
      }
    }

    return {
      windowId,
      groupsCount: groupsCreatedOrUpdated,
      groupedTabCount: plan.groupedTabCount,
      totalTabs: tabs.length
    };
  }

  /**
   * Organizes either the current window or all normal browser windows.
   */
  async function organizeTabs(options = {}) {
    const scope = options.scope || 'current'; // 'current' | 'all'
    const strategy = options.strategy || 'topic';
    const settings = options.settings || {};

    if (scope === 'all') {
      await saveUndoSnapshot(null);
      const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
      let totalGroups = 0;
      let totalGroupedTabs = 0;
      for (const win of windows) {
        const res = await applyGroupingPlanToWindow(win.id, strategy, settings, false);
        totalGroups += res.groupsCount;
        totalGroupedTabs += res.groupedTabCount;
      }
      return { groupsCount: totalGroups, groupedTabCount: totalGroupedTabs };
    } else {
      const currentWin = options.windowId
        ? { id: options.windowId }
        : await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
      return await applyGroupingPlanToWindow(currentWin.id, strategy, settings, true);
    }
  }

  /**
   * Collapses or expands all tab groups in the target scope.
   */
  async function setAllGroupsCollapsed(collapsed, windowId = null) {
    const query = windowId ? { windowId } : {};
    const groups = await chrome.tabGroups.query(query);
    const activeTabs = await chrome.tabs.query(windowId ? { windowId, active: true } : { active: true });
    const activeGroupIds = new Set(activeTabs.map(t => t.groupId));

    let updated = 0;
    for (const g of groups) {
      // Chrome doesn't allow collapsing a group that contains the active tab unless we keep it open
      if (collapsed && activeGroupIds.has(g.id)) continue;
      try {
        await chrome.tabGroups.update(g.id, { collapsed });
        updated++;
      } catch (_) {}
    }
    return { updated, total: groups.length };
  }

  /**
   * Ungroups all tabs in the target window or all windows.
   */
  async function ungroupAllTabs(windowId = null) {
    await saveUndoSnapshot(windowId);
    const tabs = await chrome.tabs.query(windowId ? { windowId } : {});
    const groupedTabIds = tabs
      .filter(t => t.groupId && t.groupId !== -1)
      .map(t => t.id);

    if (groupedTabIds.length > 0) {
      await chrome.tabs.ungroup(groupedTabIds);
    }
    return { ungroupedCount: groupedTabIds.length };
  }

  const api = {
    UNDO_STORAGE_KEY,
    saveUndoSnapshot,
    restoreUndoSnapshot,
    applyGroupingPlanToWindow,
    organizeTabs,
    setAllGroupsCollapsed,
    ungroupAllTabs
  };

  globalScope.TabPulseOrganizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
