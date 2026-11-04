// Lewis Carroll, "The Mouse's Tale", Alice's Adventures in Wonderland ch. III (1865). Public domain.
export const LINES = [
  'Fury said to a mouse,',
  'That he met in the house,',
  '“Let us both go to law:',
  'I will prosecute you.—',
  'Come, I’ll take no denial;',
  'We must have the trial;',
  'For really this morning',
  'I’ve nothing to do.”',
  'Said the mouse to the cur,',
  '“Such a trial, dear sir,',
  'With no jury or judge,',
  'would be wasting our breath.”',
  '“I’ll be judge, I’ll be jury,”',
  'Said cunning old Fury:',
  '“I’ll try the whole cause,',
  'and condemn you to death.”',
]

export const FLOW = LINES.join(' ').replace('.— ', '.—')

// Who says what. Joined in order they rebuild FLOW.
export const SPEAKERS = [
  { who: 'narrator', text: 'Fury said to a mouse, That he met in the house,' },
  { who: 'fury', text: '“Let us both go to law: I will prosecute you.—Come, I’ll take no denial; We must have the trial; For really this morning I’ve nothing to do.”' },
  { who: 'narrator', text: 'Said the mouse to the cur,' },
  { who: 'mouse', text: '“Such a trial, dear sir, With no jury or judge, would be wasting our breath.”' },
  { who: 'fury', text: '“I’ll be judge, I’ll be jury,”' },
  { who: 'narrator', text: 'Said cunning old Fury:' },
  { who: 'fury', text: '“I’ll try the whole cause, and condemn you to death.”' },
]

export const textOf = who => SPEAKERS.filter(s => s.who === who).map(s => s.text).join(' ')

// Char offset (in Array.from(FLOW) units) where each of LINES starts.
export const LINE_STARTS = (() => {
  const out = []
  let from = 0
  for (const line of LINES) {
    const at = FLOW.indexOf(line, from)
    out.push(Array.from(FLOW.slice(0, at)).length)
    from = at + line.length
  }
  return out
})()

export const FAMILY = '"Libre Caslon Text","Songti SC","Noto Serif SC",Georgia,serif'
export const fontOf = (size, weight = 400) => `${weight} ${size}px ${FAMILY}`
