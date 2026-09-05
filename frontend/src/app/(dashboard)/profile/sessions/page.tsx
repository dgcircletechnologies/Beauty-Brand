import { AccountSettings } from "@/components/account/account-settings";
import { UserShell } from "@/components/customer/user-shell";

export default function ProfileSessionsPage() {
  return (
    <UserShell>
      <AccountSettings
        activeSection="sessions"
        basePath="/profile"
        headingEyebrow="Account Status"
        headingTitle="Sessions and Devices"
        headingDescription="Review active login sessions and sign out devices."
      />
    </UserShell>
  );
}
