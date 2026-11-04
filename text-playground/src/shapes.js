// Silhouettes, all facing left. bw/bh: the box they occupy at k = 1. holes: [x, y, r] cut out (eyes, cheese holes).
export function scaled(src, k, dx, dy) {
  const p = new Path2D()
  p.addPath(new Path2D(src), new DOMMatrix([k, 0, 0, k, dx * k, dy * k]))
  return p
}

// Mouse in profile on a 600×420 sheet (mouse-tale's plates use it raw).
export const MOUSE_SRC = 'M28 292C40 262 82 236 128 214C100 160 128 92 180 88C236 86 262 140 236 196C300 160 420 120 500 170C570 215 590 320 520 372C450 405 300 400 220 380C160 366 80 340 28 292Z'
export const MOUSE_SRC_EYE = [96, 268, 8]

export const MOUSE = {
  path: scaled(MOUSE_SRC, .8, -28, -86),
  bw: 450, bh: 255, holes: [[54, 146, 7]], tail: { ax: 438, ay: 176 }, nose: { x: 0, y: 165 },
}

export const CHEESE = {
  path: scaled('M4 168L334 22Q384 6 392 52L392 190Q392 217 362 217L34 217Q4 217 4 190Z', 1.15, 0, 0),
  bw: 451, bh: 250,
  holes: [[301, 97, 25], [366, 177, 32], [173, 189, 21], [244, 140, 14], [110, 223, 12], [403, 87, 13]],
  tail: null,
}

// A terrier built from parts so it can move: legs swing about the hips, the tail wags, the torso bobs.
// Legs and tail are wide enough to hold a short word each.
const DOG_TORSO = new Path2D('M4 102C20 88 48 82 66 76C78 56 100 44 124 48C146 52 156 70 164 84C220 96 320 88 420 92C470 94 494 130 490 176C488 206 476 228 456 238C380 248 260 248 178 238C146 230 124 206 114 178C100 160 78 150 52 146C30 142 10 134 4 122Z')
const DOG_EAR = new Path2D('M100 60L118 0L160 66Z')
const DOG_LEG = [[-24, -12], [24, -12], [22, 104], [14, 120], [-40, 120], [-40, 106], [-22, 100]]
const DOG_TAIL = [[-17, 8], [17, 8], [12, -60], [3, -108], [-8, -104], [-12, -60]]
// Near and far leg of each pair swing in opposite phase. [x, y, phase, far]
const DOG_HIPS = [[172, 212, 0, false], [214, 206, Math.PI, true], [394, 206, Math.PI, true], [438, 212, 0, false]]
const DEG = 180 / Math.PI

function polygon(points, m) {
  const p = new Path2D()
  points.forEach(([x, y], i) => { const q = m.transformPoint({ x, y }); i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y) })
  p.closePath()
  return p
}

// step: gait phase. swing: leg swing in radians. tail: tail angle in radians, 0 straight up. lift: torso offset in px.
// limbs: where each leg and the tail start and which way they point, for setting words along them.
export function dogPose({ step = 0, swing = 0, tail = .6, lift = 0 } = {}) {
  const up = new DOMMatrix().translate(0, lift)
  const torso = new Path2D(); torso.addPath(DOG_TORSO, up)
  const ear = new Path2D(); ear.addPath(DOG_EAR, up)
  const limbs = DOG_HIPS.map(([x, y, phase, far]) => ({ kind: 'leg', far, x, y: y + lift * .5, angle: swing * Math.sin(step + phase) }))
  const legs = limbs.map(l => polygon(DOG_LEG, new DOMMatrix().translate(l.x, l.y).rotate(l.angle * DEG)))
  const wag = { kind: 'tail', x: 474, y: 114 + lift, angle: tail }
  limbs.push(wag)
  return {
    parts: [torso, ear, polygon(DOG_TAIL, new DOMMatrix().translate(wag.x, wag.y).rotate(tail * DEG)), ...legs],
    torsoParts: [torso, ear], limbs,
    bw: 500, bh: 336, holes: [[88, 92 + lift, 7]], tail: null, nose: { x: 4, y: 112 + lift },
  }
}

export const DOG = dogPose()
