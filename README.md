# vikas · games

A tiny browser arcade. Deploys to Vercel as static files.

## Layout

```
/
├── index.html        ← hub: renders tiles from games.json
├── games.json        ← manifest of games (add a new entry to add a tile)
├── vercel.json       ← clean URLs + caching
├── velvet-hour/      ← interactive narrative
│   ├── index.html
│   └── cover.svg
└── echo/             ← sonar survival arcade
    ├── index.html
    └── cover.svg
```

## Adding a new game

1. Drop the game's folder at the repo root (e.g. `my-game/`) with its own `index.html` and a `cover.svg` (or `cover.png`).
2. Add an entry to `games.json`:

```json
{
  "id": "my-game",
  "title": "My Game",
  "blurb": "What it is, in one sentence.",
  "tags": ["arcade"],
  "minutes": 10,
  "accent": "#7fffd4",
  "background": "linear-gradient(135deg, #001a1f, #002233)",
  "cover": "my-game/cover.svg",
  "href": "my-game/",
  "controls": "touch / mouse"
}
```

3. Push — the hub will fetch the new manifest on next load and a tile will appear.

All fields except `id`/`title`/`href` are optional. If `cover` is missing, the hub
shows a two-letter placeholder in the game's accent color.

## Mobile

- `velvet-hour` is fully touch-friendly (tap to choose).
- `echo` ships with an on-screen joystick + PING button on touch devices.
- The hub uses safe-area insets so it lays out cleanly on notched phones.

## Deploy

Every game is **fully self-contained** — its folder has no references to the
hub or to sibling games. You can deploy in three different ways:

### A. Deploy each game on its own Vercel project (independent URLs)

For each game, create a Vercel project and set the **Root Directory** to that
game's folder. No build command, no framework — it's just static files.

| Game          | Root Directory  | Result                          |
|---------------|-----------------|---------------------------------|
| Echo          | `echo/`         | game lives at `/`               |
| Velvet Hour   | `velvet-hour/`  | game lives at `/`               |

This is the right setup if you want `echo.example.com` and
`velvet-hour.example.com` (or two unrelated `*.vercel.app` URLs).

### B. Deploy the whole arcade as one site

Create one Vercel project with the **repo root** as Root Directory.
You get the hub at `/`, with each game at `/echo/`, `/velvet-hour/`, etc.

### C. Mix and match

You can do both: one project per game *and* one project for the whole
arcade — they don't interfere. The `index.html` and `games.json` at the
root are only used by setup B; setup A ignores them entirely.

No build command is ever needed.
