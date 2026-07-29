"use client";

import * as React from "react";
import {
  FileText,
  FilePlus2,
  Clock,
  Undo2,
  CheckCircle2,
  ChevronRight,
  SearchX,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import type { Draft, DraftStatus } from "@/lib/types";
import { timeAgo } from "@/lib/status";
import { useAuthStore } from "@/stores/auth";
import { useRouterStore } from "@/stores/router";

import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import {
  PageHeader,
  EmptyState,
  StatCard,
  LoadingBlock,
} from "@/components/views/shared/common";

interface BUStats {
  totalDrafts: number;
  draftStatus: number;
  pendingReview: number;
  returned: number;
  approved: number;
  rejected: number;
  myDrafts: number;
  activeTemplates: number;
  totalTemplates: number;
  avgReviewDays: number;
}

interface DraftListItem extends Draft {
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

type StatusFilter = "all" | DraftStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draf" },
  { value: "pending_review", label: "Menunggu" },
  { value: "returned", label: "Dikembalikan" },
  { value: "approved", label: "Diluluskan" },
];

export function BUDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useRouterStore((s) => s.navigate);

  const [stats, setStats] = React.useState<BUStats | null>(null);
  const [drafts, setDrafts] = React.useState<DraftListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [query, setQuery] = React.useState("");

  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [statsRes, draftsRes] = await Promise.all([
        api<BUStats>(`/api/stats?role=BU&userId=${encodeURIComponent(user.id)}`),
        api<{ drafts: DraftListItem[] }>(
          `/api/drafts?createdBy=${encodeURIComponent(user.id)}&status=all`
        ),
      ]);
      setStats(statsRes);
      setDrafts(draftsRes.drafts || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuatkan data.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    let list = drafts;
    if (filter !== "all") list = list.filter((d) => d.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.template?.name?.toLowerCase().includes(q) ||
          d.offerLetter?.tenantName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [drafts, filter, query]);

  const handleOpen = (draft: DraftListItem) => {
    if (draft.status === "draft" || draft.status === "returned") {
      navigate("amendment-preview", { draftId: draft.id });
    } else {
      navigate("draft-detail", { draftId: draft.id });
    }
  };

  if (loading || !user) {
    return <LoadingBlock label="Memuatkan Papan Pemuka Business Unit..." />;
  }

  return (
    <div>
      <PageHeader
        title="Papan Pemuka"
        description={`Selamat datang, ${user.name}`}
        icon={FileText}
        actions={
          <Button onClick={() => navigate("create-draft")}>
            <FilePlus2 className="h-4 w-4" /> Cipta Draf Baharu
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Draf Saya"
          value={stats?.myDrafts ?? 0}
          icon={FileText}
          accent="primary"
          trend="Jumlah draf"
        />
        <StatCard
          label="Menunggu Semakan"
          value={stats?.pendingReview ?? 0}
          icon={Clock}
          accent="amber"
          trend="Sedang disemak SLO"
        />
        <StatCard
          label="Dikembalikan"
          value={stats?.returned ?? 0}
          icon={Undo2}
          accent="rose"
          trend="Perlu tindakan"
        />
        <StatCard
          label="Diluluskan"
          value={stats?.approved ?? 0}
          icon={CheckCircle2}
          accent="emerald"
          trend="Siap diluluskan"
        />
      </div>

      {/* Filters + search */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="scroll-glass -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {STATUS_FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground")
                }
              >
                {f.label}
                {f.value !== "all" && (
                  <span
                    className={
                      "rounded-full px-1.5 text-[10px] " +
                      (active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {drafts.filter((d) => d.status === f.value).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64">
          <SearchX className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari draf / penyewa..."
            className="h-9 pl-9"
          />
        </div>
      </div>

      {/* Draft list */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={drafts.length === 0 ? "Belum ada draf" : "Tiada draf dijumpai"}
            description={
              drafts.length === 0
                ? "Cipta draf baharu untuk mula menyemak klausa perjanjian penyewaan."
                : "Cuba ubah penapis atau kata carian anda."
            }
            action={
              drafts.length === 0 ? (
                <Button onClick={() => navigate("create-draft")}>
                  <FilePlus2 className="h-4 w-4" /> Cipta Draf Baharu
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="scroll-glass max-h-[calc(100vh-22rem)] space-y-3 overflow-y-auto pr-1">
            {filtered.map((d) => (
              <DraftCard key={d.id} draft={d} onOpen={() => handleOpen(d)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  onOpen,
}: {
  draft: DraftListItem;
  onOpen: () => void;
}) {
  const missing = draft.stats?.missing ?? 0;
  const pending = draft.stats?.pending ?? 0;
  return (
    <GlassCard hover onClick={onOpen} className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">
              {draft.title}
            </h3>
            <StatusBadge status={draft.status} short />
            <PriorityBadge priority={draft.priority} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="truncate">
              Templat:{" "}
              <span className="font-medium text-foreground/80">
                {draft.template?.name ?? "—"}
              </span>
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              Penyewa:{" "}
              <span className="font-medium text-foreground/80">
                {draft.offerLetter?.tenantName || "Tanpa nama"}
              </span>
            </span>
            <span className="hidden sm:inline">·</span>
            <span>Dikemas kini {timeAgo(draft.lastUpdated)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {missing > 0 && (
              <Badge
                variant="outline"
                className="border-amber-300/60 bg-amber-100/70 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
              >
                <AlertCircle className="mr-1 h-3 w-3" />
                {missing} pindaan belum disahkan
              </Badge>
            )}
            {missing === 0 && pending > 0 && draft.status !== "approved" && (
              <Badge variant="outline" className="text-muted-foreground">
                {pending} menunggu semakan SLO
              </Badge>
            )}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
      </div>
    </GlassCard>
  );
}
