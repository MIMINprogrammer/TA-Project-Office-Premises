"use client";

import * as React from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouterStore } from "@/stores/router";
import { AppShell } from "@/components/app-shell";
import { LoginView } from "@/components/views/login-view";
import { BUDashboard } from "@/components/views/bu/bu-dashboard";
import { CreateDraftView } from "@/components/views/bu/create-draft";
import { AmendmentPreviewView } from "@/components/views/bu/amendment-preview";
import { SLODashboard } from "@/components/views/slo/slo-dashboard";
import { ClauseReviewView } from "@/components/views/slo/clause-review";
import { FinalApprovalView } from "@/components/views/slo/final-approval";
import { AdminDashboard } from "@/components/views/admin/admin-dashboard";
import { TemplateManagerView } from "@/components/views/admin/template-manager";
import { AuditTrailView } from "@/components/views/admin/audit-trail";
import { DraftDetailView } from "@/components/views/shared/draft-detail";
import { LoadingBlock } from "@/components/views/shared/common";

function ActiveView() {
  const view = useRouterStore((s) => s.view);
  const user = useAuthStore((s) => s.user);

  // Role-aware dashboard
  if (view === "dashboard") {
    if (user?.role === "BU") return <BUDashboard />;
    if (user?.role === "SLO") return <SLODashboard />;
    if (user?.role === "ADMIN") return <AdminDashboard />;
    return <LoadingBlock />;
  }

  switch (view) {
    case "create-draft":
      return <CreateDraftView />;
    case "amendment-preview":
      return <AmendmentPreviewView />;
    case "slo-review":
      return <ClauseReviewView />;
    case "final-approval":
      return <FinalApprovalView />;
    case "audit-trail":
      return <AuditTrailView />;
    case "templates":
      return <TemplateManagerView />;
    case "draft-detail":
      return <DraftDetailView />;
    default:
      return <LoadingBlock />;
  }
}

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = React.useState(false);

  // Guard against hydration mismatch (zustand persist hydrates on client)
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingBlock />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <AppShell>
      <ActiveView />
    </AppShell>
  );
}
