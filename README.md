# ZA Color Studio

A full working AI palette generator: Express + JSON-file backend, and a
frontend with real client-side routing — every sidebar tab (Dashboard, AI
Generate, Color Library, Favorites, History, Settings) is a live, working
view, not a static mockup.

## Quick start

```bash
npm install
cp .env.example .env      # optional — see "Free API keys" below
npm start
```

Then open **http://localhost:3000**.

That's it — no database to install, no build step. If you skip the `.env`
step entirely, palette generation still works: it automatically falls back
to a built-in local generator.

## What's actually wired up

| Tab | What it does |
|---|---|
| **Dashboard** | Live counts of your generated/favorited palettes, pulled from the backend, with quick links to the other tabs |
| **AI Generate** | Prompt bar → `POST /api/generate` → 3 real palettes, live-repainted dashboard preview, WCAG contrast checker, harmony wheel, CSS/Tailwind/JSON export |
| **Color Library** | `GET /api/library` — 12 curated built-in palettes, filterable by tag |
| **Favorites** | Server-persisted list (`data/favorites.json`) — star any palette anywhere in the app to save it here |
| **History** | Every AI generation, persisted to `data/history.json`, with delete / clear-all |
| **Settings** | Theme toggle + a live view of the AI provider chain and which keys are currently available vs. cooling down |

All tabs use a real hash router (`#generate`, `#library`, etc.) in
`public/js/app.js` — clicking a sidebar item actually navigates and loads
data for that view.

## Free API keys with automatic switching

`server/providers.js` tries providers **in order**, and rotates through
every key you give a provider before moving on:

```
Groq  →  OpenRouter  →  Google Gemini  →  Local generator (no key, never fails)
```

If a key gets rate-limited (HTTP 429), it's put on a 60-second cooldown and
the next key/provider is tried immediately — same request, no user-visible
failure. If a key is invalid (401/403) it's cooled down for an hour. If
every configured key on every provider is unavailable, the built-in local
generator produces a palette instantly, so `/api/generate` always returns
something.

### Where to get free keys

- **Groq** — https://console.groq.com/keys (free tier, fast, generous limits)
- **OpenRouter** — https://openrouter.ai/keys (use a model ID ending in `:free`)
- **Google Gemini** — https://aistudio.google.com/apikey (free tier)

Put them in `.env` (comma-separate multiples for the same provider):

```
GROQ_API_KEYS=gsk_aaaa,gsk_bbbb
OPENROUTER_API_KEYS=sk-or-xxxx
GEMINI_API_KEYS=AIzaSyxxxx
```

Restart the server after editing `.env`. Check **Settings** in the app, or
`GET /api/status`, to see live key availability per provider.

## Project structure

```
za-color-studio/
├── server/
│   ├── index.js        Express app entry point
│   ├── providers.js     AI provider chain + key rotation + local fallback
│   ├── library.js        Curated starter palettes
│   ├── db.js               Tiny JSON-file persistence layer
│   └── routes/
│       ├── generate.js  POST /api/generate, GET /api/status
│       ├── history.js    GET/DELETE /api/history
│       ├── favorites.js GET/POST/DELETE /api/favorites
│       └── library.js    GET /api/library
├── public/
│   ├── index.html            App shell
│   ├── css/style.css          All styling
│   └── js/app.js                 Router + views + API calls + live preview
├── data/                                 JSON "database" files (auto-created)
└── .env.example
```

## Swapping in a real database later

`server/db.js` is the only file that touches storage. Replace its four
functions (`getHistory`, `setHistory`, `getFavorites`, `setFavorites`) with
calls to Postgres/Mongo/whatever — nothing in `routes/` needs to change.

## Deploying

This is a standard Node/Express app — it runs as-is on Render, Railway,
Fly.io, a VPS, etc. Set your provider keys as environment variables on
whichever platform you use instead of a local `.env` file.
