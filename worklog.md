# Pepper Labs — Tenancy Clause Review System | Worklog

Project: Sistem Semakan dan Pindaan Klausa Perjanjian Penyewaan (PRD v2.0, replaces v1.0 LMS).
Company: Pepper Labs, Malaysia. Stack: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma (SQLite dummy DB).
Design: Glassmorphism, emerald/teal + amber palette (NO indigo/blue).

---
Task ID: 1
Agent: main (foundation)
Task: Prisma schema + dummy DB seed

Work Log:
- Defined full Prisma schema (User, Template, TemplateClause, OfferLetter, Draft, DraftClauseAmendment, AuditLog) per PRD §9.
- Ran `bun run db:push`.
- Wrote `prisma/seed.ts` with: 4 users (BU, BU2, SLO, ADMIN), 3 templates (PERKESO landlord w/ 14 mapped clauses, Retail w/ 10 clauses, archived office template), 3 offer letters, 4 drafts at varied statuses (draft / pending_review / returned / approved), generated amendments via comparison engine, SLO edits/comments on returned draft, 16 audit log entries.
- Ran seed successfully.

Stage Summary:
- Dummy database fully populated. Login creds:
  - BU: bu@pepperlabs.my / bu123
  - BU2: bu2@pepperlabs.my / bu123
  - SLO: slo@pepperlabs.my / slo123
  - ADMIN: admin@pepperlabs.my / admin123

---
Task ID: 2
Agent: main (foundation)
Task: Glassmorphism theme + layout

Work Log:
- Rewrote `src/app/globals.css`: Pepper Labs palette (emerald/teal primary, amber accent), light+dark themes, glassmorphism utilities (.glass, .glass-strong, .glass-primary, .glass-hover, .glass-aurora fixed background, .text-gradient-brand, .diff-add / .diff-placeholder / .diff-conflict, .scroll-glass).
- Updated `src/app/layout.tsx`: Pepper Labs metadata (ms locale), ThemeProvider (next-themes), aurora background div, Toaster + SonnerToaster.
- Created `src/components/theme-provider.tsx`.

Stage Summary:
- Glassmorphism design system live. No indigo/blue. Sticky footer pattern ready.

---
Task ID: 3
Agent: main (foundation)
Task: Zustand stores + lib helpers

Work Log:
- `src/lib/types.ts`: full domain types (User, Template, TemplateClause, OfferLetter, Draft, DraftClauseAmendment, AuditLog, FivePartOutput + sub-types, Role, DraftStatus, SLODecision).
- `src/lib/status.ts`: DRAFT_STATUS_CONFIG (Draf/Menunggu/Dikembalikan/Diluluskan/Ditolak with colour badges per PRD §6.9), SLO_DECISION_CONFIG, ROLE_CONFIG, PRIORITY_CONFIG, formatters (formatCurrency MYR, formatDate ms-MY, formatDateTime, timeAgo).
- `src/lib/clause-engine.ts`: OFFER_FIELDS map, substituteClause() (placeholder replacement), generateAmendments() (comparison engine — missing → [Untuk Pengesahan Business Unit]), buildFivePartOutput() (Ringkasan/Semakan Klausa/Klausa Dipinda/Pemerhatian/Jadual), getDiffSpans() (word-level diff for side-by-side).
- `src/stores/auth.ts`: persisted Zustand auth store (user, setAuth, logout, hasRole).
- `src/stores/router.ts`: client-side view router (view + params + history stack + navigate/back).
- `src/lib/api-client.ts`: fetch wrapper.
- `src/lib/server.ts`: server helpers (json, error, serialize, logAudit, DRAFT_INCLUDE).

Stage Summary:
- Comparison engine + 5-part generator ready for API + UI. Stores + helpers stable; do NOT rename these exports.

---
Task ID: 4
Agent: main (foundation)
Task: API routes

Work Log:
- `src/app/api/auth/login/route.ts` — POST simulated auth.
- `src/app/api/templates/route.ts` — GET list (status filter, clauses include), POST create.
- `src/app/api/templates/[id]/route.ts` — GET / PUT (metadata + replace clauses) / DELETE.
- `src/app/api/drafts/route.ts` — GET list (with stats: total/pending/accepted/edited/rejected/needsInput/missing), POST create (offer letter + draft + auto-generate amendments via engine).
- `src/app/api/drafts/[id]/route.ts` — GET full detail, PATCH (title/priority/status).
- `src/app/api/drafts/[id]/submit/route.ts` — POST BU submit for review (draft|returned → pending_review).
- `src/app/api/drafts/[id]/decision/route.ts` — POST SLO final decision (approved/returned/rejected).
- `src/app/api/drafts/[id]/export/route.ts` — GET export payload (draft + 5-part output).
- `src/app/api/amendments/[id]/route.ts` — PATCH SLO clause decision (sloDecision/sloComment/sloEditedText) + audit.
- `src/app/api/audit/route.ts` — GET audit logs (draftId filter, limit).
- `src/app/api/stats/route.ts` — GET role-aware dashboard stats (counts, avgReviewDays, recentAudit).

Stage Summary:
- All CRUD + workflow endpoints live. Response shapes documented below for UI subagents.

API CONTRACT (consumed by UI subagents):
- GET /api/stats?role=BU&userId=X → { role, totalDrafts, draftStatus, pendingReview, returned, approved, rejected, myDrafts, activeTemplates, totalTemplates, avgReviewDays, recentAudit[] }
- GET /api/drafts?status=&createdBy=&role= → { drafts: [{ ...draft, template, offerLetter, creator, stats:{total,pending,accepted,edited,rejected,needsInput,missing} }] }
- GET /api/drafts/[id] → { draft: { ...draft, template:{clauses[]}, offerLetter, creator, amendments:[{...amendment, clause, updater}] } }
- POST /api/drafts { templateId, title, createdBy, userName, userRole, priority, offerLetter:{...} } → { draft } (201)
- POST /api/drafts/[id]/submit { userId, userName, userRole } → { draft }
- POST /api/drafts/[id]/decision { decision:"approved"|"returned"|"rejected", userId, userName, userRole, note? } → { draft }
- GET /api/drafts/[id]/export?userId=&userName=&userRole= → { draft, fivePart, exportedAt }
- PATCH /api/amendments/[id] { sloDecision, sloComment?, sloEditedText?, userId, userName, userRole } → { amendment }
- GET /api/templates?status=all&clauses=true → { templates:[{ ...template, clauses[]?, clauseCount, draftCount }] }
- GET /api/templates/[id] → { template:{ ...template, clauses[] } }
- PUT /api/templates/[id] { name?, version?, landlordName?, description?, status?, clauses[]?, userId, userName, userRole } → { template }
- POST /api/templates { name, version?, landlordName?, description?, clauses[]? } → { template } (201)
- DELETE /api/templates/[id]?userId=&userName=&userRole= → { ok:true }
- GET /api/audit?draftId=&limit= → { logs[] }

---
Task ID: 5
Agent: main (foundation)
Task: Shared components + AppShell + Login + main page

Work Log:
- `src/components/glass-card.tsx` — GlassCard (variant: default|strong|primary, hover).
- `src/components/status-badges.tsx` — StatusBadge, SLODecisionBadge, RoleBadge, PriorityBadge (PRD colour coding).
- `src/components/diff-viewer.tsx` — side-by-side DiffViewer (original vs amended, word-level highlight, [Untuk Pengesahan Business Unit] placeholder styling).
- `src/components/app-shell.tsx` — responsive shell: desktop glass sidebar + top bar, mobile Sheet sidebar, theme toggle, user card + logout, role-filtered nav, STICKY footer (mt-auto inside flex-col min-h-screen).
- `src/components/views/login-view.tsx` — glassmorphism login (hero + form + demo accounts quick-fill).
- `src/components/views/shared/common.tsx` — PageHeader, EmptyState, StatCard, LoadingBlock.
- Stub view files created at all expected paths (bu/slo/admin) so app compiles; subagents will replace bodies.
- `src/app/page.tsx` — client orchestrator: hydration guard → LoginView if unauthed → AppShell + role-aware ActiveView.

Stage Summary:
- App boots to login, then role-aware dashboard. All shared components + stores + API stable.
- DO NOT modify: globals.css theme vars, src/lib/*, src/stores/*, src/components/{glass-card,status-badges,diff-viewer,app-shell,theme-provider}.tsx, src/components/views/{login-view,shared/common}.tsx, src/app/page.tsx, src/app/layout.tsx, src/app/api/**, prisma/**.
- Subagents ONLY edit their own view files listed in tasks 6/7/8.

---
Task ID: 8
Agent: admin-views (fullstack subagent)
Task: Admin view module — AdminDashboard, TemplateManagerView, AuditTrailView

Work Log:
- Read worklog + foundation (types, status, api-client, auth/router stores, GlassCard, status-badges, common shared components, clause-engine OFFER_FIELDS). Verified API contract against actual route handlers (`/api/stats`, `/api/templates`, `/api/audit`).
- `src/components/views/admin/admin-dashboard.tsx` → `AdminDashboard`:
  - PageHeader "Papan Pemuka Pentadbir" + greeting (user.name) + Jejak Audit shortcut button.
  - 4 StatCards (emerald/primary/amber/violet accents): Templat Aktif (activeTemplates), Jumlah Templat (totalTemplates), Jumlah Draf (totalDrafts), Tempoh Purata Semakan (avgReviewDays + " hari").
  - Two-column GlassCard grid (lg:grid-cols-2):
    - Left "Templat Terkini": top-5 templates list with name, version badge, clauseCount, draftCount, landlordName, status pill (active=emerald, archived=muted). Button "Urus Semua Templat" → navigate("templates").
    - Right "Aktiviti Terkini": compact vertical timeline of recentAudit[] (top 6) — each entry has colored role dot (BU=teal, SLO=violet, ADMIN=rose), userName + RoleBadge (short), action, optional details (line-clamp-2), timeAgo + formatDateTime. Button "Lihat Jejak Audit Penuh" → navigate("audit-trail").
  - Error retry banner + EmptyState fallbacks.
- `src/components/views/admin/template-manager.tsx` → `TemplateManagerView`:
  - PageHeader "Pengurusan Templat" + "Tambah Templat Baharu" button.
  - Tabs filter: Semua / Aktif / Diarkibkan.
  - Template grid (sm:2, lg:3 cols) of GlassCards: name + version badge, landlordName, description (line-clamp-2), clauseCount/draftCount/createdAt meta, status pill. DropdownMenu row actions: Sunting / Arkibkan-or-Aktifkan Semula (toggle status via PUT) / Padam (rose).
  - Create/Edit Dialog (max-w-3xl, scrollable body, footer actions): fields name (required), version (default "1.0"), landlordName, description (textarea), status (select). Dynamic clauses editor — each row has clauseNumber, title, originalText (textarea), mappedField select (built from OFFER_FIELDS + `_standard` "Klausa Piawai (tanpa pemetaan)"). Add "Tambah Klausa" / per-row remove (X). Help note (amber) explaining mappedField semantics. Save → POST (create) or PUT (edit, replaces all clauses) with userId/userName/userRole from useAuthStore; toasts "Templat dicipta" / "Templat dikemaskini".
  - Delete: AlertDialog confirm (mentions draft count if >0) → DELETE with userId/userName/userRole query → toast "Templat ... telah dipadam".
  - Spinner on async buttons (Loader2), disabled states while saving/deleting.
- `src/components/views/admin/audit-trail.tsx` → `AuditTrailView`:
  - PageHeader "Jejak Audit" + backable. If router params.draftId set: header shows "Kosongkan Penapis" button + amber "Menapis ikut draf" chip (with X) inside filter bar; else shows "Menunjukkan semua log".
  - Search input (filters by action / userName / details / userRole, case-insensitive) with clear button. Live count of filtered records.
  - Fetches `/api/audit?draftId=<id>&limit=200` (or omits draftId). LoadingBlock while loading, error retry banner, EmptyState (different copy for search/draft-filter/no-logs).
  - Vertical timeline inside GlassCard with `.scroll-glass` + `max-h-[70vh]`: grouped by day with sticky date separator heading (Hari Ini / Semalam / formatted date) + per-day entry count. Each log = glass row with colored role dot (BU=teal/SLO=violet/ADMIN=rose) + connector line, userName + RoleBadge (short), formatDateTime, bold action, muted details. If log.draftId present: "Lihat draf" link → navigate("draft-detail", { draftId }).

Quality:
- All 3 files start with `"use client";`. All imports use `@/`. No `any` (typed AdminStats, TemplateRow, ClauseDraft, AuditResponse). No console.log. Loading/error/empty states everywhere. Toasts on create/update/archive/delete. AlertDialog for delete confirm. Responsive (mobile-first; dialog scrolls; cards stack on mobile). Palette strictly emerald/teal + amber + violet/rose accents — no indigo/blue.
- `bun run lint` → clean (0 errors, 0 warnings). `dev.log` tail shows only `✓ Compiled in ...` and `200` responses — no compile/runtime errors.

Stage Summary:
- Admin module complete & live. Exports preserved: `AdminDashboard`, `TemplateManagerView`, `AuditTrailView`. Consumes only foundation APIs/stores/components — did NOT modify any foundation files. Admin user (admin@pepperlabs.my / admin123) can now: view dashboard stats + recent activity, manage templates (CRUD with clause editor + archive/delete), and browse full audit timeline (filterable by draft + searchable, grouped by day).

---
Task ID: 7
Agent: slo-views-agent (SLO view module)
Task: Senior Legal Officer (SLO) view module — Dashboard + Clause Review + Final Approval

Work Log:
- Read foundation files (types.ts, status.ts, api-client.ts, auth/router stores, glass-card, status-badges, diff-viewer, shared/common, app-shell). Confirmed exact API contract by reading the 4 API route files I consume (stats, drafts list, drafts/[id], amendments/[id], drafts/[id]/decision).
- Created 3 view files (kept the exact export names; only the bodies were replaced):
  1. `src/components/views/slo/slo-dashboard.tsx` → `SLODashboard`
  2. `src/components/views/slo/clause-review.tsx` → `ClauseReviewView`
  3. `src/components/views/slo/final-approval.tsx` → `FinalApprovalView`

SLODashboard:
- PageHeader "Papan Pemuka SLO" + greeting (firstName from auth store).
- Stat cards (responsive 2 cols mobile / 4 cols desktop): Menunggu Semakan (pendingReview, amber/Clock), Diluluskan (approved, emerald/CheckCircle2), Dikembalikan (returned, rose/Undo2), Tempoh Purata Semakan (avgReviewDays + " hari" trend, primary/Timer).
- "Draf Menunggu Semakan" section: fetches `/api/drafts?status=pending_review`, sorts by priority (urgent > high > normal) then createdDate asc, renders each as a GlassCard (title, PriorityBadge, template name, tenant, createdDate, amendment stats summary e.g. "12 klausa · 3 belum disemak · 2 maklumat BU") with a "Semak" button → navigate("slo-review", {draftId}). List scrolls inside `.scroll-glass max-h-[36rem]`.
- Secondary "Baru Diluluskan / Dikembalikan" section: fetches approved + returned, merges, sorts by lastUpdated desc, slices 3, shows each in a 3-col grid with StatusBadge + Lihat Draf button.
- "Aktiviti Terkini" section: renders recentAudit from stats endpoint in a scrollable GlassCard list.
- Empty state when pending list is empty. Error state with retry button. Loading state via LoadingBlock.

ClauseReviewView (PRD §6.5 FR-33/34/35, §10.1 side-by-side):
- Reads draftId from useRouterStore.params. Fetches `/api/drafts/<id>`. LoadingBlock / error / empty states handled.
- PageHeader: draft title + template name + tenant + backable + "Ke Kelulusan Akhir" button (disabled with tooltip until all clauses reviewed).
- Disclaimer banner (PRD §14): "Cadangan sistem adalah bantuan sahaja. Kelulusan akhir tertakluk penilaian SLO." (amber callout with Info icon).
- Status + Progress card: StatusBadge + PriorityBadge + shadcn Progress bar showing "X / Y klausa disemak" (counts amendments where sloDecision !== "pending").
- Offer letter summary card (Collapsible): 12 fields (tenantName, rentalRate, tenancyPeriod, commencementDate, deposit, premisesUse, maintenanceTerms, utilitiesTerms, renewalTerms, terminationTerms, defaultTerms, specialConditions). Each row icon + label + value.
- Clause list: amendments sorted by clause.clauseNumber (numeric-aware compare "1" < "2.1" < "10"). Each is a GlassCard with:
  - Header: numbered index chip + "Klausa {n}" + title + mappedField + SLODecisionBadge + issueIdentified badge (red/amber/primary tone based on issue text).
  - DiffViewer compact (original = clause.originalText, amended = sloEditedText || amendedText).
  - Two-column grid: offerLetterReference + reasonForAmendment.
  - Existing SLO comment callout (if sloComment present and not currently editing).
  - Inline editor (Textarea) opened by Pinda / Tolak / Perlu Input BU with appropriate label & placeholder. Save button disabled while empty or submitting; spinner shown via Loader2.
  - Action button group (responsive wrap): Terima (emerald outline → PATCH accepted), Pinda (outline → editor mode "edit" → PATCH edited + sloEditedText), Tolak (red outline → editor mode "reject" → PATCH rejected + sloComment), Perlu Input BU (amber outline → editor mode "needs_input" → PATCH needs_bu_input + sloComment).
  - All actions send userId/userName/userRole from useAuthStore. Optimistic local state update via applyAmendmentPatch (no full refetch, preserves scroll position). Per-card submittingId disables that card's actions while a global `submittingId` blocks cross-card races.
  - Toast success on each PATCH with clause number/title description.

FinalApprovalView (PRD §6.5 FR-36, §10.2):
- Reads draftId, fetches `/api/drafts/<id>`. LoadingBlock / error / empty states.
- PageHeader "Kelulusan Akhir" backable + "Lihat Jejak Audit" ghost button → navigate("audit-trail", {draftId}).
- Locked-state banner if draft.status !== "pending_review" (action buttons disabled).
- Summary card: title / template / tenant / status badge + creator / createdDate / lastUpdated / rentalRate metadata strip.
- Decision counts: 5 StatCards (Total / Diterima / Dipinda SLO / Ditolak / Perlu Input BU) using accent colours emerald / violet / rose / amber / primary.
- Pending warning (red callout) if pending > 0 — explains approve is blocked but return still allowed.
- Decision summary table (shadcn Table) with columns Klausa | Tajuk (+ issueIdentified sub-text) | Keputusan SLO (SLODecisionBadge) | Ulasan (sloComment or "Teks dipinda SLO" or —). Wrapped in `.scroll-glass max-h-[28rem]`.
- Sticky action panel (`sticky bottom-4 z-20` GlassCard variant="strong"): optional Note textarea + 3 buttons:
  - "Kembalikan untuk Pindaan" (amber outline) → POST returned with note → toast → navigate("dashboard").
  - "Tolak Draf" (destructive) → AlertDialog confirm ("Ya, Tolak Draf" destructive action) → POST rejected → toast → navigate("dashboard").
  - "Luluskan Draf" (emerald solid `bg-emerald-600`) → disabled when !canApprove (pending>0 or total=0) → POST approved → toast → navigate("dashboard").
  - All three send userId/userName/userRole + optional note; per-decision submitting flag shows spinner; navigate("dashboard") on success.

Quality checklist:
- All 3 files start with `"use client";`. All imports use `@/`.
- Minimal `any` — used only the pre-existing `api<T>` wrapper's typed return shapes.
- No console.log. All async actions show spinners + disable while pending. Toasts on every action (sonner).
- AlertDialog for destructive reject.
- Responsive: stat cards 2-col mobile → 4-col desktop; tables horizontally scroll; clause action buttons wrap; offer-letter summary 1-col mobile → 2-3 col desktop; sticky action panel collapses to vertical stack on mobile.
- No footer added (AppShell handles sticky footer). No indigo/blue. Emerald/teal + amber + rose + violet accents only.

Stage Summary:
- SLO module fully implemented and consumes the existing API contract verbatim (no API changes).
- `bun run lint` — clean (0 errors, 0 warnings).
- `/home/z/my-project/dev.log` — clean (multiple `✓ Compiled` entries, no error/warn/fail lines for the new files).
- Files written (only bodies replaced, export names preserved):
  - `/home/z/my-project/src/components/views/slo/slo-dashboard.tsx`
  - `/home/z/my-project/src/components/views/slo/clause-review.tsx`
  - `/home/z/my-project/src/components/views/slo/final-approval.tsx`
- No foundation files modified. No new packages installed.

---
Task ID: 6
Agent: BU view module (Papan Pemuka + Cipta Draf + Paparan Cadangan Pindaan)

Files owned & delivered:
- src/components/views/bu/bu-dashboard.tsx — export `BUDashboard`
- src/components/views/bu/create-draft.tsx — export `CreateDraftView`
- src/components/views/bu/amendment-preview.tsx — export `AmendmentPreviewView`

Work Log:
- BUDashboard (PRD §6.6 FR-38, §10.2): fetches `/api/stats?role=BU&userId=` + `/api/drafts?createdBy=&status=all` in parallel. PageHeader with "Selamat datang, {name}" greeting + "Cipta Draf Baharu" button → navigate("create-draft"). 4 StatCards (myDrafts/pendingReview/returned/approved). Status filter chips (Semua/Draf/Menunggu/Dikembalikan/Diluluskan) with per-status counts + a free-text search input. Draft list rendered as GlassCards inside a `.scroll-glass max-h-[calc(100vh-22rem)] overflow-y-auto` container — each card shows title + StatusBadge + PriorityBadge + template name + tenantName + timeAgo(lastUpdated) + amber "X pindaan belum disahkan" badge when stats.missing > 0. Click routing: draft/returned → "amendment-preview"; otherwise → "draft-detail". Empty state for zero drafts and for no-match filters.
- CreateDraftView (PRD §6.2 FR-22,23,24, §6.3 FR-27, §10.1 wizard): 3-step wizard with a glass stepper indicator (completed steps ringed in primary + check icon; current step in primary tint; future muted). Step 1 lists active templates as selectable GlassCards (name, version, landlord, clauseCount, description, ring-2 primary on select); "Seterusnya" disabled until template selected. Step 2 renders the offer-letter form grouped into 4 sections (Maklumat Penyewa / Terma Kewangan / Kegunaan & Penyelenggaraan / Terma Lain) covering all 12 fields + specialConditions; each field has Malay label + required `*` marker on tenantName + Tooltip help icon + currency inputs show "RM" prefix + date input for commencementDate; explicit hint banner: "Medan kosong akan ditandakan [Untuk Pengesahan Business Unit]." Validation only blocks next-step if tenantName is empty. Step 3 shows read-only summary of selected template + filled/empty field chips (currency/tenancyPeriod auto-formatted), priority selector (Biasa/Tinggi/Segera buttons), draft title input with auto-suggested placeholder, and "Cipta Draf" button → POST /api/drafts → toast "Draf dicipta" → navigate("amendment-preview", {draftId}). Submitting shows Loader2 spinner; back/cancel buttons provided throughout.
- AmendmentPreviewView (PRD §6.4 FR-28..32, §10.2): fetches `/api/drafts/<id>` with LoadingBlock + EmptyState fallbacks. PageHeader (backable) shows draft title + StatusBadge + template name + tenantName description; meta GlassCard shows created/updated/pemajak/creator. Computes `const fivePart = buildFivePartOutput(draft.amendments)` and renders 5 tabs: (1) Ringkasan — 5 StatCards (Total/Dipinda/Percanggahan/Maklumat Hilang/Selari) + auto-built narrative summary + amber Alert when missingInfo>0; (2) Semakan Klausa — list of clauses with mono clauseNumber badge + title + IssueBadge (selari=emerald / percanggahan=red / ketiadaan maklumat=amber) + reasonForAmendment + offerLetterReference; (3) Klausa Dipinda — for each amendment, DiffViewer(originalText, sloEditedText || amendedText); (4) Pemerhatian — Alert cards colour-coded by type (missing=amber, conflict=red, risk=orange, note=primary); (5) Jadual — Table with horizontal scroll on mobile, columns Klausa | Peruntukan Asal | Peruntukan Dipinda | Sebab Pindaan | Rujukan Surat Tawaran. Sticky bottom action bar (GlassCard variant="strong" sticky bottom-4 z-20): if draft/returned → primary "Hantar untuk Semakan SLO" button (POST /api/drafts/<id>/submit) + risk disclaimer "Semua cadangan tertakluk kelulusan SLO"; if approved → "Muat Turun Dokumen Akhir" button that calls /api/drafts/<id>/export and triggers a Blob HTML download of the 5-part output (PRD §6.8 FR-43 — simulated Word export); if pending_review → info banner "Draf dihantar untuk semakan SLO"; if rejected → info banner.

Quality:
- All 3 files start with `"use client";` and use only `@/` aliases.
- Typed via imports from `@/lib/types` (Draft, Template, DraftClauseAmendment, FivePartOutput, LegalObservation, DraftStatus). No `any`.
- No console.log. LoadingBlock + EmptyState + toast (sonner) used for all async flows; spinners on all buttons during submit/export.
- Mobile-first responsive: stat grids 2→4 cols, filter chips horizontally scrollable, tabs list horizontally scrollable on mobile, table scrolls horizontally, sticky action bar wraps gracefully.
- Glassmorphism throughout; emerald/teal primary + amber accent + rose for "returned" — NO indigo/blue introduced.
- All UI text in Bahasa Malaysia.
- Foundation files untouched (lib/*, stores/*, app-shell, status-badges, diff-viewer, shared/common, page.tsx, layout, api routes, prisma).

Verification:
- `bun run lint` — clean (0 errors).
- dev.log — only `✓ Compiled` entries + 200 responses, no `⨯` errors after my writes.
- curl smoke tests: GET / (200), GET /api/stats?role=BU&userId=user-bu-1 (200), GET /api/drafts?createdBy=user-bu-1&status=all (200), GET /api/templates?status=active&clauses=true (200).

Stage Summary:
- BU module complete: dashboard → create-draft wizard → amendment-preview 5-part tabs → submit/export. Ready for SLO + Admin subagents (Tasks 7/8) to consume the same foundation.

---
Task ID: 9
Agent: main (verification)
Task: Wire-up, lint, dev server check, Agent Browser end-to-end self-verification

Work Log:
- Built DraftDetailView (read-only 5-part viewer for submitted/approved/rejected drafts) — the one shared stub remaining after subagent tasks. Includes all 5 tabs (Ringkasan/Semakan Klausa/Klausa Dipinda/Pemerhatian/Jadual), meta + offer-letter summary, export-to-txt for approved drafts (Blob download simulating Word export per PRD §6.8), audit-trail link, read-only notice.
- Ran `bun run lint` → 0 errors, 0 warnings.
- Agent Browser end-to-end verification (golden path per role):
  - BU: login (200) → dashboard (stats + 2 drafts + filters) → create-draft wizard (3 steps: template select → 12-field offer-letter form → review) → POST /api/drafts (201) → amendment-preview (5 tabs, stats 14/12/0/7/7, [Untuk Pengesahan Business Unit] markers for 7 empty fields) → POST /submit (200, toast, status→pending_review) ✓
  - SLO: login (200) → dashboard (pending drafts) → clause-review (12 clauses, side-by-side DiffViewer, 4 action buttons, progress) → PATCH accept clause (200, progress 1/12, toast) → batch-accept all (12/12) → final-approval view → POST decision=approved (200, toast "Draf diluluskan", navigate to dashboard) ✓
  - Admin: login (200) → dashboard (stats: 2 active/3 total templates, 5 drafts, 6.5 hari avg) → template-manager (3 templates incl. archived) → audit-trail (27 actions in timeline) ✓
  - DraftDetailView (read-only): rendered for pending_review draft with all 5 tabs + status badge + read-only notice ✓
- Responsive: mobile viewport (390x844) → mobile header with hamburger present, desktop sidebar hidden ✓
- Sticky footer: verified natural push on long content (footer at 1596px on 844px viewport) — AppShell uses `min-h-screen flex flex-col` + `mt-auto` footer pattern ✓
- Console: 0 runtime errors during all flows ✓
- Dev log: clean 200 responses; only Prisma FK errors were from a manual curl test with a fabricated userId (not app behavior — app always sends real auth user id) ✓

Stage Summary:
- ALL PRD core workflows verified end-to-end in the browser:
  - §5 Core Workflow steps 1-10 ✓
  - §6.1 Login (simulated) ✓
  - §6.2 Offer letter input form (12 fields, validation) ✓
  - §6.3 Template selection ✓
  - §6.4 Comparison + 5-part generation (Ringkasan/Semakan Klausa/Klausa Dipinda/Pemerhatian/Jadual) + [Untuk Pengesahan Business Unit] markers ✓
  - §6.5 SLO review (side-by-side, accept/edit/reject/needs-input, final approve/return/reject) ✓
  - §6.6 Role-aware dashboards (BU/SLO/Admin) ✓
  - §6.7 Audit trail (timeline) ✓
  - §6.8 Export (approved draft → 5-part text download) ✓
  - §6.9 Toasts + color status badges ✓
- System is production-ready as a functional prototype. Login creds:
  - BU: bu@pepperlabs.my / bu123
  - SLO: slo@pepperlabs.my / slo123
  - ADMIN: admin@pepperlabs.my / admin123
