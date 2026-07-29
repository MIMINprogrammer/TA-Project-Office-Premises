import { db } from "@/lib/db";
import { json, error, serialize, logAudit } from "@/lib/server";
import { buildFivePartOutput } from "@/lib/clause-engine";

export const dynamic = "force-dynamic";

// GET /api/drafts/[id]/export — generate export payload (5-part structure) PRD §6.8 FR-43,44
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = await db.draft.findUnique({
    where: { id },
    include: {
      template: true,
      offerLetter: true,
      creator: true,
      amendments: { include: { clause: true }, orderBy: { updatedAt: "asc" } },
    },
  });
  if (!draft) return error("Draf tidak dijumpai.", 404);

  const fivePart = buildFivePartOutput(draft.amendments);

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") || draft.createdBy;
  const userName = url.searchParams.get("userName") || draft.creator?.name || "Pengguna";
  const userRole = url.searchParams.get("userRole") || "BU";

  await logAudit({
    draftId: id,
    userId,
    userName,
    userRole,
    action: "Dokumen akhir dieksport",
    details: `Draf akhir "${draft.title}" dieksport dalam format 5-bahagian.`,
  });

  return json({
    draft: serialize(draft),
    fivePart,
    exportedAt: new Date().toISOString(),
  });
}
