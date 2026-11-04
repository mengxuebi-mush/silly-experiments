import { prepareWithSegments } from '@chenglou/pretext'
import { FLOW, fontOf } from '../../src/poem.js'
import { MOUSE } from '../../src/shapes.js'
import { createStage, createPointer, reduceMotion as reduce } from '../../src/stage.js'
import { createMask } from '../../src/mask.js'
import { anchorOf, strokeBody } from '../../src/body.js'
import { layoutBody, remainder, fitSize, drawLines } from '../../src/flow.js'
import { createRope } from '../../src/rope.js'
import { drawOnRope, lengthNeeded, taper } from '../../src/path-text.js'
import { serpentine } from '../../src/trail.js'
import { bootAfterFonts } from '../../src/fonts.js'

const $ = s => document.querySelector(s)
const W = 780, H = 620, L = 10.5, MAX_N = 420

const stage = createStage($('#stage'), W, H), ctx = stage.ctx
const ptr = createPointer(stage)
const mask = createMask(W, H)
const B = { shape: MOUSE, x: 30, y: 24, flip: false }
const box = { top: B.y, bottom: B.y + MOUSE.bh + 3 }
const anchor = anchorOf(B)
const rope = createRope(2, L)
const trail = serpentine({ ax: anchor.x, ay: anchor.y, right: W - 34, left: 34, rowGap: 46, bottom: H - 20, narrow: 14, gapShrink: .94, firstGap: box.bottom + 24 - anchor.y })
const sizeAt = taper(13.5, 6)

const S = { size: 16, text: '', prep: null, edge: false }

// Keep the type size the original poem gets in Mouse Run, so your words sit at the same scale.
function fit() {
  S.size = fitSize(mask, mask.paint(B), FLOW, { tailChars: 42, ...box }).size
  setText(S.text)
}

function setText(t) {
  S.text = t
  S.prep = t.trim() ? prepareWithSegments(t, fontOf(S.size)) : null
}

let acc = 0, frames = 0, msSum = 0
function frame(dt, now) {
  stage.begin(now)
  const t0 = performance.now(), th = stage.theme, t = now / 1000
  ptr.smooth()
  const data = mask.paint(B, { circles: ptr.on ? [[ptr.hx, ptr.hy, 30]] : [] })
  const res = S.prep ? layoutBody(mask, data, S.prep, { size: S.size, wholeWords: true, ...box }) : null
  const tail = res && !res.done ? remainder(S.prep, res.cur) : ''

  // The rope is exactly as long as the tail text needs, up to what fits on the sheet.
  const need = tail ? lengthNeeded(ctx, tail, sizeAt, rope.n * L) : 0
  const n = tail ? Math.min(MAX_N, Math.ceil(need / L) + 2) : 2
  if (n !== rope.n) rope.resize(rope.n < n ? Math.min(n, rope.n + 6) : n)
  rope.update(dt, t, {
    ax: anchor.x, ay: anchor.y, dir: 1, ptr, gravity: .02,
    target: i => {
      const [x, y] = trail.at(i * L)
      return [x, y + (reduce ? 0 : Math.sin(i * .42 - t * 2.1) * 4 * Math.min(1, i / 30))]
    },
    stiff: i => .03 + .05 * (1 - i / Math.max(40, rope.n)),
  })
  ptr.decay()

  strokeBody(ctx, B, { color: S.edge ? th.guide : th.soft, alpha: S.edge ? .8 : (S.prep ? .18 : .5) })
  if (S.edge) rope.stroke(ctx, th.guide)
  if (res) drawLines(ctx, res.lines, { size: S.size, ink: th.ink, doneAll: res.done })
  if (tail) drawOnRope(ctx, rope, tail, { ink: th.ink, sizeAt })

  msSum += performance.now() - t0; frames++; acc += dt
  if (acc > .3) {
    const total = Array.from(S.text.trim()).length, inTail = Array.from(tail).length
    $('#r-count').textContent = `${total} 字符 · 身体 ${total - inTail} · 尾巴 ${inTail} · 绳子 ${rope.n} 节`
    $('#r-layout').textContent = `type ${S.size.toFixed(1)}px · ${res ? res.lines.length : 0} lines · ${(msSum / frames).toFixed(1)} ms`
    acc = frames = msSum = 0
  }
}

const ta = $('#text')
ta.value = FLOW
ta.addEventListener('input', () => setText(ta.value))
$('#restore').addEventListener('click', () => { ta.value = FLOW; setText(FLOW) })
$('#clear').addEventListener('click', () => { ta.value = ''; setText(''); ta.focus() })
$('#edge').addEventListener('change', e => { S.edge = e.target.checked })

bootAfterFonts(() => {
  S.text = FLOW; fit()
  rope.reset(anchor.x, anchor.y, 1)
  stage.loop(frame)
}, fit)
