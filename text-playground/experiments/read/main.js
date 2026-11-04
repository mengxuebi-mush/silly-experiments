import { FLOW, LINES, LINE_STARTS, fontOf } from '../../src/poem.js'
import { MOUSE } from '../../src/shapes.js'
import { createStage, createPointer, reduceMotion as reduce } from '../../src/stage.js'
import { createMask } from '../../src/mask.js'
import { anchorOf, strokeBody } from '../../src/body.js'
import { layoutBody, fitSize, drawLines } from '../../src/flow.js'
import { createRope } from '../../src/rope.js'
import { drawOnRope, lengthNeeded, nearestChar, taper } from '../../src/path-text.js'
import { serpentine } from '../../src/trail.js'
import { bootAfterFonts } from '../../src/fonts.js'

const $ = s => document.querySelector(s)
const W = 780, H = 560, L = 8, TITLE = 'A Mouse’s Tale', LOOKAHEAD = 30, FALLEN_SIZE = 18

const stage = createStage($('#stage'), W, H), ctx = stage.ctx
const ptr = createPointer(stage)
const mask = createMask(W, H)
const B = { shape: MOUSE, x: 24, y: 20, k: .62, flip: false }
const box = { top: B.y, bottom: B.y + MOUSE.bh * B.k + 3, wholeWords: true }
const anchor = anchorOf(B)
const trail = serpentine({
  ax: anchor.x, ay: anchor.y, right: W - 36, left: 36, rowGap: 54, bottom: H - 120,
  narrow: 46, gapShrink: .9, firstGap: box.bottom + 34 - anchor.y,
})
const CHARS = Array.from(FLOW), TOTAL = CHARS.length, BREAK_AT = LINE_STARTS[LINES.length - 1]
const rope = createRope(2, L)

const S = { sizeAt: taper(), progress: 0, broken: false, bodyCache: new Map(), placed: [], bits: [], heap: null, edge: false }

// The taper's starting size is chosen so the whole poem exactly fills the serpentine.
function fitTaper() {
  let lo = 8, hi = 26
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    if (lengthNeeded(ctx, FLOW, taper(mid, 6.5), trail.length) <= trail.length * .985) lo = mid; else hi = mid
  }
  S.sizeAt = taper(lo, 6.5)
}

function bodyFor(text) {
  let hit = S.bodyCache.get(text)
  if (!hit) {
    hit = fitSize(mask, mask.paint(B), text, { lo: 8, hi: 64, iters: 12, ...box })
    S.bodyCache.set(text, hit)
  }
  return hit
}

function restRope() {
  rope.resize(Math.ceil(lengthNeeded(ctx, FLOW, S.sizeAt, trail.length) / L) + 2)
  for (let i = 0; i < rope.n; i++) { const [x, y] = trail.at(i * L); rope.x[i] = rope.px[i] = x; rope.y[i] = rope.py[i] = y }
}

function reset() {
  S.progress = 0; S.broken = false; S.bits = []; S.heap = new Float32Array(Math.ceil(W / 4))
  S.bodyCache.clear(); fitTaper(); restRope()
}

const currentLine = () => {
  let k = 0
  while (k + 1 < LINES.length && LINE_STARTS[k + 1] < S.progress) k++
  return k
}

// The last word is read: the tail snaps where the sentence begins and that line falls.
function snap() {
  S.broken = true
  const at = S.placed.find(c => c.i === BREAK_AT)
  for (const c of S.placed) {
    if (c.i < BREAK_AT || c.ch === ' ') continue
    S.bits.push({ ch: c.ch, x: c.x, y: c.y, a: c.a, size: c.size, vx: (Math.random() - .5) * 360, vy: -60 - Math.random() * 200, va: (Math.random() - .5) * 8, rest: false })
  }
  if (at) rope.resize(Math.floor(at.s / L) + 1)
}

function updateBits(dt) {
  const floor = H - 10
  for (const b of S.bits) {
    if (b.rest) continue
    b.vy += 1400 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt
    b.size += (FALLEN_SIZE - b.size) * Math.min(1, dt * 3)  // they were tail-tip tiny; let them land readable
    if (b.x < 6 || b.x > W - 6) { b.vx *= -.5; b.x = Math.max(6, Math.min(W - 6, b.x)) }
    const col = Math.max(0, Math.min(S.heap.length - 1, Math.round(b.x / 4))), top = floor - S.heap[col] - b.size * .35
    if (b.y >= top) {
      b.y = top
      if (Math.abs(b.vy) > 160) { b.vy *= -.3; b.vx *= .6; b.va *= .5 }
      else {
        b.rest = true; b.a = Math.round(b.a / Math.PI) * Math.PI
        const span = Math.max(1, Math.round(b.size * .3 / 4))
        for (let c = col - span; c <= col + span; c++) if (c >= 0 && c < S.heap.length) S.heap[c] += b.size * .55 / (1 + Math.abs(c - col))
      }
    }
  }
}

function frame(dt, now) {
  stage.begin(now)
  const th = stage.theme, t = now / 1000
  ptr.smooth()
  rope.update(dt, t, {
    ax: anchor.x, ay: anchor.y, dir: 1, gravity: .02,
    target: i => {
      const [x, y] = trail.at(i * L)
      return [x, y + (reduce ? 0 : Math.sin(i * .21 - t * 1.6) * 3 * Math.min(1, i / 40))]
    },
    stiff: () => .06,
  })
  ptr.decay()

  // Mouth: the line being read, as large as the body allows.
  const text = S.progress === 0 ? TITLE : LINES[currentLine()]
  const body = bodyFor(text)
  const res = layoutBody(mask, mask.paint(B), body.prep, { size: body.size, ...box })
  if (S.edge) { strokeBody(ctx, B, { color: th.guide }); rope.stroke(ctx, th.guide) }
  drawLines(ctx, res.lines, { size: body.size, ink: S.progress === 0 ? th.ink : th.accent, doneAll: true })

  const str = S.broken ? CHARS.slice(0, BREAK_AT).join('') : FLOW
  S.placed = drawOnRope(ctx, rope, str, { ink: th.ink, sizeAt: S.sizeAt, colorAt: i => i < S.progress ? th.accent : null })

  // Read on: the pointer has to land a little past what's already read.
  if (!S.broken && ptr.on) {
    const c = nearestChar(S.placed, ptr, 22)
    if (c && c.i >= S.progress && c.i <= S.progress + LOOKAHEAD) S.progress = c.i + 1
    if (S.progress >= TOTAL - 1) snap()
  }
  const next = !S.broken && S.placed.find(c => c.i === S.progress)
  if (next) {
    ctx.beginPath(); ctx.arc(next.x, next.y + next.size * .75, reduce ? 2 : 2 + Math.sin(t * 6) * .6, 0, 6.2832)
    ctx.fillStyle = th.accent; ctx.fill()
  }

  if (S.bits.length) {
    updateBits(dt)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = th.accent
    const base = ctx.getTransform()
    for (const b of S.bits) {
      ctx.setTransform(base); ctx.translate(b.x, b.y); ctx.rotate(b.a)
      ctx.font = fontOf(b.size)
      ctx.fillText(b.ch, 0, 0)
    }
    ctx.setTransform(base)
  }

  $('#r-line').textContent = S.broken ? '尾巴断了 · 点一下画布重来' : S.progress === 0 ? '从尾巴根部开始读' : `第 ${currentLine() + 1} / ${LINES.length} 行`
  $('#r-chars').textContent = `${S.progress} / ${TOTAL} 字符 · rope ${rope.n} 节`
}

stage.canvas.addEventListener('pointerdown', () => { if (S.broken) reset() })
$('#reset').addEventListener('click', reset)
$('#edge').addEventListener('change', e => { S.edge = e.target.checked })

bootAfterFonts(() => { reset(); stage.loop(frame) }, reset)
