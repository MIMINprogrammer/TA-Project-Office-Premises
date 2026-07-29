import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Role } from "@/lib/types";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Serialize dates to ISO strings for API responses
export function serialize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export interface AuditInput {
  draftId?: string | null;
  userId: string;
  userName: string;
  userRole: Role | string;
  action: string;
  details?: string;
}

export async function logAudit(input: AuditInput) {
  try {
    return await db.auditLog.create({
      data: {
        draftId: input.draftId ?? null,
        userId: input.userId,
        userName: input.userName,
        userRole: input.userRole as string,
        action: input.action,
        details: input.details ?? null,
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
    return null;
  }
}

// Standard include for draft detail responses
export const DRAFT_INCLUDE = {
  template: { include: { clauses: { orderBy: { order: "asc" } as const } } },
  offerLetter: true,
  creator: true,
  amendments: {
    include: { clause: true, updater: true },
    orderBy: { updatedAt: "asc" } as const,
  },
} as const;
