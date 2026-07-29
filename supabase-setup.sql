-- ============================================================================
-- Pepper Labs — Sistem Semakan dan Pindaan Klausa Perjanjian Penyewaan
-- Tenancy Agreement Clause Review & Amendment System (PRD v2.0)
-- ============================================================================
-- Run this entire script in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- It is IDEMPOTENT: safe to re-run (drops + recreates everything).
-- It creates all 7 tables + seeds all dummy data (users, templates, clauses,
-- offer letters, drafts, amendments, audit logs).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. CLEAN SLATE (drop in FK-dependency order)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "DraftClauseAmendment" CASCADE;
DROP TABLE IF EXISTS "Draft" CASCADE;
DROP TABLE IF EXISTS "OfferLetter" CASCADE;
DROP TABLE IF EXISTS "TemplateClause" CASCADE;
DROP TABLE IF EXISTS "Template" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- ----------------------------------------------------------------------------
-- 1. TABLES (PostgreSQL, mirrors prisma/schema.prisma)
-- ----------------------------------------------------------------------------
CREATE TABLE "User" (
  "id"        TEXT PRIMARY KEY,
  "email"     TEXT NOT NULL UNIQUE,
  "name"      TEXT NOT NULL,
  "password"  TEXT NOT NULL,
  "role"      TEXT NOT NULL DEFAULT 'BU',
  "department" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Template" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "version"     TEXT NOT NULL DEFAULT '1.0',
  "landlordName" TEXT,
  "description" TEXT,
  "status"      TEXT NOT NULL DEFAULT 'active',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "TemplateClause" (
  "id"           TEXT PRIMARY KEY,
  "templateId"   TEXT NOT NULL REFERENCES "Template"("id") ON DELETE CASCADE,
  "clauseNumber" TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "originalText" TEXT NOT NULL,
  "mappedField"  TEXT NOT NULL,
  "order"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "TemplateClause_templateId_idx" ON "TemplateClause"("templateId");

CREATE TABLE "OfferLetter" (
  "id"                TEXT PRIMARY KEY,
  "tenantName"        TEXT NOT NULL,
  "rentalRate"        DOUBLE PRECISION NOT NULL,
  "tenancyPeriod"     TEXT NOT NULL,
  "commencementDate"  TEXT NOT NULL,
  "deposit"           DOUBLE PRECISION NOT NULL,
  "premisesUse"       TEXT NOT NULL,
  "maintenanceTerms"  TEXT NOT NULL,
  "utilitiesTerms"    TEXT NOT NULL,
  "renewalTerms"      TEXT NOT NULL,
  "terminationTerms"  TEXT NOT NULL,
  "defaultTerms"      TEXT NOT NULL,
  "specialConditions" TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Draft" (
  "id"            TEXT PRIMARY KEY,
  "title"         TEXT NOT NULL,
  "templateId"    TEXT NOT NULL REFERENCES "Template"("id"),
  "offerLetterId" TEXT NOT NULL REFERENCES "OfferLetter"("id"),
  "createdBy"     TEXT NOT NULL REFERENCES "User"("id"),
  "status"        TEXT NOT NULL DEFAULT 'draft',
  "priority"      TEXT NOT NULL DEFAULT 'normal',
  "createdDate"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastUpdated"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "Draft_status_idx"    ON "Draft"("status");
CREATE INDEX "Draft_createdBy_idx" ON "Draft"("createdBy");

CREATE TABLE "DraftClauseAmendment" (
  "id"                   TEXT PRIMARY KEY,
  "draftId"              TEXT NOT NULL REFERENCES "Draft"("id") ON DELETE CASCADE,
  "clauseId"             TEXT NOT NULL REFERENCES "TemplateClause"("id"),
  "issueIdentified"      TEXT NOT NULL,
  "reasonForAmendment"   TEXT NOT NULL,
  "offerLetterReference" TEXT NOT NULL,
  "amendedText"          TEXT NOT NULL,
  "sloDecision"          TEXT NOT NULL DEFAULT 'pending',
  "sloComment"           TEXT,
  "sloEditedText"        TEXT,
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedBy"            TEXT REFERENCES "User"("id")
);
CREATE INDEX "DraftClauseAmendment_draftId_idx"     ON "DraftClauseAmendment"("draftId");
CREATE INDEX "DraftClauseAmendment_sloDecision_idx" ON "DraftClauseAmendment"("sloDecision");

CREATE TABLE "AuditLog" (
  "id"        TEXT PRIMARY KEY,
  "draftId"   TEXT REFERENCES "Draft"("id") ON DELETE CASCADE,
  "userId"    TEXT NOT NULL REFERENCES "User"("id"),
  "userName"  TEXT NOT NULL,
  "userRole"  TEXT NOT NULL,
  "action"    TEXT NOT NULL,
  "details"   TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "AuditLog_draftId_idx"   ON "AuditLog"("draftId");
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- ----------------------------------------------------------------------------
-- 2. USERS  (PRD §3)  — 4 users: BU, BU2, SLO, Admin
-- ----------------------------------------------------------------------------
INSERT INTO "User" (id, email, name, password, role, department) VALUES
  ('user-bu-1',    'bu@pepperlabs.my',    'Aisyah Rahman', 'bu123',    'BU',    'Business Unit — Property'),
  ('user-slo-1',   'slo@pepperlabs.my',   'Lim Wei Jian',  'slo123',   'SLO',   'Legal & Compliance'),
  ('user-admin-1', 'admin@pepperlabs.my', 'Nurul Huda',    'admin123', 'ADMIN', 'Platform Operations'),
  ('user-bu-2',    'bu2@pepperlabs.my',   'Arjun Kumar',   'bu123',    'BU',    'Business Unit — Retail');

-- ----------------------------------------------------------------------------
-- 3. TEMPLATES  (PRD §9.1)  — 3 templates (2 active + 1 archived)
-- ----------------------------------------------------------------------------
INSERT INTO "Template" (id, name, version, "landlordName", description, status) VALUES
  ('tmpl-perkeso', 'Templat Perjanjian Penyewaan PERKESO — Tuan Tanah', '2.0',
   'PERKESO (Social Security Organisation)',
   'Templat piawai bagi perjanjian penyewaan premis komersil di mana PERKESO bertindak sebagai Tuan Tanah.',
   'active'),
  ('tmpl-retail',  'Templat Penyewaan Premis Runcit — Pepper Labs Properties', '1.0',
   'Pepper Labs Properties Sdn Bhd',
   'Templat bagi penyewaan premis runcit di pusat membeli-belah milik Pepper Labs Properties.',
   'active'),
  ('tmpl-archive', 'Templat Penyewaan Pejabat (Lama) — Pepper Labs', '0.9',
   'Pepper Labs Properties Sdn Bhd',
   'Templat pejabat versi terdahulu, telah diarkibkan.',
   'archived');

-- ----------------------------------------------------------------------------
-- 4. TEMPLATE CLAUSES  (PRD §9.2)  — PERKESO (14) + Retail (10) + Archived (1)
-- ----------------------------------------------------------------------------
INSERT INTO "TemplateClause" (id, "templateId", "clauseNumber", title, "originalText", "mappedField", "order") VALUES
  -- PERKESO template (14 clauses)
  ('pk-1',  'tmpl-perkeso', '1.1',  'Pihak-Pihak Perjanjian',
   'Perjanjian ini dibuat pada [Tarikh] antara PERKESO, sebuah pertubuhan yang ditubuhkan di bawah Akta Keselamatan Sosial 1969, bertindak selaku Tuan Tanah, dan [Nama Penyewa] bertindak selaku Penyewa.',
   'tenantName', 0),
  ('pk-2',  'tmpl-perkeso', '2.1',  'Tempoh Penyewaan',
   'Penyewaan ini adalah untuk tempoh [Tempoh] bulan mulai dari [Tarikh Kuat Kuasa] dan berakhir pada [Tarikh Tamat].',
   'tenancyPeriod', 1),
  ('pk-3',  'tmpl-perkeso', '3.1',  'Kadar Sewa',
   'Penyewa bersetuju untuk membayar kepada Tuan Tanah kadar sewa bulanan sebanyak RM[X,XXX.00] setiap bulan, bayaran dibuat pada atau sebelum hari ke-7 setiap bulan kalendar.',
   'rentalRate', 2),
  ('pk-4',  'tmpl-perkeso', '3.2',  'Tarikh Kuat Kuasa',
   'Penyewaan ini berkuat kuasa mulai [Tarikh Kuat Kuasa] dan semua obligasi di bawah perjanjian ini bermula pada tarikh tersebut.',
   'commencementDate', 3),
  ('pk-5',  'tmpl-perkeso', '4.1',  'Deposit',
   'Penyewa telah menyerahkan kepada Tuan Tanah jumlah deposit sebanyak RM[X,XXX.00] sebagai jaminan Deposit Keselamatan, akan dikembalikan tanpa faedah selepas tamat tempoh penyewaan tertakluk kepada syarat perjanjian.',
   'deposit', 4),
  ('pk-6',  'tmpl-perkeso', '5.1',  'Kegunaan Premis',
   'Penyewa tidak boleh menggunakan premis selain untuk tujuan [Kegunaan Premis] dan tidak boleh menukar kegunaan premis tanpa kebenaran bertulis Tuan Tanah.',
   'premisesUse', 5),
  ('pk-7',  'tmpl-perkeso', '6.1',  'Penyelenggaraan',
   'Tuan Tanah bertanggungjawab ke atas penyelenggaraan struktur utama, manakala Penyewa bertanggungjawab ke atas penyelenggaraan dalaman dan pembaikan kecil. [Terma Penyelenggaraan]',
   'maintenanceTerms', 6),
  ('pk-8',  'tmpl-perkeso', '7.1',  'Utiliti',
   'Penyewa bertanggungjawab menjelaskan bil utiliti termasuk bekalan elektrik, air, dan telekomunikasi bagi premis sepanjang tempoh penyewaan. [Terma Utiliti]',
   'utilitiesTerms', 7),
  ('pk-9',  'tmpl-perkeso', '8.1',  'Pembaharuan',
   'Penyewaan boleh diperbaharui untuk tempoh tambahan tertakluk kepada persetujuan bersama dan semakan kadar sewa. [Terma Pembaharuan]',
   'renewalTerms', 8),
  ('pk-10', 'tmpl-perkeso', '9.1',  'Penamatan',
   'Mana-mana pihak boleh menamatkan perjanjian ini dengan notis bertulis [Tempoh Notis] terlebih dahulu. [Terma Penamatan]',
   'terminationTerms', 9),
  ('pk-11', 'tmpl-perkeso', '10.1', 'Klausa Ingkar',
   'Sekiranya Penyewa gagal mematuhi sebarang terma perjanjian ini, Tuan Tanah berhak mengambil tindakan [Tindakan Ingkar] termasuk tetapi tidak terhad kepada penamatan perjanjian dan pemilikan deposit.',
   'defaultTerms', 10),
  ('pk-12', 'tmpl-perkeso', '11.1', 'Syarat Khas',
   'Sebarang syarat tambahan yang dipersetujui antara kedua-dua pihak seperti berikut: [Syarat Khas].',
   'specialConditions', 11),
  ('pk-13', 'tmpl-perkeso', '12.1', 'Pendakwaan Undang-Undang',
   'Perjanjian ini ditadbir oleh undang-undang Malaysia dan mana-mana pertikaian akan dirujuk kepada bidang kuasa mahkamah Malaysia.',
   '_standard', 12),
  ('pk-14', 'tmpl-perkeso', '13.1', 'Notis & Komunikasi',
   'Semua notis di bawah perjanjian ini hendaklah diberikan secara bertulis dan dihantar ke alamat berdaftar pihak masing-masing.',
   '_standard', 13),

  -- Retail template (10 clauses)
  ('rt-1', 'tmpl-retail', '1.1',  'Pihak-Pihak Perjanjian',
   'Perjanjian ini dibuat antara Pepper Labs Properties Sdn Bhd selaku Tuan Tanah dan [Nama Penyewa] selaku Penyewa bagi premis runcit.',
   'tenantName', 0),
  ('rt-2', 'tmpl-retail', '2.1',  'Tempoh Penyewaan',
   'Penyewaan adalah untuk tempoh [Tempoh] bulan mulai [Tarikh Kuat Kuasa].',
   'tenancyPeriod', 1),
  ('rt-3', 'tmpl-retail', '3.1',  'Kadar Sewa',
   'Kadar sewa bulanan ialah RM[X,XXX.00] dibayar pada hari ke-7 setiap bulan.',
   'rentalRate', 2),
  ('rt-4', 'tmpl-retail', '4.1',  'Deposit',
   'Deposit keselamatan sebanyak RM[X,XXX.00] telah diserahkan.',
   'deposit', 3),
  ('rt-5', 'tmpl-retail', '5.1',  'Kegunaan Premis',
   'Premis hanya untuk kegunaan [Kegunaan Premis].',
   'premisesUse', 4),
  ('rt-6', 'tmpl-retail', '6.1',  'Penyelenggaraan',
   '[Terma Penyelenggaraan] antara Tuan Tanah dan Penyewa.',
   'maintenanceTerms', 5),
  ('rt-7', 'tmpl-retail', '7.1',  'Utiliti',
   '[Terma Utiliti] — Penyewa menjelaskan bil utiliti.',
   'utilitiesTerms', 6),
  ('rt-8', 'tmpl-retail', '8.1',  'Pembaharuan',
   '[Terma Pembaharuan] tertakluk persetujuan bersama.',
   'renewalTerms', 7),
  ('rt-9', 'tmpl-retail', '9.1',  'Penamatan',
   '[Terma Penamatan] dengan notis bertulis.',
   'terminationTerms', 8),
  ('rt-10','tmpl-retail', '10.1', 'Klausa Ingkar',
   '[Tindakan Ingkar] sekiranya berlaku pelanggaran.',
   'defaultTerms', 9),

  -- Archived template (1 clause)
  ('ar-1', 'tmpl-archive', '1.1', 'Pihak-Pihak',
   'Antara Tuan Tanah dan [Nama Penyewa].',
   'tenantName', 0);

-- ----------------------------------------------------------------------------
-- 5. OFFER LETTERS  (PRD §9.3)  — 3 offer letters
-- ----------------------------------------------------------------------------
INSERT INTO "OfferLetter" (id, "tenantName", "rentalRate", "tenancyPeriod", "commencementDate", "deposit", "premisesUse", "maintenanceTerms", "utilitiesTerms", "renewalTerms", "terminationTerms", "defaultTerms", "specialConditions") VALUES
  ('ol-1', 'Syarikat Teknologi Maju Sdn Bhd', 8500, '36', '2026-09-01', 25500,
   'Pejabat korporat dan pusat data serantau',
   'Penyewa bertanggungjawab penyelenggaraan dalaman; Tuan Tanah bertanggungjawab struktur bumbung dan sistem bangunan utama.',
   'Penyewa menjelaskan bil elektrik, air, internet dantelekomunikasi terus kepada pembekal.',
   'Boleh diperbaharui selama 24 bulan tambahan dengan kenaikan sewa 10% tertakluk persetujuan bersama.',
   'Notis bertulis 90 hari terlebih dahulu oleh mana-mana pihak.',
   'Penamatan serta-merta dan pemilikan deposit sekiranya tunggakan sewa melebihi 30 hari.',
   'Penyewa mesti mengekalkan liputan insurans kandungan sepanjang tempoh.'),
  ('ol-2', 'Kafe Selera Tradisional Sdn Bhd', 4200, '24', '2026-08-15', 12600,
   'Restoran dan dapur komersial',
   'Penyewa bertanggungjawab penyelenggaraan penuh termasuk sistem ekzos dapur.',
   'Penyewa menjelaskan semua bil utiliti termasuk gas.',
   'Boleh diperbaharui 12 bulan tertakluk semakan kadar sewa.',
   'Notis bertulis 60 hari oleh mana-mana pihak.',
   'Pemilikan deposit dan penamatan selepas tunggakan 14 hari.',
   NULL),
  ('ol-3', 'Klinik Perubatan Sentosa', 6700, '30', '2026-10-01', 20100,
   'Klinik perubatan dan farmasi',
   'Penyenggaraan dalaman oleh Penyewa; struktur oleh Tuan Tanah.',
   'Penyewa menjelaskan utiliti termasuk pembuangan sisa perubatan.',
   'Pembaharuan 24 bulan dengan kenaikan sewa 8%.',
   'Notis 90 hari bertulis.',
   'Penamatan serta-merta selepas tunggakan 30 hari.',
   'Pematuhan penuh Akta Klinik 2007 diperlukan.');

-- ----------------------------------------------------------------------------
-- 6. DRAFTS  (PRD §9.4)  — 4 drafts at varied statuses
--    (timestamps offset from now() to simulate history)
-- ----------------------------------------------------------------------------
INSERT INTO "Draft" (id, title, "templateId", "offerLetterId", "createdBy", status, priority, "createdDate", "lastUpdated") VALUES
  ('draft-1', 'Penyewaan — Syarikat Teknologi Maju (PERKESO)',
   'tmpl-perkeso', 'ol-1', 'user-bu-1', 'pending_review', 'high',
   now() - interval '5 days', now() - interval '2 days'),
  ('draft-2', 'Penyewaan — Kafe Selera Tradisional (PERKESO)',
   'tmpl-perkeso', 'ol-2', 'user-bu-2', 'returned', 'normal',
   now() - interval '9 days', now() - interval '3 days'),
  ('draft-3', 'Penyewaan — Klinik Perubatan Sentosa (PERKESO)',
   'tmpl-perkeso', 'ol-3', 'user-bu-1', 'approved', 'urgent',
   now() - interval '14 days', now() - interval '6 days'),
  ('draft-4', 'Penyewaan — Premis Runcit (Retail Template)',
   'tmpl-retail', 'ol-1', 'user-bu-2', 'draft', 'normal',
   now() - interval '1 day',  now() - interval '1 day');

-- ----------------------------------------------------------------------------
-- 7. DRAFT CLAUSE AMENDMENTS  (PRD §9.5)
--    Generated by the clause-comparison engine: template placeholders are
--    substituted with offer-letter values; missing values are marked
--    "[Untuk Pengesahan Business Unit]".
--    Drafts 1, 2, 3 use the PERKESO template (clauses pk-1..pk-12 are mapped;
--    pk-13 & pk-14 are _standard so no amendment row is created).
--    Draft 4 uses the Retail template (rt-1..rt-10).
-- ----------------------------------------------------------------------------

-- === Draft 1 (pending_review) — Offer Letter 1 (Syarikat Teknologi Maju) ===
INSERT INTO "DraftClauseAmendment" (id, "draftId", "clauseId", "issueIdentified", "reasonForAmendment", "offerLetterReference", "amendedText", "sloDecision") VALUES
  ('am-d1-1', 'draft-1', 'pk-1', 'selari',
   'Memasukkan terma dari Surat Tawaran: Syarikat Teknologi Maju Sdn Bhd.',
   'Surat Tawaran Penyewaan — medan tenantName',
   'Perjanjian ini dibuat pada 01 Sep 2026 antara PERKESO, sebuah pertubuhan yang ditubuhkan di bawah Akta Keselamatan Sosial 1969, bertindak selaku Tuan Tanah, dan Syarikat Teknologi Maju Sdn Bhd bertindak selaku Penyewa.',
   'pending'),
  ('am-d1-2', 'draft-1', 'pk-2', 'selari',
   'Memasukkan terma dari Surat Tawaran: 36 bulan.',
   'Surat Tawaran Penyewaan — medan tenancyPeriod',
   'Penyewaan ini adalah untuk tempoh 36 bulan mulai dari 2026-09-01 dan berakhir pada 2028-09-01.',
   'pending'),
  ('am-d1-3', 'draft-1', 'pk-3', 'selari',
   'Memasukkan terma dari Surat Tawaran: RM8,500.00.',
   'Surat Tawaran Penyewaan — medan rentalRate',
   'Penyewa bersetuju untuk membayar kepada Tuan Tanah kadar sewa bulanan sebanyak RM8,500.00 setiap bulan, bayaran dibuat pada atau sebelum hari ke-7 setiap bulan kalendar.',
   'pending'),
  ('am-d1-4', 'draft-1', 'pk-4', 'selari',
   'Memasukkan terma dari Surat Tawaran: 2026-09-01.',
   'Surat Tawaran Penyewaan — medan commencementDate',
   'Penyewaan ini berkuat kuasa mulai 2026-09-01 dan semua obligasi di bawah perjanjian ini bermula pada tarikh tersebut.',
   'pending'),
  ('am-d1-5', 'draft-1', 'pk-5', 'selari',
   'Memasukkan terma dari Surat Tawaran: RM25,500.00.',
   'Surat Tawaran Penyewaan — medan deposit',
   'Penyewa telah menyerahkan kepada Tuan Tanah jumlah deposit sebanyak RM25,500.00 sebagai jaminan Deposit Keselamatan, akan dikembalikan tanpa faedah selepas tamat tempoh penyewaan tertakluk kepada syarat perjanjian.',
   'pending'),
  ('am-d1-6', 'draft-1', 'pk-6', 'selari',
   'Memasukkan terma dari Surat Tawaran: Pejabat korporat dan pusat data serantau.',
   'Surat Tawaran Penyewaan — medan premisesUse',
   'Penyewa tidak boleh menggunakan premis selain untuk tujuan Pejabat korporat dan pusat data serantau dan tidak boleh menukar kegunaan premis tanpa kebenaran bertulis Tuan Tanah.',
   'pending'),
  ('am-d1-7', 'draft-1', 'pk-7', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penyewa bertanggungjawab penyelenggaraan dalaman; Tuan Tanah bertanggungjawab struktur bumbung dan sistem bangunan utama.',
   'Surat Tawaran Penyewaan — medan maintenanceTerms',
   'Tuan Tanah bertanggungjawab ke atas penyelenggaraan struktur utama, manakala Penyewa bertanggungjawab ke atas penyelenggaraan dalaman dan pembaikan kecil. Penyewa bertanggungjawab penyelenggaraan dalaman; Tuan Tanah bertanggungjawab struktur bumbung dan sistem bangunan utama.',
   'pending'),
  ('am-d1-8', 'draft-1', 'pk-8', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penyewa menjelaskan bil elektrik, air, internet dantelekomunikasi terus kepada pembekal.',
   'Surat Tawaran Penyewaan — medan utilitiesTerms',
   'Penyewa bertanggungjawab menjelaskan bil utiliti termasuk bekalan elektrik, air, dan telekomunikasi bagi premis sepanjang tempoh penyewaan. Penyewa menjelaskan bil elektrik, air, internet dantelekomunikasi terus kepada pembekal.',
   'pending'),
  ('am-d1-9', 'draft-1', 'pk-9', 'selari',
   'Memasukkan terma dari Surat Tawaran: Boleh diperbaharui selama 24 bulan tambahan dengan kenaikan sewa 10% tertakluk persetujuan bersama.',
   'Surat Tawaran Penyewaan — medan renewalTerms',
   'Penyewaan boleh diperbaharui untuk tempoh tambahan tertakluk kepada persetujuan bersama dan semakan kadar sewa. Boleh diperbaharui selama 24 bulan tambahan dengan kenaikan sewa 10% tertakluk persetujuan bersama.',
   'pending'),
  ('am-d1-10', 'draft-1', 'pk-10', 'selari',
   'Memasukkan terma dari Surat Tawaran: Notis bertulis 90 hari terlebih dahulu oleh mana-mana pihak.',
   'Surat Tawaran Penyewaan — medan terminationTerms',
   'Mana-mana pihak boleh menamatkan perjanjian ini dengan notis bertulis 90 hari terlebih dahulu. Notis bertulis 90 hari terlebih dahulu oleh mana-mana pihak.',
   'pending'),
  ('am-d1-11', 'draft-1', 'pk-11', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penamatan serta-merta dan pemilikan deposit sekiranya tunggakan sewa melebihi 30 hari.',
   'Surat Tawaran Penyewaan — medan defaultTerms',
   'Sekiranya Penyewa gagal mematuhi sebarang terma perjanjian ini, Tuan Tanah berhak mengambil tindakan Penamatan serta-merta dan pemilikan deposit sekiranya tunggakan sewa melebihi 30 hari. termasuk tetapi tidak terhad kepada penamatan perjanjian dan pemilikan deposit.',
   'pending'),
  ('am-d1-12', 'draft-1', 'pk-12', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penyewa mesti mengekalkan liputan insurans kandungan sepanjang tempoh.',
   'Surat Tawaran Penyewaan — medan specialConditions',
   'Sebarang syarat tambahan yang dipersetujui antara kedua-dua pihak seperti berikut: Penyewa mesti mengekalkan liputan insurans kandungan sepanjang tempoh.',
   'pending');

-- === Draft 2 (returned) — Offer Letter 2 (Kafe Selera Tradisional) ===
-- Note: specialConditions is NULL → clause pk-12 marked [Untuk Pengesahan Business Unit]
INSERT INTO "DraftClauseAmendment" (id, "draftId", "clauseId", "issueIdentified", "reasonForAmendment", "offerLetterReference", "amendedText", "sloDecision", "sloComment", "sloEditedText", "updatedBy") VALUES
  ('am-d2-1', 'draft-2', 'pk-1', 'selari',
   'Memasukkan terma dari Surat Tawaran: Kafe Selera Tradisional Sdn Bhd.',
   'Surat Tawaran Penyewaan — medan tenantName',
   'Perjanjian ini dibuat pada 15 Aug 2026 antara PERKESO, sebuah pertubuhan yang ditubuhkan di bawah Akta Keselamatan Sosial 1969, bertindak selaku Tuan Tanah, dan Kafe Selera Tradisional Sdn Bhd bertindak selaku Penyewa.',
   'pending', NULL, NULL, NULL),
  ('am-d2-2', 'draft-2', 'pk-2', 'selari',
   'Memasukkan terma dari Surat Tawaran: 24 bulan.',
   'Surat Tawaran Penyewaan — medan tenancyPeriod',
   'Penyewaan ini adalah untuk tempoh 24 bulan mulai dari 2026-08-15 dan berakhir pada 2028-08-15.',
   'pending', NULL, NULL, NULL),
  ('am-d2-3', 'draft-2', 'pk-3', 'rejected',
   'Memasukkan terma dari Surat Tawaran: RM4,200.00.',
   'Surat Tawaran Penyewaan — medan rentalRate',
   'Penyewa bersetuju untuk membayar kepada Tuan Tanah kadar sewa bulanan sebanyak RM4,200.00 setiap bulan, bayaran dibuat pada atau sebelum hari ke-7 setiap bulan kalendar.',
   'rejected', 'Kadar sewa perlu disahkan semula — sila lampirkan surat tawaran rasmi.', NULL, 'user-slo-1'),
  ('am-d2-4', 'draft-2', 'pk-4', 'selari',
   'Memasukkan terma dari Surat Tawaran: 2026-08-15.',
   'Surat Tawaran Penyewaan — medan commencementDate',
   'Penyewaan ini berkuat kuasa mulai 2026-08-15 dan semua obligasi di bawah perjanjian ini bermula pada tarikh tersebut.',
   'pending', NULL, NULL, NULL),
  ('am-d2-5', 'draft-2', 'pk-5', 'selari',
   'Memasukkan terma dari Surat Tawaran: RM12,600.00.',
   'Surat Tawaran Penyewaan — medan deposit',
   'Penyewa telah menyerahkan kepada Tuan Tanah jumlah deposit sebanyak RM12,600.00 sebagai jaminan Deposit Keselamatan, akan dikembalikan tanpa faedah selepas tamat tempoh penyewaan tertakluk kepada syarat perjanjian.',
   'pending', NULL, NULL, NULL),
  ('am-d2-6', 'draft-2', 'pk-6', 'edited',
   'Memasukkan terma dari Surat Tawaran: Restoran dan dapur komersial.',
   'Surat Tawaran Penyewaan — medan premisesUse',
   'Penyewa tidak boleh menggunakan premis selain untuk tujuan Restoran dan dapur komersial dan tidak boleh menukar kegunaan premis tanpa kebenaran bertulis Tuan Tanah.',
   'edited', 'Tambah syarat HALAL untuk pematuhan.',
   'Premis hanya untuk kegunaan restoran dan dapur komersial HALAL sahaja.', 'user-slo-1'),
  ('am-d2-7', 'draft-2', 'pk-7', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penyewa bertanggungjawab penyelenggaraan penuh termasuk sistem ekzos dapur.',
   'Surat Tawaran Penyewaan — medan maintenanceTerms',
   'Tuan Tanah bertanggungjawab ke atas penyelenggaraan struktur utama, manakala Penyewa bertanggungjawab ke atas penyelenggaraan dalaman dan pembaikan kecil. Penyewa bertanggungjawab penyelenggaraan penuh termasuk sistem ekzos dapur.',
   'pending', NULL, NULL, NULL),
  ('am-d2-8', 'draft-2', 'pk-8', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penyewa menjelaskan semua bil utiliti termasuk gas.',
   'Surat Tawaran Penyewaan — medan utilitiesTerms',
   'Penyewa bertanggungjawab menjelaskan bil utiliti termasuk bekalan elektrik, air, dan telekomunikasi bagi premis sepanjang tempoh penyewaan. Penyewa menjelaskan semua bil utiliti termasuk gas.',
   'pending', NULL, NULL, NULL),
  ('am-d2-9', 'draft-2', 'pk-9', 'selari',
   'Memasukkan terma dari Surat Tawaran: Boleh diperbaharui 12 bulan tertakluk semakan kadar sewa.',
   'Surat Tawaran Penyewaan — medan renewalTerms',
   'Penyewaan boleh diperbaharui untuk tempoh tambahan tertakluk kepada persetujuan bersama dan semakan kadar sewa. Boleh diperbaharui 12 bulan tertakluk semakan kadar sewa.',
   'pending', NULL, NULL, NULL),
  ('am-d2-10', 'draft-2', 'pk-10', 'selari',
   'Memasukkan terma dari Surat Tawaran: Notis bertulis 60 hari oleh mana-mana pihak.',
   'Surat Tawaran Penyewaan — medan terminationTerms',
   'Mana-mana pihak boleh menamatkan perjanjian ini dengan notis bertulis 90 hari terlebih dahulu. Notis bertulis 60 hari oleh mana-mana pihak.',
   'pending', NULL, NULL, NULL),
  ('am-d2-11', 'draft-2', 'pk-11', 'selari',
   'Memasukkan terma dari Surat Tawaran: Pemilikan deposit dan penamatan selepas tunggakan 14 hari.',
   'Surat Tawaran Penyewaan — medan defaultTerms',
   'Sekiranya Penyewa gagal mematuhi sebarang terma perjanjian ini, Tuan Tanah berhak mengambil tindakan Pemilikan deposit dan penamatan selepas tunggakan 14 hari. termasuk tetapi tidak terhad kepada penamatan perjanjian dan pemilikan deposit.',
   'pending', NULL, NULL, NULL),
  ('am-d2-12', 'draft-2', 'pk-12', 'needs_bu_input',
   'Maklumat "Syarat Khas" tidak dinyatakan dalam Surat Tawaran Penyewaan.',
   'Tiada rujukan dalam Surat Tawaran Penyewaan',
   '[Untuk Pengesahan Business Unit]',
   'needs_bu_input', 'Sila nyatakan syarat khas dengan terperinci.', NULL, 'user-slo-1');

-- === Draft 3 (approved) — Offer Letter 3 (Klinik Perubatan Sentosa) ===
-- All clauses pre-accepted by SLO (simulating a completed review)
INSERT INTO "DraftClauseAmendment" (id, "draftId", "clauseId", "issueIdentified", "reasonForAmendment", "offerLetterReference", "amendedText", "sloDecision", "sloComment") VALUES
  ('am-d3-1', 'draft-3', 'pk-1', 'selari',
   'Memasukkan terma dari Surat Tawaran: Klinik Perubatan Sentosa.',
   'Surat Tawaran Penyewaan — medan tenantName',
   'Perjanjian ini dibuat pada 01 Oct 2026 antara PERKESO, sebuah pertubuhan yang ditubuhkan di bawah Akta Keselamatan Sosial 1969, bertindak selaku Tuan Tanah, dan Klinik Perubatan Sentosa bertindak selaku Penyewa.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-2', 'draft-3', 'pk-2', 'selari',
   'Memasukkan terma dari Surat Tawaran: 30 bulan.',
   'Surat Tawaran Penyewaan — medan tenancyPeriod',
   'Penyewaan ini adalah untuk tempoh 30 bulan mulai dari 2026-10-01 dan berakhir pada 2029-04-01.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-3', 'draft-3', 'pk-3', 'selari',
   'Memasukkan terma dari Surat Tawaran: RM6,700.00.',
   'Surat Tawaran Penyewaan — medan rentalRate',
   'Penyewa bersetuju untuk membayar kepada Tuan Tanah kadar sewa bulanan sebanyak RM6,700.00 setiap bulan, bayaran dibuat pada atau sebelum hari ke-7 setiap bulan kalendar.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-4', 'draft-3', 'pk-4', 'selari',
   'Memasukkan terma dari Surat Tawaran: 2026-10-01.',
   'Surat Tawaran Penyewaan — medan commencementDate',
   'Penyewaan ini berkuat kuasa mulai 2026-10-01 dan semua obligasi di bawah perjanjian ini bermula pada tarikh tersebut.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-5', 'draft-3', 'pk-5', 'selari',
   'Memasukkan terma dari Surat Tawaran: RM20,100.00.',
   'Surat Tawaran Penyewaan — medan deposit',
   'Penyewa telah menyerahkan kepada Tuan Tanah jumlah deposit sebanyak RM20,100.00 sebagai jaminan Deposit Keselamatan, akan dikembalikan tanpa faedah selepas tamat tempoh penyewaan tertakluk kepada syarat perjanjian.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-6', 'draft-3', 'pk-6', 'selari',
   'Memasukkan terma dari Surat Tawaran: Klinik perubatan dan farmasi.',
   'Surat Tawaran Penyewaan — medan premisesUse',
   'Penyewa tidak boleh menggunakan premis selain untuk tujuan Klinik perubatan dan farmasi dan tidak boleh menukar kegunaan premis tanpa kebenaran bertulis Tuan Tanah.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-7', 'draft-3', 'pk-7', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penyenggaraan dalaman oleh Penyewa; struktur oleh Tuan Tanah.',
   'Surat Tawaran Penyewaan — medan maintenanceTerms',
   'Tuan Tanah bertanggungjawab ke atas penyelenggaraan struktur utama, manakala Penyewa bertanggungjawab ke atas penyelenggaraan dalaman dan pembaikan kecil. Penyenggaraan dalaman oleh Penyewa; struktur oleh Tuan Tanah.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-8', 'draft-3', 'pk-8', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penyewa menjelaskan utiliti termasuk pembuangan sisa perubatan.',
   'Surat Tawaran Penyewaan — medan utilitiesTerms',
   'Penyewa bertanggungjawab menjelaskan bil utiliti termasuk bekalan elektrik, air, dan telekomunikasi bagi premis sepanjang tempoh penyewaan. Penyewa menjelaskan utiliti termasuk pembuangan sisa perubatan.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-9', 'draft-3', 'pk-9', 'selari',
   'Memasukkan terma dari Surat Tawaran: Pembaharuan 24 bulan dengan kenaikan sewa 8%.',
   'Surat Tawaran Penyewaan — medan renewalTerms',
   'Penyewaan boleh diperbaharui untuk tempoh tambahan tertakluk kepada persetujuan bersama dan semakan kadar sewa. Pembaharuan 24 bulan dengan kenaikan sewa 8%.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-10', 'draft-3', 'pk-10', 'selari',
   'Memasukkan terma dari Surat Tawaran: Notis 90 hari bertulis.',
   'Surat Tawaran Penyewaan — medan terminationTerms',
   'Mana-mana pihak boleh menamatkan perjanjian ini dengan notis bertulis 90 hari terlebih dahulu. Notis 90 hari bertulis.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-11', 'draft-3', 'pk-11', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penamatan serta-merta selepas tunggakan 30 hari.',
   'Surat Tawaran Penyewaan — medan defaultTerms',
   'Sekiranya Penyewa gagal mematuhi sebarang terma perjanjian ini, Tuan Tanah berhak mengambil tindakan Penamatan serta-merta selepas tunggakan 30 hari. termasuk tetapi tidak terhad kepada penamatan perjanjian dan pemilikan deposit.',
   'accepted', 'Disemak dan diterima.'),
  ('am-d3-12', 'draft-3', 'pk-12', 'selari',
   'Memasukkan terma dari Surat Tawaran: Pematuhan penuh Akta Klinik 2007 diperlukan.',
   'Surat Tawaran Penyewaan — medan specialConditions',
   'Sebarang syarat tambahan yang dipersetujui antara kedua-dua pihak seperti berikut: Pematuhan penuh Akta Klinik 2007 diperlukan.',
   'accepted', 'Disemak dan diterima.');

-- === Draft 4 (draft, in progress) — Offer Letter 1, Retail template ===
INSERT INTO "DraftClauseAmendment" (id, "draftId", "clauseId", "issueIdentified", "reasonForAmendment", "offerLetterReference", "amendedText", "sloDecision") VALUES
  ('am-d4-1', 'draft-4', 'rt-1', 'selari',
   'Memasukkan terma dari Surat Tawaran: Syarikat Teknologi Maju Sdn Bhd.',
   'Surat Tawaran Penyewaan — medan tenantName',
   'Perjanjian ini dibuat antara Pepper Labs Properties Sdn Bhd selaku Tuan Tanah dan Syarikat Teknologi Maju Sdn Bhd selaku Penyewa bagi premis runcit.',
   'pending'),
  ('am-d4-2', 'draft-4', 'rt-2', 'selari',
   'Memasukkan terma dari Surat Tawaran: 36 bulan.',
   'Surat Tawaran Penyewaan — medan tenancyPeriod',
   'Penyewaan adalah untuk tempoh 36 bulan mulai 2026-09-01.',
   'pending'),
  ('am-d4-3', 'draft-4', 'rt-3', 'selari',
   'Memasukkan terma dari Surat Tawaran: RM8,500.00.',
   'Surat Tawaran Penyewaan — medan rentalRate',
   'Kadar sewa bulanan ialah RM8,500.00 dibayar pada hari ke-7 setiap bulan.',
   'pending'),
  ('am-d4-4', 'draft-4', 'rt-4', 'selari',
   'Memasukkan terma dari Surat Tawaran: RM25,500.00.',
   'Surat Tawaran Penyewaan — medan deposit',
   'Deposit keselamatan sebanyak RM25,500.00 telah diserahkan.',
   'pending'),
  ('am-d4-5', 'draft-4', 'rt-5', 'selari',
   'Memasukkan terma dari Surat Tawaran: Pejabat korporat dan pusat data serantau.',
   'Surat Tawaran Penyewaan — medan premisesUse',
   'Premis hanya untuk kegunaan Pejabat korporat dan pusat data serantau.',
   'pending'),
  ('am-d4-6', 'draft-4', 'rt-6', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penyewa bertanggungjawab penyelenggaraan dalaman; Tuan Tanah bertanggungjawab struktur bumbung dan sistem bangunan utama.',
   'Surat Tawaran Penyewaan — medan maintenanceTerms',
   'Penyewa bertanggungjawab penyelenggaraan dalaman; Tuan Tanah bertanggungjawab struktur bumbung dan sistem bangunan utama. antara Tuan Tanah dan Penyewa.',
   'pending'),
  ('am-d4-7', 'draft-4', 'rt-7', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penyewa menjelaskan bil elektrik, air, internet dantelekomunikasi terus kepada pembekal.',
   'Surat Tawaran Penyewaan — medan utilitiesTerms',
   'Penyewa menjelaskan bil elektrik, air, internet dantelekomunikasi terus kepada pembekal. — Penyewa menjelaskan bil utiliti.',
   'pending'),
  ('am-d4-8', 'draft-4', 'rt-8', 'selari',
   'Memasukkan terma dari Surat Tawaran: Boleh diperbaharui selama 24 bulan tambahan dengan kenaikan sewa 10% tertakluk persetujuan bersama.',
   'Surat Tawaran Penyewaan — medan renewalTerms',
   'Boleh diperbaharui selama 24 bulan tambahan dengan kenaikan sewa 10% tertakluk persetujuan bersama. tertakluk persetujuan bersama.',
   'pending'),
  ('am-d4-9', 'draft-4', 'rt-9', 'selari',
   'Memasukkan terma dari Surat Tawaran: Notis bertulis 90 hari terlebih dahulu oleh mana-mana pihak.',
   'Surat Tawaran Penyewaan — medan terminationTerms',
   'Notis bertulis 90 hari terlebih dahulu oleh mana-mana pihak. dengan notis bertulis.',
   'pending'),
  ('am-d4-10', 'draft-4', 'rt-10', 'selari',
   'Memasukkan terma dari Surat Tawaran: Penamatan serta-merta dan pemilikan deposit sekiranya tunggakan sewa melebihi 30 hari.',
   'Surat Tawaran Penyewaan — medan defaultTerms',
   'Penamatan serta-merta dan pemilikan deposit sekiranya tunggakan sewa melebihi 30 hari. sekiranya berlaku pelanggaran.',
   'pending');

-- ----------------------------------------------------------------------------
-- 8. AUDIT LOGS  (PRD §9.6)  — 16 entries across all drafts + 2 system-level
-- ----------------------------------------------------------------------------
INSERT INTO "AuditLog" (id, "draftId", "userId", "userName", "userRole", action, details, "timestamp") VALUES
  ('aud-01', 'draft-1', 'user-bu-1',    'Aisyah Rahman', 'BU',    'Draf dicipta',                       'Draf baharu dicipta menggunakan templat PERKESO.',          now() - interval '5 days'),
  ('aud-02', 'draft-1', 'user-bu-1',    'Aisyah Rahman', 'BU',    'Cadangan pindaan dijana',            'Sistem menjana 12 cadangan pindaan klausa.',                now() - interval '4 days'),
  ('aud-03', 'draft-1', 'user-bu-1',    'Aisyah Rahman', 'BU',    'Draf dihantar untuk semakan',        'Draf dihantar kepada Senior Legal Officer.',                now() - interval '2 days'),
  ('aud-04', 'draft-2', 'user-bu-2',    'Arjun Kumar',   'BU',    'Draf dicipta',                       'Draf baharu dicipta.',                                      now() - interval '9 days'),
  ('aud-05', 'draft-2', 'user-bu-2',    'Arjun Kumar',   'BU',    'Draf dihantar untuk semakan',        'Draf dihantar kepada SLO.',                                 now() - interval '7 days'),
  ('aud-06', 'draft-2', 'user-slo-1',   'Lim Wei Jian',  'SLO',   'Ulasan ditambah',                    'Ulasan pada Klausa 3.1 — kadar sewa.',                      now() - interval '4 days'),
  ('aud-07', 'draft-2', 'user-slo-1',   'Lim Wei Jian',  'SLO',   'Pindaan klausa disunting',           'SLO mengedit Klausa 5.1.',                                  now() - interval '4 days'),
  ('aud-08', 'draft-2', 'user-slo-1',   'Lim Wei Jian',  'SLO',   'Draf dikembalikan untuk pindaan',    'Dikembalikan dengan 3 ulasan.',                             now() - interval '3 days'),
  ('aud-09', 'draft-3', 'user-bu-1',    'Aisyah Rahman', 'BU',    'Draf dicipta',                       'Draf baharu dicipta.',                                      now() - interval '14 days'),
  ('aud-10', 'draft-3', 'user-bu-1',    'Aisyah Rahman', 'BU',    'Draf dihantar untuk semakan',        'Dihantar kepada SLO.',                                      now() - interval '11 days'),
  ('aud-11', 'draft-3', 'user-slo-1',   'Lim Wei Jian',  'SLO',   'Semakan klausa selesai',             'Semua 12 klausa disemak.',                                  now() - interval '7 days'),
  ('aud-12', 'draft-3', 'user-slo-1',   'Lim Wei Jian',  'SLO',   'Draf diluluskan',                    'Draf diluluskan untuk eksport.',                            now() - interval '6 days'),
  ('aud-13', 'draft-3', 'user-bu-1',    'Aisyah Rahman', 'BU',    'Dokumen akhir dieksport',            'Draf akhir dimuat turun.',                                  now() - interval '6 days'),
  ('aud-14', 'draft-4', 'user-bu-2',    'Arjun Kumar',   'BU',    'Draf dicipta',                       'Draf baharu (masih dalam kemajuan).',                       now() - interval '1 day'),
  ('aud-15', NULL,      'user-admin-1', 'Nurul Huda',    'ADMIN', 'Templat baharu dimuat naik',         'Templat Penyewaan Premis Runcit ditambah.',                 now() - interval '20 days'),
  ('aud-16', NULL,      'user-admin-1', 'Nurul Huda',    'ADMIN', 'Templat diarkibkan',                 'Templat Penyewaan Pejabat (v0.9) diarkibkan.',              now() - interval '12 days');

-- ----------------------------------------------------------------------------
-- 9. VERIFY (run these to confirm — output shown in the SQL Editor result pane)
-- ----------------------------------------------------------------------------
-- SELECT 'users' AS table_name, COUNT(*) FROM "User"
-- UNION ALL SELECT 'templates',     COUNT(*) FROM "Template"
-- UNION ALL SELECT 'clauses',       COUNT(*) FROM "TemplateClause"
-- UNION ALL SELECT 'offer_letters', COUNT(*) FROM "OfferLetter"
-- UNION ALL SELECT 'drafts',        COUNT(*) FROM "Draft"
-- UNION ALL SELECT 'amendments',    COUNT(*) FROM "DraftClauseAmendment"
-- UNION ALL SELECT 'audit_logs',    COUNT(*) FROM "AuditLog";

-- ============================================================================
-- DONE. Expected row counts:
--   users: 4 | templates: 3 | clauses: 25 | offer_letters: 3
--   drafts: 4 | amendments: 46 | audit_logs: 16
--
-- Login credentials (simulated auth, PRD §6.1):
--   BU:    bu@pepperlabs.my    / bu123
--   BU2:   bu2@pepperlabs.my   / bu123
--   SLO:   slo@pepperlabs.my   / slo123
--   ADMIN: admin@pepperlabs.my / admin123
-- ============================================================================
