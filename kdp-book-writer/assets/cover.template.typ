// ==========================================================
// KDP A5 COVER TEMPLATE (text-only, full bleed)
// A5 trim 148x210mm, bleed 3.175mm on every side.
// Full cover page = (2*148 + spine + 2*3.175) x (210 + 2*3.175) mm
// Edit the COVER block below, then:
//   typst compile cover.typ cover.pdf
//   python ../scripts/cover_png.py cover.pdf cover.png 300
// Confirm the spine width with KDP's own cover calculator before
// submitting, and re-render if it differs.
// ==========================================================

// ---------- COVER (edit these) ----------
#let cv-title = "Your Book Title"
#let cv-subtitle = "A subtitle that sells"
#let cv-author = "Your Pen Name"
#let cv-brand-tag = none       // e.g. "A Pen Name Series" - small line at top, or none
#let cv-spine-mm = 6.0         // spine width in mm; estimate - VERIFY with KDP cover calculator
#let cv-back-blurb = [
  A short, persuasive description of the book for the back cover — a hook, who
  it is for, and the promise of what the reader gains. Two to four sentences.
]
#let cv-brand = "maritime"     // design token: palette select below
// -------------------------------------------

// ---------- GEOMETRY (do not edit) ----------
#let trim-w = 148.0mm
#let trim-h = 210.0mm
#let bleed = 3.175mm
#let spine = cv-spine-mm * 1mm
#let page-w = trim-w * 2 + spine + bleed * 2
#let page-h = trim-h + bleed * 2
#let x-back  = bleed
#let x-spine = bleed + trim-w
#let x-front = bleed + trim-w + spine

// Spine text only when wide enough for readable vertical text.
#let show-spine-text = spine >= 7.0mm

// ---------- BRAND PALETTES (choose via cv-brand) ----------
// Simple, high-contrast, readable at thumbnail size. Reuse ONE brand across
// the author's books so the catalogue looks consistent.
#let brands = (
  maritime: (bg: rgb("#102A43"), fg: rgb("#F0F4F8"), accent: rgb("#D9A441")),
  forest:   (bg: rgb("#1C3A2A"), fg: rgb("#F4FBF5"), accent: rgb("#C9A227")),
  noir:     (bg: rgb("#17181C"), fg: rgb("#F5F5F4"), accent: rgb("#C9A227")),
  ivory:    (bg: rgb("#35343A"), fg: rgb("#F7F5F0"), accent: rgb("#B08D57")),
  terracotta:(bg: rgb("#5A2E2B"), fg: rgb("#FBF4EC"), accent: rgb("#E8C37E")),
)
#let palette = brands.at(cv-brand, default: brands.maritime)
#let bg = palette.bg
#let fg = palette.fg
#let accent = palette.accent

// Practical text inset so nothing is cut during trim (>= ~11mm from edges).
#let inset = 12mm

// ---------- PAGE ----------
#set page(width: page-w, height: page-h, margin: 0pt)
#set text(font: ("Garamond", "Georgia", "Palatino Linotype", "Bookman Old Style", "Times New Roman"), fill: fg)

// Full-bleed background so there is no white border after trimming.
#place(dx: 0mm, dy: 0mm, box(width: 100%, height: 100%, fill: bg))

// ==========================================================
// BACK PANEL
// ==========================================================
#place(dx: x-back + inset, dy: trim-h / 2 - 30mm, box(
  width: trim-w - 2 * inset, height: 60mm,
)[
  #align(center + horizon)[
    #set text(size: 10pt)
    #set par(leading: 15pt)
    #cv-back-blurb
  ]
])
#place(dx: x-back + inset, dy: trim-h - 45mm, box(width: trim-w - 2 * inset)[
  #align(center)[
    #set text(size: 12pt, weight: "bold", fill: accent, tracking: 0.4pt)
    #cv-author
  ]
])

// ==========================================================
// SPINE
// ==========================================================
// Vertical band: a rotated text box fills it top-to-bottom.
#if show-spine-text [
  #place(
    dx: (x-back + x-front) / 2 - (page-h - 2 * bleed) / 2,
    dy: page-h / 2 - (spine - 3mm) / 2,
    rotate(90deg,
      box(
        width: page-h - 2 * bleed,
        height: spine - 3mm,
        align(center + horizon)[
          #set text(size: if spine >= 10mm { 10pt } else { 8.5pt }, tracking: 0.5pt)
          #cv-title
          #if cv-subtitle != none [#h(4mm) #text(fill: accent)[•] #h(4mm)]
          #cv-author
        ],
      ),
    ),
  )
]

// ==========================================================
// FRONT PANEL
// ==========================================================
// Vertical rhythm (measured from the top of the page, bleed included):
//   brand tag ~ 18mm | title center ~ 30% down | subtitle ~ +34mm | author ~ 55mm up.
#let front-title-dy = page-h * 0.30
#let front-subtitle-dy = front-title-dy + 34mm

#if cv-brand-tag != none [
  #place(dx: x-front, dy: bleed + 18mm, box(width: trim-w)[
    #align(center)[#set text(size: 10pt, tracking: 1.5pt, fill: accent)
    #cv-brand-tag]
  ])
]

#place(dx: x-front, dy: front-title-dy, box(width: trim-w)[
  #align(center + horizon)[
    #text(size: 26pt, weight: "bold", tracking: 0.2pt)[#cv-title]
  ]
])

#if cv-subtitle != none [
  #place(dx: x-front + inset, dy: front-subtitle-dy, box(width: trim-w - 2 * inset)[
    #align(center)[
      #set text(size: 12.5pt, fill: accent)
      #set par(leading: 17pt)
      #cv-subtitle
    ]
  ])
]

#place(dx: x-front, dy: page-h - bleed - 52mm, box(width: trim-w)[
  #align(center)[#set text(size: 14pt, weight: "bold", tracking: 1pt)
  #cv-author]
])