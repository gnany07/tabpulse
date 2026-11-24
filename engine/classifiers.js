// TabPulse - Smart 5-Mode Tab Classification Engine
// Modes:
// 1. 'topic'   - Multi-Signal Weighted Semantic Classifier + Dynamic Title/Slug Clustering
// 2. 'domain'  - Brand & Domain Identity (GitHub, Google Docs, AWS, YouTube, etc.)
// 3. 'custom'  - Custom User Rules first (with fallback to Topic)
// 4. 'tree'    - Opener / Research Context Tree (groups tabs spawned from same parent tab)
// 5. 'recency' - Activity & Recency (Active <15m, Warm 15m-2h, Stale >2h)

(function (globalScope) {
  // Valid Chrome TabGroup colors: "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"
  const CHROME_COLORS = ['blue', 'purple', 'cyan', 'green', 'yellow', 'orange', 'red', 'pink', 'grey'];

  const COLOR_HEX_MAP = {
    grey: '#94a3b8',
    blue: '#3b82f6',
    red: '#ef4444',
    yellow: '#eab308',
    green: '#10b981',
    pink: '#ec4899',
    purple: '#a855f7',
    cyan: '#06b6d4',
    orange: '#f97316'
  };

  // Curated Brand Overrides for 'domain' mode
  const BRAND_MAP = {
    'github.com': { title: 'GitHub', color: 'purple' },
    'gitlab.com': { title: 'GitLab', color: 'orange' },
    'bitbucket.org': { title: 'Bitbucket', color: 'blue' },
    'stackoverflow.com': { title: 'Stack Overflow', color: 'orange' },
    'docs.google.com': { title: 'Google Docs', color: 'blue' },
    'drive.google.com': { title: 'Google Drive', color: 'green' },
    'mail.google.com': { title: 'Gmail', color: 'red' },
    'calendar.google.com': { title: 'GCal', color: 'blue' },
    'meet.google.com': { title: 'Google Meet', color: 'green' },
    'gemini.google.com': { title: 'Gemini AI', color: 'cyan' },
    'aistudio.google.com': { title: 'AI Studio', color: 'cyan' },
    'notebooklm.google.com': { title: 'NotebookLM', color: 'cyan' },
    'chatgpt.com': { title: 'ChatGPT', color: 'green' },
    'openai.com': { title: 'OpenAI', color: 'green' },
    'claude.ai': { title: 'Claude AI', color: 'orange' },
    'anthropic.com': { title: 'Anthropic', color: 'orange' },
    'perplexity.ai': { title: 'Perplexity', color: 'cyan' },
    'huggingface.co': { title: 'Hugging Face', color: 'yellow' },
    'youtube.com': { title: 'YouTube', color: 'red' },
    'music.youtube.com': { title: 'YT Music', color: 'red' },
    'open.spotify.com': { title: 'Spotify', color: 'green' },
    'netflix.com': { title: 'Netflix', color: 'red' },
    'twitch.tv': { title: 'Twitch', color: 'purple' },
    'amazon.com': { title: 'Amazon', color: 'yellow' },
    'news.ycombinator.com': { title: 'Hacker News', color: 'orange' },
    'reddit.com': { title: 'Reddit', color: 'orange' },
    'x.com': { title: 'X / Twitter', color: 'grey' },
    'twitter.com': { title: 'X / Twitter', color: 'grey' },
    'linkedin.com': { title: 'LinkedIn', color: 'blue' },
    'figma.com': { title: 'Figma', color: 'pink' },
    'notion.so': { title: 'Notion', color: 'grey' },
    'linear.app': { title: 'Linear', color: 'purple' },
    'slack.com': { title: 'Slack', color: 'purple' },
    'discord.com': { title: 'Discord', color: 'purple' },
    'localhost': { title: 'Localhost', color: 'cyan' },
    '127.0.0.1': { title: 'Localhost', color: 'cyan' }
  };

  /**
   * Weighted Multi-Signal Topic Taxonomy:
   * - pureDomains (+12): dedicated single-topic sites (strong signal)
   * - softDomains (+3): multi-topic platforms (Medium, Substack, arXiv, YouTube, GitHub, Reddit, News)
   *   where title/URL content signals can easily override into AI & LLM, Dev, Finance, etc.
   * - strongRegex (+7 title, +5 url): high-confidence topic terms (word-boundary matched)
   * - supportRegex (+4 title, +3 url): supporting topic terms
   */
  const TOPIC_CATEGORIES = [
    {
      id: 'ai',
      title: '🤖 AI & LLM',
      color: 'cyan',
      pureDomains: [
        'chatgpt.com', 'openai.com', 'claude.ai', 'anthropic.com', 'gemini.google.com',
        'aistudio.google.com', 'notebooklm.google.com', 'deepmind.google', 'deepmind.com',
        'perplexity.ai', 'huggingface.co', 'midjourney.com', 'poe.com', 'deepseek.com',
        'groq.com', 'replicate.com', 'cursor.com', 'v0.dev', 'windsurf.com', 'codeium.com',
        'mistral.ai', 'cohere.com', 'x.ai', 'meta.ai', 'openrouter.ai', 'together.ai',
        'fireworks.ai', 'cerebras.ai', 'ollama.com', 'vllm.ai', 'lmarena.ai', 'lmsys.org',
        'langchain.com', 'llamaindex.ai', 'langfuse.com', 'weights.gg', 'wandb.ai',
        'pytorch.org', 'tensorflow.org', 'keras.io', 'kaggle.com', 'paperswithcode.com',
        'towardsdatascience.com', 'machinelearningmastery.com', 'distill.pub', 'deeplearning.ai',
        'fast.ai', 'simonwillison.net', 'lilianweng.github.io', 'karpathy.ai', 'karpathy.github.io',
        'huyenchip.com', 'jalammar.github.io', 'sebastianraschka.com', 'interconnects.ai',
        'latent.space', 'alignmentforum.org', 'transformer-circuits.pub', 'bensbites.com',
        'thebatch.ai', 'pinecone.io', 'weaviate.io', 'qdrant.tech', 'trychroma.com', 'milvus.io',
        'stability.ai', 'runwayml.com', 'elevenlabs.io', 'suno.com', 'civitai.com', 'braintrust.dev',
        'modal.com', 'baseten.co', 'anyscale.com', 'scale.com', 'databricks.com', 'mlflow.org'
      ],
      softDomains: [
        'research.google', 'ai.meta.com', 'blog.google'
      ],
      strongRegex: /\b(ai|a\.i\.|llm|llms|genai|gen\s*ai|agi|asi|rag|rlhf|dpo|grpo|ppo|sft|lora|qlora|peft|vllm|sglang|gguf|ggml|ollama|mcp|a2a|gpt[\s\-]?\d*[a-z]*|chatgpt|openai|claude|anthropic|gemini|deepmind|mistral|mixtral|llama[\s\-]?\d*|qwen[\s\-]?\d*|deepseek|grok|perplexity|cohere|huggingface|hugging\s*face|langchain|langgraph|llamaindex|autogen|crewai|pydantic\s*ai|dspy|smolagents|pytorch|tensorflow|jax|triton|flash[\s\-]?attention|kv[\s\-]?cache|transformers?|attention\s+is\s+all|diffusion\s+model|stable\s+diffusion|midjourney|flux|sora|whisper|multimodal|vision[\s\-]?language|vlms?|embeddings?|vector\s+db|vector\s+database|vector\s+search|semantic\s+search|fine[\s\-]?tun(?:e|ing|ed)|post[\s\-]?training|pre[\s\-]?training|quantiz(?:e|ation|ed)|speculative\s+decoding|mixture\s+of\s+experts|moe|chain[\s\-]?of[\s\-]?thought|prompt\s+engineering|system\s+prompt|function\s+calling|tool\s+use|tool\s+calling|context\s+window|context\s+engineering|ai\s+agents?|agentic|coding\s+agents?|autonomous\s+agents?|mechanistic\s+interpretability|ai\s+alignment|ai\s+safety|hallucinations?|llm\s+evals?|llm\s+benchmarks?|artificial\s+intelligence|machine\s+learning|deep\s+learning|neural\s+net(?:work)?s?|large\s+language\s+models?|foundation\s+models?|frontier\s+models?|reasoning\s+models?|inference\s+engine|tokeniz(?:er|ation)|karpathy|notebooklm|openrouter|comfyui|copilot|claude\s+code|codex|cursor\s+ai|model\s+context\s+protocol)\b/gi,
      supportRegex: /\b(ml|nlp|reinforcement\s+learning|supervised\s+learning|unsupervised|backprop|gradient\s+descent|checkpoints?|model\s+weights|billion\s+param|\d+b\s+model|cuda|gpu\s+cluster|tpu|tensors?|inference|tokens?\s+per\s+second|ttft|sonnet|opus|haiku|o1|o3|o4|evals?|benchmarks?|leaderboard|datasets?|synthetic\s+data|distillation|pruning|chunking|rerank(?:er|ing)?|guardrails?|agents?|prompts?|llmops|mlops|autoregressive|softmax|logit|perplexity|alignment|scaling\s+laws?)\b/gi
    },
    {
      id: 'dev',
      title: '💻 Dev & Cloud',
      color: 'purple',
      pureDomains: [
        'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'stackexchange.com',
        'localhost', '127.0.0.1', '0.0.0.0', 'npmjs.com', 'pypi.org', 'crates.io', 'pkg.go.dev',
        'vercel.com', 'netlify.com', 'cloudflare.com', 'console.aws.amazon.com', 'console.cloud.google.com',
        'portal.azure.com', 'render.com', 'railway.app', 'supabase.com', 'firebase.google.com',
        'docker.com', 'hub.docker.com', 'codepen.io', 'jsfiddle.net', 'codesandbox.io', 'replit.com',
        'leetcode.com', 'hackerrank.com', 'codeforces.com', 'kubernetes.io', 'terraform.io',
        'datadoghq.com', 'sentry.io', 'grafana.com', 'postman.com', 'insomnia.rest', 'swagger.io',
        'chromewebstore.google.com', 'developer.chrome.com'
      ],
      softDomains: [
        'github.com', 'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com'
      ],
      strongRegex: /\b(pull\s+request|git\s+commit|repository|dockerfile|docker\s+compose|kubernetes|k8s|terraform|ci\/cd|github\s+actions|microservices|rest\s+api|graphql|grpc|websocket|postgresql|mongodb|redis|kafka|typescript|javascript|golang|rustlang|c\+\+|cmake|webpack|vite|nextjs|react\s+hooks|node\.?js|nginx|linux\s+kernel|b[\s\-]?tree|r[\s\-]?tree|distributed\s+systems|system\s+design|leetcode|compiler|debugger|localhost)\b/gi,
      supportRegex: /\b(api|sdk|cli|sql|nosql|aws|gcp|azure|cloud|devops|backend|frontend|fullstack|database|schema|migration|deploy|deployment|container|server|endpoint|middleware|runtime|manifest|extension|chrome\s+api|npm|pip|cargo|brew|git)\b/gi
    },
    {
      id: 'docs',
      title: '📚 Docs & Research',
      color: 'blue',
      pureDomains: [
        'developer.mozilla.org', 'docs.python.org', 'react.dev', 'nodejs.org',
        'scholar.google.com', 'coursera.org', 'edx.org', 'udemy.com', 'khanacademy.org',
        'canvas.gatech.edu', 'gatech.edu', 'overleaf.com', 'researchgate.net', 'ieee.org',
        'acm.org', 'springer.com', 'nature.com', 'sciencedirect.com', 'mit.edu', 'stanford.edu',
        'piazza.com', 'edstem.org', 'gradescope.com', 'readthedocs.io', 'gitbook.io'
      ],
      softDomains: [
        'arxiv.org', 'wikipedia.org', 'medium.com', 'substack.com', 'dev.to', 'hashnode.com'
      ],
      strongRegex: /\b(documentation|api\s+reference|whitepaper|syllabus|lecture\s+notes|coursework|textbook|homework|assignment|research\s+paper|proceedings|ieee|acm|dissertation|thesis|tutorial|cheatsheet|handbook)\b/gi,
      supportRegex: /\b(docs|guide|manual|specification|reference|wiki|study|course|university|exam|notes|paper|abstract|citation)\b/gi
    },
    {
      id: 'work',
      title: '🗂️ Work & Productivity',
      color: 'green',
      pureDomains: [
        'docs.google.com', 'drive.google.com', 'sheets.google.com', 'slides.google.com',
        'calendar.google.com', 'mail.google.com', 'notion.so', 'linear.app', 'atlassian.net',
        'jira.com', 'trello.com', 'asana.com', 'monday.com', 'figma.com', 'miro.com',
        'airtable.com', 'dropbox.com', 'box.com', 'office.com', 'sharepoint.com',
        'zoom.us', 'meet.google.com', 'calendly.com', 'clickup.com', 'coda.io', 'todoist.com'
      ],
      softDomains: [],
      strongRegex: /\b(google\s+docs|google\s+sheets|google\s+slides|google\s+drive|gmail|calendar|spreadsheet|presentation|kanban|sprint\s+board|jira|confluence|roadmap|standup|meeting\s+notes|figma|wireframe)\b/gi,
      supportRegex: /\b(workspace|inbox|schedule|project\s+plan|task\s+list|backlog|ticket|dashboard|resume|cv)\b/gi
    },
    {
      id: 'social',
      title: '💬 Social & Comms',
      color: 'orange',
      pureDomains: [
        'slack.com', 'discord.com', 'web.whatsapp.com', 'telegram.org', 'messenger.com',
        'linkedin.com', 'threads.net', 'bsky.app', 'instagram.com', 'facebook.com', 'lobste.rs'
      ],
      softDomains: [
        'x.com', 'twitter.com', 'reddit.com', 'news.ycombinator.com'
      ],
      strongRegex: /\b(direct\s+messages|dm|subreddit|hacker\s+news|linkedin\s+feed|discord\s+server|slack\s+channel|whatsapp)\b/gi,
      supportRegex: /\b(profile|followers|feed|community|forum|comments|thread|post|messages)\b/gi
    },
    {
      id: 'media',
      title: '🎬 Media & Music',
      color: 'red',
      pureDomains: [
        'music.youtube.com', 'netflix.com', 'hulu.com', 'disneyplus.com',
        'max.com', 'primevideo.com', 'twitch.tv', 'open.spotify.com', 'soundcloud.com',
        'vimeo.com', 'plex.tv', 'crunchyroll.com', 'letterboxd.com', 'imdb.com', 'apple.tv'
      ],
      softDomains: [
        'youtube.com'
      ],
      strongRegex: /\b(netflix|spotify|twitch|livestream|official\s+music\s+video|soundtrack|lo[\s\-]?fi|playlist|episode\s+\d+|season\s+\d+|movie\s+trailer|podcast\s+episode)\b/gi,
      supportRegex: /\b(watch|video|stream|music|album|song|podcast|cinema|film|trailer)\b/gi
    },
    {
      id: 'shopping',
      title: '🛒 Shopping & Deals',
      color: 'yellow',
      pureDomains: [
        'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'bestbuy.com', 'costco.com',
        'etsy.com', 'aliexpress.com', 'newegg.com', 'bhphotovideo.com', 'nike.com',
        'instacart.com', 'doordash.com', 'ubereats.com', 'ikea.com', 'homedepot.com', 'wayfair.com'
      ],
      softDomains: [
        'apple.com'
      ],
      strongRegex: /\b(shopping\s+cart|add\s+to\s+cart|checkout|track\s+package|order\s+summary|buy\s+now|black\s+friday|promo\s+code|coupon)\b/gi,
      supportRegex: /\b(price|shipping|delivery|store|shop|deal|discount|review|wishlist|order)\b/gi
    },
    {
      id: 'finance',
      title: '📈 Finance & Crypto',
      color: 'green',
      pureDomains: [
        'finance.yahoo.com', 'tradingview.com', 'coinbase.com', 'binance.com', 'robinhood.com',
        'fidelity.com', 'schwab.com', 'vanguard.com', 'chase.com', 'americanexpress.com',
        'bankofamerica.com', 'capitalone.com', 'stripe.com', 'paypal.com', 'wise.com',
        'interactivebrokers.com', 'kraken.com', 'coingecko.com', 'coinmarketcap.com'
      ],
      softDomains: [
        'bloomberg.com', 'wsj.com', 'cnbc.com', 'ft.com'
      ],
      strongRegex: /\b(portfolio|stock\s+price|nasdaq|s&p\s*500|nyse|earnings\s+call|balance\s+sheet|bank\s+statement|wire\s+transfer|crypto|bitcoin|ethereum|options\s+trading|dividend|etf|401k|ira)\b/gi,
      supportRegex: /\b(finance|investing|market|ticker|invoice|billing|payment|ledger|tax|trading)\b/gi
    },
    {
      id: 'news',
      title: '📰 News & Reading',
      color: 'pink',
      pureDomains: [
        'nytimes.com', 'bbc.com', 'cnn.com', 'reuters.com', 'apnews.com', 'theguardian.com',
        'washingtonpost.com', 'economist.com', 'theatlantic.com', 'newyorker.com'
      ],
      softDomains: [
        'theverge.com', 'techcrunch.com', 'arstechnica.com', 'wired.com', 'venturebeat.com',
        'forbes.com', 'businessinsider.com', 'zdnet.com', 'engadget.com', '9to5mac.com'
      ],
      strongRegex: /\b(breaking\s+news|front\s+page|editorial|opinion|newsletter|daily\s+briefing|headlines)\b/gi,
      supportRegex: /\b(news|article|report|journal|press|blog|essay|analysis|interview)\b/gi
    }
  ];

  // Stop words ignored during automatic dynamic keyword clustering of unmatched tabs
  const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'about', 'what',
    'when', 'where', 'which', 'while', 'will', 'have', 'been', 'more', 'most', 'some',
    'such', 'than', 'then', 'them', 'they', 'their', 'there', 'here', 'just', 'like',
    'also', 'very', 'only', 'over', 'under', 'after', 'before', 'between', 'through',
    'how', 'why', 'who', 'can', 'could', 'should', 'would', 'does', 'did', 'not', 'but',
    'are', 'was', 'were', 'has', 'had', 'its', 'our', 'out', 'all', 'any', 'new', 'now',
    'one', 'two', 'top', 'best', 'free', 'full', 'open', 'using', 'used', 'use', 'make',
    'making', 'build', 'building', 'guide', 'intro', 'introduction', 'part', 'overview',
    'home', 'page', 'index', 'blog', 'post', 'posts', 'article', 'articles', 'read',
    'view', 'site', 'web', 'www', 'http', 'https', 'com', 'org', 'net', 'io', 'dev',
    'app', 'html', 'htm', 'php', 'asp', 'utm', 'ref', '2023', '2024', '2025', '2026', '2027'
  ]);

  function hashStringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return CHROME_COLORS[hash % (CHROME_COLORS.length - 1)]; // avoid grey when possible
  }

  /**
   * Counts distinct regex matches in a text string (prevents a single repeated word from skewing scores).
   */
  function countDistinctMatches(regex, text) {
    if (!regex || !text) return 0;
    const matches = text.match(regex);
    if (!matches) return 0;
    const unique = new Set(matches.map(m => m.toLowerCase().trim()));
    return unique.size;
  }

  /**
   * Extracts clean brand/domain info from a URL.
   */
  function getDomainGroup(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'file:') {
        return { key: 'domain:local-files', title: 'Local Files', color: 'cyan' };
      }
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (!host) {
        return { key: 'domain:system', title: 'System', color: 'grey' };
      }

      // Direct match in brand map
      if (BRAND_MAP[host]) {
        const b = BRAND_MAP[host];
        return { key: `domain:${b.title.toLowerCase()}`, title: b.title, color: b.color };
      }

      // Check suffix match in brand map (e.g., console.aws.amazon.com)
      if (host.endsWith('.aws.amazon.com')) {
        return { key: 'domain:aws', title: 'AWS Cloud', color: 'orange' };
      }
      if (host.endsWith('.edu')) {
        const parts = host.split('.');
        const school = parts[parts.length - 2].toUpperCase();
        return { key: `domain:${school.toLowerCase()}`, title: `${school} Edu`, color: 'blue' };
      }

      // Extract root brand name from registrable domain
      const parts = host.split('.');
      let core = parts[0];
      if (parts.length >= 2) {
        const secondLast = parts[parts.length - 2];
        if (['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'].includes(secondLast) && parts.length >= 3) {
          core = parts[parts.length - 3];
        } else {
          core = secondLast;
        }
      }

      const prettyTitle = core.length <= 3
        ? core.toUpperCase()
        : core.charAt(0).toUpperCase() + core.slice(1);

      return {
        key: `domain:${core}`,
        title: prettyTitle,
        color: hashStringToColor(core)
      };
    } catch (_) {
      return { key: 'domain:other', title: 'Other', color: 'grey' };
    }
  }

  /**
   * Matches a tab against user-defined Custom Rules.
   */
  function matchCustomRules(tab, customRules = []) {
    if (!Array.isArray(customRules) || customRules.length === 0) return null;
    const urlLower = (tab.url || '').toLowerCase();
    const titleLower = (tab.title || '').toLowerCase();

    for (const rule of customRules) {
      if (!rule || !rule.pattern || !rule.name) continue;
      if (rule.enabled === false) continue;

      const patterns = rule.pattern
        .split(',')
        .map(p => p.trim().toLowerCase())
        .filter(Boolean);

      for (const pat of patterns) {
        if (pat.includes('*')) {
          const escaped = pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
          try {
            const regex = new RegExp(escaped, 'i');
            if (regex.test(urlLower) || regex.test(titleLower)) {
              return {
                key: `custom:${rule.name.toLowerCase()}`,
                title: rule.name,
                color: CHROME_COLORS.includes(rule.color) ? rule.color : 'blue',
                ruleId: rule.id
              };
            }
          } catch (_) {}
        } else if (urlLower.includes(pat) || titleLower.includes(pat)) {
          return {
            key: `custom:${rule.name.toLowerCase()}`,
            title: rule.name,
            color: CHROME_COLORS.includes(rule.color) ? rule.color : 'blue',
            ruleId: rule.id
          };
        }
      }
    }
    return null;
  }

  function hostMatchesList(host, domainList) {
    if (!host || !Array.isArray(domainList)) return false;
    for (const dom of domainList) {
      const d = dom.toLowerCase();
      if (host === d || host.endsWith('.' + d)) return true;
    }
    return false;
  }

  /**
   * Weighted Multi-Signal Semantic Classifier for a single tab.
   * Evaluates domain purity, subdomain/TLD heuristics, page title, and URL path slugs.
   * Returns { key, title, color, score, matchedBy } or null if no built-in topic scored.
   */
  function scoreTopicGroup(tab) {
    const rawUrl = (tab.url || '');
    const title = (tab.title || '');
    let host = '';
    let urlPathText = '';

    try {
      const parsed = new URL(rawUrl);
      host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      // Convert URL path + query into space-separated words for clean word-boundary matching
      urlPathText = decodeURIComponent(parsed.pathname + ' ' + parsed.search)
        .replace(/[-_/+?.=&%]+/g, ' ')
        .toLowerCase();
    } catch (_) {
      urlPathText = rawUrl.replace(/[-_/+?.=&%]+/g, ' ').toLowerCase();
    }

    const titleLower = title.toLowerCase();
    let bestCat = null;
    let bestScore = 0;

    for (const cat of TOPIC_CATEGORIES) {
      let score = 0;

      // 1. Domain signals
      if (hostMatchesList(host, cat.pureDomains)) {
        score += 12;
      } else if (hostMatchesList(host, cat.softDomains)) {
        score += 3;
      }

      // 2. Subdomain / TLD heuristics
      if (cat.id === 'ai') {
        if (host.endsWith('.ai') || host.startsWith('ai.')) score += 6;
      } else if (cat.id === 'docs') {
        if (host.startsWith('docs.') || host.includes('wiki') || host.endsWith('.edu')) score += 4;
      } else if (cat.id === 'dev') {
        if (host.startsWith('local') || rawUrl.includes(':3000') || rawUrl.includes(':5173') || rawUrl.includes(':8080')) {
          score += 10;
        }
      }

      // 3. Title & URL path keyword scoring (word-boundary matched)
      const strongTitleHits = countDistinctMatches(cat.strongRegex, titleLower);
      const strongUrlHits = countDistinctMatches(cat.strongRegex, urlPathText);
      const supportTitleHits = countDistinctMatches(cat.supportRegex, titleLower);
      const supportUrlHits = countDistinctMatches(cat.supportRegex, urlPathText);

      // Cap per-signal contributions slightly while letting rich topic titles win decisively
      score += Math.min(strongTitleHits, 4) * 7;
      score += Math.min(strongUrlHits, 3) * 5;
      score += Math.min(supportTitleHits, 3) * 4;
      score += Math.min(supportUrlHits, 3) * 2.5;

      // Slight tie-breaker priority for specific content topics (AI, Dev, Finance) over generic platforms
      if (score > bestScore) {
        bestScore = score;
        bestCat = cat;
      }
    }

    if (bestCat && bestScore >= 3) {
      return {
        key: `topic:${bestCat.id}`,
        title: bestCat.title,
        color: bestCat.color,
        score: bestScore
      };
    }

    return null;
  }

  /**
   * Public single-tab topic classifier (falls back to domain if no semantic match).
   */
  function getTopicGroup(tab) {
    const scored = scoreTopicGroup(tab);
    if (scored) return scored;

    const domainFallback = getDomainGroup(tab.url);
    return {
      key: `topic:domain:${domainFallback.key}`,
      title: `🌐 ${domainFallback.title}`,
      color: domainFallback.color,
      isFallback: true
    };
  }

  /**
   * Extracts meaningful keywords from a tab's title and URL path for dynamic clustering.
   */
  function extractClusterTokens(tab) {
    let text = (tab.title || '').toLowerCase();
    try {
      const parsed = new URL(tab.url || '');
      text += ' ' + decodeURIComponent(parsed.pathname).replace(/[-_/+.]+/g, ' ').toLowerCase();
    } catch (_) {}

    const rawTokens = text.match(/[a-z][a-z0-9+#]{2,}/g) || [];
    const uniqueTokens = new Set();
    for (const tok of rawTokens) {
      if (tok.length < 3 || tok.length > 24) continue;
      if (STOP_WORDS.has(tok)) continue;
      uniqueTokens.add(tok);
    }
    return Array.from(uniqueTokens);
  }

  function isLikelyArticleTab(tab) {
    const url = (tab.url || '').toLowerCase();
    const title = (tab.title || '').trim();
    if (/\/(blog|blogs|post|posts|article|articles|news|essay|essays|p|stories|insights|engineering)\//i.test(url)) {
      return true;
    }
    // Long descriptive titles with >= 5 words are usually articles or guides
    if (title.split(/\s+/).length >= 5 && title.length >= 32) {
      return true;
    }
    return false;
  }

  /**
   * Dynamically clusters unmatched tabs in 'topic' mode:
   * 1) Same domain (if >= minTabs)
   * 2) Shared title/URL topic keyword across different sites (e.g., 3 articles about "Kubernetes" or "Rust")
   * 3) Remaining multi-site articles -> "📰 Articles & Reading"
   */
  function clusterUnmatchedTabs(unmatchedTabs, minTabsPerGroup, bucketMap) {
    const remaining = new Set(unmatchedTabs);

    // Pass 1: Group unmatched tabs that share the exact same domain
    const byDomain = new Map();
    for (const tab of remaining) {
      const d = getDomainGroup(tab.url);
      if (!byDomain.has(d.key)) byDomain.set(d.key, { meta: d, tabs: [] });
      byDomain.get(d.key).tabs.push(tab);
    }
    for (const entry of byDomain.values()) {
      if (entry.tabs.length >= minTabsPerGroup) {
        const key = `topic:domain:${entry.meta.key}`;
        addTabsToBucket(bucketMap, key, `🌐 ${entry.meta.title}`, entry.meta.color, entry.tabs, false);
        for (const t of entry.tabs) remaining.delete(t);
      }
    }

    // Pass 2: Dynamic shared keyword clustering across different domains
    let foundCluster = true;
    while (foundCluster && remaining.size >= minTabsPerGroup) {
      foundCluster = false;
      const tokenToTabs = new Map();

      for (const tab of remaining) {
        const tokens = extractClusterTokens(tab);
        for (const tok of tokens) {
          if (!tokenToTabs.has(tok)) tokenToTabs.set(tok, []);
          tokenToTabs.get(tok).push(tab);
        }
      }

      let bestToken = null;
      let bestTabs = null;
      let bestWeight = 0;

      for (const [tok, tabsList] of tokenToTabs.entries()) {
        if (tabsList.length < minTabsPerGroup) continue;
        // Prefer tokens shared by more tabs, and slightly longer / more specific words
        const weight = tabsList.length * 10 + Math.min(tok.length, 10);
        if (weight > bestWeight) {
          bestWeight = weight;
          bestToken = tok;
          bestTabs = tabsList;
        }
      }

      if (bestToken && bestTabs) {
        const label = bestToken.length <= 3
          ? bestToken.toUpperCase()
          : bestToken.charAt(0).toUpperCase() + bestToken.slice(1);
        const key = `topic:auto:${bestToken}`;
        addTabsToBucket(bucketMap, key, `🏷️ ${label}`, hashStringToColor(bestToken), bestTabs, false);
        for (const t of bestTabs) remaining.delete(t);
        foundCluster = true;
      }
    }

    // Pass 3: Remaining scattered articles/blog posts -> group into Reading / Articles
    const leftoverArticles = Array.from(remaining).filter(isLikelyArticleTab);
    if (leftoverArticles.length >= minTabsPerGroup) {
      addTabsToBucket(bucketMap, 'topic:news', '📰 News & Reading', 'pink', leftoverArticles, false);
      for (const t of leftoverArticles) remaining.delete(t);
    }

    // Any final singletons remain ungrouped
    for (const tab of remaining) {
      const d = getDomainGroup(tab.url);
      addTabsToBucket(bucketMap, `topic:singleton:${tab.id}`, `🌐 ${d.title}`, d.color, [tab], false);
    }
  }

  function addTabsToBucket(bucketMap, key, title, color, tabsList, isCustomRule) {
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        key,
        title,
        color,
        colorHex: COLOR_HEX_MAP[color] || '#6366f1',
        isCustomRule: Boolean(isCustomRule),
        tabs: [],
        domains: new Set()
      });
    }
    const bucket = bucketMap.get(key);
    for (const tab of tabsList) {
      bucket.tabs.push(tab);
      try {
        const h = new URL(tab.url).hostname.replace(/^www\./, '');
        if (h) bucket.domains.add(h);
      } catch (_) {}
    }
  }

  /**
   * Classifies a tab by Activity / Recency.
   */
  function getRecencyGroup(tab, nowMs = Date.now()) {
    if (tab.active) {
      return { key: 'recency:active', title: '🔥 Active (< 15m)', color: 'green' };
    }
    const lastAccessed = tab.lastAccessed || nowMs;
    const ageMinutes = Math.max(0, (nowMs - lastAccessed) / 60000);

    if (ageMinutes <= 15) {
      return { key: 'recency:active', title: '🔥 Active (< 15m)', color: 'green' };
    } else if (ageMinutes <= 120) {
      return { key: 'recency:warm', title: '⏳ Warm (15m – 2h)', color: 'yellow' };
    } else {
      return { key: 'recency:stale', title: '💤 Stale (> 2h)', color: 'grey' };
    }
  }

  /**
   * Builds a complete grouping plan for a list of tabs under the chosen strategy.
   * Strategies: 'topic' | 'domain' | 'custom' | 'tree' | 'recency'
   */
  function buildGroupingPlan(tabs, strategy = 'topic', settings = {}) {
    const minTabsPerGroup = Number(settings.minTabsPerGroup) || 2;
    const ignorePinned = settings.ignorePinned !== false;
    const customRules = settings.customRules || [];
    const nowMs = Date.now();

    const eligibleTabs = tabs.filter(t => {
      if (!t || !t.url) return false;
      if (ignorePinned && t.pinned) return false;
      if (t.url.startsWith('chrome://newtab') || t.url.startsWith('chrome-extension://')) return false;
      return true;
    });

    const tabById = new Map();
    for (const t of eligibleTabs) {
      tabById.set(t.id, t);
    }

    function findRootOpener(tab) {
      let curr = tab;
      const visited = new Set([curr.id]);
      while (curr.openerTabId && tabById.has(curr.openerTabId) && !visited.has(curr.openerTabId)) {
        visited.add(curr.openerTabId);
        curr = tabById.get(curr.openerTabId);
      }
      return curr;
    }

    const bucketMap = new Map();
    const unmatchedForTopic = [];

    for (const tab of eligibleTabs) {
      let classification = null;

      // Custom rules always take top priority if defined & matched
      if (strategy === 'custom' || settings.alwaysApplyCustomRules !== false) {
        classification = matchCustomRules(tab, customRules);
      }

      if (classification) {
        addTabsToBucket(bucketMap, classification.key, classification.title, classification.color, [tab], true);
        continue;
      }

      if (strategy === 'domain') {
        const d = getDomainGroup(tab.url);
        addTabsToBucket(bucketMap, d.key, d.title, d.color, [tab], false);
      } else if (strategy === 'tree') {
        const root = findRootOpener(tab);
        const rootBrand = getDomainGroup(root.url);
        const shortTitle = (root.title || rootBrand.title).slice(0, 18).trim();
        addTabsToBucket(bucketMap, `tree:${root.id}`, `🌿 ${rootBrand.title}: ${shortTitle}`, rootBrand.color, [tab], false);
      } else if (strategy === 'recency') {
        const r = getRecencyGroup(tab, nowMs);
        addTabsToBucket(bucketMap, r.key, r.title, r.color, [tab], false);
      } else {
        // 'topic' or fallback from 'custom'
        const scored = scoreTopicGroup(tab);
        if (scored) {
          addTabsToBucket(bucketMap, scored.key, scored.title, scored.color, [tab], false);
        } else {
          unmatchedForTopic.push(tab);
        }
      }
    }

    // Run dynamic clustering on unmatched tabs in Topic / Custom modes
    if (unmatchedForTopic.length > 0) {
      clusterUnmatchedTabs(unmatchedForTopic, minTabsPerGroup, bucketMap);
    }

    const activeGroups = [];
    const ungroupedTabs = [];

    for (const bucket of bucketMap.values()) {
      const effectiveMin = (bucket.isCustomRule || strategy === 'recency') ? 1 : minTabsPerGroup;
      if (bucket.tabs.length >= effectiveMin) {
        if (settings.sortWithinGroups !== false) {
          bucket.tabs.sort((a, b) => (a.url || '').localeCompare(b.url || ''));
        }
        activeGroups.push({
          key: bucket.key,
          title: bucket.title,
          color: bucket.color,
          colorHex: bucket.colorHex,
          tabs: bucket.tabs,
          tabIds: bucket.tabs.map(t => t.id),
          domainsList: Array.from(bucket.domains).slice(0, 4)
        });
      } else {
        ungroupedTabs.push(...bucket.tabs);
      }
    }

    activeGroups.sort((a, b) => b.tabs.length - a.tabs.length);

    return {
      strategy,
      totalEligibleTabs: eligibleTabs.length,
      groupedTabCount: activeGroups.reduce((acc, g) => acc + g.tabs.length, 0),
      groups: activeGroups,
      ungroupedTabs
    };
  }

  /**
   * Classifies a single tab (used by Auto Mode when a single tab updates).
   */
  function classifySingleTab(tab, allWindowTabs, strategy = 'topic', settings = {}) {
    const plan = buildGroupingPlan(allWindowTabs, strategy, settings);
    for (const group of plan.groups) {
      if (group.tabIds.includes(tab.id)) {
        return group;
      }
    }
    return null;
  }

  const api = {
    CHROME_COLORS,
    COLOR_HEX_MAP,
    TOPIC_CATEGORIES,
    BRAND_MAP,
    getDomainGroup,
    getTopicGroup,
    scoreTopicGroup,
    getRecencyGroup,
    matchCustomRules,
    buildGroupingPlan,
    classifySingleTab
  };

  globalScope.TabPulseClassifier = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
