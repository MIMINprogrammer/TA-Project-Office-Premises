"use client";

import * as React from "react";
import {
  FilePlus2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  Info,
  User,
  Wallet,
  Wrench,
  ScrollText,
  ListChecks,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import type { Template, Draft } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import { useRouterStore } from "@/stores/router";

import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PageHeader,
  LoadingBlock,
  EmptyState,
} from "@/components/views/shared/common";

type FieldType = "text" | "number" | "date" | "textarea" | "currency";

interface FieldDef {
  key: string;
  label: string;
  help: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}

interface FieldGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  fields: FieldDef[];
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: "Maklumat Penyewa",
    icon: User,
    description: "Butir-butir asas pihak penyewa.",
    fields: [
      {
        key: "tenantName",
        label: "Nama Penyewa",
        help: "Nama penuh individu atau entiti syarikat yang akan menjadi penyewa.",
        type: "text",
        required: true,
        placeholder: "Cth: Syarikat ABC Sdn. Bhd.",
      },
    ],
  },
  {
    title: "Terma Kewangan",
    icon: Wallet,
    description: "Butiran kewangan utama perjanjian penyewaan.",
    fields: [
      {
        key: "rentalRate",
        label: "Kadar Sewa Bulanan",
        help: "Amaun sewa bulanan dalam Ringgit Malaysia (MYR).",
        type: "currency",
        placeholder: "0.00",
      },
      {
        key: "tenancyPeriod",
        label: "Tempoh Penyewaan",
        help: "Tempoh penyewaan dalam bulan (cth: 24 untuk 2 tahun).",
        type: "number",
        placeholder: "24",
      },
      {
        key: "commencementDate",
        label: "Tarikh Kuat Kuasa",
        help: "Tarikh mula kuat kuasa perjanjian penyewaan.",
        type: "date",
      },
      {
        key: "deposit",
        label: "Deposit",
        help: "Amaun deposit (typically 2–3 bulan sewa) dalam MYR.",
        type: "currency",
        placeholder: "0.00",
      },
    ],
  },
  {
    title: "Kegunaan & Penyelenggaraan",
    icon: Wrench,
    description: "Terma berkaitan kegunaan premis dan penyelenggaraan.",
    fields: [
      {
        key: "premisesUse",
        label: "Kegunaan Premis",
        help: "Tujuan penggunaan premis seperti yang dipersetujui (cth: pejabat, runcit).",
        type: "textarea",
        rows: 2,
        placeholder: "Cth: Untuk kegunaan pejabat operasi syarikat.",
      },
      {
        key: "maintenanceTerms",
        label: "Terma Penyelenggaraan",
        help: "Tanggungjawab penyelenggaraan premis (dalaman, luaran, struktur).",
        type: "textarea",
        rows: 2,
        placeholder: "Cth: Penyewa bertanggungjawab ke atas penyelenggaraan dalaman.",
      },
      {
        key: "utilitiesTerms",
        label: "Terma Utiliti",
        help: "Tanggungjawab pembayaran utiliti (elektrik, air, internet).",
        type: "textarea",
        rows: 2,
        placeholder: "Cth: Penyewa membayar bil utiliti bulanan.",
      },
    ],
  },
  {
    title: "Terma Lain",
    icon: ScrollText,
    description: "Terma tambahan perjanjian — pembaharuan, penamatan, ingkar.",
    fields: [
      {
        key: "renewalTerms",
        label: "Terma Pembaharuan",
        help: "Syarat untuk pembaharuan perjanjian selepas tamat tempoh.",
        type: "textarea",
        rows: 2,
        placeholder: "Cth: Boleh diperbaharui untuk 2 tahun dengan notis 30 hari.",
      },
      {
        key: "terminationTerms",
        label: "Terma Penamatan",
        help: "Syarat dan notis penamatan awal perjanjian.",
        type: "textarea",
        rows: 2,
        placeholder: "Cth: Notis bertulis 90 hari diperlukan.",
      },
      {
        key: "defaultTerms",
        label: "Klausa Ingkar",
        help: "Tindakan atau penalti sekiranya berlaku ingkar perjanjian.",
        type: "textarea",
        rows: 2,
        placeholder: "Cth: Deposit akan dirampas jika ingkar.",
      },
      {
        key: "specialConditions",
        label: "Syarat Khas",
        help: "Syarat khas tambahan (pilihan).",
        type: "textarea",
        rows: 2,
        placeholder: "Cth: Tiada sub-sewa tanpa kebenaran bertulis.",
      },
    ],
  },
];

const STEPS = [
  { id: 1, label: "Pilih Templat", icon: FileText },
  { id: 2, label: "Maklumat Surat Tawaran", icon: ListChecks },
  { id: 3, label: "Semak & Cipta", icon: Check },
];

type OfferPayload = Record<string, string>;

export function CreateDraftView() {
  const user = useAuthStore((s) => s.user);
  const navigate = useRouterStore((s) => s.navigate);
  const back = useRouterStore((s) => s.back);

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = React.useState(true);
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null);
  const [offerValues, setOfferValues] = React.useState<OfferPayload>({});
  const [priority, setPriority] = React.useState<"normal" | "high" | "urgent">("normal");
  const [titleOverride, setTitleOverride] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Fetch active templates with clauses
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setTemplatesLoading(true);
      try {
        const res = await api<{ templates: Template[] }>(
          "/api/templates?status=active&clauses=true"
        );
        if (!cancelled) setTemplates(res.templates || []);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Gagal memuatkan templat.";
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key: string, value: string) => {
    setOfferValues((prev) => ({ ...prev, [key]: value }));
  };

  const tenantName = offerValues.tenantName?.trim() ?? "";
  const suggestedTitle = React.useMemo(() => {
    const tName =
      tenantName ||
      (selectedTemplate
        ? `Penyewaan ${selectedTemplate.name.split(" — ")[0]}`
        : "Tanpa Nama");
    const tmplShort = selectedTemplate?.name?.split(" — ")[0] ?? "";
    return tmplShort ? `${tName} — ${tmplShort}` : tName;
  }, [tenantName, selectedTemplate]);

  const effectiveTitle = titleOverride.trim() || suggestedTitle;

  const canProceedToStep2 = !!selectedTemplate;
  const canProceedToStep3 = tenantName.length > 0;

  const handleSubmit = async () => {
    if (!user || !selectedTemplate) return;
    if (!canProceedToStep3) {
      toast.error("Sila isi Nama Penyewa sebelum mencipta draf.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        templateId: selectedTemplate.id,
        title: effectiveTitle,
        createdBy: user.id,
        userName: user.name,
        userRole: user.role,
        priority,
        offerLetter: {
          tenantName,
          rentalRate: Number(offerValues.rentalRate || 0),
          tenancyPeriod: offerValues.tenancyPeriod ?? "",
          commencementDate: offerValues.commencementDate ?? "",
          deposit: Number(offerValues.deposit || 0),
          premisesUse: offerValues.premisesUse ?? "",
          maintenanceTerms: offerValues.maintenanceTerms ?? "",
          utilitiesTerms: offerValues.utilitiesTerms ?? "",
          renewalTerms: offerValues.renewalTerms ?? "",
          terminationTerms: offerValues.terminationTerms ?? "",
          defaultTerms: offerValues.defaultTerms ?? "",
          specialConditions: offerValues.specialConditions ?? null,
        },
      };
      const res = await api<{ draft: Draft }>("/api/drafts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Draf dicipta. Sila semak cadangan pindaan.");
      navigate("amendment-preview", { draftId: res.draft.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mencipta draf.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    back();
  };

  return (
    <div>
      <PageHeader
        title="Cipta Draf Baharu"
        description="Pilih templat, masukkan maklumat Surat Tawaran, dan cipta draf pindaan klausa."
        icon={FilePlus2}
        backable
        actions={
          <Button variant="ghost" onClick={handleCancel}>
            Batal
          </Button>
        }
      />

      {/* Stepper */}
      <GlassCard variant="strong" className="mb-5 p-4 sm:p-5">
        <div className="flex items-center">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isComplete = step > s.id;
            const isCurrent = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className={
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all sm:h-10 sm:w-10 " +
                      (isComplete
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground")
                    }
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={
                      "text-center text-[11px] font-medium leading-tight sm:text-xs " +
                      (isCurrent
                        ? "text-primary"
                        : isComplete
                        ? "text-foreground"
                        : "text-muted-foreground")
                    }
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={
                      "mx-1 mb-5 h-0.5 flex-1 rounded-full sm:mx-2 " +
                      (step > s.id ? "bg-primary" : "bg-border")
                    }
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </GlassCard>

      {/* Step content */}
      {step === 1 && (
        <Step1Template
          templates={templates}
          loading={templatesLoading}
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
          onNext={() => {
            if (!canProceedToStep2) {
              toast.error("Sila pilih satu templat untuk diteruskan.");
              return;
            }
            setStep(2);
          }}
          onCancel={handleCancel}
        />
      )}

      {step === 2 && (
        <Step2OfferLetter
          values={offerValues}
          onChange={setField}
          template={selectedTemplate}
          onBack={() => setStep(1)}
          onNext={() => {
            if (!canProceedToStep3) {
              toast.error("Sila isi sekurang-kurangnya Nama Penyewa.");
              return;
            }
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <Step3Review
          template={selectedTemplate}
          values={offerValues}
          priority={priority}
          onPriorityChange={setPriority}
          title={effectiveTitle}
          onTitleChange={setTitleOverride}
          suggestedTitle={suggestedTitle}
          submitting={submitting}
          onBack={() => setStep(2)}
          onCreate={handleSubmit}
        />
      )}
    </div>
  );
}

/* ----------------------- Step 1: Template selection ---------------------- */

function Step1Template({
  templates,
  loading,
  selected,
  onSelect,
  onNext,
  onCancel,
}: {
  templates: Template[];
  loading: boolean;
  selected: Template | null;
  onSelect: (t: Template) => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  if (loading) {
    return (
      <GlassCard className="p-6">
        <LoadingBlock label="Memuatkan templat aktif..." />
      </GlassCard>
    );
  }

  if (templates.length === 0) {
    return (
      <GlassCard className="p-6">
        <EmptyState
          icon={FileText}
          title="Tiada templat aktif"
          description="Hubungi pentadbir sistem untuk mencipta templat klausa perjanjian penyewaan."
        />
      </GlassCard>
    );
  }

  return (
    <div>
      <GlassCard variant="strong" className="mb-4 p-4">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Pilih templat klausa perjanjian penyewaan yang paling sesuai dengan jenis
            kediaman / komersial dan pihak pemajak. Sistem akan menjana cadangan
            pindaan automatik berdasarkan templat dan maklumat Surat Tawaran.
          </p>
        </div>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const isSel = selected?.id === t.id;
          return (
            <GlassCard
              key={t.id}
              hover
              onClick={() => onSelect(t)}
              className={
                "cursor-pointer p-4 transition-all " +
                (isSel
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "")
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{t.name}</h3>
                  {t.landlordName && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Pemajak: {t.landlordName}
                    </p>
                  )}
                </div>
                {isSel && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>

              {t.description && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {t.description}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  v{t.version}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {t.clauses?.length ?? 0} klausa
                </Badge>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel}>
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>
        <Button onClick={onNext} disabled={!selected}>
          Seterusnya <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ----------------------- Step 2: Offer letter form ----------------------- */

function Step2OfferLetter({
  values,
  onChange,
  template,
  onBack,
  onNext,
}: {
  values: OfferPayload;
  onChange: (key: string, value: string) => void;
  template: Template | null;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <GlassCard variant="strong" className="mb-4 p-4">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-muted-foreground">
            Medan kosong akan ditandakan{" "}
            <span className="font-medium text-foreground">[Untuk Pengesahan Business Unit]</span>.
            Anda boleh isi sebahagian sahaja — sistem akan menjana cadangan pindaan
            untuk medan yang disiarkan dan menyerlahkan medan yang masih kosong
            untuk pengesahan anda kelak.
          </p>
        </div>
      </GlassCard>

      <div className="space-y-4">
        {FIELD_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <GlassCard key={group.title} className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{group.title}</h2>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
              </div>
              <Separator className="mb-4" />
              <div className="grid gap-4 sm:grid-cols-2">
                {group.fields.map((f) => (
                  <FieldInput
                    key={f.key}
                    def={f}
                    value={values[f.key] ?? ""}
                    onChange={(v) => onChange(f.key, v)}
                    fullWidth={f.type === "textarea"}
                  />
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>
        <Button onClick={onNext}>
          Seterusnya: Semak & Cipta <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function FieldInput({
  def,
  value,
  onChange,
  fullWidth,
}: {
  def: FieldDef;
  value: string;
  onChange: (v: string) => void;
  fullWidth?: boolean;
}) {
  const id = `field-${def.key}`;
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Label htmlFor={id} className="text-xs font-medium">
          {def.label}
          {def.required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Bantuan: ${def.label}`}
            >
              <Info className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{def.help}</TooltipContent>
        </Tooltip>
      </div>

      {def.type === "textarea" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          rows={def.rows ?? 3}
          className="resize-y"
        />
      ) : def.type === "currency" ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            RM
          </span>
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={def.placeholder}
            className="pl-9"
            step="0.01"
            min="0"
          />
        </div>
      ) : (
        <Input
          id={id}
          type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          inputMode={def.type === "number" ? "numeric" : undefined}
          min={def.type === "number" ? "0" : undefined}
        />
      )}
    </div>
  );
}

/* ----------------------- Step 3: Review & create ----------------------- */

function Step3Review({
  template,
  values,
  priority,
  onPriorityChange,
  title,
  onTitleChange,
  suggestedTitle,
  submitting,
  onBack,
  onCreate,
}: {
  template: Template | null;
  values: OfferPayload;
  priority: "normal" | "high" | "urgent";
  onPriorityChange: (p: "normal" | "high" | "urgent") => void;
  title: string;
  onTitleChange: (v: string) => void;
  suggestedTitle: string;
  submitting: boolean;
  onBack: () => void;
  onCreate: () => void;
}) {
  const priorities: { value: "normal" | "high" | "urgent"; label: string }[] = [
    { value: "normal", label: "Biasa" },
    { value: "high", label: "Tinggi" },
    { value: "urgent", label: "Segera" },
  ];

  const filledCount = FIELD_GROUPS.flatMap((g) => g.fields).filter(
    (f) => (values[f.key] ?? "").trim().length > 0
  ).length;
  const totalFields = FIELD_GROUPS.flatMap((g) => g.fields).length;
  const emptyCount = totalFields - filledCount;

  return (
    <div className="space-y-4">
      {/* Title + priority */}
      <GlassCard variant="strong" className="p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">Tajuk & Keutamaan Draf</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="draft-title" className="mb-1.5 block text-xs font-medium">
              Tajuk Draf
            </Label>
            <Input
              id="draft-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={suggestedTitle}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Cadangan: {suggestedTitle}
            </p>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Keutamaan</Label>
            <div className="flex gap-2">
              {priorities.map((p) => {
                const active = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onPriorityChange(p.value)}
                    className={
                      "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-all " +
                      (active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground")
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Selected template */}
      <GlassCard className="p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold">Templat Dipilih</h3>
        {template ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{template.name}</span>
              <Badge variant="outline" className="text-[10px]">
                v{template.version}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {template.clauses?.length ?? 0} klausa
              </Badge>
            </div>
            {template.landlordName && (
              <p className="mt-1 text-xs text-muted-foreground">
                Pemajak: {template.landlordName}
              </p>
            )}
            {template.description && (
              <p className="mt-2 text-xs text-muted-foreground">
                {template.description}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Tiada templat dipilih.</p>
        )}
      </GlassCard>

      {/* Offer letter summary */}
      <GlassCard className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Ringkasan Surat Tawaran Penyewaan</h3>
          <Badge variant="outline" className="text-[10px]">
            {filledCount}/{totalFields} medan diisi
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELD_GROUPS.flatMap((g) => g.fields).map((f) => {
            const v = (values[f.key] ?? "").trim();
            const isFilled = v.length > 0;
            const isCurrency = f.type === "currency";
            const display = isFilled
              ? isCurrency
                ? `RM ${Number(v).toLocaleString("en-MY", {
                    minimumFractionDigits: 2,
                  })}`
                : f.type === "number" && f.key === "tenancyPeriod"
                ? `${v} bulan`
                : v
              : "[Untuk Pengesahan Business Unit]";
            return (
              <div
                key={f.key}
                className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {f.label}
                  </span>
                  {!isFilled && (
                    <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />
                  )}
                </div>
                <p
                  className={
                    "mt-0.5 text-sm " +
                    (isFilled ? "text-foreground" : "text-amber-700 dark:text-amber-400 italic")
                  }
                >
                  {display}
                </p>
              </div>
            );
          })}
        </div>
        {emptyCount > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {emptyCount} medan masih kosong. Sistem akan menandakannya sebagai{" "}
              <strong>[Untuk Pengesahan Business Unit]</strong> dalam cadangan pindaan.
            </span>
          </div>
        )}
      </GlassCard>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>
        <Button onClick={onCreate} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Mencipta...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Cipta Draf
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
