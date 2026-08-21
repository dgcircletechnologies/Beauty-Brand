"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { AdminAttribute, getAdminAttributes } from "@/lib/api/admin";

export default function AdminAttributesPage() {
  const { accessToken } = useAuth();
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadAttributes() {
      setError(null);
      setIsLoading(true);

      try {
        const nextAttributes = await getAdminAttributes(token);

        if (isMounted) {
          setAttributes(nextAttributes);
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load attributes",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAttributes();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const filteredAttributes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return attributes.filter((attribute) => {
      const matchesSearch =
        !normalizedSearch ||
        attribute.name.toLowerCase().includes(normalizedSearch) ||
        attribute.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && attribute.isActive) ||
        (statusFilter === "inactive" && !attribute.isActive);

      const matchesType =
        typeFilter === "all" || attribute.dataType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [attributes, searchTerm, statusFilter, typeFilter]);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Attributes</h1>
          <p>Manage reusable product attribute definitions separately.</p>
        </div>
        <Link className="primary-link-button" href="/admin/attributes/add">
          Add Attribute
        </Link>
      </section>

      <section className="admin-toolbar">
        <div className="all-products-filters">
          <input
            aria-label="Search attributes"
            placeholder="Search attributes"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            aria-label="Filter attribute status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            aria-label="Filter attribute type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All types</option>
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
            <option value="BOOLEAN">Boolean</option>
            <option value="SELECT">Select</option>
            <option value="MULTI_SELECT">Multi select</option>
          </select>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="catalog-section">
        <div className="section-title">
          <h2>Attribute List</h2>
          <span>{filteredAttributes.length}</span>
        </div>
        {isLoading ? (
          <p className="muted-text">Loading attributes...</p>
        ) : (
          <div className="admin-data-list">
            {filteredAttributes.map((attribute) => (
              <article className="admin-data-row" key={attribute.id}>
                <div>
                  <h3>{attribute.name}</h3>
                  <p>{attribute.description ?? attribute.slug}</p>
                </div>
                <span>{attribute.dataType.replace("_", " ")}</span>
                <span>{attribute.isActive ? "Active" : "Inactive"}</span>
              </article>
            ))}
            {filteredAttributes.length === 0 ? (
              <p className="muted-text">No attributes match these filters.</p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
