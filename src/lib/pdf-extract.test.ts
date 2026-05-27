// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Live bug 2 — NJ-style image-based ballot PDFs fail extraction with the
 * generic "Something went wrong reading that PDF" error. Diagnosis:
 * pdfjs-dist's `getTextContent()` (or `getDocument`) throws when the PDF
 * has no embedded text layer, and the throw propagates past the OCR
 * fallback into the caller's catch block.
 *
 * Contract under test: when pdfjs succeeds at loading the document but
 * fails / returns empty text, `extractPdfText` MUST fall back to the
 * OCR (tesseract.js) path. Loading errors are the only thing that
 * should escape as `PDF_LOAD_ERROR`.
 */

// Module-level recognize spy so individual tests can clear it.
const tesseractRecognize = vi.fn(async () => ({
  data: {
    text: "U.S. SENATE\n  - Cory Booker (D)\n  - Some Republican\nGOVERNOR\n  - Phil Murphy (D)\nballot text long enough to clear the threshold",
  },
}));

// Mock pdfjs-dist — provide a configurable document factory so each
// test can shape `getDocument` / `getTextContent` behavior.
let documentFactory: () => Promise<unknown> = () =>
  Promise.resolve({
    numPages: 1,
    getPage: async () => ({
      getTextContent: async () => ({ items: [] }),
      getViewport: () => ({ width: 100, height: 100 }),
      render: () => ({ promise: Promise.resolve() }),
    }),
  });

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  version: "0.0.0",
  getDocument: vi.fn(() => ({ promise: documentFactory() })),
}));

vi.mock("tesseract.js", () => ({
  recognize: tesseractRecognize,
  // tesseract.js v6 namespaces under default — cover both shapes.
  default: { recognize: tesseractRecognize },
}));

beforeEach(() => {
  tesseractRecognize.mockClear();
  // Stub canvas.toDataURL so jsdom doesn't reject the call.
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,");
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => ({}) as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  vi.resetModules();
});

function fakePdfFile(): File {
  const blob = new Blob(["%PDF-fake"], { type: "application/pdf" });
  const file = new File([blob], "ballot.pdf", { type: "application/pdf" });
  // jsdom's File implementation doesn't ship arrayBuffer(); shim it so
  // pdf-extract's `await file.arrayBuffer()` call resolves.
  if (typeof file.arrayBuffer !== "function") {
    (
      file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }
    ).arrayBuffer = async () => new ArrayBuffer(0);
  }
  return file;
}

describe("extractPdfText — OCR fallback robustness (live bug 2)", () => {
  it("falls back to OCR when pdfjs returns empty text", async () => {
    documentFactory = () =>
      Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({ items: [] }),
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
      });
    const { extractPdfText } = await import("./pdf-extract");
    const onOcrStart = vi.fn();
    const text = await extractPdfText(fakePdfFile(), { onOcrStart });
    expect(tesseractRecognize).toHaveBeenCalled();
    expect(onOcrStart).toHaveBeenCalledTimes(1);
    expect(text).toContain("Cory Booker");
  });

  it("falls back to OCR when pdfjs.getTextContent() THROWS (NJ image-PDF case)", async () => {
    // This is the live bug: NJ sample ballots aren't text-PDFs, so
    // pdfjs throws partway through extraction. The old code propagated
    // the throw past the OCR fallback as a generic error.
    documentFactory = () =>
      Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => {
            throw new Error("InvalidPDFException — no text layer");
          },
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
      });
    const { extractPdfText } = await import("./pdf-extract");
    const onOcrStart = vi.fn();
    const text = await extractPdfText(fakePdfFile(), { onOcrStart });
    expect(tesseractRecognize).toHaveBeenCalled();
    expect(onOcrStart).toHaveBeenCalledTimes(1);
    expect(text).toContain("Cory Booker");
  });

  it("falls back to OCR when getPage itself throws during the text-extraction pass", async () => {
    // Some malformed image PDFs can fail at the getPage call before
    // getTextContent ever runs. OCR is the last resort — make sure it
    // still kicks in.
    documentFactory = () =>
      Promise.resolve({
        numPages: 2,
        _callCount: 0,
        getPage: async function (this: { _callCount?: number }) {
          // First call (the text-extraction loop) throws; OCR loop
          // (second pass) gets a usable page.
          if (this._callCount === undefined) this._callCount = 0;
          this._callCount += 1;
          if (this._callCount <= 2) {
            throw new Error("getPage failed on text pass");
          }
          return {
            getTextContent: async () => ({ items: [] }),
            getViewport: () => ({ width: 100, height: 100 }),
            render: () => ({ promise: Promise.resolve() }),
          };
        },
      });
    const { extractPdfText } = await import("./pdf-extract");
    const onOcrStart = vi.fn();
    const text = await extractPdfText(fakePdfFile(), { onOcrStart });
    expect(tesseractRecognize).toHaveBeenCalled();
    expect(text.length).toBeGreaterThan(0);
  });

  it("returns pdfjs text without invoking OCR when text-PDF yields enough characters", async () => {
    const longText = "x".repeat(80);
    documentFactory = () =>
      Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({
            items: [{ str: longText }],
          }),
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
      });
    const { extractPdfText } = await import("./pdf-extract");
    const onOcrStart = vi.fn();
    const text = await extractPdfText(fakePdfFile(), { onOcrStart });
    expect(tesseractRecognize).not.toHaveBeenCalled();
    expect(onOcrStart).not.toHaveBeenCalled();
    expect(text).toContain(longText);
  });

  it("throws OCR_FAILED when pdfjs is unusable AND tesseract also fails on every page", async () => {
    documentFactory = () =>
      Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({ items: [] }),
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
      });
    tesseractRecognize.mockImplementationOnce(() => {
      throw new Error("tesseract crashed");
    });
    const { extractPdfText } = await import("./pdf-extract");
    await expect(extractPdfText(fakePdfFile())).rejects.toThrow("OCR_FAILED");
  });
});
