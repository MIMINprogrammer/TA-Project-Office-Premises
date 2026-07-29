import { db } from "@/lib/db";
import { json, serialize } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET /api/audit — audit log (PRD §6.7, §9.6)
// ?draftId=...  filter by draft
// ?limit=...    cap results
export async function GET(req: Request) {
  const url = new URL(req.url);
  const draftId = url.searchParams.get("draftId");
  const limit = Number(url.searchParams.get("limit") ?? "200");

  const where: any = {};
  if (draftId) where.draftId = draftId;

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: Math.min(limit, 500),
  });

  return json({ logs: serialize(logs) });
}
