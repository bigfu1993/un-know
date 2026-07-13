import { getStoredClientAuthSession, setStoredClientAuthSession, clearStoredClientAuthSession } from "@unknown/api-client";
import { accountStatusLabels, roleLabels } from "@unknown/domain";
import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { getStoredProfileDraft, setStoredProfileDraft } from "@h5/shared/clientPageModel";

export interface GlobalUser {
  session: LoginResponse | null;
  isAuthenticated: boolean;
  role: Role;
  phone: string;
  displayName: string;
  profileName: string;
  accountStatus: import("@unknown/domain").AccountStatus;
  accountStatusText: string;
  creditScore: number;
  profileCompletionRequired: boolean;
  profileDraft: ProfileDraftState;
}

export interface GlobalStoreState {
  global: {
    user: GlobalUser;
  };
  setUserSession: (session: LoginResponse) => void;
  syncUserProfile: (profile: import("@unknown/domain").RoleProfile) => void;
  setUserDisplayName: (displayName: string) => void;
  setUserProfileDraft: (profileDraft: ProfileDraftState) => void;
  setUserPhone: (phone: string) => void;
  clearUser: () => void;
}

export type GlobalStoreApi = StoreApi<GlobalStoreState>;

const fallbackRole: Role = "student";

function buildGlobalUser(
  session: LoginResponse | null,
  profile?: import("@unknown/domain").RoleProfile,
  profileDraft: ProfileDraftState = {}
): GlobalUser {
  const role = session?.role ?? profile?.role ?? fallbackRole;
  const accountStatus = profile?.accountStatus ?? session?.accountStatus ?? "normal";
  const displayName = session?.displayName ?? "";
  const profileName = displayName || profile?.name || roleLabels[role];
  const serverProfileDraft = profile
    ? {
        ...profileDraft,
        tutorCertificationStatus: profile.tutorCertificationStatus,
        huntingCertificationStatus: profile.huntingCertificationStatus
      }
    : profileDraft;

  return {
    session,
    isAuthenticated: session !== null,
    role,
    phone: session?.phone ?? "",
    displayName,
    profileName,
    accountStatus,
    accountStatusText: accountStatusLabels[accountStatus],
    creditScore: profile?.creditScore ?? 0,
    profileCompletionRequired: session?.profileCompletionRequired ?? false,
    profileDraft: serverProfileDraft
  };
}

export function createGlobalStore(initialSession: LoginResponse | null = getStoredClientAuthSession()) {
  return createStore<GlobalStoreState>((set, get) => ({
    global: {
      user: buildGlobalUser(initialSession, undefined, getStoredProfileDraft(initialSession?.phone))
    },
    setUserSession: (session) => {
      setStoredClientAuthSession(session);
      set({ global: { user: buildGlobalUser(session, undefined, getStoredProfileDraft(session.phone)) } });
    },
    syncUserProfile: (profile) => {
      const user = get().global.user;

      if (!user.session) {
        return;
      }

      set({ global: { user: buildGlobalUser(user.session, profile, user.profileDraft) } });
    },
    setUserDisplayName: (displayName) => {
      const user = get().global.user;

      if (!user.session) {
        return;
      }

      const nextDisplayName = displayName.trim();
      const nextSession = {
        ...user.session,
        displayName: nextDisplayName
      };

      setStoredClientAuthSession(nextSession);
      set({
        global: {
          user: {
            ...user,
            displayName: nextDisplayName,
            profileName: nextDisplayName || roleLabels[user.role],
            session: nextSession
          }
        }
      });
    },
    setUserProfileDraft: (profileDraft) => {
      const user = get().global.user;

      setStoredProfileDraft(profileDraft, user.phone);
      set({ global: { user: { ...user, profileDraft } } });
    },
    setUserPhone: (phone) => {
      const user = get().global.user;

      if (!user.session) {
        return;
      }

      const nextSession = {
        ...user.session,
        phone
      };

      setStoredClientAuthSession(nextSession);
      set({ global: { user: { ...user, phone, session: nextSession } } });
    },
    clearUser: () => {
      clearStoredClientAuthSession();
      set({ global: { user: buildGlobalUser(null, undefined, get().global.user.profileDraft) } });
    }
  }));
}

export const GlobalStoreContext = createContext<GlobalStoreApi | null>(null);

export function useGlobalStore<T>(selector: (state: GlobalStoreState) => T): T {
  const store = useContext(GlobalStoreContext);

  if (!store) {
    throw new Error("useGlobalStore must be used within GlobalStoreProvider.");
  }

  return useStore(store, selector);
}

export function useGlobalUser() {
  return useGlobalStore((state) => state.global.user);
}
