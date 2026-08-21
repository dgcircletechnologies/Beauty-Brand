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

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  signup: (payload: SignupPayload) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistSession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);

    if (nextSession) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
      return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const redirectToLogin = useCallback(() => {
    if (!window.location.pathname.startsWith("/login")) {
      router.replace("/login");
    }
  }, [router]);

  const refreshStoredSession = useCallback(
    async (currentSession: AuthSession) => {
      const tokens = await authApi.refreshToken(currentSession.refreshToken);
      const nextSession = {
        ...currentSession,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };

      persistSession(nextSession);
      return nextSession;
    },
    [persistSession],
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

      if (!storedSession) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const parsedSession = JSON.parse(storedSession) as AuthSession;
        const tokens = await authApi.refreshToken(parsedSession.refreshToken);

        if (!isMounted) {
          return;
        }

        persistSession({
          ...parsedSession,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      } catch {
        if (isMounted) {
          persistSession(null);
          redirectToLogin();
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
  }, [persistSession, redirectToLogin]);

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

  const forgotPassword = useCallback(async (payload: ForgotPasswordPayload) => {
    await authApi.forgotPassword(payload);
  }, []);

  const resetPassword = useCallback(async (payload: ResetPasswordPayload) => {
    await authApi.resetPassword(payload);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!session?.refreshToken) {
      return;
    }

    try {
      await refreshStoredSession(session);
    } catch {
      persistSession(null);
      redirectToLogin();
    }
  }, [persistSession, redirectToLogin, refreshStoredSession, session]);

  useEffect(() => {
    if (!session?.refreshToken) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshSession();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshSession, session?.refreshToken]);

  useEffect(() => {
    let isRefreshing = false;

    setUnauthorizedHandler(async () => {
      if (isRefreshing) {
        return null;
      }

      if (!session?.refreshToken) {
        persistSession(null);
        redirectToLogin();
        return null;
      }

      isRefreshing = true;

      try {
        const nextSession = await refreshStoredSession(session);
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
    if (session?.accessToken && session.refreshToken) {
      await authApi
        .logout(session.refreshToken, session.accessToken)
        .catch(() => undefined);
    }

    persistSession(null);
  }, [persistSession, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      refreshToken: session?.refreshToken ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      isBootstrapping,
      login,
      signup,
      forgotPassword,
      resetPassword,
      refreshSession,
      logout,
    }),
    [
      forgotPassword,
      isBootstrapping,
      login,
      logout,
      refreshSession,
      resetPassword,
      session,
      signup,
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
