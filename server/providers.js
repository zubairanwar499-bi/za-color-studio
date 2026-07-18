// ---------------------------------------------------------------------------
// Multi-provider AI chain with automatic key rotation.
//
// How it works:
//  - Each provider has a list of API keys (parsed from env, comma-separated).
//  - We keep an in-memory "cooldown" per key: if a key gets rate-limited
//    (HTTP 429) or rejected (401/403), it's marked unavailable for a while
//    (or permanently for this process, for auth errors) and we move to the
//    next key. If every key for a provider is unavailable, we move to the
//    next provider entirely.
//  - The final provider is a zero-dependency local generator, so the chain
//    always succeeds even with no keys configured at all.
// ---------------------------------------------------------------------------

const RATE_LIMIT_COOLDOWN_MS = 60 * 1000; // retry a 429'd key after 60s
const AUTH_FAIL_COOLDOWN_MS = 60 * 60 * 1000; // retry a bad-key after 1hr (in case it was transient)

function parseKeys(envVal) {
  return (envVal || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

class KeyPool {
  constructor(name, keys) {
    this.name = name;
    this.keys = keys.map((key) => ({ key, blockedUntil: 0, lastError: null }));
    this.cursor = 0;
  }

  availableKey() {
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.cursor + i) % this.keys.length;
      const entry = this.keys[idx];
      if (entry.blockedUntil <= now) {
        this.cursor = idx;
        return entry;
      }
    }
    return null;
  }

  advance() {
    this.cursor = (this.cursor + 1) % Math.max(this.keys.length, 1);
  }

  block(entry, ms, reason) {
    entry.blockedUntil = Date.now() + ms;
    entry.lastError = reason;
  }

  status() {
    const now = Date.now();
    return {
      provider: this.name,
      totalKeys: this.keys.length,
      availableKeys: this.keys.filter((k) => k.blockedUntil <= now).length,
      keys: this.keys.map((k, i) => ({
        index: i,
        state: k.blockedUntil <= now ? "available" : "cooling_down",
        retryInMs: Math.max(0, k.blockedUntil - now),
        lastError: k.lastError,
      })),
    };
  }
}

const SYSTEM_PROMPT = `You are a color system generator for a design tool. Given a short UI description, return STRICT JSON only, no markdown fences, no prose, matching exactly this shape:
{"palettes":[{"name":"string (2-3 words)","mood":"string (2-3 words, e.g. 'Bold . Energetic')","colors":{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","surface":"#hex","text":"#hex","success":"#hex","warning":"#hex","danger":"#hex","border":"#hex"}}]}
Return exactly 3 palettes. Ensure text has strong contrast against background, and accent is vivid. All colors must be valid 6-digit hex codes.`;

function extractJson(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model output");
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!parsed.palettes || !Array.isArray(parsed.palettes) || parsed.palettes.length === 0) {
    throw new Error("Model response missing palettes[]");
  }
  return parsed.palettes.slice(0, 3);
}

// ---- Provider callers (each throws on failure, with .status set) ----------

async function callOpenAICompatible({ baseURL, model, apiKey, extraHeaders, prompt }) {
  const res = await fetch(baseURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
    }),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty completion");
  return extractJson(text);
}

async function callGemini({ apiKey, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUI description: ${prompt}` }] }],
      generationConfig: { temperature: 0.9 },
    }),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty completion");
  return extractJson(text);
}

// ---- Local, zero-dependency fallback (always succeeds) --------------------

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hashPrompt(str) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function localGenerate(prompt) {
  const seed = hashPrompt(prompt || "za color studio");
  const baseHue = seed % 360;
  const sets = [
    { offset: 0, name: "Signal Palette", mood: "Confident . Clear" },
    { offset: 130, name: "Studio Mix", mood: "Balanced . Modern" },
    { offset: 250, name: "Fresh Direction", mood: "Bold . Distinct" },
  ];
  return sets.map(({ offset, name, mood }) => {
    const h = (baseHue + offset) % 360;
    return {
      name,
      mood,
      colors: {
        primary: hslToHex(h, 55, 28),
        secondary: hslToHex((h + 190) % 360, 45, 55),
        accent: hslToHex((h + 38) % 360, 85, 58),
        background: hslToHex(h, 20, 96),
        surface: "#FFFFFF",
        text: hslToHex(h, 35, 14),
        success: hslToHex(150, 55, 45),
        warning: hslToHex(42, 90, 55),
        danger: hslToHex(4, 75, 58),
        border: hslToHex(h, 20, 88),
      },
    };
  });
}

// ---- Chain orchestration ---------------------------------------------------

const pools = {
  groq: new KeyPool("Groq", parseKeys(process.env.GROQ_API_KEYS)),
  openrouter: new KeyPool("OpenRouter", parseKeys(process.env.OPENROUTER_API_KEYS)),
  gemini: new KeyPool("Gemini", parseKeys(process.env.GEMINI_API_KEYS)),
};

async function tryProvider(poolKey, invoke) {
  const pool = pools[poolKey];
  const attempts = Math.max(pool.keys.length, 0);
  for (let i = 0; i < attempts; i++) {
    const entry = pool.availableKey();
    if (!entry) return null; // all keys cooling down
    try {
      const palettes = await invoke(entry.key);
      entry.lastError = null;
      return { palettes, providerUsed: pool.name, keyIndex: pool.keys.indexOf(entry) };
    } catch (err) {
      const status = err.status;
      if (status === 429) {
        pool.block(entry, RATE_LIMIT_COOLDOWN_MS, "rate_limited (429)");
      } else if (status === 401 || status === 403) {
        pool.block(entry, AUTH_FAIL_COOLDOWN_MS, `auth_rejected (${status})`);
      } else {
        // transient/network/parse error - short cooldown, try next key
        pool.block(entry, 5000, err.message);
      }
      pool.advance();
    }
  }
  return null;
}

async function generatePalettes(prompt) {
  const chain = [
    () =>
      tryProvider("groq", (key) =>
        callOpenAICompatible({
          baseURL: "https://api.groq.com/openai/v1/chat/completions",
          model: "llama-3.3-70b-versatile",
          apiKey: key,
          prompt,
        })
      ),
    () =>
      tryProvider("openrouter", (key) =>
        callOpenAICompatible({
          baseURL: "https://openrouter.ai/api/v1/chat/completions",
          model: "meta-llama/llama-3.1-8b-instruct:free",
          apiKey: key,
          extraHeaders: { "HTTP-Referer": "https://za-color-studio.local", "X-Title": "ZA Color Studio" },
          prompt,
        })
      ),
    () => tryProvider("gemini", (key) => callGemini({ apiKey: key, prompt })),
  ];

  for (const attempt of chain) {
    const result = await attempt();
    if (result) return result;
  }

  // Every configured provider/key is exhausted or nothing is configured —
  // guaranteed-success local fallback.
  return { palettes: localGenerate(prompt), providerUsed: "Local (offline generator)", keyIndex: null };
}

function providerStatus() {
  return {
    chainOrder: ["Groq", "OpenRouter", "Gemini", "Local (offline generator)"],
    pools: Object.values(pools).map((p) => p.status()),
  };
}

module.exports = { generatePalettes, providerStatus, localGenerate };
