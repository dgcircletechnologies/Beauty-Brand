"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { OfferBadge } from "@/components/customer/offer-badge";
import { OfferPrice } from "@/components/customer/offer-price";
import * as customerApi from "@/lib/api/customer";

function ButtonArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

function getCategoryImage(category: customerApi.CustomerCategory) {
  return category.images?.[0] ?? null;
}

function getRootCategories(categories: customerApi.CustomerCategory[]) {
  return categories.filter((category) => !category.parentId);
}

function getPrimaryPrice(product: customerApi.CustomerProduct) {
  return product.displayPrice ?? product.variants?.[0]?.price ?? "0";
}

function getDisplayPricing(product: customerApi.CustomerProduct) {
  return product.displayPricing ?? product.variants?.[0]?.pricing ?? null;
}

function CategoryCard({
  category,
  size = "standard",
}: {
  category: customerApi.CustomerCategory;
  size?: "standard" | "large";
}) {
  const image = getCategoryImage(category);
  const categoryOffer = category.offer;

  return (
    <Link
      className={`category-browse-card category-browse-card-${size}`}
      href={`/categories/${category.slug}`}
    >
      <span className="category-browse-media">
        {image ? (
          <img alt={image.altText ?? category.name} src={image.url} />
        ) : (
          <span>{category.name.slice(0, 1)}</span>
        )}
        {categoryOffer?.hasOffer ? (
          <OfferBadge
            className="product-card-offer-badge"
            offer={categoryOffer.offer}
            buyXGetY={categoryOffer.buyXGetY}
          />
        ) : null}
      </span>
      <div>
        <strong>{category.name}</strong>
        {category.description ? (
          <p className="category-description text-[18px]! ">
            {category.description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function ProductCard({ product }: { product: customerApi.CustomerProduct }) {
  const image = product.images?.[0] ?? null;
  const displayPricing = getDisplayPricing(product);
  const offer = product.effectiveOffer ?? displayPricing?.offer ?? null;

  return (
    <Link className="category-product-card" href={`/products/${product.slug}`}>
      <span className="category-product-media">
        {image ? (
          <img alt={image.altText ?? product.name} src={image.url} />
        ) : (
          <span>{product.name.slice(0, 1)}</span>
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
      </span>
      <div>
        <small>{product.isFeatured ? "Featured" : "Product"}</small>
        <strong>{product.name}</strong>
        <p>{product.shortDescription || "Skincare product"}</p>
        <em>
          <OfferPrice price={getPrimaryPrice(product)} pricing={displayPricing} />
        </em>
      </div>
    </Link>
  );
}

export function HomeCategorySection() {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [categories, setCategories] = useState<customerApi.CustomerCategory[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const nextCategories = await customerApi.getCustomerCategories();

        if (isMounted) {
          setCategories(nextCategories);
          setLoadError(null);
        }
      } catch (caughtError) {
        if (isMounted) {
          setLoadError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load categories",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const rootCategories = useMemo(() => getRootCategories(categories), [categories]);

  function scrollCategories(direction: "previous" | "next") {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    const card = carousel.querySelector<HTMLElement>(".category-browse-card");
    const distance = card ? card.offsetWidth + 20 : carousel.clientWidth * 0.8;

    carousel.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  }

  return (
    <section className="home-category-section" aria-labelledby="home-categories">
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">Collections</p>
          <h2 id="home-categories">Find your skincare ritual.</h2>
        </div>
        <div className="home-category-actions">
          <Link className="home-browse-button" href="/categories">
            Browse all
            <span aria-hidden="true">
              <ButtonArrowIcon />
            </span>
          </Link>
          <div className="home-carousel-buttons relative left-[2vw]" aria-label="Category carousel">
            <button
              aria-label="Previous categories"
              type="button"
              onClick={() => scrollCategories("previous")}
            >
              &lsaquo;
            </button>
            <button
              aria-label="Next categories"
              type="button"
              onClick={() => scrollCategories("next")}
            >
              &rsaquo;
            </button>
          </div>
        </div>
      </div>

      {loadError ? <p className="form-error">{loadError}</p> : null}

      {isLoading ? (
        <div className="category-loading">Loading categories...</div>
      ) : rootCategories.length ? (
        <div className="home-category-grid" ref={carouselRef}>
          {rootCategories.map((category) => (
            <CategoryCard category={category} key={category.id} size="large" />
          ))}
        </div>
      ) : (
        <div className="empty-surface">
          <h2>No categories yet</h2>
          <p>Root categories will show here when they are added.</p>
        </div>
      )}
    </section>
  );
}

export function CategoryIndex() {
  const [categories, setCategories] = useState<customerApi.CustomerCategory[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const nextCategories = await customerApi.getCustomerCategories();

        if (isMounted) {
          setCategories(nextCategories);
          setLoadError(null);
        }
      } catch (caughtError) {
        if (isMounted) {
          setLoadError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load categories",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const rootCategories = useMemo(() => getRootCategories(categories), [categories]);

  return (
    <main className="category-browser-page">
      <section className="category-browser-hero">
        <p className="eyebrow">Explore</p>
        <h1>Shop by category</h1>
        <p>Start with a root category, then keep narrowing until products appear.</p>
      </section>

      {loadError ? <p className="form-error">{loadError}</p> : null}

      {isLoading ? (
        <div className="category-loading">Loading categories...</div>
      ) : rootCategories.length ? (
        <section className="category-browse-grid">
          {rootCategories.map((category) => (
            <CategoryCard category={category} key={category.id} />
          ))}
        </section>
      ) : (
        <section className="empty-surface">
          <h2>No categories yet</h2>
          <p>Active root categories will show here when they are added.</p>
        </section>
      )}
    </main>
  );
}

export function CategoryDrilldown({ slug }: { slug: string }) {
  const [category, setCategory] =
    useState<customerApi.CustomerCategoryDetail | null>(null);
  const [allCategories, setAllCategories] = useState<
    customerApi.CustomerCategory[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCategory() {
      setIsLoading(true);

      try {
        const [nextCategory, nextCategories] = await Promise.all([
          customerApi.getCustomerCategory(slug),
          customerApi.getCustomerCategories(),
        ]);

        if (isMounted) {
          setCategory(nextCategory);
          setAllCategories(nextCategories);
          setLoadError(null);
        }
      } catch (caughtError) {
        if (isMounted) {
          setLoadError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load category",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCategory();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const childCategories = useMemo(() => {
    if (!category) {
      return [];
    }

    return allCategories.filter((item) => item.parentId === category.id);
  }, [allCategories, category]);

  const products = category?.products ?? [];

  return (
    <main className="category-browser-page">
      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading category...</h2>
        </section>
      ) : loadError ? (
        <section className="empty-surface">
          <h2>{loadError}</h2>
          <Link className="secondary-link-button" href="/categories">
            Back to categories
          </Link>
        </section>
      ) : category ? (
        <>
          <section className="category-browser-hero">
            <Link className="category-breadcrumb text-4xl!" href="/categories">
              Categories
            </Link>
            <p className="eyebrow">
              {childCategories.length ? "Choose a collection" : "Products"}
            </p>
            <h1>{category.name}</h1>
            {category.description ? <p>{category.description}</p> : null}
          </section>

          {childCategories.length ? (
            <section className="category-browse-grid">
              {childCategories.map((childCategory) => (
                <CategoryCard category={childCategory} key={childCategory.id} />
              ))}
            </section>
          ) : products.length ? (
            <section className="category-product-grid">
              {products.map((product) => (
                <ProductCard product={product} key={product.id} />
              ))}
            </section>
          ) : (
            <section className="empty-surface">
              <h2>No products yet</h2>
              <p>Products assigned to this category will show here.</p>
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}
