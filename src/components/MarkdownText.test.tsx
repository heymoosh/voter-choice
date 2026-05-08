// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { MarkdownText, InlineMarkdown } from "./MarkdownText";

describe("InlineMarkdown", () => {
  it("renders **bold** as a <strong>", () => {
    render(<InlineMarkdown text="hello **world** there" />);
    expect(screen.getByText("world").tagName).toBe("STRONG");
  });

  it("renders *italic* as an <em>", () => {
    render(<InlineMarkdown text="this is *emphasized* text" />);
    expect(screen.getByText("emphasized").tagName).toBe("EM");
  });

  it("does not confuse **bold** with *italic*", () => {
    render(<InlineMarkdown text="**strong** and *slanted*" />);
    expect(screen.getByText("strong").tagName).toBe("STRONG");
    expect(screen.getByText("slanted").tagName).toBe("EM");
  });

  it("renders a parenthetical italic aside", () => {
    // Regression: literal asterisks were showing up in the UI.
    render(
      <InlineMarkdown text="notes *(Also — your address puts you in G.)*" />,
    );
    expect(
      screen.getByText("(Also — your address puts you in G.)").tagName,
    ).toBe("EM");
  });

  it("renders [text](url) as an anchor with target _blank", () => {
    render(
      <InlineMarkdown text="see [Harris votes](https://harrisvotes.com) for more" />,
    );
    const link = screen.getByRole("link", { name: "Harris votes" });
    expect(link).toHaveAttribute("href", "https://harrisvotes.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders bare https URLs as anchors with visible full URL text", () => {
    render(
      <InlineMarkdown text="Go here: https://www.harrisvotes.com/Voter/Whats-on-my-Ballot." />,
    );
    const link = screen.getByRole("link", {
      name: "https://www.harrisvotes.com/Voter/Whats-on-my-Ballot",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.harrisvotes.com/Voter/Whats-on-my-Ballot",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("does not render italic across newlines", () => {
    // `*foo\nbar*` should stay plain text, not render as a multi-line italic
    const { container } = render(<InlineMarkdown text={"*foo\nbar*"} />);
    expect(container.querySelector("em")).toBeNull();
  });
});

describe("MarkdownText", () => {
  it("renders --- as a horizontal rule", () => {
    const { container } = render(
      <MarkdownText text={"above\n\n---\n\nbelow"} />,
    );
    expect(container.querySelector("hr")).not.toBeNull();
  });

  it("renders > lines as a blockquote", () => {
    const { container } = render(
      <MarkdownText text={"> Your vote tomorrow matters.\n> Really."} />,
    );
    const quote = container.querySelector("blockquote");
    expect(quote).not.toBeNull();
    expect(quote?.textContent).toContain("Your vote tomorrow matters.");
    expect(quote?.textContent).toContain("Really.");
  });

  it("renders ## and ### as h2 / h3", () => {
    const { container } = render(
      <MarkdownText text={"## Big\n\n### Smaller"} />,
    );
    expect(container.querySelector("h2")?.textContent).toBe("Big");
    expect(container.querySelector("h3")?.textContent).toBe("Smaller");
  });

  it("renders bullet lists", () => {
    const { container } = render(
      <MarkdownText text={"- one\n- two\n- three"} />,
    );
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(3);
  });

  it("renders bold inside list items", () => {
    render(<MarkdownText text={"- **Senate** — biggest race"} />);
    expect(screen.getByText("Senate").tagName).toBe("STRONG");
  });

  it("closes a blockquote when a non-quote line follows", () => {
    const { container } = render(
      <MarkdownText text={"> quoted line\n\nnormal line"} />,
    );
    const quote = container.querySelector("blockquote");
    expect(quote?.textContent).toContain("quoted line");
    // The "normal line" should be OUTSIDE the blockquote
    expect(quote?.textContent ?? "").not.toContain("normal line");
  });

  it("renders markdown pipe tables as semantic tables", () => {
    const { container } = render(
      <MarkdownText
        text={
          "| Candidate | Strength |\n|---|---|\n| Parker | **Experience** |\n| Plummer | Reform focus |"
        }
      />,
    );

    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(container.querySelectorAll("th")).toHaveLength(2);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(screen.getByText("Experience").tagName).toBe("STRONG");
  });
});
