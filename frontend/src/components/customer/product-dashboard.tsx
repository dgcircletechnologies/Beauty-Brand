"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as customerApi from "@/lib/api/customer";

function ProductImageSlider({
  images,
  productName,
}: {
  images: customerApi.CustomerProductImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];

  if (!activeImage) {
    return null;
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

  return (
    <div className="product-card-slider">
      <img
        alt={activeImage.altText ?? productName}
        className="product-card-image"
        src={activeImage.url}
      />
      {images.length > 1 ? (
        <>
          <button
            aria-label="Previous product image"
            className="slider-button slider-button-left"
            type="button"
            onClick={showPrevious}
          >
            &lsaquo;
          </button>
          <button
            aria-label="Next product image"
            className="slider-button slider-button-right"
            type="button"
            onClick={showNext}
          >
            &rsaquo;
          </button>
          <div className="slider-dots" aria-hidden="true">
            {images.map((image, index) => (
              <span
                className={index === activeIndex ? "active" : undefined}
                key={image.id}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ProductDashboard() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState<customerApi.CustomerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      if (isMounted) {
        setIsLoading(true);
      }

      try {
        const nextProducts = categorySlug
          ? await customerApi.getCustomerCategoryProducts(categorySlug)
          : await customerApi.getCustomerProducts();

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
  }, [categorySlug]);

  const featuredCount = useMemo(
    () => products.filter((product) => product.isFeatured).length,
    [products],
  );

  return (
    <main className="customer-page">
      <section className="customer-hero">
        <div>
          <p className="eyebrow">Customer Dashboard</p>
          <h1>{categorySlug ? "Shop selected category" : "Shop skincare products"}</h1>
          <p>
            {isAuthenticated
              ? `Welcome${user?.firstName ? `, ${user.firstName}` : ""}. Add a product to test your cart.`
              : "Browse products now. Login or register when you are ready to test cart actions."}
          </p>
        </div>
        <div className="dashboard-metrics">
          <span>
            <strong>{products.length}</strong>
            Products
          </span>
          <span>
            <strong>{featuredCount}</strong>
            Featured
          </span>
        </div>
      </section>

      {isAuthenticated ? (
        <section className="quick-links" aria-label="Customer shortcuts">
          <Link href="/cart">Cart</Link>
          <Link href="/orders">Orders</Link>
          <Link href="/wishlist">Wishlist</Link>
        </section>
      ) : null}

      {loadError ? <p className="form-error">{loadError}</p> : null}

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading products...</h2>
        </section>
      ) : products.length ? (
        <section className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              {product.images?.length ? (
                <ProductImageSlider
                  images={product.images}
                  productName={product.name}
                />
              ) : null}
              <div>
                <p className="eyebrow">
                  {product.isFeatured ? "Featured" : "Product"}
                </p>
                <h2>{product.name}</h2>
                <p>{product.shortDescription || "Skincare product"}</p>
              </div>
              <Link
                className="primary-link-button"
                href={`/products/${product.slug}`}
              >
                View Variants
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-surface">
          <h2>No products yet</h2>
          <p>Published products will show here when they are added.</p>
        </section>
      )}
    </main>
  );
}
