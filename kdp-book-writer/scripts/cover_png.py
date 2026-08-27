#!/usr/bin/env python3
"""Render a Typst-produced cover PDF to a 300 DPI PNG (or JPG) for KDP upload.

Usage:
    python cover_png.py <cover.pdf> <output.png> [dpi]
    python cover_png.py <cover.pdf> <output.jpg> [dpi]

Defaults to 300 DPI. Prints the final cover size in inches and pixels so the
author can cross-check it against KDP's calculator.

Requires PyMuPDF:  pip install pymupdf
For JPG output, also requires Pillow:  pip install pillow
"""

import pathlib
import sys

import fitz  # PyMuPDF


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    src = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 300

    if not src.exists():
        print(f"ERROR: {src} does not exist")
        sys.exit(1)

    doc = fitz.open(src)
    if doc.page_count != 1:
        print(f"WARNING: expected a 1-page cover, found {doc.page_count} pages")
    page = doc[0]

    zoom = dpi / 72.0
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)

    if out.suffix.lower() in {".jpg", ".jpeg"}:
        try:
            pix.pil_save(out, format="JPEG", quality=95)
        except (ImportError, ModuleNotFoundError) as exc:
            print("ERROR: JPG output requires Pillow; install it with: pip install pillow")
            raise SystemExit(1) from exc
    else:
        pix.save(out)

    w_in = pix.width / dpi
    h_in = pix.height / dpi
    print(f"Rendered: {out}")
    print(f"  pixels        : {pix.width} x {pix.height}")
    print(f"  physical size : {w_in:.3f} in x {h_in:.3f} in  ({w_in * 25.4:.2f} mm x {h_in * 25.4:.2f} mm)")
    print(f"  DPI           : {dpi}")
    print("  NOTE: verify these dimensions against KDP's cover calculator "
          "(cover width should be 2x trim + spine + 2x0.125\", height trim + 2x0.125\").")


if __name__ == "__main__":
    main()