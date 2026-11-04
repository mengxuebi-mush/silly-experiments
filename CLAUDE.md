# silly experiments

One repo, many independent experiments. Each top-level folder is one experiment.

- Keep experiments self-contained: own `package.json`/lockfile (or a single `index.html`), own README, no imports across folders. Copy code from a sibling instead of sharing it.
- New experiment: kebab-case folder at the top level, a `README.md` (what it is, how to run), and a row in the root `README.md` table.
- Work inside the experiment's folder; it may have its own `CLAUDE.md` with project conventions.
- One root `.gitignore` covers every folder (`node_modules`, build output).
