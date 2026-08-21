"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminAttribute,
  AdminCategory,
  assignAdminCategoryAttribute,
  createAdminCategory,
  getAdminAttributes,
  getAdminCategories,
} from "@/lib/api/admin";

type SelectedCategoryAttribute = {
  attributeDefinitionId: string;
  isRequired: boolean;
  isVariantAttribute: boolean;
  sortOrder: number;
};

export default function AddCategoryPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [attributeDefinitionId, setAttributeDefinitionId] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState<
    SelectedCategoryAttribute[]
  >([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const [nextCategories, nextAttributes] = await Promise.all([
          getAdminCategories(token),
          getAdminAttributes(token),
        ]);

        if (isMounted) {
          setCategories(nextCategories);
          setAttributes(nextAttributes);
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load category form data",
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

  const parentOptions = useMemo(() => {
    return categories.filter((category) => category.isActive);
  }, [categories]);

  function handleNameChange(nextName: string) {
    setName(nextName);

    if (!slug) {
      setSlug(toSlug(nextName));
    }
  }

  function addSelectedAttribute() {
    if (!attributeDefinitionId) {
      return;
    }

    setSelectedAttributes((currentAttributes) => {
      const existingAttribute = currentAttributes.find(
        (attribute) =>
          attribute.attributeDefinitionId === attributeDefinitionId,
      );

      if (existingAttribute) {
        return currentAttributes;
      }

      return [
        ...currentAttributes,
        {
          attributeDefinitionId,
          isRequired: false,
          isVariantAttribute: false,
          sortOrder: currentAttributes.length,
        },
      ];
    });
    setAttributeDefinitionId("");
  }

  function removeSelectedAttribute(attributeDefinitionIdToRemove: string) {
    setSelectedAttributes((currentAttributes) =>
      currentAttributes.filter(
        (attribute) =>
          attribute.attributeDefinitionId !== attributeDefinitionIdToRemove,
      ),
    );
  }

  function updateSelectedAttribute(
    attributeDefinitionId: string,
    updates: Partial<SelectedCategoryAttribute>,
  ) {
    setSelectedAttributes((currentAttributes) =>
      currentAttributes.map((attribute) =>
        attribute.attributeDefinitionId === attributeDefinitionId
          ? {
              ...attribute,
              ...updates,
            }
          : attribute,
      ),
    );
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
      const category = await createAdminCategory(accessToken, {
        name,
        slug,
        description: description || undefined,
        parentId: parentId || undefined,
        isActive,
      });

      await Promise.all(
        selectedAttributes.map((attribute) =>
          assignAdminCategoryAttribute(accessToken, category.id, attribute),
        ),
      );

      setSuccess("Category created successfully");
      setName("");
      setSlug("");
      setDescription("");
      setParentId("");
      setIsActive(true);
      setAttributeDefinitionId("");
      setSelectedAttributes([]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create category",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Add Category</h1>
          <p>Create root categories or nested child categories.</p>
        </div>
        <Link className="secondary-link-button" href="/admin/categories">
          Back to Categories
        </Link>
      </section>

      <section className="form-surface">
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="split-fields">
            <label>
              Category name
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

          <label>
            Parent category
            <select
              disabled={isLoading}
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">No parent - root category</option>
              {parentOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
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

          <label className="checkbox-field">
            <input
              checked={isActive}
              type="checkbox"
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active category
          </label>

          <div className="form-divider" />

          <section className="attribute-assignment">
            <div className="section-title">
              <div>
                <h2>Category Attributes</h2>
                <p>
                  Select an existing attribute definition, then configure how it
                  behaves in this category.
                </p>
              </div>
            </div>

            <div className="attribute-select-row">
              <label>
                Attribute definition
                <select
                  disabled={isLoading}
                  value={attributeDefinitionId}
                  onChange={(event) =>
                    setAttributeDefinitionId(event.target.value)
                  }
                >
                  <option value="">Select attribute definition</option>
                  {attributes.map((attribute) => (
                    <option key={attribute.id} value={attribute.id}>
                      {attribute.name} ({attribute.dataType.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary-button"
                type="button"
                disabled={!attributeDefinitionId}
                onClick={addSelectedAttribute}
              >
                Add Category Attribute
              </button>
            </div>

            <div className="attribute-picker">
              {selectedAttributes.map((selectedAttribute) => {
                const attribute = attributes.find(
                  (currentAttribute) =>
                    currentAttribute.id ===
                    selectedAttribute.attributeDefinitionId,
                );

                if (!attribute) {
                  return null;
                }

                return (
                  <article className="attribute-picker-row" key={attribute.id}>
                    <div className="attribute-picker-heading">
                      <span>
                        <strong>{attribute.name}</strong>
                        <small>{attribute.dataType.replace("_", " ")}</small>
                      </span>
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        onClick={() => removeSelectedAttribute(attribute.id)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="attribute-picker-controls">
                      <label className="checkbox-field">
                        <input
                          checked={selectedAttribute.isRequired}
                          type="checkbox"
                          onChange={(event) =>
                            updateSelectedAttribute(attribute.id, {
                              isRequired: event.target.checked,
                            })
                          }
                        />
                        Required
                      </label>
                      <label className="checkbox-field">
                        <input
                          checked={selectedAttribute.isVariantAttribute}
                          type="checkbox"
                          onChange={(event) =>
                            updateSelectedAttribute(attribute.id, {
                              isVariantAttribute: event.target.checked,
                            })
                          }
                        />
                        Variant
                      </label>
                      <label>
                        Sort
                        <input
                          min={0}
                          type="number"
                          value={selectedAttribute.sortOrder}
                          onChange={(event) =>
                            updateSelectedAttribute(attribute.id, {
                              sortOrder: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
              {selectedAttributes.length === 0 ? (
                <p className="muted-text">
                  No category attributes selected yet.
                </p>
              ) : null}
            </div>
          </section>

          {success ? <p className="form-success">{success}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Category"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => router.push("/admin/categories")}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
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
