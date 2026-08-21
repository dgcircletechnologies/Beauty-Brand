import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requireAdmin>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
