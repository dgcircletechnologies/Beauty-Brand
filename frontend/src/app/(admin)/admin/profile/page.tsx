import { AccountSettings } from "@/components/account/account-settings";

export default function AdminProfilePage() {
  return (
    <AccountSettings
      activeSection="profile"
      basePath="/admin/profile"
      headingEyebrow="Admin Profile"
      headingTitle="Profile"
      headingDescription="View and update the account details for this admin login."
      includeAddresses={false}
      showRole
    />
  );
}
