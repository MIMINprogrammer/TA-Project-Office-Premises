"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth";
import { GlassCard } from "@/components/glass-card";
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
} from "@/components/views/shared/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  LayoutTemplate,
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
  Info,
  X,
  GripVertical,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { OFFER_FIELDS } from "@/lib/clause-engine";
import { formatDate } from "@/lib/status";
import type { Template, TemplateClause } from "@/lib/types";

interface TemplateRow extends Template {
  clauseCount: number;
  draftCount: number;
  createdAt: string;
}

interface ClauseDraft {
  id: string; // local id for react keys
  clauseNumber: string;
  title: string;
  originalText: string;
  mappedField: string;
}

type Filter = "all" | "active" | "archived";

const MAPPED_FIELD_OPTIONS: { value: string; label: string }[] = [
  ...Object.values(OFFER_FIELDS).map((f) => ({
    value: f.key,
    label: f.label,
  })),
  { value: "_standard", label: "Klausa Piawai (tanpa pemetaan)" },
];

function emptyClause(): ClauseDraft {
  return {
    id: Math.random().toString(36).slice(2),
    clauseNumber: "",
    title: "",
    originalText: "",
    mappedField: "_standard",
  };
}

function defaultFormState() {
  return {
    name: "",
    version: "1.0",
    landlordName: "",
    description: "",
    status: "active" as "active" | "archived",
    clauses: [emptyClause()],
  };
}

export function TemplateManagerView() {
  const user = useAuthStore((s) => s.user);

  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(defaultFormState());
  const [saving, setSaving] = React.useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = React.useState<TemplateRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ templates: TemplateRow[] }>(
        "/api/templates?status=all&clauses=true"
      );
      setTemplates(res.templates || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuatkan templat.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    if (filter === "all") return templates;
    return templates.filter((t) => t.status === filter);
  }, [templates, filter]);

  function openCreate() {
    setForm(defaultFormState());
    setEditingId(null);
    setDialogOpen(true);
  }

  async function openEdit(t: TemplateRow) {
    setEditingId(t.id);
    // Fetch full template to get clauses (list view already includes clauses,
    // but we fetch to be safe — also handles when clauses missing).
    let clauses: TemplateClause[] = t.clauses ?? [];
    if (clauses.length === 0) {
      try {
        const res = await api<{ template: Template & { clauses: TemplateClause[] } }>(
          `/api/templates/${t.id}`
        );
        clauses = res.template?.clauses ?? [];
      } catch {
        // ignore — proceed with empty
      }
    }
    setForm({
      name: t.name,
      version: t.version,
      landlordName: t.landlordName ?? "",
      description: t.description ?? "",
      status: t.status,
      clauses: clauses.length
        ? clauses
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((c) => ({
              id: c.id,
              clauseNumber: c.clauseNumber,
              title: c.title,
              originalText: c.originalText,
              mappedField: c.mappedField,
            }))
        : [emptyClause()],
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Nama templat diperlukan.");
      return;
    }
    // Validate clauses: require title at minimum; clauseNumber defaults
    const cleanedClauses = form.clauses
      .filter((c) => c.title.trim() || c.originalText.trim())
      .map((c, i) => ({
        clauseNumber: c.clauseNumber.trim() || `${i + 1}`,
        title: c.title.trim(),
        originalText: c.originalText,
        mappedField: c.mappedField,
      }));

    setSaving(true);
    try {
      if (editingId) {
        await api(`/api/templates/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: form.name.trim(),
            version: form.version.trim() || "1.0",
            landlordName: form.landlordName.trim() || null,
            description: form.description.trim() || null,
            status: form.status,
            clauses: cleanedClauses,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
          }),
        });
        toast.success("Templat dikemaskini.");
      } else {
        await api("/api/templates", {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            version: form.version.trim() || "1.0",
            landlordName: form.landlordName.trim() || null,
            description: form.description.trim() || null,
            clauses: cleanedClauses,
          }),
        });
        toast.success("Templat dicipta.");
      }
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan templat.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(t: TemplateRow) {
    const next = t.status === "active" ? "archived" : "active";
    setSaving(true);
    try {
      await api(`/api/templates/${t.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: next,
          userId: user?.id,
          userName: user?.name,
          userRole: user?.role,
        }),
      });
      toast.success(
        next === "active" ? "Templat diaktifkan semula." : "Templat diarkibkan."
      );
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah status templat.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({
        userId: user?.id ?? "",
        userName: user?.name ?? "",
        userRole: user?.role ?? "",
      });
      await api(`/api/templates/${deleteTarget.id}?${params.toString()}`, {
        method: "DELETE",
      });
      toast.success(`Templat "${deleteTarget.name}" telah dipadam.`);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal memadam templat.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Pengurusan Templat"
        description="Cipta, sunting dan urus templat klausa perjanjian penyewaan."
        icon={LayoutTemplate}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Templat Baharu
          </Button>
        }
      />

      {error && (
        <GlassCard className="mb-4 border-rose-300/60 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
          {error}{" "}
          <Button variant="ghost" size="sm" onClick={load} className="ml-2 h-7 px-2">
            Cuba semula
          </Button>
        </GlassCard>
      )}

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as Filter)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="active">Aktif</TabsTrigger>
          <TabsTrigger value="archived">Diarkibkan</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <LoadingBlock label="Memuatkan templat..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title={
            filter === "all"
              ? "Tiada templat lagi"
              : filter === "active"
              ? "Tiada templat aktif"
              : "Tiada templat diarkibkan"
          }
          description="Cipta templat klausa pertama anda untuk mula menjana draf perjanjian penyewaan."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Templat
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => openEdit(t)}
              onToggleArchive={() => toggleArchive(t)}
              onDelete={() => setDeleteTarget(t)}
              busy={saving}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="max-h-[92vh] w-full gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border/60 px-5 py-4">
            <DialogTitle>
              {editingId ? "Sunting Templat" : "Templat Baharu"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Kemaskini butiran templat dan klausa. Semua klausa akan digantikan dengan senarai di bawah."
                : "Isi butiran templat dan tambah klausa. Setiap klausa memetakan kepada medan terma komersial."}
            </DialogDescription>
          </DialogHeader>

          <div className="scroll-glass max-h-[60vh] overflow-y-auto px-5 py-4">
            {/* Metadata */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="tpl-name">
                  Nama Templat <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="tpl-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="cth. Perjanjian Penyewaan Komersial PERKESO"
                />
              </div>
              <div>
                <Label htmlFor="tpl-version">Versi</Label>
                <Input
                  id="tpl-version"
                  value={form.version}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, version: e.target.value }))
                  }
                  placeholder="1.0"
                />
              </div>
              <div>
                <Label htmlFor="tpl-landlord">Nama Pemajak</Label>
                <Input
                  id="tpl-landlord"
                  value={form.landlordName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, landlordName: e.target.value }))
                  }
                  placeholder="cth. PERKESO / KWSP / Pemajak persendirian"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="tpl-desc">Penerangan</Label>
                <Textarea
                  id="tpl-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Penerangan ringkas tentang templat ini."
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="tpl-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as "active" | "archived",
                    }))
                  }
                >
                  <SelectTrigger id="tpl-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="archived">Diarkibkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clauses editor */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">
                    Klausa ({form.clauses.length})
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      clauses: [...f.clauses, emptyClause()],
                    }))
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Tambah Klausa
                </Button>
              </div>

              <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Setiap klausa memetakan kepada medan terma komersial dalam Surat
                  Tawaran Penyewaan (<code className="font-mono">mappedField</code>).
                  Pilih <strong>_standard</strong> untuk klausa piawai tanpa pemetaan
                  (cth. undang-undang negeri).
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {form.clauses.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                    Tiada klausa lagi. Klik &quot;Tambah Klausa&quot; untuk mula.
                  </p>
                )}
                {form.clauses.map((c, idx) => (
                  <ClauseRow
                    key={c.id}
                    index={idx}
                    clause={c}
                    onChange={(patch) =>
                      setForm((f) => ({
                        ...f,
                        clauses: f.clauses.map((x) =>
                          x.id === c.id ? { ...x, ...patch } : x
                        ),
                      }))
                    }
                    onRemove={() =>
                      setForm((f) => ({
                        ...f,
                        clauses: f.clauses.filter((x) => x.id !== c.id),
                      }))
                    }
                    canRemove={form.clauses.length > 1}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 px-5 py-3">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Simpan Perubahan" : "Cipta Templat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !deleting && !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam templat?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak boleh diundur. Templat{" "}
              <strong>{deleteTarget?.name}</strong> (v{deleteTarget?.version})
              {deleteTarget && deleteTarget.draftCount > 0 ? (
                <>
                  {" "}mempunyai{" "}
                  <strong>{deleteTarget.draftCount} draf</strong> yang
                  merujuknya. Draf sedia ada tidak terjejas, tetapi templat tidak
                  boleh dipilih untuk draf baharu.
                </>
              ) : (
                " akan dipadam secara kekal."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Padam Templat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---- Template card ---- */

function TemplateCard({
  template,
  onEdit,
  onToggleArchive,
  onDelete,
  busy,
}: {
  template: TemplateRow;
  onEdit: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <GlassCard hover className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{template.name}</h3>
            <Badge variant="secondary" className="text-[10px]">
              v{template.version}
            </Badge>
          </div>
          {template.landlordName && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {template.landlordName}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              disabled={busy}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Sunting
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleArchive}>
              {template.status === "active" ? (
                <>
                  <Archive className="mr-2 h-3.5 w-3.5" />
                  Arkibkan
                </>
              ) : (
                <>
                  <ArchiveRestore className="mr-2 h-3.5 w-3.5" />
                  Aktifkan Semula
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-rose-600 focus:text-rose-700 dark:text-rose-400 dark:focus:text-rose-300"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Padam
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {template.description && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {template.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {template.clauseCount} klausa
        </span>
        <span className="text-border">·</span>
        <span>{template.draftCount} draf</span>
        <span className="text-border">·</span>
        <span>{formatDate(template.createdAt)}</span>
      </div>

      <div className="mt-3">
        <span
          className={
            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium " +
            (template.status === "active"
              ? "border-emerald-300/60 bg-emerald-100/70 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
              : "border-border bg-muted/60 text-muted-foreground")
          }
        >
          {template.status === "active" ? "Aktif" : "Diarkibkan"}
        </span>
      </div>
    </GlassCard>
  );
}

/* ---- Clause editor row ---- */

function ClauseRow({
  index,
  clause,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  clause: ClauseDraft;
  onChange: (patch: Partial<ClauseDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5" />
          Klausa #{index + 1}
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-rose-600"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-[110px_1fr]">
        <div>
          <Label className="text-[11px] text-muted-foreground">No. Klausa</Label>
          <Input
            value={clause.clauseNumber}
            onChange={(e) => onChange({ clauseNumber: e.target.value })}
            placeholder="1.1"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Tajuk</Label>
          <Input
            value={clause.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="cth. Kadar Sewa"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="mt-2">
        <Label className="text-[11px] text-muted-foreground">Teks Asal Klausa</Label>
        <Textarea
          rows={3}
          value={clause.originalText}
          onChange={(e) => onChange({ originalText: e.target.value })}
          placeholder="Teks penuh klausa. Guna penanda seperti [Nama Penyewa], [Kadar Sewa], [X,XXX.00] untuk pemetaan automatik."
          className="text-sm"
        />
      </div>
      <div className="mt-2">
        <Label className="text-[11px] text-muted-foreground">
          Pemetaan Medan (mappedField)
        </Label>
        <Select
          value={clause.mappedField}
          onValueChange={(v) => onChange({ mappedField: v })}
        >
          <SelectTrigger className="h-8 w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MAPPED_FIELD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
                {opt.value === "_standard" && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    (tiada pemetaan)
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
