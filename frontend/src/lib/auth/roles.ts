import type { UserRole } from "./types";

export function isAdminRole(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function getPostLoginPath(role: UserRole): string {
  return isAdminRole(role) ? "/admin" : "/dashboard";
}
