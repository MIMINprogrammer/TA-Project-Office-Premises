"use client";

import * as React from "react";
import {
  FileText,
  Send,
  Download,
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  ListChecks,
  ScrollText,
  Table2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { buildFivePartOutput, UNCONFIRMED_MARKER } from "@/lib/clause-engine";
import type {
  Draft,
  DraftClauseAmendment,
  FivePartOutput,
  LegalObservation,
} from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/status";
import { useAuthStore } from "@/stores/auth";
import { useRouterStore } from "@/stores/router";

import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badges";
import { DiffViewer } from "@/components/diff-viewer";
import {
  PageHeader,
  LoadingBlock,
  EmptyState,
  StatCard,
} from "@/components/views/shared/common";

export function AmendmentPreviewView() {
  const user = useAuthStore((s) => s.user);
  const params = useRouterStore((s) => s.params);
  const back = useRouterStore((s) => s.back);
  const navigate = useRouterStore((s) => s.navigate);

  const draftId = params.draftId;

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!draftId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ draft: Draft }>(`/api/drafts/${draftId}`);
      setDraft(res.draft);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuatkan draf.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const fivePart = React.useMemo<FivePartOutput | null>(() => {
    if (!draft?.amendments) return null;
    return buildFivePartOutput(draft.amendments);
  }, [draft]);

  const handleSubmit = async () => {
    if (!user || !draft) return;
    setSubmitting(true);
    try {
      const res = await api<{ draft: Draft }>(`/api/drafts/${draft.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
        }),
      });
      setDraft(res.draft);
      toast.success("Draf dihantar kepada SLO untuk semakan.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghantar draf.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (!user || !draft) return;
    setExporting(true);
    try {
      const res = await api<{
        draft: Draft;
        fivePart: FivePartOutput;
        exportedAt: string;
      }>(
        `/api/drafts/${draft.id}/export?userId=${encodeURIComponent(
          user.id
        )}&userName=${encodeURIComponent(user.name)}&userRole=${user.role}`
      );
      const html = buildExportHtml(res.draft, res.fivePart, res.exportedAt);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = (draft.title || "draf-pindaan")
        .replace(/[^a-zA-Z0-9-_ ]+/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
      a.download = `${safeTitle}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Dokumen akhir dimuat turun.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal mengeksport dokumen.";
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <LoadingBlock label="Memuatkan cadangan pindaan..." />;
  }

  if (!draft) {
    return (
      <div>
        <PageHeader title="Cadangan Pindaan" backable icon={FileText} />
        <EmptyState
          icon={FileWarning}
          title="Draf tidak dijumpai"
          description="Draf yang anda cari mungkin telah dipadam atau anda tidak mempunyai akses."
          action={
            <Button onClick={() => navigate("dashboard")}>
              Kembali ke Papan Pemuka
            </Button>
          }
        />
      </div>
    );
  }

  const canSubmit = draft.status === "draft" || draft.status === "returned";
  const isPending = draft.status === "pending_review";
  const isApproved = draft.status === "approved";

  return (
    <div className="pb-24">
      <PageHeader
        title={draft.title}
        description={`Templat: ${draft.template?.name ?? "—"} · Penyewa: ${
          draft.offerLetter?.tenantName || "Tanpa nama"
        }`}
        icon={FileText}
        backable
        actions={<StatusBadge status={draft.status} />}
      />

      {/* Meta info row */}
      <GlassCard className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>
            Dicipta:{" "}
            <span className="font-medium text-foreground/80">
              {formatDate(draft.createdDate)}
            </span>
          </span>
          <span>
            Dikemas kini:{" "}
            <span className="font-medium text-foreground/80">
              {formatDateTime(draft.lastUpdated)}
            </span>
          </span>
          <span>
            Pemajak:{" "}
            <span className="font-medium text-foreground/80">
              {draft.template?.landlordName || "—"}
            </span>
          </span>
          {draft.creator && (
            <span>
              Dibuat oleh:{" "}
              <span className="font-medium text-foreground/80">
                {draft.creator.name}
              </span>
            </span>
          )}
        </div>
      </GlassCard>

      {/* Tabs */}
      {fivePart && (
        <Tabs defaultValue="ringkasan" className="w-full">
          <div className="scroll-glass -mx-1 mb-4 overflow-x-auto px-1 pb-1">
            <TabsList className="h-auto w-max">
              <TabsTrigger value="ringkasan" className="gap-1.5">
                <ListChecks className="h-3.5 w-3.5" /> Ringkasan
              </TabsTrigger>
              <TabsTrigger value="semakan" className="gap-1.5">
                <ScrollText className="h-3.5 w-3.5" /> Semakan Klausa
              </TabsTrigger>
              <TabsTrigger value="dipinda" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Klausa Dipinda
              </TabsTrigger>
              <TabsTrigger value="pemerhatian" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Pemerhatian
              </TabsTrigger>
              <TabsTrigger value="jadual" className="gap-1.5">
                <Table2 className="h-3.5 w-3.5" /> Jadual
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ringkasan">
            <RingkasanTab fivePart={fivePart} draft={draft} />
          </TabsContent>
          <TabsContent value="semakan">
            <SemakanTab fivePart={fivePart} />
          </TabsContent>
          <TabsContent value="dipinda">
            <DipindaTab amendments={draft.amendments ?? []} />
          </TabsContent>
          <TabsContent value="pemerhatian">
            <PemerhatianTab fivePart={fivePart} />
          </TabsContent>
          <TabsContent value="jadual">
            <JadualTab fivePart={fivePart} />
          </TabsContent>
        </Tabs>
      )}

      {/* Sticky action bar */}
      <div className="sticky bottom-4 z-20 mt-6">
        <GlassCard variant="strong" className="p-3 sm:p-4">
          {canSubmit && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Pastikan semua cadangan pindaan disemak sebelum dihantar.{" "}
                  <span className="font-medium text-foreground">
                    Semua cadangan tertakluk kelulusan SLO.
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" onClick={back} disabled={submitting}>
                  Kembali
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Menghantar...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Hantar untuk Semakan SLO
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {isPending && (
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-muted-foreground">
                Draf dihantar untuk semakan SLO. Tidak boleh dipinda sehingga
                keputusan diterima.
              </p>
            </div>
          )}

          {isApproved && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm text-muted-foreground">
                  Draf ini telah diluluskan oleh SLO. Anda boleh memuat turun
                  dokumen akhir.
                </p>
              </div>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="shrink-0"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyediakan...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Muat Turun Dokumen Akhir
                  </>
                )}
              </Button>
            </div>
          )}

          {draft.status === "rejected" && (
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-muted-foreground">
                Draf ini telah ditolak oleh SLO. Sila hubungi peguam untuk
                maklumat lanjut.
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

/* ----------------------------- Tab: Ringkasan ----------------------------- */

function RingkasanTab({
  fivePart,
  draft,
}: {
  fivePart: FivePartOutput;
  draft: Draft;
}) {
  const s = fivePart.summary;
  const narrative = buildNarrative(s, draft);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label="Total Klausa"
          value={s.totalClauses}
          icon={ListChecks}
          accent="primary"
        />
        <StatCard
          label="Dipinda"
          value={s.amendedClauses}
          icon={FileText}
          accent="primary"
        />
        <StatCard
          label="Percanggahan"
          value={s.conflicts}
          icon={AlertTriangle}
          accent="rose"
        />
        <StatCard
          label="Maklumat Hilang"
          value={s.missingInfo}
          icon={FileWarning}
          accent="amber"
        />
        <StatCard
          label="Selari"
          value={s.aligned}
          icon={CheckCircle2}
          accent="emerald"
        />
      </div>

      <GlassCard className="p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Ringkasan Naratif</h3>
        </div>
        <Separator className="mb-3" />
        <p className="text-sm leading-relaxed text-foreground/90">{narrative}</p>

        {s.missingInfo > 0 && (
          <Alert className="mt-4 border-amber-300/60 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{s.missingInfo} klausa memerlukan pengesahan</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              Terdapat {s.missingInfo} klausa dengan medan bertanda{" "}
              <strong>{UNCONFIRMED_MARKER}</strong>. Sila sahkan maklumat tersebut
              sebelum menghantar kepada SLO.
            </AlertDescription>
          </Alert>
        )}
      </GlassCard>
    </div>
  );
}

function buildNarrative(
  s: FivePartOutput["summary"],
  draft: Draft
): string {
  const parts: string[] = [];
  parts.push(
    `Draf "${draft.title}" mengandungi ${s.totalClauses} klausa daripada templat ${
      draft.template?.name ?? "—"
    }.`
  );
  if (s.amendedClauses > 0) {
    parts.push(
      `Sebanyak ${s.amendedClauses} klausa memerlukan pindaan berdasarkan maklumat Surat Tawaran Penyewaan.`
    );
  } else {
    parts.push("Tiada pindaan diperlukan — semua klausa selari dengan Surat Tawaran.");
  }
  if (s.conflicts > 0) {
    parts.push(
      `${s.conflicts} percanggahan dikesan antara terma templat dan Surat Tawaran.`
    );
  }
  if (s.missingInfo > 0) {
    parts.push(
      `${s.missingInfo} klausa mempunyai maklumat yang tidak dinyatakan dalam Surat Tawaran dan akan ditandakan sebagai ${UNCONFIRMED_MARKER}.`
    );
  }
  if (s.aligned > 0) {
    parts.push(`${s.aligned} klausa selari dengan terma sedia ada.`);
  }
  return parts.join(" ");
}

/* --------------------------- Tab: Semakan Klausa -------------------------- */

function SemakanTab({ fivePart }: { fivePart: FivePartOutput }) {
  const items = fivePart.clauseReview;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Tiada klausa untuk disemak"
        description="Templat ini tidak mempunyai klausa yang perlu disemak."
      />
    );
  }
  return (
    <div className="scroll-glass max-h-[calc(100vh-22rem)] space-y-3 overflow-y-auto pr-1">
      {items.map((c) => (
        <GlassCard key={c.clauseNumber + c.title} className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[11px]">
                  {c.clauseNumber}
                </Badge>
                <h3 className="text-sm font-semibold">{c.title}</h3>
                <IssueBadge issue={c.issueIdentified} />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                {c.reasonForAmendment}
              </p>
              <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Rujukan:{" "}
                  <span className="text-foreground/70">
                    {c.offerLetterReference}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function IssueBadge({ issue }: { issue: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    selari: {
      label: "Selari",
      cls: "border-emerald-300/60 bg-emerald-100/70 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    percanggahan: {
      label: "Percanggahan",
      cls: "border-red-300/60 bg-red-100/70 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    },
    "ketiadaan maklumat": {
      label: "Ketiadaan Maklumat",
      cls: "border-amber-300/60 bg-amber-100/70 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    },
  };
  const cfg = map[issue] || {
    label: issue,
    cls: "border-border bg-muted/60 text-muted-foreground",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium " +
        cfg.cls
      }
    >
      {cfg.label}
    </span>
  );
}

/* ----------------------------- Tab: Dipinda ------------------------------ */

function DipindaTab({
  amendments,
}: {
  amendments: DraftClauseAmendment[];
}) {
  const toShow = amendments.filter((a) => a.clause);
  if (toShow.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Tiada klausa dipinda"
        description="Tiada cadangan pindaan klausa untuk draf ini."
      />
    );
  }
  return (
    <div className="space-y-4">
      <GlassCard variant="strong" className="p-3">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground sm:text-sm">
            Perbandingan side-by-side antara peruntukan asal templat dan cadangan
            pindaan. Bahagian yang ditonjolkan menunjukkan teks yang diubah suai.
            Tanda{" "}
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {UNCONFIRMED_MARKER}
            </span>{" "}
            memerlukan pengesahan Business Unit.
          </p>
        </div>
      </GlassCard>

      <div className="space-y-4">
        {toShow.map((a) => (
          <GlassCard key={a.id} className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">
                {a.clause?.clauseNumber}
              </Badge>
              <h3 className="text-sm font-semibold">{a.clause?.title}</h3>
              <IssueBadge issue={a.issueIdentified} />
            </div>
            <DiffViewer
              original={a.clause?.originalText ?? ""}
              amended={a.sloEditedText || a.amendedText}
            />
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- Tab: Pemerhatian --------------------------- */

function PemerhatianTab({ fivePart }: { fivePart: FivePartOutput }) {
  const obs = fivePart.legalObservations;
  if (obs.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Tiada pemerhatian undang-undang"
        description="Semua klausa selari dengan Surat Tawaran dan tiada isu undang-undang dikesan."
      />
    );
  }
  return (
    <div className="space-y-3">
      {obs.map((o, idx) => {
        const cfg = observationConfig(o);
        const Icon = cfg.icon;
        return (
          <Alert
            key={idx}
            className={
              "border " + cfg.borderCls + " " + cfg.bgCls
            }
          >
            <Icon className={"h-4 w-4 " + cfg.iconCls} />
            <AlertTitle className={cfg.titleCls}>
              <span className="font-mono text-[11px]">[{o.clauseNumber}]</span>{" "}
              {o.title}
              <span
                className={
                  "ml-2 rounded-full border px-2 py-0.5 text-[10px] font-medium " +
                  cfg.badgeCls
                }
              >
                {cfg.label}
              </span>
            </AlertTitle>
            <AlertDescription className={cfg.descCls}>
              {o.observation}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}

function observationConfig(o: LegalObservation): {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  borderCls: string;
  bgCls: string;
  iconCls: string;
  titleCls: string;
  descCls: string;
  badgeCls: string;
} {
  switch (o.type) {
    case "missing":
      return {
        label: "Maklumat Hilang",
        icon: FileWarning,
        borderCls: "border-amber-300/60",
        bgCls: "bg-amber-500/10",
        iconCls: "text-amber-600 dark:text-amber-400",
        titleCls: "text-amber-900 dark:text-amber-200",
        descCls: "text-amber-800 dark:text-amber-300",
        badgeCls:
          "border-amber-300/60 bg-amber-100/70 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
      };
    case "conflict":
      return {
        label: "Percanggahan",
        icon: AlertTriangle,
        borderCls: "border-red-300/60",
        bgCls: "bg-red-500/10",
        iconCls: "text-red-600 dark:text-red-400",
        titleCls: "text-red-900 dark:text-red-200",
        descCls: "text-red-800 dark:text-red-300",
        badgeCls:
          "border-red-300/60 bg-red-100/70 text-red-700 dark:bg-red-500/15 dark:text-red-300",
      };
    case "risk":
      return {
        label: "Risiko",
        icon: AlertCircle,
        borderCls: "border-orange-300/60",
        bgCls: "bg-orange-500/10",
        iconCls: "text-orange-600 dark:text-orange-400",
        titleCls: "text-orange-900 dark:text-orange-200",
        descCls: "text-orange-800 dark:text-orange-300",
        badgeCls:
          "border-orange-300/60 bg-orange-100/70 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
      };
    default:
      return {
        label: "Nota",
        icon: Info,
        borderCls: "border-primary/30",
        bgCls: "bg-primary/5",
        iconCls: "text-primary",
        titleCls: "text-foreground",
        descCls: "text-muted-foreground",
        badgeCls: "border-border bg-muted/60 text-muted-foreground",
      };
  }
}

/* ------------------------------ Tab: Jadual ----------------------------- */

function JadualTab({ fivePart }: { fivePart: FivePartOutput }) {
  const rows = fivePart.amendmentTable;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Table2}
        title="Tiada entri jadual"
        description="Tiada pindaan untuk dipaparkan dalam jadual."
      />
    );
  }
  return (
    <GlassCard className="p-0 sm:p-0">
      <div className="scroll-glass overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[60px] whitespace-nowrap font-mono text-[11px]">
                Klausa
              </TableHead>
              <TableHead className="min-w-[240px] whitespace-nowrap">
                Peruntukan Asal
              </TableHead>
              <TableHead className="min-w-[240px] whitespace-nowrap">
                Peruntukan Dipinda
              </TableHead>
              <TableHead className="min-w-[200px] whitespace-nowrap">
                Sebab Pindaan
              </TableHead>
              <TableHead className="min-w-[180px] whitespace-nowrap">
                Rujukan Surat Tawaran
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow
                key={idx}
                className="border-border/40 align-top"
              >
                <TableCell className="whitespace-nowrap font-mono text-[11px] font-medium">
                  {r.clauseNumber}
                </TableCell>
                <TableCell>
                  <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                    {r.originalProvision}
                  </p>
                </TableCell>
                <TableCell>
                  <p
                    className={
                      "max-w-md text-xs leading-relaxed " +
                      (r.amendedProvision.includes(UNCONFIRMED_MARKER)
                        ? "italic text-amber-700 dark:text-amber-400"
                        : "text-foreground")
                    }
                  >
                    {r.amendedProvision}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="max-w-md text-xs leading-relaxed text-foreground/80">
                    {r.reason}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {r.offerLetterReference}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </GlassCard>
  );
}

/* ---------------------------- Export HTML builder ----------------------------- */

function buildExportHtml(
  draft: Draft,
  fivePart: FivePartOutput,
  exportedAt: string
): string {
  const s = fivePart.summary;
  const escape = (str: string) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");

  const reviewRows = fivePart.clauseReview
    .map(
      (c) =>
        `<tr><td>${escape(c.clauseNumber)}</td><td>${escape(
          c.title
        )}</td><td>${escape(c.issueIdentified)}</td><td>${escape(
          c.reasonForAmendment
        )}</td><td>${escape(c.offerLetterReference)}</td></tr>`
    )
    .join("");

  const amendedSections = fivePart.amendedClauses
    .map(
      (a) =>
        `<section class="clause"><h3>Klausa ${escape(
          a.clauseNumber
        )} — ${escape(a.title)}</h3><div class="grid"><div><h4>Peruntukan Asal</h4><p>${escape(
          a.originalText
        )}</p></div><div><h4>Peruntukan Dipinda</h4><p>${escape(
          a.amendedText
        )}</p></div></div></section>`
    )
    .join("");

  const observations = fivePart.legalObservations
    .map(
      (o) =>
        `<li><strong>[${escape(o.clauseNumber)}] ${escape(
          o.title
        )}</strong> <em>(${escape(o.type)})</em><br/>${escape(o.observation)}</li>`
    )
    .join("");

  const tableRows = fivePart.amendmentTable
    .map(
      (r) =>
        `<tr><td>${escape(r.clauseNumber)}</td><td>${escape(
          r.originalProvision
        )}</td><td>${escape(r.amendedProvision)}</td><td>${escape(
          r.reason
        )}</td><td>${escape(r.offerLetterReference)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="utf-8"/>
<title>${escape(draft.title)} — Cadangan Pindaan Klausa</title>
<style>
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; max-width: 920px; margin: 0 auto; padding: 32px; }
  h1 { color: #047857; border-bottom: 3px solid #047857; padding-bottom: 8px; }
  h2 { color: #0f766e; margin-top: 32px; border-left: 4px solid #14b8a6; padding-left: 10px; }
  h3 { color: #065f46; margin-top: 16px; }
  h4 { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .meta { background: #f0fdfa; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #115e59; margin-bottom: 16px; }
  .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 16px 0; }
  .stat { background: #f0fdfa; padding: 12px; border-radius: 8px; text-align: center; }
  .stat .v { font-size: 22px; font-weight: 700; color: #047857; }
  .stat .l { font-size: 11px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px; vertical-align: top; text-align: left; }
  th { background: #f0fdfa; color: #047857; font-weight: 600; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
  .grid > div { background: #f9fafb; padding: 10px; border-radius: 6px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 10px; font-size: 13px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <h1>${escape(draft.title)}</h1>
  <div class="meta">
    <strong>Templat:</strong> ${escape(draft.template?.name ?? "—")} (v${
    draft.template?.version ?? "1.0"
  })<br/>
    <strong>Pemajak:</strong> ${escape(draft.template?.landlordName ?? "—")}<br/>
    <strong>Penyewa:</strong> ${escape(
      draft.offerLetter?.tenantName ?? "—"
    )}<br/>
    <strong>Status:</strong> ${escape(draft.status)}<br/>
    <strong>Tarikh Eksport:</strong> ${escape(formatDateTime(exportedAt))}
  </div>

  <h2>1. Ringkasan Pindaan</h2>
  <div class="stats">
    <div class="stat"><div class="v">${s.totalClauses}</div><div class="l">Total Klausa</div></div>
    <div class="stat"><div class="v">${s.amendedClauses}</div><div class="l">Dipinda</div></div>
    <div class="stat"><div class="v">${s.conflicts}</div><div class="l">Percanggahan</div></div>
    <div class="stat"><div class="v">${s.missingInfo}</div><div class="l">Maklumat Hilang</div></div>
    <div class="stat"><div class="v">${s.aligned}</div><div class="l">Selari</div></div>
  </div>

  <h2>2. Semakan Klausa demi Klausa</h2>
  <table>
    <thead><tr><th>Klausa</th><th>Tajuk</th><th>Isu</th><th>Sebab Pindaan</th><th>Rujukan</th></tr></thead>
    <tbody>${reviewRows}</tbody>
  </table>

  <h2>3. Klausa Dipinda (Side-by-side)</h2>
  ${amendedSections}

  <h2>4. Pemerhatian Undang-Undang</h2>
  ${
    observations
      ? `<ul>${observations}</ul>`
      : "<p>Tiada pemerhatian undang-undang.</p>"
  }

  <h2>5. Jadual Pindaan</h2>
  <table>
    <thead><tr><th>Klausa</th><th>Peruntukan Asal</th><th>Peruntukan Dipinda</th><th>Sebab</th><th>Rujukan Surat Tawaran</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer">
    Dokumen ini dijana oleh Sistem Semakan dan Pindaan Klausa Perjanjian Penyewaan · Pepper Labs Malaysia<br/>
    Semua cadangan tertakluk kelulusan Senior Legal Officer.
  </div>
</body>
</html>`;
}
