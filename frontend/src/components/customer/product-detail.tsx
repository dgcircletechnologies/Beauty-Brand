"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

function getAttributeValue(value: customerApi.CustomerProductAttributeValue) {
  if (value.option) {
    return value.option.label;
  }

  if (value.textValue) {
    return value.textValue;
  }

  if (value.numberValue !== null) {
    return String(value.numberValue);
  }

  if (value.booleanValue !== null) {
    return value.booleanValue ? "Yes" : "No";
  }

  return "Not specified";
}

function MetadataList({
  items,
  title,
}: {
  title: string;
  items: customerApi.CustomerMetadataItem[];
}) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="product-detail-section">
      <h2>{title}</h2>
      <div className="detail-chip-list">
        {items.map((item) => (
          <article className="detail-chip" key={item.id}>
            <h3>{item.name}</h3>
            {item.description ? <p>{item.description}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProductDetail({ slug }: { slug: string }) {
  const { accessToken, isAuthenticated } = useAuth();
  const { formatPrice } = useCurrency();
  const [product, setProduct] = useState<customerApi.CustomerProduct | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      try {
        const nextProduct = await customerApi.getCustomerProduct(slug);

        if (isMounted) {
          setProduct(nextProduct);
          setError(null);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load product",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  async function addVariantToCart(variant: customerApi.CustomerProductVariant) {
    if (!accessToken) {
      setSuccess(null);
      setError("Please login before adding variants to cart.");
      return;
    }

    setAddingVariantId(variant.id);
    setError(null);
    setSuccess(null);

    try {
      await customerApi.addCartItem(accessToken, {
        variantId: variant.id,
        quantity: 1,
      });
      setSuccess(`${product?.name ?? "Product"} variant added to cart.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to add variant to cart",
      );
    } finally {
      setAddingVariantId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="customer-page">
        <section className="empty-surface">
          <h1>Loading product...</h1>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="customer-page">
        <section className="empty-surface">
          <h1>Product not found</h1>
          {error ? <p className="form-error">{error}</p> : null}
          <Link className="secondary-link-button" href="/">
            Back to Products
          </Link>
        </section>
      </main>
    );
  }

  const categories =
    product.categories?.map((item) => ({
      ...item.category,
      name: item.isPrimary
        ? `${item.category.name} (Primary)`
        : item.category.name,
    })) ?? [];
  const audiences = product.audiences?.map((item) => item.audience) ?? [];
  const skinTypes = product.skinTypes?.map((item) => item.skinType) ?? [];
  const ageGroups = product.ageGroups?.map((item) => item.ageGroup) ?? [];
  const hairProfiles =
    product.hairProfiles?.map((item) => item.hairProfile) ?? [];
  const concerns = product.concerns?.map((item) => item.concern) ?? [];
  const benefits = product.productBenefits?.map((item) => item.benefit) ?? [];
  const selectedVariant = product.variants?.find(
    (variant) => variant.id === selectedVariantId,
  );
  const galleryImages = selectedVariant?.images?.length
    ? selectedVariant.images
    : product.images ?? [];

  return (
    <main className="customer-page">
      <section className="product-detail-hero">
        <div>
          <p className="eyebrow">Product Details</p>
          <h1>{product.name}</h1>
          <p>{product.shortDescription || "Skincare product"}</p>
        </div>
        <Link className="secondary-link-button" href="/">
          Back to Products
        </Link>
      </section>

      {galleryImages.length ? (
        <section className="product-detail-section">
          <h2>Images</h2>
          <div className="customer-product-gallery">
            {galleryImages.map((image) => (
              <img
                alt={image.altText ?? product.name}
                key={image.id}
                src={image.url}
              />
            ))}
          </div>
        </section>
      ) : null}

      {product.description ? (
        <section className="product-detail-section">
          <h2>Details</h2>
          <p>{product.description}</p>
        </section>
      ) : null}

      {product.usageInstructions || product.warnings ? (
        <section className="product-detail-section">
          <h2>Usage and Warnings</h2>
          {product.usageInstructions ? (
            <p>
              <strong>Usage:</strong> {product.usageInstructions}
            </p>
          ) : null}
          {product.warnings ? (
            <p>
              <strong>Warnings:</strong> {product.warnings}
            </p>
          ) : null}
        </section>
      ) : null}

      <MetadataList title="Categories" items={categories} />

      {product.ingredients?.length ? (
        <section className="product-detail-section">
          <h2>Ingredients</h2>
          <div className="detail-chip-list">
            {product.ingredients.map((item) => (
              <article className="detail-chip" key={item.ingredient.id}>
                <h3>
                  {item.ingredient.name}
                  {item.isKeyIngredient ? " (Key)" : ""}
                </h3>
                {item.ingredient.inciName ? (
                  <p>INCI: {item.ingredient.inciName}</p>
                ) : null}
                {item.purpose ? <p>Purpose: {item.purpose}</p> : null}
                {item.concentration ? (
                  <p>Concentration: {item.concentration}</p>
                ) : null}
                {item.ingredient.description ? (
                  <p>{item.ingredient.description}</p>
                ) : null}
                {item.ingredient.benefits ? (
                  <p>Benefits: {item.ingredient.benefits}</p>
                ) : null}
                {item.ingredient.warnings ? (
                  <p>Warnings: {item.ingredient.warnings}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <MetadataList title="Audience" items={audiences} />
      <MetadataList title="Skin Types" items={skinTypes} />
      <MetadataList title="Age Groups" items={ageGroups} />
      <MetadataList title="Hair Profiles" items={hairProfiles} />
      <MetadataList title="Concerns" items={concerns} />
      <MetadataList title="Benefits" items={benefits} />

      {product.attributeValues?.length ? (
        <section className="product-detail-section">
          <h2>Attributes</h2>
          <div className="detail-table">
            {product.attributeValues.map((value) => (
              <div className="detail-table-row" key={value.id}>
                <span>{value.attribute.name}</span>
                <strong>{getAttributeValue(value)}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {success ? <p className="form-success">{success}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <section className="product-detail-section">
        <h2>Variants</h2>
        {product.variants?.length ? (
          <div className="variant-list">
            {product.variants.map((variant) => {
              const isAvailable = variant.isActive && variant.stockQuantity > 0;

              return (
                <article className="customer-variant-row" key={variant.id}>
                  <div>
                    <h3>{variant.sku}</h3>
                    <p>
                      {isAvailable
                        ? `${variant.stockQuantity} in stock`
                        : "Out of stock"}
                    </p>
                  </div>
                  <strong>{formatPrice(variant.price)}</strong>
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                  >
                    View Images
                  </button>
                  {isAuthenticated ? (
                    <button
                      className="primary-button compact-button"
                      type="button"
                      disabled={!isAvailable || addingVariantId === variant.id}
                      onClick={() => void addVariantToCart(variant)}
                    >
                      {addingVariantId === variant.id
                        ? "Adding..."
                        : "Add Variant"}
                    </button>
                  ) : (
                    <Link
                      className="primary-link-button compact-button"
                      href="/login"
                    >
                      Login to Add
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p>No variants are available for this product yet.</p>
        )}
      </section>
    </main>
  );
}
