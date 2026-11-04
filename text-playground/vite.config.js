import { defineConfig } from 'vite'
import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { viteSingleFile } from 'vite-plugin-singlefile'

const root = import.meta.dirname
const experiments = readdirSync(resolve(root, 'experiments'), { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(resolve(root, 'experiments', d.name, 'index.html')))
  .map(d => d.name)

// EXP=run npm run share  →  dist-share/run/…/index.html, one self-contained file
const share = process.env.EXP

export default defineConfig(share
  ? {
      plugins: [viteSingleFile()],
      build: {
        outDir: `dist-share/${share}`,
        rolldownOptions: { input: resolve(root, 'experiments', share, 'index.html') },
      },
    }
  : {
      build: {
        rolldownOptions: {
          input: {
            main: resolve(root, 'index.html'),
            ...Object.fromEntries(experiments.map(n => [n, resolve(root, 'experiments', n, 'index.html')])),
          },
        },
      },
    })
