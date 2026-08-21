"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AdminCategory,
  AdminProduct,
  getAdminCategories,
  getAdminProducts,
} from "@/lib/api/admin";
import { useAuth } from "@/contexts/auth-context";

type ViewMode = "all" | "categories" | "products";

export default function AdminProductsPage() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadData() {
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

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const categoriesByParentId = useMemo(() => {
    const groupedCategories = new Map<string, AdminCategory[]>();

    for (const category of categories) {
      const parentKey = category.parentId ?? "root";
      const siblings = groupedCategories.get(parentKey) ?? [];
      siblings.push(category);
      groupedCategories.set(parentKey, siblings);
    }

    return groupedCategories;
  }, [categories]);

  const categoriesById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const visibleCategories = categoriesByParentId.get(
    selectedCategoryId ?? "root",
  ) ?? [];

  const selectedCategory = selectedCategoryId
    ? categoriesById.get(selectedCategoryId)
    : null;

  const breadcrumb = useMemo(() => {
    const path: AdminCategory[] = [];
    let currentCategory = selectedCategory;

    while (currentCategory) {
      path.unshift(currentCategory);
      currentCategory = currentCategory.parentId
        ? categoriesById.get(currentCategory.parentId)
        : undefined;
    }

    return path;
  }, [categoriesById, selectedCategory]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = selectedCategoryId
        ? product.categories.some(
            (categoryLink) => categoryLink.categoryId === selectedCategoryId,
          )
        : product.categories.some(
            (categoryLink) => categoryLink.category.parentId === null,
          );

      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.slug.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [products, searchTerm, selectedCategoryId, statusFilter]);

  const showCategories = viewMode === "all" || viewMode === "categories";
  const showProducts = viewMode === "all" || viewMode === "products";

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Manage Products</h1>
          <p>
            Browse root categories, drill into child categories, and review the
            products assigned at each level.
          </p>
        </div>
      </section>

      <section className="admin-toolbar">
        <div className="breadcrumb">
          <button type="button" onClick={() => setSelectedCategoryId(null)}>
            Root
          </button>
          {breadcrumb.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
        <div className="filters-row">
          <div className="segmented-control" aria-label="View mode">
            {(["all", "categories", "products"] as const).map((mode) => (
              <button
                className={viewMode === mode ? "active" : undefined}
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
          <select
            aria-label="Product status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <input
            aria-label="Search products"
            placeholder="Search products"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading catalog</h2>
          <p>Fetching categories and product assignments.</p>
        </section>
      ) : (
        <section className="catalog-grid">
          {showCategories ? (
            <div className="catalog-section">
              <div className="section-title">
                <h2>
                  {selectedCategory ? "Child Categories" : "Root Categories"}
                </h2>
                <span>{visibleCategories.length}</span>
              </div>
              <div className="category-list">
                {visibleCategories.length > 0 ? (
                  visibleCategories.map((category) => (
                    <button
                      className="category-row"
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <span>
                        <strong>{category.name}</strong>
                        <small>{category.slug}</small>
                      </span>
                      <span>{category.isActive ? "Active" : "Inactive"}</span>
                    </button>
                  ))
                ) : (
                  <p className="muted-text">No child categories here.</p>
                )}
              </div>
            </div>
          ) : null}

          {showProducts ? (
            <div className="catalog-section">
              <div className="section-title">
                <h2>Products</h2>
                <span>{visibleProducts.length}</span>
              </div>
              <div className="product-list">
                {visibleProducts.length > 0 ? (
                  visibleProducts.map((product) => (
                    <article className="product-row" key={product.id}>
                      <div>
                        <h3>{product.name}</h3>
                        <p>{product.shortDescription ?? product.slug}</p>
                      </div>
                      <div className="product-meta">
                        <span>{product.status}</span>
                        <span>
                          {product.categories
                            .map((categoryLink) => categoryLink.category.name)
                            .join(", ") || "Uncategorized"}
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="muted-text">No products match this view.</p>
                )}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
