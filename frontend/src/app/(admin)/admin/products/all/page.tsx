"use client";

import { useEffect, useMemo, useState } from "react";

import { ProductVariantForm } from "@/components/admin/product-variant-form";
import { useAuth } from "@/contexts/auth-context";
import {
  AdminCategory,
  AdminProduct,
  AdminProductDetail,
  CreateAdminProductVariantPayload,
  createAdminProductVariant,
  getAdminCategories,
  getAdminProduct,
  getAdminProducts,
} from "@/lib/api/admin";

export default function AllProductsPage() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedProduct, setSelectedProduct] =
    useState<AdminProductDetail | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [variantFormError, setVariantFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isVariantFormOpen, setIsVariantFormOpen] = useState(false);
  const [isVariantSubmitting, setIsVariantSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadProducts() {
      setError(null);
      setIsLoading(true);

      try {
        const [nextCategories, nextProducts] = await Promise.all([
          getAdminCategories(token),
          getAdminProducts(token),
        ]);

        if (!isMounted) {
          return;
        }

        setCategories(nextCategories);
        setProducts(nextProducts);
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load products",
        );
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
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !selectedProductId) {
      return;
    }

    let isMounted = true;
    const token = accessToken;
    const productId = selectedProductId;

    async function loadProductDetail() {
      setDetailError(null);
      setIsDetailLoading(true);

      try {
        const product = await getAdminProduct(token, productId);

        if (isMounted) {
          setSelectedProduct(product);
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setSelectedProduct(null);
        setDetailError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load product variants",
        );
      } finally {
        if (isMounted) {
          setIsDetailLoading(false);
        }
      }
    }

    void loadProductDetail();

    return () => {
      isMounted = false;
    };
  }, [accessToken, selectedProductId]);

  async function handleCreateVariant(payload: CreateAdminProductVariantPayload) {
    if (!accessToken || !selectedProductId) {
      return;
    }

    setVariantFormError(null);
    setIsVariantSubmitting(true);

    try {
      await createAdminProductVariant(accessToken, selectedProductId, payload);
      const product = await getAdminProduct(accessToken, selectedProductId);
      setSelectedProduct(product);
      setIsVariantFormOpen(false);
    } catch (caughtError) {
      setVariantFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create variant",
      );
    } finally {
      setIsVariantSubmitting(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        product.categories.some(
          (categoryLink) => categoryLink.categoryId === categoryFilter,
        );

      const matchesFeatured =
        featuredFilter === "all" ||
        (featuredFilter === "featured" && product.isFeatured) ||
        (featuredFilter === "standard" && !product.isFeatured);

      return (
        matchesSearch && matchesStatus && matchesCategory && matchesFeatured
      );
    });
  }, [categoryFilter, featuredFilter, products, searchTerm, statusFilter]);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>All Products</h1>
          <p>Search, filter, and select a product to view its variants.</p>
        </div>
      </section>

      <section className="admin-toolbar">
        <div className="all-products-filters">
          <input
            aria-label="Search products"
            placeholder="Search by name or slug"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by featured"
            value={featuredFilter}
            onChange={(event) => setFeaturedFilter(event.target.value)}
          >
            <option value="all">Featured and standard</option>
            <option value="featured">Featured only</option>
            <option value="standard">Standard only</option>
          </select>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="all-products-layout">
        <div className="catalog-section">
          <div className="section-title">
            <h2>Products</h2>
            <span>{filteredProducts.length}</span>
          </div>
          {isLoading ? (
            <p className="muted-text">Loading products...</p>
          ) : (
            <div className="admin-product-table">
              {filteredProducts.map((product) => (
                <button
                  className={
                    selectedProductId === product.id
                      ? "admin-product-row active"
                      : "admin-product-row"
                  }
                  key={product.id}
                  type="button"
                  onClick={() => {
                    setSelectedProductId(product.id);
                    setIsVariantFormOpen(false);
                    setVariantFormError(null);
                  }}
                >
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.slug}</small>
                  </span>
                  <span>{product.status}</span>
                  <span>
                    {product.categories
                      .map((categoryLink) => categoryLink.category.name)
                      .join(", ") || "Uncategorized"}
                  </span>
                  <span>{product.isFeatured ? "Featured" : "Standard"}</span>
                </button>
              ))}
              {!isLoading && filteredProducts.length === 0 ? (
                <p className="muted-text">No products match these filters.</p>
              ) : null}
            </div>
          )}
        </div>

        <aside className="catalog-section product-detail-panel">
          <div className="section-title">
            <h2>Variants</h2>
            <span>{selectedProduct?.variants.length ?? 0}</span>
          </div>
          {!selectedProductId ? (
            <p className="muted-text">Select a product to view variants.</p>
          ) : null}
          {isDetailLoading ? (
            <p className="muted-text">Loading variants...</p>
          ) : null}
          {detailError ? <p className="form-error">{detailError}</p> : null}
          {selectedProduct && !isDetailLoading ? (
            <div className="variant-panel-content">
              <div>
                <h3>{selectedProduct.name}</h3>
                <p>{selectedProduct.shortDescription ?? selectedProduct.slug}</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsVariantFormOpen((current) => !current)}
              >
                {isVariantFormOpen ? "Close Variant Form" : "Add Variant"}
              </button>
              {isVariantFormOpen ? (
                <div className="variant-form-panel">
                  <ProductVariantForm
                    isSubmitting={isVariantSubmitting}
                    submitLabel="Create Variant"
                    onCancel={() => setIsVariantFormOpen(false)}
                    onSubmit={handleCreateVariant}
                  />
                  {variantFormError ? (
                    <p className="form-error">{variantFormError}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="variant-list">
                {selectedProduct.variants.length > 0 ? (
                  selectedProduct.variants.map((variant) => (
                    <article className="variant-row" key={variant.id}>
                      <div>
                        <strong>{variant.sku}</strong>
                        <small>{variant.isActive ? "Active" : "Inactive"}</small>
                      </div>
                      <div>
                        <span>{formatMoney(variant.price)}</span>
                        <small>Stock {variant.stockQuantity}</small>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="muted-text">No variants created yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function formatMoney(value: string) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return value;
  }

  return amount.toFixed(2);
}
