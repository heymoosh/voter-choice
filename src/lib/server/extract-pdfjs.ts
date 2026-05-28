/**
 * Node-side pdfjs-dist wrapper for `/api/extract-ballot`.
 *
 * Two responsibilities:
 *  1. Extract embedded text from a PDF buffer (`extractTextFromPdf`).
 *     Cheap-path input: if this returns something the detector accepts,
 *     we never call Sonnet vision.
 *  2. Render PDF pages to PNG buffers (`renderPdfPages`). Used by the
 *     vision path so each page can be sent to Claude as an image.
 *
 * Both functions take the PDF as a `Uint8Array` so the route can hand
 * over the multipart upload buffer without copying.
 *
 * pdfjs-dist + @napi-rs/canvas are listed in `next.config.ts` under
 * `serverExternalPackages` so the Vercel serverless function resolves
 * the right linux-x64 native variant of canvas at runtime instead of
 * being bundled by Webpack.
 */

import { resolve } from "node:path";

/**
 * Path to the standard fonts directory inside node_modules. pdfjs uses
 * this to render documents that reference fonts not embedded in the
 * file (otherwise it emits warnings + may rasterize incorrectly).
 *
 * In Vercel's serverless runtime the file tracing should pull these in
 * via `outputFileTracingIncludes`, but the default tracing of pdfjs
 * usually catches them. Worst case we'd need to add an explicit
 * include later — surface that as a deferral if Vercel logs show
 * font-resolution warnings in production.
 */
function pdfjsStandardFontsDir(): string {
  // pdfjs `standardFontDataUrl` REQUIRES a trailing slash (validated as a
  // factory URL). `path.resolve()` normalizes the trailing slash away, so
  // append explicitly after resolution. Without this the request 500s in
  // production with "Invalid factory url: must include trailing slash."
  return (
    resolve(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts") + "/"
  );
}

let pdfjsModule: typeof import("pdfjs-dist/legacy/build/pdf.mjs") | null = null;
async function getPdfjs() {
  if (pdfjsModule) return pdfjsModule;
  // Use legacy build so the bundler doesn't try to ship the worker as a
  // separate file in serverless (we run synchronously on the server).
  pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsModule;
}

export interface RenderedPage {
  pageIndex: number; // 1-based
  width: number;
  height: number;
  pngBuffer: Buffer;
}

export interface ExtractTextResult {
  text: string;
  numPages: number;
}

/**
 * Read embedded text from a PDF buffer. Catches and treats
 * per-page failures as empty text (some image-only pages
 * throw inside `getTextContent`).
 */
export async function extractTextFromPdf(
  data: Uint8Array,
): Promise<ExtractTextResult> {
  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    standardFontDataUrl: pdfjsStandardFontsDir(),
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const parts: string[] = [];
  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const pageText = tc.items
        .map((item: { str?: string } | unknown) =>
          item && typeof item === "object" && "str" in item
            ? String((item as { str?: string }).str ?? "")
            : "",
        )
        .join(" ");
      parts.push(pageText);
    } catch {
      // Image-only / corrupted pages throw here — skip and continue.
      parts.push("");
    }
  }
  return { text: parts.join("\n").trim(), numPages };
}

/**
 * Render each page of the PDF to a PNG buffer via @napi-rs/canvas.
 * Scale 2.0 doubles raster resolution for legible OCR-grade input to
 * Claude vision.
 */
export async function renderPdfPages(
  data: Uint8Array,
  options: { scale?: number } = {},
): Promise<RenderedPage[]> {
  const pdfjs = await getPdfjs();
  const { createCanvas } = await import("@napi-rs/canvas");
  const scale = options.scale ?? 2.0;
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    standardFontDataUrl: pdfjsStandardFontsDir(),
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  const out: RenderedPage[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    // pdfjs's render typings expect a browser canvas; the napi-rs one is
    // structurally compatible. eslint disable kept narrow.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx as any, viewport } as any).promise;
    const buf = canvas.toBuffer("image/png");
    out.push({ pageIndex: i, width, height, pngBuffer: buf });
  }
  return out;
}
