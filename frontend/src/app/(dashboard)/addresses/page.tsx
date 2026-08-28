"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import * as customerApi from "@/lib/api/customer";

const emptyAddress: customerApi.UpsertAddressPayload = {
  label: "",
  firstName: "",
  lastName: "",
  company: "",
  line1: "",
  line2: "",
  city: "",
  stateOrProvince: "",
  postalCode: "",
  countryCode: "",
  phone: "",
  isDefaultShipping: false,
  isDefaultBilling: false,
};

function toPayload(formData: FormData): customerApi.UpsertAddressPayload {
  return {
    label: String(formData.get("label") || ""),
    firstName: String(formData.get("firstName")),
    lastName: String(formData.get("lastName")),
    company: String(formData.get("company") || ""),
    line1: String(formData.get("line1")),
    line2: String(formData.get("line2") || ""),
    city: String(formData.get("city")),
    stateOrProvince: String(formData.get("stateOrProvince") || ""),
    postalCode: String(formData.get("postalCode")),
    countryCode: String(formData.get("countryCode")),
    phone: String(formData.get("phone") || ""),
    isDefaultShipping: formData.get("isDefaultShipping") === "on",
    isDefaultBilling: formData.get("isDefaultBilling") === "on",
  };
}

export default function AddressesPage() {
  const { accessToken } = useAuth();
  const [addresses, setAddresses] = useState<customerApi.CustomerAddress[]>([]);
  const [shippingCountries, setShippingCountries] = useState<
    customerApi.CustomerShippingCountry[]
  >([]);
  const [editingAddress, setEditingAddress] =
    useState<customerApi.CustomerAddress | null>(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadAddresses() {
    if (!accessToken) {
      return;
    }

    try {
      const [nextAddresses, nextCountries] = await Promise.all([
        customerApi.getAddresses(accessToken),
        customerApi.getShippingCountries(accessToken),
      ]);

      setAddresses(nextAddresses);
      setShippingCountries(nextCountries);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load addresses",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;

    Promise.all([
      customerApi.getAddresses(accessToken),
      customerApi.getShippingCountries(accessToken),
    ])
      .then(([nextAddresses, nextCountries]) => {
        if (isMounted) {
          setAddresses(nextAddresses);
          setShippingCountries(nextCountries);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load addresses",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = toPayload(new FormData(event.currentTarget));

      if (editingAddress) {
        await customerApi.updateAddress(accessToken, editingAddress.id, payload);
        setSuccess("Address updated successfully.");
      } else {
        await customerApi.createAddress(accessToken, payload);
        setSuccess("Address added successfully.");
      }

      setEditingAddress(null);
      setIsAddressFormOpen(false);
      event.currentTarget.reset();
      await loadAddresses();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save address",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(addressId: string) {
    if (!accessToken) {
      return;
    }

    setDeletingAddressId(addressId);
    setError(null);
    setSuccess(null);

    try {
      await customerApi.deleteAddress(accessToken, addressId);
      setSuccess("Address removed successfully.");
      await loadAddresses();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to remove address",
      );
    } finally {
      setDeletingAddressId(null);
    }
  }

  const formAddress = editingAddress ?? emptyAddress;

  return (
    <UserShell>
      <main className="customer-page account-settings-page">
        <section className="dashboard-header account-settings-header">
          <div>
            <p className="eyebrow">Account</p>
            <h1>
              Saved <em>Addresses</em>
            </h1>
          </div>
        </section>

        <nav className="profile-tabs" aria-label="Profile sections">
          <Link href="/profile">Profile</Link>
          <Link href="/profile/security">Password</Link>
          <Link href="/profile/sessions">Account Status</Link>
          <Link className="active" href="/addresses">
            Addresses
          </Link>
        </nav>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}
        {!isLoading && shippingCountries.length === 0 ? (
          <p className="form-error">
            No delivery countries are available yet. Ask an admin to configure
            active shipping zones and countries.
          </p>
        ) : null}
        {isLoading ? (
          <section className="empty-surface">
            <h2>Loading addresses...</h2>
          </section>
        ) : !isAddressFormOpen ? (
          <section className="address-overview">
            <div className="profile-overview-heading">
              <div>
                <h2>Address book</h2>
                <p>Review your saved shipping and billing addresses.</p>
              </div>
              <button
                className="primary-button compact-button"
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setError(null);
                  setSuccess(null);
                  setIsAddressFormOpen(true);
                }}
              >
                Add Address
              </button>
            </div>

            {addresses.length ? (
              <div className="address-list address-overview-list">
                {addresses.map((address) => (
                  <article className="address-card" key={address.id}>
                    <div>
                      <h2>{address.label || "Address"}</h2>
                      <p>
                        {address.firstName} {address.lastName}
                      </p>
                      {address.company ? <p>{address.company}</p> : null}
                      <p>{address.line1}</p>
                      {address.line2 ? <p>{address.line2}</p> : null}
                      <p>
                        {address.city}
                        {address.stateOrProvince
                          ? `, ${address.stateOrProvince}`
                          : ""}{" "}
                        {address.postalCode}
                      </p>
                      <p>{address.countryCode}</p>
                      {address.phone ? <p>{address.phone}</p> : null}
                    </div>
                    <div className="address-badges">
                      {address.isDefaultShipping ? <span>Shipping</span> : null}
                      {address.isDefaultBilling ? <span>Billing</span> : null}
                    </div>
                    <div className="form-actions">
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        onClick={() => {
                          setEditingAddress(address);
                          setError(null);
                          setSuccess(null);
                          setIsAddressFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="danger-button compact-button"
                        type="button"
                        disabled={deletingAddressId === address.id}
                        onClick={() => void handleDelete(address.id)}
                      >
                        {deletingAddressId === address.id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <section className="empty-surface">
                <h2>No addresses yet</h2>
                <p>Add your first address before checkout.</p>
              </section>
            )}
          </section>
        ) : (
          <form
            className="account-form address-form"
            key={editingAddress?.id ?? "new-address"}
            onSubmit={handleSubmit}
          >
            <section className="account-setting-row">
              <div>
                <h2>{editingAddress ? "Edit address" : "Add address"}</h2>
                <p>Save delivery details for faster checkout.</p>
              </div>
              <label>
                Label
                <input name="label" defaultValue={formAddress.label ?? ""} />
              </label>
            </section>
            <section className="account-setting-row">
              <div>
                <h2>Contact name</h2>
                <p>This name appears on shipping and billing details.</p>
              </div>
              <div className="split-fields">
                <label>
                  First name
                  <input
                    name="firstName"
                    defaultValue={formAddress.firstName}
                    required
                  />
                </label>
                <label>
                  Last name
                  <input
                    name="lastName"
                    defaultValue={formAddress.lastName}
                    required
                  />
                </label>
              </div>
            </section>
            <section className="account-setting-row">
              <div>
                <h2>Street address</h2>
                <p>Use the address where you can receive deliveries.</p>
              </div>
              <div className="address-field-grid">
                <label>
                  Company
                  <input name="company" defaultValue={formAddress.company ?? ""} />
                </label>
                <label>
                  Address line 1
                  <input name="line1" defaultValue={formAddress.line1} required />
                </label>
                <label>
                  Address line 2
                  <input name="line2" defaultValue={formAddress.line2 ?? ""} />
                </label>
              </div>
            </section>
            <section className="account-setting-row">
              <div>
                <h2>Region</h2>
                <p>Shipping availability is checked from this country.</p>
              </div>
              <div className="address-field-grid two-column">
                <label>
                  City
                  <input name="city" defaultValue={formAddress.city} required />
                </label>
                <label>
                  State
                  <input
                    name="stateOrProvince"
                    defaultValue={formAddress.stateOrProvince ?? ""}
                  />
                </label>
                <label>
                  Postal code
                  <input
                    name="postalCode"
                    defaultValue={formAddress.postalCode}
                    required
                  />
                </label>
                <label>
                  Country code
                  <select
                    name="countryCode"
                    defaultValue={formAddress.countryCode}
                    required
                  >
                    <option value="">Select country</option>
                    {shippingCountries.map((country) => (
                      <option key={country.id} value={country.countryCode}>
                        {country.countryName} ({country.countryCode})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
            <section className="account-setting-row">
              <div>
                <h2>Phone</h2>
                <p>Optional phone number for courier updates.</p>
              </div>
              <label>
                Phone
                <input name="phone" defaultValue={formAddress.phone ?? ""} />
              </label>
            </section>
            <section className="account-setting-row">
              <div>
                <h2>Defaults</h2>
                <p>Choose how this address is selected during checkout.</p>
              </div>
              <div className="account-checkbox-stack">
                <label className="checkbox-field">
                  <input
                    name="isDefaultShipping"
                    type="checkbox"
                    defaultChecked={formAddress.isDefaultShipping}
                  />
                  Default shipping address
                </label>
                <label className="checkbox-field">
                  <input
                    name="isDefaultBilling"
                    type="checkbox"
                    defaultChecked={formAddress.isDefaultBilling}
                  />
                  Default billing address
                </label>
              </div>
            </section>
            <div className="account-form-actions">
              {editingAddress ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditingAddress(null);
                    setIsAddressFormOpen(false);
                  }}
                >
                  Cancel
                </button>
              ) : (
                <button className="secondary-button" type="reset">
                  Reset
                </button>
              )}
              <button
                className="primary-button"
                type="submit"
                disabled={isSubmitting || shippingCountries.length === 0}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingAddress
                    ? "Update Address"
                    : "Add Address"}
              </button>
            </div>
          </form>
        )}
      </main>
    </UserShell>
  );
}
