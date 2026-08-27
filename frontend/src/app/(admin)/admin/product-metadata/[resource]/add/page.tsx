"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
import { useDebouncedValue } from "@/lib/use-debounced-value";

type MetadataForm = {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  inciName: string;
  benefits: string;
  warnings: string;
  minAge: string;
  maxAge: string;
};

const initialForm: MetadataForm = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
  inciName: "",
  benefits: "",
  warnings: "",
  minAge: "",
  maxAge: "",
};

const pageSize = 8;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function AddProductMetadataPage() {
  const router = useRouter();
  const params = useParams<{ resource: string }>();
  const config = getProductMetadataConfig(params.resource);
  const metadataConfig = config ?? productMetadataConfigs[0];
  const { accessToken } = useAuth();
  const [items, setItems] = useState<AdminProductMetadataItem[]>([]);
  const [editingItem, setEditingItem] =
    useState<AdminProductMetadataItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const debouncedSlug = useDebouncedValue(form.slug, 350);
  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;
    const resource = metadataConfig.resource;
    const pluralLabel = metadataConfig.pluralLabel;

    async function loadItems() {
      setError(null);
      setIsLoading(true);

      try {
        const nextItems = await getProductMetadataItems(token, resource);

        if (isMounted) {
          setItems(nextItems);
          setPage(1);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : `Unable to load ${pluralLabel.toLowerCase()}`,
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    metadataConfig.pluralLabel,
    metadataConfig.resource,
  ]);

  const isEditing = Boolean(editingItem);
  const normalizedSlug = form.slug.trim();
  const debouncedNormalizedSlug = debouncedSlug.trim();
  const slugIsValid = slugPattern.test(normalizedSlug);
  const slugStatus = useMemo(() => {
    if (
      isEditing ||
      !debouncedNormalizedSlug ||
      debouncedNormalizedSlug !== normalizedSlug ||
      !slugPattern.test(debouncedNormalizedSlug)
    ) {
      return null;
    }

    return items.some((item) => item.slug === debouncedNormalizedSlug)
      ? "unavailable"
      : "available";
  }, [debouncedNormalizedSlug, isEditing, items, normalizedSlug]);

  const filteredItems = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [
        item.name,
        item.slug,
        item.description,
        item.inciName,
        item.benefits,
        item.warnings,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [debouncedSearch, items]);
  const activeCount = useMemo(
    () => items.filter((item) => item.isActive).length,
    [items],
  );
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredItems]);
  const ageValidationMessage = useMemo(() => {
    if (metadataConfig.resource !== "age-groups") {
      return null;
    }

    const minAge = optionalNumber(form.minAge);
    const maxAge = optionalNumber(form.maxAge);

    if (minAge !== null && maxAge !== null && minAge > maxAge) {
      return "Min age cannot be greater than max age.";
    }

    return null;
  }, [form.maxAge, form.minAge, metadataConfig.resource]);
  const canSubmit =
    Boolean(form.name.trim()) &&
    slugIsValid &&
    (isEditing || slugStatus === "available") &&
    !ageValidationMessage &&
    !isSubmitting;

  const setField = useCallback(
    <T extends keyof MetadataForm>(field: T, value: MetadataForm[T]) => {
      setForm((currentForm) => ({
        ...currentForm,
        [field]: value,
      }));
      setSuccess(null);
    },
    [],
  );

  const handleNameChange = useCallback(
    (nextName: string) => {
      setForm((currentForm) => ({
        ...currentForm,
        name: nextName,
        slug:
          isEditing || slugWasEdited ? currentForm.slug : toSlug(nextName),
      }));
      setSuccess(null);
    },
    [isEditing, slugWasEdited],
  );

  const handleSlugChange = useCallback((nextSlug: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      slug: toSlug(nextSlug),
    }));
    setSlugWasEdited(true);
    setSuccess(null);
  }, []);

  const resetForm = useCallback(() => {
    setEditingItem(null);
    setForm(initialForm);
    setSlugWasEdited(false);
  }, []);

  const startEditing = useCallback((item: AdminProductMetadataItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description ?? "",
      isActive: item.isActive,
      inciName: item.inciName ?? "",
      benefits: item.benefits ?? "",
      warnings: item.warnings ?? "",
      minAge:
        item.minAge === null || item.minAge === undefined
          ? ""
          : String(item.minAge),
      maxAge:
        item.maxAge === null || item.maxAge === undefined
          ? ""
          : String(item.maxAge),
    });
    setSlugWasEdited(true);
    setError(null);
    setSuccess(null);
  }, []);

  const getPayload = useCallback(
    (): CreateProductMetadataPayload => ({
      name: form.name.trim(),
      slug: normalizedSlug,
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      ...(metadataConfig.resource === "ingredients" && {
        inciName: form.inciName.trim() || undefined,
        benefits: form.benefits.trim() || undefined,
        warnings: form.warnings.trim() || undefined,
      }),
      ...(metadataConfig.resource === "age-groups" && {
        minAge: form.minAge ? Number(form.minAge) : null,
        maxAge: form.maxAge ? Number(form.maxAge) : null,
      }),
    }),
    [form, metadataConfig.resource, normalizedSlug],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !canSubmit) {
        return;
      }

      setError(null);
      setSuccess(null);
      setIsSubmitting(true);

      try {
        if (editingItem) {
          const updatedItem = await updateProductMetadataItem(
            accessToken,
            metadataConfig.resource,
            editingItem.id,
            getPayload(),
          );
          setItems((currentItems) =>
            currentItems.map((item) =>
              item.id === updatedItem.id ? updatedItem : item,
            ),
          );
          setSuccess(`${metadataConfig.singularLabel} updated successfully`);
        } else {
          const createdItem = await createProductMetadataItem(
            accessToken,
            metadataConfig.resource,
            getPayload(),
          );
          setItems((currentItems) => [createdItem, ...currentItems]);
          setSuccess(`${metadataConfig.singularLabel} created successfully`);
        }

        resetForm();
        setPage(1);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : `Unable to save ${metadataConfig.singularLabel.toLowerCase()}`,
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      accessToken,
      canSubmit,
      editingItem,
      getPayload,
      metadataConfig.resource,
      metadataConfig.singularLabel,
      resetForm,
    ],
  );

  const handleDelete = useCallback(
    async (item: AdminProductMetadataItem) => {
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
        setItems((currentItems) =>
          currentItems.filter((currentItem) => currentItem.id !== item.id),
        );
        setSuccess(`${metadataConfig.singularLabel} deleted successfully`);

        if (editingItem?.id === item.id) {
          resetForm();
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : `Unable to delete ${metadataConfig.singularLabel.toLowerCase()}`,
        );
      } finally {
        setDeletingItemId(null);
      }
    },
    [
      accessToken,
      editingItem,
      metadataConfig.resource,
      metadataConfig.singularLabel,
      resetForm,
    ],
  );

  if (!config) {
    notFound();
    return null;
  }

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Product Metadata</p>
          <h1>
            {isEditing ? "Edit" : "Add"} {metadataConfig.singularLabel}
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
            <div className="section-title">
              <h2>{isEditing ? "Edit Record" : "Create Record"}</h2>
              <span>{activeCount} active</span>
            </div>
            <div className="split-fields">
              <label>
                Name
                <input
                  required
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                />
              </label>
              <label>
                Slug
                <input
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  readOnly={isEditing}
                  required
                  value={form.slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                />
                {normalizedSlug ? (
                  <small
                    className={
                      slugStatus === "available" || isEditing
                        ? "field-status available"
                        : "field-status unavailable"
                    }
                  >
                    {isEditing
                      ? "Slug is locked while editing."
                      : !slugIsValid
                        ? "Use lowercase words separated by hyphens."
                        : slugStatus === "available"
                          ? "Slug is available."
                          : slugStatus === "unavailable"
                            ? "Slug already exists."
                            : "Checking slug..."}
                  </small>
                ) : null}
              </label>
            </div>

            {metadataConfig.resource === "age-groups" ? (
              <div className="split-fields">
                <label>
                  Min age
                  <input
                    min={0}
                    type="number"
                    value={form.minAge}
                    onChange={(event) =>
                      setField("minAge", event.target.value)
                    }
                  />
                </label>
                <label>
                  Max age
                  <input
                    min={0}
                    type="number"
                    value={form.maxAge}
                    onChange={(event) =>
                      setField("maxAge", event.target.value)
                    }
                  />
                </label>
              </div>
            ) : null}

            {metadataConfig.resource === "ingredients" ? (
              <>
                <label>
                  INCI name
                  <input
                    value={form.inciName}
                    onChange={(event) =>
                      setField("inciName", event.target.value)
                    }
                  />
                </label>
                <label>
                  Benefits
                  <textarea
                    rows={3}
                    value={form.benefits}
                    onChange={(event) =>
                      setField("benefits", event.target.value)
                    }
                  />
                </label>
                <label>
                  Warnings
                  <textarea
                    rows={3}
                    value={form.warnings}
                    onChange={(event) =>
                      setField("warnings", event.target.value)
                    }
                  />
                </label>
              </>
            ) : null}

            <label>
              Description
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setField("description", event.target.value)
                }
              />
            </label>

            <div className="metadata-status-row">
              <span>Active</span>
              <StatusSwitch
                checked={form.isActive}
                disabled={isSubmitting}
                label={`${form.isActive ? "Deactivate" : "Activate"} ${
                  metadataConfig.singularLabel
                }`}
                onChange={() => setField("isActive", !form.isActive)}
              />
            </div>

            {ageValidationMessage ? (
              <p className="form-error">{ageValidationMessage}</p>
            ) : null}
            {success ? <p className="form-success">{success}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}

            <div className="form-actions">
              <button
                className="primary-button"
                disabled={!canSubmit}
                type="submit"
              >
                {isSubmitting
                  ? "Saving..."
                  : `${isEditing ? "Update" : "Create"} ${
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
              <p>
                {filteredItems.length} shown from {items.length} saved records
              </p>
            </div>
          </div>
          <input
            aria-label={`Search ${metadataConfig.pluralLabel}`}
            className="metadata-search-input"
            placeholder={`Search ${metadataConfig.pluralLabel.toLowerCase()}`}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />

          {isLoading ? <p className="muted-text">Loading...</p> : null}

          {!isLoading && filteredItems.length === 0 ? (
            <p className="muted-text">No matching records.</p>
          ) : null}

          <div className="metadata-list">
            {visibleItems.map((item) => (
              <MetadataListRow
                deleting={deletingItemId === item.id}
                item={item}
                key={item.id}
                resource={metadataConfig.resource}
                onDelete={handleDelete}
                onEdit={startEditing}
              />
            ))}
          </div>

          <PaginationControls
            currentPage={currentPage}
            disabled={isSubmitting}
            totalPages={totalPages}
            onNext={() => setPage((current) => current + 1)}
            onPrevious={() => setPage((current) => Math.max(current - 1, 1))}
          />
        </aside>
      </section>
    </main>
  );
}

type MetadataListRowProps = {
  deleting: boolean;
  item: AdminProductMetadataItem;
  resource: string;
  onDelete: (item: AdminProductMetadataItem) => void;
  onEdit: (item: AdminProductMetadataItem) => void;
};

const MetadataListRow = memo(function MetadataListRow({
  deleting,
  item,
  resource,
  onDelete,
  onEdit,
}: MetadataListRowProps) {
  return (
    <article className="metadata-list-row">
      <div>
        <h3>{item.name}</h3>
        <p>{item.slug}</p>
        {item.description ? <p>{item.description}</p> : null}
        {resource === "ingredients" ? (
          <small>
            {[item.inciName, item.benefits, item.warnings]
              .filter(Boolean)
              .join(" / ")}
          </small>
        ) : null}
        {resource === "age-groups" ? (
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
          onClick={() => onEdit(item)}
        >
          <EditIcon />
        </button>
        <button
          aria-label={`Delete ${item.name}`}
          className="icon-button danger-icon-button"
          disabled={deleting}
          title={`Delete ${item.name}`}
          type="button"
          onClick={() => onDelete(item)}
        >
          <TrashIcon />
        </button>
      </div>
    </article>
  );
});

type StatusSwitchProps = {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: () => void;
};

const StatusSwitch = memo(function StatusSwitch({
  checked,
  disabled,
  label,
  onChange,
}: StatusSwitchProps) {
  return (
    <label className="status-switch" aria-label={label} title={label}>
      <input
        checked={checked}
        disabled={disabled}
        type="checkbox"
        onChange={onChange}
      />
      <span />
    </label>
  );
});

type PaginationControlsProps = {
  currentPage: number;
  disabled: boolean;
  totalPages: number;
  onNext: () => void;
  onPrevious: () => void;
};

const PaginationControls = memo(function PaginationControls({
  currentPage,
  disabled,
  totalPages,
  onNext,
  onPrevious,
}: PaginationControlsProps) {
  return (
    <div className="pagination-actions">
      <button
        className="secondary-button compact-button"
        disabled={disabled || currentPage <= 1}
        type="button"
        onClick={onPrevious}
      >
        Previous
      </button>
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <button
        className="secondary-button compact-button"
        disabled={disabled || currentPage >= totalPages}
        type="button"
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
});

function optionalNumber(value: string) {
  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : -1;
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
