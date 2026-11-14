# Crystal KnockOut: HTML5 prototype by RingTailApps

Pull the slingshot back, launch glow stones, and knock every silly crystal off its pedestal. Featuring Chance (aka Bubba) and Kevin.

## Run
    cd knock-over && python3 -m http.server 8080
    open http://localhost:8080

Everything is local and works offline: Matter.js 0.20 is in js/vendor and the Fredoka font is in fonts/. All art is drawn in code, and all audio is generated with WebAudio.

## Rename
Edit `KO.GAME_TITLE` in js/config.js. The logo, page title, and credits all update from it.

## Files
- js/config.js: title, world size, slingshot tuning, palette, combo words
- js/levels.js: 16 handcrafted levels (including tilting rocker podiums) built with tower/pyramid/wall helpers
- js/game.js: physics, slingshot, clearing rules, scoring, stars, bombs, moving platforms
- js/art.js: procedural sky, clouds, hills, podiums, slingshot, blocks and faces
- js/fx.js: particles, popups, screen shake
- js/audio.js: procedural SFX and the looping music track
- js/ui.js: menus, level map, modals, transitions, localStorage save
- js/dogs.js: Chance & Kevin mascots (idle, hop, droop, speech bubbles)
- assets/: downscaled mascot PNGs
- js/main.js: canvas/high-DPI sizing, game loop, input, title diorama
- tools/: Playwright playthrough test and level stability/solvability sim (needs the server running on :8080)

Debug hooks in the browser console: `KO.debug.start(i)`, `KO.debug.shoot(angleDeg, power0to1)`, `KO.debug.info()`.

## Treats & Feed Bubba
- Each level hides 1-3 bone treats. Fly a stone through one to collect it (+1 treat, saved; each treat counts once, so no farming). First 3-star clear of a level gives a +1 bonus treat.
- Treat total shows in the HUD and on the Crystal Trail map (per-level bones next to each level name).
- **Feed Bubba** (button under the slingshot, costs 3 treats): Chance eats and the next stone becomes a **Mega Stone**: bigger, heavier, golden aura, shockwave on first impact. It replaces your next normal stone.
- The slingshot sits on a raised rock ledge so flat shots clear the pedestal lips.
