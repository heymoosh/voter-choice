/**
 * PDF text extraction utilities — extracted from ResearchLayout's legacy
 * `UserSampleBallotInput` so the new redesign's `BallotLookupNeeded`
 * widget can share the same flow (live bug 2). Lazy-imports `pdfjs-dist`
 * and `tesseract.js` so neither lands in the initial JS bundle.
 *
 * Flow: pdfjs `getTextContent()` first; if the document yields fewer than
 * PDF_SCANNED_MIN_CHARS characters across all pages, fall back to OCR
 * (tesseract) so image-only / scanned official ballots still work.
 *
 * Errors thrown:
 *   - `PDF_LOAD_ERROR` — pdfjs-dist itself failed to load (CDN worker
 *     issue, network error). Callers should treat this as a transient
 *     failure and ask the user to retry or paste text.
 *   - `OCR_FAILED` — every page failed OCR. Callers should fall back to
 *     paste-only.
 */

export const PDF_SCANNED_MIN_CHARS = 50;

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.endsWith(".pdf");
}

export function isTextFile(file: File): boolean {
  return file.name.endsWith(".txt") || file.type === "text/plain";
}

type PdfDocument = Awaited<
  ReturnType<typeof import("pdfjs-dist").getDocument>["promise"]
>;

async function ocrPdfPages(pdf: PdfDocument): Promise<string> {
  console.log("[pdf-extract] OCR start", { numPages: pdf.numPages });
  let Tesseract: typeof import("tesseract.js");
  try {
    Tesseract = await import("tesseract.js");
  } catch (err) {
    console.error("[pdf-extract] tesseract.js failed to load", err);
    throw new Error("OCR_FAILED");
  }
  const textParts: string[] = [];
  let successfulPages = 0;
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("[pdf-extract] page skipped: no 2d context", { pageNum });
        continue;
      }
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn("[pdf-extract] page skipped: zero canvas dimensions", {
          pageNum,
          width: canvas.width,
          height: canvas.height,
        });
        continue;
      }
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const dataUrl = canvas.toDataURL("image/png");
      const result = await Tesseract.recognize(dataUrl, "eng");
      const pageText = result.data.text ?? "";

      console.log("[pdf-extract] OCR page", {
        pageNum,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        textLength: pageText.length,
      });
      textParts.push(pageText);
      successfulPages += 1;
    } catch (err) {
      console.error("[pdf-extract] OCR page failed", { pageNum, err });
      // Keep going — partial output beats nothing.
    }
  }
  if (successfulPages === 0) {
    console.error("[pdf-extract] OCR failed on all pages");
    throw new Error("OCR_FAILED");
  }
  const combined = textParts.join("\n").trim();

  console.log("[pdf-extract] OCR done", {
    successfulPages,
    totalPages: pdf.numPages,
    combinedLength: combined.length,
  });
  return combined;
}

/**
 * Extract text from a PDF file. `onOcrStart` (when supplied) fires only
 * when the pdfjs text-content pass returned too few characters and we're
 * falling back to OCR — useful so the caller can swap in a "OCR in
 * progress, this may take a moment" status while tesseract runs.
 */
export async function extractPdfText(
  file: File,
  options?: { onOcrStart?: () => void },
): Promise<string> {
  console.log("[pdf-extract] start", {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });
  // Lazy-load pdfjs-dist only on client-side to avoid SSR issues.
  let pdfjsLib: typeof import("pdfjs-dist");
  try {
    pdfjsLib = await import("pdfjs-dist");
    // Use CDN worker to keep bundle size small.
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;
  } catch (err) {
    console.error("[pdf-extract] pdfjs-dist failed to load", err);
    throw new Error("PDF_LOAD_ERROR");
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  console.log("[pdf-extract] pdf loaded", { numPages: pdf.numPages });

  // fix-2-live-bugs (Bug 2) — wrap the text-extraction pass in a try
  // block. Image-only PDFs (e.g. NJ sample ballots) can throw mid-loop
  // from `getTextContent()` or even `getPage()` because there's no
  // embedded text layer. Before this guard the throw escaped past the
  // OCR fallback and surfaced to the user as the generic
  // "Something went wrong reading that PDF" error.
  let extracted = "";
  try {
    const textParts: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      textParts.push(pageText);
    }
    extracted = textParts.join("\n").trim();
    console.log("[pdf-extract] pdfjs text", {
      extractedLength: extracted.length,
      threshold: PDF_SCANNED_MIN_CHARS,
    });
  } catch (err) {
    console.warn(
      "[pdf-extract] pdfjs text extraction threw — falling back to OCR",
      err,
    );
    // Leave `extracted` empty so the length check below routes to OCR.
  }

  if (extracted.length >= PDF_SCANNED_MIN_CHARS) {
    return extracted;
  }
  // pdfjs returned almost nothing (or threw) — likely a scanned /
  // image-only PDF. Fall back to OCR; notify the caller so it can
  // surface a progress notice (tesseract loads a ~10MB WASM blob).
  options?.onOcrStart?.();
  return ocrPdfPages(pdf);
}
