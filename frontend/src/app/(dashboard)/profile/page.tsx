import { AccountSettings } from "@/components/account/account-settings";
import { UserShell } from "@/components/customer/user-shell";

export default function ProfilePage() {
  return (
    <UserShell>
      <AccountSettings activeSection="profile" basePath="/profile" />
    </UserShell>
  );
}
