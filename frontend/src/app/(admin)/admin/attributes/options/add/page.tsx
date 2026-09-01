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
  AdminAttributeOption,
  AdminAttributeOptionValueAvailability,
  PaginatedAdminAttributeOptions,
  checkAdminAttributeOptionValueAvailability,
  createAdminAttributeOption,
  deleteAdminAttributeOption,
  getAdminAttributeOptionsPage,
  getAdminAttributes,
  setAdminAttributeOptionActive,
  updateAdminAttributeOption,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const pageSize = 10;
const valuePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function AddAttributeOptionPage() {
  const { accessToken } = useAuth();
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [options, setOptions] = useState<AdminAttributeOption[]>([]);
  const [attributeId, setAttributeId] = useState("");
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] =
    useState<PaginatedAdminAttributeOptions | null>(null);
  const [valueStatus, setValueStatus] =
    useState<AdminAttributeOptionValueAvailability | null>(null);
  const [isCheckingValue, setIsCheckingValue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedValue = useDebouncedValue(value, 450);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadAttributes() {
      setError(null);
      setIsLoadingAttributes(true);

      try {
        const nextAttributes = await getAdminAttributes(token);

        if (isMounted) {
          setAttributes(nextAttributes);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load attributes",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingAttributes(false);
        }
      }
    }

    void loadAttributes();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    let isMounted = true;

    if (!accessToken || !attributeId) {
      queueMicrotask(() => {
        if (isMounted) {
          setOptions([]);
          setPagination(null);
        }
      });

      return () => {
        isMounted = false;
      };
    }

    const token = accessToken;
    const selectedAttributeId = attributeId;

    async function loadOptions() {
      setError(null);
      setIsLoadingOptions(true);

      try {
        const nextPage = await getAdminAttributeOptionsPage(
          token,
          selectedAttributeId,
          {
            page,
            pageSize,
            search: debouncedSearchTerm,
            status: statusFilter,
          },
        );

        if (isMounted) {
          setOptions(nextPage.items);
          setPagination(nextPage);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load attribute options",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, [accessToken, attributeId, debouncedSearchTerm, page, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    if (
      editingOptionId ||
      !accessToken ||
      !attributeId ||
      !debouncedValue ||
      !valuePattern.test(debouncedValue)
    ) {
      queueMicrotask(() => {
        if (isMounted) {
          setValueStatus(null);
          setIsCheckingValue(false);
        }
      });

      return () => {
        isMounted = false;
      };
    }

    const token = accessToken;
    const selectedAttributeId = attributeId;
    const valueSnapshot = debouncedValue;

    async function checkValue() {
      setIsCheckingValue(true);

      try {
        const nextStatus = await checkAdminAttributeOptionValueAvailability(
          token,
          selectedAttributeId,
          valueSnapshot,
        );

        if (isMounted) {
          setValueStatus(nextStatus);
        }
      } catch {
        if (isMounted) {
          setValueStatus(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingValue(false);
        }
      }
    }

    void checkValue();

    return () => {
      isMounted = false;
    };
  }, [accessToken, attributeId, debouncedValue, editingOptionId]);

  const optionAttributes = useMemo(() => {
    return attributes.filter(
      (attribute) =>
        attribute.isActive &&
        (attribute.dataType === "SELECT" ||
          attribute.dataType === "MULTI_SELECT"),
    );
  }, [attributes]);

  const selectedAttribute = useMemo(() => {
    return optionAttributes.find((attribute) => attribute.id === attributeId);
  }, [attributeId, optionAttributes]);

  const optionCountLabel = useMemo(() => {
    if (!pagination) {
      return "0 shown";
    }

    return `${options.length} of ${pagination.total} shown`;
  }, [options.length, pagination]);

  const valueIsValid = valuePattern.test(value);
  const valueIsAvailable =
    Boolean(editingOptionId) ||
    (valueStatus?.value === value && valueStatus.available);
  const canSubmit =
    Boolean(attributeId) &&
    Boolean(label.trim()) &&
    valueIsValid &&
    valueIsAvailable &&
    !isSubmitting &&
    !isCheckingValue;

  const handleAttributeChange = useCallback((nextAttributeId: string) => {
    setAttributeId(nextAttributeId);
    setEditingOptionId(null);
    setLabel("");
    setValue("");
    setSortOrder(0);
    setIsActive(true);
    setSearchTerm("");
    setStatusFilter("all");
    setPage(1);
    setValueStatus(null);
  }, []);

  const handleLabelChange = useCallback((nextLabel: string) => {
    setLabel(nextLabel);

    if (!value) {
      setValue(toOptionValue(nextLabel));
    }
  }, [value]);

  const resetForm = useCallback(() => {
    setEditingOptionId(null);
    setLabel("");
    setValue("");
    setSortOrder(0);
    setIsActive(true);
    setValueStatus(null);
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
      if (editingOptionId) {
        const updatedOption = await updateAdminAttributeOption(
          accessToken,
          attributeId,
          editingOptionId,
          {
            label,
            sortOrder,
          },
        );

        setOptions((currentOptions) =>
          currentOptions
            .map((option) =>
              option.id === editingOptionId ? updatedOption : option,
            )
            .sort(sortOptions),
        );
        setSuccess("Attribute option updated successfully");
      } else {
        const createdOption = await createAdminAttributeOption(
          accessToken,
          attributeId,
          {
            label,
            value,
            sortOrder,
            isActive,
          },
        );

        setOptions((currentOptions) =>
          [...currentOptions, createdOption].sort(sortOptions).slice(0, pageSize),
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
        setSuccess("Attribute option created successfully");
      }

      resetForm();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save attribute option",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    accessToken,
    attributeId,
    canSubmit,
    editingOptionId,
    isActive,
    label,
    resetForm,
    sortOrder,
    value,
  ]);

  const editOption = useCallback((option: AdminAttributeOption) => {
    setEditingOptionId(option.id);
    setLabel(option.label);
    setValue(option.value);
    setSortOrder(option.sortOrder);
    setIsActive(option.isActive);
    setSuccess(null);
    setError(null);
  }, []);

  const removeOption = useCallback(async (optionId: string) => {
    if (!accessToken || !attributeId) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await deleteAdminAttributeOption(accessToken, attributeId, optionId);
      setOptions((currentOptions) =>
        currentOptions.filter((option) => option.id !== optionId),
      );
      setPagination((currentPagination) =>
        currentPagination
          ? {
              ...currentPagination,
              total: Math.max(currentPagination.total - 1, 0),
            }
          : currentPagination,
      );

      if (editingOptionId === optionId) {
        resetForm();
      }

      setSuccess("Attribute option deleted successfully");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete attribute option",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, attributeId, editingOptionId, resetForm]);

  const toggleOptionStatus = useCallback(async (option: AdminAttributeOption) => {
    if (!accessToken || !attributeId) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const updatedOption = await setAdminAttributeOptionActive(
        accessToken,
        attributeId,
        option.id,
        !option.isActive,
      );

      setOptions((currentOptions) =>
        currentOptions.map((currentOption) =>
          currentOption.id === option.id ? updatedOption : currentOption,
        ),
      );

      if (editingOptionId === option.id) {
        setIsActive(updatedOption.isActive);
      }

      setSuccess(
        updatedOption.isActive
          ? "Attribute option activated"
          : "Attribute option deactivated",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update attribute option status",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, attributeId, editingOptionId]);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Attribute Option</h1>
          <p>Add and manage selectable values for attribute definitions.</p>
        </div>
        <Link className="secondary-link-button" href="/admin/attributes">
          Back to Attributes
        </Link>
      </section>

      <section className="definition-workspace">
        <section className="form-surface definition-form-surface">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="section-title">
              <div>
                <h2>{editingOptionId ? "Edit Option" : "New Option"}</h2>
                <p>
                  Option value availability is checked automatically after
                  typing stops.
                </p>
              </div>
            </div>

            <label>
              Attribute definition
              <select
                disabled={isLoadingAttributes || Boolean(editingOptionId)}
                value={attributeId}
                onChange={(event) => handleAttributeChange(event.target.value)}
                required
              >
                <option value="">Select attribute</option>
                {optionAttributes.map((attribute) => (
                  <option key={attribute.id} value={attribute.id}>
                    {attribute.name} ({attribute.dataType.replace("_", " ")})
                  </option>
                ))}
              </select>
            </label>

            <div className="split-fields">
              <label>
                Option label
                <input
                  value={label}
                  onChange={(event) => handleLabelChange(event.target.value)}
                  required
                />
              </label>
              <label>
                Option value
                <input
                  disabled={Boolean(editingOptionId)}
                  value={value}
                  onChange={(event) =>
                    setValue(toOptionValue(event.target.value))
                  }
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  required
                />
                {value && !editingOptionId ? (
                  <span
                    className={
                      valueIsAvailable
                        ? "field-status available"
                        : "field-status unavailable"
                    }
                  >
                    {isCheckingValue
                      ? "Checking..."
                      : !valueIsValid
                        ? "Use lowercase letters, numbers, and hyphens"
                        : valueIsAvailable
                          ? "Value available"
                          : "Value already used"}
                  </span>
                ) : null}
              </label>
            </div>

            <label>
              Sort order
              <input
                min={0}
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(Number(event.target.value))}
              />
            </label>

            {editingOptionId ? (
              <p className="muted-text">
                Attribute definition and option value are locked after creation.
                Use the status toggle in the option list to activate or
                deactivate.
              </p>
            ) : (
              <label className="checkbox-field">
                <input
                  checked={isActive}
                  type="checkbox"
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                Active option
              </label>
            )}

            {optionAttributes.length === 0 && !isLoadingAttributes ? (
              <p className="form-error">
                Create a SELECT or MULTI_SELECT attribute before adding options.
              </p>
            ) : null}
            {success ? <p className="form-success">{success}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}

            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={!canSubmit || optionAttributes.length === 0}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingOptionId
                    ? "Update Option"
                    : "Create Option"}
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
              <h2>Available Options</h2>
              <p>{selectedAttribute ? optionCountLabel : "Select attribute"}</p>
            </div>
          </div>

          <div className="definition-filters">
            <input
              aria-label="Search options"
              disabled={!attributeId}
              placeholder="Search options"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
            />
            <select
              aria-label="Filter option status"
              disabled={!attributeId}
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
            {isLoadingOptions ? (
              <p className="muted-text">Loading options...</p>
            ) : (
              options.map((option) => (
                <OptionRow
                  isSubmitting={isSubmitting}
                  key={option.id}
                  onEdit={editOption}
                  onRemove={removeOption}
                  onToggleStatus={toggleOptionStatus}
                  option={option}
                />
              ))
            )}
            {!isLoadingOptions && attributeId && options.length === 0 ? (
              <p className="muted-text">No options match these filters.</p>
            ) : null}
            {!attributeId ? (
              <p className="muted-text">
                Select an attribute definition to view its options.
              </p>
            ) : null}
          </div>

          <div className="pagination-actions">
            <button
              className="secondary-button compact-button"
              disabled={isLoadingOptions || !pagination?.hasPreviousPage}
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
              disabled={isLoadingOptions || !pagination?.hasNextPage}
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

type OptionRowProps = {
  option: AdminAttributeOption;
  isSubmitting: boolean;
  onEdit: (option: AdminAttributeOption) => void;
  onRemove: (optionId: string) => void;
  onToggleStatus: (option: AdminAttributeOption) => void;
};

const OptionRow = memo(function OptionRow({
  option,
  isSubmitting,
  onEdit,
  onRemove,
  onToggleStatus,
}: OptionRowProps) {
  return (
    <article className="definition-row">
      <div>
        <strong>{option.label}</strong>
        <small>{option.value}</small>
      </div>
      <span>Sort {option.sortOrder}</span>
      <span>{option.isActive ? "Active" : "Inactive"}</span>
      <div className="row-actions">
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={() => onEdit(option)}
        >
          Edit
        </button>
        <label
          className="status-switch"
          aria-label={
            option.isActive
              ? "Deactivate attribute option"
              : "Activate attribute option"
          }
        >
          <input
            checked={option.isActive}
            disabled={isSubmitting}
            type="checkbox"
            onChange={() => onToggleStatus(option)}
          />
          <span />
        </label>
        <button
          className="secondary-button compact-button"
          disabled={isSubmitting}
          type="button"
          onClick={() => onRemove(option.id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
});

function sortOptions(left: AdminAttributeOption, right: AdminAttributeOption) {
  return left.sortOrder - right.sortOrder || left.label.localeCompare(right.label);
}

function toOptionValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
