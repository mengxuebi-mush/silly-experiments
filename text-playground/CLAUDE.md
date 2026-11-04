# Text playground

Text laid out as image (calligrammes, concrete poetry), using one poem for now: Carroll's "Mouse's Tale". Image first; words and shape should carry each other, not just texture.

- `npm run dev` → gallery at `/`, each experiment at `/experiments/<name>/`.
- New experiment: make `experiments/<name>/index.html` + `main.js` (copy the closest one), add a card in root `index.html`. Vite picks up the folder automatically.
- Share one experiment as a single HTML file: `EXP=<name> npm run share` → `dist-share/<name>/…/index.html`.
- `archive/` holds the two original single-file explorations; don't edit them.

## Engine (src/)
- Pretext 1.0: `layoutNextLine(prepared, maxWidth, cursor)` — width before cursor.
- `mask.js` paints a body into an offscreen alpha mask (holes, cursor circles, other bodies cut out); `runsFor` gives the inside spans for one line box. `flow.js` fills those spans with `layoutNextLine`; `remainder()` is what didn't fit (the tail).
- Bodies are `{ shape, x, y, flip, k }`; shapes in `shapes.js` face left.
- `rope.js` verlet tail, `path-text.js` sets text along it, `trail.js` serpentine rest poses for long tails.
- `wholeWords: true` on layout skips runs too narrow for the next word instead of splitting it. Mouse Run leaves it off to match the original.

## Testing
The browser pane often runs as a background page, so requestAnimationFrame doesn't fire. In dev, `window.__tick(n)` steps the current experiment n frames at 1/60 s; drive it with synthetic PointerEvents on `#stage`.
