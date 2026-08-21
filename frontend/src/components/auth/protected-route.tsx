"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/contexts/auth-context";
import { isAdminRole } from "@/lib/auth/roles";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (requireAdmin && !isAdminRole(user?.role)) {
      router.replace("/dashboard");
      return;
    }

    if (!requireAdmin && isAdminRole(user?.role)) {
      router.replace("/admin");
    }
  }, [isAuthenticated, isBootstrapping, requireAdmin, router, user?.role]);

  if (isBootstrapping || !isAuthenticated) {
    return <main className="route-state">Loading...</main>;
  }

  if (requireAdmin && !isAdminRole(user?.role)) {
    return <main className="route-state">Redirecting...</main>;
  }

  if (!requireAdmin && isAdminRole(user?.role)) {
    return <main className="route-state">Redirecting...</main>;
  }

  return children;
}
