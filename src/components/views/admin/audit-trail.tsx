"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useRouterStore } from "@/stores/router";
import { GlassCard } from "@/components/glass-card";
import { RoleBadge } from "@/components/status-badges";
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
} from "@/components/views/shared/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { History, Search, X, ExternalLink, Filter } from "lucide-react";
import { formatDateTime, formatDate } from "@/lib/status";
import type { AuditLog, Role } from "@/lib/types";

interface AuditResponse {
  logs: AuditLog[];
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "unknown";
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function dayLabel(iso: string): string {
  const key = dayKey(iso);
  if (key === "unknown") return "Tarikh tidak diketahui";
  const today = new Date();
  const todayKey = today.toLocaleDateString("en-CA");
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const yestKey = yest.toLocaleDateString("en-CA");
  if (key === todayKey) return "Hari Ini";
  if (key === yestKey) return "Semalam";
  return formatDate(iso);
}

function roleDotClass(role: Role): string {
  switch (role) {
    case "BU":
      return "bg-teal-500";
    case "SLO":
      return "bg-violet-500";
    case "ADMIN":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

export function AuditTrailView() {
  const params = useRouterStore((s) => s.params);
  const navigate = useRouterStore((s) => s.navigate);
  const draftId = params.draftId;

  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = draftId
        ? `/api/audit?draftId=${encodeURIComponent(draftId)}&limit=200`
        : "/api/audit?limit=200";
      const res = await api<AuditResponse>(q);
      setLogs(res.logs || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuatkan jejak audit.");
    } finally {
      setLoading(false);
    }
    // re-fetch when draftId changes
  }, [draftId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      return (
        l.action.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        (l.details ?? "").toLowerCase().includes(q) ||
        l.userRole.toLowerCase().includes(q)
      );
    });
  }, [logs, search]);

  // Group by day
  const groups = React.useMemo(() => {
    const map = new Map<string, AuditLog[]>();
    for (const log of filtered) {
      const k = dayKey(log.timestamp);
      const arr = map.get(k) ?? [];
      arr.push(log);
      map.set(k, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: items.length ? dayLabel(items[0].timestamp) : key,
      items,
    }));
  }, [filtered]);

  function clearDraftFilter() {
    navigate("audit-trail");
  }

  return (
    <div>
      <PageHeader
        title="Jejak Audit"
        description={
          draftId
            ? "Log aktiviti untuk draf tertentu."
            : "Semua log aktiviti sistem mengikut urutan kronologi."
        }
        icon={History}
        backable
        actions={
          draftId ? (
            <Button variant="outline" size="sm" onClick={clearDraftFilter}>
              <X className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kosongkan Penapis</span>
              <span className="sm:hidden">Kosongkan</span>
            </Button>
          ) : undefined
        }
      />

      {/* Filters bar */}
      <GlassCard className="mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {draftId ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-100/70 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
              <Filter className="h-3 w-3" />
              Menapis ikut draf
              <button
                onClick={clearDraftFilter}
                className="ml-1 rounded-full p-0.5 hover:bg-amber-500/20"
                aria-label="Kosongkan penapis draf"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Menunjukkan semua log
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            · {filtered.length} rekod
          </span>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ikut tindakan atau pengguna..."
            className="h-9 pl-8 pr-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
              aria-label="Kosongkan carian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </GlassCard>

      {error && (
        <GlassCard className="mb-4 border-rose-300/60 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
          {error}{" "}
          <Button variant="ghost" size="sm" onClick={load} className="ml-2 h-7 px-2">
            Cuba semula
          </Button>
        </GlassCard>
      )}

      {loading ? (
        <LoadingBlock label="Memuatkan jejak audit..." />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={History}
          title={
            search
              ? "Tiada log yang sepadan dengan carian anda."
              : draftId
              ? "Tiada aktiviti direkodkan untuk draf ini."
              : "Tiada log audit lagi."
          }
          description={
            search
              ? "Cuba kata kunci lain atau kosongkan medan carian."
              : "Log akan muncul di sini apabila pengguna melakukan tindakan dalam sistem."
          }
          action={
            search ? (
              <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                Kosongkan carian
              </Button>
            ) : undefined
          }
        />
      ) : (
        <GlassCard className="p-4 sm:p-6">
          <div className="scroll-glass max-h-[70vh] overflow-y-auto pr-1">
            {groups.map((group, gi) => (
              <section key={group.key} className={gi > 0 ? "mt-6" : ""}>
                {/* Day separator */}
                <div className="sticky top-0 z-10 mb-3 flex items-center gap-3 bg-background/80 py-1 backdrop-blur">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    {group.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "entri" : "entri"}
                  </span>
                  <div className="ml-2 h-px flex-1 bg-border/60" />
                </div>

                {/* Timeline entries */}
                <ol className="relative">
                  {group.items.map((log, idx) => {
                    const isLast = idx === group.items.length - 1;
                    return (
                      <li key={log.id} className="relative flex gap-3 pb-4">
                        {/* connector */}
                        {!isLast && (
                          <span
                            className={
                              "absolute left-[7px] top-5 h-full w-px " +
                              roleConnectorClass(log.userRole)
                            }
                            aria-hidden
                          />
                        )}
                        {/* dot */}
                        <span
                          className={
                            "relative z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-2 ring-background " +
                            roleDotClass(log.userRole)
                          }
                          aria-label={log.userRole}
                        />
                        {/* content */}
                        <GlassCard
                          variant="default"
                          className="min-w-0 flex-1 px-3 py-2.5"
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-medium">
                              {log.userName}
                            </span>
                            <RoleBadge role={log.userRole} short />
                            <span className="text-[11px] text-muted-foreground">
                              {formatDateTime(log.timestamp)}
                            </span>
                            {log.draftId && (
                              <Button
                                variant="link"
                                size="sm"
                                className="ml-auto h-auto p-0 text-[11px] text-primary"
                                onClick={() =>
                                  navigate("draft-detail", {
                                    draftId: log.draftId!,
                                  })
                                }
                              >
                                Lihat draf
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-foreground">
                            {log.action}
                          </div>
                          {log.details && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {log.details}
                            </p>
                          )}
                        </GlassCard>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function roleConnectorClass(role: Role): string {
  switch (role) {
    case "BU":
      return "bg-teal-500/40";
    case "SLO":
      return "bg-violet-500/40";
    case "ADMIN":
      return "bg-rose-500/40";
    default:
      return "bg-border";
  }
}
