import { OfferForm } from "@/components/admin/offer-form";

export default function AddOfferPlaceholderPage() {
  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Offers / Create</p>
          <h1>Create Offer</h1>
          <p>Create a promotional offer for products, variants or categories.</p>
        </div>
      </section>
      <OfferForm mode="create" />
    </main>
  );
}
