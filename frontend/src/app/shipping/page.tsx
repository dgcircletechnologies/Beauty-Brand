import { StaticContentPage } from "@/components/customer/static-content-page";
import { UserShell } from "@/components/customer/user-shell";

export default function ShippingPage() {
  return (
    <UserShell>
      <StaticContentPage
        eyebrow="Delivery"
        title="Shipping"
        intro="Dummy shipping information for BlueWave Skincare orders. Replace this content with your final policy before launch."
        sections={[
          {
            title: "Processing time",
            body: "Orders are usually prepared within 1 to 2 business days after payment confirmation. During launches or sale periods, processing may take longer.",
          },
          {
            title: "Delivery timelines",
            body: "Standard delivery is estimated at 3 to 7 business days depending on the destination and courier availability.",
          },
          {
            title: "Shipping charges",
            body: "Shipping charges are calculated at checkout based on delivery location, package size, and available shipping methods.",
          },
        ]}
      />
    </UserShell>
  );
}
