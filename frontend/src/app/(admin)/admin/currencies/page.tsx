"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminCurrency,
  AdminExchangeRate,
  getAdminCurrencies,
  getAdminExchangeRates,
} from "@/lib/api/admin";

export default function AdminCurrenciesPage() {
  const { accessToken } = useAuth();
  const [currencies, setCurrencies] = useState<AdminCurrency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<AdminExchangeRate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load currency data",
          );
        }
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
  const inactiveCurrencies = useMemo(
    () => currencies.filter((currency) => currency.status === "INACTIVE"),
    [currencies],
  );
  const baseCurrency = useMemo(
    () => currencies.find((currency) => currency.isBase) ?? null,
    [currencies],
  );
  const latestRates = useMemo(
    () => exchangeRates.slice(0, 5),
    [exchangeRates],
  );
  const coveredActiveCurrencies = useMemo(() => {
    if (!baseCurrency) {
      return 0;
    }

    return activeCurrencies.filter(
      (currency) =>
        currency.code === baseCurrency.code ||
        exchangeRates.some(
          (rate) =>
            rate.baseCurrencyCode === baseCurrency.code &&
            rate.quoteCurrencyCode === currency.code &&
            (!rate.expiresAt || new Date(rate.expiresAt) > new Date()),
        ),
    ).length;
  }, [activeCurrencies, baseCurrency, exchangeRates]);
  const coveragePercent = activeCurrencies.length
    ? Math.round((coveredActiveCurrencies / activeCurrencies.length) * 100)
    : 0;

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Commerce</p>
          <h1>Currencies</h1>
          <p>Review currency setup and manage conversion records.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="currency-hero-panel">
        <div>
          <p className="eyebrow">Base Currency</p>
          <h2>{isLoading ? "Loading..." : baseCurrency?.code ?? "Not Set"}</h2>
          <p>
            {baseCurrency
              ? `${baseCurrency.name}${baseCurrency.symbol ? ` (${baseCurrency.symbol})` : ""}`
              : "Set a base currency before relying on storefront conversions."}
          </p>
        </div>
        <div className="currency-coverage">
          <span>{coveragePercent}%</span>
          <div>
            <i style={{ width: `${coveragePercent}%` }} />
          </div>
          <small>
            {coveredActiveCurrencies} of {activeCurrencies.length} active
            currencies covered
          </small>
        </div>
      </section>

      <section className="currency-metric-grid">
        <article>
          <span>Active</span>
          <strong>{isLoading ? "..." : activeCurrencies.length}</strong>
        </article>
        <article>
          <span>Inactive</span>
          <strong>{isLoading ? "..." : inactiveCurrencies.length}</strong>
        </article>
        <article>
          <span>Exchange Rates</span>
          <strong>{isLoading ? "..." : exchangeRates.length}</strong>
        </article>
      </section>

      <section className="currency-workspace">
        <div className="catalog-section">
          <div className="section-title">
            <h2>Quick Actions</h2>
          </div>
          <div className="currency-action-grid">
            <Link href="/admin/currencies/list">
              <strong>Currency List</strong>
              <span>Add currencies, set base currency, and toggle status.</span>
            </Link>
            <Link href="/admin/currencies/exchange-rates">
              <strong>Exchange Rates</strong>
              <span>Create conversion rates between active currencies.</span>
            </Link>
          </div>
        </div>

        <div className="catalog-section">
          <div className="section-title">
            <h2>Latest Rates</h2>
            <span>{latestRates.length}</span>
          </div>
          <div className="admin-data-list">
            {latestRates.map((rate) => (
              <article className="exchange-rate-card" key={rate.id}>
                <div>
                  <h3>
                    {rate.baseCurrencyCode} to {rate.quoteCurrencyCode}
                  </h3>
                  <p>{rate.provider}</p>
                </div>
                <strong>{Number(rate.rate).toFixed(6)}</strong>
                <span>{new Date(rate.effectiveAt).toLocaleDateString()}</span>
              </article>
            ))}
            {!isLoading && latestRates.length === 0 ? (
              <p className="muted-text">No exchange rates configured yet.</p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
