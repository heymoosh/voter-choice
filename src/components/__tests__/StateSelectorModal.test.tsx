import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StateSelectorModal } from "../StateSelectorModal";
import { LanguageProvider } from "../../lib/i18n";

const stateCodes = ["AZ", "NM"];

describe("StateSelectorModal", () => {
  it("renders with data-testid='state-selector'", () => {
    render(
      <StateSelectorModal
        stateCodes={stateCodes}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId("state-selector")).toBeInTheDocument();
  });

  it("shows all state options", () => {
    render(
      <StateSelectorModal
        stateCodes={stateCodes}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Arizona")).toBeInTheDocument();
    expect(screen.getByText("New Mexico")).toBeInTheDocument();
  });

  it("calls onSelect with state code on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <StateSelectorModal
        stateCodes={stateCodes}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByText("Arizona"));
    expect(onSelect).toHaveBeenCalledWith("AZ");
  });

  it("calls onCancel when cancel button clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <StateSelectorModal
        stateCodes={stateCodes}
        onSelect={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("StateSelectorModal — Spanish translations", () => {
  beforeEach(() => {
    localStorage.setItem("lang", "es");
  });

  afterEach(() => {
    localStorage.clear();
  });

  function renderEs() {
    return render(
      <LanguageProvider>
        <StateSelectorModal
          stateCodes={["TX", "NM"]}
          onSelect={vi.fn()}
          onCancel={vi.fn()}
        />
      </LanguageProvider>,
    );
  }

  it("shows Spanish title", () => {
    renderEs();
    expect(screen.getByText("¿En qué estado vas a votar?")).toBeInTheDocument();
  });

  it("shows Spanish subtitle", () => {
    renderEs();
    expect(
      screen.getByText("Este código postal abarca varios estados."),
    ).toBeInTheDocument();
  });

  it("shows Spanish cancel button", () => {
    renderEs();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });
});
