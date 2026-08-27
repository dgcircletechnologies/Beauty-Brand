"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type {
  AdminVariantSkuAvailability,
  CreateAdminProductVariantPayload,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export type ProductVariantFormPayload = CreateAdminProductVariantPayload & {
  imageFileKeys?: string[];
  imageFiles?: File[];
};

type VariantImageDraft = {
  file: File;
  key: string;
  previewUrl: string;
};

type ProductVariantFormProps = {
  asForm?: boolean;
  checkSkuAvailability?: (sku: string) => Promise<AdminVariantSkuAvailability>;
  imageOptions?: {
    key: string;
    label: string;
    previewUrl: string;
  }[];
  isSubmitting?: boolean;
  reservedSkus?: string[];
  children?: ReactNode;
  onCancel?: () => void;
  onSubmit: (payload: ProductVariantFormPayload) => Promise<void> | void;
  submitLabel?: string;
};

export function ProductVariantForm({
  asForm = true,
  checkSkuAvailability,
  imageOptions = [],
  isSubmitting = false,
  reservedSkus = [],
  children,
  onCancel,
  onSubmit,
  submitLabel = "Add Variant",
}: ProductVariantFormProps) {
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [selectedImageKeys, setSelectedImageKeys] = useState<string[]>([]);
  const [imageDrafts, setImageDrafts] = useState<VariantImageDraft[]>([]);
  const [skuStatus, setSkuStatus] =
    useState<AdminVariantSkuAvailability | null>(null);
  const [isCheckingSku, setIsCheckingSku] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageDraftsRef = useRef<VariantImageDraft[]>([]);
  const debouncedSku = useDebouncedValue(sku, 450);
  const normalizedSku = sku.trim().toUpperCase();
  const reservedSkuSet = useMemo(
    () => new Set(reservedSkus.map((reservedSku) => reservedSku.toUpperCase())),
    [reservedSkus],
  );
  const skuIsReserved = Boolean(normalizedSku && reservedSkuSet.has(normalizedSku));

  useEffect(() => {
    if (!checkSkuAvailability || !debouncedSku.trim() || skuIsReserved) {
      return;
    }

    let isMounted = true;
    const skuSnapshot = debouncedSku.trim().toUpperCase();
    const checkSkuAvailabilitySnapshot = checkSkuAvailability;

    async function checkSku() {
      setIsCheckingSku(true);

      try {
        const nextStatus = await checkSkuAvailabilitySnapshot(skuSnapshot);

        if (isMounted) {
          setSkuStatus(nextStatus);
        }
      } catch {
        if (isMounted) {
          setSkuStatus(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSku(false);
        }
      }
    }

    void checkSku();

    return () => {
      isMounted = false;
    };
  }, [checkSkuAvailability, debouncedSku, skuIsReserved]);

  useEffect(() => {
    imageDraftsRef.current = imageDrafts;
  }, [imageDrafts]);

  useEffect(() => {
    return () => {
      imageDraftsRef.current.forEach((imageDraft) =>
        URL.revokeObjectURL(imageDraft.previewUrl),
      );
    };
  }, []);

  const skuIsAvailable =
    Boolean(normalizedSku) &&
    !skuIsReserved &&
    (!checkSkuAvailability ||
      (skuStatus?.sku === normalizedSku && skuStatus.available));
  const canSubmitVariant =
    Boolean(normalizedSku) &&
    Boolean(price) &&
    skuIsAvailable &&
    !isSubmitting &&
    !isCheckingSku;

  const removeImageDraft = useCallback((imageKey: string) => {
    setImageDrafts((currentDrafts) => {
      const imageDraft = currentDrafts.find((draft) => draft.key === imageKey);

      if (imageDraft) {
        URL.revokeObjectURL(imageDraft.previewUrl);
      }

      return currentDrafts.filter((draft) => draft.key !== imageKey);
    });
  }, []);

  const submitVariant = useCallback(async () => {
    setError(null);

    if (!sku.trim()) {
      setError("SKU is required");
      return;
    }

    if (!price) {
      setError("Price is required");
      return;
    }

    if (!skuIsAvailable) {
      setError(
        skuIsReserved
          ? "This SKU is already added to another draft variant"
          : "SKU is already in use",
      );
      return;
    }

    await onSubmit({
      sku,
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      stockQuantity: stockQuantity ? Number(stockQuantity) : 0,
      isActive,
      imageFileKeys: selectedImageKeys,
      imageFiles: imageDrafts.map((imageDraft) => imageDraft.file),
    });

    imageDrafts.forEach((imageDraft) =>
      URL.revokeObjectURL(imageDraft.previewUrl),
    );
    setSku("");
    setPrice("");
    setCompareAtPrice("");
    setStockQuantity("0");
    setIsActive(true);
    setSelectedImageKeys([]);
    setImageDrafts([]);
    setSkuStatus(null);
  }, [
    compareAtPrice,
    imageDrafts,
    isActive,
    onSubmit,
    price,
    selectedImageKeys,
    sku,
    skuIsAvailable,
    skuIsReserved,
    stockQuantity,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitVariant();
  }

  const fields = (
    <>
      <div className="split-fields">
        <label>
          SKU
          <input
            maxLength={120}
            value={sku}
            onChange={(event) => setSku(event.target.value.toUpperCase())}
          />
          {normalizedSku ? (
            <small className={skuIsAvailable ? "form-success" : "form-error"}>
              {skuIsReserved
                ? "This SKU is already added to another draft variant."
                : !checkSkuAvailability
                  ? "SKU ready."
                : isCheckingSku || skuStatus?.sku !== normalizedSku
                  ? "Checking SKU..."
                  : skuIsAvailable
                    ? "SKU is available."
                    : "SKU is already in use."}
            </small>
          ) : null}
        </label>
        <label>
          Price
          <input
            min={0}
            step="0.01"
            type="number"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
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
            value={compareAtPrice}
            onChange={(event) => setCompareAtPrice(event.target.value)}
          />
        </label>
        <label>
          Stock
          <input
            min={0}
            step="1"
            type="number"
            value={stockQuantity}
            onChange={(event) => setStockQuantity(event.target.value)}
          />
        </label>
      </div>

      <label className="checkbox-field">
        <input
          checked={isActive}
          type="checkbox"
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Active variant
      </label>

      {imageOptions.length ? (
        <div className="variant-image-picker">
          {imageOptions.map((image) => (
            <label
              className={
                selectedImageKeys.includes(image.key) ? "selected" : undefined
              }
              key={image.key}
            >
              <input
                checked={selectedImageKeys.includes(image.key)}
                type="checkbox"
                onChange={() =>
                  setSelectedImageKeys((current) =>
                    current.includes(image.key)
                      ? current.filter((key) => key !== image.key)
                      : [...current, image.key],
                  )
                }
              />
              <img alt={image.label} src={image.previewUrl} />
              <small>{image.label}</small>
            </label>
          ))}
        </div>
      ) : null}

      <label>
        Variant images
        <input
          accept="image/*"
          multiple
          type="file"
          onChange={(event) => {
            const selectedFiles = Array.from(event.target.files ?? []);

            setImageDrafts((currentDrafts) => [
              ...currentDrafts,
              ...selectedFiles.map((file) => ({
                file,
                key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
                previewUrl: URL.createObjectURL(file),
              })),
            ]);
            event.target.value = "";
          }}
        />
      </label>

      {imageDrafts.length ? (
        <div className="product-image-grid">
          {imageDrafts.map((imageDraft) => (
            <article className="product-image-card" key={imageDraft.key}>
              <img alt={imageDraft.file.name} src={imageDraft.previewUrl} />
              <span>{imageDraft.file.name}</span>
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={() => removeImageDraft(imageDraft.key)}
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {children}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button
          className="primary-button"
          disabled={!canSubmitVariant}
          type={asForm ? "submit" : "button"}
          onClick={asForm ? undefined : () => void submitVariant()}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </>
  );

  if (!asForm) {
    return <div className="admin-form variant-form">{fields}</div>;
  }

  return (
    <form className="admin-form variant-form" onSubmit={handleSubmit}>
      {fields}
    </form>
  );
}
