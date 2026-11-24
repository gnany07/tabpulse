# TabPulse — System Architecture & Technical Specifications

This document details the Manifest V3 architecture, semantic classification pipeline, RAM-saving tab sleeper, duplicate deduplication engine, and workspace session manager powering **TabPulse**.

---

## 🏗️ 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph ChromeRuntime ["🌐 Google Chrome Runtime (Manifest V3)"]
        TabsAPI["chrome.tabs API (query, group, remove, discard)"]
        GroupsAPI["chrome.tabGroups API (update, collapse, color)"]
        WindowsAPI["chrome.windows API"]
        SidePanelAPI["chrome.sidePanel API"]
        AlarmsAPI["chrome.alarms API (Idle Sleep Timer)"]
        StorageAPI["chrome.storage.local"]
    end

    subgraph PresentationLayer ["🖥️ Dual UI (Popup + Side Panel: ui/dashboard.*)"]
        SearchBar["🔍 Cross-Window Tab Search & Jump"]
        DupRadar["🧹 Duplicate Radar Card + Auto-Clean Toggle"]
        RamCard["💤 RAM Saver Card + 🎯 Focus Mode"]
        StrategyPicker["5-Mode Strategy Selector + Live Dry-Run Preview"]
        WorkspacesUI["📸 Workspace Sessions Save/Restore Modal"]
        CustomRulesUI["⚡ Custom Rule Builder Modal"]
    end

    subgraph ServiceWorker ["⚙️ Background Service Worker (background.js)"]
        EventRouter["Tab Lifecycle Listeners (onUpdated, onActivated, onRemoved)"]
        AlarmHandler["Periodic Auto-Sleep Alarm Runner"]
        BadgeSync["Toolbar Badge Sync (Duplicate Count / Auto ON)"]
    end

    subgraph CoreEngines ["🧠 Pure Local-First Engines (engine/)"]
        Classifier["classifiers.js (Weighted Multi-Signal Topic + Dynamic Clustering)"]
        Dedup["dedup.js (Smart URL Normalizer & Duplicate Clusters)"]
        Organizer["organizer.js (TabGroups Applicator & 1-Click Undo Snapshot)"]
        Sleeper["sleeper.js (Native chrome.tabs.discard RAM Saver & Focus Mode)"]
        Sessions["sessions.js (Workspace Snapshot Save & Restore)"]
    end

    PresentationLayer <-->|"chrome.runtime.sendMessage"| ServiceWorker
    ServiceWorker --> CoreEngines
    EventRouter --> Dedup
    EventRouter --> Classifier
    AlarmHandler --> Sleeper
    CoreEngines --> TabsAPI
    CoreEngines --> GroupsAPI
    CoreEngines --> WindowsAPI
    CoreEngines <--> StorageAPI
    AlarmsAPI --> AlarmHandler
    SidePanelAPI --> PresentationLayer
```

---

## 🧠 2. Multi-Signal Semantic Topic Classifier Pipeline (`engine/classifiers.js`)

```mermaid
flowchart TD
    Tab["Open Tab (URL + Title + OpenerId + LastAccessed)"] --> CustomCheck{"Matches Custom Rule?"}
    CustomCheck -- Yes --> CustomGroup["⚡ Custom User Group"]
    CustomCheck -- No --> Scorer["Weighted Multi-Signal Scorer"]

    subgraph Scorer ["Weighted Multi-Signal Scoring"]
        PureDom["Pure-Play Domain (+12)"]
        SoftDom["Multi-Topic Platform (+3: Medium, Substack, arXiv, YouTube, GitHub)"]
        TitleHits["Word-Boundary Title Regex (+7 Strong / +4 Support)"]
        UrlHits["URL Path Slug Regex (+5 Strong / +2.5 Support)"]
    end

    Scorer --> ScoreCheck{"Best Score >= 3?"}
    ScoreCheck -- Yes --> BuiltIn["Built-in Semantic Group (🤖 AI & LLM, 💻 Dev & Cloud, 📚 Docs, etc.)"]
    ScoreCheck -- No --> Unmatched["Unmatched Pool"]

    subgraph DynamicCluster ["Dynamic Clustering for Unmatched Tabs"]
        SameDom["Pass 1: Same-Domain Grouping (>= minTabs)"]
        SharedKw["Pass 2: Shared Title/Slug Keyword Clustering (🏷️ Topic)"]
        Articles["Pass 3: Scattered Blog/Article Grouping (📰 News & Reading)"]
    end

    Unmatched --> SameDom --> SharedKw --> Articles
```

---

## 💤 3. Smart RAM Saver & Auto-Clean Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant Chrome as Chrome Tabs
    participant SW as background.js
    participant Dedup as engine/dedup.js
    participant Sleeper as engine/sleeper.js

    Note over User,Sleeper: Flow 1: Auto-Clean Duplicate Interception
    User->>Chrome: Opens URL already open in another tab
    Chrome->>SW: tabs.onUpdated(url)
    SW->>Dedup: normalizeUrl(url) [strips UTM, www, #hash]
    Dedup-->>SW: Duplicate match found (existingTabId)
    SW->>Chrome: Focus existingTabId & remove duplicate tab

    Note over User,Sleeper: Flow 2: Smart RAM Saver (Tab Sleeper)
    SW->>Sleeper: chrome.alarms fires (every 5m) OR User clicks "💤 Sleep Idle"
    Sleeper->>Chrome: Query tabs -> skip active, pinned, audible, chrome://
    Sleeper->>Chrome: chrome.tabs.discard(idleTabIds)
    Note right of Chrome: Tab stays in its Tab Group; frees ~95 MB RAM each
    User->>Chrome: Clicks sleeping tab later
    Chrome-->>User: Tab wakes & reloads natively!
```

---

## 🔒 4. Security & Chrome Web Store Compliance Audit

| Checklist Item | Status | Evidence |
| :--- | :---: | :--- |
| **External Network Requests** | 🟢 **PASS (0 Calls)** | Zero `fetch`, `XHR`, `WebSocket`, or analytics beacons anywhere in codebase. |
| **Dynamic Code Execution** | 🟢 **PASS (0 Found)** | Zero `eval()`, `new Function()`, or inline script tags. Strict MV3 CSP compliant. |
| **Data Privacy** | 🟢 **PASS** | 100% local-first (`chrome.storage.local` only). No remote servers. |
| **RAM Safety** | 🟢 **PASS** | Tab Sleeper strictly protects active, pinned, and audio-playing (`tab.audible`) tabs. |
