// Clause Comparison Engine + 5-Part Output Generator
// PRD §6.4 (FR-28..32), §9.5 (DraftClauseAmendment)
import type {
  TemplateClause,
  OfferLetter,
  DraftClauseAmendment,
  FivePartOutput,
  AmendmentSummary,
  ClauseReviewItem,
  AmendedClauseItem,
  LegalObservation,
  AmendmentTableRow,
} from "./types";

export const UNCONFIRMED_MARKER = "[Untuk Pengesahan Business Unit]";

// Map of offer-letter field keys → human labels & accessor
export interface OfferFieldDef {
  key: string;
  label: string;
  get: (ol: OfferLetter) => string;
  format: (raw: string) => string;
}

const numFmt = (v: string) =>
  `RM${Number(v).toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;

export const OFFER_FIELDS: Record<string, OfferFieldDef> = {
  tenantName: {
    key: "tenantName",
    label: "Nama Penyewa",
    get: (ol) => ol.tenantName,
    format: (v) => v,
  },
  tenancyPeriod: {
    key: "tenancyPeriod",
    label: "Tempoh Penyewaan",
    get: (ol) => ol.tenancyPeriod,
    format: (v) => `${v} bulan`,
  },
  rentalRate: {
    key: "rentalRate",
    label: "Kadar Sewa",
    get: (ol) => String(ol.rentalRate),
    format: numFmt,
  },
  commencementDate: {
    key: "commencementDate",
    label: "Tarikh Kuat Kuasa",
    get: (ol) => ol.commencementDate,
    format: (v) => formatDateShort(v),
  },
  deposit: {
    key: "deposit",
    label: "Deposit",
    get: (ol) => String(ol.deposit),
    format: numFmt,
  },
  premisesUse: {
    key: "premisesUse",
    label: "Kegunaan Premis",
    get: (ol) => ol.premisesUse,
    format: (v) => v,
  },
  maintenanceTerms: {
    key: "maintenanceTerms",
    label: "Terma Penyelenggaraan",
    get: (ol) => ol.maintenanceTerms,
    format: (v) => v,
  },
  utilitiesTerms: {
    key: "utilitiesTerms",
    label: "Terma Utiliti",
    get: (ol) => ol.utilitiesTerms,
    format: (v) => v,
  },
  renewalTerms: {
    key: "renewalTerms",
    label: "Terma Pembaharuan",
    get: (ol) => ol.renewalTerms,
    format: (v) => v,
  },
  terminationTerms: {
    key: "terminationTerms",
    label: "Terma Penamatan",
    get: (ol) => ol.terminationTerms,
    format: (v) => v,
  },
  defaultTerms: {
    key: "defaultTerms",
    label: "Klausa Ingkar",
    get: (ol) => ol.defaultTerms,
    format: (v) => v,
  },
  specialConditions: {
    key: "specialConditions",
    label: "Syarat Khas",
    get: (ol) => ol.specialConditions ?? "",
    format: (v) => v,
  },
};

function formatDateShort(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function addMonths(iso: string, months: number): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return formatDateShort(d.toISOString());
}

// Placeholders present in seeded template clause originalText
const PLACEHOLDERS = [
  "[Nama Penyewa]",
  "[Tempoh]",
  "[Tarikh Kuat Kuasa]",
  "[Tarikh]",
  "[Tarikh Tamat]",
  "[X,XXX.00]",
  "[Kegunaan Premis]",
  "[Terma Penyelenggaraan]",
  "[Terma Utiliti]",
  "[Terma Pembaharuan]",
  "[Terma Penamatan]",
  "[Tindakan Ingkar]",
  "[Syarat Khas]",
  "[Tempoh Notis]",
];

// Replace placeholders in template text using offer-letter value for the mapped field
export function substituteClause(
  clause: TemplateClause,
  ol: OfferLetter
): { amendedText: string; missing: boolean } {
  const field = OFFER_FIELDS[clause.mappedField];
  if (!field || clause.mappedField === "_standard") {
    // No mapping → keep original (no amendment needed)
    return { amendedText: clause.originalText, missing: false };
  }
  const raw = field.get(ol);
  if (!raw || raw.trim() === "") {
    return { amendedText: UNCONFIRMED_MARKER, missing: true };
  }
  const display = field.format(raw);
  const tenancyMonths = Number(ol.tenancyPeriod) || 0;

  let text = clause.originalText;
  text = text.split("[Nama Penyewa]").join(
    clause.mappedField === "tenantName" ? display : ol.tenantName
  );
  text = text.split("[Tempoh]").join(
    clause.mappedField === "tenancyPeriod" ? display : `${ol.tenancyPeriod} bulan`
  );
  text = text.split("[Tarikh Kuat Kuasa]").join(
    clause.mappedField === "commencementDate" ? display : formatDateShort(ol.commencementDate)
  );
  text = text.split("[Tarikh]").join(formatDateShort(ol.commencementDate));
  text = text.split("[Tarikh Tamat]").join(
    addMonths(ol.commencementDate, tenancyMonths)
  );
  text = text.split("[X,XXX.00]").join(
    clause.mappedField === "rentalRate"
      ? display.replace(/^RM/, "")
      : clause.mappedField === "deposit"
      ? ol.deposit.toLocaleString("en-MY", { minimumFractionDigits: 2 })
      : "0.00"
  );
  text = text.split("[Kegunaan Premis]").join(
    clause.mappedField === "premisesUse" ? display : ol.premisesUse
  );
  text = text.split("[Terma Penyelenggaraan]").join(
    clause.mappedField === "maintenanceTerms" ? display : ol.maintenanceTerms
  );
  text = text.split("[Terma Utiliti]").join(
    clause.mappedField === "utilitiesTerms" ? display : ol.utilitiesTerms
  );
  text = text.split("[Terma Pembaharuan]").join(
    clause.mappedField === "renewalTerms" ? display : ol.renewalTerms
  );
  text = text.split("[Terma Penamatan]").join(
    clause.mappedField === "terminationTerms" ? display : ol.terminationTerms
  );
  text = text.split("[Tindakan Ingkar]").join(
    clause.mappedField === "defaultTerms" ? display : ol.defaultTerms
  );
  text = text.split("[Syarat Khas]").join(
    clause.mappedField === "specialConditions"
      ? display
      : ol.specialConditions || UNCONFIRMED_MARKER
  );
  text = text.split("[Tempoh Notis]").join("90 hari");

  return { amendedText: text, missing: false };
}

// Determine if any placeholders remain (incomplete substitution)
export function hasRemainingPlaceholders(text: string): boolean {
  return PLACEHOLDERS.some((p) => text.includes(p));
}

// Generate the 5-part output from a set of amendments (PRD §6.4 FR-29)
export function buildFivePartOutput(
  amendments: DraftClauseAmendment[]
): FivePartOutput {
  const withClauses = amendments.filter((a) => a.clause);
  const total = withClauses.length;

  const amended = withClauses.filter(
    (a) =>
      a.amendedText !== a.clause!.originalText ||
      a.sloEditedText ||
      a.issueIdentified !== "selari"
  ).length;

  const conflicts = withClauses.filter(
    (a) => a.issueIdentified === "percanggahan"
  ).length;
  const missing = withClauses.filter(
    (a) =>
      a.issueIdentified === "ketiadaan maklumat" ||
      a.amendedText.includes(UNCONFIRMED_MARKER)
  ).length;
  const aligned = withClauses.filter(
    (a) => a.issueIdentified === "selari"
  ).length;

  const summary: AmendmentSummary = {
    totalClauses: total,
    amendedClauses: amended,
    conflicts,
    missingInfo: missing,
    aligned,
  };

  const clauseReview: ClauseReviewItem[] = withClauses.map((a) => ({
    clauseNumber: a.clause!.clauseNumber,
    title: a.clause!.title,
    issueIdentified: a.issueIdentified,
    reasonForAmendment: a.reasonForAmendment,
    offerLetterReference: a.offerLetterReference,
  }));

  const amendedClauses: AmendedClauseItem[] = withClauses.map((a) => ({
    clauseNumber: a.clause!.clauseNumber,
    title: a.clause!.title,
    originalText: a.clause!.originalText,
    amendedText: a.sloEditedText || a.amendedText,
  }));

  const legalObservations: LegalObservation[] = withClauses
    .filter(
      (a) =>
        a.issueIdentified === "ketiadaan maklumat" ||
        a.issueIdentified === "percanggahan" ||
        hasRemainingPlaceholders(a.sloEditedText || a.amendedText)
    )
    .map((a) => {
      const isMissing = a.issueIdentified === "ketiadaan maklumat" ||
        a.amendedText.includes(UNCONFIRMED_MARKER);
      return {
        type: isMissing ? "missing" : ("conflict" as "missing" | "conflict"),
        clauseNumber: a.clause!.clauseNumber,
        title: a.clause!.title,
        observation: isMissing
          ? `Maklumat "${a.clause!.title}" tidak dinyatakan dalam Surat Tawaran Penyewaan. ${UNCONFIRMED_MARKER}`
          : `Percanggahan dikesan bagi klausa ${a.clause!.clauseNumber} — ${a.reasonForAmendment}`,
      };
    });

  const amendmentTable: AmendmentTableRow[] = withClauses.map((a) => ({
    clauseNumber: a.clause!.clauseNumber,
    title: a.clause!.title,
    originalProvision: a.clause!.originalText,
    amendedProvision: a.sloEditedText || a.amendedText,
    reason: a.reasonForAmendment,
    offerLetterReference: a.offerLetterReference,
  }));

  return {
    summary,
    clauseReview,
    amendedClauses,
    legalObservations,
    amendmentTable,
  };
}

// Generate amendment records for a fresh draft (used by API on creation)
export interface GeneratedAmendment {
  clauseId: string;
  issueIdentified: string;
  reasonForAmendment: string;
  offerLetterReference: string;
  amendedText: string;
}

export function generateAmendments(
  clauses: TemplateClause[],
  ol: OfferLetter
): GeneratedAmendment[] {
  return clauses.map((cl) => {
    if (cl.mappedField === "_standard") {
      return {
        clauseId: cl.id,
        issueIdentified: "selari",
        reasonForAmendment:
          "Klausa piawai — tiada pindaan diperlukan daripada Surat Tawaran.",
        offerLetterReference: "Peruntukan piawai templat",
        amendedText: cl.originalText,
      };
    }
    const { amendedText, missing } = substituteClause(cl, ol);
    const field = OFFER_FIELDS[cl.mappedField];
    const display = field ? field.get(ol) : "";

    if (missing) {
      return {
        clauseId: cl.id,
        issueIdentified: "ketiadaan maklumat",
        reasonForAmendment: `Maklumat "${cl.title}" tidak dinyatakan dalam Surat Tawaran Penyewaan.`,
        offerLetterReference: "Tiada rujukan dalam Surat Tawaran Penyewaan",
        amendedText: UNCONFIRMED_MARKER,
      };
    }

    return {
      clauseId: cl.id,
      issueIdentified: "selari",
      reasonForAmendment: `Memasukkan terma dari Surat Tawaran: ${field?.format(display)}.`,
      offerLetterReference: `Surat Tawaran Penyewaan — medan ${cl.mappedField}`,
      amendedText,
    };
  });
}

// Word-level diff for side-by-side highlight (simple: highlight substituted spans)
export function getDiffSpans(original: string, amended: string) {
  // Returns segments marking what's new in amended vs original
  const origWords = original.split(/(\s+)/);
  const amendWords = amended.split(/(\s+)/);
  const origSet = new Set(origWords.filter((w) => w.trim()));
  return amendWords.map((w) => ({
    text: w,
    isNew: w.trim() !== "" && !origSet.has(w),
    isPlaceholder: w.includes(UNCONFIRMED_MARKER),
  }));
}
