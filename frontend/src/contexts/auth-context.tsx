"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as authApi from "@/lib/api/auth";
import { setUnauthorizedHandler } from "@/lib/auth/session-events";
import type {
  AuthSession,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  ResetPasswordPayload,
  SignupPayload,
} from "@/lib/auth/types";

const AUTH_STORAGE_KEY = "skincare.auth.session";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

type StoredAuthSession = {
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  signup: (payload: SignupPayload) => Promise<void>;
  verifyEmail: (payload: { token: string }) => Promise<void>;
  resendVerificationEmail: (payload: { email: string }) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistSession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);

    if (nextSession) {
      window.localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          user: nextSession.user,
        } satisfies StoredAuthSession),
      );
      return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const redirectToLogin = useCallback(() => {
    if (!window.location.pathname.startsWith("/login")) {
      router.replace("/login");
    }
  }, [router]);

  const refreshStoredSession = useCallback(async () => {
    const nextSession = await authApi.refreshToken();
    persistSession(nextSession);

    return nextSession;
  }, [persistSession]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

      try {
        const refreshedSession = await authApi.refreshToken();

        if (!isMounted) {
          return;
        }

        persistSession(refreshedSession);
      } catch {
        if (isMounted) {
          if (storedSession) {
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
          }

          persistSession(null);
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [persistSession]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const nextSession = await authApi.login(payload);
      persistSession(nextSession);
      return nextSession;
    },
    [persistSession],
  );

  const signup = useCallback(async (payload: SignupPayload) => {
    await authApi.signup(payload);
  }, []);

  const verifyEmail = useCallback(async (payload: { token: string }) => {
    await authApi.verifyEmail(payload);
  }, []);

  const resendVerificationEmail = useCallback(
    async (payload: { email: string }) => {
      await authApi.resendVerificationEmail(payload);
    },
    [],
  );

  const forgotPassword = useCallback(async (payload: ForgotPasswordPayload) => {
    await authApi.forgotPassword(payload);
  }, []);

  const resetPassword = useCallback(async (payload: ResetPasswordPayload) => {
    await authApi.resetPassword(payload);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      await refreshStoredSession();
    } catch {
      persistSession(null);
      redirectToLogin();
    }
  }, [persistSession, redirectToLogin, refreshStoredSession, session]);

  const updateUser = useCallback(
    (user: AuthUser) => {
      if (!session) {
        return;
      }

      persistSession({
        ...session,
        user,
      });
    },
    [persistSession, session],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshSession();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshSession, session]);

  useEffect(() => {
    let isRefreshing = false;

    setUnauthorizedHandler(async () => {
      if (isRefreshing) {
        return null;
      }

      if (!session) {
        persistSession(null);
        redirectToLogin();
        return null;
      }

      isRefreshing = true;

      try {
        const nextSession = await refreshStoredSession();
        return nextSession.accessToken;
      } catch {
        persistSession(null);
        redirectToLogin();
        return null;
      } finally {
        isRefreshing = false;
      }
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [persistSession, redirectToLogin, refreshStoredSession, session]);

  const logout = useCallback(async () => {
    if (session) {
      await authApi.logout().catch(() => undefined);
    }

    persistSession(null);
  }, [persistSession, session]);

  const logoutAll = useCallback(async () => {
    if (session) {
      await authApi.logoutAll().catch(() => undefined);
    }

    persistSession(null);
  }, [persistSession, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      isBootstrapping,
      login,
      signup,
      verifyEmail,
      resendVerificationEmail,
      forgotPassword,
      resetPassword,
      refreshSession,
      updateUser,
      logout,
      logoutAll,
    }),
    [
      forgotPassword,
      isBootstrapping,
      login,
      logout,
      logoutAll,
      refreshSession,
      resendVerificationEmail,
      resetPassword,
      session,
      signup,
      updateUser,
      verifyEmail,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
