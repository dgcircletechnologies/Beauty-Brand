"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useCurrency } from "@/contexts/currency-context";
import {
  getAdminCategories,
  getAdminProduct,
  getAdminProducts,
  getAdminProductVariants,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type {
  AdminCategory,
  AdminProduct,
  AdminProductDetail,
  AdminProductVariant,
} from "@/lib/api/admin";
import type { OfferTarget, OfferTargetPayload, OfferTargetType } from "@/lib/offers/types";

export type SelectedOfferTarget = {
  key: string;
  type: OfferTargetType;
  id: string;
  label: string;
  detail?: string;
  existingTargetId?: string;
};

type OfferTargetSelectorProps = {
  accessToken: string | null;
  disabled?: boolean;
  summaryTitle?: string;
  targets: SelectedOfferTarget[];
  onTargetsChange: (targets: SelectedOfferTarget[]) => void;
};

type RewardTargetSelectorProps = {
  accessToken: string | null;
  disabled?: boolean;
  mode: "same" | "product" | "variant";
  rewardProductId: string;
  rewardVariantId: string;
  onModeChange: (mode: "same" | "product" | "variant") => void;
  onRewardProductChange: (target: SelectedOfferTarget | null) => void;
  onRewardVariantChange: (target: SelectedOfferTarget | null) => void;
};

type DataState = {
  categories: AdminCategory[];
  products: AdminProduct[];
  error: string | null;
  isLoading: boolean;
};

const pageSize = 12;

const targetTabs: Array<{ label: string; type: OfferTargetType }> = [
  { label: "Categories", type: "CATEGORY" },
  { label: "Products", type: "PRODUCT" },
  { label: "Variants", type: "VARIANT" },
];

export function OfferTargetSelector({
  accessToken,
  disabled,
  summaryTitle = "Selected Targets",
  targets,
  onTargetsChange,
}: OfferTargetSelectorProps) {
  const [activeTab, setActiveTab] = useState<OfferTargetType>("CATEGORY");
  const dataState = useOfferTargetData(accessToken);
  const categoriesById = useMemo(
    () => new Map(dataState.categories.map((category) => [category.id, category])),
    [dataState.categories],
  );
  const categoryWarnings = useMemo(
    () => getCategoryCoverageWarnings(targets, categoriesById),
    [categoriesById, targets],
  );

  function addTarget(target: SelectedOfferTarget) {
    if (disabled || targets.some((selectedTarget) => selectedTarget.key === target.key)) {
      return;
    }

    onTargetsChange([...targets, target]);
  }

  function removeTarget(targetKey: string) {
    onTargetsChange(targets.filter((target) => target.key !== targetKey));
  }

  return (
    <FormTargetShell
      dataState={dataState}
      tabs={
        <div className="segmented-control offer-target-tabs" aria-label="Offer target type">
          {targetTabs.map((tab) => (
            <button
              className={activeTab === tab.type ? "active" : undefined}
              key={tab.type}
              type="button"
              onClick={() => setActiveTab(tab.type)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    >
      {activeTab === "CATEGORY" ? (
        <CategoryTargetSelector
          categories={dataState.categories}
          disabled={disabled}
          selectedKeys={new Set(targets.map((target) => target.key))}
          onAddTarget={addTarget}
        />
      ) : null}
      {activeTab === "PRODUCT" ? (
        <ProductTargetSelector
          disabled={disabled}
          products={dataState.products}
          onAddTarget={addTarget}
          selectedKeys={new Set(targets.map((target) => target.key))}
        />
      ) : null}
      {activeTab === "VARIANT" ? (
        <VariantTargetSelector
          accessToken={accessToken}
          disabled={disabled}
          products={dataState.products}
          selectedKeys={new Set(targets.map((target) => target.key))}
          onAddTarget={addTarget}
        />
      ) : null}

      <SelectedTargetsSummary
        categoryWarnings={categoryWarnings}
        title={summaryTitle}
        targets={targets}
        onRemoveTarget={removeTarget}
      />
    </FormTargetShell>
  );
}

export function BogoRewardTargetSelector({
  accessToken,
  disabled,
  mode,
  rewardProductId,
  rewardVariantId,
  onModeChange,
  onRewardProductChange,
  onRewardVariantChange,
}: RewardTargetSelectorProps) {
  const dataState = useOfferTargetData(accessToken);
  const currentRewardKey =
    mode === "product"
      ? targetKey("PRODUCT", rewardProductId)
      : mode === "variant"
        ? targetKey("VARIANT", rewardVariantId)
        : "";

  return (
    <FormTargetShell
      dataState={dataState}
      tabs={
        <div className="segmented-control offer-target-tabs" aria-label="Reward type">
          {[
            ["same", "Same Item"],
            ["product", "Product"],
            ["variant", "Variant"],
          ].map(([nextMode, label]) => (
            <button
              className={mode === nextMode ? "active" : undefined}
              key={nextMode}
              type="button"
              onClick={() => onModeChange(nextMode as RewardTargetSelectorProps["mode"])}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {mode === "same" ? (
        <div className="offer-reward-empty">Reward applies to the same eligible item.</div>
      ) : null}
      {mode === "product" ? (
        <ProductTargetSelector
          disabled={disabled}
          products={dataState.products}
          selectedKeys={new Set(currentRewardKey ? [currentRewardKey] : [])}
          onAddTarget={onRewardProductChange}
        />
      ) : null}
      {mode === "variant" ? (
        <VariantTargetSelector
          accessToken={accessToken}
          disabled={disabled}
          products={dataState.products}
          selectedKeys={new Set(currentRewardKey ? [currentRewardKey] : [])}
          onAddTarget={onRewardVariantChange}
        />
      ) : null}
    </FormTargetShell>
  );
}

export function toSelectedOfferTargets(targets: OfferTarget[] = []) {
  return targets.reduce<SelectedOfferTarget[]>((selectedTargets, target) => {
    const selectedTarget = toSelectedOfferTarget(target);

    if (
      selectedTarget &&
      !selectedTargets.some((currentTarget) => currentTarget.key === selectedTarget.key)
    ) {
      selectedTargets.push(selectedTarget);
    }

    return selectedTargets;
  }, []);
}

export function toOfferTargetPayload(target: SelectedOfferTarget): OfferTargetPayload {
  if (target.type === "CATEGORY") {
    return { categoryId: target.id };
  }

  if (target.type === "PRODUCT") {
    return { productId: target.id };
  }

  return { variantId: target.id };
}

export function getOfferTargetCounts(targets: SelectedOfferTarget[]) {
  return {
    categories: targets.filter((target) => target.type === "CATEGORY").length,
    products: targets.filter((target) => target.type === "PRODUCT").length,
    variants: targets.filter((target) => target.type === "VARIANT").length,
  };
}

export function formatOfferTargetCounts(targets: SelectedOfferTarget[]) {
  const counts = getOfferTargetCounts(targets);
  const labels = [
    formatCount(counts.categories, "Category"),
    formatCount(counts.products, "Product"),
    formatCount(counts.variants, "Variant"),
  ].filter(Boolean);

  return labels.length ? labels.join(" · ") : "No targets selected";
}

function useOfferTargetData(accessToken: string | null): DataState {
  const [state, setState] = useState<DataState>({
    categories: [],
    products: [],
    error: null,
    isLoading: Boolean(accessToken),
  });

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadData() {
      setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

      try {
        const [categories, products] = await Promise.all([
          getAdminCategories(token),
          getAdminProducts(token),
        ]);

        if (isMounted) {
          setState({ categories, products, error: null, isLoading: false });
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setState({
          categories: [],
          products: [],
          error:
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load offer targets",
          isLoading: false,
        });
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  return state;
}

function FormTargetShell({
  children,
  dataState,
  tabs,
}: {
  children: ReactNode;
  dataState: DataState;
  tabs: ReactNode;
}) {
  if (dataState.isLoading) {
    return (
      <div className="offer-target-selector">
        {tabs}
        <div className="offer-selector-empty">Loading options...</div>
      </div>
    );
  }

  if (dataState.error) {
    return (
      <div className="offer-target-selector">
        {tabs}
        <p className="form-error">{dataState.error}</p>
      </div>
    );
  }

  return (
    <div className="offer-target-selector">
      {tabs}
      {children}
    </div>
  );
}

function CategoryTargetSelector({
  categories,
  disabled,
  selectedKeys,
  onAddTarget,
}: {
  categories: AdminCategory[];
  disabled?: boolean;
  selectedKeys: Set<string>;
  onAddTarget: (target: SelectedOfferTarget) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const childrenByParentId = useMemo(() => groupCategoriesByParent(categories), [categories]);
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const categoryRows = useMemo(
    () =>
      getVisibleCategoryRows(
        categories,
        childrenByParentId,
        categoriesById,
        debouncedSearchTerm,
      ),
    [categories, categoriesById, childrenByParentId, debouncedSearchTerm],
  );

  return (
    <>
      <input
        aria-label="Search categories"
        placeholder="Search categories"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      <p className="muted-text">
        Offers assigned to a category may also apply to eligible products in its descendant categories.
      </p>
      <div className="offer-selector-list">
        {categoryRows.length ? (
          categoryRows.map((row) => {
            const key = targetKey("CATEGORY", row.category.id);
            const isSelected = selectedKeys.has(key);
            const hasChildren = (childrenByParentId.get(row.category.id) ?? []).length > 0;

            return (
              <button
                className={isSelected ? "offer-selector-row selected" : "offer-selector-row"}
                disabled={disabled || isSelected}
                key={row.category.id}
                type="button"
                onClick={() =>
                  onAddTarget({
                    key,
                    type: "CATEGORY",
                    id: row.category.id,
                    label: row.path,
                    detail: hasChildren ? "Contains descendant categories" : row.category.slug,
                  })
                }
              >
                <span style={{ paddingLeft: `${row.depth * 18}px` }}>
                  <strong>{row.category.name}</strong>
                  <small>{row.path}</small>
                </span>
                <span>{isSelected ? "Selected" : "Add"}</span>
              </button>
            );
          })
        ) : (
          <div className="offer-selector-empty">No categories found.</div>
        )}
      </div>
    </>
  );
}

function ProductTargetSelector({
  disabled,
  products,
  selectedKeys,
  onAddTarget,
}: {
  disabled?: boolean;
  products: AdminProduct[];
  selectedKeys: Set<string>;
  onAddTarget: (target: SelectedOfferTarget) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const filteredProducts = useMemo(
    () => filterProducts(products, debouncedSearchTerm),
    [products, debouncedSearchTerm],
  );
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  return (
    <>
      <input
        aria-label="Search products"
        placeholder="Search products"
        value={searchTerm}
        onChange={(event) => {
          setSearchTerm(event.target.value);
          setVisibleCount(pageSize);
        }}
      />
      <div className="offer-selector-list">
        {visibleProducts.length ? (
          visibleProducts.map((product) => {
            const key = targetKey("PRODUCT", product.id);
            const isSelected = selectedKeys.has(key);

            return (
              <button
                className={isSelected ? "offer-selector-row selected" : "offer-selector-row"}
                disabled={disabled || isSelected}
                key={product.id}
                type="button"
                onClick={() =>
                  onAddTarget({
                    key,
                    type: "PRODUCT",
                    id: product.id,
                    label: product.name,
                    detail: getProductDetailLine(product),
                  })
                }
              >
                <span>
                  <strong>{product.name}</strong>
                  <small>{getProductDetailLine(product)}</small>
                </span>
                <span>{isSelected ? "Selected" : "Add"}</span>
              </button>
            );
          })
        ) : (
          <div className="offer-selector-empty">No products match your search.</div>
        )}
      </div>
      {visibleCount < filteredProducts.length ? (
        <button
          className="secondary-button offer-load-more"
          type="button"
          onClick={() => setVisibleCount((count) => count + pageSize)}
        >
          Load More
        </button>
      ) : null}
    </>
  );
}

function VariantTargetSelector({
  accessToken,
  disabled,
  products,
  selectedKeys,
  onAddTarget,
}: {
  accessToken: string | null;
  disabled?: boolean;
  products: AdminProduct[];
  selectedKeys: Set<string>;
  onAddTarget: (target: SelectedOfferTarget) => void;
}) {
  const { formatPrice } = useCurrency();
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [variants, setVariants] = useState<AdminProductVariant[]>([]);
  const [productDetail, setProductDetail] = useState<AdminProductDetail | null>(null);
  const [variantSearch, setVariantSearch] = useState("");
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);
  const debouncedProductSearch = useDebouncedValue(productSearch, 300);
  const debouncedVariantSearch = useDebouncedValue(variantSearch, 300);
  const filteredProducts = useMemo(
    () => filterProducts(products, debouncedProductSearch).slice(0, pageSize),
    [products, debouncedProductSearch],
  );
  const filteredVariants = useMemo(() => {
    const normalizedSearch = debouncedVariantSearch.trim().toLowerCase();

    return variants.filter((variant) => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        variant.sku.toLowerCase().includes(normalizedSearch) ||
        productDetail?.name.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [debouncedVariantSearch, productDetail?.name, variants]);

  useEffect(() => {
    if (!accessToken || !selectedProductId) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadVariants() {
      setVariantError(null);
      setIsLoadingVariants(true);

      try {
        const [nextProduct, nextVariants] = await Promise.all([
          getAdminProduct(token, selectedProductId),
          getAdminProductVariants(token, selectedProductId),
        ]);

        if (isMounted) {
          setProductDetail(nextProduct);
          setVariants(nextVariants);
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setVariantError(
          caughtError instanceof Error ? caughtError.message : "Unable to load variants",
        );
      } finally {
        if (isMounted) {
          setIsLoadingVariants(false);
        }
      }
    }

    void loadVariants();

    return () => {
      isMounted = false;
    };
  }, [accessToken, selectedProductId]);

  return (
    <>
      <input
        aria-label="Search products for variants"
        placeholder="Choose product"
        value={productSearch}
        onChange={(event) => setProductSearch(event.target.value)}
      />
      <div className="offer-selector-list compact">
        {filteredProducts.length ? (
          filteredProducts.map((product) => (
            <button
              className={
                selectedProductId === product.id
                  ? "offer-selector-row selected"
                  : "offer-selector-row"
              }
              disabled={disabled}
              key={product.id}
              type="button"
              onClick={() => {
                setSelectedProductId(product.id);
                setVariants([]);
                setProductDetail(null);
              }}
            >
              <span>
                <strong>{product.name}</strong>
                <small>{getProductDetailLine(product)}</small>
              </span>
              <span>{selectedProductId === product.id ? "Viewing" : "View"}</span>
            </button>
          ))
        ) : (
          <div className="offer-selector-empty">No products match your search.</div>
        )}
      </div>

      {selectedProductId ? (
        <>
          <input
            aria-label="Search variants"
            placeholder="Search variants by SKU"
            value={variantSearch}
            onChange={(event) => setVariantSearch(event.target.value)}
          />
          {variantError ? <p className="form-error">{variantError}</p> : null}
          {isLoadingVariants ? (
            <div className="offer-selector-empty">Loading variants...</div>
          ) : (
            <div className="offer-selector-list">
              {filteredVariants.length ? (
                filteredVariants.map((variant) => {
                  const key = targetKey("VARIANT", variant.id);
                  const isSelected = selectedKeys.has(key);
                  const productName =
                    productDetail?.name ??
                    products.find((product) => product.id === variant.productId)?.name ??
                    "Selected product";

                  return (
                    <button
                      className={
                        isSelected ? "offer-selector-row selected" : "offer-selector-row"
                      }
                      disabled={disabled || isSelected}
                      key={variant.id}
                      type="button"
                      onClick={() =>
                        onAddTarget({
                          key,
                          type: "VARIANT",
                          id: variant.id,
                          label: `${productName} - ${variant.sku}`,
                          detail: `SKU ${variant.sku} · ${formatPrice(variant.price)}`,
                        })
                      }
                    >
                      <span>
                        <strong>{productName}</strong>
                        <small>
                          {variant.sku} · {formatPrice(variant.price)}
                        </small>
                      </span>
                      <span>{isSelected ? "Selected" : "Add"}</span>
                    </button>
                  );
                })
              ) : (
                <div className="offer-selector-empty">No variants found for this product.</div>
              )}
            </div>
          )}
        </>
      ) : null}
    </>
  );
}

function SelectedTargetsSummary({
  categoryWarnings,
  title,
  targets,
  onRemoveTarget,
}: {
  categoryWarnings: string[];
  title: string;
  targets: SelectedOfferTarget[];
  onRemoveTarget: (targetKey: string) => void;
}) {
  const groupedTargets = {
    CATEGORY: targets.filter((target) => target.type === "CATEGORY"),
    PRODUCT: targets.filter((target) => target.type === "PRODUCT"),
    VARIANT: targets.filter((target) => target.type === "VARIANT"),
  };

  return (
    <div className="selected-targets-panel">
      <div className="section-title">
        <h3>{title}</h3>
        <span>{formatOfferTargetCounts(targets)}</span>
      </div>
      {categoryWarnings.map((warning) => (
        <p className="offer-warning subtle" key={warning}>
          {warning}
        </p>
      ))}
      {targets.length ? (
        <div className="selected-targets-scroll">
          {targetTabs.map((tab) => (
            <div className="selected-target-group" key={tab.type}>
              <strong>
                {tab.label} ({groupedTargets[tab.type].length})
              </strong>
              {groupedTargets[tab.type].length ? (
                groupedTargets[tab.type].map((target) => (
                  <div className="selected-target-row" key={target.key}>
                    <span>
                      {target.label}
                      {target.detail ? <small>{target.detail}</small> : null}
                    </span>
                    <button type="button" onClick={() => onRemoveTarget(target.key)}>
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted-text">None selected.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="offer-selector-empty">No targets selected.</div>
      )}
    </div>
  );
}

function toSelectedOfferTarget(target: OfferTarget): SelectedOfferTarget | null {
  if (target.targetType === "CATEGORY" && target.categoryId) {
    return {
      key: target.targetKey ?? targetKey("CATEGORY", target.categoryId),
      type: "CATEGORY",
      id: target.categoryId,
      label: target.category?.name ?? target.categoryId,
      detail: target.category?.slug,
      existingTargetId: target.id,
    };
  }

  if (target.targetType === "PRODUCT" && target.productId) {
    return {
      key: target.targetKey ?? targetKey("PRODUCT", target.productId),
      type: "PRODUCT",
      id: target.productId,
      label: target.product?.name ?? target.productId,
      detail: target.product?.slug,
      existingTargetId: target.id,
    };
  }

  if (target.targetType === "VARIANT" && target.variantId) {
    return {
      key: target.targetKey ?? targetKey("VARIANT", target.variantId),
      type: "VARIANT",
      id: target.variantId,
      label: target.variant?.sku ?? target.variantId,
      detail: target.variant?.productId ? `Product ID ${target.variant.productId}` : undefined,
      existingTargetId: target.id,
    };
  }

  return null;
}

function getVisibleCategoryRows(
  categories: AdminCategory[],
  childrenByParentId: Map<string, AdminCategory[]>,
  categoriesById: Map<string, AdminCategory>,
  searchTerm: string,
) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const rows: Array<{ category: AdminCategory; depth: number; path: string }> = [];

  function visit(category: AdminCategory, depth: number) {
    const path = getCategoryPath(category, categoriesById);
    const matchesSearch =
      !normalizedSearch ||
      category.name.toLowerCase().includes(normalizedSearch) ||
      category.slug.toLowerCase().includes(normalizedSearch) ||
      path.toLowerCase().includes(normalizedSearch);

    if (matchesSearch) {
      rows.push({ category, depth, path });
    }

    for (const childCategory of childrenByParentId.get(category.id) ?? []) {
      visit(childCategory, depth + 1);
    }
  }

  for (const rootCategory of childrenByParentId.get("root") ?? []) {
    visit(rootCategory, 0);
  }

  return rows.length || normalizedSearch
    ? rows
    : categories.map((category) => ({
        category,
        depth: 0,
        path: getCategoryPath(category, categoriesById),
      }));
}

function groupCategoriesByParent(categories: AdminCategory[]) {
  const groupedCategories = new Map<string, AdminCategory[]>();

  for (const category of categories) {
    const parentKey = category.parentId ?? "root";
    const siblings = groupedCategories.get(parentKey) ?? [];
    siblings.push(category);
    groupedCategories.set(parentKey, siblings);
  }

  for (const siblings of groupedCategories.values()) {
    siblings.sort((first, second) => first.name.localeCompare(second.name));
  }

  return groupedCategories;
}

function getCategoryPath(
  category: AdminCategory,
  categoriesById: Map<string, AdminCategory>,
) {
  const path = [category.name];
  let parentId = category.parentId;

  while (parentId) {
    const parentCategory = categoriesById.get(parentId);

    if (!parentCategory) {
      break;
    }

    path.unshift(parentCategory.name);
    parentId = parentCategory.parentId;
  }

  return path.join(" -> ");
}

function getCategoryCoverageWarnings(
  targets: SelectedOfferTarget[],
  categoriesById: Map<string, AdminCategory>,
) {
  const categoryTargets = targets.filter((target) => target.type === "CATEGORY");
  const selectedCategoryIds = new Set(categoryTargets.map((target) => target.id));
  const warnings: string[] = [];

  for (const target of categoryTargets) {
    let parentId = categoriesById.get(target.id)?.parentId ?? null;

    while (parentId) {
      if (selectedCategoryIds.has(parentId)) {
        const parentLabel =
          categoryTargets.find((categoryTarget) => categoryTarget.id === parentId)?.label ??
          categoriesById.get(parentId)?.name ??
          "a selected parent category";
        warnings.push(`${target.label} is already covered through ${parentLabel}.`);
        break;
      }

      parentId = categoriesById.get(parentId)?.parentId ?? null;
    }
  }

  return warnings;
}

function filterProducts(products: AdminProduct[], searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return products;
  }

  return products.filter((product) => {
    const categoryText = product.categories
      .map((categoryLink) => categoryLink.category.name)
      .join(" ");

    return (
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.slug.toLowerCase().includes(normalizedSearch) ||
      categoryText.toLowerCase().includes(normalizedSearch)
    );
  });
}

function getProductDetailLine(product: AdminProduct) {
  const categoryPath = product.categories
    .map((categoryLink) => categoryLink.category.name)
    .join(", ");

  return [product.slug, categoryPath || null].filter(Boolean).join(" · ");
}

function targetKey(type: OfferTargetType, id: string) {
  return `${type}:${id}`;
}

function formatCount(count: number, label: string) {
  if (!count) {
    return "";
  }

  return `${count} ${label}${count === 1 ? "" : "s"}`;
}
