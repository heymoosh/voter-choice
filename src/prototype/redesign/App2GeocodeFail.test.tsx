// @vitest-environment jsdom
/* Honesty check for the geocode-failure error view (fix/census-geocode-
   reliability): fetchDelegation's `retryable` flag distinguishes a real
   upstream outage (Census geocoder itself failed — 502/non-ok/network
   exception) from a genuine no-match (a 200 the address just didn't
   resolve). The two must render different copy — the outage case must
   not blame the voter's address. Drives the real App2 stage machinery
   (HomeView submit -> startLookup -> fetchDelegation) rather than asserting
   on an unexported inner component. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

const fetchDelegation = vi.fn();

vi.mock("./delegationData", async () => {
  const actual =
    await vi.importActual<typeof import("./delegationData")>(
      "./delegationData",
    );
  return {
    ...actual,
    fetchDelegation: (...args: unknown[]) => fetchDelegation(...args),
  };
});

import App2 from "./App2";

beforeEach(() => {
  fetchDelegation.mockReset();
  sessionStorage.clear();
  localStorage.clear();
});

async function submitAddress(addr: string) {
  render(<App2 />);
  const input = await screen.findByLabelText(/address/i, {
    selector: "input",
  });
  fireEvent.change(input, { target: { value: addr } });
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Pull my representatives →" }),
    );
  });
}

describe("App2 geocode-failure copy", () => {
  it("shows the outage copy (not address-blaming) when the geocoder itself failed", async () => {
    fetchDelegation.mockResolvedValueOnce({
      status: "geocode_failed",
      retryable: true,
    });
    await submitAddress("1600 Pennsylvania Ave, Washington, DC 20500");

    expect(
      await screen.findByText("Our address lookup is unavailable right now"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This isn't about your address — the lookup service is temporarily down. Try again in a minute.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("We couldn't place that address"),
    ).not.toBeInTheDocument();
    // Outage is retryable: a "Try again" action must be offered.
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("shows the address copy when the address genuinely didn't match", async () => {
    fetchDelegation.mockResolvedValueOnce({
      status: "geocode_failed",
      retryable: false,
    });
    await submitAddress("not a real address");

    expect(
      await screen.findByText("We couldn't place that address"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Try the full street address, city, and ZIP — the district lookup needs a real street address to find your representatives.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Our address lookup is unavailable right now"),
    ).not.toBeInTheDocument();
    // A genuine no-match isn't retryable: no "Try again" action.
    expect(
      screen.queryByRole("button", { name: /try again/i }),
    ).not.toBeInTheDocument();
  });
});
