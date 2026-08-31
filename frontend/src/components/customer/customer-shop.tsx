"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from "react";

import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

const filterSections = [
  { id: "category", title: "Category", source: "categories" },
  { id: "skinType", title: "Skin Type", source: "skinTypes" },
  { id: "concern", title: "Concern", source: "concerns" },
  { id: "benefit", title: "Benefit", source: "benefits" },
  { id: "ageGroup", title: "Age Group", source: "ageGroups" },
  { id: "formula", title: "Formula", source: "formula" },
] as const;

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Best Rating" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

const emptyFilters: customerApi.CustomerShopFilters = {
  categories: [],
  skinTypes: [],
  concerns: [],
  benefits: [],
  ageGroups: [],
  formula: [],
  priceRanges: [],
};

function readList(searchParams: URLSearchParams, key: string) {
  return (searchParams.get(key) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ProductImageSlider({
  images,
  rating,
  reviewCount,
  productName,
}: {
  images: customerApi.CustomerProductImage[];
  rating: number;
  reviewCount: number;
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const didSwipeRef = useRef(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [images.length]);

  useEffect(() => {
    if (!isHovering || images.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [images.length, isHovering]);

  if (!images.length) {
    return (
      <div className="shop-product-image-placeholder">
        <RatingStars count={reviewCount} rating={rating} />
      </div>
    );
  }

  function showPrevious() {
    setActiveIndex((current) =>
      current === 0 ? images.length - 1 : current - 1,
    );
  }

  function showNext() {
    setActiveIndex((current) =>
      current === images.length - 1 ? 0 : current + 1,
    );
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;

    touchStartXRef.current = null;

    if (startX === null || endX === null || images.length <= 1) {
      return;
    }

    const distance = endX - startX;

    if (Math.abs(distance) < 34) {
      return;
    }

    didSwipeRef.current = true;
    window.setTimeout(() => {
      didSwipeRef.current = false;
    }, 500);

    if (distance > 0) {
      showPrevious();
    } else {
      showNext();
    }
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!didSwipeRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    didSwipeRef.current = false;
  }

  return (
    <div
      className="shop-product-image"
      onClickCapture={handleClickCapture}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="shop-product-image-track"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {images.map((image) => (
          <img
            alt={image.altText ?? productName}
            key={image.id}
            src={image.url}
          />
        ))}
      </div>
      <RatingStars count={reviewCount} rating={rating} />
    </div>
  );
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

function ShopProductCard({
  formatPrice,
  product,
}: {
  formatPrice: (amount: string | number) => string;
  product: customerApi.CustomerProduct;
}) {
  const averageRating = useMemo(() => getDisplayRating(product), [product]);
  const reviewCount = product.reviewCount ?? product.reviews?.length ?? 0;

  return (
    <article className="shop-product-card">
      <Link href={`/products/${product.slug}`}>
        <ProductImageSlider
          images={product.images ?? []}
          productName={product.name}
          rating={averageRating}
          reviewCount={reviewCount}
        />
      </Link>
      <div>
        <p>{product.categories?.[0]?.category.name ?? "Skincare"}</p>
        <h2>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h2>
        <span>{formatPrice(getPrimaryPrice(product))}</span>
      </div>
    </article>
  );
}

export function CustomerShop() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formatPrice } = useCurrency();
  const [response, setResponse] =
    useState<customerApi.CustomerShopProductsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [openFilterSections, setOpenFilterSections] = useState(
    () => new Set<string>(),
  );

  const selected = useMemo(
    () => ({
      q: searchParams.get("q") ?? "",
      category: readList(searchParams, "category"),
      skinType: readList(searchParams, "skinType"),
      concern: readList(searchParams, "concern"),
      benefit: readList(searchParams, "benefit"),
      ageGroup: readList(searchParams, "ageGroup"),
      formula: readList(searchParams, "formula"),
      minPrice: searchParams.get("minPrice") ?? "",
      maxPrice: searchParams.get("maxPrice") ?? "",
      sort: searchParams.get("sort") ?? "featured",
      page: searchParams.get("page") ?? "1",
      pageSize: "12",
    }),
    [searchParams],
  );

  const queryKey = useMemo(
    () =>
      [
        selected.q,
        selected.category.join(","),
        selected.skinType.join(","),
        selected.concern.join(","),
        selected.benefit.join(","),
        selected.ageGroup.join(","),
        selected.formula.join(","),
        selected.minPrice,
        selected.maxPrice,
        selected.sort,
        selected.page,
      ].join("|"),
    [selected],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoading(true);

      try {
        const nextResponse = await customerApi.getCustomerShopProducts(selected);

        if (isMounted) {
          setResponse(nextResponse);
          setLoadError(null);
        }
      } catch (caughtError) {
        if (isMounted) {
          setLoadError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load shop products",
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
  }, [queryKey]);

  const filters = response?.filters ?? emptyFilters;
  const pagination = response?.pagination;
  const products = response?.items ?? [];

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      }

      const query = nextParams.toString();

      router.push(`${pathname}${query ? `?${query}` : ""}`);
    },
    [pathname, router, searchParams],
  );

  const toggleListFilter = useCallback(
    (key: keyof typeof selected, value: string) => {
      const current = selected[key];

      if (!Array.isArray(current)) {
        return;
      }

      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      updateSearchParams({
        [key]: next.length ? next.join(",") : null,
        page: null,
      });
    },
    [selected, updateSearchParams],
  );

  const activeFilterCount =
    selected.category.length +
    selected.skinType.length +
    selected.concern.length +
    selected.benefit.length +
    selected.ageGroup.length +
    selected.formula.length +
    Number(Boolean(selected.minPrice || selected.maxPrice));

  function clearFilters() {
    updateSearchParams({
      category: null,
      skinType: null,
      concern: null,
      benefit: null,
      ageGroup: null,
      formula: null,
      minPrice: null,
      maxPrice: null,
      page: null,
    });
  }

  function setPriceRange(range: customerApi.CustomerShopPriceRange | null) {
    updateSearchParams({
      minPrice: range?.minPrice === null ? null : String(range?.minPrice),
      maxPrice: range?.maxPrice === null ? null : String(range?.maxPrice),
      page: null,
    });
  }

  function setPage(page: number) {
    updateSearchParams({ page: page > 1 ? String(page) : null });
  }

  function toggleFilterSection(sectionId: string) {
    setOpenFilterSections((current) => {
      const next = new Set(current);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  }

  const filterMarkup = (
    <form className="shop-filters">
      <div className="shop-filter-heading">
        <h2>Filters</h2>
        {activeFilterCount ? (
          <button type="button" onClick={clearFilters}>
            Clear
          </button>
        ) : null}
      </div>

      {filterSections.map((section) => {
        const options = filters[section.source];
        const values = selected[section.id];

        return (
          <section className="shop-filter-section" key={section.id}>
            <button
              className="shop-filter-toggle"
              type="button"
              aria-expanded={openFilterSections.has(section.id)}
              onClick={() => toggleFilterSection(section.id)}
            >
              <span>
                {section.title}
                {Array.isArray(values) && values.length ? (
                  <small>({values.length})</small>
                ) : null}
              </span>
              <ChevronIcon />
            </button>

            {openFilterSections.has(section.id) ? (
              <div className="shop-filter-options">
                {options.map((option) => (
                  <label key={option.slug}>
                    <input
                      type="checkbox"
                      checked={
                        Array.isArray(values) && values.includes(option.slug)
                      }
                      onChange={() => toggleListFilter(section.id, option.slug)}
                    />
                    <span>{option.name}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}

      <section className="shop-filter-section">
        <button
          className="shop-filter-toggle"
          type="button"
          aria-expanded={openFilterSections.has("price")}
          onClick={() => toggleFilterSection("price")}
        >
          <span>
            Price
            {selected.minPrice || selected.maxPrice ? <small>(1)</small> : null}
          </span>
          <ChevronIcon />
        </button>

        {openFilterSections.has("price") ? (
          <div className="shop-filter-options">
            {filters.priceRanges.map((range) => {
              const isSelected =
                selected.minPrice ===
                  (range.minPrice === null ? "" : String(range.minPrice)) &&
                selected.maxPrice ===
                  (range.maxPrice === null ? "" : String(range.maxPrice));

              return (
                <label key={range.name}>
                  <input
                    type="radio"
                    name="priceRange"
                    checked={isSelected}
                    onChange={() => setPriceRange(range)}
                  />
                  <span>{range.name}</span>
                </label>
              );
            })}
            <label>
              <input
                type="radio"
                name="priceRange"
                checked={!selected.minPrice && !selected.maxPrice}
                onChange={() => setPriceRange(null)}
              />
              <span>All prices</span>
            </label>
          </div>
        ) : null}
      </section>
    </form>
  );

  return (
    <main className="shop-page">
      <div className="shop-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>Shop</span>
      </div>

      <section className="shop-hero">
        <span className="shop-star" aria-hidden="true">
          *
        </span>
        <h1>
          <span>Shop</span>
          <br />
          <em>Skincare</em>
        </h1>
        <p>
          {selected.q
            ? `Search results for "${selected.q}"`
            : "Explore cleansers, serums, moisturizers, SPF, and body care matched to your skin needs."}
        </p>
      </section>

      <section className="shop-toolbar">
        <div className="shop-result-count">
          <span>{pagination?.totalItems ?? 0} products</span>
        </div>
        <div className="shop-toolbar-actions">
          <label>
            Sort by
            <select
              value={selected.sort}
              onChange={(event) =>
                updateSearchParams({ sort: event.target.value, page: null })
              }
            >
              {sortOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="shop-mobile-filter-button"
            type="button"
            onClick={() => setIsMobileFiltersOpen((current) => !current)}
          >
            Filters
            {activeFilterCount ? <span>({activeFilterCount})</span> : null}
          </button>
        </div>
      </section>

      {isMobileFiltersOpen ? (
        <div className="shop-mobile-filters">{filterMarkup}</div>
      ) : null}

      <div className="shop-divider" />

      <section className="shop-layout">
        <aside className="shop-desktop-filters">{filterMarkup}</aside>
        <div className="shop-results">
          {loadError ? <p className="form-error">{loadError}</p> : null}

          {isLoading ? (
            <section className="empty-surface">
              <h2>Loading products...</h2>
            </section>
          ) : products.length ? (
            <>
              <div className="shop-product-grid">
                {products.map((product) => (
                  <ShopProductCard
                    formatPrice={formatPrice}
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 ? (
                <nav className="shop-pagination" aria-label="Pagination">
                  <button
                    type="button"
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => setPage(pagination.page - 1)}
                  >
                    Previous
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, index) => (
                    <button
                      type="button"
                      className={
                        pagination.page === index + 1 ? "active" : undefined
                      }
                      key={index + 1}
                      onClick={() => setPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage(pagination.page + 1)}
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </>
          ) : (
            <section className="empty-surface">
              <h2>No products found</h2>
              <p>Try removing a filter or searching for another skincare need.</p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
