import { getStateData } from "@/lib/stateRegistry";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const stateData = getStateData(code);

  if (!stateData) {
    return NextResponse.json(
      { error: `State data unavailable for ${code}` },
      { status: 404 },
    );
  }

  return NextResponse.json(stateData);
}
