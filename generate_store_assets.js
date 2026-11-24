// TabPulse - Chrome Web Store Promotional Assets & Screenshot Generator
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (_) {
  try {
    sharp = require(path.join(__dirname, '..', 'Momentum', 'node_modules', 'sharp'));
  } catch (e) {
    console.error('sharp not found. Run `npm install -D sharp` to regenerate store PNG assets.');
    process.exit(1);
  }
}

const outDir = path.join(__dirname, 'store_assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function smallPromoSvg() {
  return `<svg width="440" height="280" viewBox="0 0 440 280" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="55%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#0b0f19"/>
      </linearGradient>
      <linearGradient id="acc" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
    </defs>
    <rect width="440" height="280" fill="url(#bg)"/>
    <rect x="24" y="24" width="52" height="52" rx="14" fill="url(#acc)"/>
    <rect x="34" y="36" width="32" height="6" rx="3" fill="#38bdf8"/>
    <rect x="34" y="47" width="24" height="6" rx="3" fill="#34d399"/>
    <rect x="34" y="58" width="32" height="6" rx="3" fill="#fbbf24"/>
    <text x="90" y="50" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800">TabPulse</text>
    <text x="90" y="72" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">Smart Tab Groups • RAM Saver • Dedup</text>

    <rect x="24" y="102" width="186" height="44" rx="10" fill="#131b2e" stroke="#38bdf8" stroke-opacity="0.45"/>
    <text x="38" y="128" fill="#67e8f9" font-family="system-ui, sans-serif" font-size="13" font-weight="700">AI &amp; LLM (7 tabs)</text>

    <rect x="224" y="102" width="192" height="44" rx="10" fill="#131b2e" stroke="#a855f7" stroke-opacity="0.45"/>
    <text x="238" y="128" fill="#e9d5ff" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Dev &amp; Cloud (5 tabs)</text>

    <rect x="24" y="158" width="186" height="44" rx="10" fill="#131b2e" stroke="#f59e0b" stroke-opacity="0.5"/>
    <text x="38" y="184" fill="#fde68a" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Auto-Clean Duplicates</text>

    <rect x="224" y="158" width="192" height="44" rx="10" fill="#131b2e" stroke="#10b981" stroke-opacity="0.5"/>
    <text x="238" y="184" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="13" font-weight="700">1.4 GB RAM Saved</text>

    <rect x="24" y="218" width="392" height="38" rx="10" fill="url(#acc)"/>
    <text x="220" y="242" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="700">Auto &amp; Manual Tab Organizer • 100% Local-First</text>
  </svg>`;
}

function marqueePromoSvg() {
  return `<svg width="1400" height="560" viewBox="0 0 1400 560" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b0f19"/>
        <stop offset="50%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="acc" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
    </defs>
    <rect width="1400" height="560" fill="url(#bg)"/>
    <rect x="80" y="95" width="76" height="76" rx="20" fill="url(#acc)"/>
    <rect x="96" y="113" width="44" height="9" rx="4.5" fill="#38bdf8"/>
    <rect x="96" y="129" width="32" height="9" rx="4.5" fill="#34d399"/>
    <rect x="96" y="145" width="44" height="9" rx="4.5" fill="#fbbf24"/>

    <text x="178" y="142" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="56" font-weight="800">TabPulse</text>
    <text x="178" y="176" fill="#a5b4fc" font-family="system-ui, sans-serif" font-size="22" font-weight="600">Smart Chrome Tab Group Organizer, RAM Saver &amp; Duplicate Cleaner</text>

    <text x="80" y="255" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="24" font-weight="600">• 5 Grouping Modes: Topic/Area, Domain, Custom Rules, Opener Tree, Activity</text>
    <text x="80" y="302" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="24" font-weight="600">• Smart RAM Saver: Auto-sleep idle tabs (frees ~100MB/tab, wakes on click)</text>
    <text x="80" y="349" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="24" font-weight="600">• Duplicate Tab Radar: 1-Click Clean &amp; Real-Time Auto-Clean in Auto Mode</text>
    <text x="80" y="396" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="24" font-weight="600">• Focus Mode, Cross-Window Tab Search, Workspace Sessions &amp; 1-Click Undo</text>

    <rect x="80" y="445" width="420" height="54" rx="14" fill="url(#acc)"/>
    <text x="290" y="479" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="20" font-weight="700">100% Local-First • Zero Telemetry</text>

    <!-- Right Preview Card -->
    <rect x="960" y="70" width="370" height="420" rx="22" fill="#0b0f19" stroke="#6366f1" stroke-width="2" stroke-opacity="0.6"/>
    <rect x="984" y="96" width="322" height="56" rx="12" fill="#131b2e" stroke="#f59e0b" stroke-opacity="0.5"/>
    <text x="1002" y="122" fill="#fde68a" font-family="system-ui, sans-serif" font-size="16" font-weight="700">4 Duplicate Tabs Detected</text>
    <text x="1002" y="142" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Auto-Clean Duplicates: ON</text>

    <rect x="984" y="168" width="322" height="56" rx="12" fill="#131b2e" stroke="#06b6d4" stroke-opacity="0.5"/>
    <text x="1002" y="194" fill="#67e8f9" font-family="system-ui, sans-serif" font-size="16" font-weight="700">~1.4 GB RAM Saved (15 Sleeping)</text>
    <text x="1002" y="214" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Click any sleeping tab to wake natively</text>

    <rect x="984" y="242" width="322" height="48" rx="10" fill="#131b2e" stroke="#06b6d4" stroke-opacity="0.35"/>
    <rect x="996" y="254" width="8" height="24" rx="4" fill="#06b6d4"/>
    <text x="1016" y="272" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="15" font-weight="700">AI &amp; LLM — 7 tabs</text>

    <rect x="984" y="302" width="322" height="48" rx="10" fill="#131b2e" stroke="#a855f7" stroke-opacity="0.35"/>
    <rect x="996" y="314" width="8" height="24" rx="4" fill="#a855f7"/>
    <text x="1016" y="332" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="15" font-weight="700">Dev &amp; Cloud — 6 tabs</text>

    <rect x="984" y="362" width="322" height="48" rx="10" fill="#131b2e" stroke="#10b981" stroke-opacity="0.35"/>
    <rect x="996" y="374" width="8" height="24" rx="4" fill="#10b981"/>
    <text x="1016" y="392" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="15" font-weight="700">Work &amp; Docs — 5 tabs</text>

    <rect x="984" y="426" width="322" height="44" rx="11" fill="url(#acc)"/>
    <text x="1145" y="454" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="15" font-weight="700">Organize 18 Tabs (Topic / Area)</text>
  </svg>`;
}

function screenshotSvg() {
  return `<svg width="1280" height="800" viewBox="0 0 1280 800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b0f19"/>
        <stop offset="50%" stop-color="#171e36"/>
        <stop offset="100%" stop-color="#0b0f19"/>
      </linearGradient>
      <linearGradient id="acc" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
    </defs>
    <rect width="1280" height="800" fill="url(#bg)"/>

    <!-- Simulated Chrome Tab Bar -->
    <rect x="60" y="48" width="1160" height="58" rx="14" fill="#1e293b" stroke="#334155"/>
    <rect x="82" y="61" width="145" height="32" rx="8" fill="#06b6d4"/>
    <text x="154" y="82" text-anchor="middle" fill="#082f49" font-family="system-ui, sans-serif" font-size="13" font-weight="800">AI &amp; LLM (7)</text>

    <rect x="240" y="61" width="160" height="32" rx="8" fill="#a855f7"/>
    <text x="320" y="82" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="13" font-weight="800">Dev &amp; Cloud (6)</text>

    <rect x="414" y="61" width="155" height="32" rx="8" fill="#10b981"/>
    <text x="491" y="82" text-anchor="middle" fill="#052e16" font-family="system-ui, sans-serif" font-size="13" font-weight="800">Work &amp; Docs (4)</text>

    <rect x="582" y="61" width="140" height="32" rx="8" fill="#f59e0b" fill-opacity="0.85"/>
    <text x="652" y="82" text-anchor="middle" fill="#0f172a" font-family="system-ui, sans-serif" font-size="13" font-weight="800">Media (Paused)</text>

    <!-- Left Feature Storytelling -->
    <text x="80" y="210" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="48" font-weight="800">Tame Tab Overload.</text>
    <text x="80" y="264" fill="#818cf8" font-family="system-ui, sans-serif" font-size="48" font-weight="800">Save Gigabytes of RAM.</text>
    <text x="80" y="318" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="20">Auto &amp; Manual Chrome Tab Groups, Duplicate Cleaner, Tab Sleeper &amp; Workspaces.</text>

    <rect x="80" y="365" width="580" height="74" rx="14" fill="#131b2e" stroke="#38bdf8" stroke-opacity="0.4"/>
    <text x="106" y="397" fill="#67e8f9" font-family="system-ui, sans-serif" font-size="18" font-weight="700">1. Smart Semantic Topic Classifier + Dynamic Clustering</text>
    <text x="106" y="423" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Groups AI/LLM articles across Medium, arXiv, Substack &amp; blogs automatically</text>

    <rect x="80" y="458" width="580" height="74" rx="14" fill="#131b2e" stroke="#f59e0b" stroke-opacity="0.4"/>
    <text x="106" y="490" fill="#fde68a" font-family="system-ui, sans-serif" font-size="18" font-weight="700">2. Duplicate Tab Radar + Auto-Clean Mode</text>
    <text x="106" y="516" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Strips UTM params &amp; #hashes; auto-deletes duplicate tabs in real time</text>

    <rect x="80" y="551" width="580" height="74" rx="14" fill="#131b2e" stroke="#10b981" stroke-opacity="0.4"/>
    <text x="106" y="583" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="18" font-weight="700">3. RAM Saver Tab Sleeper &amp; Focus Mode</text>
    <text x="106" y="609" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Sleeps idle tabs natively (~95MB freed/tab); click any tab to wake instantly</text>

    <rect x="80" y="644" width="580" height="74" rx="14" fill="#131b2e" stroke="#a855f7" stroke-opacity="0.4"/>
    <text x="106" y="676" fill="#e9d5ff" font-family="system-ui, sans-serif" font-size="18" font-weight="700">4. Saved Workspace Sessions &amp; Cross-Window Search</text>
    <text x="106" y="702" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Save entire grouped windows, free 100% RAM, and restore in 1 click</text>

    <!-- Right Popup Dashboard Mock -->
    <rect x="740" y="145" width="460" height="600" rx="22" fill="#0b0f19" stroke="#6366f1" stroke-width="2.5" stroke-opacity="0.65"/>
    <rect x="765" y="172" width="410" height="50" rx="12" fill="#131b2e"/>
    <text x="785" y="203" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="20" font-weight="800">TabPulse</text>
    <rect x="1065" y="182" width="95" height="30" rx="15" fill="#10b981" fill-opacity="0.22" stroke="#10b981"/>
    <text x="1112" y="202" text-anchor="middle" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Auto: ON</text>

    <rect x="765" y="238" width="410" height="78" rx="12" fill="#131b2e" stroke="#f59e0b" stroke-opacity="0.5"/>
    <text x="785" y="268" fill="#fde68a" font-family="system-ui, sans-serif" font-size="16" font-weight="700">4 Duplicate Tabs Found</text>
    <text x="785" y="294" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="13">Auto-Clean Duplicates (in Auto Mode): ON</text>

    <rect x="765" y="330" width="410" height="72" rx="12" fill="#131b2e" stroke="#06b6d4" stroke-opacity="0.5"/>
    <text x="785" y="360" fill="#67e8f9" font-family="system-ui, sans-serif" font-size="16" font-weight="700">~1.4 GB RAM Saved • 15 Sleeping Tabs</text>
    <text x="785" y="384" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Auto-Sleep Idle: After 30m • Focus Mode Ready</text>

    <rect x="765" y="420" width="410" height="54" rx="11" fill="#131b2e" stroke="#06b6d4" stroke-opacity="0.35"/>
    <rect x="779" y="434" width="8" height="26" rx="4" fill="#06b6d4"/>
    <text x="800" y="452" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="15" font-weight="700">AI &amp; LLM — 7 tabs</text>

    <rect x="765" y="486" width="410" height="54" rx="11" fill="#131b2e" stroke="#a855f7" stroke-opacity="0.35"/>
    <rect x="779" y="500" width="8" height="26" rx="4" fill="#a855f7"/>
    <text x="800" y="518" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="15" font-weight="700">Dev &amp; Cloud — 6 tabs</text>

    <rect x="765" y="552" width="410" height="54" rx="11" fill="#131b2e" stroke="#10b981" stroke-opacity="0.35"/>
    <rect x="779" y="566" width="8" height="26" rx="4" fill="#10b981"/>
    <text x="800" y="584" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="15" font-weight="700">Work &amp; Productivity — 4 tabs</text>

    <rect x="765" y="628" width="410" height="50" rx="12" fill="url(#acc)"/>
    <text x="970" y="659" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="700">Organize 17 Tabs (Topic / Area)</text>

    <text x="970" y="715" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Collapse  •  Expand  •  Ungroup  •  Undo Last</text>
  </svg>`;
}

(async () => {
  await sharp(Buffer.from(smallPromoSvg())).png().toFile(path.join(outDir, 'promo_small_440x280.png'));
  await sharp(Buffer.from(marqueePromoSvg())).png().toFile(path.join(outDir, 'promo_marquee_1400x560.png'));
  await sharp(Buffer.from(screenshotSvg())).png().toFile(path.join(outDir, 'screenshot_1280x800_dashboard.png'));
  console.log('Generated all Chrome Web Store PNG assets in store_assets/!');
})();
