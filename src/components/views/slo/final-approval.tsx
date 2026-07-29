"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth";
import { useRouterStore } from "@/stores/router";
import { GlassCard } from "@/components/glass-card";
import {
  StatusBadge,
  SLODecisionBadge,
} from "@/components/status-badges";
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  StatCard,
} from "@/components/views/shared/common";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Gavel,
  ArrowLeft,
  CheckCircle2,
  Undo2,
  XCircle,
  AlertTriangle,
  History,
  Loader2,
  Building2,
  FileText,
  Scale,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/status";
import type {
  Draft,
  DraftClauseAmendment,
  TemplateClause,
  OfferLetter,
  SLODecision,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Types — exact API contract
// ---------------------------------------------------------------------------
interface DraftDetail extends Draft {
  template: NonNullable<Draft["template"]> & {
    clauses: TemplateClause[];
  };
  offerLetter: NonNullable<OfferLetter>;
  creator: NonNullable<Draft["creator"]>;
  amendments: (DraftClauseAmendment & { clause: TemplateClause })[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clauseNumberCompare(a: string, b: string): number {
  const pa = String(a).split(/[.\s]/);
  const pb = String(b).split(/[.\s]/);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i] ?? "", 10);
    const nb = parseInt(pb[i] ?? "", 10);
    if (isNaN(na) && isNaN(nb)) return String(a).localeCompare(String(b));
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    if (na !== nb) return na - nb;
  }
  return String(a).localeCompare(String(b));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function FinalApprovalView() {
  const params = useRouterStore((s) => s.params);
  const back = useRouterStore((s) => s.back);
  const navigate = useRouterStore((s) => s.navigate);
  const user = useAuthStore((s) => s.user);

  const draftId = params.draftId;

  const [draft, setDraft] = React.useState<DraftDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState<
    null | "approved" | "returned" | "rejected"
  >(null);

  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!draftId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ draft: DraftDetail }>(`/api/drafts/${draftId}`);
      setDraft(res.draft);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuatkan draf.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const submitDecision = React.useCallback(
    async (decision: "approved" | "returned" | "rejected") => {
      if (!user) {
        toast.error("Sesi tidak sah. Sila log masuk semula.");
        return;
      }
      if (!draft) return;
      setSubmitting(decision);
      try {
        await api(`/api/drafts/${draft.id}/decision`, {
          method: "POST",
          body: JSON.stringify({
            decision,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            note: note.trim() || undefined,
          }),
        });
        const toastMsg: Record<typeof decision, string> = {
          approved: "Draf diluluskan.",
          returned: "Draf dikembalikan untuk pindaan.",
          rejected: "Draf ditolak.",
        };
        toast.success(toastMsg[decision], {
          description: draft.title,
        });
        navigate("dashboard");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gagal memproses keputusan.";
        toast.error("Gagal memproses keputusan.", { description: msg });
      } finally {
        setSubmitting(null);
        setRejectDialogOpen(false);
      }
    },
    [user, draft, note, navigate]
  );

  // -------------------------------------------------------------------------
  // Render gates
  // -------------------------------------------------------------------------
  if (!draftId) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Kelulusan Akhir"
          backable
          icon={Gavel}
          description="Luluskan, kembalikan, atau tolak draf perjanjian penyewaan."
        />
        <EmptyState
          icon={AlertTriangle}
          title="ID draf tidak dijumpai"
          description="Pilih draf dari papan pemuka untuk memulakan kelulusan."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingBlock label="Memuatkan skrin kelulusan..." />;
  }

  if (error || !draft) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Kelulusan Akhir"
          backable
          icon={Gavel}
          description="Luluskan, kembalikan, atau tolak draf perjanjian penyewaan."
        />
        <EmptyState
          icon={AlertTriangle}
          title="Gagal memuatkan draf"
          description={error || "Draf tidak dijumpai."}
          action={
            <Button variant="outline" onClick={load}>
              Cuba Semula
            </Button>
          }
        />
      </div>
    );
  }

  const sortedAmendments = [...draft.amendments].sort((a, b) =>
    clauseNumberCompare(
      a.clause?.clauseNumber ?? "",
      b.clause?.clauseNumber ?? ""
    )
  );

  const counts = {
    total: sortedAmendments.length,
    accepted: 0,
    edited: 0,
    rejected: 0,
    needsInput: 0,
    pending: 0,
  };
  for (const a of sortedAmendments) {
    counts[a.sloDecision] += 1;
  }

  const hasPending = counts.pending > 0;
  const canApprove = !hasPending && counts.total > 0;
  const isLocked = draft.status !== "pending_review";

  return (
    <div className="space-y-5 pb-28">
      <PageHeader
        title="Kelulusan Akhir"
        description="Semak ringkasan keputusan SLO dan berikan keputusan akhir."
        icon={Gavel}
        backable
        actions={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate("audit-trail", { draftId: draft.id })}
          >
            <History className="h-4 w-4" />
            Lihat Jejak Audit
          </Button>
        }
      />

      {/* Draft already decided */}
      {isLocked && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/50 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Draf ini telah mempunyai keputusan akhir (
            <span className="font-semibold">{draft.status}</span>). Keputusan
            baharu hanya boleh dibuat bagi draf berstatus "Menunggu Semakan".
          </p>
        </div>
      )}

      {/* Summary card */}
      <GlassCard className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem
            icon={FileText}
            label="Tajuk Draf"
            value={draft.title}
          />
          <SummaryItem
            icon={Scale}
            label="Templat"
            value={draft.template?.name ?? "—"}
          />
          <SummaryItem
            icon={Building2}
            label="Penyewa"
            value={draft.offerLetter?.tenantName || "—"}
          />
          <SummaryItem
            icon={Gavel}
            label="Status Semasa"
            valueNode={<StatusBadge status={draft.status} />}
          />
        </div>
        <Separator className="my-4" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>
            Dicipta oleh:{" "}
            <span className="font-medium text-foreground">
              {draft.creator?.name || "—"}
            </span>
          </span>
          <span>
            Tarikh cipta:{" "}
            <span className="font-medium text-foreground">
              {formatDate(draft.createdDate)}
            </span>
          </span>
          <span>
            Kemas kini terakhir:{" "}
            <span className="font-medium text-foreground">
              {formatDate(draft.lastUpdated)}
            </span>
          </span>
          <span>
            Kadar sewa:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(draft.offerLetter?.rentalRate ?? 0)}
            </span>
          </span>
        </div>
      </GlassCard>

      {/* Decision counts */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label="Jumlah Klausa"
          value={counts.total}
          icon={FileText}
          accent="primary"
        />
        <StatCard
          label="Diterima"
          value={counts.accepted}
          icon={CheckCircle2}
          accent="emerald"
        />
        <StatCard
          label="Dipinda SLO"
          value={counts.edited}
          icon={Gavel}
          accent="violet"
        />
        <StatCard
          label="Ditolak"
          value={counts.rejected}
          icon={XCircle}
          accent="rose"
        />
        <StatCard
          label="Perlu Input BU"
          value={counts.needsInput}
          icon={MessageSquare}
          accent="amber"
        />
      </div>

      {/* Pending warning */}
      {hasPending && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-300/50 bg-red-50/70 px-4 py-3 text-sm text-red-900 dark:bg-red-500/10 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {counts.pending} klausa belum disemak.
            </p>
            <p className="mt-0.5">
              Semua klausa perlu disemak sebelum kelulusan. Anda masih boleh
              mengembalikan draf ini kepada BU untuk pindaan.
            </p>
          </div>
        </div>
      )}

      {/* Decision summary table */}
      <GlassCard className="p-0">
        <div className="border-b border-border/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold tracking-tight">
            Ringkasan Keputusan SLO per Klausa
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Semua keputusan klausa yang dibuat semasa semakan.
          </p>
        </div>
        {sortedAmendments.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="Tiada klausa dalam draf ini"
              description="Draf ini tidak mempunyai cadangan pindaan klausa."
            />
          </div>
        ) : (
          <div className="scroll-glass max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Klausa</TableHead>
                  <TableHead>Tajuk</TableHead>
                  <TableHead className="w-[160px]">Keputusan SLO</TableHead>
                  <TableHead className="min-w-[200px]">Ulasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAmendments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {a.clause?.clauseNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{a.clause?.title ?? "—"}</div>
                      {a.issueIdentified && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {a.issueIdentified}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <SLODecisionBadge decision={a.sloDecision} />
                    </TableCell>
                    <TableCell>
                      {a.sloComment ? (
                        <span className="text-xs text-foreground/80">
                          {a.sloComment}
                        </span>
                      ) : a.sloEditedText ? (
                        <span className="text-xs italic text-muted-foreground">
                          Teks dipinda SLO
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Sticky action panel */}
      <GlassCard
        variant="strong"
        className="sticky bottom-4 z-20 p-4 sm:p-5"
      >
        <div className="space-y-3">
          <div>
            <label
              htmlFor="decision-note"
              className="mb-1.5 block text-sm font-medium"
            >
              Nota Kelulusan{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (pilihan)
              </span>
            </label>
            <Textarea
              id="decision-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Tambah ulasan atau arahan untuk BU/SLO lain..."
              disabled={isLocked || submitting !== null}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="gap-1.5 border-amber-300/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10"
              disabled={isLocked || submitting !== null}
              onClick={() => submitDecision("returned")}
            >
              {submitting === "returned" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4" />
              )}
              Kembalikan untuk Pindaan
            </Button>

            <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="gap-1.5"
                  disabled={isLocked || submitting !== null}
                >
                  <XCircle className="h-4 w-4" />
                  Tolak Draf
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tolak draf ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan menandakan draf{" "}
                    <span className="font-semibold">{draft.title}</span> sebagai
                    ditolak. BU akan dimaklumkan dan draf tidak boleh
                    diluluskan selepas ini. Pastikan ulasan penolakan
                    diberikan dalam medan nota.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={submitting !== null}>
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => submitDecision("rejected")}
                    disabled={submitting !== null}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {submitting === "rejected" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Ya, Tolak Draf
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              disabled={isLocked || !canApprove || submitting !== null}
              onClick={() => submitDecision("approved")}
              title={
                !canApprove
                  ? "Semua klausa perlu disemak dahulu"
                  : "Luluskan draf"
              }
            >
              {submitting === "approved" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Luluskan Draf
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary item
// ---------------------------------------------------------------------------
function SummaryItem({
  icon: Icon,
  label,
  value,
  valueNode,
}: {
  icon: typeof FileText;
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {valueNode ?? (
          <p className="text-sm leading-snug text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}
