import { SPEAKERS, textOf, FAMILY, fontOf } from '../../src/poem.js'
import { MOUSE, DOG, dogPose } from '../../src/shapes.js'
import { createStage, createPointer, reduceMotion as reduce } from '../../src/stage.js'
import { createMask } from '../../src/mask.js'
import { anchorOf, worldOf, strokeBody } from '../../src/body.js'
import { layoutBody, remainder, fitSize, drawLines } from '../../src/flow.js'
import { createRope } from '../../src/rope.js'
import { drawOnRope, taper } from '../../src/path-text.js'
import { bootAfterFonts } from '../../src/fonts.js'

const $ = s => document.querySelector(s)
const W = 1000, H = 600, GROUND = H - 34, LAG = 30, CATCH = 34

const stage = createStage($('#stage'), W, H), ctx = stage.ctx
const ptr = createPointer(stage)
const mask = createMask(W, H)
const rope = createRope(16, 7)
const tailTaper = taper(9, 5)

const D = { shape: DOG, k: .85, x: 540, y: 200, flip: false }
const M = { shape: MOUSE, k: .36, x: 140, y: 320, flip: false }
const NARRATION = SPEAKERS.filter(s => s.who === 'narrator').map(s => s.text).join('   ')

const S = {
  dog: null, mouse: null, dvx: 0, dvy: 0, mvx: 0, mvy: 0,
  trail: [], state: 'sit', timer: 0, catches: 0, edge: false, step: 0, swing: 0, tail: .6,
}

const size = b => ({ w: b.shape.bw * b.k, h: b.shape.bh * b.k })
const center = b => ({ x: b.x + size(b).w / 2, y: b.y + size(b).h / 2 })
const box = b => ({ top: b.y, bottom: b.y + size(b).h + 3, wholeWords: true })
// Fury's words are bold. His last four, the verdict, are what he stands on: one word down each leg.
// His name rides the tail. Everything else fills the torso and head.
const DOG_TYPE = { minRun: 1.2, weight: 700 }
const FURY_WORDS = textOf('fury').split(' ')
const VERDICT = FURY_WORDS.slice(-4), TORSO_TEXT = FURY_WORDS.slice(0, -4).join(' ')
const LEG = [34, 112], TAIL = [12, 100]  // where along each limb the word sits, in shape units
const torsoOf = b => ({ ...b, shape: { ...b.shape, parts: b.shape.torsoParts } })

// Fit each speaker's words into their own body, alone, at rest.
function fit() {
  const at0 = b => ({ ...b, x: 0, y: 0 })
  S.dog = fitSize(mask, mask.paint(torsoOf(at0({ ...D, shape: DOG }))), TORSO_TEXT, { lo: 6, hi: 30, ...DOG_TYPE, ...box(at0(D)) })
  // Each verdict word as big as its leg allows: long enough along it, no wider than it.
  ctx.font = fontOf(10, 700)
  const em = w => ctx.measureText(w).width / 10
  S.legSizes = VERDICT.map(w => Math.min((LEG[1] - LEG[0]) * D.k / em(w), 48 * D.k * .62))
  S.tailSize = Math.min((TAIL[1] - TAIL[0]) * D.k / em('Fury'), 30 * D.k * .6)
  S.mouse = fitSize(mask, mask.paint(at0(M)), textOf('mouse'), { lo: 5, hi: 20, tailChars: 26, ...box(at0(M)) })
  resetRope()
}
function resetRope() { const a = anchorOf(M); rope.reset(a.x, a.y, M.flip ? -1 : 1) }

function clampBody(b) {
  const { w, h } = size(b)
  b.x = Math.max(4, Math.min(W - w - 4, b.x)); b.y = Math.max(4, Math.min(GROUND - h, b.y))
}

function updateMouse(dt) {
  if (S.state === 'caught') {
    if (!reduce) { M.x += (Math.random() - .5) * 3; M.y += (Math.random() - .5) * 3 }
    return
  }
  if (ptr.on) {
    const { w, h } = size(M), tx = ptr.x - w / 2, ty = ptr.y - h / 2
    S.mvx += ((tx - M.x) * 40 - S.mvx * 10) * dt; S.mvy += ((ty - M.y) * 40 - S.mvy * 10) * dt
  } else { S.mvx *= Math.exp(-6 * dt); S.mvy *= Math.exp(-6 * dt) }
  M.x += S.mvx * dt; M.y += S.mvy * dt
  clampBody(M)
  const was = M.flip
  if (Math.abs(S.mvx) > 30) M.flip = S.mvx > 0
  if (M.flip !== was) resetRope()
}

const nose = () => worldOf(D, D.shape.nose.x, D.shape.nose.y)
const probe = document.createElement('canvas').getContext('2d')
// Caught by the nose, or pinned under any part of the dog: a mouse hugging the floor is below the nose's reach.
function caught() {
  const n = nose(), m = center(M)
  if (Math.hypot(n.x - m.x, n.y - m.y) < CATCH) return true
  return [[0, 0], [-18, 0], [18, 0], [0, 12]].some(([ox, oy]) => {
    const lx = (m.x + ox - D.x) / D.k, ly = (m.y + oy - D.y) / D.k
    return D.shape.parts.some(p => probe.isPointInPath(p, D.flip ? D.shape.bw - lx : lx, ly))
  })
}
function steer(dt, from, target, speed, turn) {
  const dx = target.x - from.x, dy = target.y - from.y, d = Math.hypot(dx, dy) || 1
  S.dvx += (dx / d * speed - S.dvx) * Math.min(1, dt * turn); S.dvy += (dy / d * speed - S.dvy) * Math.min(1, dt * turn)
}

function updateDog(dt) {
  S.trail.push(center(M))
  if (S.trail.length > LAG) S.trail.shift()
  if (S.state === 'caught') {
    S.dvx = S.dvy = 0; S.timer -= dt
    if (S.timer <= 0) { S.state = 'retreat'; S.timer = 1.4 }
  } else if (S.state === 'retreat') {
    // Back off to whichever side is farther from the mouse, then start over.
    const m = center(M), corner = { x: m.x < W / 2 ? W - 120 : 120, y: m.y < H / 2 ? GROUND - 90 : 120 }
    steer(dt, center(D), corner, 320, 4); S.timer -= dt
    if (S.timer <= 0) S.state = ptr.on ? 'chase' : 'sit'
  } else if (S.state === 'chase') {
    // Nose first, toward where the mouse was half a second ago; the closer, the faster.
    const n = nose(), goal = S.trail[0], d = Math.hypot(goal.x - n.x, goal.y - n.y)
    steer(dt, n, goal, 90 + 260 * Math.max(0, Math.min(1, 1 - d / 650)), 2.5)
    if (caught()) { S.state = 'caught'; S.timer = 1.8; S.catches++ }
    if (!ptr.on) S.state = 'sit'
  } else {
    S.dvx *= Math.exp(-4 * dt); S.dvy *= Math.exp(-4 * dt)
    if (ptr.on) S.state = 'chase'
  }
  D.x += S.dvx * dt; D.y += S.dvy * dt
  clampBody(D)
  if (Math.abs(S.dvx) > 25) D.flip = S.dvx > 0
}

// Legs swing with distance covered, the torso bobs with each stride, the tail says what mood it's in.
function poseDog(dt, t) {
  const speed = Math.hypot(S.dvx, S.dvy), ease = r => Math.min(1, dt * r)
  S.step += speed * dt / 38
  S.swing += (Math.min(.55, speed / 420) - S.swing) * ease(8)
  const wag = reduce ? 0 : 1
  const tail = {
    sit: .55 + Math.sin(t * 7) * .35 * wag,
    chase: .7 + Math.sin(t * 16) * .2 * wag,
    caught: .1,
    retreat: 1.6,
  }[S.state]
  S.tail += (tail - S.tail) * ease(12)
  D.shape = dogPose({ step: S.step, swing: S.swing, tail: S.tail, lift: -Math.abs(Math.sin(S.step)) * 9 * S.swing })
}

// Set a word along a leg (pointing down) or the tail (pointing up), in world space so it never mirrors.
function drawLimbs(ink, accent) {
  const base = ctx.getTransform(), k = D.k
  const place = (l, word, [from, to], size, color) => {
    const sn = Math.sin(l.angle), cs = Math.cos(l.angle)
    let dx = l.kind === 'leg' ? -sn : sn
    const dy = l.kind === 'leg' ? cs : -cs
    if (D.flip) dx = -dx
    const p = worldOf(D, l.x, l.y), mid = (from + to) / 2 * k
    let a = Math.atan2(dy, dx)
    if (l.kind === 'tail' && dx < 0) a += Math.PI
    ctx.setTransform(base); ctx.translate(p.x + dx * mid, p.y + dy * mid); ctx.rotate(a)
    ctx.font = fontOf(size, 700); ctx.fillStyle = color
    // Far legs cross the near ones mid-stride; fade them while running so the crossing reads as depth.
    ctx.globalAlpha = l.far ? 1 - .5 * Math.min(1, S.swing / .3) : 1
    ctx.fillText(word, 0, 0)
    ctx.globalAlpha = 1
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  // Legs read left to right whichever way the dog faces.
  const legs = D.shape.limbs.filter(l => l.kind === 'leg').sort((a, b) => worldOf(D, a.x, a.y).x - worldOf(D, b.x, b.y).x)
  legs.forEach((l, i) => place(l, VERDICT[i], LEG, S.legSizes[i], S.state === 'caught' ? accent : ink))
  place(D.shape.limbs.find(l => l.kind === 'tail'), 'Fury', TAIL, S.tailSize, ink)
  ctx.setTransform(base)
}

function frame(dt, now) {
  stage.begin(now)
  const th = stage.theme, t = now / 1000
  ptr.smooth()
  updateMouse(dt)
  updateDog(dt)
  poseDog(dt, t)
  const a = anchorOf(M)
  rope.update(dt, t, { ax: a.x, ay: a.y, dir: M.flip ? -1 : 1, amp: reduce ? 0 : 3 })
  ptr.decay()

  // Ground and the narrator.
  ctx.strokeStyle = th.rule; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, GROUND + .5); ctx.lineTo(W, GROUND + .5); ctx.stroke()
  ctx.font = `italic 400 13px ${FAMILY}`; ctx.fillStyle = th.soft; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(NARRATION, W / 2, GROUND + 17)

  if (S.edge) { strokeBody(ctx, D, { color: th.guide, alpha: .35 }); strokeBody(ctx, M, { color: th.guide, alpha: .35 }) }

  // Each body is cut by the other, so they shove each other's words around.
  const dogRes = layoutBody(mask, mask.paint(torsoOf(D), { cut: [{ body: M, pad: 6 }] }), S.dog.prep, { size: S.dog.size, ...DOG_TYPE, ...box(D) })
  const mouseRes = layoutBody(mask, mask.paint(M, { cut: [{ body: D, pad: 6 }] }), S.mouse.prep, { size: S.mouse.size, ...box(M) })

  drawLines(ctx, dogRes.lines, { size: S.dog.size, weight: DOG_TYPE.weight, ink: th.ink, doneAll: dogRes.done })
  drawLimbs(th.ink, th.accent)
  drawLines(ctx, mouseRes.lines, { size: S.mouse.size, ink: th.ink, doneAll: mouseRes.done })
  if (!mouseRes.done) drawOnRope(ctx, rope, remainder(S.mouse.prep, mouseRes.cur), { ink: th.ink, flip: M.flip, sizeAt: tailTaper })

  const n = nose(), m = center(M)
  $('#r-words').textContent = `Fury ${textOf('fury').split(' ').length} 词 · mouse ${textOf('mouse').split(' ').length} 词 · 被抓 ${S.catches} 次`
  $('#r-state').textContent = { sit: '坐着 · 把指针移进画布', chase: `追 · 距离 ${Math.round(Math.hypot(n.x - m.x, n.y - m.y))}px`, caught: '“…and condemn you to death.”', retreat: '退后' }[S.state]
}

$('#edge').addEventListener('change', e => { S.edge = e.target.checked })

bootAfterFonts(() => { fit(); stage.loop(frame) }, fit)
