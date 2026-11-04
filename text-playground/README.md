# Text playground

Text laid out as image: calligrammes and concrete poetry, using one poem for now, the Mouse's Tale from *Alice's Adventures in Wonderland* (1865, public domain). The shape comes first, and the words and the shape carry each other. Line breaking is done with [Pretext](https://github.com/chenglou/pretext).

| Page | What happens |
| --- | --- |
| `experiments/tale` | The poem as a stepped tail and as a spiral. Pinch either tail: the steps swing and straighten, and the spiral unrolls from either end or winds tighter. |
| `experiments/run` | The poem poured into a mouse; what doesn't fit becomes the tail. Grab the tail and the mouse runs. |
| `experiments/write` | Type, and your words fill the mouse and then grow its tail. |
| `experiments/cheese` | The poem starts in a cheese. The mouse eats it, and the word count stays the same on both sides. |
| `experiments/read` | The whole poem on the tail. Read along it; at "death." the tail snaps. |
| `experiments/fury` | Fury's lines make a dog that chases you, a mouse made of the mouse's lines. |

`archive/` holds the two original single-file explorations.

## Run

```bash
npm install
npm run dev
```

The gallery opens at `/`, and each experiment is at `/experiments/<name>/`.

To share one experiment as a single HTML file, run `EXP=<name> npm run share`. The file lands in `dist-share/<name>/`.
