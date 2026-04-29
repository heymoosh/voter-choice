import { describe, expect, it } from "vitest";
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
});
