"use client";

import { create } from "zustand";

// Client-side view router (single / route per project constraints)
export type AppView =
  | "dashboard" // role-aware dashboard
  | "create-draft" // BU: wizard
  | "amendment-preview" // BU: 5-part preview
  | "slo-review" // SLO: clause-by-clause side-by-side
  | "final-approval" // SLO: final approve/return/reject
  | "audit-trail" // SLO/Admin: timeline
  | "templates" // Admin: template management
  | "draft-detail"; // shared draft detail

interface RouterState {
  view: AppView;
  params: { draftId?: string; templateId?: string; [k: string]: string | undefined };
  navigate: (view: AppView, params?: Record<string, string>) => void;
  back: () => void;
  history: { view: AppView; params: Record<string, string> }[];
}

export const useRouterStore = create<RouterState>((set, get) => ({
  view: "dashboard",
  params: {},
  history: [],
  navigate: (view, params = {}) => {
    const prev = { view: get().view, params: { ...get().params } };
    set((s) => ({
      view,
      params,
      history: [...s.history, prev].slice(-20),
    }));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
  back: () => {
    const h = get().history;
    if (h.length === 0) {
      set({ view: "dashboard", params: {} });
      return;
    }
    const last = h[h.length - 1];
    set({ view: last.view, params: last.params, history: h.slice(0, -1) });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
}));
