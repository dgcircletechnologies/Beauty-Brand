"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

function formatMoney(
  amount: number | string,
  currency?: { code: string; symbol: string | null; decimalDigits: number },
) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return `${currency?.symbol ?? ""}0`;
  }

  return `${currency?.symbol ?? currency?.code ?? ""}${value.toFixed(
    currency?.decimalDigits ?? 2,
  )}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();
  const { selectedCurrency } = useCurrency();
  const [preview, setPreview] = useState<customerApi.CheckoutPreview | null>(
    null,
  );
  const [addresses, setAddresses] = useState<customerApi.CustomerAddress[]>([]);
  const [shippingAddressId, setShippingAddressId] = useState("");
  const [billingAddressId, setBillingAddressId] = useState("");
  const [selectedShippingRateId, setSelectedShippingRateId] = useState("");
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [customerPhone, setCustomerPhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartItemIds = useMemo(() => {
    const rawValue = searchParams.get("cartItemIds");

    return rawValue
      ? rawValue
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }, [searchParams]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadAddresses() {
      setIsLoading(true);
      setError(null);

      try {
        const nextAddresses = await customerApi.getAddresses(token);

        if (!isMounted) {
          return;
        }

        const defaultShipping =
          nextAddresses.find((address) => address.isDefaultShipping) ??
          nextAddresses[0];
        const defaultBilling =
          nextAddresses.find((address) => address.isDefaultBilling) ??
          defaultShipping;

        setAddresses(nextAddresses);
        setShippingAddressId(defaultShipping?.id ?? "");
        setBillingAddressId(defaultBilling?.id ?? "");
        setCustomerPhone(defaultShipping?.phone ?? "");
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load addresses",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAddresses();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !selectedCurrency) {
      return;
    }

    let isMounted = true;
    const token = accessToken;
    const currencyCode = selectedCurrency.code;

    async function loadPreview() {
      setIsLoading(true);
      setError(null);

      try {
        const nextPreview = await customerApi.getCheckoutPreview(token, {
          cartItemIds,
          currencyCode,
          shippingAddressId: shippingAddressId || undefined,
          shippingRateId: selectedShippingRateId || undefined,
        });

        if (!isMounted) {
          return;
        }

        setPreview(nextPreview);

        const nextSelectedRateId =
          nextPreview.selectedShippingRate?.id ??
          nextPreview.shippingRates[0]?.id ??
          "";

        if (selectedShippingRateId !== nextSelectedRateId) {
          setSelectedShippingRateId(nextSelectedRateId);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load checkout",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    cartItemIds,
    selectedCurrency,
    selectedShippingRateId,
    shippingAddressId,
  ]);

  async function handleConfirmOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !selectedCurrency || !shippingAddressId) {
      setError("Select a shipping address before confirming the order.");
      return;
    }

    if (!selectedShippingRateId) {
      setError("Select a shipping method before confirming the order.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const order = await customerApi.createOrder(accessToken, {
        cartItemIds: preview?.selectedCartItemIds,
        shippingAddressId,
        billingAddressId: useSameAddress ? shippingAddressId : billingAddressId,
        shippingRateId: selectedShippingRateId,
        currencyCode: selectedCurrency.code,
        customerPhone,
      });

      router.push(`/orders?placed=${order.orderNumber}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to place order",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <UserShell>
      <main className="customer-page">
        <section className="dashboard-header">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Confirm your order</h1>
            <p>Select an address now. Payment details can be added later.</p>
          </div>
        </section>

        {error ? <p className="form-error">{error}</p> : null}

        {isLoading ? (
          <section className="empty-surface">
            <h2>Loading checkout...</h2>
          </section>
        ) : !preview ? (
          <section className="empty-surface">
            <h2>Checkout unavailable</h2>
            <p>Return to cart and select products again.</p>
          </section>
        ) : (
          <form className="checkout-layout" onSubmit={handleConfirmOrder}>
            <section className="checkout-main">
              <div className="checkout-panel">
                <div className="section-title">
                  <h2>Shipping address</h2>
                  <Link className="secondary-link-button" href="/addresses">
                    Manage addresses
                  </Link>
                </div>

                {addresses.length ? (
                  <div className="address-option-grid">
                    {addresses.map((address) => (
                      <label className="address-option" key={address.id}>
                        <input
                          checked={shippingAddressId === address.id}
                          name="shippingAddressId"
                          type="radio"
                          value={address.id}
                          onChange={() => {
                            setShippingAddressId(address.id);
                            setSelectedShippingRateId("");
                            if (useSameAddress) {
                              setBillingAddressId(address.id);
                            }
                            setCustomerPhone(address.phone ?? customerPhone);
                          }}
                        />
                        <span>
                          <strong>
                            {address.firstName} {address.lastName}
                          </strong>
                          <small>
                            {address.line1}, {address.city},{" "}
                            {address.countryCode} {address.postalCode}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p>Add an address before placing the order.</p>
                )}

                <label>
                  Contact phone
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                  />
                </label>
              </div>

              <div className="checkout-panel">
                <label className="checkbox-field">
                  <input
                    checked={useSameAddress}
                    type="checkbox"
                    onChange={(event) => {
                      setUseSameAddress(event.target.checked);
                      if (event.target.checked) {
                        setBillingAddressId(shippingAddressId);
                      }
                    }}
                  />
                  <span>Billing address is same as shipping</span>
                </label>

                {!useSameAddress ? (
                  <select
                    value={billingAddressId}
                    onChange={(event) => setBillingAddressId(event.target.value)}
                  >
                    <option value="">Select billing address</option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.firstName} {address.lastName} - {address.line1}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              <div className="checkout-panel">
                <div className="section-title">
                  <h2>Shipping method</h2>
                  <span>
                    {preview.selectedShippingRate ? 1 : 0}/
                    {preview.shippingAvailability.activeRateCount}
                  </span>
                </div>
                {preview.shippingAvailability.zone ? (
                  <p>
                    Available zone: {preview.shippingAvailability.zone.name}
                    {preview.shippingAvailability.country
                      ? `, ${preview.shippingAvailability.country.countryName}`
                      : ""}
                  </p>
                ) : null}
                {preview.selectedShippingRate ? (
                  <div className="address-option-grid">
                    <div className="address-option">
                      <span>
                        <strong>
                          {preview.selectedShippingRate.name} -{" "}
                          {formatMoney(
                            preview.selectedShippingRate.displayAmount,
                            preview.selectedShippingRate.currency,
                          )}
                        </strong>
                        <small>
                          {preview.selectedShippingRate.zone.name}
                          {preview.selectedShippingRate.estimatedDaysMin ||
                          preview.selectedShippingRate.estimatedDaysMax
                            ? `, ${preview.selectedShippingRate.estimatedDaysMin ?? preview.selectedShippingRate.estimatedDaysMax}-${preview.selectedShippingRate.estimatedDaysMax ?? preview.selectedShippingRate.estimatedDaysMin} days`
                            : ""}
                        </small>
                      </span>
                    </div>
                  </div>
                ) : shippingAddressId ? (
                  <p>{preview.shippingAvailability.message}</p>
                ) : (
                  <p>{preview.shippingAvailability.message}</p>
                )}
              </div>
            </section>

            <aside className="checkout-summary">
              <p className="eyebrow">Order Summary</p>
              <h2>{preview.itemCount} item(s)</h2>
              <div className="checkout-items">
                {preview.items.map((item) => (
                  <div className="checkout-item" key={item.cartItemId}>
                    <span>
                      <strong>{item.productName}</strong>
                      <small>
                        {item.sku} x {item.quantity}
                      </small>
                    </span>
                    <strong>
                      {formatMoney(item.displayLineTotal, preview.currency)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="summary-lines">
                <span>
                  Subtotal
                  <strong>
                    {formatMoney(preview.displaySubtotal, preview.currency)}
                  </strong>
                </span>
                <span>
                  Shipping
                  <strong>
                    {formatMoney(preview.displayShippingAmount, preview.currency)}
                  </strong>
                </span>
                <span>
                  Total
                  <strong>
                    {formatMoney(preview.displayTotalAmount, preview.currency)}
                  </strong>
                </span>
              </div>
              <button
                className="primary-button"
                disabled={
                  isSubmitting || !addresses.length || !selectedShippingRateId
                }
                type="submit"
              >
                {isSubmitting ? "Placing order..." : "Confirm Order"}
              </button>
            </aside>
          </form>
        )}
      </main>
    </UserShell>
  );
}
