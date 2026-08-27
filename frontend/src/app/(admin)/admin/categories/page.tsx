"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
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
  AdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type CategoryTreeNode = AdminCategory & {
  children: CategoryTreeNode[];
};

const pageSize = 8;

export default function AdminCategoriesPage() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

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

  const childrenByParentId = useMemo(() => {
    const groupedCategories = new Map<string, AdminCategory[]>();

    for (const category of categories) {
      const parentKey = category.parentId ?? "root";
      const siblings = groupedCategories.get(parentKey) ?? [];
      siblings.push(category);
      groupedCategories.set(parentKey, siblings);
    }

    for (const siblings of groupedCategories.values()) {
      siblings.sort(sortCategories);
    }

    return groupedCategories;
  }, [categories]);

  const selectedCategory = selectedCategoryId
    ? categoriesById.get(selectedCategoryId) ?? null
    : null;

  const selectedChildren = selectedCategory
    ? childrenByParentId.get(selectedCategory.id) ?? []
    : [];

  const parentCategory = selectedCategory?.parentId
    ? categoriesById.get(selectedCategory.parentId) ?? null
    : null;

  const categoryTree = useMemo(() => {
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
    const visibleIds = new Set<string>();

    for (const category of categories) {
      const matchesSearch =
        !normalizedSearch ||
        category.name.toLowerCase().includes(normalizedSearch) ||
        category.slug.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && category.isActive) ||
        (statusFilter === "inactive" && !category.isActive);

      if (matchesSearch && matchesStatus) {
        let currentCategory: AdminCategory | undefined = category;

        while (currentCategory) {
          visibleIds.add(currentCategory.id);
          currentCategory = currentCategory.parentId
            ? categoriesById.get(currentCategory.parentId)
            : undefined;
        }
      }
    }

    function buildNode(category: AdminCategory): CategoryTreeNode {
      const children = (childrenByParentId.get(category.id) ?? [])
        .filter((childCategory) => visibleIds.has(childCategory.id))
        .map(buildNode);

      return {
        ...category,
        children,
      };
    }

    return (childrenByParentId.get("root") ?? [])
      .filter((category) => visibleIds.has(category.id))
      .map(buildNode);
  }, [
    categories,
    categoriesById,
    childrenByParentId,
    debouncedSearchTerm,
    statusFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(categoryTree.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRootCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return categoryTree.slice(startIndex, startIndex + pageSize);
  }, [categoryTree, currentPage]);

  const editParentOptions = useMemo(() => {
    if (!selectedCategory) {
      return categories;
    }

    const excludedIds = getDescendantIds(selectedCategory.id, childrenByParentId);
    excludedIds.add(selectedCategory.id);

    return categories.filter((category) => !excludedIds.has(category.id));
  }, [categories, childrenByParentId, selectedCategory]);

  const openCategory = useCallback((category: AdminCategory) => {
    setSelectedCategoryId(category.id);
    setIsEditing(false);
    setModalError(null);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedCategoryId(null);
    setIsEditing(false);
    setModalError(null);
  }, []);

  const startEditing = useCallback(() => {
    if (!selectedCategory) {
      return;
    }

    setEditName(selectedCategory.name);
    setEditDescription(selectedCategory.description ?? "");
    setEditParentId(selectedCategory.parentId);
    setEditIsActive(selectedCategory.isActive);
    setIsEditing(true);
    setModalError(null);
  }, [selectedCategory]);

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(categoryId)) {
        nextIds.delete(categoryId);
      } else {
        nextIds.add(categoryId);
      }

      return nextIds;
    });
  }, []);

  const saveCategory = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !selectedCategory) {
        return;
      }

      setIsSubmitting(true);
      setModalError(null);

      try {
        const updatedCategory = await updateAdminCategory(
          accessToken,
          selectedCategory.id,
          {
            name: editName,
            description: editDescription || undefined,
            parentId: editParentId,
            isActive: editIsActive,
          },
        );

        setCategories((currentCategories) =>
          currentCategories.map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category,
          ),
        );
        setSelectedCategoryId(updatedCategory.id);
        setIsEditing(false);
      } catch (caughtError) {
        setModalError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update category",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      accessToken,
      editDescription,
      editIsActive,
      editName,
      editParentId,
      selectedCategory,
    ],
  );

  const removeCategory = useCallback(async () => {
    if (!accessToken || !selectedCategory) {
      return;
    }

    if (selectedChildren.length > 0) {
      setModalError("Remove child categories before deleting this category.");
      return;
    }

    if (selectedCategory.parentId) {
      setModalError("Remove the parent category before deleting this category.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      await deleteAdminCategory(accessToken, selectedCategory.id);
      setCategories((currentCategories) =>
        currentCategories.filter(
          (category) => category.id !== selectedCategory.id,
        ),
      );
      closeModal();
    } catch (caughtError) {
      setModalError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete category",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, closeModal, selectedCategory, selectedChildren.length]);

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
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Filter category status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="catalog-section">
        <div className="section-title">
          <h2>Category Tree</h2>
          <span>{categoryTree.length} roots</span>
        </div>
        {isLoading ? (
          <p className="muted-text">Loading categories...</p>
        ) : (
          <>
            <div className="category-tree-list">
              {visibleRootCategories.map((category) => (
                <CategoryTreeRow
                  category={category}
                  expandedIds={expandedIds}
                  key={category.id}
                  level={0}
                  onOpen={openCategory}
                  onToggleExpanded={toggleExpanded}
                />
              ))}
              {categoryTree.length === 0 ? (
                <p className="muted-text">No categories match these filters.</p>
              ) : null}
            </div>
            <PaginationControls
              currentPage={currentPage}
              disabled={isLoading}
              hasNextPage={currentPage < totalPages}
              hasPreviousPage={currentPage > 1}
              totalPages={totalPages}
              onNext={() => setPage((currentPage) => currentPage + 1)}
              onPrevious={() =>
                setPage((currentPage) => Math.max(currentPage - 1, 1))
              }
            />
          </>
        )}
      </section>

      {selectedCategory ? (
        <CategoryDetailModal
          category={selectedCategory}
          childrenCount={selectedChildren.length}
          error={modalError}
          isEditing={isEditing}
          isSubmitting={isSubmitting}
          parentCategory={parentCategory}
          parentOptions={editParentOptions}
          values={{
            name: editName,
            description: editDescription,
            parentId: editParentId,
            isActive: editIsActive,
          }}
          onChangeDescription={setEditDescription}
          onChangeIsActive={setEditIsActive}
          onChangeName={setEditName}
          onChangeParentId={setEditParentId}
          onClose={closeModal}
          onDelete={removeCategory}
          onEdit={startEditing}
          onSave={saveCategory}
        />
      ) : null}
    </main>
  );
}

type CategoryTreeRowProps = {
  category: CategoryTreeNode;
  expandedIds: Set<string>;
  level: number;
  onOpen: (category: AdminCategory) => void;
  onToggleExpanded: (categoryId: string) => void;
};

const CategoryTreeRow = memo(function CategoryTreeRow({
  category,
  expandedIds,
  level,
  onOpen,
  onToggleExpanded,
}: CategoryTreeRowProps) {
  const isExpanded = expandedIds.has(category.id);
  const hasChildren = category.children.length > 0;

  return (
    <div className="category-tree-branch">
      <article
        className="category-tree-row"
        style={{ "--level": level } as CSSProperties}
      >
        <button
          aria-label={
            isExpanded
              ? `Collapse ${category.name}`
              : `Expand ${category.name}`
          }
          className="category-tree-toggle"
          disabled={!hasChildren}
          type="button"
          onClick={() => onToggleExpanded(category.id)}
        >
          {hasChildren ? (isExpanded ? "-" : "+") : ""}
        </button>
        <button
          className="category-tree-main"
          type="button"
          onClick={() => onOpen(category)}
        >
          <strong>{category.name}</strong>
          <small>{category.slug}</small>
        </button>
        <span>{category.isActive ? "Active" : "Inactive"}</span>
        <span>
          {hasChildren
            ? `${category.children.length} child${
                category.children.length === 1 ? "" : "ren"
              }`
            : "Leaf"}
        </span>
      </article>
      {isExpanded ? (
        <div className="category-tree-children">
          {category.children.map((childCategory) => (
            <CategoryTreeRow
              category={childCategory}
              expandedIds={expandedIds}
              key={childCategory.id}
              level={level + 1}
              onOpen={onOpen}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
});

type CategoryDetailModalProps = {
  category: AdminCategory;
  childrenCount: number;
  error: string | null;
  isEditing: boolean;
  isSubmitting: boolean;
  parentCategory: AdminCategory | null;
  parentOptions: AdminCategory[];
  values: {
    name: string;
    description: string;
    parentId: string | null;
    isActive: boolean;
  };
  onChangeDescription: (value: string) => void;
  onChangeIsActive: (value: boolean) => void;
  onChangeName: (value: string) => void;
  onChangeParentId: (value: string | null) => void;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
};

const CategoryDetailModal = memo(function CategoryDetailModal({
  category,
  childrenCount,
  error,
  isEditing,
  isSubmitting,
  parentCategory,
  parentOptions,
  values,
  onChangeDescription,
  onChangeIsActive,
  onChangeName,
  onChangeParentId,
  onClose,
  onDelete,
  onEdit,
  onSave,
}: CategoryDetailModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="category-detail-title"
        className="modal-panel"
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Category</p>
            <h2 id="category-detail-title">{category.name}</h2>
          </div>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {isEditing ? (
          <form className="admin-form compact-admin-form" onSubmit={onSave}>
            <label>
              Category name
              <input
                required
                value={values.name}
                onChange={(event) => onChangeName(event.target.value)}
              />
            </label>
            <label>
              Slug
              <input disabled value={category.slug} />
            </label>
            <label>
              Parent category
              <select
                value={values.parentId ?? ""}
                onChange={(event) =>
                  onChangeParentId(event.target.value || null)
                }
              >
                <option value="">No parent - root category</option>
                {parentOptions.map((parentOption) => (
                  <option key={parentOption.id} value={parentOption.id}>
                    {parentOption.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                rows={4}
                value={values.description}
                onChange={(event) => onChangeDescription(event.target.value)}
              />
            </label>
            <label className="checkbox-field">
              <input
                checked={values.isActive}
                type="checkbox"
                onChange={(event) => onChangeIsActive(event.target.checked)}
              />
              Active category
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button
                className="primary-button"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
              <button
                className="secondary-button"
                disabled={isSubmitting}
                type="button"
                onClick={onEdit}
              >
                Reset
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="category-detail-grid">
              <div>
                <dt>Name</dt>
                <dd>{category.name}</dd>
              </div>
              <div>
                <dt>Slug</dt>
                <dd>{category.slug}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{category.isActive ? "Active" : "Inactive"}</dd>
              </div>
              <div>
                <dt>Parent</dt>
                <dd>{parentCategory?.name ?? "Root category"}</dd>
              </div>
              <div>
                <dt>Child Categories</dt>
                <dd>{childrenCount}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(category.createdAt)}</dd>
              </div>
              <div className="category-detail-description">
                <dt>Description</dt>
                <dd>{category.description || "No description"}</dd>
              </div>
            </dl>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button
                className="primary-button"
                disabled={isSubmitting}
                type="button"
                onClick={onEdit}
              >
                Edit
              </button>
              <button
                className="secondary-button"
                disabled={isSubmitting}
                type="button"
                onClick={onDelete}
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
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

function getDescendantIds(
  categoryId: string,
  childrenByParentId: Map<string, AdminCategory[]>,
) {
  const descendantIds = new Set<string>();
  const pendingCategories = [...(childrenByParentId.get(categoryId) ?? [])];

  while (pendingCategories.length > 0) {
    const category = pendingCategories.pop();

    if (!category || descendantIds.has(category.id)) {
      continue;
    }

    descendantIds.add(category.id);
    pendingCategories.push(...(childrenByParentId.get(category.id) ?? []));
  }

  return descendantIds;
}

function sortCategories(first: AdminCategory, second: AdminCategory) {
  return first.name.localeCompare(second.name);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
