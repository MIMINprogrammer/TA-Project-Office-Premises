import { db } from "@/lib/db";
import { json, error, serialize, logAudit, DRAFT_INCLUDE } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET /api/drafts/[id] — full draft detail with amendments + clauses
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = await db.draft.findUnique({
    where: { id },
    include: DRAFT_INCLUDE,
  });
  if (!draft) return error("Draf tidak dijumpai.", 404);
  return json({ draft: serialize(draft) });
}

// PATCH /api/drafts/[id] — update draft (title, priority, status direct)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, priority, status, userId, userName, userRole } = body;

  const existing = await db.draft.findUnique({ where: { id } });
  if (!existing) return error("Draf tidak dijumpai.", 404);

  const updated = await db.draft.update({
    where: { id },
    data: {
      title: title !== undefined ? String(title) : undefined,
      priority: priority !== undefined ? String(priority) : undefined,
      status: status !== undefined ? String(status) : undefined,
    },
    include: DRAFT_INCLUDE,
  });

  if (status && status !== existing.status) {
    await logAudit({
      draftId: id,
      userId: userId || "system",
      userName: userName || "Sistem",
      userRole: userRole || "BU",
      action: "Status draf dikemas kini",
      details: `Status bertukar dari ${existing.status} → ${status}.`,
    });
  }

  return json({ draft: serialize(updated) });
}
