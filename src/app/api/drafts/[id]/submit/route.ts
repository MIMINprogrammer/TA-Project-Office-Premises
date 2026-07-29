import { db } from "@/lib/db";
import { json, error, serialize, logAudit, DRAFT_INCLUDE } from "@/lib/server";

export const dynamic = "force-dynamic";

// POST /api/drafts/[id]/submit — BU submits draft for SLO review (PRD §6.5, FR workflow step 6)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { userId, userName, userRole } = body;

  const existing = await db.draft.findUnique({ where: { id } });
  if (!existing) return error("Draf tidak dijumpai.", 404);
  if (existing.status !== "draft" && existing.status !== "returned") {
    return error(
      `Hanya draf berstatus "Draf" atau "Dikembalikan" boleh dihantar. Status semasa: ${existing.status}.`,
      409
    );
  }

  const updated = await db.draft.update({
    where: { id },
    data: { status: "pending_review" },
    include: DRAFT_INCLUDE,
  });

  await logAudit({
    draftId: id,
    userId: userId || existing.createdBy,
    userName: userName || "Business Unit",
    userRole: userRole || "BU",
    action: "Draf dihantar untuk semakan",
    details: `Draf dihantar kepada Senior Legal Officer untuk semakan.`,
  });

  return json({ draft: serialize(updated) });
}
