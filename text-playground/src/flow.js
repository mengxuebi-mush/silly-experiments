// Pour a prepared text into a mask, one line per run, with Pretext's layoutNextLine.
import { layoutNextLine, prepareWithSegments } from '@chenglou/pretext'
import { fontOf } from './poem.js'

export const START = { segmentIndex: 0, graphemeIndex: 0 }

// wholeWords: a run too narrow for the next word is skipped instead of breaking the word across runs.
// minRun: runs narrower than this many ems are left empty.
export function layoutBody(mask, data, prep, { size, lh = size * 1.3, top, bottom, pad = 3, start = START, wholeWords = false, minRun = 2.4 }) {
  let cur = start, done = false, count = 0
  const lines = []
  for (let y = top; y + lh <= bottom && !done; y += lh) {
    for (const [x0, x1] of mask.runsFor(data, y, lh)) {
      const avail = x1 - x0 - pad * 2
      if (avail < size * minRun) continue
      const ln = layoutNextLine(prep, avail, cur); count++
      if (!ln) { done = true; break }
      if (wholeWords && ln.end.graphemeIndex > 0) continue
      lines.push({ text: ln.text.trimEnd(), w: ln.width, x: x0 + pad, avail, y: y + lh * .5, start: cur, end: ln.end })
      cur = ln.end
    }
  }
  return { lines, cur, done, count, fits: done || remainder(prep, cur) === '' }
}

// The text a layout didn't get to: it becomes the tail.
export function remainder(prep, cur) {
  const segs = prep.segments
  let out = ''
  for (let i = cur.segmentIndex; i < segs.length; i++) {
    let t = segs[i]
    if (i === cur.segmentIndex && cur.graphemeIndex) t = Array.from(t).slice(cur.graphemeIndex).join('')
    out += t
  }
  return out.replace(/^\s+/, '')
}

// Largest type size that leaves at most `tailChars` characters unplaced.
export function fitSize(mask, data, text, { lo = 6.5, hi = 24, iters = 13, tailChars = 0, top, bottom, lhRatio = 1.3, wholeWords = false, minRun, weight = 400 }) {
  let best = null
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2, prep = prepareWithSegments(text, fontOf(mid, weight))
    const res = layoutBody(mask, data, prep, { size: mid, lh: mid * lhRatio, top, bottom, wholeWords, minRun })
    const rem = res.done ? 0 : remainder(prep, res.cur).length
    if (rem <= tailChars) { lo = mid; best = prep } else hi = mid
  }
  return { size: lo, prep: best || prepareWithSegments(text, fontOf(lo, weight)) }
}

const widths = new Map()
export function clearWidths() { widths.clear() }
export function wordWidth(ctx, w) {
  const key = ctx.font + '|' + w
  let v = widths.get(key)
  if (v === undefined) { v = ctx.measureText(w).width; widths.set(key, v) }
  return v
}

// Paint laid-out lines, justified when the slack is small. wordColor(globalWordIndex) colors single words.
export function drawLines(ctx, lines, { size, ink, doneAll = false, yb = 0, wordColor = null, wordBase = 0, weight = 400 }) {
  ctx.font = fontOf(size, weight); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = ink
  const spaceW = wordWidth(ctx, ' ')
  let wi = wordBase
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i], words = ln.text.split(' '), n = words.length - 1, extra = ln.avail - ln.w, y = ln.y + yb
    const justify = n >= 1 && extra / n <= size * .9 && !(doneAll && i === lines.length - 1)
    if (!justify && !wordColor) { ctx.fillText(ln.text, ln.x, y); wi += words.length; continue }
    const gap = justify ? extra / n : 0
    let x = ln.x
    for (const w of words) {
      if (wordColor) ctx.fillStyle = wordColor(wi) || ink
      ctx.fillText(w, x, y)
      x += wordWidth(ctx, w) + spaceW + gap
      wi++
    }
  }
  ctx.fillStyle = ink
  return wi
}
