import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const ALLOWED_STATE_CODES = /^[A-Z]{2}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!ALLOWED_STATE_CODES.test(code)) {
    return NextResponse.json({ error: "Invalid state code" }, { status: 400 });
  }

  const filePath = path.join(
    process.cwd(),
    "src",
    "data",
    "states",
    `${code}.json`,
  );

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "State not found" }, { status: 404 });
  }
}
