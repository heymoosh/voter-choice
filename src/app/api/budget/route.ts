/**
 * GET /api/budget
 * Returns current monthly budget usage status.
 * Used by the client to show progressive degradation messages.
 */

import { getBudgetInfo } from "@/lib/chatBudget";

export async function GET(): Promise<Response> {
  const info = getBudgetInfo();
  return Response.json({
    percentUsed: Math.round(info.percentUsed),
    status: info.status,
  });
}
