"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminCurrency,
  createAdminCurrency,
  getAdminCurrencies,
  updateAdminCurrency,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const initialCurrencyForm = {
  code: "",
  name: "",
  symbol: "",
  decimalDigits: 2,
  status: "ACTIVE" as AdminCurrency["status"],
  isBase: false,
};

const currencyCodePattern = /^[A-Z]{3}$/;

export default function AdminCurrencyListPage() {
  const { accessToken } = useAuth();
  const [currencies, setCurrencies] = useState<AdminCurrency[]>([]);
  const [currencyForm, setCurrencyForm] = useState(initialCurrencyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedCode = useDebouncedValue(currencyForm.code, 350);

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

  const normalizedCode = currencyForm.code.trim().toUpperCase();
  const debouncedNormalizedCode = debouncedCode.trim().toUpperCase();
  const codeIsValid = currencyCodePattern.test(normalizedCode);
  const codeStatus = useMemo(() => {
    if (
      !debouncedNormalizedCode ||
      debouncedNormalizedCode !== normalizedCode ||
      !currencyCodePattern.test(debouncedNormalizedCode)
    ) {
      return null;
    }

    return currencies.some(
      (currency) => currency.code === debouncedNormalizedCode,
    )
      ? "unavailable"
      : "available";
  }, [currencies, debouncedNormalizedCode, normalizedCode]);
  const canSubmit =
    codeIsValid &&
    codeStatus === "available" &&
    Boolean(currencyForm.name.trim()) &&
    currencyForm.decimalDigits >= 0 &&
    currencyForm.decimalDigits <= 8 &&
    !isSubmitting;

  const setCurrencyField = useCallback(
    <T extends keyof typeof initialCurrencyForm>(
      field: T,
      value: (typeof initialCurrencyForm)[T],
    ) => {
      setCurrencyForm((current) => ({
        ...current,
        [field]: value,
      }));
      setSuccess(null);
    },
    [],
  );

  const upsertCurrencyInList = useCallback((updatedCurrency: AdminCurrency) => {
    setCurrencies((currentCurrencies) => {
      const nextCurrencies = currentCurrencies.some(
        (currency) => currency.code === updatedCurrency.code,
      )
        ? currentCurrencies.map((currency) =>
            currency.code === updatedCurrency.code ? updatedCurrency : currency,
          )
        : [...currentCurrencies, updatedCurrency];

      return nextCurrencies
        .map((currency) =>
          updatedCurrency.isBase && currency.code !== updatedCurrency.code
            ? {
                ...currency,
                isBase: false,
              }
            : currency,
        )
        .sort(sortCurrencies);
    });
  }, []);

  const handleCreateCurrency = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !canSubmit) {
        return;
      }

      setError(null);
      setSuccess(null);
      setIsSubmitting(true);

      try {
        const createdCurrency = await createAdminCurrency(accessToken, {
          code: normalizedCode,
          name: currencyForm.name.trim(),
          symbol: currencyForm.symbol.trim() || undefined,
          decimalDigits: currencyForm.decimalDigits,
          status: currencyForm.status,
          isBase: currencyForm.isBase,
        });

        upsertCurrencyInList(createdCurrency);
        setCurrencyForm(initialCurrencyForm);
        setSuccess("Currency created.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to create currency",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      accessToken,
      canSubmit,
      currencyForm,
      normalizedCode,
      upsertCurrencyInList,
    ],
  );

  const handleSetBase = useCallback(
    async (currency: AdminCurrency) => {
      if (!accessToken || currency.isBase) {
        return;
      }

      setError(null);
      setSuccess(null);

      try {
        const updatedCurrency = await updateAdminCurrency(
          accessToken,
          currency.code,
          {
            isBase: true,
            status: "ACTIVE",
          },
        );
        upsertCurrencyInList(updatedCurrency);
        setSuccess(`${currency.code} is now the base currency.`);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to set base currency",
        );
      }
    },
    [accessToken, upsertCurrencyInList],
  );

  const handleToggleStatus = useCallback(
    async (currency: AdminCurrency) => {
      if (!accessToken || currency.isBase) {
        return;
      }

      setError(null);
      setSuccess(null);

      try {
        const updatedCurrency = await updateAdminCurrency(
          accessToken,
          currency.code,
          {
            status: currency.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
          },
        );
        upsertCurrencyInList(updatedCurrency);
        setSuccess(`${currency.code} updated.`);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update currency",
        );
      }
    },
    [accessToken, upsertCurrencyInList],
  );

  const activeCount = useMemo(
    () => currencies.filter((currency) => currency.status === "ACTIVE").length,
    [currencies],
  );

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
      {success ? <p className="form-success">{success}</p> : null}

      <section className="currency-workspace">
        <form className="catalog-section admin-form" onSubmit={handleCreateCurrency}>
          <div className="section-title">
            <h2>Add Currency</h2>
            <span>{activeCount} active</span>
          </div>
          <label>
            Code
            <input
              maxLength={3}
              placeholder="USD"
              required
              value={currencyForm.code}
              onChange={(event) =>
                setCurrencyField("code", event.target.value.toUpperCase())
              }
            />
            {normalizedCode ? (
              <small
                className={
                  codeStatus === "available"
                    ? "field-status available"
                    : "field-status unavailable"
                }
              >
                {!codeIsValid
                  ? "Use a 3-letter uppercase code."
                  : codeStatus === "available"
                    ? "Currency code is available."
                    : codeStatus === "unavailable"
                      ? "Currency code already exists."
                      : "Checking currency code..."}
              </small>
            ) : null}
          </label>
          <label>
            Name
            <input
              placeholder="US Dollar"
              required
              value={currencyForm.name}
              onChange={(event) => setCurrencyField("name", event.target.value)}
            />
          </label>
          <div className="split-fields">
            <label>
              Symbol
              <input
                placeholder="$"
                value={currencyForm.symbol}
                onChange={(event) =>
                  setCurrencyField("symbol", event.target.value)
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
                  setCurrencyField("decimalDigits", Number(event.target.value))
                }
              />
            </label>
          </div>
          <label>
            Status
            <select
              value={currencyForm.status}
              onChange={(event) =>
                setCurrencyField(
                  "status",
                  event.target.value as AdminCurrency["status"],
                )
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
                setCurrencyField("isBase", event.target.checked)
              }
            />
            Base currency
          </label>
          <button className="primary-button" disabled={!canSubmit} type="submit">
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
            <div className="currency-card-grid">
              {currencies.map((currency) => (
                <article className="currency-card" key={currency.code}>
                  <div className="currency-card-top">
                    <span className="currency-code-chip">{currency.code}</span>
                    <span>{currency.status}</span>
                  </div>
                  <h3>
                    {currency.symbol ? `${currency.symbol} ` : ""}
                    {currency.name}
                  </h3>
                  <p>
                    {currency.decimalDigits} decimal
                    {currency.decimalDigits === 1 ? "" : "s"}
                  </p>
                  {currency.isBase ? (
                    <strong className="currency-base-badge">
                      Base Currency
                    </strong>
                  ) : null}
                  <div className="row-actions">
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
                      disabled={currency.isBase}
                      type="button"
                      onClick={() => void handleToggleStatus(currency)}
                    >
                      {currency.status === "ACTIVE" ? "Disable" : "Enable"}
                    </button>
                  </div>
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

function sortCurrencies(first: AdminCurrency, second: AdminCurrency) {
  if (first.isBase !== second.isBase) {
    return first.isBase ? -1 : 1;
  }

  return first.code.localeCompare(second.code);
}
