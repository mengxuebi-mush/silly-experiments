// Set a string along a rope one character at a time, shrinking toward the tip.
import { fontOf } from './poem.js'

const cw10 = new Map()
export function clearCharWidths() { cw10.clear() }
export function charW(ctx, ch) {
  let v = cw10.get(ch)
  if (v === undefined) {
    const prev = ctx.font
    ctx.font = fontOf(10); v = ctx.measureText(ch).width / 10; cw10.set(ch, v)
    ctx.font = prev
  }
  return v
}

export const taper = (from = 13.5, to = 6) => frac => Math.max(to, from - (from - to) * frac)

// Total path length the string needs at a given taper (the taper depends on the length, so iterate).
const needCache = new Map()
export function lengthNeeded(ctx, str, sizeAt, guess = 400) {
  const hit = needCache.get(str)
  if (hit && hit.sizeAt === sizeAt) return hit.len
  const chars = Array.from(str)
  let len = guess
  for (let pass = 0; pass < 4; pass++) {
    let s = 0
    for (const ch of chars) s += charW(ctx, ch) * sizeAt(Math.min(1, s / len))
    len = s
  }
  if (needCache.size > 200) needCache.clear()
  needCache.set(str, { sizeAt, len })
  return len
}

// Returns the placed characters ({ i, ch, x, y, a, size }) for hit-testing and reading progress.
// The text reads away from the body; when flipped it starts at the tip so it still reads left to right.
export function drawOnRope(ctx, rope, str, { ink, flip = false, yb = 0, sizeAt = taper(), colorAt = null, skip = 0 }) {
  const placed = []
  if (!str) return placed
  const N = rope.n, X = rope.x, Y = rope.y, cum = [0]
  let total = 0
  for (let i = 1; i < N; i++) { total += Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]); cum.push(total) }
  if (!total) return placed
  // Characters are visited in path order, so the segment search only ever moves one way.
  let k = flip ? N - 1 : 1
  const at = s => {
    if (flip) { while (k > 1 && cum[k - 1] > s) k-- }
    else { while (k < N - 1 && cum[k] < s) k++ }
    const seg = cum[k] - cum[k - 1] || 1, u = (s - cum[k - 1]) / seg
    return { x: X[k - 1] + (X[k] - X[k - 1]) * u, y: Y[k - 1] + (Y[k] - Y[k - 1]) * u, a: Math.atan2(Y[k] - Y[k - 1], X[k] - X[k - 1]) }
  }
  const chars = Array.from(str), base = ctx.getTransform()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink
  let s = flip ? total : 0, font = '', fill = ink
  const dir = flip ? -1 : 1
  for (let i = 0; i < chars.length; i++) {
    const frac = Math.min(1, Math.max(0, s / total)), size = Math.round(sizeAt(frac) * 4) / 4, w = charW(ctx, chars[i]) * size
    const mid = s + dir * w / 2
    if (mid < 0 || mid > total) break
    const p = at(mid), a = flip ? p.a + Math.PI : p.a
    placed.push({ i: i + skip, ch: chars[i], x: p.x, y: p.y + yb, a, size, s: mid })
    if (chars[i] !== ' ') {
      ctx.setTransform(base); ctx.translate(p.x, p.y + yb); ctx.rotate(a)
      const f = fontOf(size)
      if (f !== font) { ctx.font = font = f }
      const c = (colorAt && colorAt(i + skip)) || ink
      if (c !== fill) { ctx.fillStyle = fill = c }
      ctx.fillText(chars[i], 0, 0)
    }
    s += dir * w
  }
  ctx.setTransform(base)
  ctx.fillStyle = ink
  return placed
}

export function nearestChar(placed, p, radius = 30) {
  let best = null, bd = radius
  for (const c of placed) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c } }
  return best
}
