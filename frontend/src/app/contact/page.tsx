import { StaticContentPage } from "@/components/customer/static-content-page";
import { UserShell } from "@/components/customer/user-shell";

export default function ContactPage() {
  return (
    <UserShell>
      <StaticContentPage
        eyebrow="Support"
        title="Contact"
        intro="Reach the BlueWave Skincare team for order help, product questions, or partnership requests."
        sections={[
          {
            title: "Customer care",
            body: "Email support@bluewave.com for order updates, account help, and product guidance. Our placeholder response window is 1 to 2 business days.",
          },
          {
            title: "Business inquiries",
            body: "For wholesale, collaborations, or press requests, send your details to partnerships@bluewave.com and our team will review them.",
          },
          {
            title: "Office",
            body: "BlueWave Skincare, 2nd Floor, Wellness Avenue, Mumbai, India. This address is temporary placeholder content.",
          },
        ]}
      />
    </UserShell>
  );
}
