// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ZipForm } from "./ZipForm";

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

  it("shows 'Please enter a zip code' when submitted empty", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toBeInTheDocument();
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a zip code",
    );
  });

  it("shows validation error for non-numeric input", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "abcde" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a valid 5-digit zip code",
    );
  });

  it("shows validation error for wrong length input", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a valid 5-digit zip code",
    );
  });

  it("calls onSubmit with the zip code for valid 5-digit input", () => {
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
