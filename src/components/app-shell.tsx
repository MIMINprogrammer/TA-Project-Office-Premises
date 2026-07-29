"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FilePlus2,
  ScrollText,
  Gavel,
  History,
  FolderCog,
  LogOut,
  ShieldCheck,
  Menu,
  Sun,
  Moon,
  ChevronLeft,
  Scale,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useRouterStore, type AppView } from "@/stores/router";
import { RoleBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

interface NavItem {
  view: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<"BU" | "SLO" | "ADMIN">;
}

const NAV_ITEMS: NavItem[] = [
  { view: "dashboard", label: "Papan Pemuka", icon: LayoutDashboard, roles: ["BU", "SLO", "ADMIN"] },
  { view: "create-draft", label: "Cipta Draf Baharu", icon: FilePlus2, roles: ["BU"] },
  { view: "slo-review", label: "Semakan Klausa", icon: ScrollText, roles: ["SLO"] },
  { view: "final-approval", label: "Kelulusan Akhir", icon: Gavel, roles: ["SLO"] },
  { view: "audit-trail", label: "Jejak Audit", icon: History, roles: ["SLO", "ADMIN"] },
  { view: "templates", label: "Pengurusan Templat", icon: FolderCog, roles: ["ADMIN"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { view, navigate, back, history } = useRouterStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const items = NAV_ITEMS.filter((i) => user && i.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    toast.success("Anda telah log keluar.");
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Scale className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">Pepper Labs</div>
          <div className="text-[11px] text-muted-foreground">Clause Review</div>
        </div>
      </div>

      <div className="px-3 pb-2">
        {history.length > 0 && (
          <button
            onClick={() => {
              back();
              setMobileOpen(false);
            }}
            className="mb-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Kembali
          </button>
        )}
        <nav className="space-y-0.5">
          {items.map((item) => {
            const active = view === item.view;
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => {
                  navigate(item.view);
                  setMobileOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User card */}
      <div className="mt-auto p-3">
        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {user?.email}
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            {user && <RoleBadge role={user.role} short />}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar (mobile) */}
      <header className="glass sticky top-0 z-40 flex items-center gap-2 border-b border-border/50 px-4 py-2.5 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            {SidebarContent}
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Pepper Labs</span>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/40 lg:block">
          <div className="glass h-full rounded-none border-0 border-r">{SidebarContent}</div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Desktop top bar */}
          <header className="glass sticky top-0 z-30 hidden items-center justify-between border-b border-border/50 px-6 py-3 lg:flex">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="font-medium">Sistem Semakan Klausa Perjanjian Penyewaan</span>
              <span className="text-muted-foreground">· PRD v2.0</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Pepper Labs Malaysia
              </Link>
              <ThemeToggle />
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>

          {/* Sticky footer (per UI rules) */}
          <footer className="mt-auto border-t border-border/40">
            <div className="glass mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 rounded-none px-6 py-4 text-xs text-muted-foreground sm:flex-row">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>
                  Prototaip — Pangkalan data dummy. Cadangan tertakluk kelulusan SLO.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>© 2026 Pepper Labs · Malaysia</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">GLM 5.2 Accelerated</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Tukar tema"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
