"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminProductMetadataItem,
  CreateProductMetadataPayload,
  createProductMetadataItem,
  deleteProductMetadataItem,
  getProductMetadataItems,
  updateProductMetadataItem,
} from "@/lib/api/admin";
import {
  getProductMetadataConfig,
  productMetadataConfigs,
} from "@/lib/product-metadata/config";

export default function AddProductMetadataPage() {
  const router = useRouter();
  const params = useParams<{ resource: string }>();
  const config = getProductMetadataConfig(params.resource);
  const metadataConfig = config ?? productMetadataConfigs[0];
  const { accessToken } = useAuth();
  const [items, setItems] = useState<AdminProductMetadataItem[]>([]);
  const [editingItem, setEditingItem] =
    useState<AdminProductMetadataItem | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [inciName, setInciName] = useState("");
  const [benefits, setBenefits] = useState("");
  const [warnings, setWarnings] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const loadItems = useCallback(async (showLoading = true) => {
    if (!accessToken) {
      return;
    }

    if (showLoading) {
      setError(null);
      setIsLoading(true);
    }

    try {
      const nextItems = await getProductMetadataItems(
        accessToken,
        metadataConfig.resource,
      );
      setItems(nextItems);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : `Unable to load ${metadataConfig.pluralLabel.toLowerCase()}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, metadataConfig]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;

    getProductMetadataItems(accessToken, metadataConfig.resource)
      .then((nextItems) => {
        if (isMounted) {
          setItems(nextItems);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : `Unable to load ${metadataConfig.pluralLabel.toLowerCase()}`,
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, metadataConfig]);

  if (!config) {
    notFound();
    return null;
  }

  function handleNameChange(nextName: string) {
    setName(nextName);

    if (!slug) {
      setSlug(toSlug(nextName));
    }
  }

  function resetForm() {
    setEditingItem(null);
    setName("");
    setSlug("");
    setDescription("");
    setInciName("");
    setBenefits("");
    setWarnings("");
    setMinAge("");
    setMaxAge("");
    setIsActive(true);
  }

  function startEditing(item: AdminProductMetadataItem) {
    setEditingItem(item);
    setName(item.name);
    setSlug(item.slug);
    setDescription(item.description ?? "");
    setIsActive(item.isActive);
    setInciName(item.inciName ?? "");
    setBenefits(item.benefits ?? "");
    setWarnings(item.warnings ?? "");
    setMinAge(
      item.minAge === null || item.minAge === undefined
        ? ""
        : String(item.minAge),
    );
    setMaxAge(
      item.maxAge === null || item.maxAge === undefined
        ? ""
        : String(item.maxAge),
    );
    setError(null);
    setSuccess(null);
  }

  function getPayload(): CreateProductMetadataPayload {
    return {
      name,
      slug,
      description: description || undefined,
      isActive,
      ...(metadataConfig.resource === "ingredients" && {
        inciName: inciName || undefined,
        benefits: benefits || undefined,
        warnings: warnings || undefined,
      }),
      ...(metadataConfig.resource === "age-groups" && {
        minAge: minAge ? Number(minAge) : null,
        maxAge: maxAge ? Number(maxAge) : null,
      }),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (editingItem) {
        await updateProductMetadataItem(
          accessToken,
          metadataConfig.resource,
          editingItem.id,
          getPayload(),
        );
        setSuccess(`${metadataConfig.singularLabel} updated successfully`);
      } else {
        await createProductMetadataItem(
          accessToken,
          metadataConfig.resource,
          getPayload(),
        );
        setSuccess(`${metadataConfig.singularLabel} created successfully`);
      }

      resetForm();
      await loadItems();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : `Unable to save ${metadataConfig.singularLabel.toLowerCase()}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: AdminProductMetadataItem) {
    if (!accessToken) {
      return;
    }

    const shouldDelete = window.confirm(`Delete ${item.name}?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);
    setDeletingItemId(item.id);

    try {
      await deleteProductMetadataItem(
        accessToken,
        metadataConfig.resource,
        item.id,
      );
      setSuccess(`${metadataConfig.singularLabel} deleted successfully`);

      if (editingItem?.id === item.id) {
        resetForm();
      }

      await loadItems();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : `Unable to delete ${metadataConfig.singularLabel.toLowerCase()}`,
      );
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Product Metadata</p>
          <h1>
            {editingItem ? "Edit" : "Add"} {metadataConfig.singularLabel}
          </h1>
          <p>{metadataConfig.description}</p>
        </div>
        <Link className="secondary-link-button" href="/admin/product-metadata">
          Back to Metadata
        </Link>
      </section>

      <section className="metadata-manage-grid">
        <div className="form-surface">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="split-fields">
              <label>
                Name
                <input
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  required
                />
              </label>
              <label>
                Slug
                <input
                  value={slug}
                  onChange={(event) => setSlug(toSlug(event.target.value))}
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  required
                />
              </label>
            </div>

            {metadataConfig.resource === "age-groups" ? (
              <div className="split-fields">
                <label>
                  Min age
                  <input
                    min={0}
                    type="number"
                    value={minAge}
                    onChange={(event) => setMinAge(event.target.value)}
                  />
                </label>
                <label>
                  Max age
                  <input
                    min={0}
                    type="number"
                    value={maxAge}
                    onChange={(event) => setMaxAge(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            {metadataConfig.resource === "ingredients" ? (
              <>
                <label>
                  INCI name
                  <input
                    value={inciName}
                    onChange={(event) => setInciName(event.target.value)}
                  />
                </label>
                <label>
                  Benefits
                  <textarea
                    rows={3}
                    value={benefits}
                    onChange={(event) => setBenefits(event.target.value)}
                  />
                </label>
                <label>
                  Warnings
                  <textarea
                    rows={3}
                    value={warnings}
                    onChange={(event) => setWarnings(event.target.value)}
                  />
                </label>
              </>
            ) : null}

            <label>
              Description
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <label className="checkbox-field">
              <input
                checked={isActive}
                type="checkbox"
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Active
            </label>

            {success ? <p className="form-success">{success}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}

            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : `${editingItem ? "Update" : "Create"} ${
                      metadataConfig.singularLabel
                    }`}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={resetForm}
              >
                Clear
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => router.push("/admin/product-metadata")}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <aside className="metadata-list-panel">
          <div className="section-title">
            <div>
              <h2>Existing {metadataConfig.pluralLabel}</h2>
              <p>{items.length} saved records</p>
            </div>
          </div>

          {isLoading ? <p className="muted-text">Loading...</p> : null}

          {!isLoading && items.length === 0 ? (
            <p className="muted-text">No records yet.</p>
          ) : null}

          <div className="metadata-list">
            {items.map((item) => (
              <article className="metadata-list-row" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.slug}</p>
                  {item.description ? <p>{item.description}</p> : null}
                  {metadataConfig.resource === "ingredients" ? (
                    <small>
                      {[item.inciName, item.benefits, item.warnings]
                        .filter(Boolean)
                        .join(" / ")}
                    </small>
                  ) : null}
                  {metadataConfig.resource === "age-groups" ? (
                    <small>
                      {formatAge(item.minAge)} - {formatAge(item.maxAge)}
                    </small>
                  ) : null}
                </div>
                <span>{item.isActive ? "Active" : "Inactive"}</span>
                <div className="metadata-row-actions">
                  <button
                    aria-label={`Edit ${item.name}`}
                    className="icon-button"
                    title={`Edit ${item.name}`}
                    type="button"
                    onClick={() => startEditing(item)}
                  >
                    <EditIcon />
                  </button>
                  <button
                    aria-label={`Delete ${item.name}`}
                    className="icon-button danger-icon-button"
                    title={`Delete ${item.name}`}
                    type="button"
                    disabled={deletingItemId === item.id}
                    onClick={() => void handleDelete(item)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function formatAge(value: number | null | undefined) {
  return value === null || value === undefined ? "Any" : String(value);
}

function EditIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M4 20H8L18.5 9.5C19.6 8.4 19.6 6.6 18.5 5.5C17.4 4.4 15.6 4.4 14.5 5.5L4 16V20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M13.5 6.5L17.5 10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M5 7H19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M9 7V5H15V7"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M7 7L8 20H16L17 7"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M10.5 11V16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M13.5 11V16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
