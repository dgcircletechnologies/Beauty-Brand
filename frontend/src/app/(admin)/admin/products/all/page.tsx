"use client";

import {
  FormEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ProductVariantForm,
  ProductVariantFormPayload,
} from "@/components/admin/product-variant-form";
import { useAuth } from "@/contexts/auth-context";
import {
  AdminCategory,
  AdminProduct,
  AdminProductDetail,
  AdminProductVariant,
  assignAdminVariantImages,
  createAdminProductVariant,
  deleteAdminProduct,
  deleteAdminProductImage,
  deleteAdminProductVariant,
  getAdminCategories,
  getAdminProduct,
  getAdminProducts,
  updateAdminProduct,
  updateAdminProductImage,
  updateAdminProductStatus,
  updateAdminProductVariant,
  uploadAdminProductImages,
  uploadAdminVariantImages,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const pageSize = 10;

type ProductEditValues = {
  name: string;
  shortDescription: string;
  description: string;
  usageInstructions: string;
  warnings: string;
  status: AdminProduct["status"];
  isFeatured: boolean;
};

type VariantEditValues = {
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  isActive: boolean;
};

type ImageDraft = {
  file: File;
  key: string;
  previewUrl: string;
};

export default function AllProductsPage() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedProduct, setSelectedProduct] =
    useState<AdminProductDetail | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [variantFormError, setVariantFormError] = useState<string | null>(null);
  const [productActionError, setProductActionError] = useState<string | null>(
    null,
  );
  const [variantActionError, setVariantActionError] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isVariantFormOpen, setIsVariantFormOpen] = useState(false);
  const [isProductEditing, setIsProductEditing] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [productEditValues, setProductEditValues] = useState<ProductEditValues>(
    getEmptyProductEditValues(),
  );
  const [variantEditValues, setVariantEditValues] =
    useState<VariantEditValues>(getEmptyVariantEditValues());
  const [isProductSubmitting, setIsProductSubmitting] = useState(false);
  const [isVariantSubmitting, setIsVariantSubmitting] = useState(false);
  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([]);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [isImageSubmitting, setIsImageSubmitting] = useState(false);
  const [variantImageSelections, setVariantImageSelections] = useState<
    Record<string, string[]>
  >({});
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadProducts() {
      setError(null);
      setIsLoading(true);

      try {
        const [nextCategories, nextProducts] = await Promise.all([
          getAdminCategories(token),
          getAdminProducts(token),
        ]);

        if (!isMounted) {
          return;
        }

        setCategories(nextCategories);
        setProducts(nextProducts);
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load products",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !selectedProductId) {
      return;
    }

    let isMounted = true;
    const token = accessToken;
    const productId = selectedProductId;

    async function loadProductDetail() {
      setDetailError(null);
      setIsDetailLoading(true);

      try {
        const product = await getAdminProduct(token, productId);

        if (isMounted) {
          setSelectedProduct(product);
          setVariantImageSelections(buildVariantImageSelections(product));
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setSelectedProduct(null);
        setDetailError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load product variants",
        );
      } finally {
        if (isMounted) {
          setIsDetailLoading(false);
        }
      }
    }

    void loadProductDetail();

    return () => {
      isMounted = false;
    };
  }, [accessToken, selectedProductId]);

  const selectProduct = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setIsVariantFormOpen(false);
    setVariantFormError(null);
    setProductActionError(null);
    setVariantActionError(null);
    setIsProductEditing(false);
    setEditingVariantId(null);
  }, []);

  const updateProductInList = useCallback((product: AdminProduct) => {
    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === product.id
          ? {
              ...currentProduct,
              ...product,
            }
          : currentProduct,
      ),
    );
  }, []);

  const startProductEdit = useCallback((product: AdminProductDetail) => {
    setProductEditValues(getProductEditValues(product));
    setProductActionError(null);
    setIsProductEditing(true);
  }, []);

  const closeProductEdit = useCallback(() => {
    imageDrafts.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImageDrafts([]);
    setImageActionError(null);
    setIsProductEditing(false);
  }, [imageDrafts]);

  const saveProductEdit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !selectedProduct) {
        return;
      }

      setIsProductSubmitting(true);
      setProductActionError(null);

      try {
        const updatedProduct = await updateAdminProduct(
          accessToken,
          selectedProduct.id,
          {
            name: productEditValues.name,
            shortDescription: productEditValues.shortDescription || undefined,
            description: productEditValues.description || undefined,
            usageInstructions:
              productEditValues.usageInstructions || undefined,
            warnings: productEditValues.warnings || undefined,
            status: productEditValues.status,
            isFeatured: productEditValues.isFeatured,
          },
        );

        setSelectedProduct(updatedProduct);
        setVariantImageSelections(buildVariantImageSelections(updatedProduct));
        updateProductInList(updatedProduct);
        imageDrafts.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setImageDrafts([]);
        setIsProductEditing(false);
      } catch (caughtError) {
        setProductActionError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update product",
        );
      } finally {
        setIsProductSubmitting(false);
      }
    },
    [
      accessToken,
      imageDrafts,
      productEditValues,
      selectedProduct,
      updateProductInList,
    ],
  );

  const toggleProductActive = useCallback(
    async (product: AdminProduct) => {
      if (!accessToken) {
        return;
      }

      const nextStatus =
        product.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED";

      setIsProductSubmitting(true);
      setProductActionError(null);

      try {
        const updatedProduct = await updateAdminProductStatus(
          accessToken,
          product.id,
          nextStatus,
        );

        updateProductInList(updatedProduct);

        if (selectedProduct?.id === product.id) {
          setSelectedProduct((currentProduct) =>
            currentProduct
              ? {
                  ...currentProduct,
                  status: updatedProduct.status,
                  variants:
                    updatedProduct.status === "ARCHIVED"
                      ? currentProduct.variants.map((variant) => ({
                          ...variant,
                          isActive: false,
                        }))
                      : currentProduct.variants,
                }
              : currentProduct,
          );
        }
      } catch (caughtError) {
        setProductActionError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update product status",
        );
      } finally {
        setIsProductSubmitting(false);
      }
    },
    [accessToken, selectedProduct, updateProductInList],
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      if (!accessToken) {
        return;
      }

      setIsProductSubmitting(true);
      setProductActionError(null);

      try {
        await deleteAdminProduct(accessToken, productId);
        setProducts((currentProducts) =>
          currentProducts.filter((product) => product.id !== productId),
        );

        if (selectedProductId === productId) {
          setSelectedProductId(null);
          setSelectedProduct(null);
        }
      } catch (caughtError) {
        setProductActionError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to delete product",
        );
      } finally {
        setIsProductSubmitting(false);
      }
    },
    [accessToken, selectedProductId],
  );

  async function handleCreateVariant(payload: ProductVariantFormPayload) {
    if (!accessToken || !selectedProductId) {
      return;
    }

    setVariantFormError(null);
    setIsVariantSubmitting(true);

    try {
      const { imageFiles = [] } = payload;
      const variantPayload = {
        sku: payload.sku,
        price: payload.price,
        compareAtPrice: payload.compareAtPrice,
        stockQuantity: payload.stockQuantity,
        isActive: payload.isActive,
      };
      const variant = await createAdminProductVariant(
        accessToken,
        selectedProductId,
        variantPayload,
      );

      if (imageFiles.length) {
        await uploadAdminVariantImages(
          accessToken,
          selectedProductId,
          variant.id,
          imageFiles,
        );
      }

      const product = await getAdminProduct(accessToken, selectedProductId);
      setSelectedProduct(product);
      setVariantImageSelections(buildVariantImageSelections(product));
      setIsVariantFormOpen(false);
    } catch (caughtError) {
      setVariantFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create variant",
      );
    } finally {
      setIsVariantSubmitting(false);
    }
  }

  const refreshSelectedProduct = useCallback(async () => {
    if (!accessToken || !selectedProductId) {
      return;
    }

    const product = await getAdminProduct(accessToken, selectedProductId);
    setSelectedProduct(product);
    setVariantImageSelections(buildVariantImageSelections(product));
  }, [accessToken, selectedProductId]);

  const startVariantEdit = useCallback((variant: AdminProductVariant) => {
    setEditingVariantId(variant.id);
    setVariantActionError(null);
    setImageActionError(null);
    setVariantEditValues({
      price: String(variant.price),
      compareAtPrice: variant.compareAtPrice ? String(variant.compareAtPrice) : "",
      stockQuantity: String(variant.stockQuantity),
      isActive: variant.isActive,
    });
  }, []);

  const saveVariantEdit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !selectedProductId || !editingVariantId) {
        return;
      }

      setIsVariantSubmitting(true);
      setVariantActionError(null);

      try {
        await updateAdminProductVariant(
          accessToken,
          selectedProductId,
          editingVariantId,
          {
            price: Number(variantEditValues.price),
            compareAtPrice: variantEditValues.compareAtPrice
              ? Number(variantEditValues.compareAtPrice)
              : null,
            stockQuantity: Number(variantEditValues.stockQuantity),
            isActive:
              selectedProduct?.status === "ARCHIVED"
                ? false
                : variantEditValues.isActive,
          },
        );
        await refreshSelectedProduct();
        setEditingVariantId(null);
      } catch (caughtError) {
        setVariantActionError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update variant",
        );
      } finally {
        setIsVariantSubmitting(false);
      }
    },
    [
      accessToken,
      editingVariantId,
      refreshSelectedProduct,
      selectedProduct,
      selectedProductId,
      variantEditValues,
    ],
  );

  const toggleVariantActive = useCallback(
    async (variant: AdminProductVariant) => {
      if (!accessToken || !selectedProductId || selectedProduct?.status === "ARCHIVED") {
        return;
      }

      setIsVariantSubmitting(true);
      setVariantActionError(null);

      try {
        await updateAdminProductVariant(accessToken, selectedProductId, variant.id, {
          isActive: !variant.isActive,
        });
        await refreshSelectedProduct();
      } catch (caughtError) {
        setVariantActionError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update variant status",
        );
      } finally {
        setIsVariantSubmitting(false);
      }
    },
    [accessToken, refreshSelectedProduct, selectedProduct?.status, selectedProductId],
  );

  const removeVariant = useCallback(
    async (variantId: string) => {
      if (!accessToken || !selectedProductId) {
        return;
      }

      setIsVariantSubmitting(true);
      setVariantActionError(null);

      try {
        await deleteAdminProductVariant(accessToken, selectedProductId, variantId);
        await refreshSelectedProduct();
      } catch (caughtError) {
        setVariantActionError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to delete variant",
        );
      } finally {
        setIsVariantSubmitting(false);
      }
    },
    [accessToken, refreshSelectedProduct, selectedProductId],
  );

  async function handleUploadImages() {
    if (!accessToken || !selectedProductId || !imageDrafts.length) {
      return;
    }

    setImageActionError(null);
    setIsImageSubmitting(true);

    try {
      await uploadAdminProductImages(
        accessToken,
        selectedProductId,
        imageDrafts.map((image) => image.file),
      );
      imageDrafts.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setImageDrafts([]);
      await refreshSelectedProduct();
    } catch (caughtError) {
      setImageActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload product images",
      );
    } finally {
      setIsImageSubmitting(false);
    }
  }

  function addImageDrafts(files: File[]) {
    setImageDrafts((current) => [
      ...current,
      ...files.map((file) => ({
        file,
        key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeImageDraft(imageKey: string) {
    setImageDrafts((current) => {
      const image = current.find((draft) => draft.key === imageKey);

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      return current.filter((draft) => draft.key !== imageKey);
    });
  }

  async function handleSetPrimaryImage(imageId: string) {
    if (!accessToken || !selectedProductId) {
      return;
    }

    setImageActionError(null);
    setIsImageSubmitting(true);

    try {
      await updateAdminProductImage(accessToken, selectedProductId, imageId, {
        isPrimary: true,
      });
      await refreshSelectedProduct();
    } catch (caughtError) {
      setImageActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to set primary image",
      );
    } finally {
      setIsImageSubmitting(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!accessToken || !selectedProductId) {
      return;
    }

    setImageActionError(null);
    setIsImageSubmitting(true);

    try {
      await deleteAdminProductImage(accessToken, selectedProductId, imageId);
      await refreshSelectedProduct();
    } catch (caughtError) {
      setImageActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete image",
      );
    } finally {
      setIsImageSubmitting(false);
    }
  }

  async function handleSaveVariantImages(variantId: string) {
    if (!accessToken || !selectedProductId) {
      return;
    }

    setImageActionError(null);
    setIsImageSubmitting(true);

    try {
      await assignAdminVariantImages(
        accessToken,
        selectedProductId,
        variantId,
        variantImageSelections[variantId] ?? [],
      );
      await refreshSelectedProduct();
    } catch (caughtError) {
      setImageActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to assign variant images",
      );
    } finally {
      setIsImageSubmitting(false);
    }
  }

  async function handleUploadVariantImages(variantId: string, files: File[]) {
    if (!accessToken || !selectedProductId || !files.length) {
      return;
    }

    setImageActionError(null);
    setIsImageSubmitting(true);

    try {
      await uploadAdminVariantImages(
        accessToken,
        selectedProductId,
        variantId,
        files,
      );
      await refreshSelectedProduct();
    } catch (caughtError) {
      setImageActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload variant images",
      );
    } finally {
      setIsImageSubmitting(false);
    }
  }

  function toggleVariantImage(variantId: string, imageId: string) {
    setVariantImageSelections((current) => {
      const selectedImages = current[variantId] ?? [];
      const nextSelectedImages = selectedImages.includes(imageId)
        ? selectedImages.filter((selectedImageId) => selectedImageId !== imageId)
        : [...selectedImages, imageId];

      return {
        ...current,
        [variantId]: nextSelectedImages,
      };
    });
  }

  const filteredProducts = useMemo(() => {
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        product.categories.some(
          (categoryLink) => categoryLink.categoryId === categoryFilter,
        );

      const matchesFeatured =
        featuredFilter === "all" ||
        (featuredFilter === "featured" && product.isFeatured) ||
        (featuredFilter === "standard" && !product.isFeatured);

      return (
        matchesSearch && matchesStatus && matchesCategory && matchesFeatured
      );
    });
  }, [
    categoryFilter,
    debouncedSearchTerm,
    featuredFilter,
    products,
    statusFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredProducts]);

  const selectedVariant = useMemo(() => {
    if (!selectedProduct || !editingVariantId) {
      return null;
    }

    return (
      selectedProduct.variants.find((variant) => variant.id === editingVariantId) ??
      null
    );
  }, [editingVariantId, selectedProduct]);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>All Products</h1>
          <p>Search, filter, and select a product to view its variants.</p>
        </div>
      </section>

      <section className="admin-toolbar">
        <div className="all-products-filters">
          <input
            aria-label="Search products"
            placeholder="Search by name or slug"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by featured"
            value={featuredFilter}
            onChange={(event) => {
              setFeaturedFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Featured and standard</option>
            <option value="featured">Featured only</option>
            <option value="standard">Standard only</option>
          </select>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {productActionError ? (
        <p className="form-error">{productActionError}</p>
      ) : null}

      <section className="all-products-layout">
        <div className="catalog-section">
          <div className="section-title">
            <h2>Products</h2>
            <span>{filteredProducts.length}</span>
          </div>
          {isLoading ? (
            <p className="muted-text">Loading products...</p>
          ) : (
            <>
              <div className="admin-product-table">
                {visibleProducts.map((product) => (
                  <ProductCard
                    isSelected={selectedProductId === product.id}
                    key={product.id}
                    product={product}
                    onSelect={selectProduct}
                  />
                ))}
              {!isLoading && filteredProducts.length === 0 ? (
                <p className="muted-text">No products match these filters.</p>
              ) : null}
              </div>
              <PaginationControls
                currentPage={currentPage}
                disabled={isLoading}
                hasNextPage={currentPage < totalPages}
                hasPreviousPage={currentPage > 1}
                totalPages={totalPages}
                onNext={() => setPage((current) => current + 1)}
                onPrevious={() => setPage((current) => Math.max(current - 1, 1))}
              />
            </>
          )}
        </div>

        <aside className="catalog-section product-detail-panel">
          <div className="section-title">
            <h2>Variants</h2>
            <span>{selectedProduct?.variants.length ?? 0}</span>
          </div>
          {!selectedProductId ? (
            <p className="muted-text">Select a product to view variants.</p>
          ) : null}
          {isDetailLoading ? (
            <p className="muted-text">Loading variants...</p>
          ) : null}
          {detailError ? <p className="form-error">{detailError}</p> : null}
          {selectedProduct && !isDetailLoading ? (
            <div className="variant-panel-content">
              <div className="product-detail-heading">
                <div>
                  <h3>{selectedProduct.name}</h3>
                  <p>
                    {selectedProduct.shortDescription ?? selectedProduct.slug}
                  </p>
                  <small>{selectedProduct.slug}</small>
                </div>
                <div className="row-actions">
                  <button
                    className="secondary-button compact-button"
                    disabled={isProductSubmitting}
                    type="button"
                    onClick={() => startProductEdit(selectedProduct)}
                  >
                    Edit Product
                  </button>
                  <StatusToggle
                    checked={selectedProduct.status === "PUBLISHED"}
                    disabled={isProductSubmitting}
                    label={
                      selectedProduct.status === "PUBLISHED"
                        ? "Set product inactive"
                        : "Set product active"
                    }
                    onChange={() => void toggleProductActive(selectedProduct)}
                  />
                  <button
                    className="secondary-button compact-button"
                    disabled={isProductSubmitting}
                    type="button"
                    onClick={() => void removeProduct(selectedProduct.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsVariantFormOpen((current) => !current)}
              >
                {isVariantFormOpen ? "Close Variant Form" : "Add Variant"}
              </button>
              <section className="variant-form-panel">
                <div className="section-title">
                  <h3>Images</h3>
                  <span>{selectedProduct.images?.length ?? 0}</span>
                </div>
                {imageActionError ? (
                  <p className="form-error">{imageActionError}</p>
                ) : null}
                {selectedProduct.images?.length ? (
                  <div className="product-image-grid">
                    {selectedProduct.images.map((image) => (
                      <article className="product-image-card" key={image.id}>
                        <img
                          alt={image.altText ?? selectedProduct.name}
                          src={image.url}
                        />
                        <span>{image.isPrimary ? "Primary" : "Gallery"}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted-text">No product images uploaded yet.</p>
                )}
              </section>
              {isVariantFormOpen ? (
                <div className="variant-form-panel">
                  <ProductVariantForm
                    isSubmitting={isVariantSubmitting}
                    submitLabel="Create Variant"
                    onCancel={() => setIsVariantFormOpen(false)}
                    onSubmit={handleCreateVariant}
                  />
                  {variantFormError ? (
                    <p className="form-error">{variantFormError}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="variant-list">
                {variantActionError ? (
                  <p className="form-error">{variantActionError}</p>
                ) : null}
                {selectedProduct.variants.length > 0 ? (
                  selectedProduct.variants.map((variant) => (
                    <VariantRow
                      disabled={isVariantSubmitting || isImageSubmitting}
                      key={variant.id}
                      product={selectedProduct}
                      productIsInactive={selectedProduct.status === "ARCHIVED"}
                      variant={variant}
                      onDelete={removeVariant}
                      onEdit={startVariantEdit}
                      onToggleActive={toggleVariantActive}
                    />
                  ))
                ) : (
                  <p className="muted-text">No variants created yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
      {isProductEditing && selectedProduct ? (
        <ProductEditModal
          disabled={isProductSubmitting}
          imageActionError={imageActionError}
          imageDrafts={imageDrafts}
          isImageSubmitting={isImageSubmitting}
          product={selectedProduct}
          values={productEditValues}
          onAddImageDrafts={addImageDrafts}
          onCancel={closeProductEdit}
          onChange={(updates) =>
            setProductEditValues((currentValues) => ({
              ...currentValues,
              ...updates,
            }))
          }
          onDeleteImage={handleDeleteImage}
          onRemoveImageDraft={removeImageDraft}
          onSetPrimaryImage={handleSetPrimaryImage}
          onSubmit={saveProductEdit}
          onUploadImages={handleUploadImages}
        />
      ) : null}
      {selectedProduct && selectedVariant ? (
        <VariantEditModal
          disabled={isVariantSubmitting || isImageSubmitting}
          imageActionError={imageActionError}
          imageSelections={variantImageSelections[selectedVariant.id] ?? []}
          isImageSubmitting={isImageSubmitting}
          product={selectedProduct}
          productIsInactive={selectedProduct.status === "ARCHIVED"}
          values={variantEditValues}
          variant={selectedVariant}
          onCancel={() => setEditingVariantId(null)}
          onChange={(updates) =>
            setVariantEditValues((currentValues) => ({
              ...currentValues,
              ...updates,
            }))
          }
          onDeleteImage={handleDeleteImage}
          onSave={saveVariantEdit}
          onSaveImages={handleSaveVariantImages}
          onToggleImage={toggleVariantImage}
          onUploadImages={handleUploadVariantImages}
        />
      ) : null}
    </main>
  );
}

type ProductCardProps = {
  isSelected: boolean;
  product: AdminProduct;
  onSelect: (productId: string) => void;
};

const ProductCard = memo(function ProductCard({
  isSelected,
  product,
  onSelect,
}: ProductCardProps) {
  const isActive = product.status === "PUBLISHED";
  const images = product.images ?? [];

  return (
    <article
      className={isSelected ? "admin-product-card active" : "admin-product-card"}
    >
      <ProductImageSlider images={images} productName={product.name} />
      <button
        className="admin-product-card-select"
        type="button"
        onClick={() => onSelect(product.id)}
      >
        <span className="admin-product-card-body">
          <span>
            <strong>{product.name}</strong>
            <small>{product.slug}</small>
          </span>
          <span className="admin-product-card-meta">
            <small>{product.status}</small>
            <small>{isActive ? "Active" : "Inactive"}</small>
            <small>{product.isFeatured ? "Featured" : "Standard"}</small>
          </span>
          <span className="admin-product-card-categories">
            {product.categories
              .map((categoryLink) => categoryLink.category.name)
              .join(", ") || "Uncategorized"}
          </span>
        </span>
      </button>
    </article>
  );
});

type ProductImageSliderProps = {
  images: NonNullable<AdminProduct["images"]>;
  productName: string;
};

const ProductImageSlider = memo(function ProductImageSlider({
  images,
  productName,
}: ProductImageSliderProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const safeImageIndex = images[imageIndex] ? imageIndex : 0;
  const image = images[safeImageIndex] ?? null;

  if (!image) {
    return <span className="admin-product-card-empty-image">No image</span>;
  }

  return (
    <span className="admin-product-card-media">
      <img alt={image.altText ?? productName} src={image.url} />
      {images.length > 1 ? (
        <span className="admin-product-card-slider">
          <button
            aria-label="Previous image"
            className="admin-product-card-slider-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setImageIndex((currentIndex) =>
                currentIndex === 0 ? images.length - 1 : currentIndex - 1,
              );
            }}
          >
            ‹
          </button>
          <small>
            {safeImageIndex + 1}/{images.length}
          </small>
          <button
            aria-label="Next image"
            className="admin-product-card-slider-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setImageIndex((currentIndex) =>
                currentIndex === images.length - 1 ? 0 : currentIndex + 1,
              );
            }}
          >
            ›
          </button>
        </span>
      ) : null}
    </span>
  );
});

type ProductEditFormProps = {
  disabled: boolean;
  imageActionError: string | null;
  imageDrafts: ImageDraft[];
  isImageSubmitting: boolean;
  product: AdminProductDetail;
  values: ProductEditValues;
  onAddImageDrafts: (files: File[]) => void;
  onCancel: () => void;
  onChange: (updates: Partial<ProductEditValues>) => void;
  onDeleteImage: (imageId: string) => void;
  onRemoveImageDraft: (imageKey: string) => void;
  onSetPrimaryImage: (imageId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUploadImages: () => void;
};

const ProductEditForm = memo(function ProductEditForm({
  disabled,
  imageActionError,
  imageDrafts,
  isImageSubmitting,
  product,
  values,
  onAddImageDrafts,
  onCancel,
  onChange,
  onDeleteImage,
  onRemoveImageDraft,
  onSetPrimaryImage,
  onSubmit,
  onUploadImages,
}: ProductEditFormProps) {
  return (
    <form className="admin-form compact-admin-form" onSubmit={onSubmit}>
      <div className="split-fields">
        <label>
          Name
          <input
            required
            value={values.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
        <label>
          Slug
          <input disabled value={product.slug} />
        </label>
      </div>
      <label>
        Short description
        <input
          maxLength={300}
          value={values.shortDescription}
          onChange={(event) =>
            onChange({ shortDescription: event.target.value })
          }
        />
      </label>
      <label>
        Description
        <textarea
          rows={4}
          value={values.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
      <div className="split-fields">
        <label>
          Usage instructions
          <textarea
            rows={3}
            value={values.usageInstructions}
            onChange={(event) =>
              onChange({ usageInstructions: event.target.value })
            }
          />
        </label>
        <label>
          Warnings
          <textarea
            rows={3}
            value={values.warnings}
            onChange={(event) => onChange({ warnings: event.target.value })}
          />
        </label>
      </div>
      <div className="split-fields">
        <label>
          Status
          <select
            value={values.status}
            onChange={(event) =>
              onChange({ status: event.target.value as AdminProduct["status"] })
            }
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label className="checkbox-field">
          <input
            checked={values.isFeatured}
            type="checkbox"
            onChange={(event) => onChange({ isFeatured: event.target.checked })}
          />
          Featured product
        </label>
      </div>
      <div className="form-actions">
        <button className="primary-button" disabled={disabled} type="submit">
          {disabled ? "Saving..." : "Save Product"}
        </button>
        <button
          className="secondary-button"
          disabled={disabled}
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      <section className="variant-form-panel">
        <div className="section-title">
          <h3>Images</h3>
          <span>{product.images?.length ?? 0}</span>
        </div>
        {imageActionError ? <p className="form-error">{imageActionError}</p> : null}
        <label>
          Upload product images
          <input
            accept="image/*"
            multiple
            type="file"
            onChange={(event) => {
              onAddImageDrafts(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </label>
        {imageDrafts.length ? (
          <div className="product-image-grid">
            {imageDrafts.map((image) => (
              <article className="product-image-card" key={image.key}>
                <img alt={image.file.name} src={image.previewUrl} />
                <span>{image.file.name}</span>
                <button
                  className="secondary-button compact-button"
                  type="button"
                  onClick={() => onRemoveImageDraft(image.key)}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        ) : null}
        <button
          className="primary-button"
          disabled={isImageSubmitting || !imageDrafts.length}
          type="button"
          onClick={onUploadImages}
        >
          {isImageSubmitting ? "Saving..." : "Upload Images"}
        </button>
        {product.images?.length ? (
          <div className="product-image-grid">
            {product.images.map((image) => (
              <article className="product-image-card" key={image.id}>
                <img alt={image.altText ?? product.name} src={image.url} />
                <span>{image.isPrimary ? "Primary" : "Gallery"}</span>
                <button
                  className="secondary-button compact-button"
                  disabled={isImageSubmitting || image.isPrimary}
                  type="button"
                  onClick={() => onSetPrimaryImage(image.id)}
                >
                  Set Primary
                </button>
                <button
                  className="secondary-button compact-button"
                  disabled={isImageSubmitting}
                  type="button"
                  onClick={() => onDeleteImage(image.id)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted-text">No product images uploaded yet.</p>
        )}
      </section>
    </form>
  );
});

type ProductEditModalProps = ProductEditFormProps;

const ProductEditModal = memo(function ProductEditModal({
  product,
  onCancel,
  ...formProps
}: ProductEditModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <h3>Edit {product.name}</h3>
            <p>Slug stays locked as {product.slug}.</p>
          </div>
          <button className="secondary-button compact-button" type="button" onClick={onCancel}>
            Close
          </button>
        </div>
        <ProductEditForm product={product} onCancel={onCancel} {...formProps} />
      </div>
    </div>
  );
});

type VariantRowProps = {
  disabled: boolean;
  product: AdminProductDetail;
  productIsInactive: boolean;
  variant: AdminProductVariant;
  onDelete: (variantId: string) => void;
  onEdit: (variant: AdminProductVariant) => void;
  onToggleActive: (variant: AdminProductVariant) => void;
};

const VariantRow = memo(function VariantRow({
  disabled,
  product,
  productIsInactive,
  variant,
  onDelete,
  onEdit,
  onToggleActive,
}: VariantRowProps) {
  const variantImages = product.images?.filter(
    (image) => image.variantId === variant.id,
  ) ?? [];

  return (
    <article className="variant-row">
      <div>
        <strong>{variant.sku}</strong>
        <small>{variant.isActive ? "Active" : "Inactive"}</small>
      </div>
      <div>
        <span>{formatMoney(variant.price)}</span>
        <small>Stock {variant.stockQuantity}</small>
      </div>
      <div className="row-actions">
        <StatusToggle
          checked={variant.isActive}
          disabled={disabled || productIsInactive}
          label={variant.isActive ? "Set variant inactive" : "Set variant active"}
          onChange={() => onToggleActive(variant)}
        />
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          type="button"
          onClick={() => onEdit(variant)}
        >
          Edit
        </button>
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          type="button"
          onClick={() => onDelete(variant.id)}
        >
          Delete
        </button>
      </div>

      {variantImages.length ? (
        <div className="variant-readonly-images">
          {variantImages.map((image) => (
            <img alt={image.altText ?? variant.sku} key={image.id} src={image.url} />
          ))}
        </div>
      ) : null}
    </article>
  );
});

type VariantEditModalProps = {
  disabled: boolean;
  imageActionError: string | null;
  imageSelections: string[];
  isImageSubmitting: boolean;
  product: AdminProductDetail;
  productIsInactive: boolean;
  values: VariantEditValues;
  variant: AdminProductVariant;
  onCancel: () => void;
  onChange: (updates: Partial<VariantEditValues>) => void;
  onDeleteImage: (imageId: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onSaveImages: (variantId: string) => void;
  onToggleImage: (variantId: string, imageId: string) => void;
  onUploadImages: (variantId: string, files: File[]) => void;
};

const VariantEditModal = memo(function VariantEditModal({
  disabled,
  imageActionError,
  imageSelections,
  isImageSubmitting,
  product,
  productIsInactive,
  values,
  variant,
  onCancel,
  onChange,
  onDeleteImage,
  onSave,
  onSaveImages,
  onToggleImage,
  onUploadImages,
}: VariantEditModalProps) {
  const variantImages = product.images?.filter(
    (image) => image.variantId === variant.id,
  ) ?? [];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <h3>Edit Variant</h3>
            <p>SKU stays locked as {variant.sku}.</p>
          </div>
          <button className="secondary-button compact-button" type="button" onClick={onCancel}>
            Close
          </button>
        </div>

        <form className="admin-form compact-admin-form" onSubmit={onSave}>
          <div className="split-fields">
            <label>
              SKU
              <input disabled value={variant.sku} />
            </label>
            <label>
              Price
              <input
                min={0}
                required
                step="0.01"
                type="number"
                value={values.price}
                onChange={(event) => onChange({ price: event.target.value })}
              />
            </label>
          </div>
          <div className="split-fields">
            <label>
              Compare price
              <input
                min={0}
                step="0.01"
                type="number"
                value={values.compareAtPrice}
                onChange={(event) =>
                  onChange({ compareAtPrice: event.target.value })
                }
              />
            </label>
            <label>
              Stock
              <input
                min={0}
                step="1"
                type="number"
                value={values.stockQuantity}
                onChange={(event) =>
                  onChange({ stockQuantity: event.target.value })
                }
              />
            </label>
          </div>
          <div className="checkbox-field">
            <StatusToggle
              checked={values.isActive && !productIsInactive}
              disabled={productIsInactive}
              label={values.isActive ? "Set variant inactive" : "Set variant active"}
              onChange={() => onChange({ isActive: !values.isActive })}
            />
            Active variant
          </div>
          <div className="form-actions">
            <button className="primary-button" disabled={disabled} type="submit">
              Save Variant
            </button>
            <button
              className="secondary-button"
              disabled={disabled}
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>

        <section className="variant-form-panel">
          <div className="section-title">
            <h3>Images</h3>
            <span>{variantImages.length}</span>
          </div>
          {imageActionError ? <p className="form-error">{imageActionError}</p> : null}
          <label>
            Upload variant images
            <input
              accept="image/*"
              multiple
              type="file"
              onChange={(event) => {
                onUploadImages(variant.id, Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </label>

          {variantImages.length ? (
            <div className="product-image-grid">
              {variantImages.map((image) => (
                <article className="product-image-card" key={image.id}>
                  <img alt={image.altText ?? variant.sku} src={image.url} />
                  <span>{image.altText ?? "Variant image"}</span>
                  <button
                    className="secondary-button compact-button"
                    disabled={disabled}
                    type="button"
                    onClick={() => onDeleteImage(image.id)}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          ) : null}

          {product.images?.length ? (
            <div className="variant-image-picker">
              {product.images.map((image) => (
                <label
                  className={
                    imageSelections.includes(image.id) ? "selected" : undefined
                  }
                  key={`${variant.id}-${image.id}`}
                >
                  <input
                    checked={imageSelections.includes(image.id)}
                    type="checkbox"
                    onChange={() => onToggleImage(variant.id, image.id)}
                  />
                  <img alt={image.altText ?? product.name} src={image.url} />
                </label>
              ))}
              <button
                className="secondary-button compact-button"
                disabled={disabled || isImageSubmitting}
                type="button"
                onClick={() => onSaveImages(variant.id)}
              >
                Save Images
              </button>
            </div>
          ) : (
            <p className="muted-text">No product images are available to select.</p>
          )}
        </section>
      </div>
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

type StatusToggleProps = {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: () => void;
};

const StatusToggle = memo(function StatusToggle({
  checked,
  disabled,
  label,
  onChange,
}: StatusToggleProps) {
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

function formatMoney(value: string) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return value;
  }

  return amount.toFixed(2);
}

function getEmptyProductEditValues(): ProductEditValues {
  return {
    name: "",
    shortDescription: "",
    description: "",
    usageInstructions: "",
    warnings: "",
    status: "DRAFT",
    isFeatured: false,
  };
}

function getProductEditValues(product: AdminProductDetail): ProductEditValues {
  return {
    name: product.name,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    usageInstructions: product.usageInstructions ?? "",
    warnings: product.warnings ?? "",
    status: product.status,
    isFeatured: product.isFeatured,
  };
}

function getEmptyVariantEditValues(): VariantEditValues {
  return {
    price: "",
    compareAtPrice: "",
    stockQuantity: "0",
    isActive: true,
  };
}

function buildVariantImageSelections(product: AdminProductDetail) {
  return product.variants.reduce<Record<string, string[]>>((acc, variant) => {
    acc[variant.id] = product.images
      ?.filter((image) => image.variantId === variant.id)
      .map((image) => image.id) ?? [];

    return acc;
  }, {});
}
