import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

function civicRequest(body: unknown, origin = "https://example.test") {
  return new NextRequest("https://example.test/api/civic", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "example.test",
      origin,
    },
    body: JSON.stringify(body),
  });
}

describe("/api/civic", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects GET so addresses are not sent in query strings", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });

  it("requires a same-origin POST", async () => {
    const response = await POST(
      civicRequest(
        { address: "123 Main St, Austin, TX 78701" },
        "https://bad.test",
      ),
    );
    expect(response.status).toBe(403);
  });

  it("validates address payload before provider lookup", async () => {
    const response = await POST(civicRequest({ address: "" }));
    expect(response.status).toBe(400);
  });

  it("retries Google Civic with explicit election IDs when default lookup has no contests", async () => {
    vi.stubEnv("GOOGLE_CIVIC_API_KEY", "test-key");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = new URL(String(input));
        if (
          url.pathname.endsWith("/voterinfo") &&
          !url.searchParams.get("electionId")
        ) {
          return Response.json({
            election: { id: "1000", name: "Default Election" },
            otherElections: [{ id: "2000", name: "Runoff Election" }],
          });
        }
        if (url.pathname.endsWith("/elections")) {
          return Response.json({ elections: [] });
        }
        if (url.searchParams.get("electionId") === "2000") {
          return Response.json({
            election: { id: "2000", name: "Runoff Election" },
            contests: [
              {
                type: "Run-off",
                office: "U.S. Senator",
                district: { name: "Texas" },
                candidates: [{ name: "Alex Voter", party: "Example" }],
              },
            ],
          });
        }
        return Response.json({});
      });

    const response = await POST(
      civicRequest({ address: "2400 Fountainview Drive, Houston TX 77057" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contests).toHaveLength(1);
    expect(body.source.confidence).toBe("exact_official");
    expect(body.source.attempts).toEqual([
      expect.objectContaining({ electionId: "1000", contestsFound: 0 }),
      expect.objectContaining({ electionId: "2000", contestsFound: 1 }),
    ]);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("electionId=2000"),
      ),
    ).toBe(true);
  });

  it("returns source-links-only when Google Civic has no election data", async () => {
    vi.stubEnv("GOOGLE_CIVIC_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 400 }),
    );

    const response = await POST(
      civicRequest({ address: "2400 Fountainview Drive, Houston TX 77057" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contests).toBeUndefined();
    expect(body.source.confidence).toBe("source_links_only");
  });
});
