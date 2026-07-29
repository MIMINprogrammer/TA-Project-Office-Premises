"use client";

import * as React from "react";
import { Scale, Mail, Lock, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useRouterStore } from "@/stores/router";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { email: "bu@pepperlabs.my", password: "bu123", role: "Business Unit", name: "Aisyah Rahman" },
  { email: "slo@pepperlabs.my", password: "slo123", role: "Senior Legal Officer", name: "Lim Wei Jian" },
  { email: "admin@pepperlabs.my", password: "admin123", role: "Pentadbir Sistem", name: "Nurul Huda" },
];

export function LoginView() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useRouterStore((s) => s.navigate);
  const [email, setEmail] = React.useState("bu@pepperlabs.my");
  const [password, setPassword] = React.useState("bu123");
  const [loading, setLoading] = React.useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await api<{ user: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuth(res.user);
      toast.success(`Selamat datang, ${res.user.name}`);
      navigate("dashboard");
    } catch (err: any) {
      toast.error(err.message || "Log masuk gagal");
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        {/* Left — brand / hero */}
        <div className="hidden flex-col justify-between lg:flex">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight">Pepper Labs</div>
                <div className="text-xs text-muted-foreground">Malaysia</div>
              </div>
            </div>
            <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight">
              Sistem Semakan & Pindaan Klausa{" "}
              <span className="text-gradient-brand">Perjanjian Penyewaan</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Memudahkan Business Unit menyediakan draf berdasarkan Surat Tawaran
              Penyewaan, dan membolehkan Pegawai Undang-Undang Kanan menyemak serta
              mengesahkan pindaan secara cekap, tersusun dan telus.
            </p>
          </div>

          <div className="mt-10 grid gap-3">
            {[
              { t: "Perbandingan automatik", d: "Templat lawan Surat Tawaran — percanggahan ditandakan." },
              { t: "5-Bahagian piawai", d: "Ringkasan, Semakan Klausa, Pindaan, Pemerhatian, Jadual." },
              { t: "Jejak audit penuh", d: "Setiap tindakan direkod dengan cap masa & pengguna." },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-sm font-medium">{f.t}</div>
                  <div className="text-xs text-muted-foreground">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — login form */}
        <GlassCard variant="strong" className="p-6 sm:p-8">
          <div className="mb-6 lg:hidden">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold">Pepper Labs</div>
                <div className="text-xs text-muted-foreground">Clause Review System</div>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight">Log Masuk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sistem pengesahan simulasi (PRD §6.1). Pilih akaun demo di bawah.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="anda@pepperlabs.my"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Kata Laluan</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  placeholder="••••••"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Log Masuk <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Akaun Demo
            </div>
            <div className="grid gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickFill(acc)}
                  className="glass-hover flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-left text-xs transition"
                >
                  <div>
                    <div className="font-medium text-foreground">{acc.role}</div>
                    <div className="text-muted-foreground">{acc.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[11px] text-primary">{acc.password}</div>
                    <div className="text-[10px] text-muted-foreground">{acc.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
