---
name: run-arg
description: Run, start, screenshot and test the Arg browser game (Stronghold-Crusader-style, Persian/English). Use when asked to run/launch/serve the game, take a screenshot of the menu or in-game UI in fa or en, or run the in-browser test suite.
---

Arg is a static ES-module web game (`index.html` + `game/*.js` + `styles/*.css`) with an optional Node server (`server/server.mjs`: static files + WebSocket `/sock` for multiplayer/hall/cloud save). Agents drive it headless with `driver.mjs` (Playwright + Chromium). Paths below are relative to the repo root.

## Prerequisites
Playwright and Chromium are preinstalled (`/opt/node22/lib/node_modules/playwright`, `/opt/pw-browsers/chromium`). The driver runs `npm install` in `server/` itself on first use (single dependency: `ws`). Node 18+.

## Run (agent path)
```bash
# screenshot of the menu (default fa), or in English
node .claude/skills/run-arg/driver.mjs shot --lang en --out /tmp/arg-menu-en.png
# click "Start single-player" and screenshot the game after 1.5 s
node .claude/skills/run-arg/driver.mjs shot --lang fa --solo --wait 1500 --out /tmp/arg-game.png
# run the full in-browser test suite (?test) -> prints "تست: 237/237 …"
node .claude/skills/run-arg/driver.mjs tests
```
The driver starts `server/server.mjs` on port 8099 (`--port N` to change), opens `/?lang=<fa|en>`, prints console/page errors, writes the screenshot, and stops the server. Exit code 1 = page error, 2 = driver failure. Look at the PNG (Read tool) — a blank or half-styled page means something broke.

## Run (human path)
`cd server && npm install && node server.mjs` then open http://localhost:8080/ (`PORT` env to change). Useless headless; use the driver.

## Gotchas
- Always load through the server (or any static server) — ES modules do not work from `file://`.
- The game starts behind the menu (`#menuScreen`, paused) whose first page is only the list of section buttons (`#navSolo`, `#navMp`, …); use `--solo` to open Single-player and press Start, or `--page solo|mp|profile|settings` to screenshot a sub-page. Language: `?lang=fa|en` overrides the saved choice (`localStorage scw.lang`).
- The console should be clean (no 404s). A page error or console error is a regression. Siege units (ram/catapult) are intentionally vector-drawn (no sprite sheets).
- The test suite needs a browser (6+ tests use `document`/`localStorage`); under plain Node ~8 of 230 fail for that reason only. Use `driver.mjs tests`.
- `game/*.gen.js` are generated inline assets — don't hand-edit. `server/game-logic.js` must stay a verbatim copy of the `<script type="text/x-server-plugin">` block in `index.html` (lines noted in its header).
- If port 8099 is busy: `lsof -ti:8099 | xargs -r kill`.

## Troubleshooting
- `playwright not found` → `npm i -g playwright` (Chromium is at `/opt/pw-browsers`; never run `playwright install`).
- Blank page, `pageerror` about a missing module → a path in `index.html`/`game/*.js` points at the old `src/` layout; assets live in `assets/`, `VERSION` in the root.
