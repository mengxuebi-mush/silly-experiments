import { prepareWithSegments } from '@chenglou/pretext'
import { FLOW, fontOf } from '../../src/poem.js'
import { MOUSE, CHEESE } from '../../src/shapes.js'
import { createStage, reduceMotion as reduce } from '../../src/stage.js'
import { createMask } from '../../src/mask.js'
import { anchorOf, strokeBody } from '../../src/body.js'
import { layoutBody, remainder, fitSize, drawLines } from '../../src/flow.js'
import { createRope } from '../../src/rope.js'
import { drawOnRope } from '../../src/path-text.js'
import { bootAfterFonts } from '../../src/fonts.js'

const $ = s => document.querySelector(s)
const W = 1140, H = 310, FLOOR = 296, HOME_X = 560, K_MIN = .26

const stage = createStage($('#stage'), W, H), ctx = stage.ctx
const mask = createMask(W, H)
const rope = createRope(26, 10.5)
const hit = document.createElement('canvas').getContext('2d')

const C = { shape: CHEESE, x: 24, y: FLOOR - CHEESE.bh }
const M = { shape: MOUSE, x: HOME_X, y: 0, k: K_MIN, flip: false }
const cheeseBox = { top: C.y, bottom: C.y + CHEESE.bh + 3 }
const mouseBox = b => ({ top: b.y, bottom: b.y + MOUSE.bh * b.k + 3 })
const homeOf = k => ({ x: HOME_X, y: FLOOR - MOUSE.bh * k })

const S = {
  size: 12, all: null, starts: [], cut: 0, bites: [],
  mousePrep: null, kTarget: K_MIN, tail: false,
  mode: 'home', vx: 0, vy: 0, chompT: 0, queue: [], flyers: [], lastCheese: [], edge: true,
}

// Where each word starts: the cursor can only stop there.
function wordStarts(prep) {
  const out = []
  for (let i = 0; i < prep.segments.length; i++)
    if (prep.kinds[i] === 'text' && (i === 0 || prep.kinds[i - 1] === 'space')) out.push({ segmentIndex: i, graphemeIndex: 0 })
  return out
}

const cheeseData = () => mask.paint(C, { holes: S.bites })
const cheeseFits = (data, ci) => ci >= S.starts.length || layoutBody(mask, data, S.all, { size: S.size, start: S.starts[ci], wholeWords: true, ...cheeseBox }).fits

function mouseText() {
  if (S.cut >= S.starts.length) return FLOW
  return S.all.segments.slice(0, S.starts[S.cut].segmentIndex).join('').trim()
}

// Same type size as the cheese; find the smallest body that holds what's been eaten.
function refitMouse() {
  const text = mouseText()
  S.mousePrep = text ? prepareWithSegments(text, fontOf(S.size)) : null
  if (!S.mousePrep) { S.kTarget = K_MIN; S.tail = false; return }
  const fitsAt = k => {
    const b = { ...M, k, ...homeOf(k) }
    return layoutBody(mask, mask.paint(b), S.mousePrep, { size: S.size, wholeWords: true, ...mouseBox(b) }).fits
  }
  if (!fitsAt(1)) { S.kTarget = 1; S.tail = true; return }
  let lo = K_MIN, hi = 1
  for (let i = 0; i < 10; i++) { const mid = (lo + hi) / 2; if (fitsAt(mid)) hi = mid; else lo = mid }
  S.kTarget = hi; S.tail = false
}

function reset() {
  S.bites = []; S.cut = 0; S.queue = []; S.flyers = []; S.mode = 'home'; S.vx = S.vy = 0
  S.size = fitSize(mask, cheeseData(), FLOW, { tailChars: 0, wholeWords: true, ...cheeseBox }).size
  S.all = prepareWithSegments(FLOW, fontOf(S.size))
  S.starts = wordStarts(S.all)
  refitMouse()
  M.k = S.kTarget; Object.assign(M, homeOf(M.k))
  const a = anchorOf(M); rope.reset(a.x, a.y, 1)
}

function bite(p) {
  S.bites.push([p.x - C.x, p.y - C.y, 22 + Math.random() * 8])
  const data = cheeseData()
  let ci = S.cut
  while (ci < S.starts.length && !cheeseFits(data, ci)) ci++
  if (ci === S.cut) return
  // The words that leave are the cheese's first lines: send them flying to the mouse.
  const until = S.starts[ci] ? S.starts[ci].segmentIndex : Infinity
  for (const ln of S.lastCheese) if (ln.start.segmentIndex < until) S.flyers.push({ text: ln.text, x: ln.x, y: ln.y, t: 0, delay: S.flyers.length * .03 })
  S.cut = ci
  refitMouse()
}

function update(dt) {
  M.k += (S.kTarget - M.k) * Math.min(1, dt * 4)
  let target = homeOf(M.k)
  if (S.mode === 'go') {
    const p = S.queue[0]
    target = { x: p.x - MOUSE.nose.x * M.k - 4, y: p.y - MOUSE.nose.y * M.k }
  }
  if (S.mode === 'chomp') {
    S.chompT -= dt
    if (S.chompT <= 0) { S.mode = 'back'; S.queue.shift() }
    target = { x: M.x, y: M.y }
  } else {
    S.vx += ((target.x - M.x) * 30 - S.vx * 9) * dt; S.vy += ((target.y - M.y) * 30 - S.vy * 9) * dt
    M.x += S.vx * dt; M.y += S.vy * dt
  }
  const near = Math.hypot(target.x - M.x, target.y - M.y) < 3 && Math.hypot(S.vx, S.vy) < 30
  if (S.mode === 'go' && near) { S.mode = 'chomp'; S.chompT = .32; bite(S.queue[0]) }
  if ((S.mode === 'back' || S.mode === 'home') && near) S.mode = S.queue.length ? 'go' : 'home'
  if (S.mode === 'home' && S.queue.length) S.mode = 'go'
  for (const f of S.flyers) f.t += dt
  S.flyers = S.flyers.filter(f => f.t - f.delay < .7)
}

function frame(dt, now) {
  stage.begin(now)
  const th = stage.theme, t = now / 1000
  update(dt)
  const bob = S.mode === 'chomp' && !reduce ? Math.sin(t * 60) * 2 : 0

  if (S.edge) {
    strokeBody(ctx, C, { color: th.guide, alpha: .5, holes: S.bites })
    strokeBody(ctx, M, { color: th.guide, alpha: .5, yb: bob })
  }

  // Cheese: everything from the cursor on, flowing around the mouse when it leans in.
  if (S.cut < S.starts.length) {
    const res = layoutBody(mask, mask.paint(C, { holes: S.bites, cut: [{ body: M, pad: 5 }] }), S.all, { size: S.size, start: S.starts[S.cut], wholeWords: true, ...cheeseBox })
    drawLines(ctx, res.lines, { size: S.size, ink: th.ink, doneAll: res.done })
    S.lastCheese = res.lines
  } else S.lastCheese = []

  // Mouse: everything before the cursor. Words still in flight aren't drawn here yet.
  if (S.mousePrep) {
    const res = layoutBody(mask, mask.paint(M), S.mousePrep, { size: S.size, wholeWords: true, ...mouseBox(M) })
    drawLines(ctx, res.lines, { size: S.size, ink: th.ink, doneAll: res.done, yb: bob })
    const a = anchorOf(M)
    rope.update(dt, t, { ax: a.x, ay: a.y + bob, dir: 1, amp: reduce ? 0 : 5 })
    if (S.tail && !res.done && Math.abs(M.k - 1) < .02) drawOnRope(ctx, rope, remainder(S.mousePrep, res.cur), { ink: th.ink, yb: 0 })
  }

  // Flyers: the words that just left the cheese.
  const dest = { x: M.x + MOUSE.bw * M.k * .45, y: M.y + MOUSE.bh * M.k * .5 }
  ctx.font = fontOf(S.size); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = th.accent
  for (const f of S.flyers) {
    const u = Math.min(1, Math.max(0, (f.t - f.delay) / .6)), e = 1 - Math.pow(1 - u, 3)
    ctx.globalAlpha = 1 - u * u
    ctx.fillText(f.text, f.x + (dest.x - f.x) * e, f.y + (dest.y - f.y) * e - Math.sin(u * Math.PI) * 60)
  }
  ctx.globalAlpha = 1; ctx.fillStyle = th.ink

  const total = S.starts.length
  $('#r-count').textContent = S.cut >= total
    ? `奶酪吃完了 · 老鼠 ${total} 词 · 共 ${total} 词`
    : `奶酪 ${total - S.cut} 词 · 老鼠 ${S.cut} 词 · 共 ${total} 词 · ${S.bites.length} 口`
  $('#r-size').textContent = `type ${S.size.toFixed(1)}px · mouse ×${M.k.toFixed(2)}`
}

const canvas = stage.canvas
const insideCheese = p => hit.isPointInPath(CHEESE.path, p.x - C.x, p.y - C.y)
canvas.addEventListener('pointermove', e => { canvas.style.cursor = insideCheese(stage.toLogical(e)) ? 'crosshair' : 'default' })
canvas.addEventListener('pointerdown', e => {
  const p = stage.toLogical(e)
  if (insideCheese(p) && S.cut < S.starts.length && S.queue.length < 4) S.queue.push(p)
})
$('#reset').addEventListener('click', reset)
$('#edge').addEventListener('change', e => { S.edge = e.target.checked })

bootAfterFonts(() => { reset(); stage.loop(frame) }, reset)
