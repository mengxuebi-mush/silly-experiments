// Rest poses for long tails: a polyline you can sample by arc length.
export function polyline(pts) {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const length = cum[cum.length - 1]
  const at = d => {
    d = Math.max(0, Math.min(length, d))
    let lo = 1, hi = pts.length - 1
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m + 1; else hi = m }
    const seg = cum[lo] - cum[lo - 1] || 1, u = (d - cum[lo - 1]) / seg
    return [pts[lo - 1][0] + (pts[lo][0] - pts[lo - 1][0]) * u, pts[lo - 1][1] + (pts[lo][1] - pts[lo - 1][1]) * u]
  }
  return { pts, length, at }
}

// Out from the anchor toward the right margin, then back and forth in rows, each row a little narrower,
// the way Carroll's tail winds down the page. Turns stay inside [left, right].
// firstGap: how far the first turn drops, so the rows start clear of the body.
export function serpentine({ ax, ay, right, left, rowGap, bottom, narrow = 0, gapShrink = 1, firstGap = rowGap }) {
  const pts = [[ax, ay]]
  let y = ay, xr = right, xl = left, gap = firstGap, dirRight = true
  for (;;) {
    if (y + gap > bottom || xr - xl - 2 * narrow < 40) { pts.push([dirRight ? xr : xl, y]); break }
    const r = gap / 2, cx = dirRight ? xr - r : xl + r, cy = y + r
    pts.push([cx, y])
    for (let s = 1; s <= 16; s++) {
      const th = dirRight ? -Math.PI / 2 + Math.PI * s / 16 : -Math.PI / 2 - Math.PI * s / 16
      pts.push([cx + r * Math.cos(th), cy + r * Math.sin(th)])
    }
    y += gap; xr -= narrow; xl += narrow
    gap = (gap === firstGap && firstGap !== rowGap ? rowGap : gap) * gapShrink
    dirRight = !dirRight
  }
  return polyline(pts)
}
