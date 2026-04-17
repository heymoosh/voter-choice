import React from "react";

/* ──────────────────────────────────────────────────────────────
 * Lightweight markdown renderer for assistant messages.
 * Supports:
 *   - **bold**
 *   - *italic*  (single-asterisk, won't match **bold**)
 *   - [text](https://...) links
 *   - ## h2, ### h3
 *   - bullet lists (- or *)
 *   - numbered lists (1. 2. 3.)
 *   - --- horizontal rule
 *   - > blockquote
 *   - blank-line paragraph breaks
 *
 * Deliberately minimal — this is rendered on every token during
 * streaming. No external dependency.
 * ────────────────────────────────────────────────────────────── */

// Match (in order so that **bold** wins over *italic*):
//   1. **bold**
//   2. *italic*
//   3. [text](url)
const INLINE_REGEX =
  /(\*\*(.+?)\*\*|\*([^*\n]+?)\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;

export function InlineMarkdown({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // Reset lastIndex so the global regex starts fresh each call.
  INLINE_REGEX.lastIndex = 0;

  while ((match = INLINE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      // **bold**
      parts.push(
        <strong key={key++} className="font-bold text-on-surface">
          {match[2]}
        </strong>,
      );
    } else if (match[3] !== undefined) {
      // *italic*
      parts.push(
        <em key={key++} className="italic">
          {match[3]}
        </em>,
      );
    } else if (match[4] && match[5]) {
      // [text](url)
      parts.push(
        <a
          key={key++}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:opacity-80"
        >
          {match[4]}
        </a>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

// A line is a horizontal rule when it contains only dashes, underscores,
// or asterisks (3+), possibly with surrounding whitespace.
function isHorizontalRule(line: string): boolean {
  const trimmed = line.trim();
  return /^(-{3,}|_{3,}|\*{3,})$/.test(trimmed);
}

export function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  let listItems: React.ReactNode[] = [];
  let blockquoteLines: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc pl-5 space-y-1.5 my-2">
          {listItems}
        </ul>,
      );
      listItems = [];
    }
  }

  function flushBlockquote() {
    if (blockquoteLines.length > 0) {
      elements.push(
        <blockquote
          key={key++}
          className="border-l-4 border-primary/40 pl-3 my-2 italic text-on-surface-variant"
        >
          {blockquoteLines.map((l, i) => (
            <p key={i} className="my-0.5">
              <InlineMarkdown text={l} />
            </p>
          ))}
        </blockquote>,
      );
      blockquoteLines = [];
    }
  }

  function flushAll() {
    flushList();
    flushBlockquote();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Horizontal rule
    if (isHorizontalRule(line)) {
      flushAll();
      elements.push(
        <hr
          key={key++}
          className="my-4 border-0 border-t border-outline-variant/40"
        />,
      );
      continue;
    }

    // Headers
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);

    if (h2Match) {
      flushAll();
      elements.push(
        <h2
          key={key++}
          className="text-base font-black text-on-surface mt-4 mb-1 tracking-tight"
        >
          <InlineMarkdown text={h2Match[1]} />
        </h2>,
      );
      continue;
    }

    if (h3Match) {
      flushAll();
      elements.push(
        <h3 key={key++} className="text-sm font-bold text-on-surface mt-3 mb-1">
          <InlineMarkdown text={h3Match[1]} />
        </h3>,
      );
      continue;
    }

    // Blockquote: line starts with `> `
    const quoteMatch = line.match(/^\s*>\s?(.*)/);
    if (quoteMatch) {
      flushList();
      blockquoteLines.push(quoteMatch[1]);
      continue;
    } else if (blockquoteLines.length > 0) {
      flushBlockquote();
    }

    // Bullet list items (- or *)
    const listMatch = line.match(/^[\s]*[-*]\s+(.+)/);
    if (listMatch) {
      listItems.push(
        <li key={key++}>
          <InlineMarkdown text={listMatch[1]} />
        </li>,
      );
      continue;
    }

    // Numbered list items
    const numMatch = line.match(/^[\s]*\d+\.\s+(.+)/);
    if (numMatch) {
      flushList();
      elements.push(
        <p key={key++} className="my-0.5 pl-2">
          <InlineMarkdown text={line} />
        </p>,
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      flushAll();
      if (elements.length > 0) {
        elements.push(<div key={key++} className="h-2" />);
      }
      continue;
    }

    // Regular paragraph
    flushAll();
    elements.push(
      <p key={key++} className="my-0.5">
        <InlineMarkdown text={line} />
      </p>,
    );
  }

  flushAll();
  return <div className="space-y-0">{elements}</div>;
}
