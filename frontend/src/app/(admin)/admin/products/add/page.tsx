"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  ProductVariantForm,
  ProductVariantFormPayload,
} from "@/components/admin/product-variant-form";
import { useAuth } from "@/contexts/auth-context";
import {
  AdminAttribute,
  AdminAttributeOption,
  AdminProduct,
  AdminProductMetadataOptions,
  AdminProductImage,
  CreateAdminProductIngredientPayload,
  SetProductAttributeValuePayload,
  assignAdminVariantImages,
  assignAdminProductCategory,
  createAdminProduct,
  createAdminProductVariant,
  getAdminAttributeOptions,
  getAdminAttributes,
  getAdminProductMetadataOptions,
  setAdminProductAttributeValue,
  uploadAdminProductImages,
  uploadAdminVariantImages,
} from "@/lib/api/admin";

type AttributeFormValue = {
  selected: boolean;
  textValue: string;
  numberValue: string;
  booleanValue: boolean;
  optionId: string;
  optionIds: string[];
};

type ProductImageDraft = {
  file: File;
  key: string;
  previewUrl: string;
};

type VariantDraft = ProductVariantFormPayload;

const defaultMetadata: AdminProductMetadataOptions = {
  ingredients: [],
  audiences: [],
  skinTypes: [],
  ageGroups: [],
  hairProfiles: [],
  concerns: [],
  benefits: [],
  categories: [],
};

export default function AddProductPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [metadata, setMetadata] =
    useState<AdminProductMetadataOptions>(defaultMetadata);
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [attributeOptions, setAttributeOptions] = useState<
    Record<string, AdminAttributeOption[]>
  >({});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [usageInstructions, setUsageInstructions] = useState("");
  const [warnings, setWarnings] = useState("");
  const [status, setStatus] = useState<AdminProduct["status"]>("DRAFT");
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId] = useState("");
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>(
    [],
  );
  const [keyIngredientIds, setKeyIngredientIds] = useState<string[]>([]);
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>([]);
  const [selectedSkinTypeIds, setSelectedSkinTypeIds] = useState<string[]>([]);
  const [selectedAgeGroupIds, setSelectedAgeGroupIds] = useState<string[]>([]);
  const [selectedHairProfileIds, setSelectedHairProfileIds] = useState<
    string[]
  >([]);
  const [selectedConcernIds, setSelectedConcernIds] = useState<string[]>([]);
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<string[]>([]);
  const [attributeValues, setAttributeValues] = useState<
    Record<string, AttributeFormValue>
  >({});
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [imageDrafts, setImageDrafts] = useState<ProductImageDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCategories = useMemo(
    () => metadata.categories.filter((category) => category.isActive),
    [metadata.categories],
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;

    Promise.all([
      getAdminProductMetadataOptions(accessToken),
      getAdminAttributes(accessToken),
    ])
      .then(async ([nextMetadata, nextAttributes]) => {
        const selectableAttributes = nextAttributes.filter(
          (attribute) =>
            attribute.isActive &&
            ["SELECT", "MULTI_SELECT"].includes(attribute.dataType),
        );
        const optionEntries = await Promise.all(
          selectableAttributes.map(async (attribute) => {
            const options = await getAdminAttributeOptions(
              accessToken,
              attribute.id,
            );
            return [attribute.id, options] as const;
          }),
        );

        if (isMounted) {
          setMetadata(nextMetadata);
          setAttributes(nextAttributes.filter((attribute) => attribute.isActive));
          setAttributeOptions(Object.fromEntries(optionEntries));
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load product form data",
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
  }, [accessToken]);

  function handleNameChange(nextName: string) {
    setName(nextName);

    if (!slug) {
      setSlug(toSlug(nextName));
    }
  }

  function toggleListValue(
    value: string,
    values: string[],
    setValues: (nextValues: string[]) => void,
  ) {
    if (values.includes(value)) {
      setValues(values.filter((item) => item !== value));
      return;
    }

    setValues([...values, value]);
  }

  function addListValue(
    value: string,
    values: string[],
    setValues: (nextValues: string[]) => void,
  ) {
    if (!value || values.includes(value)) {
      return;
    }

    setValues([...values, value]);
  }

  function removeListValue(
    value: string,
    values: string[],
    setValues: (nextValues: string[]) => void,
  ) {
    setValues(values.filter((item) => item !== value));
  }

  function addCategory(categoryId: string) {
    if (!categoryId || selectedCategoryIds.includes(categoryId)) {
      return;
    }

    setSelectedCategoryIds([...selectedCategoryIds, categoryId]);

    if (!primaryCategoryId) {
      setPrimaryCategoryId(categoryId);
    }
  }

  function removeCategory(categoryId: string) {
    const nextCategoryIds = selectedCategoryIds.filter(
      (selectedId) => selectedId !== categoryId,
    );
    setSelectedCategoryIds(nextCategoryIds);

    if (primaryCategoryId === categoryId) {
      setPrimaryCategoryId(nextCategoryIds[0] ?? "");
    }
  }

  function addAttribute(attributeId: string) {
    if (!attributeId) {
      return;
    }

    updateAttributeValue(attributeId, {
      selected: true,
    });
  }

  function removeAttribute(attributeId: string) {
    setAttributeValues((current) => ({
      ...current,
      [attributeId]: {
        ...getAttributeValue(current, attributeId),
        selected: false,
        textValue: "",
        numberValue: "",
        booleanValue: true,
        optionId: "",
        optionIds: [],
      },
    }));
  }

  function updateAttributeValue(
    attributeId: string,
    update: Partial<AttributeFormValue>,
  ) {
    setAttributeValues((current) => ({
      ...current,
      [attributeId]: {
        ...getAttributeValue(current, attributeId),
        ...update,
      },
    }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    setImageDrafts((current) => [
      ...current,
      ...selectedFiles.map((file) => ({
        file,
        key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    event.target.value = "";
  }

  function removeImageDraft(imageKey: string) {
    setImageDrafts((current) => {
      const imageDraft = current.find((image) => image.key === imageKey);

      if (imageDraft) {
        URL.revokeObjectURL(imageDraft.previewUrl);
      }

      return current.filter((image) => image.key !== imageKey);
    });
    setVariantDrafts((current) =>
      current.map((variant) => ({
        ...variant,
        imageFileKeys:
          variant.imageFileKeys?.filter((key) => key !== imageKey) ?? [],
      })),
    );
  }

  function addVariantDraft(payload: ProductVariantFormPayload) {
    setVariantDrafts((current) => [...current, payload]);
  }

  function removeVariantDraft(indexToRemove: number) {
    setVariantDrafts((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  }

  function buildIngredientPayload(): CreateAdminProductIngredientPayload[] {
    return selectedIngredientIds.map((ingredientId, index) => ({
      ingredientId,
      isKeyIngredient: keyIngredientIds.includes(ingredientId),
      sortOrder: index,
    }));
  }

  function buildAttributePayloads(): SetProductAttributeValuePayload[] {
    return attributes
      .filter((attribute) => attributeValues[attribute.id]?.selected)
      .map((attribute) => {
        const value = getAttributeValue(attributeValues, attribute.id);

        switch (attribute.dataType) {
          case "TEXT":
            return {
              attributeId: attribute.id,
              textValue: value.textValue,
            };
          case "NUMBER":
            return {
              attributeId: attribute.id,
              numberValue: Number(value.numberValue),
            };
          case "BOOLEAN":
            return {
              attributeId: attribute.id,
              booleanValue: value.booleanValue,
            };
          case "SELECT":
            return {
              attributeId: attribute.id,
              optionId: value.optionId,
            };
          case "MULTI_SELECT":
            return {
              attributeId: attribute.id,
              optionIds: value.optionIds,
            };
        }
      });
  }

  function validateAttributes() {
    for (const attribute of attributes) {
      const value = attributeValues[attribute.id];

      if (!value?.selected) {
        continue;
      }

      if (attribute.dataType === "TEXT" && !value.textValue.trim()) {
        return `${attribute.name} value is required`;
      }

      if (attribute.dataType === "NUMBER" && !value.numberValue) {
        return `${attribute.name} number is required`;
      }

      if (attribute.dataType === "SELECT" && !value.optionId) {
        return `${attribute.name} option is required`;
      }

      if (
        attribute.dataType === "MULTI_SELECT" &&
        value.optionIds.length === 0
      ) {
        return `${attribute.name} options are required`;
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    const attributeError = validateAttributes();

    if (attributeError) {
      setError(attributeError);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const product = await createAdminProduct(accessToken, {
        name,
        slug,
        shortDescription: shortDescription || undefined,
        description: description || undefined,
        usageInstructions: usageInstructions || undefined,
        warnings: warnings || undefined,
        status,
        isFeatured,
        ingredients: buildIngredientPayload(),
        audienceIds: selectedAudienceIds,
        skinTypeIds: selectedSkinTypeIds,
        ageGroupIds: selectedAgeGroupIds,
        hairProfileIds: selectedHairProfileIds,
        concernIds: selectedConcernIds,
        benefitIds: selectedBenefitIds,
      });

      await Promise.all([
        ...selectedCategoryIds.map((categoryId, index) =>
          assignAdminProductCategory(accessToken, product.id, {
            categoryId,
            isPrimary: categoryId === primaryCategoryId,
            sortOrder: index,
          }),
        ),
        ...buildAttributePayloads().map((payload) =>
          setAdminProductAttributeValue(accessToken, product.id, payload),
        ),
      ]);

      const uploadedImages = imageDrafts.length
        ? await uploadAdminProductImages(
            accessToken,
            product.id,
            imageDrafts.map((image) => image.file),
          )
        : [];
      const uploadedImageByDraftKey = mapUploadedImagesToDrafts(
        imageDrafts,
        uploadedImages,
      );

      for (const variantDraft of variantDrafts) {
        const {
          imageFileKeys = [],
          imageFiles = [],
          ...variantPayload
        } = variantDraft;
        const variant = await createAdminProductVariant(
          accessToken,
          product.id,
          variantPayload,
        );
        const imageIds = imageFileKeys
          .map((key) => uploadedImageByDraftKey.get(key)?.id)
          .filter((imageId): imageId is string => Boolean(imageId));

        if (imageIds.length) {
          await assignAdminVariantImages(
            accessToken,
            product.id,
            variant.id,
            imageIds,
          );
        }

        if (imageFiles.length) {
          await uploadAdminVariantImages(
            accessToken,
            product.id,
            variant.id,
            imageFiles,
          );
        }
      }

      setSuccess("Product created successfully");
      router.push("/admin/products/all");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create product",
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
          <h1>Add Product</h1>
          <p>Create product details, categories, metadata, and attributes.</p>
        </div>
      </section>

      <form className="product-form-layout" onSubmit={handleSubmit}>
        <section className="form-surface admin-form product-form-main">
          <FormBlock title="Basic Details">
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

            <label>
              Short description
              <input
                maxLength={300}
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
              />
            </label>

            <label>
              Description
              <textarea
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <div className="split-fields">
              <label>
                Usage instructions
                <textarea
                  rows={4}
                  value={usageInstructions}
                  onChange={(event) => setUsageInstructions(event.target.value)}
                />
              </label>
              <label>
                Warnings
                <textarea
                  rows={4}
                  value={warnings}
                  onChange={(event) => setWarnings(event.target.value)}
                />
              </label>
            </div>
          </FormBlock>

          <FormBlock title="Categories">
            {isLoading ? <p className="muted-text">Loading categories...</p> : null}

            <label>
              Select category
              <select
                value=""
                onChange={(event) => addCategory(event.target.value)}
              >
                <option value="">Choose category</option>
                {activeCategories
                  .filter(
                    (category) => !selectedCategoryIds.includes(category.id),
                  )
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>

            <SelectedPills
              ids={selectedCategoryIds}
              items={activeCategories}
              onRemove={removeCategory}
            />

            {selectedCategoryIds.length > 0 ? (
              <label>
                Primary category
                <select
                  value={primaryCategoryId}
                  onChange={(event) => setPrimaryCategoryId(event.target.value)}
                >
                  {selectedCategoryIds.map((categoryId) => {
                    const category = activeCategories.find(
                      (item) => item.id === categoryId,
                    );

                    return (
                      <option key={categoryId} value={categoryId}>
                        {category?.name ?? categoryId}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : null}
          </FormBlock>

          <FormBlock title="Product Metadata">
            <MetadataPicker
              items={metadata.ingredients}
              onRemove={(id) =>
                removeListValue(
                  id,
                  selectedIngredientIds,
                  setSelectedIngredientIds,
                )
              }
              onSelect={(id) =>
                addListValue(id, selectedIngredientIds, setSelectedIngredientIds)
              }
              selectedIds={selectedIngredientIds}
              title="Ingredients"
            />

            {selectedIngredientIds.length > 0 ? (
              <div className="selected-detail-list">
                {selectedIngredientIds.map((ingredientId) => {
                  const ingredient = metadata.ingredients.find(
                    (item) => item.id === ingredientId,
                  );

                  return (
                    <label className="checkbox-field" key={ingredientId}>
                      <input
                        checked={keyIngredientIds.includes(ingredientId)}
                        type="checkbox"
                        onChange={() =>
                          toggleListValue(
                            ingredientId,
                            keyIngredientIds,
                            setKeyIngredientIds,
                          )
                        }
                      />
                      Mark {ingredient?.name ?? "ingredient"} as key ingredient
                    </label>
                  );
                })}
              </div>
            ) : null}

            <div className="metadata-picker-grid">
              <MetadataPicker
                items={metadata.audiences}
                onRemove={(id) =>
                  removeListValue(id, selectedAudienceIds, setSelectedAudienceIds)
                }
                onSelect={(id) =>
                  addListValue(id, selectedAudienceIds, setSelectedAudienceIds)
                }
                selectedIds={selectedAudienceIds}
                title="Audiences"
              />
              <MetadataPicker
                items={metadata.skinTypes}
                onRemove={(id) =>
                  removeListValue(
                    id,
                    selectedSkinTypeIds,
                    setSelectedSkinTypeIds,
                  )
                }
                onSelect={(id) =>
                  addListValue(
                    id,
                    selectedSkinTypeIds,
                    setSelectedSkinTypeIds,
                  )
                }
                selectedIds={selectedSkinTypeIds}
                title="Skin Types"
              />
              <MetadataPicker
                items={metadata.ageGroups}
                onRemove={(id) =>
                  removeListValue(
                    id,
                    selectedAgeGroupIds,
                    setSelectedAgeGroupIds,
                  )
                }
                onSelect={(id) =>
                  addListValue(
                    id,
                    selectedAgeGroupIds,
                    setSelectedAgeGroupIds,
                  )
                }
                selectedIds={selectedAgeGroupIds}
                title="Age Groups"
              />
              <MetadataPicker
                items={metadata.hairProfiles}
                onRemove={(id) =>
                  removeListValue(
                    id,
                    selectedHairProfileIds,
                    setSelectedHairProfileIds,
                  )
                }
                onSelect={(id) =>
                  addListValue(
                    id,
                    selectedHairProfileIds,
                    setSelectedHairProfileIds,
                  )
                }
                selectedIds={selectedHairProfileIds}
                title="Hair Profiles"
              />
              <MetadataPicker
                items={metadata.concerns}
                onRemove={(id) =>
                  removeListValue(id, selectedConcernIds, setSelectedConcernIds)
                }
                onSelect={(id) =>
                  addListValue(id, selectedConcernIds, setSelectedConcernIds)
                }
                selectedIds={selectedConcernIds}
                title="Concerns"
              />
              <MetadataPicker
                items={metadata.benefits}
                onRemove={(id) =>
                  removeListValue(id, selectedBenefitIds, setSelectedBenefitIds)
                }
                onSelect={(id) =>
                  addListValue(id, selectedBenefitIds, setSelectedBenefitIds)
                }
                selectedIds={selectedBenefitIds}
                title="Benefits"
              />
            </div>
          </FormBlock>

          <FormBlock title="Attributes">
            {attributes.length === 0 ? (
              <p className="muted-text">No active attributes available.</p>
            ) : null}

            <label>
              Select attribute
              <select
                value=""
                onChange={(event) => addAttribute(event.target.value)}
              >
                <option value="">Choose attribute</option>
                {attributes
                  .filter(
                    (attribute) =>
                      !getAttributeValue(attributeValues, attribute.id).selected,
                  )
                  .map((attribute) => (
                    <option key={attribute.id} value={attribute.id}>
                      {attribute.name}
                    </option>
                  ))}
              </select>
            </label>

            <div className="attribute-form-list">
              {attributes
                .filter(
                  (attribute) =>
                    getAttributeValue(attributeValues, attribute.id).selected,
                )
                .map((attribute) => (
                  <AttributeValueControl
                    attribute={attribute}
                    key={attribute.id}
                    options={attributeOptions[attribute.id] ?? []}
                    value={getAttributeValue(attributeValues, attribute.id)}
                    onChange={(update) =>
                      updateAttributeValue(attribute.id, update)
                    }
                    onRemove={() => removeAttribute(attribute.id)}
                  />
                ))}
            </div>
          </FormBlock>

          <FormBlock title="Images">
            <label>
              Product images
              <input
                accept="image/*"
                multiple
                type="file"
                onChange={handleImageChange}
              />
            </label>
            {imageDrafts.length > 0 ? (
              <div className="product-image-grid">
                {imageDrafts.map((image) => (
                  <article className="product-image-card" key={image.key}>
                    <img alt={image.file.name} src={image.previewUrl} />
                    <span>{image.file.name}</span>
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      onClick={() => removeImageDraft(image.key)}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </FormBlock>

          <FormBlock title="Variants">
            <ProductVariantForm
              asForm={false}
              imageOptions={imageDrafts.map((image) => ({
                key: image.key,
                label: image.file.name,
                previewUrl: image.previewUrl,
              }))}
              submitLabel="Add Variant"
              onSubmit={addVariantDraft}
            />

            {variantDrafts.length > 0 ? (
              <div className="variant-list">
                {variantDrafts.map((variant, index) => (
                  <article
                    className="variant-row variant-draft-row"
                    key={`${variant.sku}-${index}`}
                  >
                    <div>
                      <strong>{variant.sku}</strong>
                      <small>{variant.isActive ? "Active" : "Inactive"}</small>
                    </div>
                    <div>
                      <span>{variant.price.toFixed(2)}</span>
                      <small>Stock {variant.stockQuantity ?? 0}</small>
                    </div>
                    {variant.imageFileKeys?.length ? (
                      <small>
                        Images: {variant.imageFileKeys.length}
                      </small>
                    ) : null}
                    <button
                      aria-label={`Remove ${variant.sku}`}
                      className="icon-button"
                      type="button"
                      onClick={() => removeVariantDraft(index)}
                    >
                      <RemoveIcon />
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </FormBlock>
        </section>

        <aside className="product-form-sidebar">
          <section className="form-surface admin-form">
            <FormBlock title="Publishing">
              <label>
                Status
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as AdminProduct["status"])
                  }
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>

              <label className="checkbox-field">
                <input
                  checked={isFeatured}
                  type="checkbox"
                  onChange={(event) => setIsFeatured(event.target.checked)}
                />
                Featured product
              </label>
            </FormBlock>

            {success ? <p className="form-success">{success}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}

            <div className="form-actions">
              <button
                className="primary-button"
                disabled={isSubmitting || isLoading}
                type="submit"
              >
                {isSubmitting ? "Creating..." : "Create Product"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => router.push("/admin/products/all")}
              >
                Cancel
              </button>
            </div>
          </section>
        </aside>
      </form>
    </main>
  );
}

function AttributeValueControl({
  attribute,
  onRemove,
  options,
  value,
  onChange,
}: {
  attribute: AdminAttribute;
  onRemove: () => void;
  options: AdminAttributeOption[];
  value: AttributeFormValue;
  onChange: (update: Partial<AttributeFormValue>) => void;
}) {
  return (
    <div className="attribute-value-row">
      <div className="attribute-value-heading">
        <span>
          <strong>{attribute.name}</strong>
          <small>{attribute.dataType.toLowerCase().replace("_", " ")}</small>
        </span>
        <button
          aria-label={`Remove ${attribute.name}`}
          className="icon-button"
          type="button"
          title={`Remove ${attribute.name}`}
          onClick={onRemove}
        >
          <RemoveIcon />
        </button>
      </div>

      {attribute.dataType === "TEXT" ? (
        <input
          value={value.textValue}
          onChange={(event) => onChange({ textValue: event.target.value })}
          placeholder="Value"
        />
      ) : null}

      {attribute.dataType === "NUMBER" ? (
        <input
          type="number"
          value={value.numberValue}
          onChange={(event) => onChange({ numberValue: event.target.value })}
          placeholder="Number"
        />
      ) : null}

      {attribute.dataType === "BOOLEAN" ? (
        <select
          value={String(value.booleanValue)}
          onChange={(event) =>
            onChange({ booleanValue: event.target.value === "true" })
          }
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : null}

      {attribute.dataType === "SELECT" ? (
        <select
          value={value.optionId}
          onChange={(event) => onChange({ optionId: event.target.value })}
        >
          <option value="">Select option</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}

      {attribute.dataType === "MULTI_SELECT" ? (
        <OptionMultiSelect
          options={options}
          selectedIds={value.optionIds}
          onRemove={(id) =>
            onChange({
              optionIds: value.optionIds.filter((optionId) => optionId !== id),
            })
          }
          onSelect={(id) =>
            onChange({
              optionIds: value.optionIds.includes(id)
                ? value.optionIds
                : [...value.optionIds, id],
            })
          }
        />
      ) : null}
    </div>
  );
}

function FormBlock({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="form-block">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function MetadataPicker({
  items,
  onRemove,
  onSelect,
  selectedIds,
  title,
}: {
  items: { id: string; name: string; slug: string; isActive: boolean }[];
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  selectedIds: string[];
  title: string;
}) {
  const activeItems = items.filter((item) => item.isActive);

  return (
    <div className="metadata-picker">
      <label>
        {title}
        <select value="" onChange={(event) => onSelect(event.target.value)}>
          <option value="">Select {title.toLowerCase()}</option>
          {activeItems
            .filter((item) => !selectedIds.includes(item.id))
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </label>
      {activeItems.length === 0 ? <p className="muted-text">No options.</p> : null}
      <SelectedPills ids={selectedIds} items={activeItems} onRemove={onRemove} />
    </div>
  );
}

function OptionMultiSelect({
  onRemove,
  onSelect,
  options,
  selectedIds,
}: {
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  options: AdminAttributeOption[];
  selectedIds: string[];
}) {
  const activeOptions = options.filter((option) => option.isActive);

  return (
    <div className="select-picker">
      <select value="" onChange={(event) => onSelect(event.target.value)}>
        <option value="">Select options</option>
        {activeOptions
          .filter((option) => !selectedIds.includes(option.id))
          .map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
      </select>
      <SelectedPills
        ids={selectedIds}
        items={activeOptions.map((option) => ({
          id: option.id,
          name: option.label,
          slug: option.value,
        }))}
        onRemove={onRemove}
      />
    </div>
  );
}

function SelectedPills({
  ids,
  items,
  onRemove,
}: {
  ids: string[];
  items: { id: string; name: string; slug?: string }[];
  onRemove: (id: string) => void;
}) {
  if (ids.length === 0) {
    return null;
  }

  return (
    <div className="selected-pill-list">
      {ids.map((id) => {
        const item = items.find((candidate) => candidate.id === id);

        return (
          <span className="selected-pill" key={id}>
            <span>
              <strong>{item?.name ?? id}</strong>
              {item?.slug ? <small>{item.slug}</small> : null}
            </span>
            <button
              aria-label={`Remove ${item?.name ?? id}`}
              type="button"
              onClick={() => onRemove(id)}
            >
              <RemoveIcon />
            </button>
          </span>
        );
      })}
    </div>
  );
}

function RemoveIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M18 6L6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M6 6L18 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function mapUploadedImagesToDrafts(
  imageDrafts: ProductImageDraft[],
  uploadedImages: AdminProductImage[],
) {
  return imageDrafts.reduce<Map<string, AdminProductImage>>(
    (imageMap, imageDraft, index) => {
      const uploadedImage = uploadedImages[index];

      if (uploadedImage) {
        imageMap.set(imageDraft.key, uploadedImage);
      }

      return imageMap;
    },
    new Map(),
  );
}

function getAttributeValue(
  values: Record<string, AttributeFormValue>,
  attributeId: string,
): AttributeFormValue {
  return (
    values[attributeId] ?? {
      selected: false,
      textValue: "",
      numberValue: "",
      booleanValue: true,
      optionId: "",
      optionIds: [],
    }
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
