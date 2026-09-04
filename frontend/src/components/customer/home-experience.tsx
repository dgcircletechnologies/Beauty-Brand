"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { HomeCategorySection } from "@/components/customer/category-browser";
import { OfferBadge } from "@/components/customer/offer-badge";
import { OfferPrice } from "@/components/customer/offer-price";
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
  return product.displayPrice ?? product.variants?.[0]?.price ?? "0";
}

function getDisplayPricing(product: customerApi.CustomerProduct) {
  return product.displayPricing ?? product.variants?.[0]?.pricing ?? null;
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

function getReviewCount(product: customerApi.CustomerProduct) {
  return product.reviewCount ?? product.reviews?.length ?? 0;
}

function getTagBadgeTheme(slug: string) {
  const hash = slug
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return tagBadgeThemes[hash % tagBadgeThemes.length];
}

function NumericRating({ rating }: { rating: number }) {
  return (
    <span
      className="home-product-rating"
      aria-label={`${rating.toFixed(1)} out of 5 rating`}
    >
      <span aria-hidden="true">★</span>
      {rating.toFixed(1)}
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
  const images = product.images?.length
    ? product.images
    : [
        {
          altText: product.name,
          url: fallbackImage,
        } as customerApi.CustomerProductImage,
      ];
  const productTags = product.tags?.map((tagLink) => tagLink.tag) ?? [];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const averageRating = useMemo(() => getDisplayRating(product), [product]);
  const reviewCount = getReviewCount(product);
  const shouldShowRating = reviewCount > 0 && averageRating > 0;
  const displayPricing = getDisplayPricing(product);
  const offer = product.effectiveOffer ?? displayPricing?.offer ?? null;
  const activeImage =
    images[Math.min(activeImageIndex, images.length - 1)] ?? images[0];
  const activeTag =
    productTags[Math.min(activeTagIndex, productTags.length - 1)] ?? null;

  useEffect(() => {
    if (!isHovering || (images.length <= 1 && productTags.length <= 1)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (images.length > 1) {
        setActiveImageIndex((current) => (current + 1) % images.length);
      }

      if (productTags.length > 1) {
        setActiveTagIndex((current) => (current + 1) % productTags.length);
      }
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [images.length, isHovering, productTags.length]);

  function stopHovering() {
    setIsHovering(false);
    setActiveImageIndex(0);
    setActiveTagIndex(0);
  }

  return (
    <Link
      className="home-product-card"
      href={`/products/${product.slug}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={stopHovering}
    >
      <span className="home-product-media">
        {activeTag ? (
          <span
            className={`home-product-tag-badge ${getTagBadgeTheme(
              activeTag.slug,
            )}`}
          >
            {activeTag.name}
          </span>
        ) : null}
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
        <img alt={activeImage.altText ?? product.name} src={activeImage.url} />
      </span>
      <span className="home-product-info">
        {/* <small>{product.isFeatured ? "Featured" : "Skincare"}</small> */}
        <span className="home-product-name-row">
          <strong>{product.name}</strong>
          {shouldShowRating ? <NumericRating rating={averageRating} /> : null}
        </span>
        <em>
          <OfferPrice
            price={getPrimaryPrice(product)}
            pricing={displayPricing}
          />
        </em>
      </span>
    </Link>
  );
}

type HomeFeatureSectionProps = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  smallImage: string;
  smallImageAlt: string;
  largeImage: string;
  largeImageAlt: string;
};

function HomeFeatureSection({
  eyebrow,
  title,
  body,
  cta,
  smallImage,
  smallImageAlt,
  largeImage,
  largeImageAlt,
}: HomeFeatureSectionProps) {
  return (
    <section className="home-feature-section">
      <div className="home-feature-main">
        <div className="home-feature-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <div className="home-feature-bottom">
          <div className="home-feature-small">
            <img alt={smallImageAlt} src={smallImage} />
          </div>
          <div className="home-feature-copy">
            <p>{body}</p>
            <Link className="secondary-link-button" href="/shop">
              {cta}
            </Link>
          </div>
        </div>
      </div>
      <div className="home-feature-large">
        <img alt={largeImageAlt} src={largeImage} />
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
        <div className="home-products-title">
          <p className="eyebrow">Products</p>
          <h2 id="home-products">Explore skincare essentials.</h2>
        </div>
        <div className="home-category-actions">
          <Link className="home-browse-button" href="/shop">
            Shop all
            <span aria-hidden="true">
              <ButtonArrowIcon />
            </span>
          </Link>
          <div className="home-carousel-buttons relative left-[1.25vw]" aria-label="Product carousel">
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

function HomeOffersSection() {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<customerApi.CustomerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadOfferProducts() {
      try {
        const nextProducts = await customerApi.getCustomerOfferProducts(10);

        if (isMounted) {
          setProducts(nextProducts);
        }
      } catch {
        if (isMounted) {
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOfferProducts();

    return () => {
      isMounted = false;
    };
  }, []);

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

  if (!isLoading && !products.length) {
    return null;
  }

  return (
    <section className="home-products-section home-offers-section" aria-labelledby="home-offers">
      <div className="home-section-heading">
        <div className="home-products-title">
          <p className="eyebrow">Offers</p>
          <h2 id="home-offers">Special offers.</h2>
        </div>
        <div className="home-category-actions">
          <Link className="home-browse-button" href="/shop?offersOnly=true">
            View all
            <span aria-hidden="true">
              <ButtonArrowIcon />
            </span>
          </Link>
          <div className="home-carousel-buttons relative left-[1.25vw]" aria-label="Offer product carousel">
            <button
              aria-label="Previous offer products"
              type="button"
              onClick={() => scrollProducts("previous")}
            >
              &lsaquo;
            </button>
            <button
              aria-label="Next offer products"
              type="button"
              onClick={() => scrollProducts("next")}
            >
              &rsaquo;
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="category-loading">Loading offers...</div>
      ) : (
        <div className="home-products-track" ref={carouselRef}>
          {products.map((product, index) => (
            <HomeProductCard
              fallbackImage={
                fallbackProductImages[index % fallbackProductImages.length]
              }
              key={product.id}
              product={product}
            />
          ))}
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
      <HomeFeatureSection
        eyebrow="Daily rituals"
        title="Care That Fits Your Routine."
        body="Discover everyday skincare essentials selected to support hydration, comfort, and a healthier-looking skin barrier."
        cta="Explore skincare"
        smallImage="/images/skincare/feature-3.webp"
        smallImageAlt="BlueWave skincare routine detail"
        largeImage="/images/skincare/feature-5.webp"
        largeImageAlt="BlueWave skincare daily care visual"
      />
      <HomeOffersSection />
      <HomeFeatureSection
        eyebrow="Clean care"
        title="Clean, Beyond Reproach Skincare."
        body="Formulas built around effective ingredients, gentle textures, and routines that feel easy to keep. No overpromising, just everyday care that earns its shelf space."
        cta="Explore products"
        smallImage="/images/skincare/feature-1.webp"
        smallImageAlt="BlueWave skincare texture detail"
        largeImage="/images/skincare/feature-6.webp"
        largeImageAlt="BlueWave skincare campaign visual"
      />
      <HomeProductsSection />
    </main>
  );
}
