// Shared domain types — Pepper Labs Tenancy Clause Review System (PRD §9)

export type Role = "BU" | "SLO" | "ADMIN";

export type DraftStatus =
  | "draft"
  | "pending_review"
  | "returned"
  | "approved"
  | "rejected";

export type SLODecision =
  | "pending"
  | "accepted"
  | "edited"
  | "rejected"
  | "needs_bu_input";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department?: string | null;
}

export interface TemplateClause {
  id: string;
  templateId: string;
  clauseNumber: string;
  title: string;
  originalText: string;
  mappedField: string;
  order: number;
}

export interface Template {
  id: string;
  name: string;
  version: string;
  landlordName?: string | null;
  description?: string | null;
  status: "active" | "archived";
  clauses?: TemplateClause[];
}

export interface OfferLetter {
  id: string;
  tenantName: string;
  rentalRate: number;
  tenancyPeriod: string;
  commencementDate: string;
  deposit: number;
  premisesUse: string;
  maintenanceTerms: string;
  utilitiesTerms: string;
  renewalTerms: string;
  terminationTerms: string;
  defaultTerms: string;
  specialConditions?: string | null;
}

export interface DraftClauseAmendment {
  id: string;
  draftId: string;
  clauseId: string;
  issueIdentified: string;
  reasonForAmendment: string;
  offerLetterReference: string;
  amendedText: string;
  sloDecision: SLODecision;
  sloComment?: string | null;
  sloEditedText?: string | null;
  updatedAt: string;
  clause?: TemplateClause;
}

export interface Draft {
  id: string;
  title: string;
  templateId: string;
  offerLetterId: string;
  createdBy: string;
  status: DraftStatus;
  priority: string;
  createdDate: string;
  lastUpdated: string;
  template?: Template;
  offerLetter?: OfferLetter;
  amendments?: DraftClauseAmendment[];
  creator?: User;
}

export interface AuditLog {
  id: string;
  draftId?: string | null;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  details?: string | null;
  timestamp: string;
}

// 5-part output structure (PRD §6.4 FR-29)
export interface FivePartOutput {
  summary: AmendmentSummary;
  clauseReview: ClauseReviewItem[];
  amendedClauses: AmendedClauseItem[];
  legalObservations: LegalObservation[];
  amendmentTable: AmendmentTableRow[];
}

export interface AmendmentSummary {
  totalClauses: number;
  amendedClauses: number;
  conflicts: number;
  missingInfo: number;
  aligned: number;
}

export interface ClauseReviewItem {
  clauseNumber: string;
  title: string;
  issueIdentified: string;
  reasonForAmendment: string;
  offerLetterReference: string;
}

export interface AmendedClauseItem {
  clauseNumber: string;
  title: string;
  originalText: string;
  amendedText: string;
}

export interface LegalObservation {
  type: "missing" | "conflict" | "risk" | "note";
  clauseNumber: string;
  title: string;
  observation: string;
}

export interface AmendmentTableRow {
  clauseNumber: string;
  title: string;
  originalProvision: string;
  amendedProvision: string;
  reason: string;
  offerLetterReference: string;
}
