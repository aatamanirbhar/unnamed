# Basement — Task Log

A running log of work on this game so future AI sessions can pick up mid-project without re-reading everything. Human or AI: **before starting a task, add a `STARTED` entry. When done, add a `FINISHED` entry directly below it.** Do not delete old entries.

## Project facts (read first)
- **Slug / folder:** `basement`
- **Genre:** first-person psychological horror, Fears-to-Fathom style
- **Length target:** 10–15 minutes, 3–4 scares
- **Platforms:** desktop + mobile touch
- **Perf target:** **30 fps on a 2 GB RAM Android phone** (hard requirement — if a change drops below this, revert)
- **Engine:** Three.js via CDN import map (matches the rest of Omenly — no bundler)
- **Assets:** low-poly GLB from Meshy AI, decimated before shipping
- **Story:** parent asks player to fetch the toolbox from the basement. Descent, four escalating beats, figure at top of stairs on the way back, hard cut.
- **Hard budgets (do not exceed):**
  - Total scene: ≤ 15,000 triangles
  - Draw calls: ≤ 15 (merge static geometry)
  - Textures: 512 px max, atlas where possible, baked AO/shadows in the texture
  - No realtime shadows, no PBR, no post-processing on mobile
  - Fog cutoff at ~6 m; only render what's within it
  - Render scale 0.75× on low-end devices
- **Integration contract (Omenly):** before `<script src="/omenly.js">`, set `window.OMENLY_CONFIG` with `game: 'basement'`, `gameTitle: 'Basement'`, `price: 3`, `donateUrl: 'https://www.paypal.me/vikas117/3'`, `allAccessDonateUrl: 'https://www.paypal.me/vikas117/10'`, `isHub: false`. Include at least one `<button data-omenly-cta>` and one `<div data-omenly-ad>`. Add entry to `/games.json` and `/sitemap.xml` when playable.

## AI: how to test (do this proactively — user shouldn't have to ask)

Every AI session, **as soon as you've made any code change to `basement/index.html`, spin up a Cloudflare quick tunnel and give the user the URL**. Don't wait to be asked. The user tests on a real phone every task — that's the perf gate. Getting the URL is your job, not theirs.

Run these two commands (both in background) from **the itch/ root**, not from `basement/`, so the URL is `<tunnel>/basement/` and not `<tunnel>/`:

```bash
# 1. Local static server (only if not already running on 8000)
cd "C:\Users\Sanjesh Dubey\Desktop\itch" && python -m http.server 8000

# 2. Quick tunnel to that server (cloudflared is at "C:\Program Files (x86)\cloudflared\cloudflared.exe")
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8000
```

Poll the tunnel's output file for `https://<name>.trycloudflare.com`, then hand the user `<url>/basement/`.

If the port-8000 server is already running from an earlier turn (`Address already in use`), don't restart it — just start the tunnel. If the tunnel is already running from an earlier turn, don't restart it — grep the previous background task's output file for the existing URL and reuse it. A tunnel that's already alive is what the user's phone is bookmarked to.

## How to write an entry
```
### YYYY-MM-DD — <short task name>
STARTED — <what you're about to do, in one or two sentences>
FINISHED — <what actually shipped, files touched, any perf numbers, any gotchas discovered>
```

If a task is abandoned, write `ABANDONED — <reason>` instead of FINISHED.

---

## Log

<!-- Add new entries below this line, newest at the bottom. -->

### 2026-07-08 — perf harness
STARTED — Build an empty Three.js scene at `basement/index.html` with an FPS overlay, mobile viewport, resolution scaling, and a spinning cube so we can confirm we're running. Purpose: verify the target device (2 GB RAM Android) can hold 30 fps in an empty scene before we invest in Meshy assets. No game logic yet, no Omenly integration yet.
FINISHED — Shipped `basement/index.html` (single file, ~180 lines). Three.js 0.160.0 via CDN import map (no bundler, matches Omenly convention). Device tier detection reads `navigator.deviceMemory` + `hardwareConcurrency`; low-end path caps DPR at 1 and renders at 0.6× scale, mobile at 0.8×, desktop at 1.0×. HUD shows FPS, worst-frame ms (catches stutter that average-FPS hides), device tier, render resolution, draw calls, tri count, sample seconds. Scene: 1 spinning cube + floor + hemisphere + directional light, fog 3-8 m. No shadow maps, no post, no PBR — matches the perf budget.
GATE RESULT (2026-07-08, phone on mobile data via Cloudflare tunnel): **60 fps, 20 ms worst frame.** 2× the 30 fps target with headroom for content. Three.js at this scale is the right choice for the target device. Cleared to bring in Meshy assets.

### 2026-07-08 — grey-box level + first-person controls
STARTED — Replace the perf-harness cube with the actual level geometry as untextured boxes: kitchen (starting room with a "note on the counter"), stairs down, basement room with four landmark zones (fuse box, shelves, boiler nook, back corner) and a toolbox pickup marker. Add first-person controls: WASD + mouse look on desktop (pointer lock), virtual joystick + swipe-look on mobile. Axis-aligned wall collision so you can't clip through geometry. Keep FPS HUD visible. No scares, no assets, no story yet — this is the last perf checkpoint before spending Meshy generations.
FINISHED (boiler wiring) — GLTFLoader loaded via addons import map. Boiler.glb placed in SW nook (x=-3.5, z=7.2). `wall()` helper gained an `invisible` flag; the boiler wall entry is now invisible-collision-only so the GLB provides the visuals. Model is auto-scaled to fit 1.0 × 2.2 × 1.2 m via bounding-box math (Meshy models come at arbitrary scales, so this is safer than a hardcoded scalar). Temporary bright hemi + directional + point light in the nook so we can actually see the asset while iterating; will be dimmed later for the horror mood.
GATE RESULT (2026-07-08, boiler on phone): FPS held (no drop). Model appeared after a load delay (~14 MB texture over mobile data). Load latency is a UX issue, not a runtime perf issue.
GATE RESULT (2026-07-08, boiler on desktop): FPS dropped. Root cause: Meshy exports MeshStandardMaterial (PBR) which is expensive at 1.0× render scale + antialiasing. Fix: added `cheapifyMaterials()` — walks the loaded model tree and swaps every MeshStandardMaterial for MeshLambertMaterial, preserving the diffuse texture but dropping the metalness/roughness shader work; also downgrades texture filtering to linear/no-aniso since we're always at fog distance. Any future GLB load MUST go through cheapifyMaterials — this is now the standard pattern for all Meshy props in this game.
GATE RESULT (2026-07-08, cheapifyMaterials): Firefox desktop + Chrome mobile + Firefox mobile all hold FPS. Chrome desktop still drops. User decision: ship with a "not recommended on desktop Chrome" notice rather than chase the Chrome-specific issue. Verdict logged, next steps continue.

### 2026-07-08 — preload screen + desktop-Chrome warning
STARTED — Build a proper start-screen that (1) preloads every GLB in `basement/assets/` behind a progress bar so nothing ever pops in mid-game, (2) shows a "not recommended on desktop Chrome" notice when the browser is desktop Chrome, (3) only reveals a PLAY button once all assets are parsed and materials are cheapified. This becomes the standard entry point — every future asset dropped into `assets/` is automatically preloaded, no per-asset code needed.
FINISHED — New start screen with title "Basement", progress bar (real bytes-loaded, not just count-based), a PLAY button that only appears once assets are parsed + cheapified, controls hint tailored to desktop/mobile, and a desktop-Chrome-only warning strip. Loader chain: `ASSET_MANIFEST` list → `preloadAll()` → each GLB gets `cheapifyMaterials` applied → cached in `assets[]`. On PLAY, `PLACEMENTS` list is walked and each asset dropped into the scene via `placeAsset()` (auto-fits target volume). To add a new prop: (1) drop the GLB into `basement/assets/`, (2) add one line to `ASSET_MANIFEST`, (3) add one line to `PLACEMENTS`. Nothing else. Old #hint element gone; pointer lock now happens on PLAY click (not first canvas click) which is a better UX moment. Chrome detection excludes Edge/Opera/Samsung Browser so only real Chrome trips the warning.

### 2026-07-08 — shrink boiler texture 14MB -> 500KB
STARTED — Meshy shipped the boiler with a 4K JPEG texture (13.3 MB of the 14 MB file). Load time on mobile data was noticeable. Write an in-place GLB texture shrinker.
FINISHED — Python + Pillow script parses the GLB container, decodes each image bufferView, resizes to 512 px max at JPEG q78, rewrites bufferViews with correct offsets (with 4-byte alignment) and lengths, updates buffer[0].byteLength. Result: **boiler.glb 13,743,656 → 500,604 bytes (96.4% smaller)**. Original preserved as `boiler.glb.bak` in `assets/`. Script logic is generic — reuse on every Meshy asset moving forward. Ideally we bake this into a one-liner shell command per new asset.
GATE RESULT (2026-07-08, shrunk boiler + preload screen): user reports "fucking fast we are good". Load time collapsed from ~30s to instant on mobile data. Loading screen + progress bar shipping. Standing pattern confirmed: every new Meshy GLB → drop into `assets/` → run texture-shrinker → add to `ASSET_MANIFEST` + `PLACEMENTS`.

### 2026-07-08 — extract shrinker to reusable script
STARTED — The GLB texture shrinker had only lived as an inline heredoc. Extract it to a proper CLI at `scripts/shrink-glb.py` at the repo root (usable across every Omenly game, not just this one). Accept files or directories, keep .bak alongside each file, skip files whose .bak already exists so it's idempotent.
FINISHED — Shipped `scripts/shrink-glb.py`. Args: files or directories (auto-globs `*.glb`), `--max-dim` (default 512), `--quality` (default 78), `--force` to re-shrink files that already have a .bak. Standard workflow for every new Meshy GLB: `python scripts/shrink-glb.py basement/assets/<file>.glb`. Idempotent verified against boiler.glb — it correctly skipped because the .bak was there. If a file fails mid-shrink the .bak is restored automatically.

### 2026-07-08 — wire 8 Meshy assets into the scene
STARTED — User dropped 7 new GLBs into `basement/assets/`: bulb, counter, door, figure, fridge, fusebox, shelves. Shrink them all through the new script, then add each to `ASSET_MANIFEST` + `PLACEMENTS`. Convert corresponding grey-box walls (fridge/counter/fuse/shelf) to invisible so the models replace the visuals but collision still works. Add door at stairwell opening, hang bulb over basement center with a point light attached, place figure visible for now so user can approve the art.
FINISHED — Shrinker cut all 7 files from 61.8 MB total down to 2.4 MB (95.8% smaller — Meshy shipped every one with a 4K or 2K texture). Grey-box walls for counter/fridge/fuse/shelf marked `invisible=true`. Manifest + placements updated. `placeAsset()` now centers the model horizontally inside its target volume (was previously anchored to min-corner + manual offset, which only worked because the boiler placement had `+0.5` hardcoded). Added `placed[]` registry so we can grab holders later for scare logic. Bulb placement steals the existing nook point light and reparents it under the bulb holder — light now visually emits from the visible bulb, and any future bulb sway animation will move the light too. Figure starts visible in the SE corner so we can eyeball the art; will be gated behind scare triggers later. Door has no collision entry, so player walks through it visually (intentional for now — will get an open/close animation in the scare pass).
IMPROVED — placeAsset() gained `stretch` (non-uniform scale to fill target volume — needed for the door, which was shrinking to preserve aspect and leaving gaps) and `yaw` (radians around Y — needed because Meshy models come at arbitrary default orientations). Door now stretches to fill the full 1.2m × 2.6m doorway. Fusebox got yaw=π/2 to face east into the basement. Figure got yaw=π so it faces the doorway (confirmed by user: "it facing me"). Placement pattern for future assets: try uniform-fit first, add `yaw` in 90° increments if it faces the wrong way, add `stretch: true` only for architectural fills that must span an exact opening.

FINISHED (grey-box; recap) — Rewrote `basement/index.html`. Level geometry: kitchen 6×5 at y=0 with counter/fridge/doorway, 6-step staircase descending to y=-3, basement 8×7 with fuse box (west wall), shelves (NE), boiler (SW nook), scattered boxes, and toolbox pickup (SE corner). All walls stored in a single `walls[]` array used for BOTH rendering (grouped by material colour → merged into one BufferGeometry per group with an inline mergeBufferGeometries — keeps draw calls in single digits) AND collision (AABB vs circle, radius 0.28). Y-position snaps to the ground under the player, walking upstairs "just works" because each step is a walkable platform. Controls: desktop pointer-lock + WASD + E-to-interact; mobile virtual joystick (bottom-left), swipe-look (right half of screen), USE button (bottom-right). Toolbox interact prompt shows within 1.2 m; picking up removes the mesh and flashes "TOOLBOX COLLECTED". No scares wired yet — that's the next task. **Test URL (fresh tunnel):** https://elliott-astrology-nested-tattoo.trycloudflare.com/basement/ — walk around, try walls, climb the stairs, pick up the toolbox, watch the HUD numbers.
GATE RESULT (2026-07-08): user reports "we are good to go" on phone. Controls + collision + stair climb + interact all working, perf held. Cleared to bring in Meshy assets. Lighting deferred to the asset pass on purpose — mood tuning against grey boxes is throwaway work.

### 2026-07-08 — wire boiler.glb into the scene (first Meshy asset)
STARTED — Load `basement/assets/boiler.glb` via GLTFLoader (dynamic import from three.js addons), place it in the SW boiler-nook (x=-3.5, z=7.2), remove the grey-box wall entry with mat='boiler'. Keep AABB collision by leaving a wall entry with mat='boiler' but hidden — the invisible box handles collision, the GLB provides visuals. Measure tri delta and FPS on phone. Meshy delivered 9,290 tris and one JPEG texture, total 14 MB (over the 2 k tri target and the texture is likely 4 K). User chose to try it as-is first before shrinking.

### 2026-07-09 — STORY PIVOT: bakery prologue + scripted scares (T1: scene groups + monologue)
STARTED — Big rewrite. User wants F2F-style narrative: opening monologue → bakery shift (with coworkers Marcus/Danielle, customers, and a quarrel with a grumpy customer as red herring) → bike home (text-only transition) → home basement with 6 scripted scares → abrupt hard cut → title card revealing "Marcus started at the bakery three weeks before that night." Design intent: Marcus is the killer but seems harmless; grumpy customer is loud misdirection; player never guesses. No rigged animations (perf + F2F never shows the ride/mopping either — text transitions instead). Plan file: `C:\Users\Sanjesh Dubey\.claude\plans\magical-sniffing-puddle.md`. This entry covers T1 of 7: refactor walls[]/placed[] to be scene-tagged, add scenes.bakery/home groups + activateScene(), story state machine (currentAct + advanceAct + dispatch table), #monologue overlay with click-to-advance, wire opening monologue text. Player still spawns in home; monologue → HOME_NOTE stub. Bakery empty for now (T3 fills it).
FINISHED (T1 code) — Shipped in `basement/index.html`:
- **Scene groups.** Added `scenes.bakery`/`scenes.home` `THREE.Group()`s parented under the root scene. `activateScene(name)` toggles their `.visible`. `activeScene` global drives collision + ground-height filtering. `teleportPlayer(x, y, z, yaw)` helper.
- **walls[] refactor.** Every entry gained a `scene` field (defaults to 'home' via `_curScene` + `wallScene()`). Merge-by-material loop now groups by scene *first*, produces one merged mesh per (scene, mat) pair, parents under that scene's group. Collision loop + `groundHeightAt()` skip walls whose scene ≠ active. Same for stair-step Y snapping.
- **PLACEMENTS refactor.** Each entry gained `scene`. `placeAsset()` accepts `opts.scene` and parents into `scenes[opts.scene]`. All 8 existing GLBs tagged 'home'. Toolbox mesh + kitchen/basement floors parented to `scenes.home`.
- **Story state machine.** `ACTS = [MONOLOGUE_OPEN, BAKERY_SHIFT, BIKE_HOME, HOME_NOTE, BASEMENT_DESCENT, ENDING]`, `currentAct`, `actHooks{...}`, `advanceAct(name)`. Each hook sets objective, activates scene, teleports player. BAKERY_SHIFT is a stub for T3 that advances straight to BIKE_HOME so the flow is testable end-to-end today.
- **Monologue overlay.** New `#monologue` full-screen serif-italic overlay with fade-in per line, click/tap/keydown to advance, `Monologue.show(lines, onDone)`. Opening monologue reuses user's exact intent ("spring of 2012 / bakery before school / saving for GTA V / didn't know what was about to happen / struggled with nights after"). Bike-home transition monologue also wired ("locked up after eleven / streetlights out / mom left a note").
- **Objective banner.** `#objective` top-center chip, `setObjective(text)`. Empty text hides it.
- **Input lock.** `inputLocked` global. Monologue toggles it. Movement (WASD, keys, mouse-look, touch joystick + swipe-look) all short-circuit when locked. Interact E-key gated too.
- **startGame** now hides both scenes and calls `advanceAct('MONOLOGUE_OPEN')` instead of dropping the player straight in. Pointer lock deferred to first canvas click (already handled) so it doesn't eat monologue clicks.
GATE (T1 pending phone test): tunnel URL from user's active session. Watch for: opening monologue displays with 4-5 lines cleanly, click/tap advances, ends → bakery-stub → bike-home monologue → lands in kitchen, WASD works, can walk into basement, toolbox interact still works. FPS/tri/calls should be within margin of the pre-refactor baseline since the scene tree gained 2 groups + a few visibility toggles — no new geometry.

### 2026-07-09 — T2: dialogue box + interact refactor
STARTED — Add a bottom-of-screen dialogue box (`#dialogue`) with speaker name header, body text, click-to-advance indicator. `Dialogue.play(lines, onDone)` where each line is `{who: 'MARCUS'|'CUSTOMER'|'YOU', text: '...', color?: '#hex'}`. Locks input while active (reuses `inputLocked` from T1). Refactor `tryInteract()` from a hardcoded toolbox-distance check into a generalised `interactables[]` registry: each entry has `{scene, x, z, r, label, onUse, cond?}` and the loop finds the closest in-range for the active scene and shows the appropriate prompt. Wire a test dialogue on the existing toolbox ("The flashlight. Cold. Heavier than it looks.") to prove the flow before T3 uses it for real. No new geometry, no perf change expected.
FINISHED (T2 code) — Shipped in `basement/index.html`:
- **#dialogue overlay** — serif body, monospace speaker header in warm amber. Fixed at bottom-center, `min(640px, 92vw)` wide, respects `safe-area-inset-bottom`. Speaker colour is per-line (`color?` field) so the grumpy customer's name can render in angry-red in T4.
- **Dialogue module** — `Dialogue.play(lines, onDone)`. Click/tap/any-key advance. 600ms delay before the "▸ tap to continue" hint appears so people don't skip past unread text. 250ms guard against double-advance from a single touch.
- **interactables[] registry** — `{scene, x, z, r=1.2, label, onUse, cond?}`. `nearestInteractable()` finds the closest in-range entry for the active scene. Replaces the hardcoded `distToToolbox()` check.
- **tryInteract() refactor** — now walks the registry instead of checking one hardcoded object. Toolbox is registered as `{scene:'home', label:'FLASHLIGHT', cond: !collected, onUse: {...pickup + Dialogue.play(["Cold. Heavier than I remember."])}}`. Reframed "TOOLBOX" as "FLASHLIGHT" per T5 plan.
- **Frame-loop prompt** — pulls label from the nearest interactable and prefixes with `E — ` or `TAP USE — `. Hidden while inputLocked.
- **inputLocked coverage** — movement math now also zeros `mx/mz` when locked so held keys don't leak movement into a dialogue beat.
GATE (T2 pending phone test): monologue → bike-home monologue → land in kitchen → walk to basement → E on the (renamed) FLASHLIGHT → prompt hides, "FLASHLIGHT COLLECTED" flashes, then dialogue box appears at the bottom with "YOU — Cold. Heavier than I remember." → tap to dismiss. FPS unchanged. Toolbox mesh is removed from `scenes.home` (was previously removed from `scene`) — verify no orphan lingers.
