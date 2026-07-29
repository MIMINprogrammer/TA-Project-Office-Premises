import { db } from "@/lib/db";
import { json, serialize } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET /api/stats — role-aware dashboard stats (PRD §6.6)
// ?role=BU|SLO|ADMIN  ?userId=...
export async function GET(req: Request) {
  const url = new URL(req.url);
  const role = url.searchParams.get("role") ?? "BU";
  const userId = url.searchParams.get("userId");

  const [
    totalDrafts,
    pendingReview,
    returned,
    approved,
    rejected,
    draftStatus,
    activeTemplates,
    totalTemplates,
    recentAudit,
  ] = await Promise.all([
    db.draft.count(),
    db.draft.count({ where: { status: "pending_review" } }),
    db.draft.count({ where: { status: "returned" } }),
    db.draft.count({ where: { status: "approved" } }),
    db.draft.count({ where: { status: "rejected" } }),
    db.draft.count({ where: { status: "draft" } }),
    db.template.count({ where: { status: "active" } }),
    db.template.count(),
    db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 8 }),
  ]);

  let myDrafts = 0;
  if (role === "BU" && userId) {
    myDrafts = await db.draft.count({ where: { createdBy: userId } });
  }

  // Average review time (approved drafts) — days between createdDate & lastUpdated
  const approvedDrafts = await db.draft.findMany({
    where: { status: "approved" },
    select: { createdDate: true, lastUpdated: true },
  });
  let avgReviewDays = 0;
  if (approvedDrafts.length) {
    const totalDays = approvedDrafts.reduce((sum, d) => {
      const ms = new Date(d.lastUpdated).getTime() - new Date(d.createdDate).getTime();
      return sum + Math.max(0, ms / 86400000);
    }, 0);
    avgReviewDays = Math.round((totalDays / approvedDrafts.length) * 10) / 10;
  }

  return json(
    serialize({
      role,
      totalDrafts,
      draftStatus,
      pendingReview,
      returned,
      approved,
      rejected,
      myDrafts,
      activeTemplates,
      totalTemplates,
      avgReviewDays,
      recentAudit,
    })
  );
}
