import { NextResponse } from "next/server";
import { getCurrentBudgetState } from "@/lib/budget";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getCurrentBudgetState();
  return NextResponse.json(state);
}
