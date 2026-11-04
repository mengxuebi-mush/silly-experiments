// Paint a body into an offscreen alpha mask, carve things out of it, then read it back
// as horizontal runs per text line: the widths Pretext gets asked to fill.
import { applyBody, partsOf } from './body.js'

export function createMask(W, H, MS = .5) {
  const make = () => {
    const cv = document.createElement('canvas')
    cv.width = Math.round(W * MS); cv.height = Math.round(H * MS)
    return cv
  }
  const cv = make(), c = cv.getContext('2d', { willReadFrequently: true })
  const cv2 = make(), c2 = cv2.getContext('2d')

  // ring: keep only a band this wide along the outline.
  // holes: extra [x, y, r] in the body's local space (bites). circles: [x, y, r] in world space (the cursor).
  // cut: [{ body, pad }] other bodies to subtract, grown by pad.
  function paint(body, { ring = 0, holes = [], circles = [], cut = [] } = {}) {
    const k = body.k ?? 1
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height)
    c.globalCompositeOperation = 'source-over'
    c.setTransform(MS, 0, 0, MS, 0, 0)
    c.save(); applyBody(c, body); c.fillStyle = '#000'; for (const p of partsOf(body.shape)) c.fill(p); c.restore()
    if (ring) {
      c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, cv2.width, cv2.height)
      c2.globalCompositeOperation = 'source-over'
      c2.setTransform(MS, 0, 0, MS, 0, 0)
      c2.save(); applyBody(c2, body)
      c2.fillStyle = '#000'; for (const p of partsOf(body.shape)) c2.fill(p)
      c2.globalCompositeOperation = 'destination-out'
      c2.lineWidth = ring * 2 / k; c2.lineJoin = 'round'; for (const p of partsOf(body.shape)) c2.stroke(p)
      c2.restore()
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-out'
      c.drawImage(cv2, 0, 0)
      c.setTransform(MS, 0, 0, MS, 0, 0)
    }
    c.globalCompositeOperation = 'destination-out'
    c.fillStyle = '#000'
    c.save(); applyBody(c, body)
    for (const [x, y, r] of [...body.shape.holes, ...holes]) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill() }
    c.restore()
    for (const [x, y, r] of circles) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill() }
    for (const { body: o, pad = 0 } of cut) {
      const ko = o.k ?? 1
      c.save(); applyBody(c, o)
      for (const p of partsOf(o.shape)) c.fill(p)
      if (pad) { c.strokeStyle = '#000'; c.lineWidth = pad * 2 / ko; c.lineJoin = 'round'; for (const p of partsOf(o.shape)) c.stroke(p) }
      c.restore()
    }
    c.setTransform(1, 0, 0, 1, 0, 0)
    return c.getImageData(0, 0, cv.width, cv.height).data
  }

  // Inside-runs for a line box: a pixel counts only if it's inside at 18%, 50% and 82% of the line height.
  function runsFor(data, y0, lh) {
    const mw = cv.width, mh = cv.height, runs = []
    const row = f => Math.min(mh - 1, Math.max(0, Math.round((y0 + lh * f) * MS)))
    const a = row(.18), b = row(.5), cc = row(.82)
    let start = -1, x
    for (x = 0; x < mw; x++) {
      const on = data[(a * mw + x) * 4 + 3] > 127 && data[(b * mw + x) * 4 + 3] > 127 && data[(cc * mw + x) * 4 + 3] > 127
      if (on) { if (start < 0) start = x }
      else if (start >= 0) { runs.push([start / MS, x / MS]); start = -1 }
    }
    if (start >= 0) runs.push([start / MS, mw / MS])
    return runs
  }

  return { paint, runsFor, MS }
}
