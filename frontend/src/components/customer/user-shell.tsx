import { UserNavbar } from "./user-navbar";

export function UserShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="user-shell">
      <UserNavbar />
      {children}
    </div>
  );
}
