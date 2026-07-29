"use client";

import * as React from "react";
import {
  ArrowLeft,
  FileText,
  Download,
  History,
  ScrollText,
  ListChecks,
  FileCheck2,
  AlertTriangle,
  Table2,
  Loader2,
  Scale,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth";
import { useRouterStore } from "@/stores/router";
import { buildFivePartOutput, UNCONFIRMED_MARKER } from "@/lib/clause-engine";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  DRAFT_STATUS_CONFIG,
} from "@/lib/status";
import type { Draft } from "@/lib/types";
import { GlassCard } from "@/components/glass-card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { DiffViewer } from "@/components/diff-viewer";
import { PageHeader, LoadingBlock, StatCard, EmptyState } from "@/components/views/shared/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type IssueKind = "selari" | "percanggahan" | "ketiadaan maklumat";
const ISSUE_STYLE: Record<IssueKind, { label: string; cls: string }> = {
  selari: {
    label: "Selari",
    cls: "bg-emerald-100/70 text-emerald-800 border-emerald-300/60 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  percanggahan: {
    label: "Percanggahan",
    cls: "bg-red-100/70 text-red-700 border-red-300/60 dark:bg-red-500/15 dark:text-red-300",
  },
  "ketiadaan maklumat": {
    label: "Maklumat Hilang",
    cls: "bg-amber-100/70 text-amber-800 border-amber-300/60 dark:bg-amber-500/15 dark:text-amber-300",
  },
};

export function DraftDetailView() {
  const { params, back, navigate } = useRouterStore();
  const user = useAuthStore((s) => s.user);
  const draftId = params.draftId;
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    if (!draftId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<{ draft: Draft }>(`/api/drafts/${draftId}`)
      .then((res) => active && setDraft(res.draft))
      .catch(() => active && toast.error("Gagal memuatkan draf."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [draftId]);

  if (loading) return <LoadingBlock label="Memuatkan butiran draf..." />;
  if (!draft)
    return (
      <EmptyState
        icon={FileText}
        title="Draf tidak dijumpai"
        description="Draf mungkin telah dipadam atau anda tiada akses."
        action={
          <Button onClick={() => navigate("dashboard")}>kembali ke Papan Pemuka</Button>
        }
      />
    );

  const fivePart = buildFivePartOutput(draft.amendments || []);
  const isApproved = draft.status === "approved";
  const canExport = isApproved;

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api<{
        draft: Draft;
        fivePart: typeof fivePart;
        exportedAt: string;
      }>(`/api/drafts/${draft.id}/export?userId=${user?.id}&userName=${encodeURIComponent(user?.name || "")}&userRole=${user?.role}`);
      const fp = res.fivePart;
      const lines: string[] = [];
      lines.push("PEPPER LABS — DRAF PERJANJIAN PENYEWAAN (DILULUSKAN)");
      lines.push("=".repeat(60));
      lines.push(`Tajuk: ${res.draft.title}`);
      lines.push(`Templat: ${res.draft.template?.name}`);
      lines.push(`Penyewa: ${res.draft.offerLetter?.tenantName}`);
      lines.push(`Tarikh Eksport: ${formatDateTime(res.exportedAt)}`);
      lines.push("");
      lines.push("(A) RINGKASAN PINDAAN");
      lines.push("-".repeat(60));
      lines.push(`Jumlah Klausa: ${fp.summary.totalClauses}`);
      lines.push(`Dipinda: ${fp.summary.amendedClauses}`);
      lines.push(`Percanggahan: ${fp.summary.conflicts}`);
      lines.push(`Maklumat Hilang: ${fp.summary.missingInfo}`);
      lines.push(`Selari: ${fp.summary.aligned}`);
      lines.push("");
      lines.push("(B) SEMAKAN KLAUSA DEMI KLAUSA");
      lines.push("-".repeat(60));
      fp.clauseReview.forEach((c) => {
        lines.push(`Klausa ${c.clauseNumber} — ${c.title}`);
        lines.push(`  Isu: ${c.issueIdentified}`);
        lines.push(`  Sebab: ${c.reasonForAmendment}`);
        lines.push(`  Rujukan: ${c.offerLetterReference}`);
        lines.push("");
      });
      lines.push("(C) KLAUSA DIPINDA");
      lines.push("-".repeat(60));
      fp.amendedClauses.forEach((c) => {
        lines.push(`Klausa ${c.clauseNumber} — ${c.title}`);
        lines.push(`  Asal: ${c.originalText}`);
        lines.push(`  Dipinda: ${c.amendedText}`);
        lines.push("");
      });
      lines.push("(D) PEMERHATIAN UNDANG-UNDANG");
      lines.push("-".repeat(60));
      if (fp.legalObservations.length === 0)
        lines.push("Tiada pemerhatian khusus.");
      fp.legalObservations.forEach((o) => {
        lines.push(`[${o.type.toUpperCase()}] Klausa ${o.clauseNumber} — ${o.title}`);
        lines.push(`  ${o.observation}`);
        lines.push("");
      });
      lines.push("(E) JADUAL PINDAAN");
      lines.push("-".repeat(60));
      fp.amendmentTable.forEach((r) => {
        lines.push(`Klausa ${r.clauseNumber} — ${r.title}`);
        lines.push(`  Peruntukan Asal: ${r.originalProvision}`);
        lines.push(`  Peruntukan Dipinda: ${r.amendedProvision}`);
        lines.push(`  Sebab: ${r.reason}`);
        lines.push(`  Rujukan: ${r.offerLetterReference}`);
        lines.push("");
      });
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${res.draft.title.replace(/[^a-z0-9]+/gi, "-")}-diluluskan.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dokumen akhir dimuat turun.");
    } catch (e: any) {
      toast.error(e.message || "Eksport gagal.");
    } finally {
      setExporting(false);
    }
  };

  const ol = draft.offerLetter;
  const statusCfg = DRAFT_STATUS_CONFIG[draft.status as keyof typeof DRAFT_STATUS_CONFIG];

  return (
    <div>
      <PageHeader
        title={draft.title}
        description={`${draft.template?.name ?? "Templat"} · Penyewa: ${ol?.tenantName ?? "—"}`}
        icon={FileText}
        backable
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={draft.status as any} />
            <PriorityBadge priority={draft.priority} />
          </div>
        }
      />

      {/* Read-only notice */}
      <GlassCard variant="primary" className="mb-5 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Scale className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <div className="font-medium">
              Paparan baca-sahaja — draf telah dihantar untuk semakan SLO.
            </div>
            <div className="mt-0.5 text-muted-foreground">
              Status semasa: <span className="font-medium">{statusCfg.label}</span>. Sebarang
              pindaan selanjutnya dikawal oleh SLO. Cadangan tertakluk kelulusan SLO.
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Meta + offer letter summary */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-4 lg:col-span-1">
          <div className="mb-3 text-sm font-semibold">Maklumat Draf</div>
          <dl className="space-y-2 text-sm">
            <Row label="Dicipta oleh" value={draft.creator?.name ?? "—"} />
            <Row label="Tarikh dicipta" value={formatDate(draft.createdDate)} />
            <Row label="Kemas kini terakhir" value={formatDateTime(draft.lastUpdated)} />
            <Row label="Tuan Tanah" value={draft.template?.landlordName ?? "—"} />
          </dl>
          <Separator className="my-3" />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate("audit-trail", { draftId: draft.id })}
          >
            <History className="h-4 w-4" /> Lihat Jejak Audit
          </Button>
        </GlassCard>

        {ol && (
          <GlassCard className="p-4 lg:col-span-2">
            <div className="mb-3 text-sm font-semibold">Ringkasan Surat Tawaran Penyewaan</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Row label="Nama Penyewa" value={ol.tenantName} />
              <Row label="Kadar Sewa" value={formatCurrency(ol.rentalRate)} />
              <Row label="Tempoh" value={`${ol.tenancyPeriod} bulan`} />
              <Row label="Tarikh Kuat Kuasa" value={formatDate(ol.commencementDate)} />
              <Row label="Deposit" value={formatCurrency(ol.deposit)} />
              <Row label="Kegunaan Premis" value={ol.premisesUse} />
            </div>
          </GlassCard>
        )}
      </div>

      {/* Export action for approved drafts */}
      {canExport && (
        <div className="mb-5 flex justify-end">
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Muat Turun Dokumen Akhir
          </Button>
        </div>
      )}

      {/* 5-part output (read-only) */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="mb-4 flex w-full max-w-full overflow-x-auto">
          <TabsTrigger value="summary"><ListChecks className="mr-1.5 h-3.5 w-3.5" /> Ringkasan</TabsTrigger>
          <TabsTrigger value="review"><ScrollText className="mr-1.5 h-3.5 w-3.5" /> Semakan Klausa</TabsTrigger>
          <TabsTrigger value="amended"><FileCheck2 className="mr-1.5 h-3.5 w-3.5" /> Klausa Dipinda</TabsTrigger>
          <TabsTrigger value="observations"><AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Pemerhatian</TabsTrigger>
          <TabsTrigger value="table"><Table2 className="mr-1.5 h-3.5 w-3.5" /> Jadual</TabsTrigger>
        </TabsList>

        {/* (A) Ringkasan */}
        <TabsContent value="summary">
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                (A) Ringkasan Pindaan
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Jumlah Klausa" value={fivePart.summary.totalClauses} icon={FileText} accent="primary" />
              <StatCard label="Dipinda" value={fivePart.summary.amendedClauses} icon={FileCheck2} accent="amber" />
              <StatCard label="Percanggahan" value={fivePart.summary.conflicts} icon={AlertTriangle} accent="rose" />
              <StatCard label="Maklumat Hilang" value={fivePart.summary.missingInfo} icon={AlertTriangle} accent="amber" />
              <StatCard label="Selari" value={fivePart.summary.aligned} icon={FileCheck2} accent="emerald" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Draf ini mengandungi {fivePart.summary.totalClauses} klausa. Sebanyak{" "}
              {fivePart.summary.amendedClauses} klausa memerlukan pindaan berdasarkan Surat
              Tawaran Penyewaan. {fivePart.summary.missingInfo > 0 && `${fivePart.summary.missingInfo} klausa memerlukan pengesahan Business Unit. `}
              {fivePart.summary.conflicts > 0 && `${fivePart.summary.conflicts} percanggahan dikenal pasti.`}
            </p>
          </GlassCard>
        </TabsContent>

        {/* (B) Semakan Klausa demi Klausa */}
        <TabsContent value="review">
          <GlassCard className="p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              (B) Semakan Klausa demi Klausa
            </h3>
            <div className="space-y-3">
              {fivePart.clauseReview.map((c) => {
                const issue = (c.issueIdentified as IssueKind) || "selari";
                const style = ISSUE_STYLE[issue] || ISSUE_STYLE.selari;
                return (
                  <div key={c.clauseNumber} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono">{c.clauseNumber}</Badge>
                      <span className="text-sm font-medium">{c.title}</span>
                      <Badge variant="outline" className={style.cls}>{style.label}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div><span className="font-medium text-foreground">Sebab:</span> {c.reasonForAmendment}</div>
                      <div className="mt-0.5"><span className="font-medium text-foreground">Rujukan:</span> {c.offerLetterReference}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </TabsContent>

        {/* (C) Klausa Dipinda */}
        <TabsContent value="amended">
          <GlassCard className="p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              (C) Klausa Dipinda
            </h3>
            <div className="space-y-4">
              {fivePart.amendedClauses.map((c) => (
                <div key={c.clauseNumber}>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">{c.clauseNumber}</Badge>
                    <span className="text-sm font-medium">{c.title}</span>
                  </div>
                  <DiffViewer original={c.originalText} amended={c.amendedText} compact />
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        {/* (D) Pemerhatian Undang-Undang */}
        <TabsContent value="observations">
          <GlassCard className="p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              (D) Pemerhatian Undang-Undang
            </h3>
            {fivePart.legalObservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tiada pemerhatian khusus.</p>
            ) : (
              <div className="space-y-3">
                {fivePart.legalObservations.map((o, i) => {
                  const color =
                    o.type === "missing"
                      ? "border-amber-300/60 bg-amber-50/60 dark:bg-amber-500/10"
                      : o.type === "conflict"
                      ? "border-red-300/60 bg-red-50/60 dark:bg-red-500/10"
                      : "border-primary/30 bg-primary/5";
                  return (
                    <div key={i} className={`rounded-xl border p-3 ${color}`}>
                      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Klausa {o.clauseNumber} — {o.title}
                      </div>
                      <p className="text-sm text-muted-foreground">{o.observation}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* (E) Jadual Pindaan */}
        <TabsContent value="table">
          <GlassCard className="p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              (E) Jadual Pindaan
            </h3>
            <div className="overflow-x-auto scroll-glass">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Klausa</th>
                    <th className="px-3 py-2">Peruntukan Asal</th>
                    <th className="px-3 py-2">Peruntukan Dipinda</th>
                    <th className="px-3 py-2">Sebab Pindaan</th>
                    <th className="px-3 py-2">Rujukan Surat Tawaran</th>
                  </tr>
                </thead>
                <tbody>
                  {fivePart.amendmentTable.map((r) => (
                    <tr key={r.clauseNumber} className="border-b border-border/40 align-top">
                      <td className="px-3 py-2 font-mono text-xs">{r.clauseNumber}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.originalProvision}</td>
                      <td className="px-3 py-2 font-medium">
                        {r.amendedProvision.includes(UNCONFIRMED_MARKER) ? (
                          <span className="diff-placeholder">{r.amendedProvision}</span>
                        ) : (
                          r.amendedProvision
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.reason}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.offerLetterReference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}
