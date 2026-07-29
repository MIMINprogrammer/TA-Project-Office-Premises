import { db } from "@/lib/db";
import { json, error, serialize, logAudit } from "@/lib/server";

export const dynamic = "force-dynamic";

// POST /api/auth/login — PRD §6.1 (simulated auth against dummy users)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return error("E-mel dan kata laluan diperlukan.", 422);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.password !== password) {
    return error("E-mel atau kata laluan tidak sah.", 401);
  }

  await logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "Log masuk",
    details: `${user.name} (${user.role}) log masuk ke sistem.`,
  });

  return json({
    user: serialize({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    }),
  });
}
