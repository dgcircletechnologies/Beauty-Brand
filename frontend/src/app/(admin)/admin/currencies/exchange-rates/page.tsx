"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminCurrency,
  AdminExchangeRate,
  createAdminExchangeRate,
  getAdminCurrencies,
  getAdminExchangeRates,
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
    if (
      !rateForm.baseCurrencyCode ||
      !rateForm.quoteCurrencyCode ||
      !rateForm.effectiveAt
    ) {
      return false;
    }

    const effectiveTime = new Date(rateForm.effectiveAt).getTime();

    return exchangeRates.some(
      (rate) =>
        rate.baseCurrencyCode === rateForm.baseCurrencyCode &&
        rate.quoteCurrencyCode === rateForm.quoteCurrencyCode &&
        new Date(rate.effectiveAt).getTime() === effectiveTime,
    );
  }, [
    exchangeRates,
    rateForm.baseCurrencyCode,
    rateForm.effectiveAt,
    rateForm.quoteCurrencyCode,
  ]);
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
                    <div>
                      <h3>
                        {rate.baseCurrencyCode} to {rate.quoteCurrencyCode}
                      </h3>
                      <p>{rate.provider}</p>
                    </div>
                    <strong>{Number(rate.rate).toFixed(6)}</strong>
                    <span>{formatDate(rate.effectiveAt)}</span>
                    <span>{rate.expiresAt ? "Expires" : "Current"}</span>
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

function sortExchangeRates(first: AdminExchangeRate, second: AdminExchangeRate) {
  return (
    new Date(second.effectiveAt).getTime() - new Date(first.effectiveAt).getTime()
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
