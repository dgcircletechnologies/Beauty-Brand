import { StaticContentPage } from "@/components/customer/static-content-page";
import { UserShell } from "@/components/customer/user-shell";

export default function ReturnsPage() {
  return (
    <UserShell>
      <StaticContentPage
        eyebrow="Orders"
        title="Returns"
        intro="Dummy return and refund information for skincare orders. Final rules can be added here later."
        sections={[
          {
            title: "Return window",
            body: "Eligible items may be requested for return within 7 days of delivery. Products should be unused, sealed, and in original packaging.",
          },
          {
            title: "Non-returnable items",
            body: "Opened skincare, used products, free gifts, samples, and final-sale items may not be eligible for return for hygiene reasons.",
          },
          {
            title: "Refunds",
            body: "Approved refunds are processed to the original payment method after inspection. Bank or payment provider timelines may vary.",
          },
        ]}
      />
    </UserShell>
  );
}
