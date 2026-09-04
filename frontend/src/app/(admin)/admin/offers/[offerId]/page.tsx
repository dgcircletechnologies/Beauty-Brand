import Link from "next/link";

type OfferDetailPlaceholderPageProps = {
  params: Promise<{
    offerId: string;
  }>;
};

export default async function OfferDetailPlaceholderPage({
  params,
}: OfferDetailPlaceholderPageProps) {
  const { offerId } = await params;

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Offers</p>
          <h1>Offer Details</h1>
          <p>Detailed management for this offer will be added in a later prompt.</p>
        </div>
      </section>
      <section className="empty-surface">
        <h2>Detail workflow pending</h2>
        <p>Prepared route for offer {offerId}.</p>
        <Link className="secondary-button compact-button" href="/admin/offers">
          Back to Offers
        </Link>
      </section>
    </main>
  );
}
