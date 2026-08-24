"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminCurrency,
  AdminExchangeRate,
  createAdminCurrency,
  createAdminExchangeRate,
  getAdminCurrencies,
  getAdminExchangeRates,
  updateAdminCurrency,
} from "@/lib/api/admin";

const initialCurrencyForm = {
  code: "",
  name: "",
  symbol: "",
  decimalDigits: 2,
  status: "ACTIVE" as AdminCurrency["status"],
  isBase: false,
};

const initialRateForm = {
  baseCurrencyCode: "",
  quoteCurrencyCode: "",
  rate: "",
  provider: "manual",
  effectiveAt: "",
  expiresAt: "",
};

export default function AdminCurrenciesPage() {
  const { accessToken } = useAuth();
  const [currencies, setCurrencies] = useState<AdminCurrency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<AdminExchangeRate[]>([]);
  const [currencyForm, setCurrencyForm] = useState(initialCurrencyForm);
  const [rateForm, setRateForm] = useState(initialRateForm);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCurrency, setIsSubmittingCurrency] = useState(false);
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadCurrencyData() {
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
        if (!isMounted) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load currency data",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrencyData();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const activeCurrencies = useMemo(
    () => currencies.filter((currency) => currency.status === "ACTIVE"),
    [currencies],
  );

  async function refreshCurrencyData() {
    if (!accessToken) {
      return;
    }

    const [nextCurrencies, nextRates] = await Promise.all([
      getAdminCurrencies(accessToken),
      getAdminExchangeRates(accessToken),
    ]);

    setCurrencies(nextCurrencies);
    setExchangeRates(nextRates);
  }

  async function handleCreateCurrency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setFormError(null);
    setIsSubmittingCurrency(true);

    try {
      await createAdminCurrency(accessToken, {
        code: currencyForm.code.trim().toUpperCase(),
        name: currencyForm.name.trim(),
        symbol: currencyForm.symbol.trim() || undefined,
        decimalDigits: currencyForm.decimalDigits,
        status: currencyForm.status,
        isBase: currencyForm.isBase,
      });
      setCurrencyForm(initialCurrencyForm);
      await refreshCurrencyData();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create currency",
      );
    } finally {
      setIsSubmittingCurrency(false);
    }
  }

  async function handleCreateRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setFormError(null);
    setIsSubmittingRate(true);

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
      await refreshCurrencyData();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create exchange rate",
      );
    } finally {
      setIsSubmittingRate(false);
    }
  }

  async function handleSetBase(currency: AdminCurrency) {
    if (!accessToken || currency.isBase) {
      return;
    }

    setFormError(null);

    try {
      await updateAdminCurrency(accessToken, currency.code, {
        isBase: true,
        status: "ACTIVE",
      });
      await refreshCurrencyData();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to set base currency",
      );
    }
  }

  async function handleToggleStatus(currency: AdminCurrency) {
    if (!accessToken) {
      return;
    }

    setFormError(null);

    try {
      await updateAdminCurrency(accessToken, currency.code, {
        status: currency.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      await refreshCurrencyData();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update currency",
      );
    }
  }

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Commerce</p>
          <h1>Currencies</h1>
          <p>Manage storefront display currencies and exchange rates.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {formError ? <p className="form-error">{formError}</p> : null}

      <section className="metadata-overview-grid">
        <article className="metadata-overview-card">
          <div>
            <h2>Active Currencies</h2>
            <p>Available to customers and cart pricing.</p>
          </div>
          <strong>{isLoading ? "..." : activeCurrencies.length}</strong>
        </article>
        <article className="metadata-overview-card">
          <div>
            <h2>Exchange Rates</h2>
            <p>Latest managed conversion records.</p>
          </div>
          <strong>{isLoading ? "..." : exchangeRates.length}</strong>
        </article>
      </section>

      <section className="catalog-section">
        <div className="section-title">
          <h2>Currency List</h2>
          <span>{currencies.length}</span>
        </div>
        {isLoading ? (
          <p className="muted-text">Loading currencies...</p>
        ) : (
          <div className="admin-data-list">
            {currencies.map((currency) => (
              <article className="admin-data-row" key={currency.code}>
                <div>
                  <h3>
                    {currency.code} {currency.isBase ? "(Base)" : ""}
                  </h3>
                  <p>
                    {currency.name}
                    {currency.symbol ? ` · ${currency.symbol}` : ""}
                  </p>
                </div>
                <span>{currency.status}</span>
                <span>{currency.decimalDigits} decimals</span>
                <button
                  className="secondary-button"
                  disabled={currency.isBase}
                  type="button"
                  onClick={() => void handleSetBase(currency)}
                >
                  Set Base
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void handleToggleStatus(currency)}
                >
                  {currency.status === "ACTIVE" ? "Disable" : "Enable"}
                </button>
              </article>
            ))}
            {currencies.length === 0 ? (
              <p className="muted-text">No currencies configured yet.</p>
            ) : null}
          </div>
        )}
      </section>

      <section className="form-grid">
        <form className="admin-form" onSubmit={handleCreateCurrency}>
          <div className="section-title">
            <h2>Add Currency</h2>
          </div>
          <label>
            Code
            <input
              maxLength={3}
              placeholder="USD"
              required
              value={currencyForm.code}
              onChange={(event) =>
                setCurrencyForm((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }))
              }
            />
          </label>
          <label>
            Name
            <input
              placeholder="US Dollar"
              required
              value={currencyForm.name}
              onChange={(event) =>
                setCurrencyForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Symbol
            <input
              placeholder="$"
              value={currencyForm.symbol}
              onChange={(event) =>
                setCurrencyForm((current) => ({
                  ...current,
                  symbol: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Decimal Digits
            <input
              min={0}
              max={8}
              type="number"
              value={currencyForm.decimalDigits}
              onChange={(event) =>
                setCurrencyForm((current) => ({
                  ...current,
                  decimalDigits: Number(event.target.value),
                }))
              }
            />
          </label>
          <label>
            Status
            <select
              value={currencyForm.status}
              onChange={(event) =>
                setCurrencyForm((current) => ({
                  ...current,
                  status: event.target.value as AdminCurrency["status"],
                }))
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input
              checked={currencyForm.isBase}
              type="checkbox"
              onChange={(event) =>
                setCurrencyForm((current) => ({
                  ...current,
                  isBase: event.target.checked,
                }))
              }
            />
            Base currency
          </label>
          <button
            className="primary-button"
            disabled={isSubmittingCurrency}
            type="submit"
          >
            {isSubmittingCurrency ? "Saving..." : "Save Currency"}
          </button>
        </form>

        <form className="admin-form" onSubmit={handleCreateRate}>
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
              step="0.00000001"
              type="number"
              required
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
          <button
            className="primary-button"
            disabled={isSubmittingRate}
            type="submit"
          >
            {isSubmittingRate ? "Saving..." : "Save Rate"}
          </button>
        </form>
      </section>

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
    </main>
  );
}
