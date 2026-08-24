"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

export default function AdminShippingRatesPage() {
  const { accessToken } = useAuth();
  const [zones, setZones] = useState<adminApi.AdminShippingZone[]>([]);
  const [currencies, setCurrencies] = useState<adminApi.AdminCurrency[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [name, setName] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [calculation, setCalculation] = useState<"FLAT" | "FREE">("FLAT");
  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxOrderAmount, setMaxOrderAmount] = useState("");
  const [estimatedDaysMin, setEstimatedDaysMin] = useState("");
  const [estimatedDaysMax, setEstimatedDaysMax] = useState("");
  const [editingRateId, setEditingRateId] = useState("");
  const [editMinOrderAmount, setEditMinOrderAmount] = useState("");
  const [editMaxOrderAmount, setEditMaxOrderAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedZone = zones.find((zone) => zone.id === selectedZoneId);

  async function loadSetup() {
    if (!accessToken) {
      return;
    }

    try {
      const [nextZones, nextCurrencies] = await Promise.all([
        adminApi.getAdminShippingZones(accessToken),
        adminApi.getAdminCurrencies(accessToken),
      ]);
      const baseCurrency =
        nextCurrencies.find((currency) => currency.isBase) ?? nextCurrencies[0];

      setZones(nextZones);
      setCurrencies(nextCurrencies);
      setSelectedZoneId((currentId) => currentId || nextZones[0]?.id || "");
      setCurrencyCode((currentCode) => currentCode || baseCurrency?.code || "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load shipping rates",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSetup();
  }, [accessToken]);

  async function handleCreateRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !selectedZoneId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.createAdminShippingRate(accessToken, {
        zoneId: selectedZoneId,
        name,
        serviceCode: serviceCode || undefined,
        calculation,
        amount: calculation === "FREE" ? 0 : Number(amount),
        currencyCode,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
        maxOrderAmount: maxOrderAmount ? Number(maxOrderAmount) : undefined,
        estimatedDaysMin: estimatedDaysMin ? Number(estimatedDaysMin) : undefined,
        estimatedDaysMax: estimatedDaysMax ? Number(estimatedDaysMax) : undefined,
        isActive: true,
      });
      setName("");
      setServiceCode("");
      setAmount("");
      setMinOrderAmount("");
      setMaxOrderAmount("");
      setEstimatedDaysMin("");
      setEstimatedDaysMax("");
      setSuccess("Shipping rate created.");
      await loadSetup();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create shipping rate",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleRate(rate: adminApi.AdminShippingRate) {
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.updateAdminShippingRate(accessToken, rate.id, {
        isActive: !rate.isActive,
      });
      setSuccess("Shipping rate updated.");
      await loadSetup();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update shipping rate",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditingRate(rate: adminApi.AdminShippingRate) {
    setEditingRateId(rate.id);
    setEditMinOrderAmount(rate.minOrderAmount ?? "");
    setEditMaxOrderAmount(rate.maxOrderAmount ?? "");
    setError(null);
    setSuccess(null);
  }

  function cancelEditingRate() {
    setEditingRateId("");
    setEditMinOrderAmount("");
    setEditMaxOrderAmount("");
  }

  async function saveRateLimits(rate: adminApi.AdminShippingRate) {
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.updateAdminShippingRate(accessToken, rate.id, {
        minOrderAmount: editMinOrderAmount
          ? Number(editMinOrderAmount)
          : null,
        maxOrderAmount: editMaxOrderAmount
          ? Number(editMaxOrderAmount)
          : null,
      });
      cancelEditingRate();
      setSuccess("Shipping rate limits updated.");
      await loadSetup();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update shipping rate limits",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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

      <section className="admin-order-layout">
        <form className="catalog-section admin-form" onSubmit={handleCreateRate}>
          <h2>Add Rate</h2>
          <label>
            Zone
            <select
              required
              value={selectedZoneId}
              onChange={(event) => setSelectedZoneId(event.target.value)}
            >
              <option value="">Select zone</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rate name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="split-fields">
            <label>
              Calculation
              <select
                value={calculation}
                onChange={(event) =>
                  setCalculation(event.target.value as "FLAT" | "FREE")
                }
              >
                <option value="FLAT">Flat</option>
                <option value="FREE">Free</option>
              </select>
            </label>
            <label>
              Service code
              <input
                value={serviceCode}
                onChange={(event) => setServiceCode(event.target.value)}
              />
            </label>
          </div>
          <div className="split-fields">
            <label>
              Amount
              <input
                min="0"
                required={calculation !== "FREE"}
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label>
              Currency
              <select
                required
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value)}
              >
                <option value="">Select currency</option>
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
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
                type="number"
                value={minOrderAmount}
                onChange={(event) => setMinOrderAmount(event.target.value)}
              />
            </label>
            <label>
              Max order base amount
              <input
                min="0"
                type="number"
                value={maxOrderAmount}
                onChange={(event) => setMaxOrderAmount(event.target.value)}
              />
            </label>
          </div>
          <div className="split-fields">
            <label>
              Min days
              <input
                min="0"
                type="number"
                value={estimatedDaysMin}
                onChange={(event) => setEstimatedDaysMin(event.target.value)}
              />
            </label>
            <label>
              Max days
              <input
                min="0"
                type="number"
                value={estimatedDaysMax}
                onChange={(event) => setEstimatedDaysMax(event.target.value)}
              />
            </label>
          </div>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            Add Rate
          </button>
        </form>

        <section className="catalog-section">
          <div className="section-title">
            <h2>{selectedZone?.name ?? "Rates"}</h2>
            <span>{selectedZone?.rates.length ?? 0}</span>
          </div>
          {isLoading ? (
            <p>Loading rates...</p>
          ) : (
            <div className="admin-data-list">
              {selectedZone?.rates.map((rate) => (
                <div className="admin-data-row" key={rate.id}>
                  <div>
                    <h3>{rate.name}</h3>
                    <p>
                      {rate.currencyCode} {rate.amount}
                      {rate.serviceCode ? `, ${rate.serviceCode}` : ""}
                    </p>
                    <p>
                      Min: {rate.minOrderAmount ?? "none"} | Max:{" "}
                      {rate.maxOrderAmount ?? "none"}
                    </p>
                  </div>
                  <span>{rate.isActive ? "active" : "inactive"}</span>
                  {editingRateId === rate.id ? (
                    <div className="split-fields">
                      <label>
                        Min
                        <input
                          min="0"
                          type="number"
                          value={editMinOrderAmount}
                          onChange={(event) =>
                            setEditMinOrderAmount(event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Max
                        <input
                          min="0"
                          type="number"
                          value={editMaxOrderAmount}
                          onChange={(event) =>
                            setEditMaxOrderAmount(event.target.value)
                          }
                        />
                      </label>
                      <button
                        className="primary-button compact-button"
                        disabled={isSubmitting}
                        type="button"
                        onClick={() => void saveRateLimits(rate)}
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
                  ) : (
                    <>
                      <button
                        className="secondary-button compact-button"
                        disabled={isSubmitting}
                        type="button"
                        onClick={() => startEditingRate(rate)}
                      >
                        Edit limits
                      </button>
                      <button
                        className="secondary-button compact-button"
                        disabled={isSubmitting}
                        type="button"
                        onClick={() => void toggleRate(rate)}
                      >
                        Toggle
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
