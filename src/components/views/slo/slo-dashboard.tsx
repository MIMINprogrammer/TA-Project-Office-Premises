"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth";
import { useRouterStore } from "@/stores/router";
import {
  GlassCard,
} from "@/components/glass-card";
import {
  StatusBadge,
  PriorityBadge,
} from "@/components/status-badges";
import {
  PageHeader,
  StatCard,
  EmptyState,
  LoadingBlock,
} from "@/components/views/shared/common";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  CheckCircle2,
  Undo2,
  Timer,
  ArrowRight,
  Inbox,
  FileText,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime, timeAgo } from "@/lib/status";
import type { Draft } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types — match API contract from Task 4
// ---------------------------------------------------------------------------
interface DraftListItem extends Draft {
  template: NonNullable<Draft["template"]>;
  offerLetter: NonNullable<Draft["offerLetter"]>;
  creator: NonNullable<Draft["creator"]>;
  stats: {
    total: number;
    pending: number;
    accepted: number;
    edited: number;
    rejected: number;
    needsInput: number;
    missing: number;
  };
}

interface SLOStats {
  role: string;
  totalDrafts: number;
  pendingReview: number;
  returned: number;
  approved: number;
  rejected: number;
  draftStatus: number;
  avgReviewDays: number;
  recentAudit: Array<{
    id: string;
    draftId?: string | null;
    userId: string;
    userName: string;
    userRole: string;
    action: string;
    details?: string | null;
    timestamp: string;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
};

function priorityRank(p: string): number {
  return PRIORITY_RANK[p] ?? 3;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SLODashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useRouterStore((s) => s.navigate);

  const [stats, setStats] = React.useState<SLOStats | null>(null);
  const [pending, setPending] = React.useState<DraftListItem[]>([]);
  const [recent, setRecent] = React.useState<DraftListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, pendingRes, approvedRes, returnedRes] = await Promise.all([
        api<SLOStats>("/api/stats?role=SLO"),
        api<{ drafts: DraftListItem[] }>("/api/drafts?status=pending_review"),
        api<{ drafts: DraftListItem[] }>("/api/drafts?status=approved"),
        api<{ drafts: DraftListItem[] }>("/api/drafts?status=returned"),
      ]);
      setStats(statsRes);
      // Sort: urgent → high → normal, then oldest createdDate first
      const sorted = [...pendingRes.drafts].sort((a, b) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return (
          new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
        );
      });
      setPending(sorted);
      // Merge approved + returned, sort by lastUpdated desc, take 3
      const merged = [...approvedRes.drafts, ...returnedRes.drafts]
        .sort(
          (a, b) =>
            new Date(b.lastUpdated).getTime() -
            new Date(a.lastUpdated).getTime()
        )
        .slice(0, 3);
      setRecent(merged);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuatkan data.";
      setError(msg);
      toast.error("Gagal memuatkan papan pemuka SLO.", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading && !stats) {
    return <LoadingBlock label="Memuatkan Papan Pemuka SLO..." />;
  }

  if (error && !stats) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Papan Pemuka SLO"
          description="Selamat datang, Senior Legal Officer."
          icon={ScrollText}
        />
        <EmptyState
          icon={Inbox}
          title="Gagal memuatkan data"
          description={error}
          action={
            <Button onClick={load} variant="outline">
              Cuba Semula
            </Button>
          }
        />
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "Senior Legal Officer";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Papan Pemuka SLO"
        description={`Selamat datang, ${firstName}. Semak dan luluskan draf perjanjian penyewaan.`}
        icon={ScrollText}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Menunggu Semakan"
          value={stats?.pendingReview ?? 0}
          icon={Clock}
          accent="amber"
          trend="Perlu tindakan"
        />
        <StatCard
          label="Diluluskan"
          value={stats?.approved ?? 0}
          icon={CheckCircle2}
          accent="emerald"
          trend="Sepanjang masa"
        />
        <StatCard
          label="Dikembalikan"
          value={stats?.returned ?? 0}
          icon={Undo2}
          accent="rose"
          trend="Perlu pindaan BU"
        />
        <StatCard
          label="Tempoh Purata Semakan"
          value={`${stats?.avgReviewDays ?? 0}`}
          icon={Timer}
          accent="primary"
          trend="hari (draf diluluskan)"
        />
      </div>

      {/* Pending drafts */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Draf Menunggu Semakan
          </h2>
          <span className="text-sm text-muted-foreground">
            {pending.length} draf
          </span>
        </div>

        {pending.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Tiada draf menunggu semakan"
            description="Semua draf yang dihantar oleh Business Unit telah disemak. Kerja yang cemerlang!"
          />
        ) : (
          <div className="scroll-glass max-h-[36rem] space-y-3 overflow-y-auto pr-1">
            {pending.map((d) => (
              <PendingDraftCard
                key={d.id}
                draft={d}
                onReview={() => navigate("slo-review", { draftId: d.id })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recently approved / returned */}
      {recent.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Baru Diluluskan / Dikembalikan
            </h2>
            <span className="text-sm text-muted-foreground">3 terkini</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {recent.map((d) => (
              <GlassCard key={d.id} hover className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {d.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {d.template?.name ?? "—"}
                    </p>
                  </div>
                  <StatusBadge status={d.status} short />
                </div>
                <Separator className="my-3" />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Penyewa</span>
                    <span className="font-medium text-foreground">
                      {d.offerLetter?.tenantName || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dikemas kini</span>
                    <span className="font-medium text-foreground">
                      {timeAgo(d.lastUpdated)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 h-7 w-full justify-center gap-1 text-xs"
                  onClick={() => navigate("slo-review", { draftId: d.id })}
                >
                  Lihat Draf
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Recent audit quick view */}
      {stats?.recentAudit && stats.recentAudit.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Aktiviti Terkini
            </h2>
          </div>
          <GlassCard className="p-0">
            <div className="scroll-glass max-h-80 overflow-y-auto">
              <ul className="divide-y divide-border/60">
                {stats.recentAudit.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 p-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.details || "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {log.userName} · {formatDateTime(log.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending draft card
// ---------------------------------------------------------------------------
function PendingDraftCard({
  draft,
  onReview,
}: {
  draft: DraftListItem;
  onReview: () => void;
}) {
  const ol = draft.offerLetter;
  const s = draft.stats;
  const reviewed = s.total - s.pending;

  return (
    <GlassCard hover className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: identity */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold leading-tight">
              {draft.title}
            </h3>
            <PriorityBadge priority={draft.priority} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {draft.template?.name ?? "—"}
            </span>
            <span>·</span>
            <span>Penyewa: <span className="font-medium text-foreground">{ol?.tenantName || "—"}</span></span>
            <span>·</span>
            <span>Dicipta {formatDate(draft.createdDate)}</span>
          </div>
        </div>

        {/* Right: stats + CTA */}
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
          <div className="text-right">
            <div className="text-sm font-semibold">
              {s.total} klausa
            </div>
            <div className="text-[11px] text-muted-foreground">
              {reviewed} disemak · {s.pending} belum · {s.missing} maklumat BU
            </div>
          </div>
          <Button size="sm" onClick={onReview} className="gap-1">
            Semak
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
