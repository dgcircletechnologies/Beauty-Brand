import { apiRequest } from "./client";
import type {
  AuthSession,
  ForgotPasswordPayload,
  LoginPayload,
  ResetPasswordPayload,
  SignupPayload,
} from "../auth/types";

let refreshPromise: Promise<AuthSession> | null = null;

export function login(payload: LoginPayload) {
  return apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function signup(payload: SignupPayload) {
  return apiRequest<unknown>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmail(payload: { token: string }) {
  return apiRequest<unknown>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resendVerificationEmail(payload: { email: string }) {
  return apiRequest<unknown>("/auth/resend-verification-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function forgotPassword(payload: ForgotPasswordPayload) {
  return apiRequest<unknown>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload: ResetPasswordPayload) {
  return apiRequest<unknown>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function refreshToken() {
  if (!refreshPromise) {
    refreshPromise = apiRequest<AuthSession>("/auth/refresh", {
      method: "POST",
    }).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export function logout() {
  return apiRequest<unknown>("/auth/logout", {
    method: "POST",
  });
}

export function logoutAll() {
  return apiRequest<unknown>("/auth/logout-all", {
    method: "POST",
  });
}
