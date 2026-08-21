import { apiRequest } from "./client";
import type {
  AuthSession,
  ForgotPasswordPayload,
  LoginPayload,
  ResetPasswordPayload,
  SignupPayload,
} from "../auth/types";

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

export function refreshToken(refreshTokenValue: string) {
  return apiRequest<Pick<AuthSession, "accessToken" | "refreshToken">>(
    "/auth/refresh",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshTokenValue}`,
      },
      body: JSON.stringify({
        refreshToken: refreshTokenValue,
      }),
    },
  );
}

export function logout(refreshTokenValue: string, accessToken: string) {
  return apiRequest<unknown>("/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      refreshToken: refreshTokenValue,
    }),
  });
}
