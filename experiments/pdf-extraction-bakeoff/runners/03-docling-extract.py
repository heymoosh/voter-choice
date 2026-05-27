#!/usr/bin/env python3
"""Docling extraction helper for the PDF bakeoff.

Usage:
    python 03-docling-extract.py <pdf_path>

Prints docling's converted markdown to stdout. Errors to stderr; non-zero exit.

Per spec: docling is the upstream extractor; the Node wrapper feeds this output
into the Sonnet post-processor.
"""

from __future__ import annotations

import os
import sys
import time
import traceback

# Force CPU. Docling/PyTorch on Apple Silicon picks MPS by default, but several
# docling models (layout/table) use float64 ops that MPS doesn't support, causing
# "Cannot convert a MPS Tensor to float64 dtype" at conversion time.
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: 03-docling-extract.py <pdf_path>", file=sys.stderr)
        return 2
    pdf_path = sys.argv[1]

    try:
        import torch  # noqa: F401  (loaded so we can pin device to CPU below)
        from docling.datamodel.accelerator_options import (
            AcceleratorDevice,
            AcceleratorOptions,
        )
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.document_converter import DocumentConverter, PdfFormatOption
    except Exception as exc:  # noqa: BLE001
        print(f"failed to import docling: {exc}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return 3

    start = time.time()
    try:
        accel = AcceleratorOptions(device=AcceleratorDevice.CPU)
        pipe_opts = PdfPipelineOptions()
        pipe_opts.accelerator_options = accel
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipe_opts),
            }
        )
        result = converter.convert(pdf_path)
    except Exception as exc:  # noqa: BLE001
        print(f"docling conversion failed: {exc}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return 4

    elapsed_ms = int((time.time() - start) * 1000)
    # Emit elapsed ms to stderr so Node side can capture docling-only latency.
    print(f"DOCLING_ELAPSED_MS={elapsed_ms}", file=sys.stderr)

    # Markdown is the most ballot-friendly format docling exports (preserves
    # headings, tables, lists). Per-page boundaries are visible as page breaks
    # but docling concatenates by default — that's fine for the post-processor.
    md = result.document.export_to_markdown()
    sys.stdout.write(md)
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
