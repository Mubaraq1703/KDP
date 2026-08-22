# 📚 KDP Publishing & Research Suite

A complete, end-to-end toolkit for Kindle Direct Publishing (KDP) authors, publishers, and niche researchers. This repository combines real-time Amazon market research tools with an automated book writing, typesetting, quality-assurance, and listing generation pipeline.

---

## 📂 Repository Structure

```
KDP/
├── 🛍️ amazon extension antigravity/   # "Hemdrix KDP Wizard" Manifest V3 browser extension
│   ├── manifest.json                  # Extension manifest (MV3)
│   ├── background.js                  # Background service worker
│   ├── content/                       # Content scripts & UI stylesheets
│   │   ├── content.js                 # Extraction engine, badge injector, CSV exporter
│   │   └── content.css                # Floating panel and inline badge styles
│   ├── popup/                         # Extension popup interface & settings
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── mock_*.html                    # Local Amazon mock pages for rapid testing
│   └── logo.png                       # Extension icon assets
│
└── ✍️ kdp-book-writer/                 # Automated KDP Book Authoring & Typesetting System
    ├── SKILL.md                       # Comprehensive workflow specification & prompts
    ├── assets/                        # Typesetting templates & references
    │   ├── interior.template.typ      # Typst interior template (A5 standard)
    │   ├── interior.template.tex      # LaTeX interior template (Memoir class)
    │   ├── cover.template.typ         # Full wrap-around cover template (with bleed & spine calculation)
    │   ├── body.template.tex          # LaTeX body chapter structure
    │   └── a5-reference.docx          # Pandoc reference docx for editable manuscript route
    ├── references/
    │   └── kdp-spec.md                # KDP print specifications, margin formulas, bleed rules
    └── scripts/
        ├── qa_pdf.py                  # Automated PDF inspection (page size, bleed, fonts, blank pages)
        └── cover_png.py               # 300 DPI cover image generator & renderer
```

---

## ⚡ 1. Hemdrix KDP Wizard (Amazon Extension)

**Hemdrix KDP Wizard** is a Chrome / Chromium (Edge, Brave, Opera) extension built with Manifest V3 that accelerates niche research directly on Amazon search and product pages.

### 🌟 Key Features

- **🔍 Search Page Inline Badges**: Automatically extracts and injects ASIN, Best Sellers Rank (BSR), category rankings, ratings, and total review counts under every search result.
- **📊 Real-Time Product Inspector**: Floating, collapsible analytics card on product detail pages showing:
  - ASIN & Marketplace
  - Primary & Sub-category BSR
  - Estimated Monthly Sales & Revenue
  - Review Velocity & Average Rating
  - Price & Format Breakdown
- **📥 1-Click CSV Export**: Bulk-extract all scraped search results into a clean, sorted CSV file formatted for niche and competitor analysis.
- **🌍 Multi-Marketplace Support**:
  - `amazon.com` (US)
  - `amazon.co.uk` (UK)
  - `amazon.ca` (Canada)
  - `amazon.de` (Germany)
  - `amazon.fr` (France)
  - `amazon.it` (Italy)
  - `amazon.es` (Spain)
  - `amazon.co.jp` (Japan)
  - `amazon.in` (India)
  - `amazon.com.au` (Australia)

### 🚀 Installing the Extension

1. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the directory:
   ```
   c:\Users\User\Desktop\KDP\amazon extension antigravity
   ```
5. Pin **Hemdrix KDP Wizard** to your browser toolbar.

---

## 📖 2. KDP Book Writer

**KDP Book Writer** is an authoring and publishing system designed to take a book idea and produce an upload-ready Amazon KDP paperback package compliant with strict KDP print specifications.

### 🛠️ Core Capabilities

| Stage | What It Does | Deliverables |
|---|---|---|
| **1. Intake & Niche Brief** | Captures pen name, title, genre, target length, engine choice, and language. | `plan.md` |
| **2. Rights & Trademark Check** | Pre-publication clearance for titles, quotes, song lyrics, and public domain rules. | `research-report.md` |
| **3. Typesetting & Interior** | Compiles print-ready PDF via **Typst** (default) or **LaTeX** (premium typography), or editable **Word DOCX** via Pandoc. | `<slug>-interior.pdf` / `.docx` |
| **4. Wrap-around Cover** | Computes spine width based on exact page count and generates full wrap cover. | `cover.png` (300 DPI) |
| **5. Automated QA** | Validates trim size, margin compliance, embedded fonts, and page count parity. | `qa-report.txt` |
| **6. Listing Optimization** | Generates SEO-optimized HTML description, 7 search keywords, and KDP categories. | `listing.txt`, `metadata.json` |

### 📐 Standard Specifications (Amazon.co.jp & International)

- **Trim Size**: A5 (148 mm × 210 mm / 5.83" × 8.27")
- **Color Model**: Black & White interior on White paper (80 gsm / 0.002252" per page)
- **Spine Calculation**: `Spine Width = Page Count × 0.0572 mm` (White paper)
- **Bleed**: 3.2 mm (0.125") on outer top, bottom, and outside edges for covers.

### 🧪 QA & Verification Tool

Run the automated PDF inspector before uploading to KDP:

```bash
python kdp-book-writer/scripts/qa_pdf.py <path-to-interior.pdf> --expected-pages <PAGE_COUNT>
```

---

## 🛠️ Development & Testing

### Extension Local Mock Testing
To test the extension offline without triggering Amazon rate limits or bot detection:
1. Open `amazon extension antigravity/mock_amazon_search.html` or `mock_amazon.html` directly in Chrome.
2. The content script automatically detects mock selectors and renders badges and floating inspector widgets.

---

## ⚖️ Guidelines & Disclaimers

- **Amazon KDP AI Disclosure**: Amazon KDP requires publishers to declare AI-generated text or images during the book setup workflow. Ensure compliance when publishing.
- **Trademarks**: Amazon, Kindle, KDP, and the Amazon logo are trademarks of Amazon.com, Inc. or its affiliates. This project is an independent tool for self-publishers.
