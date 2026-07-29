"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth";
import { useRouterStore } from "@/stores/router";
import { GlassCard } from "@/components/glass-card";
import { RoleBadge } from "@/components/status-badges";
import {
  PageHeader,
  StatCard,
  EmptyState,
  LoadingBlock,
} from "@/components/views/shared/common";
import { Button } from "@/components/ui/button";
import {
  FileStack,
  LayoutTemplate,
  FileText,
  Clock,
  ArrowRight,
  History,
  Activity,
} from "lucide-react";
import { formatDateTime, timeAgo } from "@/lib/status";
import type { AuditLog } from "@/lib/types";

interface AdminStats {
  totalDrafts: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  returned: number;
  draftStatus: number;
  activeTemplates: number;
  totalTemplates: number;
  avgReviewDays: number;
  recentAudit: AuditLog[];
}

interface TemplateRow {
  id: string;
  name: string;
  version: string;
  landlordName?: string | null;
  description?: string | null;
  status: "active" | "archived";
  clauseCount: number;
  draftCount: number;
  createdAt: string;
}

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useRouterStore((s) => s.navigate);

  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, tplRes] = await Promise.all([
        api<AdminStats>("/api/stats?role=ADMIN"),
        api<{ templates: TemplateRow[] }>("/api/templates?status=all"),
      ]);
      setStats(statsRes);
      setTemplates(tplRes.templates || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuatkan data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading && !stats) {
    return <LoadingBlock label="Memuatkan Papan Pemuka Pentadbir..." />;
  }

  const recentTemplates = templates.slice(0, 5);
  const recentAudit = stats?.recentAudit ?? [];

  return (
    <div>
      <PageHeader
        title="Papan Pemuka Pentadbir"
        description={
          user
            ? `Selamat datang kembali, ${user.name}. Pandangan keseluruhan sistem.`
            : "Pandangan keseluruhan sistem & jejak aktiviti."
        }
        icon={LayoutTemplate}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("audit-trail")}
            className="hidden sm:inline-flex"
          >
            <History className="mr-2 h-4 w-4" />
            Jejak Audit
          </Button>
        }
      />

      {error && (
        <GlassCard className="mb-6 border-rose-300/60 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
          {error}{" "}
          <Button variant="ghost" size="sm" onClick={load} className="ml-2 h-7 px-2">
            Cuba semula
          </Button>
        </GlassCard>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Templat Aktif"
          value={stats?.activeTemplates ?? 0}
          icon={LayoutTemplate}
          accent="emerald"
          trend="Aktif"
        />
        <StatCard
          label="Jumlah Templat"
          value={stats?.totalTemplates ?? 0}
          icon={FileStack}
          accent="primary"
          trend="Kesemua"
        />
        <StatCard
          label="Jumlah Draf"
          value={stats?.totalDrafts ?? 0}
          icon={FileText}
          accent="amber"
          trend="Kesemua peranan"
        />
        <StatCard
          label="Tempoh Purata Semakan"
          value={`${stats?.avgReviewDays ?? 0} hari`}
          icon={Clock}
          accent="violet"
          trend="Draf diluluskan"
        />
      </div>

      {/* Two-column layout */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Recent templates */}
        <GlassCard className="flex flex-col p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <LayoutTemplate className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold">Templat Terkini</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("templates")}
              className="h-8 text-primary"
            >
              Urus Semua Templat
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          {recentTemplates.length === 0 ? (
            <EmptyState
              icon={LayoutTemplate}
              title="Tiada templat lagi"
              description="Cipta templat klausa pertama anda untuk mula menjana draf perjanjian."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {recentTemplates.map((t) => (
                <li
                  key={t.id}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 transition-colors hover:bg-background/70"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {t.name}
                      </span>
                      <span className="shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        v{t.version}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{t.clauseCount} klausa</span>
                      <span>·</span>
                      <span>{t.draftCount} draf</span>
                      {t.landlordName && (
                        <>
                          <span className="hidden sm:inline">·</span>
                          <span className="hidden truncate sm:inline">
                            {t.landlordName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium " +
                      (t.status === "active"
                        ? "border-emerald-300/60 bg-emerald-100/70 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                        : "border-border bg-muted/60 text-muted-foreground")
                    }
                  >
                    {t.status === "active" ? "Aktif" : "Diarkibkan"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* Recent audit feed */}
        <GlassCard className="flex flex-col p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <Activity className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold">Aktiviti Terkini</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("audit-trail")}
              className="h-8 text-primary"
            >
              Lihat Jejak Audit Penuh
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          {recentAudit.length === 0 ? (
            <EmptyState
              icon={History}
              title="Tiada aktiviti direkodkan"
              description="Log audit akan muncul di sini apabila pengguna melakukan tindakan dalam sistem."
            />
          ) : (
            <ul className="relative flex flex-col gap-1">
              {recentAudit.slice(0, 6).map((log, idx) => (
                <li
                  key={log.id}
                  className="relative flex gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-background/40"
                >
                  {/* timeline dot */}
                  <div className="flex flex-col items-center">
                    <span
                      className={
                        "mt-1 h-2.5 w-2.5 rounded-full ring-2 ring-background " +
                        roleDotClass(log.userRole)
                      }
                    />
                    {idx < Math.min(recentAudit.length, 6) - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border/60" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium">{log.userName}</span>
                      <RoleBadge role={log.userRole} short />
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(log.timestamp)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm text-foreground/90">
                      {log.action}
                    </div>
                    {log.details && (
                      <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {log.details}
                      </div>
                    )}
                    <div className="mt-0.5 text-[10px] text-muted-foreground/80">
                      {formatDateTime(log.timestamp)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function roleDotClass(role: AuditLog["userRole"]): string {
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
