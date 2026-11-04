// Canvas in a fixed logical coordinate space (W×H), scaled for DPR, with theme colors read from CSS.
export const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)

export function createStage(canvas, W, H) {
  canvas.style.aspectRatio = `${W}/${H}`
  const ctx = canvas.getContext('2d')
  const stage = {
    canvas, ctx, W, H, scale: 1,
    theme: { ink: '#000', soft: '#888', guide: '#48f', accent: '#c33', sheet: '#fff', rule: '#ccc' },
  }
  let lastTheme = -1e9

  function readTheme(now) {
    if (now - lastTheme < 400) return
    lastTheme = now
    const cs = getComputedStyle(document.documentElement), t = stage.theme
    const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback
    t.ink = get('--ink', t.ink); t.soft = get('--ink-soft', t.soft); t.guide = get('--guide', t.guide)
    t.accent = get('--accent', t.accent); t.sheet = get('--sheet', t.sheet); t.rule = get('--rule', t.rule)
  }

  function size() {
    const r = canvas.getBoundingClientRect()
    if (!r.width) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cw = Math.round(r.width * dpr), ch = Math.round(cw * H / W)
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch }
    stage.scale = canvas.width / W
  }

  stage.toLogical = e => {
    const r = canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }
  }

  // Call at the top of a frame: refresh theme + size, then clear in logical units.
  stage.begin = now => {
    readTheme(now); size()
    ctx.setTransform(stage.scale, 0, 0, stage.scale, 0, 0)
    ctx.clearRect(0, 0, W, H)
  }

  stage.loop = fn => {
    let last = 0
    const frame = now => {
      requestAnimationFrame(frame)
      const dt = Math.min(.033, Math.max(0, (now - last) / 1000)) || .016
      last = now
      fn(dt, now)
    }
    readTheme(0); size()
    requestAnimationFrame(frame)
    // Dev only: step the loop by hand, for testing in a background tab where rAF doesn't fire.
    let virtual = 0
    if (import.meta.env.DEV) window.__tick = (frames = 1) => {
      virtual = Math.max(virtual, performance.now())
      for (let i = 0; i < frames; i++) { virtual += 1000 / 60; fn(1 / 60, virtual) }
    }
  }

  return stage
}

// Pointer with clamped per-move velocity and a smoothed follower (hx, hy) for the hole it pushes into text.
export function createPointer(stage) {
  const p = { x: -999, y: -999, vx: 0, vy: 0, on: false, hx: -999, hy: -999, locked: false }
  stage.canvas.addEventListener('pointermove', e => {
    const q = stage.toLogical(e)
    p.vx = Math.max(-30, Math.min(30, q.x - p.x)); p.vy = Math.max(-30, Math.min(30, q.y - p.y))
    if (!p.on) { p.hx = q.x; p.hy = q.y }
    p.x = q.x; p.y = q.y; p.on = true
  })
  stage.canvas.addEventListener('pointerleave', () => { if (!p.locked) p.on = false })
  p.place = q => { p.x = p.hx = q.x; p.y = p.hy = q.y; p.vx = p.vy = 0; p.on = true }
  p.smooth = () => { p.hx += (p.x - p.hx) * .4; p.hy += (p.y - p.hy) * .4 }
  p.decay = () => { p.vx *= .8; p.vy *= .8 }
  return p
}
