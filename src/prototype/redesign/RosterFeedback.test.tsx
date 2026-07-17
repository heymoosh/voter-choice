// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import { RosterFeedbackWidget } from "./RosterFeedback";

function renderWidget(props = {}) {
  return render(
    <I18nProvider>
      <RosterFeedbackWidget
        stateCode="TX"
        office="U.S. House"
        district="TX-12"
        contextLabel="delegation-workspace"
        {...props}
      />
    </I18nProvider>,
  );
}

describe("RosterFeedbackWidget", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a trigger and no modal until clicked", () => {
    renderWidget();
    expect(screen.getByTestId("roster-feedback-trigger")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the modal prefilled with state/office/district from props", () => {
    renderWidget();
    fireEvent.click(screen.getByTestId("roster-feedback-trigger"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("roster-feedback-state")).toHaveValue("TX");
    expect(screen.getByTestId("roster-feedback-office")).toHaveValue(
      "U.S. House",
    );
    expect(screen.getByTestId("roster-feedback-district")).toHaveValue("TX-12");
  });

  it("lets the voter edit the prefilled fields", () => {
    renderWidget();
    fireEvent.click(screen.getByTestId("roster-feedback-trigger"));

    const stateInput = screen.getByTestId("roster-feedback-state");
    fireEvent.change(stateInput, { target: { value: "CA" } });
    expect(stateInput).toHaveValue("CA");
  });

  it("submit button is disabled until a message is entered", () => {
    renderWidget();
    fireEvent.click(screen.getByTestId("roster-feedback-trigger"));

    expect(screen.getByTestId("roster-feedback-submit")).toBeDisabled();
    fireEvent.change(screen.getByTestId("roster-feedback-message"), {
      target: { value: "The candidate listed here dropped out." },
    });
    expect(screen.getByTestId("roster-feedback-submit")).not.toBeDisabled();
  });

  it("submits the form to /api/roster-feedback and shows success", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
      }),
    );

    renderWidget();
    fireEvent.click(screen.getByTestId("roster-feedback-trigger"));
    fireEvent.change(screen.getByTestId("roster-feedback-message"), {
      target: { value: "This district's candidate is wrong." },
    });
    fireEvent.click(screen.getByTestId("roster-feedback-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("roster-feedback-success")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/roster-feedback",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      message: "This district's candidate is wrong.",
      state: "TX",
      office: "U.S. House",
      district: "TX-12",
      appContext: { source: "delegation-workspace" },
    });
  });

  it("shows an error message when the request fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), { status: 503 }),
    );

    renderWidget();
    fireEvent.click(screen.getByTestId("roster-feedback-trigger"));
    fireEvent.change(screen.getByTestId("roster-feedback-message"), {
      target: { value: "Something is off here." },
    });
    fireEvent.click(screen.getByTestId("roster-feedback-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("roster-feedback-error")).toBeInTheDocument();
    });
  });

  it("works with no state/office/district prefill (overview mode)", () => {
    renderWidget({
      stateCode: undefined,
      office: undefined,
      district: undefined,
    });
    fireEvent.click(screen.getByTestId("roster-feedback-trigger"));

    expect(screen.getByTestId("roster-feedback-state")).toHaveValue("");
    expect(screen.getByTestId("roster-feedback-office")).toHaveValue("");
    expect(screen.getByTestId("roster-feedback-district")).toHaveValue("");
  });
});
