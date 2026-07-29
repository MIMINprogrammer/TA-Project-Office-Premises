import { db } from "@/lib/db";
import { json, error, serialize, logAudit } from "@/lib/server";

export const dynamic = "force-dynamic";

// PATCH /api/amendments/[id] — SLO clause decision (PRD §6.5 FR-35)
// body: { sloDecision, sloComment?, sloEditedText?, userId, userName, userRole }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { sloDecision, sloComment, sloEditedText, userId, userName, userRole } = body;

  if (!sloDecision) return error("sloDecision diperlukan.", 422);

  const existing = await db.draftClauseAmendment.findUnique({
    where: { id },
    include: { clause: true, draft: true },
  });
  if (!existing) return error("Pindaan tidak dijumpai.", 404);

  const updated = await db.draftClauseAmendment.update({
    where: { id },
    data: {
      sloDecision: String(sloDecision),
      sloComment: sloComment !== undefined ? String(sloComment) : existing.sloComment,
      sloEditedText: sloEditedText !== undefined ? String(sloEditedText) : existing.sloEditedText,
      updatedBy: userId,
    },
    include: { clause: true, draft: true, updater: true },
  });

  // Touch draft lastUpdated
  await db.draft.update({
    where: { id: existing.draftId },
    data: { lastUpdated: new Date() },
  });

  const decisionLabel: Record<string, string> = {
    accepted: "diterima",
    edited: "dipinda",
    rejected: "ditolak",
    needs_bu_input: "ditandakan perlu input BU",
    pending: "ditetapkan semula ke belum disemak",
  };

  await logAudit({
    draftId: existing.draftId,
    userId: userId || "system",
    userName: userName || "Senior Legal Officer",
    userRole: userRole || "SLO",
    action: "Keputusan klausa dikemas kini",
    details: `Klausa ${existing.clause?.clauseNumber} — ${existing.clause?.title} ${decisionLabel[sloDecision] || sloDecision}.${
      sloComment ? ` Ulasan: ${sloComment}` : ""
    }`,
  });

  return json({ amendment: serialize(updated) });
}
