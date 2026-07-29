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
import { DiffViewer } from "@/components/diff-viewer";
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
} from "@/components/views/shared/common";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  ArrowRight,
  Check,
  Pencil,
  X,
  MessageSquareWarning,
  Gavel,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  Coins,
  Clock,
  Info,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatCurrency,
  formatDate,
} from "@/lib/status";
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
  amendments: (DraftClauseAmendment & {
    clause: TemplateClause;
  })[];
}

interface PatchAmendmentResponse {
  amendment: DraftClauseAmendment & { clause: TemplateClause };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clauseNumberCompare(a: string, b: string): number {
  // Numeric-aware compare: split on ".", compare numeric parts first then remainder
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

function issueTone(issue: string): string {
  const v = issue.toLowerCase();
  if (v.includes("konflik") || v.includes("conflict"))
    return "bg-red-100/80 text-red-700 border-red-300/60 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30";
  if (
    v.includes("maklumat") ||
    v.includes("missing") ||
    v.includes("tiada")
  )
    return "bg-amber-100/80 text-amber-800 border-amber-300/60 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30";
  return "bg-primary/10 text-primary border-primary/30";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ClauseReviewView() {
  const params = useRouterStore((s) => s.params);
  const back = useRouterStore((s) => s.back);
  const navigate = useRouterStore((s) => s.navigate);
  const user = useAuthStore((s) => s.user);

  const draftId = params.draftId;

  const [draft, setDraft] = React.useState<DraftDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Editor state (one card at a time)
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editorMode, setEditorMode] = React.useState<
    "edit" | "reject" | "needs_input" | null
  >(null);
  const [editorText, setEditorText] = React.useState("");

  // Per-amendment submitting flag (so multiple cards don't race)
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);

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

  // Optimistic update of a single amendment
  const applyAmendmentPatch = React.useCallback(
    (updated: DraftClauseAmendment & { clause: TemplateClause }) => {
      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          amendments: prev.amendments.map((a) =>
            a.id === updated.id
              ? { ...a, ...updated, clause: updated.clause ?? a.clause }
              : a
          ),
        };
      });
    },
    []
  );

  const submitDecision = React.useCallback(
    async (
      amendment: DraftClauseAmendment & { clause: TemplateClause },
      decision: SLODecision,
      opts?: { sloEditedText?: string; sloComment?: string }
    ) => {
      if (!user) {
        toast.error("Sesi tidak sah. Sila log masuk semula.");
        return;
      }
      setSubmittingId(amendment.id);
      try {
        const body: Record<string, unknown> = {
          sloDecision: decision,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
        };
        if (opts?.sloEditedText !== undefined)
          body.sloEditedText = opts.sloEditedText;
        if (opts?.sloComment !== undefined) body.sloComment = opts.sloComment;

        const res = await api<PatchAmendmentResponse>(
          `/api/amendments/${amendment.id}`,
          { method: "PATCH", body: JSON.stringify(body) }
        );
        applyAmendmentPatch(res.amendment);

        const toastMap: Record<SLODecision, string> = {
          accepted: "Klausa diterima.",
          edited: "Klausa dipinda & disimpan.",
          rejected: "Klausa ditolak.",
          needs_bu_input: "Klausa ditandakan perlu input BU.",
          pending: "Klausa ditetapkan semula ke belum disemak.",
        };
        toast.success(toastMap[decision], {
          description: `Klausa ${amendment.clause.clauseNumber} — ${amendment.clause.title}`,
        });
        setEditingId(null);
        setEditorMode(null);
        setEditorText("");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gagal menyimpan keputusan.";
        toast.error("Gagal menyimpan keputusan.", { description: msg });
      } finally {
        setSubmittingId(null);
      }
    },
    [user, applyAmendmentPatch]
  );

  // Editor openers
  const openEditor = React.useCallback(
    (
      amendment: DraftClauseAmendment & { clause: TemplateClause },
      mode: "edit" | "reject" | "needs_input"
    ) => {
      setEditingId(amendment.id);
      setEditorMode(mode);
      setEditorText(
        mode === "edit"
          ? amendment.sloEditedText || amendment.amendedText
          : amendment.sloComment || ""
      );
    },
    []
  );

  const cancelEditor = React.useCallback(() => {
    setEditingId(null);
    setEditorMode(null);
    setEditorText("");
  }, []);

  // -------------------------------------------------------------------------
  // Render gates
  // -------------------------------------------------------------------------
  if (!draftId) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Semakan Klausa"
          backable
          icon={Gavel}
          description="Semak dan pinda klausa perjanjian penyewaan."
        />
        <EmptyState
          icon={AlertCircle}
          title="ID draf tidak dijumpai"
          description="Pilih draf dari papan pemuka untuk memulakan semakan."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingBlock label="Memuatkan draf untuk semakan..." />;
  }

  if (error || !draft) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Semakan Klausa"
          backable
          icon={Gavel}
          description="Semak dan pinda klausa perjanjian penyewaan."
        />
        <EmptyState
          icon={AlertCircle}
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

  // Sort amendments by clause.clauseNumber (numeric-aware)
  const sortedAmendments = [...draft.amendments].sort((a, b) =>
    clauseNumberCompare(
      a.clause?.clauseNumber ?? "",
      b.clause?.clauseNumber ?? ""
    )
  );

  const total = sortedAmendments.length;
  const reviewed = sortedAmendments.filter(
    (a) => a.sloDecision !== "pending"
  ).length;
  const progressPct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  const canProceedToFinal = reviewed === total && total > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={draft.title}
        description={`${draft.template?.name ?? "—"} · Penyewa: ${draft.offerLetter?.tenantName || "—"}`}
        icon={Gavel}
        backable
        actions={
          <Button
            onClick={() => navigate("final-approval", { draftId: draft.id })}
            className="gap-1.5"
            disabled={!canProceedToFinal}
            title={
              canProceedToFinal
                ? "Teruskan ke kelulusan akhir"
                : "Semua klausa perlu disemak dahulu"
            }
          >
            Ke Kelulusan Akhir
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      {/* Disclaimer banner (PRD §14) */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/50 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">Penafian:</span> Cadangan sistem
          adalah bantuan sahaja. Kelulusan akhir tertakluk penilaian SLO.
        </p>
      </div>

      {/* Status + progress */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge status={draft.status} />
            <PriorityBadgeLite priority={draft.priority} />
          </div>
          <div className="text-right text-sm">
            <span className="font-semibold">{reviewed}</span>
            <span className="text-muted-foreground"> / {total} klausa disemak</span>
          </div>
        </div>
        <Progress value={progressPct} className="mt-3 h-2" />
        {!canProceedToFinal && (
          <p className="mt-2 text-xs text-muted-foreground">
            {total - reviewed} klausa lagi perlu disemak sebelum kelulusan akhir.
          </p>
        )}
      </GlassCard>

      {/* Offer letter summary (collapsible) */}
      <OfferLetterSummary draft={draft} />

      {/* Clause list */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Senarai Klausa untuk Disemak
          </h2>
          <span className="text-sm text-muted-foreground">
            {total} klausa
          </span>
        </div>

        {sortedAmendments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Tiada klausa untuk disemak"
            description="Draf ini tidak mempunyai cadangan pindaan klausa."
          />
        ) : (
          <div className="space-y-4">
            {sortedAmendments.map((a, idx) => (
              <ClauseCard
                key={a.id}
                index={idx + 1}
                amendment={a}
                isEditing={editingId === a.id}
                editorMode={editorMode}
                editorText={editorText}
                onEditorTextChange={setEditorText}
                onOpenEditor={openEditor}
                onCancelEditor={cancelEditor}
                onSubmit={submitDecision}
                isSubmitting={submittingId === a.id}
                disableActions={submittingId !== null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Offer letter summary (collapsible)
// ---------------------------------------------------------------------------
function OfferLetterSummary({ draft }: { draft: DraftDetail }) {
  const ol = draft.offerLetter;
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <GlassCard className="overflow-hidden p-0">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-accent/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Rujukan Surat Tawaran
                </p>
                <p className="text-xs text-muted-foreground">
                  {ol.tenantName || "—"} · {formatCurrency(ol.rentalRate)} / bulan
                </p>
              </div>
            </div>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryRow
              icon={Building2}
              label="Nama Penyewa"
              value={ol.tenantName || "—"}
            />
            <SummaryRow
              icon={Coins}
              label="Kadar Sewa"
              value={formatCurrency(ol.rentalRate)}
            />
            <SummaryRow
              icon={Clock}
              label="Tempoh Penyewaan"
              value={ol.tenancyPeriod || "—"}
            />
            <SummaryRow
              icon={Calendar}
              label="Tarikh Mula"
              value={formatDate(ol.commencementDate)}
            />
            <SummaryRow
              icon={Coins}
              label="Deposit"
              value={formatCurrency(ol.deposit)}
            />
            <SummaryRow
              icon={FileText}
              label="Penggunaan Premis"
              value={ol.premisesUse || "—"}
            />
            <SummaryRow
              icon={FileText}
              label="Terma Penyelenggaraan"
              value={ol.maintenanceTerms || "—"}
            />
            <SummaryRow
              icon={FileText}
              label="Terma Utiliti"
              value={ol.utilitiesTerms || "—"}
            />
            <SummaryRow
              icon={FileText}
              label="Terma Pembaharuan"
              value={ol.renewalTerms || "—"}
            />
            <SummaryRow
              icon={FileText}
              label="Terma Penamatan"
              value={ol.terminationTerms || "—"}
            />
            <SummaryRow
              icon={FileText}
              label="Terma Lalai"
              value={ol.defaultTerms || "—"}
            />
            {ol.specialConditions && (
              <SummaryRow
                icon={FileText}
                label="Syarat Khas"
                value={ol.specialConditions}
              />
            )}
          </div>
        </CollapsibleContent>
      </GlassCard>
    </Collapsible>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm leading-snug text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Priority mini-badge (no extra import cost)
// ---------------------------------------------------------------------------
function PriorityBadgeLite({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: "bg-red-100/80 text-red-700 border-red-300/60 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
    high: "bg-amber-100/80 text-amber-800 border-amber-300/60 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    normal: "bg-muted/70 text-muted-foreground border-border",
  };
  const labelMap: Record<string, string> = {
    urgent: "Segera",
    high: "Tinggi",
    normal: "Biasa",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        map[priority] || map.normal
      }`}
    >
      {labelMap[priority] || priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Clause card
// ---------------------------------------------------------------------------
interface ClauseCardProps {
  index: number;
  amendment: DraftClauseAmendment & { clause: TemplateClause };
  isEditing: boolean;
  editorMode: "edit" | "reject" | "needs_input" | null;
  editorText: string;
  onEditorTextChange: (v: string) => void;
  onOpenEditor: (
    a: DraftClauseAmendment & { clause: TemplateClause },
    mode: "edit" | "reject" | "needs_input"
  ) => void;
  onCancelEditor: () => void;
  onSubmit: (
    a: DraftClauseAmendment & { clause: TemplateClause },
    decision: SLODecision,
    opts?: { sloEditedText?: string; sloComment?: string }
  ) => Promise<void> | void;
  isSubmitting: boolean;
  disableActions: boolean;
}

function ClauseCard({
  index,
  amendment,
  isEditing,
  editorMode,
  editorText,
  onEditorTextChange,
  onOpenEditor,
  onCancelEditor,
  onSubmit,
  isSubmitting,
  disableActions,
}: ClauseCardProps) {
  const c = amendment.clause;
  const amendedForDiff =
    amendment.sloEditedText || amendment.amendedText;

  return (
    <GlassCard className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
              {index}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                  Klausa {c.clauseNumber}
                </span>
                <h3 className="text-sm font-semibold leading-tight">
                  {c.title}
                </h3>
              </div>
              {c.mappedField && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Medan dipetakan: <span className="font-mono">{c.mappedField}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <SLODecisionBadge decision={amendment.sloDecision} />
            {amendment.issueIdentified && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${issueTone(
                  amendment.issueIdentified
                )}`}
              >
                <AlertCircle className="h-3 w-3" />
                {amendment.issueIdentified}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4 sm:p-5">
        <DiffViewer
          original={c.originalText}
          amended={amendedForDiff}
          compact
        />

        {/* Reference + reason */}
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <p className="font-medium text-muted-foreground">
              Rujukan Surat Tawaran
            </p>
            <p className="mt-0.5 text-foreground">
              {amendment.offerLetterReference || "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <p className="font-medium text-muted-foreground">
              Sebab Pindaan
            </p>
            <p className="mt-0.5 text-foreground">
              {amendment.reasonForAmendment || "—"}
            </p>
          </div>
        </div>

        {/* Existing SLO comment */}
        {amendment.sloComment && !isEditing && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <MessageSquareWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-primary">Ulasan SLO</p>
              <p className="mt-0.5 text-foreground/80">{amendment.sloComment}</p>
            </div>
          </div>
        )}

        {/* Inline editor */}
        {isEditing && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
              {editorMode === "edit" && (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Pinda teks klausa
                </>
              )}
              {editorMode === "reject" && (
                <>
                  <X className="h-3.5 w-3.5" />
                  Ulasan penolakan
                </>
              )}
              {editorMode === "needs_input" && (
                <>
                  <MessageSquareWarning className="h-3.5 w-3.5" />
                  Maklumat yang diperlukan dari BU
                </>
              )}
            </div>
            <Textarea
              value={editorText}
              onChange={(e) => onEditorTextChange(e.target.value)}
              rows={editorMode === "edit" ? 6 : 3}
              placeholder={
                editorMode === "edit"
                  ? "Tulis teks klausa yang dipinda..."
                  : editorMode === "reject"
                  ? "Berikan ulasan sebab penolakan..."
                  : "Nyatakan maklumat yang diperlukan dari BU..."
              }
              className="bg-background"
              autoFocus
            />
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEditor}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                size="sm"
                variant={
                  editorMode === "reject"
                    ? "destructive"
                    : editorMode === "needs_input"
                    ? "outline"
                    : "default"
                }
                disabled={isSubmitting || !editorText.trim()}
                onClick={() => {
                  if (editorMode === "edit") {
                    onSubmit(amendment, "edited", {
                      sloEditedText: editorText,
                    });
                  } else if (editorMode === "reject") {
                    onSubmit(amendment, "rejected", {
                      sloComment: editorText,
                    });
                  } else if (editorMode === "needs_input") {
                    onSubmit(amendment, "needs_bu_input", {
                      sloComment: editorText,
                    });
                  }
                }}
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editorMode === "edit"
                  ? "Simpan"
                  : editorMode === "reject"
                  ? "Sahkan Tolak"
                  : "Sahkan"}
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-emerald-300/60 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
              disabled={disableActions}
              onClick={() => onSubmit(amendment, "accepted")}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Terima
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={disableActions}
              onClick={() => onOpenEditor(amendment, "edit")}
            >
              <Pencil className="h-3.5 w-3.5" />
              Pinda
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-300/60 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
              disabled={disableActions}
              onClick={() => onOpenEditor(amendment, "reject")}
            >
              <X className="h-3.5 w-3.5" />
              Tolak
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-amber-300/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10"
              disabled={disableActions}
              onClick={() => onOpenEditor(amendment, "needs_input")}
            >
              <MessageSquareWarning className="h-3.5 w-3.5" />
              Perlu Input BU
            </Button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
