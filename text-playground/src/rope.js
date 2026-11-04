// Verlet rope: point 0 is pinned to an anchor, the rest swing toward a rest pose and get pushed by the pointer.
export function createRope(n, L) {
  const r = { n, L, x: [], y: [], px: [], py: [], held: -1 }

  r.reset = (ax, ay, dir) => {
    for (let i = 0; i < r.n; i++) { r.x[i] = r.px[i] = ax + dir * i * r.L * .95; r.y[i] = r.py[i] = ay + i * .8 }
  }

  // Grow or shrink without disturbing existing points; new points start at the old tip.
  r.resize = m => {
    m = Math.max(2, m | 0)
    for (let i = r.n; i < m; i++) {
      const j = Math.max(0, i - 1)
      r.x[i] = r.px[i] = r.x[j] ?? 0; r.y[i] = r.py[i] = r.y[j] ?? 0
    }
    r.n = m; r.x.length = r.y.length = r.px.length = r.py.length = m
    if (r.held >= m) r.held = -1
  }

  // target(i, t) → [x, y] rest position; stiff(i) → pull strength toward it.
  r.update = (dt, t, { ax, ay, dir, ptr = null, amp = 5, gravity = .12, damping = .965, iters = 8, target = null, stiff = null }) => {
    const N = r.n, X = r.x, Y = r.y, PX = r.px, PY = r.py
    X[0] = ax; Y[0] = ay
    for (let i = 1; i < N; i++) {
      if (i === r.held) continue
      const vx = (X[i] - PX[i]) * damping, vy = (Y[i] - PY[i]) * damping + gravity
      PX[i] = X[i]; PY[i] = Y[i]
      let tx, ty
      if (target) [tx, ty] = target(i, t)
      else { tx = ax + dir * i * r.L * .96; ty = ay + Math.sin(i * .42 - t * 2.1) * amp * (i / N) + i * .35 }
      const k = stiff ? stiff(i) : .012 + .05 * (1 - i / N)
      X[i] += vx + (tx - X[i]) * k; Y[i] += vy + (ty - Y[i]) * k
      if (ptr && ptr.on) {
        const dx = X[i] - ptr.x, dy = Y[i] - ptr.y, dd = Math.sqrt(dx * dx + dy * dy)
        if (dd < 48) { const f = (1 - dd / 48) * .55; X[i] += ptr.vx * f * dt * 60 * .5; Y[i] += ptr.vy * f * dt * 60 * .5 }
        X[i] += ptr.vx * .02 * (i / N) * dt * 60 * .3; Y[i] += ptr.vy * .02 * (i / N) * dt * 60 * .3
      }
    }
    if (r.held > 0 && ptr) { X[r.held] = PX[r.held] = ptr.x; Y[r.held] = PY[r.held] = ptr.y }
    for (let it = 0; it < iters; it++) {
      X[0] = ax; Y[0] = ay
      for (let i = 0; i < N - 1; i++) {
        const ex = X[i + 1] - X[i], ey = Y[i + 1] - Y[i], ed = Math.sqrt(ex * ex + ey * ey) || 1e-4, df = (ed - r.L) / ed
        const fixA = i === 0 || i === r.held, fixB = i + 1 === r.held
        if (fixA && fixB) continue
        if (fixA) { X[i + 1] -= ex * df; Y[i + 1] -= ey * df }
        else if (fixB) { X[i] += ex * df; Y[i] += ey * df }
        else { X[i] += ex * df * .5; Y[i] += ey * df * .5; X[i + 1] -= ex * df * .5; Y[i + 1] -= ey * df * .5 }
      }
    }
  }

  r.nearest = (p, from = 3, radius = 24) => {
    let best = -1, bd = radius
    for (let i = from; i < r.n; i++) { const d = Math.hypot(r.x[i] - p.x, r.y[i] - p.y); if (d < bd) { bd = d; best = i } }
    return best
  }

  r.stroke = (ctx, color, alpha = .7) => {
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath()
    ctx.moveTo(r.x[0], r.y[0]); for (let i = 1; i < r.n; i++) ctx.lineTo(r.x[i], r.y[i])
    ctx.stroke(); ctx.restore()
  }

  return r
}
