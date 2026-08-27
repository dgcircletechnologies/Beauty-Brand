"use client";

import {
  FormEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const countryCodePattern = /^[A-Z]{2}$/;
const pageSize = 10;

export default function AdminShippingCountriesPage() {
  const { accessToken } = useAuth();
  const [zones, setZones] = useState<adminApi.AdminShippingZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [countryName, setCountryName] = useState("");
  const [editingCountryId, setEditingCountryId] = useState("");
  const [editCountryName, setEditCountryName] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const debouncedCountryCode = useDebouncedValue(countryCode, 350);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadZones() {
      setError(null);
      setIsLoading(true);

      try {
        const nextZones = await adminApi.getAdminShippingZones(token);

        if (!isMounted) {
          return;
        }

        setZones(nextZones);
        setSelectedZoneId((currentId) => currentId || nextZones[0]?.id || "");
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load shipping countries",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadZones();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [selectedZoneId, zones],
  );
  const allCountries = useMemo(
    () => zones.flatMap((zone) => zone.countries),
    [zones],
  );
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  const debouncedNormalizedCountryCode = debouncedCountryCode
    .trim()
    .toUpperCase();
  const countryCodeIsValid = countryCodePattern.test(normalizedCountryCode);
  const countryCodeStatus = useMemo(() => {
    if (
      !debouncedNormalizedCountryCode ||
      debouncedNormalizedCountryCode !== normalizedCountryCode ||
      !countryCodePattern.test(debouncedNormalizedCountryCode)
    ) {
      return null;
    }

    return allCountries.some(
      (country) => country.countryCode === debouncedNormalizedCountryCode,
    )
      ? "unavailable"
      : "available";
  }, [allCountries, debouncedNormalizedCountryCode, normalizedCountryCode]);

  const selectedCountries = useMemo(
    () => selectedZone?.countries ?? [],
    [selectedZone],
  );
  const totalPages = Math.max(1, Math.ceil(selectedCountries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleCountries = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return selectedCountries.slice(startIndex, startIndex + pageSize);
  }, [currentPage, selectedCountries]);
  const canCreate =
    Boolean(selectedZoneId) &&
    Boolean(countryName.trim()) &&
    countryCodeIsValid &&
    countryCodeStatus === "available" &&
    !isSubmitting;

  const updateCountryInZones = useCallback(
    (updatedCountry: adminApi.AdminZoneCountry) => {
      setZones((currentZones) =>
        currentZones.map((zone) =>
          zone.id === updatedCountry.zoneId
            ? {
                ...zone,
                countries: zone.countries
                  .map((country) =>
                    country.id === updatedCountry.id ? updatedCountry : country,
                  )
                  .sort(sortCountries),
              }
            : zone,
        ),
      );
    },
    [],
  );

  const handleCreateCountry = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !canCreate) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const createdCountry = await adminApi.addAdminZoneCountry(
          accessToken,
          selectedZoneId,
          {
            countryCode: normalizedCountryCode,
            countryName: countryName.trim(),
            isActive: true,
          },
        );
        setZones((currentZones) =>
          currentZones.map((zone) =>
            zone.id === selectedZoneId
              ? {
                  ...zone,
                  countries: [...zone.countries, createdCountry].sort(
                    sortCountries,
                  ),
                }
              : zone,
          ),
        );
        setCountryCode("");
        setCountryName("");
        setPage(1);
        setSuccess("Country added to zone.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to add country",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      accessToken,
      canCreate,
      countryName,
      normalizedCountryCode,
      selectedZoneId,
    ],
  );

  const toggleCountry = useCallback(
    async (country: adminApi.AdminZoneCountry) => {
      if (!accessToken) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const updatedCountry = await adminApi.updateAdminZoneCountry(
          accessToken,
          country.id,
          {
            isActive: !country.isActive,
          },
        );
        updateCountryInZones(updatedCountry);
        setSuccess("Country updated.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update country",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, updateCountryInZones],
  );

  const startEditingCountry = useCallback(
    (country: adminApi.AdminZoneCountry) => {
      setEditingCountryId(country.id);
      setEditCountryName(country.countryName);
      setError(null);
      setSuccess(null);
    },
    [],
  );

  const cancelEditingCountry = useCallback(() => {
    setEditingCountryId("");
    setEditCountryName("");
  }, []);

  const saveCountry = useCallback(
    async (country: adminApi.AdminZoneCountry) => {
      if (!accessToken || !editCountryName.trim()) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const updatedCountry = await adminApi.updateAdminZoneCountry(
          accessToken,
          country.id,
          {
            countryName: editCountryName.trim(),
          },
        );
        updateCountryInZones(updatedCountry);
        cancelEditingCountry();
        setSuccess("Country updated.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update country",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, cancelEditingCountry, editCountryName, updateCountryInZones],
  );

  const deleteCountry = useCallback(
    async (country: adminApi.AdminZoneCountry) => {
      if (!accessToken) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        await adminApi.deleteAdminZoneCountry(accessToken, country.id);
        setZones((currentZones) =>
          currentZones.map((zone) =>
            zone.id === country.zoneId
              ? {
                  ...zone,
                  countries: zone.countries.filter(
                    (currentCountry) => currentCountry.id !== country.id,
                  ),
                }
              : zone,
          ),
        );
        setSuccess("Country removed from zone.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to remove country",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken],
  );

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Shipping</p>
          <h1>Countries</h1>
          <p>Assign countries to the zones used during checkout.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="shipping-workspace">
        <form
          className="catalog-section admin-form"
          onSubmit={handleCreateCountry}
        >
          <div className="section-title">
            <h2>Add Country</h2>
            <span>{allCountries.length} assigned</span>
          </div>
          <label>
            Zone
            <select
              required
              value={selectedZoneId}
              onChange={(event) => {
                setSelectedZoneId(event.target.value);
                setPage(1);
                setSuccess(null);
              }}
            >
              <option value="">Select zone</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>
          <div className="split-fields">
            <label>
              Country code
              <input
                maxLength={2}
                required
                value={countryCode}
                onChange={(event) => {
                  setCountryCode(event.target.value.toUpperCase());
                  setSuccess(null);
                }}
              />
              {normalizedCountryCode ? (
                <small
                  className={
                    countryCodeStatus === "available"
                      ? "field-status available"
                      : "field-status unavailable"
                  }
                >
                  {!countryCodeIsValid
                    ? "Use a 2-letter country code."
                    : countryCodeStatus === "available"
                      ? "Country code is available."
                      : countryCodeStatus === "unavailable"
                        ? "Country is already assigned to a zone."
                        : "Checking country code..."}
                </small>
              ) : null}
            </label>
            <label>
              Country name
              <input
                required
                value={countryName}
                onChange={(event) => {
                  setCountryName(event.target.value);
                  setSuccess(null);
                }}
              />
            </label>
          </div>
          <button className="primary-button" disabled={!canCreate} type="submit">
            {isSubmitting ? "Saving..." : "Add Country"}
          </button>
        </form>

        <section className="catalog-section">
          <div className="section-title">
            <h2>{selectedZone?.name ?? "Countries"}</h2>
            <span>{selectedCountries.length}</span>
          </div>
          {isLoading ? (
            <p className="muted-text">Loading countries...</p>
          ) : (
            <>
              <div className="admin-data-list">
                {visibleCountries.map((country) => (
                  <CountryRow
                    country={country}
                    disabled={isSubmitting}
                    editCountryName={editCountryName}
                    editing={editingCountryId === country.id}
                    key={country.id}
                    onCancelEdit={cancelEditingCountry}
                    onDelete={deleteCountry}
                    onEditNameChange={setEditCountryName}
                    onSave={saveCountry}
                    onStartEdit={startEditingCountry}
                    onToggle={toggleCountry}
                  />
                ))}
              </div>
              {selectedCountries.length === 0 ? (
                <p className="muted-text">No countries in this zone yet.</p>
              ) : null}
              <PaginationControls
                currentPage={currentPage}
                disabled={isSubmitting}
                totalPages={totalPages}
                onNext={() => setPage((current) => current + 1)}
                onPrevious={() =>
                  setPage((current) => Math.max(current - 1, 1))
                }
              />
            </>
          )}
        </section>
      </section>
    </main>
  );
}

type CountryRowProps = {
  country: adminApi.AdminZoneCountry;
  disabled: boolean;
  editing: boolean;
  editCountryName: string;
  onCancelEdit: () => void;
  onDelete: (country: adminApi.AdminZoneCountry) => void;
  onEditNameChange: (value: string) => void;
  onSave: (country: adminApi.AdminZoneCountry) => void;
  onStartEdit: (country: adminApi.AdminZoneCountry) => void;
  onToggle: (country: adminApi.AdminZoneCountry) => void;
};

const CountryRow = memo(function CountryRow({
  country,
  disabled,
  editing,
  editCountryName,
  onCancelEdit,
  onDelete,
  onEditNameChange,
  onSave,
  onStartEdit,
  onToggle,
}: CountryRowProps) {
  return (
    <article className="shipping-row">
      <div>
        {editing ? (
          <label>
            Country name
            <input
              required
              value={editCountryName}
              onChange={(event) => onEditNameChange(event.target.value)}
            />
          </label>
        ) : (
          <>
            <h3>{country.countryName}</h3>
            <p>{country.countryCode}</p>
          </>
        )}
      </div>
      <StatusSwitch
        checked={country.isActive}
        disabled={disabled}
        label={`${country.isActive ? "Disable" : "Enable"} ${
          country.countryName
        }`}
        onChange={() => onToggle(country)}
      />
      <div className="row-actions">
        {editing ? (
          <>
            <button
              className="primary-button compact-button"
              disabled={disabled || !editCountryName.trim()}
              type="button"
              onClick={() => onSave(country)}
            >
              Save
            </button>
            <button
              className="secondary-button compact-button"
              disabled={disabled}
              type="button"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="secondary-button compact-button"
              disabled={disabled}
              type="button"
              onClick={() => onStartEdit(country)}
            >
              Edit
            </button>
            <button
              className="danger-button compact-button"
              disabled={disabled}
              type="button"
              onClick={() => onDelete(country)}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
});

type StatusSwitchProps = {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: () => void;
};

const StatusSwitch = memo(function StatusSwitch({
  checked,
  disabled,
  label,
  onChange,
}: StatusSwitchProps) {
  return (
    <label className="status-switch" aria-label={label} title={label}>
      <input
        checked={checked}
        disabled={disabled}
        type="checkbox"
        onChange={onChange}
      />
      <span />
    </label>
  );
});

type PaginationControlsProps = {
  currentPage: number;
  disabled: boolean;
  totalPages: number;
  onNext: () => void;
  onPrevious: () => void;
};

const PaginationControls = memo(function PaginationControls({
  currentPage,
  disabled,
  totalPages,
  onNext,
  onPrevious,
}: PaginationControlsProps) {
  return (
    <div className="pagination-actions">
      <button
        className="secondary-button compact-button"
        disabled={disabled || currentPage <= 1}
        type="button"
        onClick={onPrevious}
      >
        Previous
      </button>
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <button
        className="secondary-button compact-button"
        disabled={disabled || currentPage >= totalPages}
        type="button"
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
});

function sortCountries(
  first: adminApi.AdminZoneCountry,
  second: adminApi.AdminZoneCountry,
) {
  return first.countryName.localeCompare(second.countryName);
}
