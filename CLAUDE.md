# silly experiments

One repo, many independent experiments. Each top-level folder is one experiment.

- Keep experiments self-contained: own `package.json`/lockfile (or a single `index.html`), own README, no imports across folders. Copy code from a sibling instead of sharing it.
- New experiment: kebab-case folder at the top level, a `README.md` (what it is, how to run), a row in the root `README.md` table, and a card in the root `index.html`.
- GitHub Pages: `.github/workflows/pages.yml` publishes on push to `main`, each folder at `https://mengxuebi-mush.github.io/silly-experiments/<folder>/`. A folder with `package.json` must build to `dist/` via `npm run build`; otherwise its `index.html` is served as is. Keep every link and asset path relative (Vite: `base: './'`), since the site lives under a sub-path.
- Work inside the experiment's folder; it may have its own `CLAUDE.md` with project conventions.
- One root `.gitignore` covers every folder (`node_modules`, build output).
