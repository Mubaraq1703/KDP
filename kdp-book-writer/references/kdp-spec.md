# KDP Compliance Reference (Amazon.co.jp focus)

This is the distilled set of KDP rules that matter when producing a print book.
Source: KDP Help Center (Content Guidelines G200672390, Set Trim Size/Bleed/Margins GVBQ3CMEQW3W2VL6, Save Your Manuscript File G202145060). When anything is in doubt, prefer the live KDP Help Center over this summary.

## 1. Content rules (KDP Content Guidelines)

- **Original work only.** Do not reproduce text, cover art, or images you don't own. Copyrighted material freely available on the web is not accepted unless provided by the rights owner.
- **No companion books** based on copyrighted works (summaries, study guides, Cliffs-Notes-style products of existing books) — outside the U.S. these need the copyright holder's written permission. This skill's books must be standalone original works.
- **Public domain:** undifferentiated reprints are not accepted when a free version exists on the store. Add real value or don't publish.
- **Offensive content** (hate speech, child sexual exploitation, pornography, glorifying rape/pedophilia/terrorism, etc.) is banned. Avoid anything that would reasonably be judged offensive.
- **Honest metadata:** title, subtitle, description, categories, and keywords must accurately describe the actual content. No clickbait that overpromises.
- **AI disclosure:** when publishing or republishing, KDP requires declaring **AI-generated** content (text, images, or translations created by an AI tool, even if edited afterward). Books from this skill are AI-generated and must be declared. AI-assisted (human-created, AI-edited) does not need disclosure.
- **Translations** of a published work must credit the translator and original author in the contributor field.

## 2. Format configuration for this skill

| Setting | Value |
|---|---|
| Format | Paperback |
| Trim size | A5 = 148 x 210 mm = 5.83" x 8.27" (standard on amazon.co.jp) |
| Ink & paper | Black ink, white paper |
| Page count | 24 – 828 pages (black ink, white paper) |
| Bleed | None for a text-only interior; covers always use full bleed |
| File | PDF (interior), PNG/JPG at 300 DPI (cover) |

A5 page size in points: **419.53 pt wide x 595.28 pt high** (148 x 210 mm).

## 3. Margins (interior)

KDP minimums: top/bottom/outside >= 0.25" (6.4 mm). Inside gutter grows with page count:

| Page count | Min inside gutter | This skill uses (uniform) |
|---|---|---|
| 24 – 150 | 0.375" (9.6 mm) | 12.7 mm (0.5") |
| 151 – 300 | 0.5" (12.7 mm) | 15.9 mm (0.625") |
| 301 – 500 | 0.625" (15.9 mm) | 19.1 mm (0.75") |
| 501 – 700 | 0.75" (19.1 mm) | 22.2 mm (0.875") |
| 701 – 828 | 0.875" (22.3 mm) | 25.4 mm (1.0") |

The right-hand column is the safe uniform margin the template uses for left and right. Set `meta-inside-margin` in `interior.typ` to the uniform value for the final page count (12.7 mm is right for most short books).

## 4. Manuscript file requirements

- **Single pages** only — never reader spreads or 2-up files.
- **No crop marks, trim marks, comments, bookmarks, annotations, or placeholder text.**
- **Fonts fully embedded.** (Typst embeds automatically for the serif fonts this skill picks; `qa_pdf.py` verifies.)
- All images (if any) embedded and **>= 300 DPI**; flatten transparency.
- **Text legible:** minimum 7-point font everywhere (this skill uses 10.5pt body).
- **Reading direction LTR** for English/Spanish/French. All pages same orientation.
- **Page numbers** sequential, **even numbers on left (verso) pages, odd numbers on right (recto)**.
- **Blank pages:** no more than 4 consecutive at the start/middle, 10 at the end.
- File size <= 650 MB; files not locked/encrypted.
- **Lines in charts/tables** (if any) at least 0.75 pt weight.
- Text must not extend past the margins (content can be cut at trim).

> **DOCX route (editable Word manuscript, not the KDP upload):** the print-verified artifact is the PDF; the DOCX is a working copy for editors. If the author insists on uploading Word, page numbers must refresh (Ctrl+A, F9 in Word), the TOC must update, and every rule above (A5, margins, 7pt min, single pages, title/copyright page match) still applies before export. The bundled `assets/a5-reference.docx` keeps A5/12.7 mm/Garamond/footer PAGE field consistent.

## 5. Cover requirements

- The cover is the **whole jacket**: back + spine + front, at full bleed.
- Bleed = 0.125" (3.175 mm) on all four sides. Cover page size:
  - width  = 2 x trim + spine + 2 x bleed
  - height = trim + 2 x bleed
  - for A5 white paper with a 6 mm spine: 308.35 x 216.35 mm.
- Background color/image must extend across the entire page (no white bars after trim).
- **Spine width:** KDP's approximate white-paper thickness is **0.002252" per page** (≈ 0.0572 mm/page). 95 pages ≈ 5.4 mm; 130 pages ≈ 7.4 mm. **Always confirm the exact spine with KDP's cover calculator before submitting**, and re-render the cover if it differs. The bundled cover template suppresses spine text below 7 mm for legibility; follow the current KDP cover calculator and help page for eligibility and placement rules.
- Keep all cover text away from trim edges (this template insets 12 mm) and at least ~0.0625" from spine text edges.

## 6. Title setup / listing metadata

| Field | Limits | Notes |
|---|---|---|
| Title | <= 200 chars | Must match title page & cover exactly |
| Subtitle | — | Often doubles as the keyword hook |
| Description | Plain text ~4000 chars max | Also allow a simple-HTML version (`<p>`, `<b>`, `<br>`) |
| Keywords | 7 max, each <= 50 bytes | In the book's language; don't repeat words already in the title; multiple words OK (e.g. "gardening for beginners") |
| Categories | 2 (up to 3) | Pick realistic leaf categories available on the marketplace |
| Author/contributor | Pen name | Also declare translator+original author for translations |

Metadata errors are a top cause of manual-review rejection: title, author, and edition must match across the interior title page, copyright page, and cover.

**Amazon title guidelines (applies to the paperback listing):**
- Max 200 characters; the exact string entered must equal the title page, copyright page, cover, and file metadata.
- No promotional language ("Sale", "Free", "Best-Seller", "#1", "New Release"), no ALL CAPS spam, no repeated words, no special characters/garbled text.
- No misleading claims: the title must be an honest description of the content (misleading titles are a review/rejection trigger).
- Keyword reality: buyers filter and search by title, and listings truncate around 55–60 chars on apps/mobile, so lead with the primary high-intent search phrase (real phrase, not keyword soup), then catch the remaining useful keywords in the subtitle and carry the overflow into the 7 keywords slot — but never duplicate words already in the title (a duplicate is wasted keyword budget).

## 7. Publishing checklist (hand to the author each time)

- [ ] Declare **AI-generated content** = YES when publishing (required for these books).
- [ ] Confirm spine width with KDP's cover calculator; re-render cover if needed.
- [ ] Interior passes `qa_pdf.py` with no FAIL.
- [ ] Title page, copyright page, and cover text match the book details entered on KDP.
- [ ] Upload interior PDF (A5, B&W white paper) and cover PNG.
- [ ] Set price and publish.