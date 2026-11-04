// A body is a shape placed in the world: { shape, x, y, flip, k }. Shapes face left; flip mirrors them.
// A shape is one `path`, or several `parts` filled separately so their union is the silhouette
// whatever direction each part winds.
export const partsOf = shape => shape.parts || [shape.path]

export function applyBody(c, b) {
  const k = b.k ?? 1
  c.translate(b.x, b.y)
  if (b.flip) { c.translate(b.shape.bw * k, 0); c.scale(-1, 1) }
  if (k !== 1) c.scale(k, k)
}

export function anchorOf(b) {
  const k = b.k ?? 1, sh = b.shape
  return { x: b.x + (b.flip ? sh.bw - sh.tail.ax : sh.tail.ax) * k, y: b.y + sh.tail.ay * k }
}

// Local shape point → world point.
export function worldOf(b, lx, ly) {
  const k = b.k ?? 1
  return { x: b.x + (b.flip ? b.shape.bw - lx : lx) * k, y: b.y + ly * k }
}

export function strokeBody(ctx, b, { color, alpha = .8, width = 1.2, holes = [], yb = 0 }) {
  const k = b.k ?? 1
  ctx.save()
  applyBody(ctx, { ...b, y: b.y + yb })
  ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = width / k
  for (const p of partsOf(b.shape)) ctx.stroke(p)
  ctx.beginPath()
  for (const [x, y, r] of [...b.shape.holes, ...holes]) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832) }
  ctx.stroke()
  ctx.restore()
}
