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
  const baseCurrency = currencies.find((currency) => currency.isBase);

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
            <h2>Base Currency</h2>
            <p>Stored internally for products, carts, and orders.</p>
          </div>
          <strong>{isLoading ? "..." : baseCurrency?.code ?? "None"}</strong>
        </article>
        <article className="metadata-overview-card">
          <div>
            <h2>Exchange Rates</h2>
            <p>Managed conversion records.</p>
          </div>
          <strong>{isLoading ? "..." : exchangeRates.length}</strong>
        </article>
      </section>

      <section className="metadata-overview-grid">
        <Link className="metadata-overview-card" href="/admin/currencies/list">
          <div>
            <h2>Currency List</h2>
            <p>Add currencies, set the base currency, and toggle availability.</p>
          </div>
          <strong>{currencies.length}</strong>
        </Link>
        <Link
          className="metadata-overview-card"
          href="/admin/currencies/exchange-rates"
        >
          <div>
            <h2>Exchange Rates</h2>
            <p>Add and review conversion rates between active currencies.</p>
          </div>
          <strong>{exchangeRates.length}</strong>
        </Link>
      </section>
    </main>
  );
}
