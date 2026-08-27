"use client";

import {
  FormEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

type RateForm = {
  name: string;
  serviceCode: string;
  calculation: "FLAT" | "FREE";
  amount: string;
  currencyCode: string;
  minOrderAmount: string;
  maxOrderAmount: string;
  estimatedDaysMin: string;
  estimatedDaysMax: string;
};

const initialRateForm: RateForm = {
  name: "",
  serviceCode: "",
  calculation: "FLAT",
  amount: "",
  currencyCode: "",
  minOrderAmount: "",
  maxOrderAmount: "",
  estimatedDaysMin: "",
  estimatedDaysMax: "",
};

const pageSize = 8;

export default function AdminShippingRatesPage() {
  const { accessToken } = useAuth();
  const [zones, setZones] = useState<adminApi.AdminShippingZone[]>([]);
  const [currencies, setCurrencies] = useState<adminApi.AdminCurrency[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [rateForm, setRateForm] = useState(initialRateForm);
  const [editingRateId, setEditingRateId] = useState("");
  const [editForm, setEditForm] = useState(initialRateForm);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadSetup() {
      setError(null);
      setIsLoading(true);

      try {
        const [nextZones, nextCurrencies] = await Promise.all([
          adminApi.getAdminShippingZones(token),
          adminApi.getAdminCurrencies(token),
        ]);
        const baseCurrency =
          nextCurrencies.find((currency) => currency.isBase) ??
          nextCurrencies[0];

        if (!isMounted) {
          return;
        }

        setZones(nextZones);
        setCurrencies(nextCurrencies);
        setSelectedZoneId((currentId) => currentId || nextZones[0]?.id || "");
        setRateForm((currentForm) => ({
          ...currentForm,
          currencyCode: currentForm.currencyCode || baseCurrency?.code || "",
        }));
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load shipping rates",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSetup();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [selectedZoneId, zones],
  );
  const activeCurrencies = useMemo(
    () => currencies.filter((currency) => currency.status === "ACTIVE"),
    [currencies],
  );
  const selectedRates = useMemo(
    () => selectedZone?.rates ?? [],
    [selectedZone],
  );
  const totalPages = Math.max(1, Math.ceil(selectedRates.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRates = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return selectedRates.slice(startIndex, startIndex + pageSize);
  }, [currentPage, selectedRates]);

  const createValidationMessage = useMemo(
    () => getRateValidationMessage(rateForm),
    [rateForm],
  );
  const editValidationMessage = useMemo(
    () => getRateValidationMessage(editForm),
    [editForm],
  );
  const canCreate =
    Boolean(selectedZoneId) &&
    Boolean(rateForm.name.trim()) &&
    Boolean(rateForm.currencyCode) &&
    !createValidationMessage &&
    !isSubmitting;
  const canSaveEdit =
    Boolean(editForm.name.trim()) &&
    Boolean(editForm.currencyCode) &&
    !editValidationMessage &&
    !isSubmitting;

  const setRateField = useCallback(
    <T extends keyof RateForm>(field: T, value: RateForm[T]) => {
      setRateForm((currentForm) => ({
        ...currentForm,
        [field]: value,
      }));
      setSuccess(null);
    },
    [],
  );

  const setEditField = useCallback(
    <T extends keyof RateForm>(field: T, value: RateForm[T]) => {
      setEditForm((currentForm) => ({
        ...currentForm,
        [field]: value,
      }));
      setSuccess(null);
    },
    [],
  );

  const updateRateInZones = useCallback(
    (updatedRate: adminApi.AdminShippingRate) => {
      setZones((currentZones) =>
        currentZones.map((zone) =>
          zone.id === updatedRate.zoneId
            ? {
                ...zone,
                rates: zone.rates
                  .map((rate) =>
                    rate.id === updatedRate.id
                      ? {
                          ...rate,
                          ...updatedRate,
                          currency: updatedRate.currency ?? rate.currency,
                        }
                      : rate,
                  )
                  .sort(sortRates),
              }
            : zone,
        ),
      );
    },
    [],
  );

  const handleCreateRate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !canCreate) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const createdRate = await adminApi.createAdminShippingRate(accessToken, {
          zoneId: selectedZoneId,
          ...toRatePayload(rateForm),
          isActive: true,
        });
        setZones((currentZones) =>
          currentZones.map((zone) =>
            zone.id === selectedZoneId
              ? {
                  ...zone,
                  rates: [createdRate, ...zone.rates].sort(sortRates),
                }
              : zone,
          ),
        );
        setRateForm({
          ...initialRateForm,
          currencyCode: rateForm.currencyCode,
        });
        setPage(1);
        setSuccess("Shipping rate created.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to create shipping rate",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, canCreate, rateForm, selectedZoneId],
  );

  const toggleRate = useCallback(
    async (rate: adminApi.AdminShippingRate) => {
      if (!accessToken) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const updatedRate = await adminApi.updateAdminShippingRate(
          accessToken,
          rate.id,
          {
            isActive: !rate.isActive,
          },
        );
        updateRateInZones(updatedRate);
        setSuccess("Shipping rate updated.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update shipping rate",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, updateRateInZones],
  );

  const startEditingRate = useCallback((rate: adminApi.AdminShippingRate) => {
    setEditingRateId(rate.id);
    setEditForm(toRateForm(rate));
    setError(null);
    setSuccess(null);
  }, []);

  const cancelEditingRate = useCallback(() => {
    setEditingRateId("");
    setEditForm(initialRateForm);
  }, []);

  const saveRate = useCallback(
    async (rate: adminApi.AdminShippingRate) => {
      if (!accessToken || !canSaveEdit) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const updatedRate = await adminApi.updateAdminShippingRate(
          accessToken,
          rate.id,
          toRatePayload(editForm),
        );
        updateRateInZones(updatedRate);
        cancelEditingRate();
        setSuccess("Shipping rate updated.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update shipping rate",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      accessToken,
      canSaveEdit,
      cancelEditingRate,
      editForm,
      updateRateInZones,
    ],
  );

  const deleteRate = useCallback(
    async (rate: adminApi.AdminShippingRate) => {
      if (!accessToken) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        await adminApi.deleteAdminShippingRate(accessToken, rate.id);
        setZones((currentZones) =>
          currentZones.map((zone) =>
            zone.id === rate.zoneId
              ? {
                  ...zone,
                  rates: zone.rates.filter(
                    (currentRate) => currentRate.id !== rate.id,
                  ),
                }
              : zone,
          ),
        );
        setSuccess("Shipping rate deleted.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to delete shipping rate",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken],
  );

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Shipping</p>
          <h1>Rates</h1>
          <p>Create checkout shipping methods for each zone.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="shipping-workspace">
        <form className="catalog-section admin-form" onSubmit={handleCreateRate}>
          <div className="section-title">
            <h2>Add Rate</h2>
            <span>{activeCurrencies.length} currencies</span>
          </div>
          <label>
            Zone
            <select
              required
              value={selectedZoneId}
              onChange={(event) => {
                setSelectedZoneId(event.target.value);
                setPage(1);
                setSuccess(null);
              }}
            >
              <option value="">Select zone</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>
          <RateFields
            currencies={activeCurrencies}
            form={rateForm}
            setField={setRateField}
          />
          {createValidationMessage ? (
            <p className="form-error">{createValidationMessage}</p>
          ) : null}
          <button className="primary-button" disabled={!canCreate} type="submit">
            {isSubmitting ? "Saving..." : "Add Rate"}
          </button>
        </form>

        <section className="catalog-section">
          <div className="section-title">
            <h2>{selectedZone?.name ?? "Rates"}</h2>
            <span>{selectedRates.length}</span>
          </div>
          {isLoading ? (
            <p className="muted-text">Loading rates...</p>
          ) : (
            <>
              <div className="admin-data-list">
                {visibleRates.map((rate) => (
                  <RateRow
                    currencies={activeCurrencies}
                    disabled={isSubmitting}
                    editForm={editForm}
                    editValidationMessage={editValidationMessage}
                    editing={editingRateId === rate.id}
                    key={rate.id}
                    rate={rate}
                    onCancelEdit={cancelEditingRate}
                    onDelete={deleteRate}
                    onEditField={setEditField}
                    onSave={saveRate}
                    onStartEdit={startEditingRate}
                    onToggle={toggleRate}
                  />
                ))}
              </div>
              {selectedRates.length === 0 ? (
                <p className="muted-text">No shipping rates in this zone yet.</p>
              ) : null}
              <PaginationControls
                currentPage={currentPage}
                disabled={isSubmitting}
                totalPages={totalPages}
                onNext={() => setPage((current) => current + 1)}
                onPrevious={() =>
                  setPage((current) => Math.max(current - 1, 1))
                }
              />
            </>
          )}
        </section>
      </section>
    </main>
  );
}

type RateFieldsProps = {
  currencies: adminApi.AdminCurrency[];
  form: RateForm;
  setField: <T extends keyof RateForm>(field: T, value: RateForm[T]) => void;
};

const RateFields = memo(function RateFields({
  currencies,
  form,
  setField,
}: RateFieldsProps) {
  return (
    <>
      <label>
        Rate name
        <input
          required
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
        />
      </label>
      <div className="split-fields">
        <label>
          Calculation
          <select
            value={form.calculation}
            onChange={(event) =>
              setField("calculation", event.target.value as "FLAT" | "FREE")
            }
          >
            <option value="FLAT">Flat</option>
            <option value="FREE">Free</option>
          </select>
        </label>
        <label>
          Service code
          <input
            value={form.serviceCode}
            onChange={(event) => setField("serviceCode", event.target.value)}
          />
        </label>
      </div>
      <div className="split-fields">
        <label>
          Amount
          <input
            min="0"
            required={form.calculation !== "FREE"}
            step="0.01"
            type="number"
            value={form.amount}
            onChange={(event) => setField("amount", event.target.value)}
          />
        </label>
        <label>
          Currency
          <select
            required
            value={form.currencyCode}
            onChange={(event) => setField("currencyCode", event.target.value)}
          >
            <option value="">Select currency</option>
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="split-fields">
        <label>
          Min order base amount
          <input
            min="0"
            step="0.01"
            type="number"
            value={form.minOrderAmount}
            onChange={(event) => setField("minOrderAmount", event.target.value)}
          />
        </label>
        <label>
          Max order base amount
          <input
            min="0"
            step="0.01"
            type="number"
            value={form.maxOrderAmount}
            onChange={(event) => setField("maxOrderAmount", event.target.value)}
          />
        </label>
      </div>
      <div className="split-fields">
        <label>
          Min days
          <input
            min="0"
            type="number"
            value={form.estimatedDaysMin}
            onChange={(event) =>
              setField("estimatedDaysMin", event.target.value)
            }
          />
        </label>
        <label>
          Max days
          <input
            min="0"
            type="number"
            value={form.estimatedDaysMax}
            onChange={(event) =>
              setField("estimatedDaysMax", event.target.value)
            }
          />
        </label>
      </div>
    </>
  );
});

type RateRowProps = {
  currencies: adminApi.AdminCurrency[];
  disabled: boolean;
  editing: boolean;
  editForm: RateForm;
  editValidationMessage: string | null;
  rate: adminApi.AdminShippingRate;
  onCancelEdit: () => void;
  onDelete: (rate: adminApi.AdminShippingRate) => void;
  onEditField: <T extends keyof RateForm>(field: T, value: RateForm[T]) => void;
  onSave: (rate: adminApi.AdminShippingRate) => void;
  onStartEdit: (rate: adminApi.AdminShippingRate) => void;
  onToggle: (rate: adminApi.AdminShippingRate) => void;
};

const RateRow = memo(function RateRow({
  currencies,
  disabled,
  editing,
  editForm,
  editValidationMessage,
  rate,
  onCancelEdit,
  onDelete,
  onEditField,
  onSave,
  onStartEdit,
  onToggle,
}: RateRowProps) {
  return (
    <article className="shipping-rate-row">
      {editing ? (
        <div className="admin-inline-form">
          <RateFields
            currencies={currencies}
            form={editForm}
            setField={onEditField}
          />
          {editValidationMessage ? (
            <p className="form-error">{editValidationMessage}</p>
          ) : null}
          <div className="row-actions">
            <button
              className="primary-button compact-button"
              disabled={disabled || Boolean(editValidationMessage)}
              type="button"
              onClick={() => onSave(rate)}
            >
              Save
            </button>
            <button
              className="secondary-button compact-button"
              disabled={disabled}
              type="button"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <h3>{rate.name}</h3>
            <p>
              {rate.calculation === "FREE"
                ? "Free"
                : `${rate.currencyCode} ${formatMoney(rate.amount)}`}
              {rate.serviceCode ? ` | ${rate.serviceCode}` : ""}
            </p>
            <p>
              Min: {rate.minOrderAmount ?? "none"} | Max:{" "}
              {rate.maxOrderAmount ?? "none"} | ETA:{" "}
              {formatEta(rate.estimatedDaysMin, rate.estimatedDaysMax)}
            </p>
          </div>
          <StatusSwitch
            checked={rate.isActive}
            disabled={disabled}
            label={`${rate.isActive ? "Disable" : "Enable"} ${rate.name}`}
            onChange={() => onToggle(rate)}
          />
          <div className="row-actions">
            <button
              className="secondary-button compact-button"
              disabled={disabled}
              type="button"
              onClick={() => onStartEdit(rate)}
            >
              Edit
            </button>
            <button
              className="danger-button compact-button"
              disabled={disabled}
              type="button"
              onClick={() => onDelete(rate)}
            >
              Delete
            </button>
          </div>
        </>
      )}
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

type PaginationControlsProps = {
  currentPage: number;
  disabled: boolean;
  totalPages: number;
  onNext: () => void;
  onPrevious: () => void;
};

const PaginationControls = memo(function PaginationControls({
  currentPage,
  disabled,
  totalPages,
  onNext,
  onPrevious,
}: PaginationControlsProps) {
  return (
    <div className="pagination-actions">
      <button
        className="secondary-button compact-button"
        disabled={disabled || currentPage <= 1}
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
        disabled={disabled || currentPage >= totalPages}
        type="button"
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
});

function toRatePayload(form: RateForm) {
  return {
    name: form.name.trim(),
    serviceCode: form.serviceCode.trim() || undefined,
    calculation: form.calculation,
    amount: form.calculation === "FREE" ? 0 : Number(form.amount),
    currencyCode: form.currencyCode,
    minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
    maxOrderAmount: form.maxOrderAmount ? Number(form.maxOrderAmount) : null,
    estimatedDaysMin: form.estimatedDaysMin
      ? Number(form.estimatedDaysMin)
      : undefined,
    estimatedDaysMax: form.estimatedDaysMax
      ? Number(form.estimatedDaysMax)
      : undefined,
  };
}

function toRateForm(rate: adminApi.AdminShippingRate): RateForm {
  return {
    name: rate.name,
    serviceCode: rate.serviceCode ?? "",
    calculation: rate.calculation,
    amount: rate.calculation === "FREE" ? "" : rate.amount,
    currencyCode: rate.currencyCode,
    minOrderAmount: rate.minOrderAmount ?? "",
    maxOrderAmount: rate.maxOrderAmount ?? "",
    estimatedDaysMin: rate.estimatedDaysMin?.toString() ?? "",
    estimatedDaysMax: rate.estimatedDaysMax?.toString() ?? "",
  };
}

function getRateValidationMessage(form: RateForm) {
  const amount = Number(form.amount);
  const minOrderAmount = optionalNumber(form.minOrderAmount);
  const maxOrderAmount = optionalNumber(form.maxOrderAmount);
  const estimatedDaysMin = optionalNumber(form.estimatedDaysMin);
  const estimatedDaysMax = optionalNumber(form.estimatedDaysMax);

  if (form.calculation === "FLAT" && (!form.amount || amount < 0)) {
    return "Flat shipping amount must be 0 or greater.";
  }

  if (
    [minOrderAmount, maxOrderAmount, estimatedDaysMin, estimatedDaysMax].some(
      (value) => value !== null && value < 0,
    )
  ) {
    return "Amounts and delivery days cannot be negative.";
  }

  if (
    minOrderAmount !== null &&
    maxOrderAmount !== null &&
    minOrderAmount > maxOrderAmount
  ) {
    return "Min order amount cannot be greater than max order amount.";
  }

  if (
    estimatedDaysMin !== null &&
    estimatedDaysMax !== null &&
    estimatedDaysMin > estimatedDaysMax
  ) {
    return "Min delivery days cannot be greater than max delivery days.";
  }

  return null;
}

function optionalNumber(value: string) {
  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : -1;
}

function sortRates(
  first: adminApi.AdminShippingRate,
  second: adminApi.AdminShippingRate,
) {
  return (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
}

function formatMoney(value: string) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount.toFixed(2) : value;
}

function formatEta(minDays: number | null, maxDays: number | null) {
  if (minDays === null && maxDays === null) {
    return "not set";
  }

  if (minDays !== null && maxDays !== null) {
    return `${minDays}-${maxDays} days`;
  }

  return minDays !== null ? `${minDays}+ days` : `up to ${maxDays} days`;
}
