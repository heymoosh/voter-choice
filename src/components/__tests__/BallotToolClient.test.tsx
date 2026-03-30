import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BallotToolClient } from "../BallotToolClient";

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

describe("BallotToolClient", () => {
  it("renders zip form initially", () => {
    render(<BallotToolClient />);
    expect(screen.getByTestId("zip-input")).toBeInTheDocument();
    expect(screen.getByTestId("zip-submit")).toBeInTheDocument();
  });

  it("shows state info after valid TX zip", async () => {
    const user = userEvent.setup();
    render(<BallotToolClient />);
    await user.type(screen.getByTestId("zip-input"), "73301");
    await user.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("state-info")).toBeInTheDocument();
    });
  });

  it("shows prompt output after valid TX zip", async () => {
    const user = userEvent.setup();
    render(<BallotToolClient />);
    await user.type(screen.getByTestId("zip-input"), "73301");
    await user.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("prompt-output")).toBeInTheDocument();
    });
  });

  it("shows not-found-message for unknown zip", async () => {
    const user = userEvent.setup();
    render(<BallotToolClient />);
    await user.type(screen.getByTestId("zip-input"), "00000");
    await user.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("not-found-message")).toBeInTheDocument();
    });
  });

  it("shows state-selector for multi-state zip", async () => {
    const user = userEvent.setup();
    render(<BallotToolClient />);
    await user.type(screen.getByTestId("zip-input"), "86515");
    await user.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("state-selector")).toBeInTheDocument();
    });
  });
});
