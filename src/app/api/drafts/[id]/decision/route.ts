import { db } from "@/lib/db";
import { json, error, serialize, logAudit, DRAFT_INCLUDE } from "@/lib/server";

export const dynamic = "force-dynamic";

// POST /api/drafts/[id]/decision — SLO final decision (PRD §6.5 FR-36)
// body: { decision: "approved" | "returned" | "rejected", userId, userName, userRole, note? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { decision, userId, userName, userRole, note } = body;

  if (!["approved", "returned", "rejected"].includes(decision)) {
    return error("Keputusan tidak sah. Gunakan: approved, returned, atau rejected.", 422);
  }

  const existing = await db.draft.findUnique({ where: { id } });
  if (!existing) return error("Draf tidak dijumpai.", 404);
  if (existing.status !== "pending_review") {
    return error(
      `Keputusan hanya boleh dibuat bagi draf "Menunggu Semakan". Status semasa: ${existing.status}.`,
      409
    );
  }

  const updated = await db.draft.update({
    where: { id },
    data: { status: decision },
    include: DRAFT_INCLUDE,
  });

  const actionMap: Record<string, string> = {
    approved: "Draf diluluskan",
    returned: "Draf dikembalikan untuk pindaan",
    rejected: "Draf ditolak",
  };

  await logAudit({
    draftId: id,
    userId: userId || "system",
    userName: userName || "Senior Legal Officer",
    userRole: userRole || "SLO",
    action: actionMap[decision],
    details: note
      ? `${actionMap[decision]}. Nota: ${note}`
      : actionMap[decision],
  });

  return json({ draft: serialize(updated) });
}
