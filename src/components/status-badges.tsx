"use client";

import { cn } from "@/lib/utils";
import {
  DRAFT_STATUS_CONFIG,
  SLO_DECISION_CONFIG,
  ROLE_CONFIG,
  PRIORITY_CONFIG,
} from "@/lib/status";
import type { DraftStatus, SLODecision, Role } from "@/lib/types";
import * as LucideIcons from "lucide-react";

interface StatusBadgeProps {
  status: DraftStatus;
  short?: boolean;
  className?: string;
}

export function StatusBadge({ status, short, className }: StatusBadgeProps) {
  const cfg = DRAFT_STATUS_CONFIG[status];
  const Icon = (LucideIcons as any)[cfg.icon] || LucideIcons.Circle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cfg.badgeClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotClass)} />
      <Icon className="h-3 w-3" />
      {short ? cfg.shortLabel : cfg.label}
    </span>
  );
}

interface SLODecisionBadgeProps {
  decision: SLODecision;
  className?: string;
}

export function SLODecisionBadge({ decision, className }: SLODecisionBadgeProps) {
  const cfg = SLO_DECISION_CONFIG[decision];
  const Icon = (LucideIcons as any)[cfg.icon] || LucideIcons.Circle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cfg.badgeClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

interface RoleBadgeProps {
  role: Role;
  short?: boolean;
  className?: string;
}

export function RoleBadge({ role, short, className }: RoleBadgeProps) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cfg.badgeClass,
        className
      )}
    >
      {short ? cfg.shortLabel : cfg.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        cfg.badgeClass,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}
