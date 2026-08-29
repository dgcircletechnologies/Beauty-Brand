import { StaticContentPage } from "@/components/customer/static-content-page";
import { UserShell } from "@/components/customer/user-shell";

export default function PrivacyPolicyPage() {
  return (
    <UserShell>
      <StaticContentPage
        eyebrow="Legal"
        title="Privacy Policy"
        intro="This placeholder privacy policy explains how BlueWave Skincare may collect and use customer information."
        sections={[
          {
            title: "Information we collect",
            body: "We may collect account details, contact information, delivery addresses, order history, and website usage data to operate the store.",
          },
          {
            title: "How we use information",
            body: "Information may be used to process orders, provide support, improve products, personalize the shopping experience, and send service updates.",
          },
          {
            title: "Your choices",
            body: "Customers may request profile updates, communication preference changes, or account support by contacting our team.",
          },
        ]}
      />
    </UserShell>
  );
}
