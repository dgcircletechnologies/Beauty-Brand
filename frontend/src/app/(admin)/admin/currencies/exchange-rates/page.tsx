"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

export default function AdminExchangeRatesPage() {
  const { accessToken } = useAuth();
  const [currencies, setCurrencies] = useState<AdminCurrency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<AdminExchangeRate[]>([]);
  const [rateForm, setRateForm] = useState(initialRateForm);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCurrencies = useMemo(
    () => currencies.filter((currency) => currency.status === "ACTIVE"),
    [currencies],
  );

  async function refreshExchangeRates() {
    if (!accessToken) {
      return;
    }

    setExchangeRates(await getAdminExchangeRates(accessToken));
  }

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

  async function handleCreateRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createAdminExchangeRate(accessToken, {
        baseCurrencyCode: rateForm.baseCurrencyCode,
        quoteCurrencyCode: rateForm.quoteCurrencyCode,
        rate: Number(rateForm.rate),
        provider: rateForm.provider.trim(),
        effectiveAt: new Date(rateForm.effectiveAt).toISOString(),
        expiresAt: rateForm.expiresAt
          ? new Date(rateForm.expiresAt).toISOString()
          : undefined,
      });
      setRateForm(initialRateForm);
      await refreshExchangeRates();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create exchange rate",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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

      <section className="admin-order-layout">
        <form className="catalog-section admin-form" onSubmit={handleCreateRate}>
          <div className="section-title">
            <h2>Add Exchange Rate</h2>
          </div>
          <label>
            Base Currency
            <select
              required
              value={rateForm.baseCurrencyCode}
              onChange={(event) =>
                setRateForm((current) => ({
                  ...current,
                  baseCurrencyCode: event.target.value,
                }))
              }
            >
              <option value="">Select base</option>
              {activeCurrencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code}
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
                setRateForm((current) => ({
                  ...current,
                  quoteCurrencyCode: event.target.value,
                }))
              }
            >
              <option value="">Select quote</option>
              {activeCurrencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rate
            <input
              min="0"
              required
              step="0.00000001"
              type="number"
              value={rateForm.rate}
              onChange={(event) =>
                setRateForm((current) => ({
                  ...current,
                  rate: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Provider
            <input
              required
              value={rateForm.provider}
              onChange={(event) =>
                setRateForm((current) => ({
                  ...current,
                  provider: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Effective At
            <input
              required
              type="datetime-local"
              value={rateForm.effectiveAt}
              onChange={(event) =>
                setRateForm((current) => ({
                  ...current,
                  effectiveAt: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Expires At
            <input
              type="datetime-local"
              value={rateForm.expiresAt}
              onChange={(event) =>
                setRateForm((current) => ({
                  ...current,
                  expiresAt: event.target.value,
                }))
              }
            />
          </label>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save Rate"}
          </button>
        </form>

        <section className="catalog-section">
          <div className="section-title">
            <h2>Recent Exchange Rates</h2>
            <span>{exchangeRates.length}</span>
          </div>
          <div className="admin-data-list">
            {exchangeRates.map((rate) => (
              <article className="admin-data-row" key={rate.id}>
                <div>
                  <h3>
                    {rate.baseCurrencyCode} to {rate.quoteCurrencyCode}
                  </h3>
                  <p>{rate.provider}</p>
                </div>
                <span>{Number(rate.rate).toFixed(6)}</span>
                <span>{new Date(rate.effectiveAt).toLocaleString()}</span>
                <span>{rate.expiresAt ? "Expires" : "Current"}</span>
              </article>
            ))}
            {!isLoading && exchangeRates.length === 0 ? (
              <p className="muted-text">No exchange rates configured yet.</p>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
