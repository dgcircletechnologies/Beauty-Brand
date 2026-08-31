"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { HomeCategorySection } from "@/components/customer/category-browser";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

const hero = {
  eyebrow: "BlueWave Skincare",
  title: "True to Oneself kind to Nature.",
  description:
    "Unreservedly honest products that truly work, and are kind to skin and the planet. Simple routines, thoughtful formulas, visible care.",
  image: "/images/skincare/hero.png",
};

const fallbackProductImages = [
  "/images/skincare/face-1.webp",
  "/images/skincare/face-2.webp",
  "/images/skincare/face-3.webp",
  "/images/skincare/face-4.webp",
];

const tagBadgeThemes = [
  "coral",
  "sage",
  "ink",
  "rose",
  "gold",
] as const;

function ButtonArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
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

function getTagBadgeTheme(slug: string) {
  const hash = slug
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return tagBadgeThemes[hash % tagBadgeThemes.length];
}

function RatingStars({ rating, count }: { rating: number; count: number }) {
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
      <span className="rating-count">
        {count ? `${rating.toFixed(1)} (${count})` : "No reviews"}
      </span>
    </span>
  );
}

function HomeProductCard({
  fallbackImage,
  product,
}: {
  fallbackImage: string;
  product: customerApi.CustomerProduct;
}) {
  const { formatPrice } = useCurrency();
  const image = product.images?.[0]?.url ?? fallbackImage;
  const productTag = product.tags?.[0]?.tag ?? null;
  const averageRating = useMemo(() => getDisplayRating(product), [product]);
  const reviewCount = product.reviewCount ?? product.reviews?.length ?? 0;

  return (
    <Link className="home-product-card" href={`/products/${product.slug}`}>
      <span className="home-product-media">
        {productTag ? (
          <span
            className={`home-product-tag-badge ${getTagBadgeTheme(
              productTag.slug,
            )}`}
          >
            {productTag.name}
          </span>
        ) : null}
        <img alt={product.images?.[0]?.altText ?? product.name} src={image} />
        <RatingStars count={reviewCount} rating={averageRating} />
      </span>
      <span className="home-product-info">
        <small>{product.isFeatured ? "Featured" : "Skincare"}</small>
        <strong>{product.name}</strong>
        <em>{formatPrice(getPrimaryPrice(product))}</em>
      </span>
    </Link>
  );
}

function HomeFeatureSection() {
  return (
    <section className="home-feature-section">
      <div className="home-feature-main">
        <div className="home-feature-heading">
          <p className="eyebrow">Clean care</p>
          <h2>
            Clean, Beyond Reproach <span data-slot="italic">Skincare.</span>
          </h2>
        </div>
        <div className="home-feature-bottom">
          <div className="home-feature-small">
            <img
              alt="BlueWave skincare texture detail"
              src="/images/skincare/feature-1.webp"
            />
          </div>
          <div className="home-feature-copy">
            <p>
              Formulas built around effective ingredients, gentle textures, and
              routines that feel easy to keep. No overpromising, just everyday
              care that earns its shelf space.
            </p>
            <Link className="secondary-link-button" href="/shop">
              Explore products
            </Link>
          </div>
        </div>
      </div>
      <div className="home-feature-large">
        <img
          alt="BlueWave skincare campaign visual"
          src="/images/skincare/feature-6.webp"
        />
      </div>
    </section>
  );
}

function HomeProductsSection() {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<customerApi.CustomerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const nextProducts = await customerApi.getCustomerProducts();

        if (isMounted) {
          setProducts(nextProducts);
          setLoadError(null);
        }
      } catch (caughtError) {
        if (isMounted) {
          setLoadError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load products",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleProducts = useMemo(
    () =>
      [...products]
        .sort(
          (first, second) =>
            Number(second.isFeatured) - Number(first.isFeatured),
        )
        .slice(0, 10),
    [products],
  );

  function scrollProducts(direction: "previous" | "next") {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    const card = carousel.querySelector<HTMLElement>(".home-product-card");
    const distance = card ? card.offsetWidth + 20 : carousel.clientWidth * 0.8;

    carousel.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  }

  return (
    <section className="home-products-section" aria-labelledby="home-products">
      <div className="home-section-heading">
        <Link className="home-browse-button" href="/shop">
          Shop all
          <span aria-hidden="true">
            <ButtonArrowIcon />
          </span>
        </Link>
        <div>
          <p className="eyebrow">Products</p>
          <h2 id="home-products">Explore skincare essentials.</h2>
        </div>
        <div className="home-carousel-buttons" aria-label="Product carousel">
          <button
            aria-label="Previous products"
            type="button"
            onClick={() => scrollProducts("previous")}
          >
            &lsaquo;
          </button>
          <button
            aria-label="Next products"
            type="button"
            onClick={() => scrollProducts("next")}
          >
            &rsaquo;
          </button>
        </div>
      </div>

      {loadError ? <p className="form-error">{loadError}</p> : null}

      {isLoading ? (
        <div className="category-loading">Loading products...</div>
      ) : visibleProducts.length ? (
        <div className="home-products-track" ref={carouselRef}>
          {visibleProducts.map((product, index) => (
            <HomeProductCard
              fallbackImage={
                fallbackProductImages[index % fallbackProductImages.length]
              }
              key={product.id}
              product={product}
            />
          ))}
        </div>
      ) : (
        <div className="empty-surface">
          <h2>No products yet</h2>
          <p>Published products will show here when they are added.</p>
        </div>
      )}
    </section>
  );
}

export function HomeExperience() {
  return (
    <main className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1 id="home-hero-title">{hero.title}</h1>
          <p>{hero.description}</p>
          <Link className="home-hero-button" href="/shop">
            Explore products
            <span aria-hidden="true">
              <ButtonArrowIcon />
            </span>
          </Link>
        </div>
        <div className="home-hero-media">
          <img alt="BlueWave skincare product arrangement" src={hero.image} />
        </div>
      </section>
      <HomeCategorySection />
      <HomeFeatureSection />
      <HomeProductsSection />
    </main>
  );
}
