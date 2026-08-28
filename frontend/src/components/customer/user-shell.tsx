import { Suspense } from "react";

import { UserFooter, UserNavbar } from "./user-navbar";

export function UserShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="user-shell">
      <Suspense fallback={<div className="user-navbar-placeholder" />}>
        <UserNavbar />
      </Suspense>
      {children}
      <UserFooter />
    </div>
  );
}
