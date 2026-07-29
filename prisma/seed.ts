// Seed script for Pepper Labs — Tenancy Agreement Clause Review & Amendment System
// Run: bun run prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Wipe (order matters for FK)
  await db.auditLog.deleteMany();
  await db.draftClauseAmendment.deleteMany();
  await db.draft.deleteMany();
  await db.offerLetter.deleteMany();
  await db.templateClause.deleteMany();
  await db.template.deleteMany();
  await db.user.deleteMany();

  // ----------------------------------------------------------------------
  // 1. USERS (PRD §3)
  // ----------------------------------------------------------------------
  const users = await db.$transaction([
    db.user.create({
      data: {
        email: "bu@pepperlabs.my",
        name: "Aisyah Rahman",
        password: "bu123",
        role: "BU",
        department: "Business Unit — Property",
      },
    }),
    db.user.create({
      data: {
        email: "slo@pepperlabs.my",
        name: "Lim Wei Jian",
        password: "slo123",
        role: "SLO",
        department: "Legal & Compliance",
      },
    }),
    db.user.create({
      data: {
        email: "admin@pepperlabs.my",
        name: "Nurul Huda",
        password: "admin123",
        role: "ADMIN",
        department: "Platform Operations",
      },
    }),
    db.user.create({
      data: {
        email: "bu2@pepperlabs.my",
        name: "Arjun Kumar",
        password: "bu123",
        role: "BU",
        department: "Business Unit — Retail",
      },
    }),
  ]);
  const [bu, slo, admin, bu2] = users;
  console.log(`  ✓ ${users.length} users`);

  // ----------------------------------------------------------------------
  // 2. TEMPLATES + CLAUSES (PRD §9.1, §9.2)
  // ----------------------------------------------------------------------
  const perkesoClauses = [
    {
      clauseNumber: "1.1",
      title: "Pihak-Pihak Perjanjian",
      originalText:
        "Perjanjian ini dibuat pada [Tarikh] antara PERKESO, sebuah pertubuhan yang ditubuhkan di bawah Akta Keselamatan Sosial 1969, bertindak selaku Tuan Tanah, dan [Nama Penyewa] bertindak selaku Penyewa.",
      mappedField: "tenantName",
    },
    {
      clauseNumber: "2.1",
      title: "Tempoh Penyewaan",
      originalText:
        "Penyewaan ini adalah untuk tempoh [Tempoh] bulan mulai dari [Tarikh Kuat Kuasa] dan berakhir pada [Tarikh Tamat].",
      mappedField: "tenancyPeriod",
    },
    {
      clauseNumber: "3.1",
      title: "Kadar Sewa",
      originalText:
        "Penyewa bersetuju untuk membayar kepada Tuan Tanah kadar sewa bulanan sebanyak RM[X,XXX.00] setiap bulan, bayaran dibuat pada atau sebelum hari ke-7 setiap bulan kalendar.",
      mappedField: "rentalRate",
    },
    {
      clauseNumber: "3.2",
      title: "Tarikh Kuat Kuasa",
      originalText:
        "Penyewaan ini berkuat kuasa mulai [Tarikh Kuat Kuasa] dan semua obligasi di bawah perjanjian ini bermula pada tarikh tersebut.",
      mappedField: "commencementDate",
    },
    {
      clauseNumber: "4.1",
      title: "Deposit",
      originalText:
        "Penyewa telah menyerahkan kepada Tuan Tanah jumlah deposit sebanyak RM[X,XXX.00] sebagai jaminan Deposit Keselamatan, akan dikembalikan tanpa faedah selepas tamat tempoh penyewaan tertakluk kepada syarat perjanjian.",
      mappedField: "deposit",
    },
    {
      clauseNumber: "5.1",
      title: "Kegunaan Premis",
      originalText:
        "Penyewa tidak boleh menggunakan premis selain untuk tujuan [Kegunaan Premis] dan tidak boleh menukar kegunaan premis tanpa kebenaran bertulis Tuan Tanah.",
      mappedField: "premisesUse",
    },
    {
      clauseNumber: "6.1",
      title: "Penyelenggaraan",
      originalText:
        "Tuan Tanah bertanggungjawab ke atas penyelenggaraan struktur utama, manakala Penyewa bertanggungjawab ke atas penyelenggaraan dalaman dan pembaikan kecil. [Terma Penyelenggaraan]",
      mappedField: "maintenanceTerms",
    },
    {
      clauseNumber: "7.1",
      title: "Utiliti",
      originalText:
        "Penyewa bertanggungjawab menjelaskan bil utiliti termasuk bekalan elektrik, air, dan telekomunikasi bagi premis sepanjang tempoh penyewaan. [Terma Utiliti]",
      mappedField: "utilitiesTerms",
    },
    {
      clauseNumber: "8.1",
      title: "Pembaharuan",
      originalText:
        "Penyewaan boleh diperbaharui untuk tempoh tambahan tertakluk kepada persetujuan bersama dan semakan kadar sewa. [Terma Pembaharuan]",
      mappedField: "renewalTerms",
    },
    {
      clauseNumber: "9.1",
      title: "Penamatan",
      originalText:
        "Mana-mana pihak boleh menamatkan perjanjian ini dengan notis bertulis [Tempoh Notis] terlebih dahulu. [Terma Penamatan]",
      mappedField: "terminationTerms",
    },
    {
      clauseNumber: "10.1",
      title: "Klausa Ingkar",
      originalText:
        "Sekiranya Penyewa gagal mematuhi sebarang terma perjanjian ini, Tuan Tanah berhak mengambil tindakan [Tindakan Ingkar] termasuk tetapi tidak terhad kepada penamatan perjanjian dan pemilikan deposit.",
      mappedField: "defaultTerms",
    },
    {
      clauseNumber: "11.1",
      title: "Syarat Khas",
      originalText:
        "Sebarang syarat tambahan yang dipersetujui antara kedua-dua pihak seperti berikut: [Syarat Khas].",
      mappedField: "specialConditions",
    },
    {
      clauseNumber: "12.1",
      title: "Pendakwaan Undang-Undang",
      originalText:
        "Perjanjian ini ditadbir oleh undang-undang Malaysia dan mana-mana pertikaian akan dirujuk kepada bidang kuasa mahkamah Malaysia.",
      mappedField: "_standard",
    },
    {
      clauseNumber: "13.1",
      title: "Notis & Komunikasi",
      originalText:
        "Semua notis di bawah perjanjian ini hendaklah diberikan secara bertulis dan dihantar ke alamat berdaftar pihak masing-masing.",
      mappedField: "_standard",
    },
  ];

  const perkeso = await db.template.create({
    data: {
      name: "Templat Perjanjian Penyewaan PERKESO — Tuan Tanah",
      version: "2.0",
      landlordName: "PERKESO (Social Security Organisation)",
      description:
        "Templat piawai bagi perjanjian penyewaan premis komersil di mana PERKESO bertindak sebagai Tuan Tanah.",
      status: "active",
      clauses: { create: perkesoClauses.map((c, i) => ({ ...c, order: i })) },
    },
  });

  const retailClauses = [
    {
      clauseNumber: "1.1",
      title: "Pihak-Pihak Perjanjian",
      originalText:
        "Perjanjian ini dibuat antara Pepper Labs Properties Sdn Bhd selaku Tuan Tanah dan [Nama Penyewa] selaku Penyewa bagi premis runcit.",
      mappedField: "tenantName",
    },
    {
      clauseNumber: "2.1",
      title: "Tempoh Penyewaan",
      originalText:
        "Penyewaan adalah untuk tempoh [Tempoh] bulan mulai [Tarikh Kuat Kuasa].",
      mappedField: "tenancyPeriod",
    },
    {
      clauseNumber: "3.1",
      title: "Kadar Sewa",
      originalText:
        "Kadar sewa bulanan ialah RM[X,XXX.00] dibayar pada hari ke-7 setiap bulan.",
      mappedField: "rentalRate",
    },
    {
      clauseNumber: "4.1",
      title: "Deposit",
      originalText: "Deposit keselamatan sebanyak RM[X,XXX.00] telah diserahkan.",
      mappedField: "deposit",
    },
    {
      clauseNumber: "5.1",
      title: "Kegunaan Premis",
      originalText: "Premis hanya untuk kegunaan [Kegunaan Premis].",
      mappedField: "premisesUse",
    },
    {
      clauseNumber: "6.1",
      title: "Penyelenggaraan",
      originalText: "[Terma Penyelenggaraan] antara Tuan Tanah dan Penyewa.",
      mappedField: "maintenanceTerms",
    },
    {
      clauseNumber: "7.1",
      title: "Utiliti",
      originalText: "[Terma Utiliti] — Penyewa menjelaskan bil utiliti.",
      mappedField: "utilitiesTerms",
    },
    {
      clauseNumber: "8.1",
      title: "Pembaharuan",
      originalText: "[Terma Pembaharuan] tertakluk persetujuan bersama.",
      mappedField: "renewalTerms",
    },
    {
      clauseNumber: "9.1",
      title: "Penamatan",
      originalText: "[Terma Penamatan] dengan notis bertulis.",
      mappedField: "terminationTerms",
    },
    {
      clauseNumber: "10.1",
      title: "Klausa Ingkar",
      originalText: "[Tindakan Ingkar] sekiranya berlaku pelanggaran.",
      mappedField: "defaultTerms",
    },
  ];

  const retail = await db.template.create({
    data: {
      name: "Templat Penyewaan Premis Runcit — Pepper Labs Properties",
      version: "1.0",
      landlordName: "Pepper Labs Properties Sdn Bhd",
      description:
        "Templat bagi penyewaan premis runcit di pusat membeli-belah milik Pepper Labs Properties.",
      status: "active",
      clauses: { create: retailClauses.map((c, i) => ({ ...c, order: i })) },
    },
  });

  // An archived template for admin view variety
  const archived = await db.template.create({
    data: {
      name: "Templat Penyewaan Pejabat (Lama) — Pepper Labs",
      version: "0.9",
      landlordName: "Pepper Labs Properties Sdn Bhd",
      description: "Templat pejabat versi terdahulu, telah diarkibkan.",
      status: "archived",
      clauses: {
        create: [
          {
            clauseNumber: "1.1",
            title: "Pihak-Pihak",
            originalText: "Antara Tuan Tanah dan [Nama Penyewa].",
            mappedField: "tenantName",
            order: 0,
          },
        ],
      },
    },
  });

  console.log(`  ✓ 3 templates (${perkesoClauses.length} + ${retailClauses.length} + 1 clauses)`);

  // ----------------------------------------------------------------------
  // 3. OFFER LETTERS (PRD §9.3)
  // ----------------------------------------------------------------------
  const ol1 = await db.offerLetter.create({
    data: {
      tenantName: "Syarikat Teknologi Maju Sdn Bhd",
      rentalRate: 8500,
      tenancyPeriod: "36",
      commencementDate: "2026-09-01",
      deposit: 25500,
      premisesUse: "Pejabat korporat dan pusat data serantau",
      maintenanceTerms:
        "Penyewa bertanggungjawab penyelenggaraan dalaman; Tuan Tanah bertanggungjawab struktur bumbung dan sistem bangunan utama.",
      utilitiesTerms:
        "Penyewa menjelaskan bil elektrik, air, internet dantelekomunikasi terus kepada pembekal.",
      renewalTerms:
        "Boleh diperbaharui selama 24 bulan tambahan dengan kenaikan sewa 10% tertakluk persetujuan bersama.",
      terminationTerms:
        "Notis bertulis 90 hari terlebih dahulu oleh mana-mana pihak.",
      defaultTerms:
        "Penamatan serta-merta dan pemilikan deposit sekiranya tunggakan sewa melebihi 30 hari.",
      specialConditions: "Penyewa mesti mengekalkan liputan insurans kandungan sepanjang tempoh.",
    },
  });

  const ol2 = await db.offerLetter.create({
    data: {
      tenantName: "Kafe Selera Tradisional Sdn Bhd",
      rentalRate: 4200,
      tenancyPeriod: "24",
      commencementDate: "2026-08-15",
      deposit: 12600,
      premisesUse: "Restoran dan dapur komersial",
      maintenanceTerms:
        "Penyewa bertanggungjawab penyelenggaraan penuh termasuk sistem ekzos dapur.",
      utilitiesTerms: "Penyewa menjelaskan semua bil utiliti termasuk gas.",
      renewalTerms: "Boleh diperbaharui 12 bulan tertakluk semakan kadar sewa.",
      terminationTerms: "Notis bertulis 60 hari oleh mana-mana pihak.",
      defaultTerms: "Pemilikan deposit dan penamatan selepas tunggakan 14 hari.",
      specialConditions: null, // intentionally empty → triggers [Untuk Pengesahan Business Unit]
    },
  });

  const ol3 = await db.offerLetter.create({
    data: {
      tenantName: "Klinik Perubatan Sentosa",
      rentalRate: 6700,
      tenancyPeriod: "30",
      commencementDate: "2026-10-01",
      deposit: 20100,
      premisesUse: "Klinik perubatan dan farmasi",
      maintenanceTerms: "Penyenggaraan dalaman oleh Penyewa; struktur oleh Tuan Tanah.",
      utilitiesTerms: "Penyewa menjelaskan utiliti termasuk pembuangan sisa perubatan.",
      renewalTerms: "Pembaharuan 24 bulan dengan kenaikan sewa 8%.",
      terminationTerms: "Notis 90 hari bertulis.",
      defaultTerms: "Penamatan serta-merta selepas tunggakan 30 hari.",
      specialConditions: "Pematuhan penuh Akta Klinik 2007 diperlukan.",
    },
  });

  console.log(`  ✓ 3 offer letters`);

  // ----------------------------------------------------------------------
  // 4. DRAFTS + AMENDMENTS + AUDIT LOGS (PRD §9.4, §9.5, §9.6)
  // ----------------------------------------------------------------------
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86400000).toISOString();

  // Draft 1 — pending_review (BU submitted, awaiting SLO)
  const draft1 = await db.draft.create({
    data: {
      title: "Penyewaan — Syarikat Teknologi Maju (PERKESO)",
      templateId: perkeso.id,
      offerLetterId: ol1.id,
      createdBy: bu.id,
      status: "pending_review",
      priority: "high",
      createdDate: new Date(now - 5 * 86400000),
      lastUpdated: new Date(now - 2 * 86400000),
    },
  });

  // Draft 2 — returned by SLO (with comments)
  const draft2 = await db.draft.create({
    data: {
      title: "Penyewaan — Kafe Selera Tradisional (PERKESO)",
      templateId: perkeso.id,
      offerLetterId: ol2.id,
      createdBy: bu2.id,
      status: "returned",
      priority: "normal",
      createdDate: new Date(now - 9 * 86400000),
      lastUpdated: new Date(now - 3 * 86400000),
    },
  });

  // Draft 3 — approved
  const draft3 = await db.draft.create({
    data: {
      title: "Penyewaan — Klinik Perubatan Sentosa (PERKESO)",
      templateId: perkeso.id,
      offerLetterId: ol3.id,
      createdBy: bu.id,
      status: "approved",
      priority: "urgent",
      createdDate: new Date(now - 14 * 86400000),
      lastUpdated: new Date(now - 6 * 86400000),
    },
  });

  // Draft 4 — draft (BU still working)
  const draft4 = await db.draft.create({
    data: {
      title: "Penyewaan — Premis Runcit (Retail Template)",
      templateId: retail.id,
      offerLetterId: ol1.id,
      createdBy: bu2.id,
      status: "draft",
      priority: "normal",
      createdDate: new Date(now - 1 * 86400000),
      lastUpdated: new Date(now - 1 * 86400000),
    },
  });

  // Generate amendments for draft1 (pending_review) — comparison results
  const perkesoClausesDb = await db.templateClause.findMany({
    where: { templateId: perkeso.id },
    orderBy: { order: "asc" },
  });

  async function genAmendments(draftId: string, ol: typeof ol1, partialReview = false) {
    const map: Record<string, { value: string; display: string }> = {
      tenantName: { value: ol.tenantName, display: ol.tenantName },
      tenancyPeriod: { value: ol.tenancyPeriod, display: `${ol.tenancyPeriod} bulan` },
      rentalRate: { value: String(ol.rentalRate), display: `RM${ol.rentalRate.toLocaleString("en-MY", { minimumFractionDigits: 2 })}` },
      commencementDate: { value: ol.commencementDate, display: ol.commencementDate },
      deposit: { value: String(ol.deposit), display: `RM${ol.deposit.toLocaleString("en-MY", { minimumFractionDigits: 2 })}` },
      premisesUse: { value: ol.premisesUse, display: ol.premisesUse },
      maintenanceTerms: { value: ol.maintenanceTerms, display: ol.maintenanceTerms },
      utilitiesTerms: { value: ol.utilitiesTerms, display: ol.utilitiesTerms },
      renewalTerms: { value: ol.renewalTerms, display: ol.renewalTerms },
      terminationTerms: { value: ol.terminationTerms, display: ol.terminationTerms },
      defaultTerms: { value: ol.defaultTerms, display: ol.defaultTerms },
      specialConditions: ol.specialConditions
        ? { value: ol.specialConditions, display: ol.specialConditions }
        : { value: "", display: "" },
    };

    for (const cl of perkesoClausesDb) {
      if (cl.mappedField === "_standard") {
        // No amendment needed
        continue;
      }
      const m = map[cl.mappedField];
      const missing = !m || !m.value;
      const amendedText = missing
        ? "[Untuk Pengesahan Business Unit]"
        : cl.originalText
            .replace("[Nama Penyewa]", m.display)
            .replace("[Tempoh]", m.display)
            .replace("[Tarikh Kuat Kuasa]", m.display)
            .replace("[Tarikh]", ol.commencementDate)
            .replace("[Tarikh Tamat]", addMonths(ol.commencementDate, Number(ol.tenancyPeriod)))
            .replace(/\[X,XXX\.00\]/g, m.display.replace(/^RM/, ""))
            .replace("[Kegunaan Premis]", m.display)
            .replace("[Terma Penyelenggaraan]", m.display)
            .replace("[Terma Utiliti]", m.display)
            .replace("[Terma Pembaharuan]", m.display)
            .replace("[Terma Penamatan]", m.display)
            .replace("[Tindakan Ingkar]", m.display)
            .replace("[Syarat Khas]", m.display)
            .replace("[Tempoh Notis]", "90 hari");

      const issue = missing
        ? "ketiadaan maklumat"
        : cl.mappedField === "rentalRate"
        ? "sepadan"
        : "selari";

      await db.draftClauseAmendment.create({
        data: {
          draftId,
          clauseId: cl.id,
          issueIdentified: issue,
          reasonForAmendment: missing
            ? `Maklumat "${cl.title}" tidak dinyatakan dalam Surat Tawaran Penyewaan.`
            : `Memasukkan terma dari Surat Tawaran: ${m.display}.`,
          offerLetterReference: missing
            ? "Tiada rujukan dalam Surat Tawaran Penyewaan"
            : `Surat Tawaran Penyewaan — medan ${cl.mappedField}`,
          amendedText,
          sloDecision: partialReview ? "pending" : "pending",
          // For draft3 (approved) simulate SLO accepted some clauses
          ...(partialReview === "approved" ? { sloDecision: "accepted", sloComment: "Disemak dan diterima." } : {}),
        },
      });
    }
  }

  await genAmendments(draft1.id, ol1);
  await genAmendments(draft2.id, ol2);
  await genAmendments(draft3.id, ol3, "approved" as never);
  await genAmendments(draft4.id, ol1);

  // Simulate SLO review on draft2 (returned) — reject a couple clauses with comments
  const d2Ams = await db.draftClauseAmendment.findMany({ where: { draftId: draft2.id } });
  if (d2Ams.length) {
    await db.draftClauseAmendment.update({
      where: { id: d2Ams[2].id },
      data: { sloDecision: "rejected", sloComment: "Kadar sewa perlu disahkan semula — sila lampirkan surat tawaran rasmi.", updatedBy: slo.id },
    });
    await db.draftClauseAmendment.update({
      where: { id: d2Ams[10].id },
      data: { sloDecision: "needs_bu_input", sloComment: "Sila nyatakan syarat khas dengan terperinci.", updatedBy: slo.id },
    });
    await db.draftClauseAmendment.update({
      where: { id: d2Ams[5].id },
      data: { sloDecision: "edited", sloEditedText: "Premis hanya untuk kegunaan restoran dan dapur komersial HALAL sahaja.", sloComment: "Tambah syarat HALAL untuk pematuhan.", updatedBy: slo.id },
    });
  }

  console.log(`  ✓ 4 drafts with amendments`);

  // ----------------------------------------------------------------------
  // 5. AUDIT LOGS (PRD §9.6)
  // ----------------------------------------------------------------------
  const auditEntries = [
    { draftId: draft1.id, userId: bu.id, userName: bu.name, userRole: bu.role, action: "Draf dicipta", details: "Draf baharu dicipta menggunakan templat PERKESO.", timestamp: days(5) },
    { draftId: draft1.id, userId: bu.id, userName: bu.name, userRole: bu.role, action: "Cadangan pindaan dijana", details: "Sistem menjana 12 cadangan pindaan klausa.", timestamp: days(4) },
    { draftId: draft1.id, userId: bu.id, userName: bu.name, userRole: bu.role, action: "Draf dihantar untuk semakan", details: "Draf dihantar kepada Senior Legal Officer.", timestamp: days(2) },
    { draftId: draft2.id, userId: bu2.id, userName: bu2.name, userRole: bu2.role, action: "Draf dicipta", details: "Draf baharu dicipta.", timestamp: days(9) },
    { draftId: draft2.id, userId: bu2.id, userName: bu2.name, userRole: bu2.role, action: "Draf dihantar untuk semakan", details: "Draf dihantar kepada SLO.", timestamp: days(7) },
    { draftId: draft2.id, userId: slo.id, userName: slo.name, userRole: slo.role, action: "Ulasan ditambah", details: "Ulasan pada Klausa 3.1 — kadar sewa.", timestamp: days(4) },
    { draftId: draft2.id, userId: slo.id, userName: slo.name, userRole: slo.role, action: "Pindaan klausa disunting", details: "SLO mengedit Klausa 5.1.", timestamp: days(4) },
    { draftId: draft2.id, userId: slo.id, userName: slo.name, userRole: slo.role, action: "Draf dikembalikan untuk pindaan", details: "Dikembalikan dengan 3 ulasan.", timestamp: days(3) },
    { draftId: draft3.id, userId: bu.id, userName: bu.name, userRole: bu.role, action: "Draf dicipta", details: "Draf baharu dicipta.", timestamp: days(14) },
    { draftId: draft3.id, userId: bu.id, userName: bu.name, userRole: bu.role, action: "Draf dihantar untuk semakan", details: "Dihantar kepada SLO.", timestamp: days(11) },
    { draftId: draft3.id, userId: slo.id, userName: slo.name, userRole: slo.role, action: "Semakan klausa selesai", details: "Semua 12 klausa disemak.", timestamp: days(7) },
    { draftId: draft3.id, userId: slo.id, userName: slo.name, userRole: slo.role, action: "Draf diluluskan", details: "Draf diluluskan untuk eksport.", timestamp: days(6) },
    { draftId: draft3.id, userId: bu.id, userName: bu.name, userRole: bu.role, action: "Dokumen akhir dieksport", details: "Draf akhir dimuat turun.", timestamp: days(6) },
    { draftId: draft4.id, userId: bu2.id, userName: bu2.name, userRole: bu2.role, action: "Draf dicipta", details: "Draf baharu (masih dalam kemajuan).", timestamp: days(1) },
    // System-level audit (no draft)
    { draftId: null, userId: admin.id, userName: admin.name, userRole: admin.role, action: "Templat baharu dimuat naik", details: "Templat Penyewaan Premis Runcit ditambah.", timestamp: days(20) },
    { draftId: null, userId: admin.id, userName: admin.name, userRole: admin.role, action: "Templat diarkibkan", details: "Templat Penyewaan Pejabat (v0.9) diarkibkan.", timestamp: days(12) },
  ];

  for (const a of auditEntries) {
    await db.auditLog.create({ data: a });
  }
  console.log(`  ✓ ${auditEntries.length} audit log entries`);

  console.log("\n✅ Seed complete.");
  console.log("   Login credentials:");
  console.log("   BU:    bu@pepperlabs.my / bu123");
  console.log("   BU2:   bu2@pepperlabs.my / bu123");
  console.log("   SLO:   slo@pepperlabs.my / slo123");
  console.log("   ADMIN: admin@pepperlabs.my / admin123");
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
