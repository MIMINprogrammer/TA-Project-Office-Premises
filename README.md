# Pepper Labs — Sistem Semakan dan Pindaan Klausa Perjanjian Penyewaan

**Tenancy Agreement Clause Review & Amendment System** — Pepper Labs, Malaysia.

A web application that helps the **Business Unit (BU)** prepare tenancy agreement drafts based on a template and an Offer Letter, and enables the **Senior Legal Officer (SLO)** to review and vet clause amendments efficiently. Built per PRD v2.0 (which replaces the earlier v1.0 LMS scope).

Built with **React (Next.js 16)**, **TypeScript**, **Tailwind CSS 4**, **shadcn/ui**, **Prisma (SQLite dummy DB)**, and the **z.ai GLM 5.2** platform. UI features a modern **glassmorphism** design with an emerald/teal + amber Pepper Labs palette.

---

## ✨ Features

### Three role-based workflows
- **Business Unit (BU)** — create drafts via a guided wizard (template selection → 12-field offer-letter form → review), view the auto-generated **5-part amendment output**, and submit to SLO.
- **Senior Legal Officer (SLO)** — clause-by-clause **side-by-side review** (Accept / Edit / Reject / Needs-BU-Input), progress tracking, and final approval (Approve / Return / Reject).
- **Admin** — dashboard stats, full template management (CRUD + clause editor), and audit-trail timeline.

### Core capabilities (per PRD)
- **Automatic clause comparison** — template clauses vs. offer-letter terms; conflicts and missing info flagged.
- **5-part standard output** — Ringkasan Pindaan · Semakan Klausa demi Klausa · Klausa Dipinda · Pemerhatian Undang-Undang · Jadual Pindaan.
- **`[Untuk Pengesahan Business Unit]`** marker — missing information is never assumed; it's clearly flagged for BU confirmation.
- **Audit trail** — every action (create / submit / comment / amend / approve / reject) logged with user, role, and timestamp.
- **Document export** — approved drafts downloadable as a 5-part document.
- **Color-coded status badges** — Draf (gray), Menunggu Semakan (yellow), Dikembalikan (orange), Diluluskan (green), Ditolak (red).

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ (or [Bun](https://bun.sh/))
- A GitHub Personal Access Token (if cloning via HTTPS)

### Installation

```bash
# Clone
git clone https://github.com/MIMINprogrammer/TA-Project-Office-Premises.git
cd TA-Project-Office-Premises

# Install dependencies
bun install   # or: npm install

# Set up the database
cp .env.example .env          # then edit DATABASE_URL if needed
bun run db:push               # create SQLite schema
bun run db:generate           # generate Prisma client
bun run prisma/seed.ts        # seed dummy data (templates, users, drafts, audit logs)
```

### Running the dev server

```bash
bun run dev                   # starts on http://localhost:3000
```

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Business Unit | `bu@pepperlabs.my` | `bu123` |
| Senior Legal Officer | `slo@pepperlabs.my` | `slo123` |
| Admin | `admin@pepperlabs.my` | `admin123` |

---

## 🗂️ Project Structure

```
prisma/
  schema.prisma           # DB schema (User, Template, TemplateClause, OfferLetter, Draft, DraftClauseAmendment, AuditLog)
  seed.ts                 # dummy data seeder
src/
  app/
    api/                  # API routes (auth, templates, drafts, amendments, audit, stats, export)
    layout.tsx            # root layout (theme provider, aurora background, toasters)
    page.tsx              # client orchestrator (login → role-aware dashboard)
    globals.css           # glassmorphism theme + Pepper Labs palette
  components/
    ui/                   # shadcn/ui components
    app-shell.tsx         # responsive shell (sidebar + header + sticky footer)
    glass-card.tsx        # glassmorphism card
    status-badges.tsx     # status / SLO-decision / role / priority badges
    diff-viewer.tsx       # side-by-side clause diff
    views/                # role views (bu / slo / admin / shared)
  lib/
    types.ts              # domain types
    status.ts             # status configs + formatters
    clause-engine.ts      # comparison engine + 5-part generator
    server.ts             # server helpers (audit log, includes)
    db.ts                 # Prisma client
    api-client.ts         # fetch wrapper
  stores/
    auth.ts               # Zustand auth store (persisted)
    router.ts             # client-side view router
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite (dummy DB) |
| State | Zustand (client) |
| Icons | lucide-react |
| Toasts | sonner |
| Theme | next-themes (light/dark) |

---

## 📋 PRD Compliance

This implementation follows **PRD v2.0** (Tenancy Agreement Clause Review & Amendment System), covering:
- §5 Core Workflow (BU → system → SLO → approve/export)
- §6.1 Simulated authentication
- §6.2 Offer-letter input form (12 commercial-term fields)
- §6.3 Template selection & management
- §6.4 Automatic comparison + 5-part output generation
- §6.5 SLO clause-by-clause review + final decision
- §6.6 Role-aware dashboards (BU / SLO / Admin)
- §6.7 Audit trail
- §6.8 Document export (5-part structure preserved)
- §6.9 Notifications + color status badges
- §9 Full dummy database schema

---

## 📝 Notes

- This is a **functional prototype** with a dummy database — data resets when re-seeded.
- SLO approval in the system is a **simulated status** and does not replace official signature processes.
- All clause suggestions are **assistive** — final legal approval remains with the SLO.

---

© 2026 Pepper Labs · Malaysia · GLM 5.2 Accelerated
