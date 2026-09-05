import { AccountSettings } from "@/components/account/account-settings";

export default function AdminProfileSecurityPage() {
  return (
    <AccountSettings
      activeSection="security"
      basePath="/admin/profile"
      headingEyebrow="Admin Security"
      headingTitle="Change Password"
      headingDescription="Update the password for this admin account."
      includeAddresses={false}
      showRole
    />
  );
}
