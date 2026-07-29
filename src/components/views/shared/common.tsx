"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { useRouterStore } from "@/stores/router";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  backable = false,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  backable?: boolean;
}) {
  const back = useRouterStore((s) => s.back);
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {backable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={back}
            className="mt-0.5 h-8 w-8 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {Icon && (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-base font-medium">{title}</div>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "primary",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  trend?: string;
  accent?: "primary" | "amber" | "emerald" | "rose" | "violet";
  className?: string;
}) {
  const accentMap: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  };
  return (
    <GlassCard hover className={cn("p-4", className)}>
      <div className="flex items-center justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accentMap[accent])}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span className="text-[11px] font-medium text-muted-foreground">{trend}</span>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </GlassCard>
  );
}

export function LoadingBlock({ label = "Memuatkan..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  );
}
