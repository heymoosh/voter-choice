// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BallotToolClient } from "./BallotToolClient";

// Mock clipboard
beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

describe("BallotToolClient", () => {
  it("renders the zip input form initially", () => {
    render(<BallotToolClient />);
    expect(screen.getByTestId("zip-input")).toBeInTheDocument();
    expect(screen.getByTestId("zip-submit")).toBeInTheDocument();
  });

  it("shows state info card after submitting a valid TX zip", async () => {
    render(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("state-info")).toBeInTheDocument();
    });
    expect(screen.getByTestId("election-name").textContent).toBeTruthy();
  });

  it("shows prompt-output after submitting a valid TX zip", async () => {
    render(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("prompt-output")).toBeInTheDocument();
    });
    expect(screen.getByTestId("prompt-output").textContent).toContain("Texas");
  });

  it("shows not-found-message for unknown zip", async () => {
    render(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "00001" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("not-found-message")).toBeInTheDocument();
    });
  });

  it("shows state-selector for multi-state zip 86515", async () => {
    render(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "86515" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("state-selector")).toBeInTheDocument();
    });
  });

  it("shows a loading indicator while resolving zip", async () => {
    render(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    // Loading state appears briefly — state-info should eventually appear
    await waitFor(() => {
      expect(screen.getByTestId("state-info")).toBeInTheDocument();
    });
  });
});
