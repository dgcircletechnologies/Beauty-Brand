"use client";

import Link from "next/link";
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
  AdminAttribute,
  AdminAttributeSlugAvailability,
  checkAdminAttributeSlugAvailability,
  createAdminAttribute,
  deleteAdminAttribute,
  getAdminAttributesPage,
  PaginatedAdminAttributes,
  setAdminAttributeActive,
  updateAdminAttribute,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const attributeTypes: Array<AdminAttribute["dataType"]> = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "SELECT",
  "MULTI_SELECT",
];

const typeLabels: Record<AdminAttribute["dataType"], string> = {
  TEXT: "Text",
  NUMBER: "Number",
  BOOLEAN: "Boolean",
  SELECT: "Select",
  MULTI_SELECT: "Multi select",
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pageSize = 10;

export default function AttributeDefinitionPage() {
  const { accessToken } = useAuth();
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(
    null,
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [dataType, setDataType] = useState<AdminAttribute["dataType"]>("TEXT");
  const [isActive, setIsActive] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginatedAdminAttributes | null>(
    null,
  );
  const [slugStatus, setSlugStatus] =
    useState<AdminAttributeSlugAvailability | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedSlug = useDebouncedValue(slug, 450);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);

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
        const nextPage = await getAdminAttributesPage(token, {
          page,
          pageSize,
          search: debouncedSearchTerm,
          status: statusFilter,
          dataType: typeFilter,
        });

        if (isMounted) {
          setAttributes(nextPage.items);
          setPagination(nextPage);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load attribute definitions",
          );
        }
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
  }, [accessToken, debouncedSearchTerm, page, statusFilter, typeFilter]);

  useEffect(() => {
    let isMounted = true;

    if (
      editingAttributeId ||
      !accessToken ||
      !debouncedSlug ||
      !slugPattern.test(debouncedSlug)
    ) {
      queueMicrotask(() => {
        if (isMounted) {
          setSlugStatus(null);
          setIsCheckingSlug(false);
        }
      });

      return () => {
        isMounted = false;
      };
    }

    const token = accessToken;
    const slugSnapshot = debouncedSlug;

    async function checkSlug() {
      setIsCheckingSlug(true);

      try {
        const nextStatus = await checkAdminAttributeSlugAvailability(
          token,
          slugSnapshot,
        );

        if (isMounted) {
          setSlugStatus(nextStatus);
        }
      } catch {
        if (isMounted) {
          setSlugStatus(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSlug(false);
        }
      }
    }

    void checkSlug();

    return () => {
      isMounted = false;
    };
  }, [accessToken, debouncedSlug, editingAttributeId]);

  const definitionCountLabel = useMemo(() => {
    if (!pagination) {
      return "0 shown";
    }

    return `${attributes.length} of ${pagination.total} shown`;
  }, [attributes.length, pagination]);

  const slugIsValid = slugPattern.test(slug);
  const slugIsAvailable =
    Boolean(editingAttributeId) ||
    (slugStatus?.slug === slug && slugStatus.available);
  const canSubmit =
    Boolean(name.trim()) &&
    slugIsValid &&
    slugIsAvailable &&
    !isSubmitting &&
    !isCheckingSlug;

  const handleNameChange = useCallback((nextName: string) => {
    setName(nextName);

    if (!slug) {
      setSlug(toSlug(nextName));
    }
  }, [slug]);

  const resetForm = useCallback(() => {
    setEditingAttributeId(null);
    setName("");
    setSlug("");
    setDescription("");
    setDataType("TEXT");
    setIsActive(true);
    setSlugStatus(null);
  }, []);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !canSubmit) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (editingAttributeId) {
        const updatedAttribute = await updateAdminAttribute(
          accessToken,
          editingAttributeId,
          {
            name,
            description: description || undefined,
          },
        );

        setAttributes((currentAttributes) =>
          currentAttributes.map((attribute) =>
            attribute.id === editingAttributeId ? updatedAttribute : attribute,
          ),
        );
        setSuccess("Attribute definition updated successfully");
      } else {
        const createdAttribute = await createAdminAttribute(accessToken, {
          name,
          slug,
          description: description || undefined,
          dataType,
          isActive,
        });

        setAttributes((currentAttributes) =>
          [...currentAttributes, createdAttribute]
            .sort(sortAttributes)
            .slice(0, pageSize),
        );
        setPagination((currentPagination) =>
          currentPagination
            ? {
                ...currentPagination,
                total: currentPagination.total + 1,
                totalPages: Math.max(
                  1,
                  Math.ceil((currentPagination.total + 1) / pageSize),
                ),
              }
            : currentPagination,
        );
        setSuccess("Attribute definition created successfully");
      }

      resetForm();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save attribute definition",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    accessToken,
    canSubmit,
    dataType,
    description,
    editingAttributeId,
    isActive,
    name,
    resetForm,
    slug,
  ]);

  const editAttribute = useCallback((attribute: AdminAttribute) => {
    setEditingAttributeId(attribute.id);
    setName(attribute.name);
    setSlug(attribute.slug);
    setDescription(attribute.description ?? "");
    setDataType(attribute.dataType);
    setIsActive(attribute.isActive);
    setSuccess(null);
    setError(null);
  }, []);

  const removeAttribute = useCallback(async (attributeId: string) => {
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteAdminAttribute(accessToken, attributeId);
      setAttributes((currentAttributes) =>
        currentAttributes.filter((attribute) => attribute.id !== attributeId),
      );
      setPagination((currentPagination) =>
        currentPagination
          ? {
              ...currentPagination,
              total: Math.max(currentPagination.total - 1, 0),
            }
          : currentPagination,
      );

      if (editingAttributeId === attributeId) {
        resetForm();
      }

      setSuccess("Attribute definition deleted successfully");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete attribute definition",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, editingAttributeId, resetForm]);

  const toggleAttributeStatus = useCallback(async (attribute: AdminAttribute) => {
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedAttribute = await setAdminAttributeActive(
        accessToken,
        attribute.id,
        !attribute.isActive,
      );

      setAttributes((currentAttributes) =>
        currentAttributes.map((currentAttribute) =>
          currentAttribute.id === attribute.id
            ? updatedAttribute
            : currentAttribute,
        ),
      );

      if (editingAttributeId === attribute.id) {
        setIsActive(updatedAttribute.isActive);
      }

      setSuccess(
        updatedAttribute.isActive
          ? "Attribute definition activated"
          : "Attribute definition deactivated",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update attribute status",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, editingAttributeId]);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Attribute Definition</h1>
          <p>Create and manage reusable product attribute definitions.</p>
        </div>
        <Link className="secondary-link-button" href="/admin/attributes">
          View All Attributes
        </Link>
      </section>

      <section className="definition-workspace">
        <section className="form-surface definition-form-surface">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="section-title">
              <div>
                <h2>
                  {editingAttributeId ? "Edit Definition" : "New Definition"}
                </h2>
                <p>
                  Slug availability is checked automatically after typing stops.
                </p>
              </div>
            </div>

            <div className="split-fields">
              <label>
                Attribute name
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
                  disabled={Boolean(editingAttributeId)}
                  onChange={(event) => setSlug(toSlug(event.target.value))}
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  required
                />
                {slug && !editingAttributeId ? (
                  <span
                    className={
                      slugIsAvailable
                        ? "field-status available"
                        : "field-status unavailable"
                    }
                  >
                    {isCheckingSlug
                      ? "Checking..."
                      : !slugIsValid
                        ? "Use lowercase letters, numbers, and hyphens"
                        : slugIsAvailable
                          ? "Slug available"
                          : "Slug already used"}
                  </span>
                ) : null}
              </label>
            </div>

            <label>
              Data type
              <select
                disabled={Boolean(editingAttributeId)}
                value={dataType}
                onChange={(event) =>
                  setDataType(event.target.value as AdminAttribute["dataType"])
                }
              >
                {attributeTypes.map((type) => (
                  <option key={type} value={type}>
                    {typeLabels[type]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Description
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            {editingAttributeId ? (
              <p className="muted-text">
                Slug and data type are locked after creation. Use the status
                toggle in the definition list to activate or deactivate.
              </p>
            ) : (
              <label className="checkbox-field">
                <input
                  checked={isActive}
                  type="checkbox"
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                Active attribute
              </label>
            )}

            {success ? <p className="form-success">{success}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}

            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={!canSubmit}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingAttributeId
                    ? "Update Definition"
                    : "Create Definition"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={resetForm}
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <aside className="definition-list-panel">
          <div className="section-title">
            <div>
              <h2>Available Definitions</h2>
              <p>{definitionCountLabel}</p>
            </div>
          </div>

          <div className="definition-filters">
            <input
              aria-label="Search definitions"
              placeholder="Search definitions"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
            />
            <select
              aria-label="Filter definition type"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All types</option>
              <option value="TEXT">Text only</option>
              <option value="NUMBER">Number only</option>
              <option value="BOOLEAN">Boolean only</option>
              <option value="SELECT">Select only</option>
              <option value="MULTI_SELECT">Multi select only</option>
            </select>
            <select
              aria-label="Filter definition status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          <div className="definition-list">
            {isLoading ? (
              <p className="muted-text">Loading definitions...</p>
            ) : (
              attributes.map((attribute) => (
                <DefinitionRow
                  attribute={attribute}
                  isSubmitting={isSubmitting}
                  key={attribute.id}
                  onEdit={editAttribute}
                  onRemove={removeAttribute}
                  onToggleStatus={toggleAttributeStatus}
                />
              ))
            )}
            {!isLoading && attributes.length === 0 ? (
              <p className="muted-text">No definitions match these filters.</p>
            ) : null}
          </div>
          <div className="pagination-actions">
            <button
              className="secondary-button compact-button"
              disabled={isLoading || !pagination?.hasPreviousPage}
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.max(currentPage - 1, 1))
              }
            >
              Previous
            </button>
            <span>
              Page {pagination?.page ?? page} of {pagination?.totalPages ?? 1}
            </span>
            <button
              className="secondary-button compact-button"
              disabled={isLoading || !pagination?.hasNextPage}
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              Next
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

type DefinitionRowProps = {
  attribute: AdminAttribute;
  isSubmitting: boolean;
  onEdit: (attribute: AdminAttribute) => void;
  onRemove: (attributeId: string) => void;
  onToggleStatus: (attribute: AdminAttribute) => void;
};

const DefinitionRow = memo(function DefinitionRow({
  attribute,
  isSubmitting,
  onEdit,
  onRemove,
  onToggleStatus,
}: DefinitionRowProps) {
  return (
    <article className="definition-row">
      <div>
        <strong>{attribute.name}</strong>
        <small>{attribute.slug}</small>
      </div>
      <span>{typeLabels[attribute.dataType]}</span>
      <span>{attribute.isActive ? "Active" : "Inactive"}</span>
      <div className="row-actions">
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={() => onEdit(attribute)}
        >
          Edit
        </button>
        <label
          className="status-switch"
          aria-label={
            attribute.isActive
              ? "Deactivate attribute definition"
              : "Activate attribute definition"
          }
        >
          <input
            checked={attribute.isActive}
            disabled={isSubmitting}
            type="checkbox"
            onChange={() => onToggleStatus(attribute)}
          />
          <span />
        </label>
        <button
          className="secondary-button compact-button"
          disabled={isSubmitting}
          type="button"
          onClick={() => onRemove(attribute.id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
});

function sortAttributes(left: AdminAttribute, right: AdminAttribute) {
  return left.name.localeCompare(right.name);
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
