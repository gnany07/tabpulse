# Google Chrome Web Store Publishing Guide — TabPulse

Complete checklist to publish **TabPulse** (`v1.1.0`) to the official Google Chrome Web Store.

---

## 1. Build the Production Package

```bash
node generate_icons.js
node generate_store_assets.js
node pack.js
```

Upload the generated package:
- `dist/tabpulse-v1.1.0.zip`

---

## 2. Store Listing Information

- **Product Name**: `TabPulse - Smart Tab Group Organizer, RAM Saver & Duplicate Cleaner`
- **Summary** (117 chars, under 132-char limit):
  > `Smart tab group organizer (Auto & Manual) with Duplicate Tab Cleaner, RAM Saver Tab Sleeper, Focus Mode & Workspaces.`
- **Category**: `Productivity` (or `Workflow & Planning`)
- **Language**: `English`
- **Detailed Description**:
  ```markdown
  Tame tab overload effortlessly with TabPulse — a 100% local-first Chrome Tab Group Organizer, Duplicate Tab Cleaner, RAM Saver (Tab Sleeper), Focus Mode, and Workspace Session Manager.

  KEY FEATURES:
  • 5 Smart Grouping Strategies (Auto & Manual Modes):
    - 🧠 Topic / Area: Multi-signal semantic classifier (AI & LLM, Dev & Cloud, Docs & Research, Work & Productivity, Social, Media, Shopping, Finance, News) + automatic dynamic keyword clustering for niche topics.
    - 🌐 By Domain / Brand: Clean brand groups (GitHub, Google Docs, AWS, YouTube, etc.) with deterministic colors.
    - ⚡ Custom Rules: Map URL wildcards, domains, or title keywords to custom group names & colors.
    - 🌿 Opener Tree: Keep tabs opened from the same parent search or research trail grouped together.
    - ⏱️ By Activity: Separate Active (<15m), Warm (15m–2h), and Stale (>2h) tabs.

  • 🤖 Real-Time Auto Mode + Manual Dry-Run Preview:
    - Automatically groups new tabs, auto-collapses inactive groups, sorts tabs alphabetically, and protects pinned tabs.
    - Live Dry-Run Preview lets you inspect proposed groups before organizing, with 1-Click Undo Snapshot.

  • 🧹 Duplicate Tab Radar & Auto-Clean:
    - Detects exact & normalized duplicates (strips UTM tracking params, www, trailing slashes, optional #hash, or Title+Domain match).
    - 1-Click Clean All OR toggle "Auto-Clean Duplicates" to automatically delete duplicates in Auto Mode.

  • 💤 Smart RAM Saver (Tab Sleeper) & 🎯 Focus Mode:
    - Frees ~50–150 MB RAM per sleeping tab using Chrome's native tab discard API — tabs stay in their groups and wake up automatically when clicked!
    - Smartly protects active, pinned, and audio-playing tabs. Includes automatic idle-sleep timer (15m / 30m / 1h / 2h).
    - 1-Click Focus Mode collapses & sleeps distracting groups (Media, Social, Shopping) while keeping work groups open.

  • 📸 Workspace Sessions & 🔍 Instant Tab Search:
    - Save your current organized tab groups as named Workspaces, optionally close tabs to free 100% RAM, and restore them anytime.
    - Search & jump to any tab across all open Chrome windows instantly.
    - Works in both Toolbar Popup and persistent Chrome Side Panel!

  PRIVACY FIRST:
  • 100% local-first — zero tracking, zero analytics, zero external servers, zero ads.
  ```

---

## 3. Privacy Practices Tab (Exact Justifications)

- **Single Purpose**:
  > *"Organizes browser tabs into Chrome Tab Groups, cleans duplicate tabs, sleeps inactive tabs to save RAM, and saves/restores tab workspaces locally."*
- **Permission Justifications**:
  - `tabs`: *"Used locally to read open tab URLs/titles for grouping, duplicate detection, cross-window search, and native chrome.tabs.discard() RAM sleeping."*
  - `tabGroups`: *"Used to create, title, color, collapse, and expand native Chrome Tab Groups."*
  - `storage`: *"Used strictly to store user preferences, custom rules, temporary undo snapshot, and user-saved Workspace Sessions locally via chrome.storage.local."*
  - `sidePanel`: *"Used to provide an optional persistent Chrome Side Panel view of the tab organizer dashboard."*
  - `alarms`: *"Used to run the optional periodic idle-tab RAM sleeper check in Manifest V3."*
- **Data Usage Disclosure**:
  - Check: **[x] I do not collect or use user data**
- **Privacy Policy URL** (after enabling GitHub Pages on `gnany07/tabpulse`):
  - `https://gnany07.github.io/tabpulse/privacy_policy.html`

---

## 4. Store Graphic Assets (in `store_assets/` & `icons/`)

| Asset | Dimensions | File |
| :--- | :--- | :--- |
| **Store Icon** | 128 × 128 px | `icons/icon128.png` |
| **Store Screenshot** | 1280 × 800 px | `store_assets/screenshot_1280x800_dashboard.png` |
| **Small Promo Tile** | 440 × 280 px | `store_assets/promo_small_440x280.png` |
| **Marquee Promo Tile** | 1400 × 560 px | `store_assets/promo_marquee_1400x560.png` |
