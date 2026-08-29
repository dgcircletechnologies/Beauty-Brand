import type { ReactNode } from "react";

import { UserShell } from "@/components/customer/user-shell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
