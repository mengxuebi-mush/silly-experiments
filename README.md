# silly experiments

A collection of silly interactive experiments. Each top-level folder is one experiment and stands on its own: its own dependencies, its own dev server, nothing shared between folders.

| Experiment | What it is |
| --- | --- |
| [text-playground](text-playground/) | Lewis Carroll's "Mouse's Tale" (1865) laid out as an image, then played with: a mouse whose tail is the overflow, a dog made of Fury's lines, a tail you read, a spiral you can unroll. Built on [Pretext](https://github.com/chenglou/pretext). |

## Running one

```bash
cd text-playground
npm install
npm run dev
```

Each experiment's own README says what it needs.

## Adding one

1. Make a new kebab-case folder at the top level.
2. Keep everything it needs inside it: `package.json` and lockfile if it has dependencies, or just an `index.html` if it doesn't.
3. Give it a `README.md`: one paragraph on what it is, then how to run it.
4. Add a row to the table above.
