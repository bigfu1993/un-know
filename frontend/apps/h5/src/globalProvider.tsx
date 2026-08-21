import {
  clearStoredClientAuthSession,
  getStoredClientAuthSession,
  setStoredClientAuthSession
} from "@unknown/api-client";
import { accountStatusLabels, roleLabels } from "@unknown/domain";
import type { RoleProfile } from "@unknown/domain";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { getStoredProfileDraft, setStoredProfileDraft } from "@h5/shared/clientPageModel";

/** 登录后的全局用户信息，只由 GlobalProvider 维护。 */
interface GlobalUser {
  session: LoginResponse | null;
  isAuthenticated: boolean;
  role: Role;
  phone: string;
  nickname: string;
  accountStatus: import("@unknown/domain").AccountStatus;
  accountStatusText: string;
  creditScore: number;
  profileCompletionRequired: boolean;
  profileDraft: ProfileDraftState;
}

/** 登录用户信息的受控更新动作。 */
interface GlobalUserActions {
  clearUser: () => void;
  setUserNickname: (nickname: string) => void;
  setUserPhone: (phone: string) => void;
  setUserProfileDraft: (profileDraft: ProfileDraftState) => void;
  syncUserProfile: (profile: RoleProfile) => void;
}

const fallbackRole: Role = "student";

/** 将持久化会话和服务端资料归一为页面统一消费的用户信息。 */
function buildGlobalUser(
  session: LoginResponse | null,
  profile?: RoleProfile,
  profileDraft: ProfileDraftState = {}
): GlobalUser {
  const role = session?.role ?? profile?.role ?? fallbackRole;
  const accountStatus = profile?.accountStatus ?? session?.accountStatus ?? "normal";
  const nickname = session?.nickname || profile?.nickname || roleLabels[role];
  const serverProfileDraft = profile
    ? {
        ...profileDraft,
        tutorCertificationStatus: profile.tutorCertificationStatus,
        huntingCertificationStatus: profile.huntingCertificationStatus,
        tutorExposureEnabled: profile.tutorExposureEnabled ? "true" : "false"
      }
    : profileDraft;

  return {
    session,
    isAuthenticated: session !== null,
    role,
    phone: session?.phone ?? "",
    nickname,
    accountStatus,
    accountStatusText: accountStatusLabels[accountStatus],
    creditScore: profile?.creditScore ?? 0,
    profileCompletionRequired: session?.profileCompletionRequired ?? false,
    profileDraft: serverProfileDraft
  };
}

const GlobalUserContext = createContext<GlobalUser | null>(null);
const GlobalUserActionsContext = createContext<GlobalUserActions | null>(null);

/** 为全部登录后页面提供唯一的用户信息与更新动作。 */
export function GlobalProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(() => {
    const session = getStoredClientAuthSession();

    return buildGlobalUser(session, undefined, getStoredProfileDraft(session?.phone));
  });
  const userRef = useRef(user);
  const commitUser = useCallback((nextUser: GlobalUser) => {
    userRef.current = nextUser;
    setUser(nextUser);
  }, []);

  const clearUser = useCallback(() => {
    clearStoredClientAuthSession();
    commitUser(buildGlobalUser(null, undefined, userRef.current.profileDraft));
  }, [commitUser]);

  const syncUserProfile = useCallback(
    (profile: RoleProfile) => {
      const currentUser = userRef.current;

      if (!currentUser.session) {
        return;
      }

      commitUser(buildGlobalUser(currentUser.session, profile, currentUser.profileDraft));
    },
    [commitUser]
  );

  const setUserNickname = useCallback(
    (nickname: string) => {
      const currentUser = userRef.current;

      if (!currentUser.session) {
        return;
      }

      const nextNickname = nickname.trim();
      const nextSession = { ...currentUser.session, nickname: nextNickname };

      setStoredClientAuthSession(nextSession);
      commitUser({
        ...currentUser,
        nickname: nextNickname || roleLabels[currentUser.role],
        session: nextSession
      });
    },
    [commitUser]
  );

  const setUserProfileDraft = useCallback(
    (profileDraft: ProfileDraftState) => {
      const currentUser = userRef.current;

      setStoredProfileDraft(profileDraft, currentUser.phone);
      commitUser({ ...currentUser, profileDraft });
    },
    [commitUser]
  );

  const setUserPhone = useCallback(
    (phone: string) => {
      const currentUser = userRef.current;

      if (!currentUser.session) {
        return;
      }

      const nextSession = { ...currentUser.session, phone };

      setStoredClientAuthSession(nextSession);
      commitUser({ ...currentUser, phone, session: nextSession });
    },
    [commitUser]
  );

  const actions = useMemo(
    () => ({ clearUser, setUserNickname, setUserPhone, setUserProfileDraft, syncUserProfile }),
    [clearUser, setUserNickname, setUserPhone, setUserProfileDraft, syncUserProfile]
  );

  return (
    <GlobalUserActionsContext.Provider value={actions}>
      <GlobalUserContext.Provider value={user}>{children}</GlobalUserContext.Provider>
    </GlobalUserActionsContext.Provider>
  );
}

/** 读取当前登录用户信息。 */
export function useGlobalUser() {
  const user = useContext(GlobalUserContext);

  if (!user) {
    throw new Error("useGlobalUser 必须在 GlobalProvider 内使用");
  }

  return user;
}

/** 读取当前登录用户的受控更新动作。 */
export function useGlobalUserActions() {
  const actions = useContext(GlobalUserActionsContext);

  if (!actions) {
    throw new Error("useGlobalUserActions 必须在 GlobalProvider 内使用");
  }

  return actions;
}
