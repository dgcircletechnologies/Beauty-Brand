"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as customerApi from "@/lib/api/customer";

export function ProductDashboard() {
  const { isAuthenticated, user } = useAuth();
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

  const featuredCount = useMemo(
    () => products.filter((product) => product.isFeatured).length,
    [products],
  );

  return (
    <main className="customer-page">
      <section className="customer-hero">
        <div>
          <p className="eyebrow">Customer Dashboard</p>
          <h1>Shop skincare products</h1>
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
            <Link
              className="product-card product-card-link"
              href={`/products/${product.slug}`}
              key={product.id}
            >
              {product.images?.[0] ? (
                <img
                  alt={product.images[0].altText ?? product.name}
                  className="product-card-image"
                  src={product.images[0].url}
                />
              ) : null}
              <div>
                <p className="eyebrow">
                  {product.isFeatured ? "Featured" : "Product"}
                </p>
                <h2>{product.name}</h2>
                <p>{product.shortDescription || "Skincare product"}</p>
              </div>
              <span className="primary-link-button">View Variants</span>
            </Link>
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
