import { FLOW } from '../../src/poem.js'
import { MOUSE, CHEESE } from '../../src/shapes.js'
import { createStage, createPointer, reduceMotion as reduce } from '../../src/stage.js'
import { createMask } from '../../src/mask.js'
import { anchorOf, strokeBody } from '../../src/body.js'
import { layoutBody, remainder, fitSize, drawLines } from '../../src/flow.js'
import { createRope } from '../../src/rope.js'
import { drawOnRope } from '../../src/path-text.js'
import { bootAfterFonts } from '../../src/fonts.js'

const $ = s => document.querySelector(s)
const W = 780, H = 500

const SHAPES = {
  mouse: {
    ...MOUSE, tailChars: 42,
    hint: '把鼠标晃过尾巴，它会跟着摆。用手指或鼠标按住尾巴再拖，老鼠会拼命往反方向跑；松手后它蹿出去，过一会儿自己跑回来。',
  },
  cheese: {
    ...CHEESE, tailChars: 0,
    hint: '点击奶酪咬一口，被咬掉的地方文字绕开，掉出边界的字会消失。“补回奶酪”可以重来。',
  },
}

const S = { shape: 'mouse', style: 'fill', edge: false, vx: 0, vy: 0, mode: 'idle', fleeT: 0, bites: [], size: 12, prep: null, bob: 0 }
const B = { shape: SHAPES.mouse, x: 0, y: 0, flip: false }

const stage = createStage($('#stage'), W, H), ctx = stage.ctx
const ptr = createPointer(stage)
const mask = createMask(W, H)
const rope = createRope(26, 10.5)

function home() {
  const sh = SHAPES[S.shape]
  return S.shape === 'mouse' ? { x: 40, y: (H - sh.bh) / 2 } : { x: (W - sh.bw) / 2, y: (H - sh.bh) / 2 }
}
function resetRope() { const a = anchorOf(B); rope.reset(a.x, a.y, B.flip ? -1 : 1) }

function paint(withCursor) {
  return mask.paint(B, {
    ring: S.style === 'ring' ? 46 : 0,
    holes: S.shape === 'cheese' ? S.bites : [],
    circles: withCursor && ptr.on && rope.held < 0 ? [[ptr.hx, ptr.hy, 30]] : [],
  })
}
const box = () => ({ top: B.y, bottom: B.y + B.shape.bh + 3 })

// Largest type size that leaves only the tail's worth of text.
function fit() {
  const sh = SHAPES[S.shape], h = home()
  B.shape = sh; B.x = h.x; B.y = h.y; B.flip = false
  S.vx = S.vy = 0; S.mode = 'idle'; rope.held = -1
  const r = fitSize(mask, paint(false), FLOW, { tailChars: sh.tailChars, ...box() })
  S.size = r.size; S.prep = r.prep
  if (sh.tail) resetRope()
}

function updateRope(dt, t) {
  const a = anchorOf(B)
  rope.update(dt, t, { ax: a.x, ay: a.y, dir: B.flip ? -1 : 1, ptr, amp: reduce ? 0 : 5 })
}

function updateBody(dt, t) {
  if (S.shape !== 'mouse') return
  const sh = B.shape, h = home(), bx0 = 8, bx1 = W - sh.bw - 8, by0 = 8, by1 = H - sh.bh - 8
  if (S.mode === 'held') {
    const a = anchorOf(B), dx = a.x - ptr.x, dy = a.y - ptr.y, dd = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / dd, uy = dy / dd
    S.vx += ux * 1100 * dt; S.vy += uy * 1100 * dt
    const sp = Math.sqrt(S.vx * S.vx + S.vy * S.vy)
    if (sp > 300) { S.vx *= 300 / sp; S.vy *= 300 / sp }
    const maxD = rope.held * rope.L
    if (dd > maxD) {
      const over = dd - maxD
      B.x -= ux * over; B.y -= uy * over
      const vn = S.vx * ux + S.vy * uy
      if (vn > 0) { S.vx -= ux * vn; S.vy -= uy * vn }
      if (!reduce) { B.x += (Math.random() - .5) * 2.4; B.y += (Math.random() - .5) * 2.4 }
    }
  } else if (S.mode === 'flee') {
    S.fleeT -= dt; S.vx *= Math.exp(-1.1 * dt); S.vy *= Math.exp(-1.1 * dt)
    if (S.fleeT <= 0) S.mode = 'idle'
  } else {
    S.vx += ((h.x - B.x) * 14 - S.vx * 6.2) * dt; S.vy += ((h.y - B.y) * 14 - S.vy * 6.2) * dt
  }
  B.x += S.vx * dt; B.y += S.vy * dt
  if (B.x < bx0) { B.x = bx0; S.vx = Math.abs(S.vx) * .8 }
  if (B.x > bx1) { B.x = bx1; S.vx = -Math.abs(S.vx) * .8 }
  if (B.y < by0) { B.y = by0; S.vy = Math.abs(S.vy) * .8 }
  if (B.y > by1) { B.y = by1; S.vy = -Math.abs(S.vy) * .8 }
  const speed = Math.sqrt(S.vx * S.vx + S.vy * S.vy), wasFlip = B.flip
  if (Math.abs(S.vx) > 40) B.flip = S.vx > 0
  else if (S.mode === 'idle' && speed < 12 && Math.abs(B.x - h.x) < 3) B.flip = false
  if (B.flip !== wasFlip) resetRope()
  S.bob = speed > 40 && !reduce ? Math.sin(t * 34) * Math.min(1.8, speed / 160) : 0
}

let acc = 0, frames = 0, msSum = 0
function frame(dt, now) {
  stage.begin(now)
  const t0 = performance.now(), sh = B.shape, th = stage.theme
  ptr.smooth()
  updateBody(dt, now / 1000)
  if (sh.tail) updateRope(dt, now / 1000)
  ptr.decay()
  const res = layoutBody(mask, paint(true), S.prep, { size: S.size, ...box() })
  if (S.edge) {
    strokeBody(ctx, B, { color: th.guide, holes: S.shape === 'cheese' ? S.bites : [], yb: S.bob })
    if (sh.tail) rope.stroke(ctx, th.guide)
  }
  drawLines(ctx, res.lines, { size: S.size, ink: th.ink, doneAll: res.done, yb: S.bob })
  if (sh.tail && !res.done) drawOnRope(ctx, rope, remainder(S.prep, res.cur), { ink: th.ink, flip: B.flip, yb: S.bob })
  if (rope.held > 0) {
    ctx.beginPath(); ctx.arc(rope.x[rope.held], rope.y[rope.held], 7, 0, 6.2832)
    ctx.strokeStyle = th.guide; ctx.lineWidth = 1.5; ctx.stroke()
  }
  msSum += performance.now() - t0; frames++; acc += dt
  if (acc > .3) {
    $('#r-layout').textContent = `layoutNextLine × ${res.count} / frame · ${(msSum / frames).toFixed(1)} ms`
    acc = frames = msSum = 0
  }
  $('#r-size').textContent = `${S.shape} · ${S.style} · type ${S.size.toFixed(1)}px · ${S.prep.segments.length} segments`
}

/* input */
const canvas = stage.canvas
const nearestRope = p => B.shape.tail ? rope.nearest(p) : -1
canvas.addEventListener('pointermove', e => {
  if (rope.held < 0) canvas.style.cursor = nearestRope(stage.toLogical(e)) > 0 ? 'grab' : (S.shape === 'cheese' ? 'crosshair' : 'default')
})
canvas.addEventListener('pointerdown', e => {
  const p = stage.toLogical(e)
  ptr.place(p)
  const i = nearestRope(p)
  if (i > 0) {
    rope.held = i; ptr.locked = true; S.mode = 'held'; S.vx = S.vy = 0
    canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; e.preventDefault(); return
  }
  if (S.shape === 'cheese' && S.bites.length < 16) {
    const lx = p.x - B.x, ly = p.y - B.y
    if (lx > -6 && lx < B.shape.bw + 6 && ly > -6 && ly < B.shape.bh + 6) S.bites.push([lx, ly, 16 + Math.random() * 12])
  }
})
function release(e) {
  if (rope.held < 0) return
  const a = anchorOf(B), dx = a.x - ptr.x, dy = a.y - ptr.y, dd = Math.hypot(dx, dy) || 1
  rope.held = -1; ptr.locked = false; S.mode = 'flee'; S.fleeT = 1.5
  S.vx = dx / dd * 620; S.vy = dy / dd * 620
  try { canvas.releasePointerCapture(e.pointerId) } catch {}
  canvas.style.cursor = 'default'
}
canvas.addEventListener('pointerup', release)
canvas.addEventListener('pointercancel', release)

function setPressed(seg, v) { seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false')) }
function applyHint() { $('#hint').textContent = SHAPES[S.shape].hint; $('#reset').hidden = S.shape !== 'cheese' }
$('#seg-shape').addEventListener('click', function (e) {
  const b = e.target.closest('button'); if (!b) return
  S.shape = b.dataset.v; S.bites = []; setPressed(this, S.shape); applyHint(); fit()
})
$('#seg-style').addEventListener('click', function (e) {
  const b = e.target.closest('button'); if (!b) return
  S.style = b.dataset.v; setPressed(this, S.style)
  const edge = $('#edge')
  if (S.style === 'ring' && !edge.checked) { edge.checked = true; S.edge = true }
  fit()
})
$('#edge').addEventListener('change', function () { S.edge = this.checked })
$('#reset').addEventListener('click', () => { S.bites = []; fit() })

bootAfterFonts(() => { applyHint(); fit(); stage.loop(frame) }, fit)
