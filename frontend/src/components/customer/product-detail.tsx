"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

const detailTabs = ["About", "How to Use", "Ingredients", "Attributes"] as const;
type DetailTab = (typeof detailTabs)[number];

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

function getPrimaryPrice(product: customerApi.CustomerProduct) {
  return product.variants?.[0]?.price ?? "0";
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

function ProductCard({
  product,
  formatPrice,
}: {
  product: customerApi.CustomerProduct;
  formatPrice: (amount: string | number) => string;
}) {
  const image = product.images?.[0];
  const averageRating = useMemo(() => getDisplayRating(product), [product]);
  const reviewCount = product.reviewCount ?? product.reviews?.length ?? 0;

  return (
    <article className="shop-product-card">
      <Link className="related-product-image" href={`/products/${product.slug}`}>
        {image ? (
          <img alt={image.altText ?? product.name} src={image.url} />
        ) : (
          <div className="shop-product-image-placeholder" />
        )}
      </Link>
      <div>
        <p>{product.categories?.[0]?.category.name ?? "Skincare"}</p>
        <h2>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h2>
        <RatingStars count={reviewCount} rating={averageRating} />
        <span>{formatPrice(getPrimaryPrice(product))}</span>
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
    if (!userReview) {
      setReviewRating(5);
      setReviewBody("");
      return;
    }

    setReviewRating(userReview.rating);
    setReviewBody(userReview.body ?? "");
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
  const productAttributes = product.attributeValues ?? [];
  const variantAttributes = selectedVariant?.attributeValues ?? [];
  const combinedAttributes = [...productAttributes, ...variantAttributes];
  const variantAttributeDescriptions = variantAttributes.filter(
    (value) => value.attribute.description,
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
          <RatingStars count={reviewCount} rating={averageRating} />
          <p>{product.shortDescription || "Skincare product"}</p>

          <div className="product-template-price">
            <strong>{formatPrice(selectedVariant?.price ?? "0")}</strong>
            {compareAtPrice ? <span>{formatPrice(compareAtPrice)}</span> : null}
          </div>

          {product.variants?.length ? (
            <section className="product-template-options">
              <h2>Variant</h2>
              <div className="product-variant-options">
                {product.variants.map((variant) => {
                  const variantAvailable =
                    variant.isActive && variant.stockQuantity > 0;

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
                      <span>{variant.sku}</span>
                      <strong>{formatPrice(variant.price)}</strong>
                      <small>
                        {variantAvailable
                          ? `${variant.stockQuantity} in stock`
                          : "Out of stock"}
                      </small>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <ChipList items={metadataHighlights} />

          {variantAttributes.length ? (
            <div className="product-selected-values">
              {variantAttributes.map((value) => (
                <div key={value.id}>
                  <span>{value.attribute.name}</span>
                  <strong>{getAttributeValue(value)}</strong>
                </div>
              ))}
            </div>
          ) : null}

          <div className="product-purchase-row">
            <div className="quantity-controls product-quantity-controls">
              <button
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
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

            {accessToken ? (
              <button
                className="primary-button"
                disabled={
                  !selectedVariant ||
                  !isAvailable ||
                  addingVariantId === selectedVariant.id
                }
                type="button"
                onClick={() => void addSelectedVariantToCart()}
              >
                {addingVariantId === selectedVariant?.id
                  ? "Adding..."
                  : "Add to Cart"}
              </button>
            ) : (
              <Link className="primary-link-button" href="/login">
                Login to Add
              </Link>
            )}
          </div>

          {success ? <p className="form-success">{success}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </aside>
      </section>

      <section className="product-about-block">
        <h2>
          <span>All about the</span>
          <em>Product</em>
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
                <div className="product-about-copy">
                  <p>{product.description || product.shortDescription}</p>
                  {variantAttributes.length ? (
                    <p>
                      {variantAttributes
                        .map(
                          (value) =>
                            `${value.attribute.name}: ${getAttributeValue(value)}`,
                        )
                        .join(". ")}
                    </p>
                  ) : null}
                </div>
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
                <div className="detail-chip-list">
                  {(product.categories ?? []).map((item) => (
                    <article className="detail-chip" key={item.category.id}>
                      <h3>{item.category.name}</h3>
                      {item.category.description ? (
                        <p>{item.category.description}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "How to Use" ? (
            <div className="product-detail-copy">
              {product.usageInstructions ? (
                <p>{product.usageInstructions}</p>
              ) : (
                <p>Usage instructions are not available for this product yet.</p>
              )}
              {product.warnings ? (
                <p>
                  <strong>Warnings:</strong> {product.warnings}
                </p>
              ) : null}
            </div>
          ) : null}

          {activeTab === "Ingredients" ? (
            product.ingredients?.length ? (
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
                  </article>
                ))}
              </div>
            ) : (
              <p>No ingredients are available for this product yet.</p>
            )
          ) : null}

          {activeTab === "Attributes" ? (
            combinedAttributes.length ? (
              <AttributeRows items={combinedAttributes} />
            ) : (
              <p>No product attributes are available yet.</p>
            )
          ) : null}
        </div>
      </section>

      <section className="product-reviews-section">
        <div className="product-reviews-heading">
          <div>
            <p className="eyebrow">Reviews</p>
            <h2>Customer Reviews</h2>
          </div>
          <RatingStars count={reviewCount} rating={averageRating} />
        </div>

        <div className="product-review-layout">
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

          <div className="product-review-list">
            {reviews.length ? (
              reviews.map((review) => (
                <article className="product-review-card" key={review.id}>
                  <div>
                    <strong>{getReviewUserName(review)}</strong>
                    <RatingStars rating={review.rating} showCount={false} />
                  </div>
                  {review.title ? <h3>{review.title}</h3> : null}
                  <p>{review.body}</p>
                </article>
              ))
            ) : (
              <div className="empty-surface">
                <h2>No reviews yet</h2>
                <p>Be the first to share your experience with this product.</p>
              </div>
            )}
          </div>
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
                    formatPrice={formatPrice}
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
