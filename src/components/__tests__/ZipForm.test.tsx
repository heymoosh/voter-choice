import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ZipForm } from "../ZipForm";

describe("ZipForm", () => {
  it("renders zip input and submit button with correct testids", () => {
    render(<ZipForm onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByTestId("zip-input")).toBeInTheDocument();
    expect(screen.getByTestId("zip-submit")).toBeInTheDocument();
  });

  it("shows error for empty submission", async () => {
    const user = userEvent.setup();
    render(<ZipForm onSubmit={vi.fn()} isLoading={false} />);
    await user.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a zip code",
    );
  });

  it("shows error for non-5-digit input", async () => {
    const user = userEvent.setup();
    render(<ZipForm onSubmit={vi.fn()} isLoading={false} />);
    await user.type(screen.getByTestId("zip-input"), "1234");
    await user.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a valid 5-digit zip code",
    );
  });

  it("shows error for non-numeric input", async () => {
    const user = userEvent.setup();
    render(<ZipForm onSubmit={vi.fn()} isLoading={false} />);
    await user.type(screen.getByTestId("zip-input"), "abcde");
    await user.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a valid 5-digit zip code",
    );
  });

  it("calls onSubmit with zip for valid input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ZipForm onSubmit={onSubmit} isLoading={false} />);
    await user.type(screen.getByTestId("zip-input"), "73301");
    await user.click(screen.getByTestId("zip-submit"));
    expect(onSubmit).toHaveBeenCalledWith("73301");
  });

  it("disables submit button when loading", () => {
    render(<ZipForm onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByTestId("zip-submit")).toBeDisabled();
  });

  it("clears error message when input changes after error", async () => {
    const user = userEvent.setup();
    render(<ZipForm onSubmit={vi.fn()} isLoading={false} />);
    await user.click(screen.getByTestId("zip-submit")); // trigger error
    expect(screen.getByTestId("zip-error")).toBeInTheDocument();
    await user.type(screen.getByTestId("zip-input"), "7");
    expect(screen.queryByTestId("zip-error")).not.toBeInTheDocument();
  });
});
