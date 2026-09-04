"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { OfferBadge } from "@/components/customer/offer-badge";
import { OfferPrice } from "@/components/customer/offer-price";
import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";
import { getOfferDisplayLabel } from "@/lib/offers/format";
import type { EffectiveOffer, ResolvedOfferPricing } from "@/lib/offers/types";

const detailTabs = ["About", "Reviews", "Benefits", "Other Details"] as const;
type DetailTab = (typeof detailTabs)[number];

type ProductDetailIcon = "bag" | "return" | "shipping" | "quality" | "plant";

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

function isVariantSizeAttribute(value: customerApi.CustomerProductAttributeValue) {
  return /size|volume|weight|pack|package|ml|g\b|oz/i.test(
    `${value.attribute.name} ${value.attribute.slug}`,
  );
}

function getPrimaryPrice(product: customerApi.CustomerProduct) {
  return product.displayPrice ?? product.variants?.[0]?.price ?? "0";
}

function getDisplayPricing(product: customerApi.CustomerProduct) {
  return product.displayPricing ?? product.variants?.[0]?.pricing ?? null;
}

function getVariantSizeLabel(variant: customerApi.CustomerProductVariant) {
  const sizeAttribute = variant.attributeValues?.find(isVariantSizeAttribute);

  if (sizeAttribute) {
    return getAttributeValue(sizeAttribute);
  }

  return variant.sku;
}

function getVariantSubtitle(variant: customerApi.CustomerProductVariant) {
  const attributes =
    variant.attributeValues
      ?.filter((value) => !isVariantSizeAttribute(value))
      .map((value) => getAttributeValue(value))
      .filter(isUsefulDetail)
      .slice(0, 2) ?? [];

  return attributes.length ? attributes.join(" / ") : variant.sku;
}

function getDisplayRating(product: customerApi.CustomerProduct) {
  if (typeof product.averageRating === "number") {
    return product.averageRating;
  }

  const reviews = product.reviews ?? [];

  if (!reviews.length) {
    return 0;
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);

  return Number((total / reviews.length).toFixed(1));
}

function getReviewUserName(review: customerApi.CustomerProductReview) {
  if (!review.user) {
    return "Customer";
  }

  return [review.user.firstName, review.user.lastName].filter(Boolean).join(" ");
}

function getProductDetailOfferMessage(
  offer: EffectiveOffer,
  pricing: ResolvedOfferPricing | null,
  formatPrice: (amount: string | number) => string,
) {
  if (offer.type === "FIXED_AMOUNT" && offer.value) {
    return `Save ${formatPrice(offer.value)} on this item`;
  }

  if (offer.type === "BUY_X_GET_Y") {
    const buyQuantity = pricing?.buyXGetY?.buyQuantity ?? offer.buyXGetY?.buyQuantity;
    const getQuantity = pricing?.buyXGetY?.getQuantity ?? offer.buyXGetY?.getQuantity;

    if (buyQuantity && getQuantity) {
      return `Buy ${buyQuantity} and get ${getQuantity} free`;
    }
  }

  return getOfferDisplayLabel(
    {
      ...offer,
      buyXGetY: offer.buyXGetY ?? pricing?.buyXGetY ?? null,
    },
    formatPrice,
  ) ?? "Offer available";
}

function formatOfferEndDate(endAt: string) {
  return `Valid until ${new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(endAt))}`;
}

function ProductDetailSvgIcon({ icon }: { icon: ProductDetailIcon }) {
  if (icon === "bag") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7.5 8.5V7a4.5 4.5 0 0 1 9 0v1.5" />
        <path d="M5.5 8.5h13l1 11h-15l1-11Z" />
      </svg>
    );
  }

  if (icon === "return") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M8 7H5v3" />
        <path d="M5.5 9.5A7 7 0 1 0 12 5" />
        <path d="M14.5 11.5h-4a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H9" />
      </svg>
    );
  }

  if (icon === "shipping") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M3.5 7.5h11v9h-11z" />
        <path d="M14.5 10.5h3.5l2.5 3v3h-6z" />
        <path d="M7 19a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 7 19Z" />
        <path d="M18 19a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 18 19Z" />
      </svg>
    );
  }

  if (icon === "quality") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14Z" />
      <path d="M5 19c0-4 2.5-7.5 7.5-10.5" />
    </svg>
  );
}

function uniqueImagesById(images: customerApi.CustomerProductImage[]) {
  const seenImageIds = new Set<string>();

  return images.filter((image) => {
    if (seenImageIds.has(image.id)) {
      return false;
    }

    seenImageIds.add(image.id);
    return true;
  });
}

function RatingStars({
  count,
  rating,
  showCount = true,
}: {
  count?: number;
  rating: number;
  showCount?: boolean;
}) {
  const roundedRating = Math.round(rating);

  return (
    <span className="product-rating-row" aria-label={`${rating} out of 5 stars`}>
      <span className="rating-stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span className={index < roundedRating ? "filled" : undefined} key={index}>
            ★
          </span>
        ))}
      </span>
      {showCount ? (
        <span className="rating-count">
          {count ? `${rating.toFixed(1)} (${count})` : "No reviews"}
        </span>
      ) : null}
    </span>
  );
}

function ProductCard({ product }: { product: customerApi.CustomerProduct }) {
  const image = product.images?.[0];
  const averageRating = useMemo(() => getDisplayRating(product), [product]);
  const reviewCount = product.reviewCount ?? product.reviews?.length ?? 0;
  const displayPricing = getDisplayPricing(product);
  const offer = product.effectiveOffer ?? displayPricing?.offer ?? null;

  return (
    <article className="shop-product-card">
      <Link className="related-product-image" href={`/products/${product.slug}`}>
        {image ? (
          <img alt={image.altText ?? product.name} src={image.url} />
        ) : (
          <div className="shop-product-image-placeholder" />
        )}
        {product.hasOffer || displayPricing?.hasOffer ? (
          offer ? (
            <OfferBadge
              className="product-card-offer-badge"
              offer={offer}
              buyXGetY={displayPricing?.buyXGetY}
            />
          ) : (
            <span className="offer-badge product-card-offer-badge">
              Offer Available
            </span>
          )
        ) : null}
      </Link>
      <div>
        <p>{product.categories?.[0]?.category.name ?? "Skincare"}</p>
        <h2>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h2>
        <RatingStars count={reviewCount} rating={averageRating} />
        <span>
          <OfferPrice price={getPrimaryPrice(product)} pricing={displayPricing} />
        </span>
      </div>
    </article>
  );
}

function ChipList({
  items,
}: {
  items: customerApi.CustomerMetadataItem[];
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="product-detail-chip-list">
      {items.map((item) => (
        <span key={item.id}>{item.name}</span>
      ))}
    </div>
  );
}

type ProductInfoGroup = {
  title: string;
  items: string[];
};

function formatCustomerValue(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b40 plus\b/i, "40+")
    .replace(/\bsensitive skin users\b/i, "Sensitive Skin")
    .replace(/\bnot applicable\b/i, "Not Applicable")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isUsefulDetail(value: string | null | undefined): value is string {
  const normalized = value?.trim().toLowerCase();

  return Boolean(
    normalized &&
      !["n/a", "na", "none", "null", "undefined", "not applicable"].includes(
        normalized,
      ),
  );
}

function uniqueDetailValues(items: string[]) {
  const seenValues = new Set<string>();

  return items.filter((item) => {
    const normalized = item.trim().toLowerCase();

    if (!normalized || seenValues.has(normalized)) {
      return false;
    }

    seenValues.add(normalized);
    return true;
  });
}

function metadataNames(items: customerApi.CustomerMetadataItem[]) {
  return uniqueDetailValues(
    items
      .map((item) => item.name)
      .filter(isUsefulDetail)
      .map(formatCustomerValue),
  );
}

function attributeDisplayValue(value: customerApi.CustomerProductAttributeValue) {
  const displayValue = getAttributeValue(value);

  if (!isUsefulDetail(displayValue)) {
    return null;
  }

  if (value.booleanValue === true) {
    return formatCustomerValue(value.attribute.name);
  }

  if (value.booleanValue === false) {
    return null;
  }

  return `${formatCustomerValue(value.attribute.name)}: ${formatCustomerValue(
    displayValue,
  )}`;
}

function isHighlightAttribute(value: customerApi.CustomerProductAttributeValue) {
  return /vegan|cruelty|organic|dermatologist|arrival|clean|fragrance|spf|tested/i.test(
    value.attribute.name,
  );
}

function isProductInfoAttribute(value: customerApi.CustomerProductAttributeValue) {
  return /size|volume|weight|texture|finish|form|usage|origin|country|shelf|life|material|shade/i.test(
    value.attribute.name,
  );
}

function ProductInformation({
  description,
  groups,
  quickHighlights,
}: {
  description: string | null | undefined;
  groups: ProductInfoGroup[];
  quickHighlights: string[];
}) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  if (!description && !quickHighlights.length && !visibleGroups.length) {
    return null;
  }

  return (
    <div className="product-information">
      <div className="product-information-intro">
        <h3>About this product</h3>
        {description ? <p>{description}</p> : null}
        {quickHighlights.length ? (
          <div className="product-information-badges">
            {quickHighlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
      </div>

      {visibleGroups.length ? (
        <div className="product-information-grid">
          {visibleGroups.map((group) => (
            <section className="product-information-group" key={group.title}>
              <h3>{group.title}</h3>
              <div>
                {group.items.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AttributeRows({
  items,
}: {
  items: customerApi.CustomerProductAttributeValue[];
}) {
  return (
    <div className="detail-table">
      {items.map((value, index) => (
        <div
          className="detail-table-row"
          key={`${value.attribute.id}-${value.id}-${index}`}
        >
          <span>{value.attribute.name}</span>
          <strong>{getAttributeValue(value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function ProductDetail({ slug }: { slug: string }) {
  const { accessToken, user } = useAuth();
  const { formatPrice } = useCurrency();
  const [product, setProduct] = useState<customerApi.CustomerProduct | null>(
    null,
  );
  const [relatedResponse, setRelatedResponse] =
    useState<customerApi.CustomerShopProductsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<DetailTab>("About");
  const [relatedPage, setRelatedPage] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setIsLoading(true);
      setRelatedPage(1);

      try {
        const nextProduct = await customerApi.getCustomerProduct(slug);
        const firstAvailableVariant =
          nextProduct.variants?.find((variant) => variant.stockQuantity > 0) ??
          nextProduct.variants?.[0] ??
          null;

        if (isMounted) {
          setProduct(nextProduct);
          setSelectedVariantId(firstAvailableVariant?.id ?? null);
          setQuantity(1);
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

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) {
      return null;
    }

    return (
      product.variants.find((variant) => variant.id === selectedVariantId) ??
      product.variants[0]
    );
  }, [product, selectedVariantId]);

  const primaryCategory = useMemo(() => {
    if (!product?.categories?.length) {
      return null;
    }

    return (
      product.categories.find((item) => item.isPrimary)?.category ??
      product.categories[0].category
    );
  }, [product]);

  const selectedVariantImages = useMemo(
    () => selectedVariant?.images ?? [],
    [selectedVariant?.images],
  );
  const productImages = useMemo(() => product?.images ?? [], [product?.images]);
  const galleryImages = useMemo(
    () => uniqueImagesById([...selectedVariantImages, ...productImages]),
    [productImages, selectedVariantImages],
  );
  const reviews = useMemo(() => product?.reviews ?? [], [product?.reviews]);
  const averageRating = useMemo(
    () => (product ? getDisplayRating(product) : 0),
    [product],
  );
  const reviewCount = product?.reviewCount ?? reviews.length;
  const userReview = useMemo(
    () =>
      user
        ? reviews.find((review) => review.user?.id === user.id) ?? null
        : null,
    [reviews, user],
  );

  const metadataHighlights = useMemo(() => {
    const skinTypes = product?.skinTypes?.map((item) => item.skinType) ?? [];
    const concerns = product?.concerns?.map((item) => item.concern) ?? [];
    const benefits =
      product?.productBenefits?.map((item) => item.benefit) ?? [];

    return [...skinTypes, ...concerns, ...benefits].slice(0, 8);
  }, [product]);

  const productInformation = useMemo(() => {
    const attributes = [
      ...(product?.attributeValues ?? []),
      ...(selectedVariant?.attributeValues ?? []),
    ];
    const tagNames = metadataNames(product?.tags?.map((item) => item.tag) ?? []);
    const productInfoItems = uniqueDetailValues(
      attributes
        .filter(isProductInfoAttribute)
        .map(attributeDisplayValue)
        .filter(isUsefulDetail),
    );
    const highlightItems = uniqueDetailValues([
      ...tagNames,
      ...attributes
        .filter(isHighlightAttribute)
        .map(attributeDisplayValue)
        .filter(isUsefulDetail),
    ]);
    const quickHighlights = uniqueDetailValues([
      ...productInfoItems.slice(0, 1),
      ...highlightItems.slice(0, 3),
    ]);

    return {
      groups: [
        {
          title: "Product Type",
          items: metadataNames(
            product?.categories?.map((item) => item.category) ?? [],
          ),
        },
        {
          title: "Suitable For",
          items: uniqueDetailValues([
            ...metadataNames(
              product?.audiences?.map((item) => item.audience) ?? [],
            ),
            ...metadataNames(
              product?.skinTypes?.map((item) => item.skinType) ?? [],
            ),
            ...metadataNames(
              product?.ageGroups?.map((item) => item.ageGroup) ?? [],
            ),
            ...metadataNames(
              product?.hairProfiles?.map((item) => item.hairProfile) ?? [],
            ),
          ]),
        },
        {
          title: "Targets",
          items: metadataNames(
            product?.concerns?.map((item) => item.concern) ?? [],
          ),
        },
        {
          title: "Benefits",
          items: metadataNames(
            product?.productBenefits?.map((item) => item.benefit) ?? [],
          ),
        },
        {
          title: "Highlights",
          items: highlightItems,
        },
        {
          title: "Product Information",
          items: productInfoItems,
        },
      ],
      quickHighlights,
    };
  }, [product, selectedVariant]);

  useEffect(() => {
    let isMounted = true;

    async function loadRelatedProducts() {
      if (!product?.id || !primaryCategory?.slug) {
        setRelatedResponse(null);
        return;
      }

      const relatedCategorySlug = primaryCategory.slug;
      const currentProductId = product.id;

      setIsRelatedLoading(true);

      try {
        const response = await customerApi.getCustomerShopProducts({
          category: [relatedCategorySlug],
          excludeProductId: currentProductId,
          page: String(relatedPage),
          pageSize: "4",
          sort: "featured",
        });

        if (isMounted) {
          setRelatedResponse(response);
        }
      } finally {
        if (isMounted) {
          setIsRelatedLoading(false);
        }
      }
    }

    void loadRelatedProducts();

    return () => {
      isMounted = false;
    };
  }, [primaryCategory?.slug, product?.id, relatedPage]);

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) {
        return;
      }

      if (!userReview) {
        setReviewRating(5);
        setReviewBody("");
        return;
      }

      setReviewRating(userReview.rating);
      setReviewBody(userReview.body ?? "");
    });

    return () => {
      isMounted = false;
    };
  }, [userReview]);

  async function addSelectedVariantToCart() {
    if (!selectedVariant || !product) {
      return;
    }

    if (!accessToken) {
      setSuccess(null);
      setError("Please login before adding this product to cart.");
      return;
    }

    setAddingVariantId(selectedVariant.id);
    setError(null);
    setSuccess(null);

    try {
      await customerApi.addCartItem(accessToken, {
        variantId: selectedVariant.id,
        quantity,
      });
      setSuccess(`${product.name} added to cart.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to add product to cart",
      );
    } finally {
      setAddingVariantId(null);
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!product) {
      return;
    }

    if (!accessToken) {
      setReviewSuccess(null);
      setReviewError("Please login before reviewing this product.");
      return;
    }

    setIsReviewSubmitting(true);
    setReviewError(null);
    setReviewSuccess(null);

    try {
      await customerApi.submitProductReview(accessToken, product.id, {
        rating: reviewRating,
        body: reviewBody,
      });

      const refreshedProduct = await customerApi.getCustomerProduct(slug);
      setProduct(refreshedProduct);
      setReviewSuccess("Review submitted successfully.");
    } catch (caughtError) {
      setReviewError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit review",
      );
    } finally {
      setIsReviewSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="product-template-page">
        <section className="empty-surface">
          <h1>Loading product...</h1>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="product-template-page">
        <section className="empty-surface">
          <h1>Product not found</h1>
          {error ? <p className="form-error">{error}</p> : null}
          <Link className="secondary-link-button" href="/shop">
            Back to Shop
          </Link>
        </section>
      </main>
    );
  }

  const stockQuantity = selectedVariant?.stockQuantity ?? 0;
  const isAvailable = Boolean(selectedVariant?.isActive && stockQuantity > 0);
  const compareAtPrice = selectedVariant?.compareAtPrice;
  const selectedPricing = selectedVariant?.pricing ?? null;
  const selectedOffer = selectedPricing?.offer ?? null;
  const productAttributes = product.attributeValues ?? [];
  const variantAttributes = selectedVariant?.attributeValues ?? [];
  const selectedVariantDetails = variantAttributes.filter(
    (value) => !isVariantSizeAttribute(value),
  );
  const combinedAttributes = [...productAttributes, ...variantAttributes];
  const variantAttributeDescriptions = variantAttributes.filter(
    (value) =>
      value.attribute.description && !isProductInfoAttribute(value),
  );
  const relatedProducts = relatedResponse?.items ?? [];
  const relatedPagination = relatedResponse?.pagination;

  return (
    <main className="product-template-page">
      <nav className="shop-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/shop">Shop</Link>
        {primaryCategory ? (
          <>
            <span>/</span>
            <Link href={`/shop?category=${primaryCategory.slug}`}>
              {primaryCategory.name}
            </Link>
          </>
        ) : null}
      </nav>

      <section className="product-template-layout">
        <div className="product-template-gallery">
          {selectedVariantImages.length ? (
            <div className="product-gallery-note">
              Showing {selectedVariant?.sku} images with product images
            </div>
          ) : null}
          {galleryImages.length ? (
            galleryImages.map((image, index) => (
              <button
                aria-label={`View ${product.name} image ${index + 1}`}
                className={index % 3 === 0 ? "wide" : undefined}
                key={image.id}
                type="button"
              >
                <img alt={image.altText ?? product.name} src={image.url} />
              </button>
            ))
          ) : (
            <div className="product-template-image-placeholder" />
          )}
        </div>

        <aside className="product-template-summary">
          <p className="eyebrow">{primaryCategory?.name ?? "Skincare"}</p>
          <h1>{product.name}</h1>
          <div className="product-summary-meta">
            {product.tags?.[0]?.tag ? (
              <span className="product-vendor-pill">
                {product.tags[0].tag.name}
              </span>
            ) : null}
            {selectedOffer ? (
              <OfferBadge
                offer={selectedOffer}
                buyXGetY={selectedPricing?.buyXGetY}
              />
            ) : null}
            <strong>
              <OfferPrice
                price={selectedVariant?.price ?? "0"}
                pricing={selectedPricing}
              />
            </strong>
            {compareAtPrice && !selectedOffer ? (
              <span>{formatPrice(compareAtPrice)}</span>
            ) : null}
            <button
              className="product-rating-summary-button"
              type="button"
              onClick={() => {
                setActiveTab("Reviews");
                window.requestAnimationFrame(() => {
                  document
                    .getElementById("product-details-tabs")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }}
            >
              <RatingStars count={reviewCount} rating={averageRating} />
            </button>
          </div>
          <p>{product.shortDescription || "Skincare product"}</p>

          {selectedOffer ? (
            <section className="product-offer-panel" aria-label="Special offer">
              <p className="eyebrow">Special Offer</p>
              <h2>{selectedOffer.name}</h2>
              <strong>
                {getProductDetailOfferMessage(selectedOffer, selectedPricing, formatPrice)}
              </strong>
              {selectedOffer.endAt ? (
                <small>{formatOfferEndDate(selectedOffer.endAt)}</small>
              ) : null}
              {selectedPricing?.buyXGetY?.buyQuantity ? (
                <small>
                  Add {selectedPricing.buyXGetY.buyQuantity} to qualify. Cart will verify final eligibility.
                </small>
              ) : null}
            </section>
          ) : null}

          {product.variants?.length ? (
            <section className="product-template-options">
              <h2>Size</h2>
              <div className="product-variant-options">
                {product.variants.map((variant) => {
                  const variantAvailable =
                    variant.isActive && variant.stockQuantity > 0;
                  const sizeLabel = getVariantSizeLabel(variant);
                  const variantSubtitle = getVariantSubtitle(variant);

                  return (
                    <button
                      className={
                        variant.id === selectedVariant?.id ? "selected" : undefined
                      }
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setQuantity(1);
                        setSuccess(null);
                        setError(null);
                      }}
                    >
                      <span>{sizeLabel}</span>
                      <strong>
                        <OfferPrice price={variant.price} pricing={variant.pricing} />
                      </strong>
                      <small>
                        {variantAvailable
                          ? `${variantSubtitle} · ${variant.stockQuantity} in stock`
                          : "Out of stock"}
                      </small>
                      {variant.pricing?.offer ? (
                        <OfferBadge
                          offer={variant.pricing.offer}
                          buyXGetY={variant.pricing.buyXGetY}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <ChipList items={metadataHighlights} />

          {selectedVariantDetails.length ? (
            <div className="product-selected-values">
              {selectedVariantDetails.map((value) => (
                <div key={value.id}>
                  <span>{value.attribute.name}</span>
                  <strong>{getAttributeValue(value)}</strong>
                </div>
              ))}
            </div>
          ) : null}

          <div className="product-purchase-row">
            <label className="product-quantity-label">
              <span>Qty</span>
              <div className="quantity-controls product-quantity-controls">
                <button
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  type="button"
                  onClick={() =>
                    setQuantity((current) => Math.max(1, current - 1))
                  }
                >
                  -
                </button>
                <span>{quantity}</span>
                <button
                  aria-label="Increase quantity"
                  disabled={!isAvailable || quantity >= stockQuantity}
                  type="button"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.min(stockQuantity || 1, current + 1),
                    )
                  }
                >
                  +
                </button>
              </div>
            </label>

            {accessToken ? (
              <button
                className="primary-button product-add-to-cart-button"
                disabled={
                  !selectedVariant ||
                  !isAvailable ||
                  addingVariantId === selectedVariant.id
                }
                type="button"
                onClick={() => void addSelectedVariantToCart()}
              >
                <span className="text-2xl!">
                  {addingVariantId === selectedVariant?.id
                    ? "Adding..."
                    : "Add to Cart"}
                </span>
                <span className="product-add-to-cart-icon" aria-hidden="true">
                  <ProductDetailSvgIcon icon="bag" />
                </span>
              </button>
            ) : (
              <Link
                className="primary-link-button product-add-to-cart-button"
                href="/login"
              >
                <span className="text-2xl!">Login to Add</span>
                <span className="product-add-to-cart-icon" aria-hidden="true">
                  <ProductDetailSvgIcon icon="bag" />
                </span>
              </Link>
            )}
          </div>

          {success ? <p className="form-success">{success}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <div className="product-feature-strip flex! justify-between">
            {[
              ["return", "30 Days Return"],
              ["quality", "100% Quality Guarantee"],
              ["plant", "Vegan & Cruelty Free"],
            ].map(([icon, title]) => (
              <article key={title}>
                <span>
                  <ProductDetailSvgIcon icon={icon as ProductDetailIcon} />
                </span>
                <p>{title}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="product-about-block" id="product-details-tabs">
        <h2>
          <em>all about the</em>
          <span>PRODUCT</span>
        </h2>

        <div className="product-tab-list" role="tablist">
          {detailTabs.map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={activeTab === tab ? "active" : undefined}
              key={tab}
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="product-tab-panel">
          {activeTab === "About" ? (
            <div className="product-detail-content-grid">
              {galleryImages[0] ? (
                <img
                  alt={galleryImages[0].altText ?? product.name}
                  src={galleryImages[0].url}
                />
              ) : null}
              <div>
                <ProductInformation
                  description={product.description || product.shortDescription}
                  groups={productInformation.groups}
                  quickHighlights={productInformation.quickHighlights}
                />
                {variantAttributeDescriptions.length ? (
                  <div className="detail-chip-list">
                    {variantAttributeDescriptions.map((value) => (
                      <article className="detail-chip" key={value.id}>
                        <h3>{value.attribute.name}</h3>
                        <p>{value.attribute.description}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === "Reviews" ? (
            <div className="product-review-layout" id="reviews">
              <div className="product-reviews-heading">
                <div>
                  <p className="eyebrow">Reviews</p>
                  <h2>{reviewCount} Reviews</h2>
                </div>
                <RatingStars count={reviewCount} rating={averageRating} />
              </div>

              <div className="product-review-stream">
                <div className="product-review-list">
                  {reviews.length ? (
                    reviews.map((review) => (
                      <article className="product-review-card" key={review.id}>
                        <div className="product-review-author">
                          <strong>{getReviewUserName(review)}</strong>
                          {review.createdAt ? (
                            <time dateTime={review.createdAt}>
                              {new Date(review.createdAt).toLocaleDateString()}
                            </time>
                          ) : null}
                        </div>
                        <div className="product-review-content">
                          <div className="product-review-score">
                            <RatingStars rating={review.rating} showCount={false} />
                            <span>{review.rating}</span>
                          </div>
                          {review.title ? <h3>{review.title}</h3> : null}
                          <p>{review.body}</p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-surface">
                      <h2>No reviews yet</h2>
                      <p>Be the first to share your experience with this product.</p>
                    </div>
                  )}
                </div>

                <form className="product-review-form" onSubmit={submitReview}>
                  <h3>{userReview ? "Update your review" : "Write a review"}</h3>
                  <div className="review-rating-input" aria-label="Select rating">
                    {Array.from({ length: 5 }, (_, index) => {
                      const rating = index + 1;

                      return (
                        <button
                          aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                          className={rating <= reviewRating ? "selected" : undefined}
                          disabled={isReviewSubmitting}
                          key={rating}
                          type="button"
                          onClick={() => setReviewRating(rating)}
                        >
                          ★
                        </button>
                      );
                    })}
                  </div>
                  <label>
                    Review message
                    <textarea
                      maxLength={1000}
                      placeholder="Share what stood out about this product"
                      required
                      rows={5}
                      value={reviewBody}
                      onChange={(event) => setReviewBody(event.target.value)}
                    />
                  </label>
                  {accessToken ? (
                    <button
                      className="primary-button"
                      disabled={isReviewSubmitting}
                      type="submit"
                    >
                      {isReviewSubmitting ? "Submitting..." : "Submit Review"}
                    </button>
                  ) : (
                    <Link className="primary-link-button" href="/login">
                      Login to Review
                    </Link>
                  )}
                  {reviewSuccess ? <p className="form-success">{reviewSuccess}</p> : null}
                  {reviewError ? <p className="form-error">{reviewError}</p> : null}
                </form>
              </div>
            </div>
          ) : null}

          {activeTab === "Benefits" ? (
            <div className="product-detail-content-grid">
              {galleryImages[1] ?? galleryImages[0] ? (
                <img
                  alt={(galleryImages[1] ?? galleryImages[0])?.altText ?? product.name}
                  src={(galleryImages[1] ?? galleryImages[0])?.url}
                />
              ) : null}
              <div className="product-detail-copy">
                {productInformation.groups
                  .filter((group) => ["Benefits", "Targets", "Highlights"].includes(group.title))
                  .map((group) => (
                    <section className="product-information-group" key={group.title}>
                      <h3>{group.title}</h3>
                      <div>
                        {group.items.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </section>
                  ))}
                {product.usageInstructions ? <p>{product.usageInstructions}</p> : null}
              </div>
            </div>
          ) : null}

          {activeTab === "Other Details" ? (
            <div className="product-detail-content-grid">
              {galleryImages[2] ?? galleryImages[0] ? (
                <img
                  alt={(galleryImages[2] ?? galleryImages[0])?.altText ?? product.name}
                  src={(galleryImages[2] ?? galleryImages[0])?.url}
                />
              ) : null}
              <div className="product-other-details">
                <div className="product-feature-strip product-feature-strip-panel">
                  {[
                    ["return", "30 Days Return"],
                    ["quality", "100% Quality Guarantee"],
                    ["plant", "Vegan & Cruelty Free"],
                  ].map(([icon, title]) => (
                    <article key={title}>
                      <span>
                        <ProductDetailSvgIcon icon={icon as ProductDetailIcon} />
                      </span>
                      <p>{title}</p>
                    </article>
                  ))}
                </div>

                <div className="product-disclosure-list">
                  <article className="open">
                    <div>
                      <h3>Return policy</h3>
                      <span aria-hidden="true">-</span>
                    </div>
                    <p>
                      Returns are accepted within 30 days when the item is unused,
                      unopened, and in its original packaging.
                    </p>
                  </article>
                  <article>
                    <div>
                      <h3>Shipping details</h3>
                      <span aria-hidden="true">+</span>
                    </div>
                    <p>
                      Free shipping is available on eligible orders. Delivery timing
                      may vary by address and selected shipping method.
                    </p>
                  </article>
                  <article>
                    <div>
                      <h3>Usage and warnings</h3>
                      <span aria-hidden="true">+</span>
                    </div>
                    <p>
                      {product.usageInstructions ??
                        "Use as part of your daily skincare routine according to your skin needs."}
                      {product.warnings ? ` ${product.warnings}` : ""}
                    </p>
                  </article>
                </div>

              {product.ingredients?.length ? (
                <article className="product-other-detail-group">
                  <h3>What are the key ingredients?</h3>
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
                      </article>
                    ))}
                  </div>
                </article>
              ) : null}
              {combinedAttributes.length ? <AttributeRows items={combinedAttributes} /> : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {primaryCategory ? (
        <section className="product-related-section">
          <div className="product-related-heading">
            <h2>
              Take
              <br />
              <em>another look</em>
            </h2>
            <Link href={`/shop?category=${primaryCategory.slug}`}>
              View category
            </Link>
          </div>

          {isRelatedLoading ? (
            <section className="empty-surface">
              <h2>Loading related products...</h2>
            </section>
          ) : relatedProducts.length ? (
            <>
              <div className="shop-product-grid">
                {relatedProducts.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct.id}
                    product={relatedProduct}
                  />
                ))}
              </div>

              {relatedPagination && relatedPagination.totalPages > 1 ? (
                <nav className="shop-pagination" aria-label="Related products">
                  <button
                    disabled={!relatedPagination.hasPreviousPage}
                    type="button"
                    onClick={() => setRelatedPage(relatedPagination.page - 1)}
                  >
                    Previous
                  </button>
                  {Array.from(
                    { length: relatedPagination.totalPages },
                    (_, index) => (
                      <button
                        className={
                          relatedPagination.page === index + 1
                            ? "active"
                            : undefined
                        }
                        key={index + 1}
                        type="button"
                        onClick={() => setRelatedPage(index + 1)}
                      >
                        {index + 1}
                      </button>
                    ),
                  )}
                  <button
                    disabled={!relatedPagination.hasNextPage}
                    type="button"
                    onClick={() => setRelatedPage(relatedPagination.page + 1)}
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </>
          ) : (
            <section className="empty-surface">
              <h2>No related products found</h2>
            </section>
          )}
        </section>
      ) : null}
    </main>
  );
}
