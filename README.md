# Knock Over (working title): HTML5 prototype by RingTailApps

Pull the slingshot back, launch gumballs, and knock every candy block off its podium.

## Run
    cd knock-over && python3 -m http.server 8080
    open http://localhost:8080

Everything is local and works offline: Matter.js 0.20 is in js/vendor and the Fredoka font is in fonts/. All art is drawn in code, and all audio is generated with WebAudio.

## Rename
Edit `KO.GAME_TITLE` in js/config.js. The logo, page title, and credits all update from it.

## Files
- js/config.js: title, world size, slingshot tuning, palette, combo words
- js/levels.js: 13 handcrafted levels built with tower/pyramid/wall helpers
- js/game.js: physics, slingshot, clearing rules, scoring, stars, bombs, moving platforms
- js/art.js: procedural sky, clouds, hills, podiums, slingshot, blocks and faces
- js/fx.js: particles, popups, screen shake
- js/audio.js: procedural SFX and the looping music track
- js/ui.js: menus, level map, modals, transitions, localStorage save
- js/main.js: canvas/high-DPI sizing, game loop, input, title diorama
- tools/: Playwright playthrough test and level stability/solvability sim (needs the server running on :8080)

Debug hooks in the browser console: `KO.debug.start(i)`, `KO.debug.shoot(angleDeg, power0to1)`, `KO.debug.info()`.
