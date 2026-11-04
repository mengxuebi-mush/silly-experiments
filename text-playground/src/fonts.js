import { clearCache } from '@chenglou/pretext'
import { clearWidths } from './flow.js'
import { clearCharWidths } from './path-text.js'

// Start once the serif is in (or after 2.5s). If it lands later, drop every cached measurement and refit.
export function bootAfterFonts(start, refit) {
  let started = false, loaded = false
  const go = () => { if (!started) { started = true; start() } }
  Promise.race([
    document.fonts.load('400 20px "Libre Caslon Text"').then(() => { loaded = true }),
    new Promise(r => setTimeout(r, 2500)),
  ]).then(go, go)
  document.fonts?.ready.then(() => {
    if (started && !loaded) { loaded = true; clearCache(); clearWidths(); clearCharWidths(); refit?.() }
  })
}
