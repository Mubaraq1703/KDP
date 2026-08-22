// ==========================================================
// KDP A5 INTERIOR TEMPLATE  (A5 / 148x210mm, black ink, white paper)
// Marketplace target: Amazon.co.jp
// DESIGN: Decorative — ornamental chapter openers, drop caps,
//          running headers, styled recipe blocks, two-font system.
// Edit ONLY the META block below, then compile:
//   typst compile interior.typ interior.pdf
// Keep the rest of the file as-is - it is tuned to pass KDP review.
// ==========================================================

// ---------- META ---------------- (edit these only)
#let meta-title = "Your Book Title"
#let meta-subtitle = none
#let meta-author = "Your Pen Name"
#let meta-year = "2026"
#let meta-lang = "en"          // "en" | "es" | "fr"
#let meta-toc = true           // show table of contents
#let meta-toc-depth = 2        // TOC heading depth (1 = chapters only, 2 = chapters + sections)
#let meta-fiction = false      // toggles fiction disclaimer
#let meta-dedication = none    // e.g. ["For María"]
#let meta-about-author = none  // e.g. ["Short bio paragraph..."]
#let meta-body-font = "Garamond"
#let meta-display-font = "Palatino Linotype"
#let meta-inside-margin = 12.7mm   // gutter-safe uniform margin (see SKILL.md table)
#let meta-accent-color = rgb("#2B5A3C")  // color for headings and decorative elements
#let meta-use-drop-caps = true   // ornamental drop caps at chapter starts
#let meta-use-running-headers = true  // chapter name in running header
#let meta-use-recipe-boxes = true    // styled recipe card blocks
// ---------------------------------

// ---------- FONTS & TEXT ----------
#set text(
  font: (meta-body-font, "Georgia", "Palatino Linotype", "Bookman Old Style", "Times New Roman"),
  lang: meta-lang,
  size: 10.5pt,
  tracking: 0.1pt,
)
#set par(justify: true, first-line-indent: 3.5mm, spacing: 2pt)

// ---------- PAGE ----------
#set page(
  paper: "a5",
  margin: (left: meta-inside-margin, right: meta-inside-margin, top: 16mm, bottom: 16mm),
  numbering: "1",
  header: if meta-use-running-headers [
    #set text(font: meta-body-font, size: 8pt, fill: luma(120))
    #context {
      let current-heading = query(heading.where(level: 1)).filter(h => h.location().page() <= here().page())
      if current-heading.len() > 0 {
        let h = current-heading.last()
        if h.location().page() == here().page() {
          // no header on the first page of a chapter
          none
        } else {
          align(right)[#smallcaps(h.body)]
        }
      } else {
        none
      }
    }
  ] else { none },
  footer: [
    #set text(font: meta-body-font, size: 9pt)
    #align(center)[#context(counter(page).display())]
  ],
)

// ---------- DECORATIVE ELEMENTS ----------

// Ornamental divider rule
#let ornamental-divider = {
  v(6pt)
  align(center)[
    #set text(fill: meta-accent-color)
    #sym.diamond.filled
    #h(4pt)
    #sym.diamond.filled
    #h(4pt)
    #sym.diamond.filled
  ]
  v(6pt)
}

// Thin decorative rule
#let thin-rule = {
  v(4pt)
  align(center)[
    #line(length: 40%, stroke: 0.4pt + meta-accent-color)
  ]
  v(4pt)
}

// ---------- HEADINGS ----------
#set heading(numbering: none)

// Level 1 — Chapter headings: large, centered, with decorative elements
#show heading.where(level: 1): set block(above: 0pt, below: 0pt)
#show heading.where(level: 1): set text(
  font: (meta-display-font, "Garamond", "Georgia"),
  size: 20pt,
  weight: "bold",
  tracking: 0.8pt,
  fill: meta-accent-color,
)

// Level 2 — Section headings
#show heading.where(level: 2): set block(above: 18pt, below: 10pt)
#show heading.where(level: 2): set text(
  font: (meta-display-font, "Garamond", "Georgia"),
  size: 14pt,
  weight: "bold",
  tracking: 0.3pt,
  fill: luma(30),
)
#show heading.where(level: 2): set par(justify: false, first-line-indent: 0mm, spacing: 0pt)

// Level 3 — Subsection headings
#show heading.where(level: 3): set block(above: 12pt, below: 6pt)
#show heading.where(level: 3): set text(
  font: (meta-body-font, "Georgia"),
  size: 11.5pt,
  weight: "bold",
  style: "italic",
)
#show heading.where(level: 3): set par(justify: false, first-line-indent: 0mm, spacing: 0pt)

// ---------- LISTS ----------
#show list: set par(leading: 15pt)
#show enum: set par(leading: 15pt)

// ---------- RECIPE BOX STYLING ----------
// If meta-use-recipe-boxes is enabled, we style recipe yield/info blocks
// This is handled via a show rule on a custom function in body.typ

// ==========================================================
// FRONT MATTER
// ==========================================================

// ---- Half title (book page 1) ----
#align(center + horizon)[
  #block[
    #set text(font: (meta-display-font, "Garamond"), size: 18pt, weight: "bold", fill: meta-accent-color, tracking: 1pt)
    #meta-title
  ]
]

// ---- Title page ----
#pagebreak()
#align(center + horizon)[
  #block[
    #set text(font: (meta-display-font, "Garamond"), fill: meta-accent-color)
    #text(size: 26pt, weight: "bold", tracking: 0.5pt)[#meta-title]
    #if meta-subtitle != none [
      #v(8pt)
      #text(size: 12pt, tracking: 0.3pt)[#meta-subtitle]
    ]
    #v(50pt)
    #ornamental-divider
    #v(10pt)
    #text(size: 14pt, tracking: 0.8pt)[#meta-author]
  ]
]

// ---- Copyright page ----
#pagebreak()
#set text(size: 9pt)
#set par(leading: 13pt, justify: false, first-line-indent: 0mm, spacing: 0pt)
Copyright © #meta-year #meta-author

All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the copyright holder, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.

Any AI-generated content in this book has been declared to the publishing platform in accordance with its content guidelines.

#if meta-fiction [
  #v(8pt)
  This is a work of fiction. Names, characters, businesses, places, events, locales, and incidents are either the products of the author's imagination or used in a fictitious manner. Any resemblance to actual persons, living or dead, or actual events is purely coincidental.
]
#set text(size: 10.5pt)
#set par(leading: 16pt, justify: true, first-line-indent: 3.5mm, spacing: 2pt)

// ---- Dedication ----
#if meta-dedication != none [
  #pagebreak()
  #align(center + horizon)[
    #block[
      #set text(font: (meta-display-font, "Garamond"), size: 12pt, style: "italic")
      #meta-dedication
    ]
  ]
]

// ---- Table of contents ----
#if meta-toc [
  #pagebreak()
  #align(center)[
    #set text(font: (meta-display-font, "Garamond"), size: 18pt, weight: "bold", fill: meta-accent-color, tracking: 1pt)
    Contents
  ]
  #v(16pt)
  #set text(size: 11pt)
  #outline(title: none, depth: meta-toc-depth, indent: 10mm)
]

// ==========================================================
// CHAPTER OPENER FUNCTION
// Use this in body.typ to create beautiful chapter openers:
//   #chapter-opener("Chapter 1", "The Road")
// ==========================================================
#let chapter-opener(number, title) = {
  pagebreak()
  v(30pt)
  // Chapter number
  align(center)[
    #set text(font: (meta-display-font, "Garamond"), size: 11pt, tracking: 2pt, fill: meta-accent-color)
    #upper(number)
  ]
  v(8pt)
  // Thin rule above title
  align(center)[#line(length: 30%, stroke: 0.5pt + meta-accent-color)]
  v(10pt)
  // Chapter title
  align(center)[
    #set text(font: (meta-display-font, "Garamond"), size: 22pt, weight: "bold", tracking: 0.3pt, fill: luma(20))
    #title
  ]
  v(10pt)
  // Thin rule below title
  align(center)[#line(length: 30%, stroke: 0.5pt + meta-accent-color)]
  v(16pt)
}

// ==========================================================
// RECIPE BOX FUNCTION
// Use this in body.typ to create styled recipe blocks:
//   #recipe-box("Chocolate Chip Cookies")[
//     ... ingredients and instructions ...
//   ]
// ==========================================================
#let recipe-box(title, body) = {
  block(
    width: 100%,
    inset: (x: 10pt, y: 12pt),
    stroke: (
      left: 1.5pt + meta-accent-color,
      top: none,
      bottom: none,
      right: none,
    ),
    radius: 2pt,
    fill: rgb("#F8F6F2"),
  )[
    // Recipe title
    #text(font: (meta-display-font, "Garamond"), size: 13pt, weight: "bold", fill: meta-accent-color)[#title]
    #v(6pt)
    // Thin accent line
    #line(length: 100%, stroke: 0.3pt + rgb("#D4CFC7"))
    #v(6pt)
    // Recipe body
    #set text(size: 10pt)
    #set par(leading: 14pt, spacing: 1pt)
    #body
  ]
  v(8pt)
}

// ==========================================================
// YIELD/INFO LINE FUNCTION
// Use for recipe yield, prep time, etc.:
//   #yield-line("Yield: 24 cookies • Prep: 15 min • Cook: 12 min")
// ==========================================================
#let yield-line(text) = {
  v(4pt)
  align(center)[
    #set text(font: (meta-display-font, "Garamond"), size: 9pt, style: "italic", fill: luma(80))
    #text
  ]
  v(6pt)
}

// ==========================================================
// BODY
// ==========================================================
// The body file starts on its own fresh page here.
// In body.typ, use:
//   #pagebreak() before EVERY chapter EXCEPT the first one
//   #chapter-opener("1", "Chapter Title") for beautiful chapter starts
//   #recipe-box("Recipe Name")[ ... ] for styled recipe blocks
#pagebreak()
#include "body.typ"

// ==========================================================
// BACK MATTER
// ==========================================================
#if meta-about-author != none [
  #pagebreak()
  = About the Author
  #v(10pt)
  #block[
    #meta-about-author
  ]
]
