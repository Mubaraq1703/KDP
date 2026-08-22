#!/usr/bin/env python3
"""QA check a KDP interior PDF before upload.

Usage:
    python qa_pdf.py <interior.pdf> [trim_w_mm] [trim_h_mm]

Defaults to A5 (148 x 210 mm). Verifies:
  - page size matches the trim size on every page
  - page count within KDP paperback bounds (24-828 for A5 black ink)
  - fonts are embedded (KDP requirement)
  - no excessive blank-page runs
Checks that matter for KDP acceptance. Exits 0 if OK, 1 if problems found.

Requires PyMuPDF:  pip install pymupdf
"""

import pathlib
import sys

import fitz  # PyMuPDF

MIN_PAGES = 24
MAX_PAGES = 828
BLANK_GRAY_THRESHOLD = 0.995  # fraction of near-white pixels to call a page blank


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    path = pathlib.Path(sys.argv[1])
    trim_w_mm = float(sys.argv[2]) if len(sys.argv) > 2 else 148.0
    trim_h_mm = float(sys.argv[3]) if len(sys.argv) > 3 else 210.0
    tol_pt = 2.0  # tolerance in points

    if not path.exists():
        print(f"FAIL: {path} not found")
        sys.exit(1)

    doc = fitz.open(path)
    problems: list[str] = []
    warnings: list[str] = []

    # --- page count ---
    n = doc.page_count
    print(f"Page count   : {n}")
    if n < MIN_PAGES:
        problems.append(f"Book too short for A5 paperback: {n} pages (minimum {MIN_PAGES})")
    if n > MAX_PAGES:
        problems.append(f"Book too long for A5 paperback: {n} pages (maximum {MAX_PAGES})")

    # --- page size ---
    target_w = trim_w_mm * 72 / 25.4
    target_h = trim_h_mm * 72 / 25.4
    bad_size = 0
    for i, page in enumerate(doc):
        pw, ph = page.rect.width, page.rect.height
        if abs(pw - target_w) > tol_pt or abs(ph - target_h) > tol_pt:
            bad_size += 1
            if bad_size <= 5:
                problems.append(
                    f"Page {i+1} is {pw/72*25.4:.1f}x{ph/72*25.4:.1f} mm — expected "
                    f"{trim_w_mm}x{trim_h_mm} mm"
                )
    if bad_size:
        print(f"Wrong-size pages: {bad_size}")
    else:
        print(f"Page size     : OK ({trim_w_mm}x{trim_h_mm} mm on all {n} pages)")

    # --- font embedding ---
    missing_fonts = set()
    fonts_seen = set()
    for page in doc:
        for f in page.get_fonts(full=True):
            fname = f[3]
            embedded = f[1] != "n/a"  # ext is e.g. "ttf"/"otf"/"fntfile" when embedded
            fonts_seen.add((fname, embedded))
            if not embedded:
                missing_fonts.add(fname)
    if missing_fonts:
        problems.append(f"Fonts NOT embedded: {sorted(missing_fonts)}")
    else:
        embedded_list = sorted({name for name, emb in fonts_seen if emb})
        print(f"Fonts         : OK ({len(embedded_list)} embedded: {', '.join(embedded_list[:6])})")

    # --- blank runs ---
    blank_pages = set()
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5), colorspace=fitz.csGRAY)
        samples = pix.samples
        white = sum(1 for b in samples if b > 245)
        if white / len(samples) > BLANK_GRAY_THRESHOLD:
            blank_pages.add(i + 1)
    if blank_pages:
        runs = _consecutive_runs(sorted(blank_pages))
        for start, end in runs:
            length = end - start + 1
            if start <= 1 or end <= 1:
                pass  # blank page 1 is fine
            if length > 4 and not (start <= 1):
                problems.append(f"Blank pages {start}-{end} ({length}) exceed KDP's 4-blank run limit")
            else:
                warnings.append(f"Blank page(s) {start}-{end} ({length})")
    else:
        print("Blank pages   : none")

    # --- summary ---
    print()
    if problems:
        print("RESULT: FAIL — fix before uploading")
        for p in problems:
            print(f"  [FAIL] {p}")
        sys.exit(1)
    if warnings:
        print("RESULT: PASS (with warnings)")
        for w in warnings:
            print(f"  [WARN] {w}")
    else:
        print("RESULT: PASS")
    print("  Ready for KDP upload.")


def _consecutive_runs(numbers: list[int]) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    if not numbers:
        return runs
    start = prev = numbers[0]
    for x in numbers[1:]:
        if x == prev + 1:
            prev = x
        else:
            runs.append((start, prev))
            start = prev = x
    runs.append((start, prev))
    return runs


if __name__ == "__main__":
    main()