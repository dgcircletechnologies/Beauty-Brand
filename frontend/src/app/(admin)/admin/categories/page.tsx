"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { AdminCategory, getAdminCategories } from "@/lib/api/admin";

export default function AdminCategoriesPage() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [parentFilter, setParentFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadCategories() {
      setError(null);
      setIsLoading(true);

      try {
        const nextCategories = await getAdminCategories(token);

        if (isMounted) {
          setCategories(nextCategories);
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load categories",
        );
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
  }, [accessToken]);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch =
        !normalizedSearch ||
        category.name.toLowerCase().includes(normalizedSearch) ||
        category.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && category.isActive) ||
        (statusFilter === "inactive" && !category.isActive);

      const matchesParent =
        parentFilter === "all" ||
        (parentFilter === "root" && category.parentId === null) ||
        category.parentId === parentFilter;

      return matchesSearch && matchesStatus && matchesParent;
    });
  }, [categories, parentFilter, searchTerm, statusFilter]);

  const rootCategories = categories.filter((category) => category.parentId === null);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Categories</h1>
          <p>Manage product category hierarchy separately from products.</p>
        </div>
        <Link className="primary-link-button" href="/admin/categories/add">
          Add Category
        </Link>
      </section>

      <section className="admin-toolbar">
        <div className="all-products-filters">
          <input
            aria-label="Search categories"
            placeholder="Search categories"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            aria-label="Filter category status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            aria-label="Filter parent category"
            value={parentFilter}
            onChange={(event) => setParentFilter(event.target.value)}
          >
            <option value="all">All parents</option>
            <option value="root">Root categories</option>
            {rootCategories.map((category) => (
              <option key={category.id} value={category.id}>
                Children of {category.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="catalog-section">
        <div className="section-title">
          <h2>Category List</h2>
          <span>{filteredCategories.length}</span>
        </div>
        {isLoading ? (
          <p className="muted-text">Loading categories...</p>
        ) : (
          <div className="admin-data-list">
            {filteredCategories.map((category) => (
              <article className="admin-data-row" key={category.id}>
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.slug}</p>
                </div>
                <span>{category.isActive ? "Active" : "Inactive"}</span>
                <span>
                  {category.parentId
                    ? categoriesById.get(category.parentId)?.name ?? "Parent"
                    : "Root"}
                </span>
              </article>
            ))}
            {filteredCategories.length === 0 ? (
              <p className="muted-text">No categories match these filters.</p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
