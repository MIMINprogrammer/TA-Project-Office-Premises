import { db } from "@/lib/db";
import { json, error, serialize } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET /api/templates — list templates (active by default; ?status=all to include archived)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "active";
  const withClauses = url.searchParams.get("clauses") === "true";

  const where = status === "all" ? {} : { status };
  const templates = await db.template.findMany({
    where,
    include: { clauses: withClauses ? { orderBy: { order: "asc" } } : false },
    orderBy: { createdAt: "desc" },
  });

  const result = await Promise.all(
    templates.map(async (t) => ({
      ...serialize(t),
      clauseCount: await db.templateClause.count({ where: { templateId: t.id } }),
      draftCount: await db.draft.count({ where: { templateId: t.id } }),
    }))
  );

  return json({ templates: result });
}

// POST /api/templates — create template (Admin) PRD §6.3 FR-25
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, version, landlordName, description, clauses } = body;
  if (!name) return error("Nama templat diperlukan.", 422);

  const template = await db.template.create({
    data: {
      name: String(name),
      version: String(version || "1.0"),
      landlordName: landlordName ? String(landlordName) : null,
      description: description ? String(description) : null,
      status: "active",
      clauses: {
        create: Array.isArray(clauses)
          ? clauses.map((c: any, i: number) => ({
              clauseNumber: String(c.clauseNumber ?? `${i + 1}`),
              title: String(c.title ?? ""),
              originalText: String(c.originalText ?? ""),
              mappedField: String(c.mappedField ?? "_standard"),
              order: i,
            }))
          : [],
      },
    },
    include: { clauses: { orderBy: { order: "asc" } } },
  });

  return json({ template: serialize(template) }, 201);
}
