// ==========================================================
// BODY TEMPLATE - Typst
// This file is imported by interior.typ and must export render-body.
// The interior template passes its layout helpers into that function.
// ==========================================================

#let render-body(chapter-opener, recipe-box, yield-line, ornamental-divider, thin-rule) = [
  #chapter-opener("1", "Chapter Title")

  The first paragraph of your chapter starts normally. Drop caps are not used.
  This is where you introduce the chapter's theme, set the tone, and draw the
  reader in.

  Subsequent paragraphs are indented and justified automatically by the
  interior template. No special markup is needed for body text.

  == Section Heading

  Level-2 headings appear in the table of contents and in running headers.

  #recipe-box("Recipe Name")[
    *Ingredients:*
    - 1 cup all-purpose flour
    - 1/2 cup sugar
    - 2 large eggs
    - 1 teaspoon vanilla extract

    *Instructions:*
    1. Preheat the oven to 350°F (175°C).
    2. Combine the dry ingredients.
    3. Whisk the wet ingredients separately.
    4. Fold the wet ingredients into the dry ingredients.
  ]

  #yield-line("Yield: 12 servings - Prep: 15 minutes - Cook: 30 minutes")

  #thin-rule

  More paragraph text after the recipe. The recipe box provides a visual
  break and makes it easy to find individual recipes when flipping through
  the book.

  #chapter-opener("2", "Next Chapter")

  Beginning another chapter with the ornamental chapter opener creates a
  consistent rhythm throughout the book.
]
