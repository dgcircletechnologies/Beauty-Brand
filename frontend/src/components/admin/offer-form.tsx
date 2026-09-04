"use client";

import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import { BogoRewardTargetSelector } from "@/components/admin/offer-target-selector";
import { createAdminOffer, updateAdminOffer } from "@/lib/api/admin";
import { getOfferDisplayLabel } from "@/lib/offers/format";
import type { AdminOffer, AdminOfferType } from "@/lib/api/admin";
import type { CreateOfferPayload, UpdateOfferPayload } from "@/lib/offers/types";

type OfferFormMode = "create" | "edit";

type OfferFormProps = {
  initialData?: AdminOffer;
  mode: OfferFormMode;
};

type OfferFormState = {
  name: string;
  description: string;
  type: AdminOfferType;
  value: string;
  maxDiscountAmount: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  priority: string;
  buyQuantity: string;
  getQuantity: string;
  rewardProductId: string;
  rewardProductLabel: string;
  rewardVariantId: string;
  rewardVariantLabel: string;
};

type RewardMode = "same" | "product" | "variant";

const initialFormState: OfferFormState = {
  name: "",
  description: "",
  type: "PERCENTAGE",
  value: "",
  maxDiscountAmount: "",
  startAt: "",
  endAt: "",
  isActive: true,
  priority: "0",
  buyQuantity: "2",
  getQuantity: "1",
  rewardProductId: "",
  rewardProductLabel: "",
  rewardVariantId: "",
  rewardVariantLabel: "",
};

const typeLabels: Record<AdminOfferType, string> = {
  PERCENTAGE: "Percentage Discount",
  FIXED_AMOUNT: "Fixed Amount Discount",
  BUY_X_GET_Y: "Buy X Get Y",
};

export function OfferForm({ initialData, mode }: OfferFormProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { formatPrice } = useCurrency();
  const [form, setForm] = useState<OfferFormState>(() =>
    initialData ? toOfferFormState(initialData) : initialFormState,
  );
  const [rewardMode, setRewardMode] = useState<RewardMode>(() =>
    getInitialRewardMode(initialData),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationMessage = useMemo(() => validateOfferForm(form), [form]);
  const canSubmit =
    Boolean(accessToken) &&
    !validationMessage &&
    Boolean(form.name.trim()) &&
    !isSubmitting;
  const isEditingEffectiveOffer =
    mode === "edit" && initialData ? getAdminOfferStatus(initialData) === "active" : false;

  function setField<T extends keyof OfferFormState>(
    field: T,
    value: OfferFormState[T],
  ) {
    setForm((currentForm) => {
      if (field !== "type") {
        return {
          ...currentForm,
          [field]: value,
        };
      }

      return {
        ...currentForm,
        type: value as AdminOfferType,
        value: "",
        maxDiscountAmount: "",
        buyQuantity: value === "BUY_X_GET_Y" ? currentForm.buyQuantity || "2" : "",
        getQuantity: value === "BUY_X_GET_Y" ? currentForm.getQuantity || "1" : "",
        rewardProductId: "",
        rewardProductLabel: "",
        rewardVariantId: "",
        rewardVariantLabel: "",
      };
    });
    if (field === "type" && value !== "BUY_X_GET_Y") {
      setRewardMode("same");
    }
    setError(null);
    setSuccess(null);
  }

  function handleRewardModeChange(nextMode: RewardMode) {
    setRewardMode(nextMode);
    setForm((currentForm) => ({
      ...currentForm,
      rewardProductId: nextMode === "product" ? currentForm.rewardProductId : "",
      rewardProductLabel:
        nextMode === "product" ? currentForm.rewardProductLabel : "",
      rewardVariantId: nextMode === "variant" ? currentForm.rewardVariantId : "",
      rewardVariantLabel:
        nextMode === "variant" ? currentForm.rewardVariantLabel : "",
    }));
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !canSubmit) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (mode === "edit" && initialData) {
        await updateAdminOffer(accessToken, initialData.id, getUpdatePayload(form));
        setSuccess("Offer updated successfully.");
      } else {
        await createAdminOffer(accessToken, getCreatePayload(form));
        setSuccess("Offer created successfully.");
      }

      router.push("/admin/offers");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : mode === "edit"
            ? "Unable to update offer"
            : "Unable to create offer",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="offer-form-layout" onSubmit={handleSubmit}>
      <section className="form-surface admin-form offer-form-main">
        {isEditingEffectiveOffer ? (
          <p className="offer-warning">
            Changes to this active offer may immediately affect customer pricing and carts.
          </p>
        ) : null}

        <FormBlock title="Basic Information">
          <label>
            Offer Name
            <input
              required
              placeholder="Summer Skin Sale"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              placeholder="Seasonal promotion on selected skincare products."
              rows={4}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </label>
        </FormBlock>

        <FormBlock title="Offer Configuration">
          <label>
            Offer Type
            <select
              disabled={mode === "edit"}
              value={form.type}
              onChange={(event) =>
                setField("type", event.target.value as AdminOfferType)
              }
            >
              <option value="PERCENTAGE">Percentage Discount</option>
              <option value="FIXED_AMOUNT">Fixed Amount Discount</option>
              <option value="BUY_X_GET_Y">Buy X Get Y</option>
            </select>
            {mode === "edit" ? (
              <small className="muted-text">Offer type cannot be changed after creation.</small>
            ) : null}
          </label>

          {form.type === "PERCENTAGE" ? (
            <div className="split-fields">
              <label>
                Discount Percentage
                <input
                  max={100}
                  min={0}
                  placeholder="20"
                  step="0.01"
                  type="number"
                  value={form.value}
                  onChange={(event) => setField("value", event.target.value)}
                />
              </label>
              <label>
                Max Discount Amount
                <input
                  min={0}
                  placeholder="Optional"
                  step="0.01"
                  type="number"
                  value={form.maxDiscountAmount}
                  onChange={(event) =>
                    setField("maxDiscountAmount", event.target.value)
                  }
                />
              </label>
            </div>
          ) : null}

          {form.type === "FIXED_AMOUNT" ? (
            <label>
              Discount Amount
              <input
                min={0}
                placeholder="500"
                step="0.01"
                type="number"
                value={form.value}
                onChange={(event) => setField("value", event.target.value)}
              />
              {form.value ? (
                <small className="muted-text">{formatPrice(form.value)} discount</small>
              ) : null}
            </label>
          ) : null}

          {form.type === "BUY_X_GET_Y" ? (
            <>
              <div className="split-fields">
                <label>
                  Customer Buys
                  <input
                    min={1}
                    step={1}
                    type="number"
                    value={form.buyQuantity}
                    onChange={(event) =>
                      setField("buyQuantity", event.target.value)
                    }
                  />
                </label>
                <label>
                  Customer Gets
                  <input
                    min={1}
                    step={1}
                    type="number"
                    value={form.getQuantity}
                    onChange={(event) =>
                      setField("getQuantity", event.target.value)
                    }
                  />
                </label>
              </div>
              <div className="offer-reward-panel">
                <strong>Reward</strong>
                <BogoRewardTargetSelector
                  accessToken={accessToken}
                  disabled={isSubmitting}
                  mode={rewardMode}
                  rewardProductId={form.rewardProductId}
                  rewardVariantId={form.rewardVariantId}
                  onModeChange={handleRewardModeChange}
                  onRewardProductChange={(target) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      rewardProductId: target?.id ?? "",
                      rewardProductLabel: target?.label ?? "",
                      rewardVariantId: "",
                      rewardVariantLabel: "",
                    }))
                  }
                  onRewardVariantChange={(target) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      rewardProductId: "",
                      rewardProductLabel: "",
                      rewardVariantId: target?.id ?? "",
                      rewardVariantLabel: target?.label ?? "",
                    }))
                  }
                />
              </div>
            </>
          ) : null}
        </FormBlock>

        <FormBlock title="Schedule">
          <div className="split-fields">
            <label>
              Start Date / Time
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(event) => setField("startAt", event.target.value)}
              />
            </label>
            <label>
              End Date / Time
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(event) => setField("endAt", event.target.value)}
              />
            </label>
          </div>
        </FormBlock>

        <FormBlock title="Priority & Status">
          <div className="split-fields">
            <label>
              Priority
              <input
                step={1}
                type="number"
                value={form.priority}
                onChange={(event) => setField("priority", event.target.value)}
              />
              <small className="muted-text">
                Higher values take precedence when multiple offers overlap.
              </small>
            </label>
            <label className="checkbox-field offer-active-field">
              <input
                checked={form.isActive}
                type="checkbox"
                onChange={(event) => setField("isActive", event.target.checked)}
              />
              Active
            </label>
          </div>
          <p className="muted-text">
            Inactive offers are not applied to customer pricing. Future start dates can still be saved while active.
          </p>
        </FormBlock>

        {validationMessage ? <p className="form-error">{validationMessage}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <div className="form-actions">
          <button className="primary-button" disabled={!canSubmit} type="submit">
            {isSubmitting
              ? mode === "edit"
                ? "Saving..."
                : "Creating..."
              : mode === "edit"
                ? "Save Changes"
                : "Create Offer"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => router.push("/admin/offers")}
          >
            Cancel
          </button>
        </div>
      </section>

      <aside className="form-surface admin-form offer-preview-panel">
        <FormBlock title="Offer Preview">
          <div className="offer-preview-card">
            <span className="currency-code-chip">{typeLabels[form.type]}</span>
            <h2>{form.name.trim() || "Untitled Offer"}</h2>
            {form.description.trim() ? <p>{form.description.trim()}</p> : null}
            <strong>
              {getPreviewLabel(form, formatPrice) ?? "Complete configuration"}
            </strong>
            <dl>
              <div>
                <dt>Reward</dt>
                <dd>{formatRewardSummary(form, rewardMode)}</dd>
              </div>
              <div>
                <dt>Schedule</dt>
                <dd>{formatSchedule(form.startAt, form.endAt)}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{Number(form.priority || 0)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{form.isActive ? "Enabled" : "Inactive"}</dd>
              </div>
            </dl>
          </div>
        </FormBlock>
      </aside>
    </form>
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

function validateOfferForm(form: OfferFormState) {
  if (!form.name.trim()) {
    return "Offer name is required.";
  }

  if (form.type === "PERCENTAGE") {
    const percentage = Number(form.value);

    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      return "Percentage discount must be greater than 0 and no more than 100.";
    }
  }

  if (form.type === "FIXED_AMOUNT") {
    const amount = Number(form.value);

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Fixed discount amount must be greater than 0.";
    }
  }

  if (form.type === "BUY_X_GET_Y") {
    const buyQuantity = Number(form.buyQuantity);
    const getQuantity = Number(form.getQuantity);

    if (!Number.isInteger(buyQuantity) || buyQuantity <= 0) {
      return "Buy quantity must be a positive whole number.";
    }

    if (!Number.isInteger(getQuantity) || getQuantity <= 0) {
      return "Get quantity must be a positive whole number.";
    }
  }

  if (form.maxDiscountAmount) {
    const maxDiscountAmount = Number(form.maxDiscountAmount);

    if (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0) {
      return "Max discount amount must be 0 or greater.";
    }
  }

  if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) {
    return "End date must be after the start date.";
  }

  const priority = Number(form.priority);

  if (!Number.isInteger(priority)) {
    return "Priority must be a whole number.";
  }

  return null;
}

function getCreatePayload(form: OfferFormState): CreateOfferPayload {
  const basePayload = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    type: form.type,
    startAt: toApiDateTime(form.startAt),
    endAt: toApiDateTime(form.endAt),
    isActive: form.isActive,
    priority: Number(form.priority || 0),
  };

  if (form.type === "BUY_X_GET_Y") {
    return {
      ...basePayload,
      value: null,
      buyQuantity: Number(form.buyQuantity),
      getQuantity: Number(form.getQuantity),
      rewardProductId: form.rewardProductId.trim() || null,
      rewardVariantId: form.rewardVariantId.trim() || null,
    };
  }

  return {
    ...basePayload,
    value: Number(form.value),
    maxDiscountAmount: form.maxDiscountAmount
      ? Number(form.maxDiscountAmount)
      : null,
  };
}

function getUpdatePayload(form: OfferFormState): UpdateOfferPayload {
  const basePayload = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    startAt: toApiDateTime(form.startAt),
    endAt: toApiDateTime(form.endAt),
    isActive: form.isActive,
    priority: Number(form.priority || 0),
  };

  if (form.type === "BUY_X_GET_Y") {
    return {
      ...basePayload,
      value: null,
      buyQuantity: Number(form.buyQuantity),
      getQuantity: Number(form.getQuantity),
      rewardProductId: form.rewardProductId.trim() || null,
      rewardVariantId: form.rewardVariantId.trim() || null,
    };
  }

  return {
    ...basePayload,
    value: Number(form.value),
    maxDiscountAmount: form.maxDiscountAmount
      ? Number(form.maxDiscountAmount)
      : null,
  };
}

function toOfferFormState(offer: AdminOffer): OfferFormState {
  return {
    name: offer.name,
    description: offer.description ?? "",
    type: offer.type,
    value: offer.value ?? "",
    maxDiscountAmount: offer.maxDiscountAmount ?? "",
    startAt: offer.startAt ? toDateTimeLocalValue(offer.startAt) : "",
    endAt: offer.endAt ? toDateTimeLocalValue(offer.endAt) : "",
    isActive: offer.isActive,
    priority: String(offer.priority),
    buyQuantity: offer.buyXGetYConfig?.buyQuantity
      ? String(offer.buyXGetYConfig.buyQuantity)
      : "2",
    getQuantity: offer.buyXGetYConfig?.getQuantity
      ? String(offer.buyXGetYConfig.getQuantity)
      : "1",
    rewardProductId: offer.buyXGetYConfig?.rewardProductId ?? "",
    rewardProductLabel: offer.buyXGetYConfig?.rewardProduct?.name ?? "",
    rewardVariantId: offer.buyXGetYConfig?.rewardVariantId ?? "",
    rewardVariantLabel: offer.buyXGetYConfig?.rewardVariant?.sku ?? "",
  };
}

function getInitialRewardMode(offer?: AdminOffer): RewardMode {
  if (offer?.buyXGetYConfig?.rewardVariantId) {
    return "variant";
  }

  if (offer?.buyXGetYConfig?.rewardProductId) {
    return "product";
  }

  return "same";
}

function getPreviewLabel(
  form: OfferFormState,
  formatPrice: (amount: string | number) => string,
) {
  return getOfferDisplayLabel(
    {
      type: form.type,
      value: form.type === "BUY_X_GET_Y" ? null : form.value,
      buyXGetY:
        form.type === "BUY_X_GET_Y"
          ? {
              buyQuantity: Number(form.buyQuantity || 0),
              getQuantity: Number(form.getQuantity || 0),
              rewardProductId: form.rewardProductId.trim() || null,
              rewardVariantId: form.rewardVariantId.trim() || null,
            }
          : null,
    },
    formatPrice,
  );
}

function toApiDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function formatSchedule(startAt: string, endAt: string) {
  if (!startAt && !endAt) {
    return "Open ended";
  }

  if (!startAt) {
    return `Until ${formatDate(endAt)}`;
  }

  if (!endAt) {
    return `From ${formatDate(startAt)}`;
  }

  return `${formatDate(startAt)} to ${formatDate(endAt)}`;
}

function formatRewardSummary(form: OfferFormState, rewardMode: RewardMode) {
  if (form.type !== "BUY_X_GET_Y") {
    return "Standard discount";
  }

  if (rewardMode === "product" && form.rewardProductId) {
    return `Product reward: ${form.rewardProductLabel || form.rewardProductId}`;
  }

  if (rewardMode === "variant" && form.rewardVariantId) {
    return `Variant reward: ${form.rewardVariantLabel || form.rewardVariantId}`;
  }

  return "Same eligible item";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getAdminOfferStatus(offer: AdminOffer) {
  if (!offer.isActive) {
    return "inactive";
  }

  const now = Date.now();
  const startTime = offer.startAt ? new Date(offer.startAt).getTime() : null;
  const endTime = offer.endAt ? new Date(offer.endAt).getTime() : null;

  if (startTime && now < startTime) {
    return "scheduled";
  }

  if (endTime && now > endTime) {
    return "expired";
  }

  return "active";
}
