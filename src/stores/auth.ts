"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role } from "@/lib/types";

interface AuthState {
  user: User | null;
  setAuth: (user: User) => void;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setAuth: (user) => set({ user }),
      logout: () => set({ user: null }),
      hasRole: (...roles) => {
        const u = get().user;
        return !!u && roles.includes(u.role);
      },
    }),
    {
      name: "pepperlabs-auth",
      version: 1,
    }
  )
);
