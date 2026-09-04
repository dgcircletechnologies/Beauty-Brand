export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
export type UserGender =
  | "FEMALE"
  | "MALE"
  | "NON_BINARY"
  | "PREFER_NOT_TO_SAY";

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  gender: UserGender | null;
  age: number | null;
  role: UserRole;
  status: string;
  emailVerifiedAt: string | null;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
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
  gender?: UserGender;
  age?: number;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
};
