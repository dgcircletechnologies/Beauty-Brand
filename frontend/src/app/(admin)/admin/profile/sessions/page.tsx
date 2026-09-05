import { AccountSettings } from "@/components/account/account-settings";

export default function AdminProfileSessionsPage() {
  return (
    <AccountSettings
      activeSection="sessions"
      basePath="/admin/profile"
      headingEyebrow="Admin Sessions"
      headingTitle="Active Sessions"
      headingDescription="Review active admin login sessions and sign out devices."
      includeAddresses={false}
      showRole
    />
  );
}
