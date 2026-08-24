"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminCurrency,
  createAdminCurrency,
  getAdminCurrencies,
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

export default function AdminCurrencyListPage() {
  const { accessToken } = useAuth();
  const [currencies, setCurrencies] = useState<AdminCurrency[]>([]);
  const [currencyForm, setCurrencyForm] = useState(initialCurrencyForm);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refreshCurrencies() {
    if (!accessToken) {
      return;
    }

    setCurrencies(await getAdminCurrencies(accessToken));
  }

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadCurrencies() {
      setError(null);
      setIsLoading(true);

      try {
        const nextCurrencies = await getAdminCurrencies(token);

        if (isMounted) {
          setCurrencies(nextCurrencies);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load currencies",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrencies();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  async function handleCreateCurrency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

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
      await refreshCurrencies();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create currency",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetBase(currency: AdminCurrency) {
    if (!accessToken || currency.isBase) {
      return;
    }

    setError(null);

    try {
      await updateAdminCurrency(accessToken, currency.code, {
        isBase: true,
        status: "ACTIVE",
      });
      await refreshCurrencies();
    } catch (caughtError) {
      setError(
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

    setError(null);

    try {
      await updateAdminCurrency(accessToken, currency.code, {
        status: currency.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      await refreshCurrencies();
    } catch (caughtError) {
      setError(
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
          <p className="eyebrow">Currencies</p>
          <h1>Currency List</h1>
          <p>Add storefront currencies and control their availability.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="admin-order-layout">
        <form className="catalog-section admin-form" onSubmit={handleCreateCurrency}>
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
              max={8}
              min={0}
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
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save Currency"}
          </button>
        </form>

        <section className="catalog-section">
          <div className="section-title">
            <h2>Currencies</h2>
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
                    className="secondary-button compact-button"
                    disabled={currency.isBase}
                    type="button"
                    onClick={() => void handleSetBase(currency)}
                  >
                    Set Base
                  </button>
                  <button
                    className="secondary-button compact-button"
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
      </section>
    </main>
  );
}
