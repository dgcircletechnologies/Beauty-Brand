"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminCurrency,
  AdminExchangeRate,
  createAdminExchangeRate,
  deleteAdminExchangeRate,
  getAdminCurrencies,
  getAdminExchangeRates,
  updateAdminExchangeRate,
} from "@/lib/api/admin";

const initialRateForm = {
  baseCurrencyCode: "",
  quoteCurrencyCode: "",
  rate: "",
  provider: "manual",
  effectiveAt: "",
  expiresAt: "",
};

const pageSize = 10;

export default function AdminExchangeRatesPage() {
  const { accessToken } = useAuth();
  const [currencies, setCurrencies] = useState<AdminCurrency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<AdminExchangeRate[]>([]);
  const [rateForm, setRateForm] = useState(initialRateForm);
  const [editingRateId, setEditingRateId] = useState("");
  const [editForm, setEditForm] = useState(initialRateForm);
  const [page, setPage] = useState(1);
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

    async function loadExchangeRateData() {
      setError(null);
      setIsLoading(true);

      try {
        const [nextCurrencies, nextRates] = await Promise.all([
          getAdminCurrencies(token),
          getAdminExchangeRates(token),
        ]);

        if (!isMounted) {
          return;
        }

        setCurrencies(nextCurrencies);
        setExchangeRates(nextRates);
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load exchange rates",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadExchangeRateData();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const activeCurrencies = useMemo(
    () => currencies.filter((currency) => currency.status === "ACTIVE"),
    [currencies],
  );
  const baseOptions = useMemo(
    () =>
      activeCurrencies.filter(
        (currency) => currency.code !== rateForm.quoteCurrencyCode,
      ),
    [activeCurrencies, rateForm.quoteCurrencyCode],
  );
  const quoteOptions = useMemo(
    () =>
      activeCurrencies.filter(
        (currency) => currency.code !== rateForm.baseCurrencyCode,
      ),
    [activeCurrencies, rateForm.baseCurrencyCode],
  );
  const sameCurrencySelected =
    Boolean(rateForm.baseCurrencyCode) &&
    rateForm.baseCurrencyCode === rateForm.quoteCurrencyCode;
  const rateAmount = Number(rateForm.rate);
  const rateIsValid = Number.isFinite(rateAmount) && rateAmount > 0;
  const dateIsValid =
    !rateForm.expiresAt ||
    !rateForm.effectiveAt ||
    new Date(rateForm.expiresAt) > new Date(rateForm.effectiveAt);
  const duplicateEffectiveRate = useMemo(() => {
    return hasDuplicateEffectiveRate(
      exchangeRates,
      rateForm.baseCurrencyCode,
      rateForm.quoteCurrencyCode,
      rateForm.effectiveAt,
    );
  }, [exchangeRates, rateForm]);
  const editBaseOptions = useMemo(
    () =>
      activeCurrencies.filter(
        (currency) => currency.code !== editForm.quoteCurrencyCode,
      ),
    [activeCurrencies, editForm.quoteCurrencyCode],
  );
  const editQuoteOptions = useMemo(
    () =>
      activeCurrencies.filter(
        (currency) => currency.code !== editForm.baseCurrencyCode,
      ),
    [activeCurrencies, editForm.baseCurrencyCode],
  );
  const editRateAmount = Number(editForm.rate);
  const editRateIsValid = Number.isFinite(editRateAmount) && editRateAmount > 0;
  const editDateIsValid =
    !editForm.expiresAt ||
    !editForm.effectiveAt ||
    new Date(editForm.expiresAt) > new Date(editForm.effectiveAt);
  const editDuplicateEffectiveRate = useMemo(() => {
    return hasDuplicateEffectiveRate(
      exchangeRates,
      editForm.baseCurrencyCode,
      editForm.quoteCurrencyCode,
      editForm.effectiveAt,
      editingRateId,
    );
  }, [editForm, editingRateId, exchangeRates]);
  const validationMessage = useMemo(() => {
    if (sameCurrencySelected) {
      return "Base and quote currency must be different.";
    }

    if (rateForm.rate && !rateIsValid) {
      return "Exchange rate must be greater than 0.";
    }

    if (!dateIsValid) {
      return "Expiry date must be later than effective date.";
    }

    if (duplicateEffectiveRate) {
      return "An exchange rate already exists for this pair and effective time.";
    }

    return null;
  }, [
    dateIsValid,
    duplicateEffectiveRate,
    rateForm.rate,
    rateIsValid,
    sameCurrencySelected,
  ]);
  const editValidationMessage = useMemo(() => {
    if (
      editForm.baseCurrencyCode &&
      editForm.quoteCurrencyCode &&
      editForm.baseCurrencyCode === editForm.quoteCurrencyCode
    ) {
      return "Base and quote currency must be different.";
    }

    if (editForm.rate && !editRateIsValid) {
      return "Exchange rate must be greater than 0.";
    }

    if (!editDateIsValid) {
      return "Expiry date must be later than effective date.";
    }

    if (editDuplicateEffectiveRate) {
      return "An exchange rate already exists for this pair and effective time.";
    }

    return null;
  }, [
    editDateIsValid,
    editDuplicateEffectiveRate,
    editForm.baseCurrencyCode,
    editForm.quoteCurrencyCode,
    editForm.rate,
    editRateIsValid,
  ]);
  const canSubmit =
    Boolean(rateForm.baseCurrencyCode) &&
    Boolean(rateForm.quoteCurrencyCode) &&
    Boolean(rateForm.effectiveAt) &&
    Boolean(rateForm.provider.trim()) &&
    rateIsValid &&
    dateIsValid &&
    !sameCurrencySelected &&
    !duplicateEffectiveRate &&
    !isSubmitting;
  const canSaveEdit =
    Boolean(editingRateId) &&
    Boolean(editForm.baseCurrencyCode) &&
    Boolean(editForm.quoteCurrencyCode) &&
    Boolean(editForm.effectiveAt) &&
    Boolean(editForm.provider.trim()) &&
    editRateIsValid &&
    editDateIsValid &&
    editForm.baseCurrencyCode !== editForm.quoteCurrencyCode &&
    !editDuplicateEffectiveRate &&
    !isSubmitting;
  const totalPages = Math.max(1, Math.ceil(exchangeRates.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRates = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return exchangeRates.slice(startIndex, startIndex + pageSize);
  }, [currentPage, exchangeRates]);

  const setRateField = useCallback(
    <T extends keyof typeof initialRateForm>(
      field: T,
      value: (typeof initialRateForm)[T],
    ) => {
      setRateForm((current) => ({
        ...current,
        [field]: value,
      }));
      setSuccess(null);
    },
    [],
  );

  const setEditField = useCallback(
    <T extends keyof typeof initialRateForm>(
      field: T,
      value: (typeof initialRateForm)[T],
    ) => {
      setEditForm((current) => ({
        ...current,
        [field]: value,
      }));
      setSuccess(null);
    },
    [],
  );

  const startEditingRate = useCallback((rate: AdminExchangeRate) => {
    setEditingRateId(rate.id);
    setEditForm(toExchangeRateForm(rate));
    setError(null);
    setSuccess(null);
  }, []);

  const cancelEditingRate = useCallback(() => {
    setEditingRateId("");
    setEditForm(initialRateForm);
  }, []);

  const handleCreateRate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !canSubmit) {
        return;
      }

      setError(null);
      setSuccess(null);
      setIsSubmitting(true);

      try {
        const createdRate = await createAdminExchangeRate(accessToken, {
          baseCurrencyCode: rateForm.baseCurrencyCode,
          quoteCurrencyCode: rateForm.quoteCurrencyCode,
          rate: rateAmount,
          provider: rateForm.provider.trim(),
          effectiveAt: new Date(rateForm.effectiveAt).toISOString(),
          expiresAt: rateForm.expiresAt
            ? new Date(rateForm.expiresAt).toISOString()
            : undefined,
        });

        setExchangeRates((currentRates) =>
          [createdRate, ...currentRates].sort(sortExchangeRates),
        );
        setRateForm(initialRateForm);
        setPage(1);
        setSuccess("Exchange rate created.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to create exchange rate",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, canSubmit, rateAmount, rateForm],
  );

  const handleUpdateRate = useCallback(
    async (rate: AdminExchangeRate) => {
      if (!accessToken || !canSaveEdit) {
        return;
      }

      setError(null);
      setSuccess(null);
      setIsSubmitting(true);

      try {
        const updatedRate = await updateAdminExchangeRate(
          accessToken,
          rate.id,
          {
            baseCurrencyCode: editForm.baseCurrencyCode,
            quoteCurrencyCode: editForm.quoteCurrencyCode,
            rate: editRateAmount,
            provider: editForm.provider.trim(),
            effectiveAt: new Date(editForm.effectiveAt).toISOString(),
            expiresAt: editForm.expiresAt
              ? new Date(editForm.expiresAt).toISOString()
              : null,
          },
        );

        setExchangeRates((currentRates) =>
          currentRates
            .map((currentRate) =>
              currentRate.id === updatedRate.id ? updatedRate : currentRate,
            )
            .sort(sortExchangeRates),
        );
        cancelEditingRate();
        setSuccess("Exchange rate updated.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update exchange rate",
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
      editRateAmount,
    ],
  );

  const handleDeleteRate = useCallback(
    async (rate: AdminExchangeRate) => {
      if (!accessToken) {
        return;
      }

      const shouldDelete = window.confirm(
        `Delete exchange rate ${rate.baseCurrencyCode} to ${rate.quoteCurrencyCode}?`,
      );

      if (!shouldDelete) {
        return;
      }

      setError(null);
      setSuccess(null);
      setIsSubmitting(true);

      try {
        await deleteAdminExchangeRate(accessToken, rate.id);
        setExchangeRates((currentRates) =>
          currentRates.filter((currentRate) => currentRate.id !== rate.id),
        );

        if (editingRateId === rate.id) {
          cancelEditingRate();
        }

        setSuccess("Exchange rate deleted.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to delete exchange rate",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, cancelEditingRate, editingRateId],
  );

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Currencies</p>
          <h1>Exchange Rates</h1>
          <p>Manage conversion rates used for storefront display prices.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="currency-workspace">
        <form className="catalog-section admin-form" onSubmit={handleCreateRate}>
          <div className="section-title">
            <h2>Add Exchange Rate</h2>
            <span>{activeCurrencies.length} active</span>
          </div>
          <div className="split-fields">
            <label>
              Base Currency
              <select
                required
                value={rateForm.baseCurrencyCode}
                onChange={(event) =>
                  setRateField("baseCurrencyCode", event.target.value)
                }
              >
                <option value="">Select base</option>
                {baseOptions.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quote Currency
              <select
                required
                value={rateForm.quoteCurrencyCode}
                onChange={(event) =>
                  setRateField("quoteCurrencyCode", event.target.value)
                }
              >
                <option value="">Select quote</option>
                {quoteOptions.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="split-fields">
            <label>
              Rate
              <input
                min="0.00000001"
                required
                step="0.00000001"
                type="number"
                value={rateForm.rate}
                onChange={(event) => setRateField("rate", event.target.value)}
              />
            </label>
            <label>
              Provider
              <input
                required
                value={rateForm.provider}
                onChange={(event) =>
                  setRateField("provider", event.target.value)
                }
              />
            </label>
          </div>
          <div className="split-fields">
            <label>
              Effective At
              <input
                required
                type="datetime-local"
                value={rateForm.effectiveAt}
                onChange={(event) =>
                  setRateField("effectiveAt", event.target.value)
                }
              />
            </label>
            <label>
              Expires At
              <input
                type="datetime-local"
                value={rateForm.expiresAt}
                onChange={(event) =>
                  setRateField("expiresAt", event.target.value)
                }
              />
            </label>
          </div>
          {validationMessage ? (
            <p className="form-error">{validationMessage}</p>
          ) : null}
          <button className="primary-button" disabled={!canSubmit} type="submit">
            {isSubmitting ? "Saving..." : "Save Rate"}
          </button>
        </form>

        <section className="catalog-section">
          <div className="section-title">
            <h2>Recent Exchange Rates</h2>
            <span>{exchangeRates.length}</span>
          </div>
          {isLoading ? (
            <p className="muted-text">Loading exchange rates...</p>
          ) : (
            <>
              <div className="admin-data-list">
                {visibleRates.map((rate) => (
                  <article className="exchange-rate-card" key={rate.id}>
                    {editingRateId === rate.id ? (
                      <div className="admin-inline-form">
                        <ExchangeRateFields
                          baseOptions={editBaseOptions}
                          form={editForm}
                          quoteOptions={editQuoteOptions}
                          setField={setEditField}
                        />
                        {editValidationMessage ? (
                          <p className="form-error">{editValidationMessage}</p>
                        ) : null}
                        <div className="row-actions">
                          <button
                            className="primary-button compact-button"
                            disabled={!canSaveEdit}
                            type="button"
                            onClick={() => void handleUpdateRate(rate)}
                          >
                            Save
                          </button>
                          <button
                            className="secondary-button compact-button"
                            disabled={isSubmitting}
                            type="button"
                            onClick={cancelEditingRate}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h3>
                            {rate.baseCurrencyCode} to {rate.quoteCurrencyCode}
                          </h3>
                          <p>{rate.provider}</p>
                        </div>
                        <strong>{Number(rate.rate).toFixed(6)}</strong>
                        <span>{formatDate(rate.effectiveAt)}</span>
                        <span>{rate.expiresAt ? "Expires" : "Current"}</span>
                        <div className="row-actions">
                          <button
                            className="secondary-button compact-button"
                            disabled={isSubmitting}
                            type="button"
                            onClick={() => startEditingRate(rate)}
                          >
                            Edit
                          </button>
                          <button
                            className="danger-button compact-button"
                            disabled={isSubmitting}
                            type="button"
                            onClick={() => void handleDeleteRate(rate)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
              {exchangeRates.length === 0 ? (
                <p className="muted-text">No exchange rates configured yet.</p>
              ) : null}
              <div className="pagination-actions">
                <button
                  className="secondary-button compact-button"
                  disabled={currentPage <= 1}
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="secondary-button compact-button"
                  disabled={currentPage >= totalPages}
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

type ExchangeRateForm = typeof initialRateForm;

function ExchangeRateFields({
  baseOptions,
  form,
  quoteOptions,
  setField,
}: {
  baseOptions: AdminCurrency[];
  form: ExchangeRateForm;
  quoteOptions: AdminCurrency[];
  setField: <T extends keyof ExchangeRateForm>(
    field: T,
    value: ExchangeRateForm[T],
  ) => void;
}) {
  return (
    <>
      <div className="split-fields">
        <label>
          Base Currency
          <select
            required
            value={form.baseCurrencyCode}
            onChange={(event) =>
              setField("baseCurrencyCode", event.target.value)
            }
          >
            <option value="">Select base</option>
            {baseOptions.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quote Currency
          <select
            required
            value={form.quoteCurrencyCode}
            onChange={(event) =>
              setField("quoteCurrencyCode", event.target.value)
            }
          >
            <option value="">Select quote</option>
            {quoteOptions.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="split-fields">
        <label>
          Rate
          <input
            min="0.00000001"
            required
            step="0.00000001"
            type="number"
            value={form.rate}
            onChange={(event) => setField("rate", event.target.value)}
          />
        </label>
        <label>
          Provider
          <input
            required
            value={form.provider}
            onChange={(event) => setField("provider", event.target.value)}
          />
        </label>
      </div>
      <div className="split-fields">
        <label>
          Effective At
          <input
            required
            type="datetime-local"
            value={form.effectiveAt}
            onChange={(event) => setField("effectiveAt", event.target.value)}
          />
        </label>
        <label>
          Expires At
          <input
            type="datetime-local"
            value={form.expiresAt}
            onChange={(event) => setField("expiresAt", event.target.value)}
          />
        </label>
      </div>
    </>
  );
}

function sortExchangeRates(first: AdminExchangeRate, second: AdminExchangeRate) {
  return (
    new Date(second.effectiveAt).getTime() - new Date(first.effectiveAt).getTime()
  );
}

function hasDuplicateEffectiveRate(
  exchangeRates: AdminExchangeRate[],
  baseCurrencyCode: string,
  quoteCurrencyCode: string,
  effectiveAt: string,
  ignoredRateId?: string,
) {
  if (!baseCurrencyCode || !quoteCurrencyCode || !effectiveAt) {
    return false;
  }

  const effectiveTime = new Date(effectiveAt).getTime();

  return exchangeRates.some(
    (rate) =>
      rate.id !== ignoredRateId &&
      rate.baseCurrencyCode === baseCurrencyCode &&
      rate.quoteCurrencyCode === quoteCurrencyCode &&
      new Date(rate.effectiveAt).getTime() === effectiveTime,
  );
}

function toExchangeRateForm(rate: AdminExchangeRate): ExchangeRateForm {
  return {
    baseCurrencyCode: rate.baseCurrencyCode,
    quoteCurrencyCode: rate.quoteCurrencyCode,
    rate: String(rate.rate),
    provider: rate.provider,
    effectiveAt: toDateTimeLocalValue(rate.effectiveAt),
    expiresAt: rate.expiresAt ? toDateTimeLocalValue(rate.expiresAt) : "",
  };
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
