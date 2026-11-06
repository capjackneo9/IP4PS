"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StorageMode } from "./metadata";

export interface Profile {
  displayName: string;
  artistName: string;
  email: string;
  website: string;
  twitter: string;
  instagram: string;
}

export type Theme = "dark" | "light";

interface Prefs {
  defaultNetwork: string;
  showGas: boolean;
  confirmBeforeSend: boolean;
  defaultStorage: StorageMode;
  defaultRoyaltyPercent: number;
  theme: Theme;
}

interface AppState {
  profile: Profile;
  prefs: Prefs;
  setProfile: (p: Partial<Profile>) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  reset: () => void;
}

const emptyProfile: Profile = { displayName: "", artistName: "", email: "", website: "", twitter: "", instagram: "" };
const defaultPrefs: Prefs = {
  defaultNetwork: "polygon",
  showGas: true,
  confirmBeforeSend: true,
  defaultStorage: "ipfs",
  defaultRoyaltyPercent: 5,
  theme: "dark",
};

/** Profile and preferences live in this browser only. Nothing here is sent anywhere unless you put it in a registration. */
export const useApp = create<AppState>()(
  persist(
    (set) => ({
      profile: emptyProfile,
      prefs: defaultPrefs,
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
      reset: () => set({ profile: emptyProfile, prefs: defaultPrefs }),
    }),
    {
      name: "ip4ps:app",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return { ...current, profile: { ...current.profile, ...p.profile }, prefs: { ...current.prefs, ...p.prefs } };
      },
    },
  ),
);

export function socialsOf(p: Profile) {
  const out: Record<string, string> = {};
  if (p.twitter) out.twitter = p.twitter.replace(/^@/, "");
  if (p.instagram) out.instagram = p.instagram.replace(/^@/, "");
  if (p.website) out.website = p.website;
  return out;
}
