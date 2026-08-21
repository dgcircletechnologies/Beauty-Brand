export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  status: string;
  emailVerifiedAt: string | null;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  phone?: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
};
