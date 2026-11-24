# TabPulse ⚡ — Smart Chrome Tab Group Organizer, RAM Saver & Duplicate Cleaner

**TabPulse** is a zero-dependency, 100% local-first **Manifest V3 Chrome Extension** that organizes your tabs into native Chrome Tab Groups (**Auto Mode** & **Manual Dry-Run Preview**), automatically detects and cleans **Duplicate Tabs**, frees browser memory with a **Smart RAM Saver (Tab Sleeper)**, shields distractions with **Focus Mode**, and saves/restores **Workspace Sessions**.

> 📐 **System Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md) for Mermaid architecture, classification pipeline, and RAM sleeper sequence diagrams.  
> 🏪 **Chrome Web Store Guide**: See [STORE_GUIDE.md](STORE_GUIDE.md) and [privacy_policy.html](privacy_policy.html).

---

## ✨ Features

### 1. 🧠 5 Smart Grouping Strategies (Auto & Manual Mode)
- **🧠 Topic / Area**: Multi-signal weighted semantic classifier (`🤖 AI & LLM`, `💻 Dev & Cloud`, `📚 Docs & Research`, `🗂️ Work & Productivity`, `💬 Social & Comms`, `🎬 Media & Music`, `🛒 Shopping & Deals`, `📈 Finance & Crypto`, `📰 News & Reading`) + **Dynamic Keyword Clustering** for niche topics across different websites.
- **🌐 By Domain / Brand**: Clean brand groups (`GitHub`, `Google Docs`, `AWS Cloud`, `YouTube`, etc.) with deterministic Chrome colors.
- **⚡ Custom Rules**: User-defined URL wildcards, domains, or title keywords mapped to custom group names & colors.
- **🌿 Opener Tree**: Tracks `openerTabId` lineage so research trails spawned from a parent tab stay grouped together.
- **⏱️ By Activity / Recency**: Separates `🔥 Active (< 15m)`, `⏳ Warm (15m – 2h)`, and `💤 Stale (> 2h)` tabs.

### 2. 🧹 Duplicate Tab Radar & Auto-Clean
- Live toolbar badge counter showing duplicate tab count.
- **Smart Normalized URL Matching**: Strips tracking params (`utm_*`, `fbclid`, `gclid`), `www.`, trailing slashes, optional `#hash`, or Title+Domain matching.
- **Always-Visible `🤖 Auto-Clean Duplicates` Toggle**: Automatically intercepts and closes existing & newly opened duplicate tabs when Auto Mode is ON.

### 3. 💤 Smart RAM Saver (Tab Sleeper) & 🎯 Focus Mode
- Uses Chrome's native `chrome.tabs.discard()` API to free **~50–150 MB RAM per inactive tab** while keeping tabs visible in their groups — **clicking any sleeping tab wakes it up automatically**.
- Protects active, pinned, and audio/video-playing (`tab.audible`) tabs.
- Configurable **Auto-Sleep Idle Timer** (`Off`, `15m`, `30m`, `1h`, `2h`) powered by `chrome.alarms`.
- **🎯 Focus Mode**: 1-click collapse & sleep for distracting groups (`Media`, `Social`, `Shopping`, `News`) while expanding work/dev/AI groups.

### 4. 📸 Workspace Sessions, 🔍 Cross-Window Search & ↩ Undo
- **📸 Workspace Sessions**: Save current organized tab groups as named workspaces (optionally closing tabs to free 100% RAM) and restore them in a new window anytime.
- **🔍 Instant Tab Search**: Filter and jump to (or close) any tab across all Chrome windows.
- **↩ 1-Click Undo Snapshot**: Restore your previous tab layout before the last organize action.
- Works seamlessly in both the **Toolbar Popup** and **Chrome Side Panel**.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Alt + Shift + O` | Organize tabs using active grouping strategy |
| `Alt + Shift + D` | Clean duplicate tabs |
| `Alt + Shift + S` | Sleep inactive tabs to save RAM |

---

## 🚀 Local Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/gnany07/tabpulse.git
   ```
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `tabpulse` folder.

## 📦 Build Chrome Web Store Zip
```bash
node generate_icons.js
node generate_store_assets.js
node pack.js
```

## 📄 License
MIT License — see [LICENSE](LICENSE).
