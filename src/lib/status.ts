import type { DraftStatus, SLODecision, Role } from "./types";

// PRD §6.9, §10.1 — status colour coding
export const DRAFT_STATUS_CONFIG: Record<
  DraftStatus,
  { label: string; shortLabel: string; badgeClass: string; dotClass: string; icon: string }
> = {
  draft: {
    label: "Draf",
    shortLabel: "Draf",
    badgeClass:
      "bg-muted/70 text-muted-foreground border-border",
    dotClass: "bg-slate-400",
    icon: "FileText",
  },
  pending_review: {
    label: "Menunggu Semakan",
    shortLabel: "Menunggu",
    badgeClass:
      "bg-amber-100/80 text-amber-800 border-amber-300/60 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    dotClass: "bg-amber-500",
    icon: "Clock",
  },
  returned: {
    label: "Dikembalikan untuk Pindaan",
    shortLabel: "Dikembalikan",
    badgeClass:
      "bg-orange-100/80 text-orange-800 border-orange-300/60 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
    dotClass: "bg-orange-500",
    icon: "Undo2",
  },
  approved: {
    label: "Diluluskan",
    shortLabel: "Diluluskan",
    badgeClass:
      "bg-emerald-100/80 text-emerald-800 border-emerald-300/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    dotClass: "bg-emerald-500",
    icon: "CheckCircle2",
  },
  rejected: {
    label: "Ditolak",
    shortLabel: "Ditolak",
    badgeClass:
      "bg-red-100/80 text-red-700 border-red-300/60 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
    dotClass: "bg-red-500",
    icon: "XCircle",
  },
};

export const SLO_DECISION_CONFIG: Record<
  SLODecision,
  { label: string; badgeClass: string; icon: string }
> = {
  pending: {
    label: "Belum Disemak",
    badgeClass:
      "bg-muted/70 text-muted-foreground border-border",
    icon: "CircleDashed",
  },
  accepted: {
    label: "Diterima",
    badgeClass:
      "bg-emerald-100/80 text-emerald-800 border-emerald-300/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    icon: "Check",
  },
  edited: {
    label: "Dipinda SLO",
    badgeClass:
      "bg-sky-100/80 text-sky-800 border-sky-300/60 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
    icon: "Pencil",
  },
  rejected: {
    label: "Ditolak",
    badgeClass:
      "bg-red-100/80 text-red-700 border-red-300/60 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
    icon: "X",
  },
  needs_bu_input: {
    label: "Perlu Input BU",
    badgeClass:
      "bg-orange-100/80 text-orange-800 border-orange-300/60 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
    icon: "MessageSquareWarning",
  },
};

export const ROLE_CONFIG: Record<
  Role,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  BU: {
    label: "Business Unit",
    shortLabel: "BU",
    badgeClass:
      "bg-teal-100/80 text-teal-800 border-teal-300/60 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30",
  },
  SLO: {
    label: "Senior Legal Officer",
    shortLabel: "SLO",
    badgeClass:
      "bg-violet-100/80 text-violet-800 border-violet-300/60 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
  },
  ADMIN: {
    label: "Pentadbir Sistem",
    shortLabel: "Admin",
    badgeClass:
      "bg-rose-100/80 text-rose-800 border-rose-300/60 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  },
};

export const PRIORITY_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  normal: {
    label: "Biasa",
    badgeClass: "bg-muted/60 text-muted-foreground border-border",
  },
  high: {
    label: "Tinggi",
    badgeClass:
      "bg-amber-100/80 text-amber-800 border-amber-300/60 dark:bg-amber-500/15 dark:text-amber-300",
  },
  urgent: {
    label: "Segera",
    badgeClass:
      "bg-red-100/80 text-red-700 border-red-300/60 dark:bg-red-500/15 dark:text-red-300",
  },
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} minit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDate(iso);
}
