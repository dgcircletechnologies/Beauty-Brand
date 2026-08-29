import { StaticContentPage } from "@/components/customer/static-content-page";
import { UserShell } from "@/components/customer/user-shell";

export default function TermsAndConditionsPage() {
  return (
    <UserShell>
      <StaticContentPage
        eyebrow="Legal"
        title="Terms and Conditions"
        intro="Placeholder terms for using the BlueWave Skincare website and purchasing products."
        sections={[
          {
            title: "Use of the website",
            body: "By using this website, customers agree to provide accurate information and use the store only for lawful personal shopping purposes.",
          },
          {
            title: "Product information",
            body: "Product descriptions, prices, availability, and images may be updated at any time. Placeholder content should be replaced before final launch.",
          },
          {
            title: "Orders and payments",
            body: "Orders are confirmed only after successful payment and acceptance. BlueWave Skincare may cancel orders that cannot be fulfilled.",
          },
        ]}
      />
    </UserShell>
  );
}
