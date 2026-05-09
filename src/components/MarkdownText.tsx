import React from "react";
import { SourcedClaim, parseCitationBody } from "./SourcedClaim";

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
 *   - inline citations:
 *       [Source: NAME], [Source: NAME, URL]
 *       [Advocacy: NAME], [Advocacy: NAME, URL]
 *       Spanish: [Fuente: ...] / [Defensa: ...]
 *
 * Deliberately minimal — this is rendered on every token during
 * streaming. No external dependency.
 * ────────────────────────────────────────────────────────────── */

// Citation tokens. The prefix is case-sensitive (matches what the
// prompt instructs the model to emit). Body stops at the first `]`.
const CITATION_RE = /\[(Source|Advocacy|Fuente|Defensa):\s*([^\]]+)\]/g;

function citationKind(prefix: string): "source" | "advocacy" {
  return prefix === "Advocacy" || prefix === "Defensa" ? "advocacy" : "source";
}

// Match (in order so that **bold** wins over *italic*):
//   1. **bold**
//   2. *italic*
//   3. [text](url)
//   4. bare https://... URLs
const INLINE_REGEX =
  /(\*\*(.+?)\*\*|\*([^*\n]+?)\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<]+))/g;

function splitTrailingUrlPunctuation(url: string): {
  href: string;
  trailing: string;
} {
  const match = url.match(/^(.+?)([.,;:!?)]*)$/);
  return {
    href: match?.[1] ?? url,
    trailing: match?.[2] ?? "",
  };
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline hover:opacity-80"
    >
      {children}
    </a>
  );
}

// Render the bold/italic/link/URL inline grammar. Citations have
// already been peeled off upstream so we don't need to worry about
// `[Source: ...]` tokens looking like markdown links here.
function renderInlinePlain(
  text: string,
  startKey: number,
): { nodes: React.ReactNode[]; nextKey: number } {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = startKey;

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
        <ExternalLink key={key++} href={match[5]}>
          {match[4]}
        </ExternalLink>,
      );
    } else if (match[6]) {
      // bare https://... URL
      const { href, trailing } = splitTrailingUrlPunctuation(match[6]);
      parts.push(
        <ExternalLink key={key++} href={href}>
          {href}
        </ExternalLink>,
      );
      if (trailing) parts.push(trailing);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return { nodes: parts, nextKey: key };
}

export function InlineMarkdown({ text }: { text: string }) {
  // Step 1: split off citation tokens. Anything between citations
  // is plain markdown text and is handed to renderInlinePlain.
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  CITATION_RE.lastIndex = 0;
  while ((match = CITATION_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      const { nodes, nextKey } = renderInlinePlain(plain, key);
      parts.push(...nodes);
      key = nextKey;
    }
    const prefix = match[1];
    const body = match[2];
    const { name, url } = parseCitationBody(body);
    parts.push(
      <SourcedClaim
        key={key++}
        kind={citationKind(prefix)}
        name={name}
        url={url}
      />,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    const { nodes, nextKey } = renderInlinePlain(tail, key);
    parts.push(...nodes);
    key = nextKey;
  }

  return <>{parts}</>;
}

// A line is a horizontal rule when it contains only dashes, underscores,
// or asterisks (3+), possibly with surrounding whitespace.
function isHorizontalRule(line: string): boolean {
  const trimmed = line.trim();
  return /^(-{3,}|_{3,}|\*{3,})$/.test(trimmed);
}

function parseTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;

  let content = trimmed;
  if (content.startsWith("|")) content = content.slice(1);
  if (content.endsWith("|")) content = content.slice(0, -1);

  const cells = content.split("|").map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function isTableDivider(line: string): boolean {
  const cells = parseTableRow(line);
  return (
    cells !== null &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell)) &&
    cells.some((cell) => cell.includes("---"))
  );
}

function renderTable(
  headerCells: string[],
  bodyRows: string[][],
  key: number,
): React.ReactNode {
  return (
    <div key={key} className="my-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm text-on-surface-variant">
        <thead>
          <tr className="border-b border-outline-variant/40">
            {headerCells.map((cell, index) => (
              <th
                key={index}
                className="px-3 py-2 font-bold text-on-surface align-top"
              >
                <InlineMarkdown text={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-outline-variant/20 last:border-b-0"
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 align-top">
                  <InlineMarkdown text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function consumeTable(
  lines: string[],
  startIndex: number,
  key: number,
): { element: React.ReactNode; nextIndex: number } | null {
  const headerCells = parseTableRow(lines[startIndex]);
  const nextLine = lines[startIndex + 1];
  if (
    !headerCells ||
    !nextLine ||
    isTableDivider(lines[startIndex]) ||
    !isTableDivider(nextLine)
  ) {
    return null;
  }

  const bodyRows: string[][] = [];
  let rowIndex = startIndex + 2;

  while (rowIndex < lines.length) {
    const rowCells = parseTableRow(lines[rowIndex]);
    if (!rowCells || isTableDivider(lines[rowIndex])) break;
    bodyRows.push(rowCells);
    rowIndex += 1;
  }

  return {
    element: renderTable(headerCells, bodyRows, key),
    nextIndex: rowIndex - 1,
  };
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
    const tableBlock = consumeTable(lines, i, key);
    if (tableBlock) {
      flushAll();
      elements.push(tableBlock.element);
      key += 1;
      i = tableBlock.nextIndex;
      continue;
    }

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
