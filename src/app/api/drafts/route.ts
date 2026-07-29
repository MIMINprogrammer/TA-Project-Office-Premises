import { db } from "@/lib/db";
import { json, error, serialize, logAudit } from "@/lib/server";
import { generateAmendments } from "@/lib/clause-engine";

export const dynamic = "force-dynamic";

// GET /api/drafts — list drafts (role-aware filters via query)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const createdBy = url.searchParams.get("createdBy");
  const role = url.searchParams.get("role");

  const where: any = {};
  if (status && status !== "all") where.status = status;
  if (createdBy) where.createdBy = createdBy;
  // SLO sees drafts pending their review + returned/approved for context
  if (role === "SLO") {
    // SLO dashboard wants pending_review primarily, but allow all for completeness
  }

  const drafts = await db.draft.findMany({
    where,
    include: {
      template: true,
      offerLetter: true,
      creator: true,
    },
    orderBy: { lastUpdated: "desc" },
  });

  // attach amendment stats
  const result = await Promise.all(
    drafts.map(async (d) => {
      const amendments = await db.draftClauseAmendment.findMany({
        where: { draftId: d.id },
      });
      const total = amendments.length;
      const pending = amendments.filter((a) => a.sloDecision === "pending").length;
      const accepted = amendments.filter((a) => a.sloDecision === "accepted").length;
      const edited = amendments.filter((a) => a.sloDecision === "edited").length;
      const rejected = amendments.filter((a) => a.sloDecision === "rejected").length;
      const needsInput = amendments.filter((a) => a.sloDecision === "needs_bu_input").length;
      const missing = amendments.filter((a) =>
        a.amendedText.includes("[Untuk Pengesahan Business Unit]")
      ).length;
      return {
        ...serialize(d),
        stats: { total, pending, accepted, edited, rejected, needsInput, missing },
      };
    })
  );

  return json({ drafts: result });
}

// POST /api/drafts — create draft + offer letter + auto-generate amendments (PRD §6.2, §6.4)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    templateId,
    title,
    createdBy,
    userName,
    userRole,
    priority = "normal",
    offerLetter,
  } = body;

  if (!templateId || !createdBy || !offerLetter) {
    return error("templateId, createdBy dan offerLetter diperlukan.", 422);
  }

  // Validate required offer-letter fields (PRD §6.2 FR-24) — missing → [Untuk Pengesahan BU]
  const template = await db.template.findUnique({
    where: { id: templateId },
    include: { clauses: { orderBy: { order: "asc" } } },
  });
  if (!template) return error("Templat tidak dijumpai.", 404);

  // Create offer letter (allow empty → engine marks as [Untuk Pengesahan Business Unit])
  const ol = await db.offerLetter.create({
    data: {
      tenantName: String(offerLetter.tenantName ?? ""),
      rentalRate: Number(offerLetter.rentalRate ?? 0),
      tenancyPeriod: String(offerLetter.tenancyPeriod ?? ""),
      commencementDate: String(offerLetter.commencementDate ?? ""),
      deposit: Number(offerLetter.deposit ?? 0),
      premisesUse: String(offerLetter.premisesUse ?? ""),
      maintenanceTerms: String(offerLetter.maintenanceTerms ?? ""),
      utilitiesTerms: String(offerLetter.utilitiesTerms ?? ""),
      renewalTerms: String(offerLetter.renewalTerms ?? ""),
      terminationTerms: String(offerLetter.terminationTerms ?? ""),
      defaultTerms: String(offerLetter.defaultTerms ?? ""),
      specialConditions: offerLetter.specialConditions
        ? String(offerLetter.specialConditions)
        : null,
    },
  });

  const draftTitle =
    title ||
    `Penyewaan — ${offerLetter.tenantName || "Tanpa Nama"} (${template.name.split(" — ")[0]})`;

  const draft = await db.draft.create({
    data: {
      title: draftTitle,
      templateId,
      offerLetterId: ol.id,
      createdBy,
      status: "draft",
      priority: String(priority),
    },
  });

  // Generate amendments via comparison engine (PRD §6.4 FR-28)
  const generated = generateAmendments(template.clauses, ol);
  if (generated.length) {
    await db.draftClauseAmendment.createMany({
      data: generated.map((g) => ({
        draftId: draft.id,
        clauseId: g.clauseId,
        issueIdentified: g.issueIdentified,
        reasonForAmendment: g.reasonForAmendment,
        offerLetterReference: g.offerLetterReference,
        amendedText: g.amendedText,
        sloDecision: "pending",
      })),
    });
  }

  await logAudit({
    draftId: draft.id,
    userId: createdBy,
    userName: userName || "Business Unit",
    userRole: userRole || "BU",
    action: "Draf dicipta",
    details: `Draf "${draftTitle}" dicipta dengan ${generated.length} cadangan pindaan.`,
  });
  await logAudit({
    draftId: draft.id,
    userId: createdBy,
    userName: userName || "Business Unit",
    userRole: userRole || "BU",
    action: "Cadangan pindaan dijana",
    details: `Sistem menjana ${generated.length} cadangan pindaan klausa.`,
  });

  const full = await db.draft.findUnique({
    where: { id: draft.id },
    include: {
      template: { include: { clauses: { orderBy: { order: "asc" } } } },
      offerLetter: true,
      creator: true,
      amendments: { include: { clause: true }, orderBy: { updatedAt: "asc" } },
    },
  });

  return json({ draft: serialize(full) }, 201);
}
