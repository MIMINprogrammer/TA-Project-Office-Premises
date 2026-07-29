import { db } from "@/lib/db";
import { json, error, serialize, logAudit } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET /api/templates/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = await db.template.findUnique({
    where: { id },
    include: { clauses: { orderBy: { order: "asc" } } },
  });
  if (!template) return error("Templat tidak dijumpai.", 404);
  return json({ template: serialize(template) });
}

// PUT /api/templates/[id] — update template metadata + clauses (Admin)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, version, landlordName, description, status, clauses, userId, userName, userRole } = body;

  const existing = await db.template.findUnique({ where: { id } });
  if (!existing) return error("Templat tidak dijumpai.", 404);

  if (Array.isArray(clauses)) {
    await db.templateClause.deleteMany({ where: { templateId: id } });
    if (clauses.length) {
      await db.templateClause.createMany({
        data: clauses.map((c: any, i: number) => ({
          templateId: id,
          clauseNumber: String(c.clauseNumber ?? `${i + 1}`),
          title: String(c.title ?? ""),
          originalText: String(c.originalText ?? ""),
          mappedField: String(c.mappedField ?? "_standard"),
          order: i,
        })),
      });
    }
  }

  const updated = await db.template.update({
    where: { id },
    data: {
      name: name !== undefined ? String(name) : undefined,
      version: version !== undefined ? String(version) : undefined,
      landlordName: landlordName !== undefined ? String(landlordName) : undefined,
      description: description !== undefined ? String(description) : undefined,
      status: status !== undefined ? String(status) : undefined,
    },
    include: { clauses: { orderBy: { order: "asc" } } },
  });

  await logAudit({
    userId: userId || "system",
    userName: userName || "Sistem",
    userRole: userRole || "ADMIN",
    action: "Templat dikemas kini",
    details: `Templat "${updated.name}" (v${updated.version}) dikemas kini.`,
  });

  return json({ template: serialize(updated) });
}

// DELETE /api/templates/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") || "system";
  const userName = url.searchParams.get("userName") || "Sistem";
  const userRole = url.searchParams.get("userRole") || "ADMIN";

  const t = await db.template.findUnique({ where: { id } });
  if (!t) return error("Templat tidak dijumpai.", 404);

  await db.template.delete({ where: { id } });

  await logAudit({
    userId,
    userName,
    userRole,
    action: "Templat dipadam",
    details: `Templat "${t.name}" dipadam.`,
  });

  return json({ ok: true });
}
