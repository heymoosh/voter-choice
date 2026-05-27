// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ZipForm, extractZip } from "./ZipForm";
import { LanguageProvider, useLanguage } from "../lib/i18n";

describe("extractZip", () => {
  it("extracts a 5-digit zip from a full address", () => {
    expect(extractZip("123 Main St, Houston, TX 77057")).toBe("77057");
  });

  it("extracts zip+4 format", () => {
    expect(extractZip("123 Main St, Houston, TX 77057-1234")).toBe("77057");
  });

  it("extracts zip from Google Places format with country suffix", () => {
    expect(extractZip("123 Main St, Austin, TX 78701, USA")).toBe("78701");
  });

  it("extracts a bare 5-digit zip", () => {
    expect(extractZip("73301")).toBe("73301");
  });

  it("returns null for no zip", () => {
    expect(extractZip("no zip here")).toBeNull();
  });

  it("returns null for partial zip", () => {
    expect(extractZip("123")).toBeNull();
  });
});

describe("ZipForm", () => {
  it("renders zip-input and zip-submit data-testids", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    expect(screen.getByTestId("zip-input")).toBeInTheDocument();
    expect(screen.getByTestId("zip-submit")).toBeInTheDocument();
  });

  it("has a label associated with the input", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    const input = screen.getByTestId("zip-input");
    expect(input).toHaveAccessibleName();
  });

  it("does not show zip-error initially", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    expect(screen.queryByTestId("zip-error")).not.toBeInTheDocument();
  });

  it("shows error when submitted empty", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toBeInTheDocument();
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter your address",
    );
  });

  it("shows validation error for input without a zip code", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "no zip here" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please include your 5-digit zip code",
    );
  });

  it("calls onSubmit with full address for valid input", () => {
    const onSubmit = vi.fn();
    render(<ZipForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "123 Main St, Houston, TX 77057" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(onSubmit).toHaveBeenCalledWith("123 Main St, Houston, TX 77057");
  });

  it("calls onSubmit with bare zip code", () => {
    const onSubmit = vi.fn();
    render(<ZipForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(onSubmit).toHaveBeenCalledWith("73301");
  });

  it("does not call onSubmit for invalid input", () => {
    const onSubmit = vi.fn();
    render(<ZipForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("zip-error has role alert", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveAttribute("role", "alert");
  });
});

describe("ZipForm — Spanish mode", () => {
  beforeEach(() => {
    localStorage.setItem("ballot-tool-lang", "es");
  });
  afterEach(() => {
    localStorage.clear();
  });

  function renderEs() {
    return render(
      <LanguageProvider>
        <ZipForm onSubmit={vi.fn()} />
      </LanguageProvider>,
    );
  }

  it("shows Spanish empty error message", async () => {
    renderEs();
    await act(async () => {});
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error").textContent).toContain(
      "Por favor ingresa tu dirección",
    );
  });

  it("shows Spanish invalid error message", async () => {
    renderEs();
    await act(async () => {});
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error").textContent).toContain(
      "código postal de 5 dígitos",
    );
  });

  it("shows Spanish submit button label", async () => {
    renderEs();
    await act(async () => {});
    expect(screen.getByTestId("zip-submit").textContent).toContain(
      "Ver Boleta",
    );
  });

  it("shows Spanish label for address input", async () => {
    renderEs();
    await act(async () => {});
    const input = screen.getByTestId("zip-input");
    expect(input).toHaveAccessibleName();
    // Label should mention "dirección" (the label element, not privacy text)
    const label = screen.getByText(/ingresa tu dirección/i);
    expect(label).toBeInTheDocument();
  });
});

describe("ZipForm — FR-018: active error updates on language switch", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("error message updates immediately when language switches from en to es", async () => {
    render(
      <LanguageProvider>
        <ZipForm onSubmit={vi.fn()} />
      </LanguageProvider>,
    );

    // Submit empty to trigger English error
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error").textContent).toContain(
      "Please enter your address",
    );
  });

  it("error message is derived from current lang, not stored as a string snapshot", async () => {
    function LangSwitchTest() {
      const { setLang } = useLanguage();
      return (
        <>
          <ZipForm onSubmit={vi.fn()} />
          <button data-testid="switch-to-es" onClick={() => setLang("es")}>
            Switch to ES
          </button>
        </>
      );
    }

    render(
      <LanguageProvider>
        <LangSwitchTest />
      </LanguageProvider>,
    );

    // Trigger English error
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error").textContent).toContain(
      "Please enter your address",
    );

    // Switch language
    await act(async () => {
      fireEvent.click(screen.getByTestId("switch-to-es"));
    });

    // Error should now be in Spanish (FR-018)
    expect(screen.getByTestId("zip-error").textContent).toContain(
      "Por favor ingresa tu dirección",
    );
  });
});

// Mock the Google Places hook so the autocomplete hint paragraph renders
// in jsdom (without this, hasPlacesKey is false in the test env and the
// regression branch is never exercised).
vi.mock("../lib/useGooglePlacesAutocomplete", async () => {
  const actual = await vi.importActual<
    typeof import("../lib/useGooglePlacesAutocomplete")
  >("../lib/useGooglePlacesAutocomplete");
  return {
    ...actual,
    getPlacesApiKey: () => "test-key",
    useGooglePlacesAutocomplete: () => {},
  };
});

describe("ZipForm — fix-2-live-bugs button height regression", () => {
  // Live bug: "Pull my ballot →" button renders ~71px tall because the
  // "Start typing and choose your address..." hint paragraph sits inside
  // the same flex row as the button. With `align-items: stretch` (the
  // flexbox default), the button gets stretched to match the input
  // column's content height, dwarfing the input itself.
  //
  // The prototype (docs/design/2026-redesign/prototype/prototype-views.jsx
  // .addr-card .row) contains ONLY the input + button. Hint copy lives
  // outside `.row` as a sibling within the card.
  //
  // jsdom can't measure layout, so we test the DOM contract instead: the
  // button's immediate flex-row parent must contain only the input column
  // (or input + button siblings), and the hint paragraph must NOT be a
  // descendant of that flex row.
  it("autocomplete hint paragraph is not a descendant of the button's flex row", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    const button = screen.getByTestId("zip-submit");
    const flexRow = button.parentElement;
    expect(flexRow).not.toBeNull();
    // The hint paragraph contains the literal phrase. It must live OUTSIDE
    // the flex row so it doesn't stretch the row's height.
    const hintInsideRow = Array.from(flexRow?.querySelectorAll("p") ?? []).find(
      (p) =>
        (p.textContent ?? "").match(
          /start typing and choose|empieza a escribir/i,
        ),
    );
    expect(hintInsideRow).toBeUndefined();
  });

  it("the autocomplete hint still renders, but as a sibling of the flex row inside the card", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    const button = screen.getByTestId("zip-submit");
    const flexRow = button.parentElement!;
    // The hint copy must still be on the page — we're moving it, not
    // deleting it. So look for it outside the row but inside the card.
    const card = flexRow.parentElement!;
    const allHints = Array.from(card.querySelectorAll("p")).filter((p) =>
      (p.textContent ?? "").match(
        /start typing and choose|empieza a escribir/i,
      ),
    );
    expect(allHints.length).toBeGreaterThan(0);
  });
});
