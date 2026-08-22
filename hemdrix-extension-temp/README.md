# 🧙 Hemdrix KDP Wizard

**Hemdrix KDP Wizard** is a Chrome / Chromium extension (Manifest V3) engineered for Kindle Direct Publishing (KDP) authors, publishers, and niche researchers. It extracts real-time product metrics directly on Amazon marketplaces, displays sleek inline badges, provides an interactive floating inspection panel, and enables 1-click CSV data export.

---

## ✨ Features

- **Search Page Badges**: Injects key metrics under every Amazon search result card:
  - ASIN
  - Best Sellers Rank (BSR)
  - Rating & Review Count
  - Estimated Monthly Sales
- **Product Page Inspector**: Floating HUD on product detail pages with comprehensive niche diagnostics:
  - Primary and sub-category rankings
  - Estimated royalties and monthly revenue
  - Direct ASIN copy button
- **1-Click CSV Export**: Download all scraped search results into a clean, formatted spreadsheet for offline analysis.
- **Collapsible UI & Custom Preferences**: Settings preserved via `chrome.storage.local`.
- **Multi-Marketplace Support**: Works across US, UK, Canada, Germany, France, Italy, Spain, Japan, India, and Australia.

---

## 📥 Installation

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top right switch).
3. Click **Load unpacked**.
4. Select this directory (`amazon extension antigravity`).
5. The **Hemdrix KDP Wizard** icon will appear in your browser toolbar.

---

## 📁 File Structure

- `manifest.json`: Manifest V3 configuration, permissions, content script declarations.
- `background.js`: Service worker handling extension lifecycle.
- `content/`:
  - `content.js`: Main DOM scraping engine, badge injector, floating widget, and CSV export.
  - `content.css`: Modern styling for badges and the floating inspection panel.
- `popup/`:
  - `popup.html`, `popup.css`, `popup.js`: Extension popup UI and user preferences.
- `mock_*.html`: Local mock pages for offline testing and development.
