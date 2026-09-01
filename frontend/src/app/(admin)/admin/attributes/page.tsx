"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminAttribute,
  AdminAttributeOption,
  PaginatedAdminAttributeOptions,
  PaginatedAdminAttributes,
  deleteAdminAttribute,
  deleteAdminAttributeOption,
  getAdminAttributeOptionsPage,
  getAdminAttributesPage,
  setAdminAttributeActive,
  setAdminAttributeOptionActive,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const pageSize = 10;

const typeLabels: Record<AdminAttribute["dataType"], string> = {
  TEXT: "Text",
  NUMBER: "Number",
  BOOLEAN: "Boolean",
  SELECT: "Select",
  MULTI_SELECT: "Multi select",
};

export default function AdminAttributesPage() {
  const { accessToken } = useAuth();
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [selectedAttributeId, setSelectedAttributeId] = useState<string | null>(
    null,
  );
  const [attributeSearch, setAttributeSearch] = useState("");
  const [attributeStatusFilter, setAttributeStatusFilter] = useState("all");
  const [attributeTypeFilter, setAttributeTypeFilter] = useState("all");
  const [attributePage, setAttributePage] = useState(1);
  const [attributePagination, setAttributePagination] =
    useState<PaginatedAdminAttributes | null>(null);
  const [options, setOptions] = useState<AdminAttributeOption[]>([]);
  const [optionSearch, setOptionSearch] = useState("");
  const [optionStatusFilter, setOptionStatusFilter] = useState("all");
  const [optionPage, setOptionPage] = useState(1);
  const [optionPagination, setOptionPagination] =
    useState<PaginatedAdminAttributeOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedAttributeSearch = useDebouncedValue(attributeSearch, 350);
  const debouncedOptionSearch = useDebouncedValue(optionSearch, 350);

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
        const nextPage = await getAdminAttributesPage(token, {
          page: attributePage,
          pageSize,
          search: debouncedAttributeSearch,
          status: attributeStatusFilter,
          dataType: attributeTypeFilter,
        });

        if (isMounted) {
          setAttributes(nextPage.items);
          setAttributePagination(nextPage);
          setSelectedAttributeId((currentId) => {
            if (currentId && nextPage.items.some((item) => item.id === currentId)) {
              return currentId;
            }

            return nextPage.items[0]?.id ?? null;
          });
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
  }, [
    accessToken,
    attributePage,
    attributeStatusFilter,
    attributeTypeFilter,
    debouncedAttributeSearch,
  ]);

  const selectedAttribute = useMemo(() => {
    return (
      attributes.find((attribute) => attribute.id === selectedAttributeId) ??
      null
    );
  }, [attributes, selectedAttributeId]);

  useEffect(() => {
    let isMounted = true;

    if (!accessToken || !selectedAttribute || !isOptionAttribute(selectedAttribute)) {
      queueMicrotask(() => {
        if (isMounted) {
          setOptions([]);
          setOptionPagination(null);
        }
      });

      return () => {
        isMounted = false;
      };
    }

    const token = accessToken;
    const attributeId = selectedAttribute.id;

    async function loadOptions() {
      setError(null);
      setIsLoadingOptions(true);

      try {
        const nextPage = await getAdminAttributeOptionsPage(token, attributeId, {
          page: optionPage,
          pageSize,
          search: debouncedOptionSearch,
          status: optionStatusFilter,
        });

        if (isMounted) {
          setOptions(nextPage.items);
          setOptionPagination(nextPage);
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
  }, [
    accessToken,
    debouncedOptionSearch,
    optionPage,
    optionStatusFilter,
    selectedAttribute,
  ]);

  const attributeCountLabel = useMemo(() => {
    if (!attributePagination) {
      return "0 shown";
    }

    return `${attributes.length} of ${attributePagination.total} shown`;
  }, [attributePagination, attributes.length]);

  const optionCountLabel = useMemo(() => {
    if (!optionPagination) {
      return "0 shown";
    }

    return `${options.length} of ${optionPagination.total} shown`;
  }, [optionPagination, options.length]);

  const selectAttribute = useCallback((attributeId: string) => {
    setSelectedAttributeId(attributeId);
    setOptionSearch("");
    setOptionStatusFilter("all");
    setOptionPage(1);
  }, []);

  const toggleAttributeStatus = useCallback(async (attribute: AdminAttribute) => {
    if (!accessToken) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

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
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update attribute status",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken]);

  const removeAttribute = useCallback(async (attributeId: string) => {
    if (!accessToken) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await deleteAdminAttribute(accessToken, attributeId);
      setAttributes((currentAttributes) =>
        currentAttributes.filter((attribute) => attribute.id !== attributeId),
      );
      setSelectedAttributeId((currentId) =>
        currentId === attributeId ? null : currentId,
      );
      setAttributePagination((currentPagination) =>
        currentPagination
          ? {
              ...currentPagination,
              total: Math.max(currentPagination.total - 1, 0),
            }
          : currentPagination,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete attribute",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken]);

  const toggleOptionStatus = useCallback(async (option: AdminAttributeOption) => {
    if (!accessToken || !selectedAttribute) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const updatedOption = await setAdminAttributeOptionActive(
        accessToken,
        selectedAttribute.id,
        option.id,
        !option.isActive,
      );

      setOptions((currentOptions) =>
        currentOptions.map((currentOption) =>
          currentOption.id === option.id ? updatedOption : currentOption,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update option status",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, selectedAttribute]);

  const removeOption = useCallback(async (optionId: string) => {
    if (!accessToken || !selectedAttribute) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await deleteAdminAttributeOption(accessToken, selectedAttribute.id, optionId);
      setOptions((currentOptions) =>
        currentOptions.filter((option) => option.id !== optionId),
      );
      setOptionPagination((currentPagination) =>
        currentPagination
          ? {
              ...currentPagination,
              total: Math.max(currentPagination.total - 1, 0),
            }
          : currentPagination,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete option",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, selectedAttribute]);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Attributes</h1>
          <p>View attribute definitions and their selectable options.</p>
        </div>
        <div className="form-actions">
          <Link className="primary-link-button" href="/admin/attributes/add">
            Add Definition
          </Link>
          <Link
            className="secondary-link-button"
            href="/admin/attributes/options/add"
          >
            Add Option
          </Link>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="attribute-view-layout">
        <aside className="definition-list-panel">
          <div className="section-title">
            <div>
              <h2>Definitions</h2>
              <p>{attributeCountLabel}</p>
            </div>
          </div>

          <div className="definition-filters">
            <input
              aria-label="Search definitions"
              placeholder="Search definitions"
              value={attributeSearch}
              onChange={(event) => {
                setAttributeSearch(event.target.value);
                setAttributePage(1);
              }}
            />
            <select
              aria-label="Filter definition type"
              value={attributeTypeFilter}
              onChange={(event) => {
                setAttributeTypeFilter(event.target.value);
                setAttributePage(1);
              }}
            >
              <option value="all">All types</option>
              <option value="TEXT">Text</option>
              <option value="NUMBER">Number</option>
              <option value="BOOLEAN">Boolean</option>
              <option value="SELECT">Select</option>
              <option value="MULTI_SELECT">Multi select</option>
            </select>
            <select
              aria-label="Filter definition status"
              value={attributeStatusFilter}
              onChange={(event) => {
                setAttributeStatusFilter(event.target.value);
                setAttributePage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="attribute-view-list">
            {isLoadingAttributes ? (
              <p className="muted-text">Loading definitions...</p>
            ) : (
              attributes.map((attribute) => (
                <AttributeViewRow
                  attribute={attribute}
                  isSelected={attribute.id === selectedAttributeId}
                  isSubmitting={isSubmitting}
                  key={attribute.id}
                  onRemove={removeAttribute}
                  onSelect={selectAttribute}
                  onToggleStatus={toggleAttributeStatus}
                />
              ))
            )}
            {!isLoadingAttributes && attributes.length === 0 ? (
              <p className="muted-text">No definitions match these filters.</p>
            ) : null}
          </div>

          <PaginationControls
            currentPage={attributePagination?.page ?? attributePage}
            disabled={isLoadingAttributes}
            hasNextPage={Boolean(attributePagination?.hasNextPage)}
            hasPreviousPage={Boolean(attributePagination?.hasPreviousPage)}
            onNext={() => setAttributePage((currentPage) => currentPage + 1)}
            onPrevious={() =>
              setAttributePage((currentPage) => Math.max(currentPage - 1, 1))
            }
            totalPages={attributePagination?.totalPages ?? 1}
          />
        </aside>

        <section className="definition-detail-panel">
          {selectedAttribute ? (
            <>
              <div className="section-title">
                <div>
                  <h2>{selectedAttribute.name}</h2>
                  <p>{selectedAttribute.slug}</p>
                </div>
                <span>{selectedAttribute.isActive ? "Active" : "Inactive"}</span>
              </div>

              <dl className="attribute-detail-grid">
                <div>
                  <dt>Type</dt>
                  <dd>{typeLabels[selectedAttribute.dataType]}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{new Date(selectedAttribute.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{new Date(selectedAttribute.updatedAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{selectedAttribute.description ?? "No description"}</dd>
                </div>
              </dl>

              {isOptionAttribute(selectedAttribute) ? (
                <section className="option-view-section">
                  <div className="section-title">
                    <div>
                      <h2>Options</h2>
                      <p>{optionCountLabel}</p>
                    </div>
                  </div>

                  <div className="definition-filters">
                    <input
                      aria-label="Search options"
                      placeholder="Search options"
                      value={optionSearch}
                      onChange={(event) => {
                        setOptionSearch(event.target.value);
                        setOptionPage(1);
                      }}
                    />
                    <select
                      aria-label="Filter option status"
                      value={optionStatusFilter}
                      onChange={(event) => {
                        setOptionStatusFilter(event.target.value);
                        setOptionPage(1);
                      }}
                    >
                      <option value="all">All statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="attribute-view-list">
                    {isLoadingOptions ? (
                      <p className="muted-text">Loading options...</p>
                    ) : (
                      options.map((option) => (
                        <OptionViewRow
                          isSubmitting={isSubmitting}
                          key={option.id}
                          onRemove={removeOption}
                          onToggleStatus={toggleOptionStatus}
                          option={option}
                        />
                      ))
                    )}
                    {!isLoadingOptions && options.length === 0 ? (
                      <p className="muted-text">
                        No options match these filters.
                      </p>
                    ) : null}
                  </div>

                  <PaginationControls
                    currentPage={optionPagination?.page ?? optionPage}
                    disabled={isLoadingOptions}
                    hasNextPage={Boolean(optionPagination?.hasNextPage)}
                    hasPreviousPage={Boolean(optionPagination?.hasPreviousPage)}
                    onNext={() => setOptionPage((currentPage) => currentPage + 1)}
                    onPrevious={() =>
                      setOptionPage((currentPage) => Math.max(currentPage - 1, 1))
                    }
                    totalPages={optionPagination?.totalPages ?? 1}
                  />
                </section>
              ) : (
                <p className="muted-text">
                  This definition does not use selectable options.
                </p>
              )}
            </>
          ) : (
            <p className="muted-text">Select a definition to view details.</p>
          )}
        </section>
      </section>
    </main>
  );
}

type AttributeViewRowProps = {
  attribute: AdminAttribute;
  isSelected: boolean;
  isSubmitting: boolean;
  onRemove: (attributeId: string) => void;
  onSelect: (attributeId: string) => void;
  onToggleStatus: (attribute: AdminAttribute) => void;
};

const AttributeViewRow = memo(function AttributeViewRow({
  attribute,
  isSelected,
  isSubmitting,
  onRemove,
  onSelect,
  onToggleStatus,
}: AttributeViewRowProps) {
  return (
    <article className={`attribute-view-row ${isSelected ? "active" : ""}`}>
      <button
        className="attribute-view-select"
        type="button"
        onClick={() => onSelect(attribute.id)}
      >
        <strong>{attribute.name}</strong>
        <small>
          {typeLabels[attribute.dataType]} · {attribute.slug}
        </small>
      </button>
      <span>{attribute.isActive ? "Active" : "Inactive"}</span>
      <div className="row-actions">
        <StatusSwitch
          checked={attribute.isActive}
          disabled={isSubmitting}
          label={
            attribute.isActive
              ? "Deactivate attribute definition"
              : "Activate attribute definition"
          }
          onChange={() => onToggleStatus(attribute)}
        />
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

type OptionViewRowProps = {
  option: AdminAttributeOption;
  isSubmitting: boolean;
  onRemove: (optionId: string) => void;
  onToggleStatus: (option: AdminAttributeOption) => void;
};

const OptionViewRow = memo(function OptionViewRow({
  option,
  isSubmitting,
  onRemove,
  onToggleStatus,
}: OptionViewRowProps) {
  return (
    <article className="attribute-view-row">
      <div className="attribute-view-select">
        <strong>{option.label}</strong>
        <small>{option.value}</small>
      </div>
      <span>Sort {option.sortOrder}</span>
      <span>{option.isActive ? "Active" : "Inactive"}</span>
      <div className="row-actions">
        <StatusSwitch
          checked={option.isActive}
          disabled={isSubmitting}
          label={
            option.isActive
              ? "Deactivate attribute option"
              : "Activate attribute option"
          }
          onChange={() => onToggleStatus(option)}
        />
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
    <label className="status-switch" aria-label={label}>
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
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNext: () => void;
  onPrevious: () => void;
  totalPages: number;
};

const PaginationControls = memo(function PaginationControls({
  currentPage,
  disabled,
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
  totalPages,
}: PaginationControlsProps) {
  return (
    <div className="pagination-actions">
      <button
        className="secondary-button compact-button"
        disabled={disabled || !hasPreviousPage}
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
        disabled={disabled || !hasNextPage}
        type="button"
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
});

function isOptionAttribute(attribute: AdminAttribute) {
  return (
    attribute.dataType === "SELECT" || attribute.dataType === "MULTI_SELECT"
  );
}
