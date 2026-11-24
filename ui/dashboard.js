// TabPulse - Popup & Side Panel Interactive Controller

(function () {
  const STRATEGY_LABELS = {
    topic: 'Topic / Area',
    domain: 'By Domain',
    custom: 'Custom Rules',
    tree: 'Opener Tree',
    recency: 'By Activity'
  };

  let currentState = null;
  let selectedRuleColor = 'blue';

  // DOM Elements
  const headerStatsText = document.getElementById('headerStatsText');
  const scopeToggleBtn = document.getElementById('scopeToggleBtn');
  const openWorkspacesBtn = document.getElementById('openWorkspacesBtn');
  const openSidePanelBtn = document.getElementById('openSidePanelBtn');
  const autoModeToggle = document.getElementById('autoModeToggle');
  const autoModeText = document.getElementById('autoModeText');

  // Search UI
  const tabSearchInput = document.getElementById('tabSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchResultsDropdown = document.getElementById('searchResultsDropdown');

  // RAM Saver & Focus UI
  const ramSavedBadge = document.getElementById('ramSavedBadge');
  const ramSubtext = document.getElementById('ramSubtext');
  const sleepIdleBtn = document.getElementById('sleepIdleBtn');
  const focusModeBtn = document.getElementById('focusModeBtn');
  const optAutoSleepMinutes = document.getElementById('optAutoSleepMinutes');

  // Workspaces Modal UI
  const workspacesModal = document.getElementById('workspacesModal');
  const closeWorkspacesModalBtn = document.getElementById('closeWorkspacesModalBtn');
  const workspaceNameInput = document.getElementById('workspaceNameInput');
  const closeAfterSaveCheckbox = document.getElementById('closeAfterSaveCheckbox');
  const saveWorkspaceBtn = document.getElementById('saveWorkspaceBtn');
  const workspacesList = document.getElementById('workspacesList');

  // Duplicate UI
  const dupCard = document.getElementById('dupCard');
  const dupBadge = document.getElementById('dupBadge');
  const dupHeading = document.getElementById('dupHeading');
  const dupSubheading = document.getElementById('dupSubheading');
  const toggleDupDrawerBtn = document.getElementById('toggleDupDrawerBtn');
  const cleanAllDupsBtn = document.getElementById('cleanAllDupsBtn');
  const dupDrawer = document.getElementById('dupDrawer');
  const dupClustersList = document.getElementById('dupClustersList');

  // Duplicate Options
  const optQuickAutoCleanDups = document.getElementById('optQuickAutoCleanDups');
  const optSmartNormalize = document.getElementById('optSmartNormalize');
  const optIgnoreHash = document.getElementById('optIgnoreHash');
  const optTitleMatch = document.getElementById('optTitleMatch');
  const optKeepPolicy = document.getElementById('optKeepPolicy');

  // Strategy & Auto Options
  const strategyButtons = document.querySelectorAll('.strategy-btn');
  const toggleOptionsDrawerBtn = document.getElementById('toggleOptionsDrawerBtn');
  const closeOptionsDrawerBtn = document.getElementById('closeOptionsDrawerBtn');
  const optionsDrawer = document.getElementById('optionsDrawer');
  const optMinTabs = document.getElementById('optMinTabs');
  const optAutoCollapse = document.getElementById('optAutoCollapse');
  const optSortWithin = document.getElementById('optSortWithin');
  const optIgnorePinned = document.getElementById('optIgnorePinned');
  const optAutoPreventDups = document.getElementById('optAutoPreventDups');

  // Preview & Custom Rules
  const previewSectionTitle = document.getElementById('previewSectionTitle');
  const previewSummaryBadge = document.getElementById('previewSummaryBadge');
  const customRulesStrip = document.getElementById('customRulesStrip');
  const groupsPreviewList = document.getElementById('groupsPreviewList');

  // Footer Actions
  const organizeNowBtn = document.getElementById('organizeNowBtn');
  const organizeBtnText = document.getElementById('organizeBtnText');
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  const expandAllBtn = document.getElementById('expandAllBtn');
  const ungroupAllBtn = document.getElementById('ungroupAllBtn');
  const undoBtn = document.getElementById('undoBtn');

  // Custom Rule Modal
  const openCustomRuleModalBtn = document.getElementById('openCustomRuleModalBtn');
  const customRuleModal = document.getElementById('customRuleModal');
  const closeRuleModalBtn = document.getElementById('closeRuleModalBtn');
  const cancelRuleBtn = document.getElementById('cancelRuleBtn');
  const saveRuleBtn = document.getElementById('saveRuleBtn');
  const ruleNameInput = document.getElementById('ruleNameInput');
  const rulePatternInput = document.getElementById('rulePatternInput');
  const colorDots = document.querySelectorAll('.color-dot');

  const toastBanner = document.getElementById('toastBanner');
  const toastText = document.getElementById('toastText');
  let toastTimeout = null;

  function showToast(message) {
    toastText.textContent = message;
    toastBanner.classList.remove('hidden');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastBanner.classList.add('hidden');
    }, 2400);
  }

  function sendMsg(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(payload, (response) => {
        resolve(response || { ok: false });
      });
    });
  }

  async function refreshState() {
    const win = await chrome.windows.getCurrent();
    const res = await sendMsg({ type: 'GET_STATE', windowId: win.id });
    if (!res || !res.ok) return;
    currentState = res;
    renderUI();
  }

  function renderUI() {
    if (!currentState) return;
    const { settings, totalTabsCount, existingGroupsCount, windowCount, hasUndoSnapshot, plan, dedup, ramStats, sessions } = currentState;

    // 1. Header & Scope
    const scopeText = settings.scope === 'all' ? `All Wins (${windowCount})` : 'Current Win';
    scopeToggleBtn.textContent = scopeText;
    headerStatsText.textContent = `${totalTabsCount} Open Tabs • ${existingGroupsCount} Active Groups`;

    // 1b. RAM Saver & Focus Card
    if (ramStats) {
      ramSavedBadge.textContent = `⚡ ~${ramStats.estimatedSavedLabel} Saved`;
      ramSubtext.textContent = `${ramStats.sleepingCount} sleeping • ${ramStats.eligibleToSleepCount} idle eligible`;
    }
    optAutoSleepMinutes.value = String(settings.autoSleepMinutes || 0);

    // 1c. Render Workspaces list if modal open
    renderWorkspacesList(sessions || []);

    // 2. Auto Mode Pill
    if (settings.autoMode) {
      autoModeToggle.classList.remove('off');
      autoModeText.textContent = 'Auto: ON';
    } else {
      autoModeToggle.classList.add('off');
      autoModeText.textContent = 'Auto: OFF';
    }

    // 3. Duplicate Radar Card
    const dupCount = dedup.totalDuplicateTabsToClose;
    dupBadge.textContent = String(dupCount);

    optQuickAutoCleanDups.checked = Boolean(settings.autoPreventDuplicates);
    optSmartNormalize.checked = settings.smartNormalize !== false;
    optIgnoreHash.checked = settings.ignoreHash !== false;
    optTitleMatch.checked = settings.includeTitleMatch === true;
    optKeepPolicy.value = settings.keepPolicy || 'newest';

    if (dupCount > 0) {
      dupCard.classList.remove('clean');
      dupHeading.textContent = `${dupCount} Duplicate Tab${dupCount > 1 ? 's' : ''} Found`;
      dupSubheading.textContent = `Across ${dedup.clusters.length} URL cluster${dedup.clusters.length > 1 ? 's' : ''}`;
      toggleDupDrawerBtn.classList.remove('hidden');
      cleanAllDupsBtn.classList.remove('hidden');
      cleanAllDupsBtn.textContent = `🧹 Clean ${dupCount}`;
      renderDuplicateClusters(dedup.clusters);
    } else {
      dupCard.classList.add('clean');
      dupHeading.textContent = 'Zero Duplicate Tabs';
      dupSubheading.textContent = 'Your workspace is clean & deduplicated';
      cleanAllDupsBtn.classList.add('hidden');
      toggleDupDrawerBtn.classList.remove('hidden');
      toggleDupDrawerBtn.textContent = dupDrawer.classList.contains('hidden') ? 'Filters ▾' : 'Hide ▴';
      dupClustersList.innerHTML = '<div style="font-size:11px;color:#6ee7b7;padding:4px 2px;">✓ No duplicate clusters detected with current filters.</div>';
    }

    // 4. Strategy Buttons
    strategyButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.strategy === settings.strategy);
    });

    // 5. Auto & Grouping Options
    optMinTabs.value = String(settings.minTabsPerGroup || 2);
    optAutoCollapse.checked = Boolean(settings.autoCollapseInactive);
    optSortWithin.checked = settings.sortWithinGroups !== false;
    optIgnorePinned.checked = settings.ignorePinned !== false;
    optAutoPreventDups.checked = Boolean(settings.autoPreventDuplicates);

    // 6. Custom Rules Strip
    renderCustomRulesStrip(settings.customRules || [], settings.strategy);

    // 7. Live Group Preview
    const stratLabel = STRATEGY_LABELS[settings.strategy] || 'Topic / Area';
    previewSectionTitle.textContent = `Live Plan (${stratLabel})`;
    previewSummaryBadge.textContent = `${plan.groups.length} Groups (${plan.groupedTabCount} tabs)`;

    renderGroupPreviewList(plan);

    // 8. Footer Actions
    organizeBtnText.textContent = `✨ Organize ${plan.groupedTabCount} Tabs (${stratLabel})`;
    undoBtn.disabled = !hasUndoSnapshot;
  }

  function renderDuplicateClusters(clusters) {
    dupClustersList.innerHTML = '';
    for (const cluster of clusters) {
      const row = document.createElement('div');
      row.className = 'dup-cluster-row';

      const info = document.createElement('div');
      info.className = 'dup-cluster-info';

      const title = document.createElement('div');
      title.className = 'dup-cluster-title';
      title.textContent = cluster.title;

      const url = document.createElement('div');
      url.className = 'dup-cluster-url';
      url.textContent = `${cluster.displayUrl} (${cluster.tabs.length} copies)`;

      info.appendChild(title);
      info.appendChild(url);

      const cleanBtn = document.createElement('button');
      cleanBtn.className = 'dup-cluster-btn';
      cleanBtn.textContent = `Close ${cluster.closeTabIds.length} dup`;
      cleanBtn.addEventListener('click', async () => {
        await sendMsg({ type: 'CLEAN_DUPLICATES', tabIds: cluster.closeTabIds });
        showToast(`Closed ${cluster.closeTabIds.length} duplicate tab(s)`);
        await refreshState();
      });

      row.appendChild(info);
      row.appendChild(cleanBtn);
      dupClustersList.appendChild(row);
    }
  }

  function renderCustomRulesStrip(rules, activeStrategy) {
    if (!rules.length && activeStrategy !== 'custom') {
      customRulesStrip.classList.add('hidden');
      return;
    }
    customRulesStrip.classList.remove('hidden');
    customRulesStrip.innerHTML = '';

    for (const rule of rules) {
      const chip = document.createElement('div');
      chip.className = 'rule-chip';
      const hex = window.TabPulseClassifier.COLOR_HEX_MAP[rule.color] || '#3b82f6';
      chip.innerHTML = `
        <span class="rule-dot" style="background:${hex}"></span>
        <span title="Pattern: ${escapeHtml(rule.pattern)}">${escapeHtml(rule.name)}</span>
      `;
      const delBtn = document.createElement('button');
      delBtn.className = 'rule-del-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Delete custom rule';
      delBtn.addEventListener('click', async () => {
        const nextRules = (currentState.settings.customRules || []).filter(r => r.id !== rule.id);
        await sendMsg({ type: 'UPDATE_SETTINGS', settings: { customRules: nextRules } });
        await refreshState();
      });
      chip.appendChild(delBtn);
      customRulesStrip.appendChild(chip);
    }
  }

  function renderGroupPreviewList(plan) {
    groupsPreviewList.innerHTML = '';

    if (plan.groups.length === 0) {
      groupsPreviewList.innerHTML = `
        <div style="text-align:center;color:var(--text-muted);padding:24px 12px;font-size:12px;">
          No groups meet the current threshold (${currentState.settings.minTabsPerGroup}+ tabs).<br/>
          <span style="font-size:11px;opacity:0.8;">Open more tabs or lower the minimum threshold to 1+ Tab in ⚙️ Auto Options.</span>
        </div>
      `;
      return;
    }

    for (const grp of plan.groups) {
      const card = document.createElement('div');
      card.className = 'group-preview-card';

      const sampleSub = grp.domainsList.length > 0
        ? grp.domainsList.join(', ')
        : grp.tabs.map(t => t.title).slice(0, 2).join(', ');

      card.innerHTML = `
        <div class="group-left">
          <div class="group-color-bar" style="background:${grp.colorHex}"></div>
          <div class="group-meta">
            <div class="group-title">${escapeHtml(grp.title)}</div>
            <div class="group-sub">${escapeHtml(sampleSub)}</div>
          </div>
        </div>
        <div class="group-right">
          <span class="group-tab-count">${grp.tabs.length} tab${grp.tabs.length > 1 ? 's' : ''}</span>
          <button class="btn-group-one" title="Group only these tabs now">Group</button>
        </div>
      `;

      const groupOneBtn = card.querySelector('.btn-group-one');
      groupOneBtn.addEventListener('click', async () => {
        await sendMsg({
          type: 'ORGANIZE_SINGLE_GROUP',
          windowId: currentState.windowId,
          tabIds: grp.tabIds,
          title: grp.title,
          color: grp.color
        });
        showToast(`Grouped "${grp.title}" (${grp.tabs.length} tabs)`);
        await refreshState();
      });

      groupsPreviewList.appendChild(card);
    }

    if (plan.ungroupedTabs.length > 0) {
      const ungroupedRow = document.createElement('div');
      ungroupedRow.style.cssText = 'font-size:10.5px;color:var(--text-muted);text-align:center;padding:4px 0;';
      ungroupedRow.textContent = `+ ${plan.ungroupedTabs.length} singleton tab(s) below ${currentState.settings.minTabsPerGroup}-tab threshold left ungrouped`;
      groupsPreviewList.appendChild(ungroupedRow);
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Event Listeners
  autoModeToggle.addEventListener('click', async () => {
    if (!currentState) return;
    const nextAuto = !currentState.settings.autoMode;
    const res = await sendMsg({
      type: 'UPDATE_SETTINGS',
      settings: { autoMode: nextAuto },
      triggerAutoOrganize: nextAuto,
      triggerAutoCleanDups: nextAuto && currentState.settings.autoPreventDuplicates
    });
    if (nextAuto) {
      const cleanedMsg = res && res.autoCleanedCount > 0 ? ` • Cleaned ${res.autoCleanedCount} dup(s)` : '';
      showToast(`🤖 Auto Mode ON${cleanedMsg} & Tabs Organized!`);
    } else {
      showToast('Auto Mode Paused');
    }
    await refreshState();
  });

  scopeToggleBtn.addEventListener('click', async () => {
    if (!currentState) return;
    const nextScope = currentState.settings.scope === 'all' ? 'current' : 'all';
    await sendMsg({ type: 'UPDATE_SETTINGS', settings: { scope: nextScope } });
    await refreshState();
  });

  openSidePanelBtn.addEventListener('click', async () => {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      try {
        const win = await chrome.windows.getCurrent();
        await chrome.sidePanel.open({ windowId: win.id });
        window.close();
      } catch (e) {
        showToast('Side Panel available from toolbar context menu');
      }
    }
  });

  toggleDupDrawerBtn.addEventListener('click', () => {
    dupDrawer.classList.toggle('hidden');
    toggleDupDrawerBtn.textContent = dupDrawer.classList.contains('hidden') ? 'Inspect ▾' : 'Hide ▴';
  });

  cleanAllDupsBtn.addEventListener('click', async () => {
    if (!currentState || !currentState.dedup) return;
    const ids = currentState.dedup.allCloseTabIds;
    if (ids.length === 0) return;
    const res = await sendMsg({ type: 'CLEAN_DUPLICATES', tabIds: ids });
    showToast(`🧹 Cleaned ${res.closedCount} duplicate tab(s)!`);
    await refreshState();
  });

  // Duplicate filter changes
  optQuickAutoCleanDups.addEventListener('change', async () => {
    const enabled = optQuickAutoCleanDups.checked;
    optAutoPreventDups.checked = enabled;
    const res = await sendMsg({
      type: 'UPDATE_SETTINGS',
      settings: { autoPreventDuplicates: enabled },
      triggerAutoCleanDups: enabled
    });
    if (enabled && currentState && currentState.settings.autoMode) {
      showToast(res && res.autoCleanedCount > 0
        ? `🧹 Auto-cleaned ${res.autoCleanedCount} duplicate tab(s)!`
        : '🧹 Auto-Clean Duplicates enabled for Auto Mode');
    } else if (enabled) {
      showToast('Auto-Clean Duplicates will run whenever Auto Mode is ON');
    }
    await refreshState();
  });

  [optSmartNormalize, optIgnoreHash, optTitleMatch, optKeepPolicy].forEach((el) => {
    el.addEventListener('change', async () => {
      await sendMsg({
        type: 'UPDATE_SETTINGS',
        settings: {
          smartNormalize: optSmartNormalize.checked,
          ignoreHash: optIgnoreHash.checked,
          includeTitleMatch: optTitleMatch.checked,
          keepPolicy: optKeepPolicy.value
        }
      });
      await refreshState();
    });
  });

  // Strategy switching
  strategyButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const strategy = btn.dataset.strategy;
      await sendMsg({
        type: 'UPDATE_SETTINGS',
        settings: { strategy },
        triggerAutoOrganize: currentState && currentState.settings.autoMode
      });
      await refreshState();
    });
  });

  // Options Drawer
  toggleOptionsDrawerBtn.addEventListener('click', () => {
    optionsDrawer.classList.toggle('hidden');
  });
  closeOptionsDrawerBtn.addEventListener('click', () => {
    optionsDrawer.classList.add('hidden');
  });

  [optMinTabs, optAutoCollapse, optSortWithin, optIgnorePinned, optAutoPreventDups].forEach((el) => {
    el.addEventListener('change', async () => {
      optQuickAutoCleanDups.checked = optAutoPreventDups.checked;
      const res = await sendMsg({
        type: 'UPDATE_SETTINGS',
        settings: {
          minTabsPerGroup: Number(optMinTabs.value),
          autoCollapseInactive: optAutoCollapse.checked,
          sortWithinGroups: optSortWithin.checked,
          ignorePinned: optIgnorePinned.checked,
          autoPreventDuplicates: optAutoPreventDups.checked
        },
        triggerAutoOrganize: currentState && currentState.settings.autoMode,
        triggerAutoCleanDups: optAutoPreventDups.checked
      });
      if (res && res.autoCleanedCount > 0) {
        showToast(`🧹 Auto-cleaned ${res.autoCleanedCount} duplicate tab(s)!`);
      }
      await refreshState();
    });
  });

  // Organize Now
  organizeNowBtn.addEventListener('click', async () => {
    if (!currentState) return;
    const res = await sendMsg({
      type: 'ORGANIZE_NOW',
      windowId: currentState.windowId,
      strategy: currentState.settings.strategy
    });
    if (res && res.ok) {
      showToast(`✨ Organized ${res.result.groupedTabCount} tabs into ${res.result.groupsCount} groups!`);
      await refreshState();
    }
  });

  collapseAllBtn.addEventListener('click', async () => {
    await sendMsg({ type: 'COLLAPSE_ALL', collapsed: true, windowId: currentState.windowId });
    showToast('📁 Collapsed inactive tab groups');
    await refreshState();
  });

  expandAllBtn.addEventListener('click', async () => {
    await sendMsg({ type: 'COLLAPSE_ALL', collapsed: false, windowId: currentState.windowId });
    showToast('📂 Expanded all tab groups');
    await refreshState();
  });

  ungroupAllBtn.addEventListener('click', async () => {
    const res = await sendMsg({ type: 'UNGROUP_ALL', windowId: currentState.windowId });
    showToast(`🧹 Ungrouped ${res.result ? res.result.ungroupedCount : ''} tabs`);
    await refreshState();
  });

  undoBtn.addEventListener('click', async () => {
    const res = await sendMsg({ type: 'UNDO_LAST' });
    if (res && res.result && res.result.restored) {
      showToast('↩ Restored previous tab layout!');
      await refreshState();
    }
  });

  // Custom Rule Modal
  openCustomRuleModalBtn.addEventListener('click', () => {
    ruleNameInput.value = '';
    rulePatternInput.value = '';
    customRuleModal.classList.remove('hidden');
    ruleNameInput.focus();
  });

  function closeRuleModal() {
    customRuleModal.classList.add('hidden');
  }

  closeRuleModalBtn.addEventListener('click', closeRuleModal);
  cancelRuleBtn.addEventListener('click', closeRuleModal);

  colorDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      selectedRuleColor = dot.dataset.color;
    });
  });

  saveRuleBtn.addEventListener('click', async () => {
    const name = ruleNameInput.value.trim();
    const pattern = rulePatternInput.value.trim();
    if (!name || !pattern) {
      showToast('Please enter both a Group Title and Pattern');
      return;
    }
    const existingRules = (currentState && currentState.settings.customRules) || [];
    const newRule = {
      id: 'rule-' + Date.now(),
      name,
      pattern,
      color: selectedRuleColor,
      enabled: true
    };
    await sendMsg({
      type: 'UPDATE_SETTINGS',
      settings: {
        customRules: [newRule, ...existingRules],
        strategy: 'custom'
      }
    });
    closeRuleModal();
    showToast(`Added custom rule "${name}"`);
    await refreshState();
  });

  // Live refresh when tabs change while popup/sidepanel is open
  chrome.tabs.onUpdated.addListener(() => refreshState());
  chrome.tabs.onRemoved.addListener(() => refreshState());
  chrome.tabs.onCreated.addListener(() => refreshState());

  // --- Instant Cross-Window Tab Search ---
  function renderSearchResults(queryText) {
    const q = (queryText || '').trim().toLowerCase();
    if (!q || !currentState || !Array.isArray(currentState.searchableTabs)) {
      searchResultsDropdown.classList.add('hidden');
      clearSearchBtn.classList.add('hidden');
      return;
    }

    clearSearchBtn.classList.remove('hidden');
    const matches = currentState.searchableTabs.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.url.toLowerCase().includes(q) ||
      (t.groupTitle && t.groupTitle.toLowerCase().includes(q))
    ).slice(0, 12);

    searchResultsDropdown.innerHTML = '';
    if (matches.length === 0) {
      searchResultsDropdown.innerHTML = '<div style="padding:10px;text-align:center;font-size:11px;color:var(--text-muted);">No matching tabs found</div>';
      searchResultsDropdown.classList.remove('hidden');
      return;
    }

    for (const tab of matches) {
      const row = document.createElement('div');
      row.className = 'search-result-row';

      const statusTag = tab.discarded ? '💤 ' : (tab.audible ? '🔊 ' : '');
      const grpTag = tab.groupTitle ? `[${tab.groupTitle}] • ` : '';

      row.innerHTML = `
        <div class="search-result-main">
          <div class="search-result-title">${statusTag}${escapeHtml(tab.title)}</div>
          <div class="search-result-meta">${escapeHtml(grpTag + tab.url.replace(/^https?:\/\/(www\.)?/, ''))}</div>
        </div>
        <button class="search-close-tab" title="Close this tab">✕</button>
      `;

      row.querySelector('.search-result-main').addEventListener('click', async () => {
        await sendMsg({ type: 'JUMP_TO_TAB', tabId: tab.id, windowId: tab.windowId });
        window.close();
      });

      row.querySelector('.search-close-tab').addEventListener('click', async (e) => {
        e.stopPropagation();
        await sendMsg({ type: 'CLOSE_TAB', tabId: tab.id });
        await refreshState();
        renderSearchResults(tabSearchInput.value);
      });

      searchResultsDropdown.appendChild(row);
    }

    searchResultsDropdown.classList.remove('hidden');
  }

  tabSearchInput.addEventListener('input', () => renderSearchResults(tabSearchInput.value));
  clearSearchBtn.addEventListener('click', () => {
    tabSearchInput.value = '';
    renderSearchResults('');
  });

  // --- RAM Saver (Tab Sleeper) & Focus Mode ---
  sleepIdleBtn.addEventListener('click', async () => {
    if (!currentState) return;
    const res = await sendMsg({
      type: 'SLEEP_INACTIVE',
      windowId: currentState.windowId,
      minIdleMinutes: 0
    });
    if (res && res.ok) {
      const c = res.result.sleptCount;
      showToast(c > 0
        ? `💤 Slept ${c} tab(s) (~${res.result.estimatedSavedLabel} RAM freed!)`
        : 'All eligible inactive tabs are already sleeping!');
      await refreshState();
    }
  });

  focusModeBtn.addEventListener('click', async () => {
    if (!currentState) return;
    const res = await sendMsg({
      type: 'ACTIVATE_FOCUS_MODE',
      windowId: currentState.windowId
    });
    if (res && res.ok) {
      const r = res.result;
      showToast(`🎯 Focus Mode: Collapsed ${r.collapsedGroups} & slept ${r.sleptTabs} distraction tab(s)!`);
      await refreshState();
    }
  });

  optAutoSleepMinutes.addEventListener('change', async () => {
    const mins = Number(optAutoSleepMinutes.value) || 0;
    const res = await sendMsg({
      type: 'UPDATE_SETTINGS',
      settings: { autoSleepMinutes: mins },
      windowId: currentState ? currentState.windowId : null,
      triggerAutoSleep: mins > 0
    });
    if (mins > 0) {
      const extra = res && res.autoSleptCount > 0 ? ` (${res.autoSleptCount} slept now)` : '';
      showToast(`💤 Auto-Sleep set to ${mins}m idle${extra}`);
    } else {
      showToast('Auto-Sleep Idle Tabs turned OFF');
    }
    await refreshState();
  });

  // --- Workspace Sessions Modal ---
  function renderWorkspacesList(sessions) {
    workspacesList.innerHTML = '';
    if (!sessions || sessions.length === 0) {
      workspacesList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:16px 8px;font-size:11.5px;">No saved workspaces yet.<br/>Save your current tab groups above to free RAM &amp; restore later!</div>';
      return;
    }

    for (const ws of sessions) {
      const row = document.createElement('div');
      row.className = 'ws-row';
      const dateStr = new Date(ws.createdAt).toLocaleDateString();
      row.innerHTML = `
        <div class="ws-meta">
          <div class="ws-name">${escapeHtml(ws.name)}</div>
          <div class="ws-sub">${ws.tabCount} tabs • ${ws.groupCount} groups • ${dateStr}</div>
        </div>
        <div class="ws-actions">
          <button class="btn-group-one ws-restore-btn" title="Restore workspace in a new window">Restore</button>
          <button class="search-close-tab ws-delete-btn" title="Delete workspace">✕</button>
        </div>
      `;

      row.querySelector('.ws-restore-btn').addEventListener('click', async () => {
        const res = await sendMsg({ type: 'RESTORE_WORKSPACE', sessionId: ws.id, inNewWindow: true });
        if (res && res.ok) {
          showToast(`📸 Restored "${ws.name}" (${res.restoredTabs} tabs)`);
          workspacesModal.classList.add('hidden');
        }
      });

      row.querySelector('.ws-delete-btn').addEventListener('click', async () => {
        await sendMsg({ type: 'DELETE_WORKSPACE', sessionId: ws.id });
        showToast(`Deleted workspace "${ws.name}"`);
        await refreshState();
      });

      workspacesList.appendChild(row);
    }
  }

  openWorkspacesBtn.addEventListener('click', () => {
    workspaceNameInput.value = '';
    workspacesModal.classList.remove('hidden');
    workspaceNameInput.focus();
  });

  closeWorkspacesModalBtn.addEventListener('click', () => {
    workspacesModal.classList.add('hidden');
  });

  saveWorkspaceBtn.addEventListener('click', async () => {
    if (!currentState) return;
    const name = workspaceNameInput.value.trim() || `Workspace ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const closeAfterSave = closeAfterSaveCheckbox.checked;
    const res = await sendMsg({
      type: 'SAVE_WORKSPACE',
      name,
      windowId: currentState.windowId,
      closeAfterSave
    });
    if (res && res.ok) {
      workspaceNameInput.value = '';
      showToast(`📸 Saved "${res.session.name}" (${res.session.tabCount} tabs)`);
      await refreshState();
    } else {
      showToast((res && res.error) || 'Could not save workspace');
    }
  });

  refreshState();
})();
