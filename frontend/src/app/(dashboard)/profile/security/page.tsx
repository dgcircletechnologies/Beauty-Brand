import { AccountSettings } from "@/components/account/account-settings";
import { UserShell } from "@/components/customer/user-shell";

export default function ProfileSecurityPage() {
  return (
    <UserShell>
      <AccountSettings
        activeSection="security"
        basePath="/profile"
        headingEyebrow="Account Security"
        headingTitle="Change Password"
        headingDescription="Update your password and refresh all account sessions."
      />
    </UserShell>
  );
}
