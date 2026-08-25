"use client";

import { FormEvent, useState } from "react";
import type { ReactNode } from "react";

import type { CreateAdminProductVariantPayload } from "@/lib/api/admin";

export type ProductVariantFormPayload = CreateAdminProductVariantPayload & {
  imageFileKeys?: string[];
  imageFiles?: File[];
};

type ProductVariantFormProps = {
  asForm?: boolean;
  imageOptions?: {
    key: string;
    label: string;
    previewUrl: string;
  }[];
  isSubmitting?: boolean;
  children?: ReactNode;
  onCancel?: () => void;
  onSubmit: (payload: ProductVariantFormPayload) => Promise<void> | void;
  submitLabel?: string;
};

export function ProductVariantForm({
  asForm = true,
  imageOptions = [],
  isSubmitting = false,
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submitVariant() {
    setError(null);

    if (!sku.trim()) {
      setError("SKU is required");
      return;
    }

    if (!price) {
      setError("Price is required");
      return;
    }

    await onSubmit({
      sku,
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      stockQuantity: stockQuantity ? Number(stockQuantity) : 0,
      isActive,
      imageFileKeys: selectedImageKeys,
      imageFiles,
    });

    setSku("");
    setPrice("");
    setCompareAtPrice("");
    setStockQuantity("0");
    setIsActive(true);
    setSelectedImageKeys([]);
    setImageFiles([]);
  }

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
            <label key={image.key}>
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
            setImageFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </label>

      {imageFiles.length ? (
        <p className="muted-text">{imageFiles.length} image(s) selected</p>
      ) : null}

      {children}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button
          className="primary-button"
          disabled={isSubmitting}
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
