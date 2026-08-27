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

const pageSize = 8;
const zoneCodePattern = /^[A-Z0-9_-]{2,20}$/;

export default function AdminShippingZonesPage() {
  const { accessToken } = useAuth();
  const [zones, setZones] = useState<adminApi.AdminShippingZone[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editingZoneId, setEditingZoneId] = useState("");
  const [editName, setEditName] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const debouncedCode = useDebouncedValue(code, 350);

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

        if (isMounted) {
          setZones(nextZones);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load shipping zones",
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

  const normalizedCode = code.trim().toUpperCase();
  const debouncedNormalizedCode = debouncedCode.trim().toUpperCase();
  const codeIsValid = zoneCodePattern.test(normalizedCode);
  const codeStatus = useMemo(() => {
    if (
      !debouncedNormalizedCode ||
      debouncedNormalizedCode !== normalizedCode ||
      !zoneCodePattern.test(debouncedNormalizedCode)
    ) {
      return null;
    }

    return zones.some((zone) => zone.code === debouncedNormalizedCode)
      ? "unavailable"
      : "available";
  }, [debouncedNormalizedCode, normalizedCode, zones]);

  const activeZones = useMemo(
    () => zones.filter((zone) => zone.isActive),
    [zones],
  );
  const totalPages = Math.max(1, Math.ceil(zones.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleZones = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return zones.slice(startIndex, startIndex + pageSize);
  }, [currentPage, zones]);
  const canCreate =
    Boolean(name.trim()) &&
    codeIsValid &&
    codeStatus === "available" &&
    !isSubmitting;

  const mergeZone = useCallback((updatedZone: adminApi.AdminShippingZone) => {
    setZones((currentZones) =>
      currentZones.map((zone) =>
        zone.id === updatedZone.id
          ? {
              ...zone,
              ...updatedZone,
              countries: updatedZone.countries ?? zone.countries,
              rates: updatedZone.rates ?? zone.rates,
            }
          : zone,
      ),
    );
  }, []);

  const handleCreateZone = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !canCreate) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const createdZone = await adminApi.createAdminShippingZone(accessToken, {
          name: name.trim(),
          code: normalizedCode,
          isActive: true,
        });
        setZones((currentZones) => [
          {
            ...createdZone,
            countries: createdZone.countries ?? [],
            rates: createdZone.rates ?? [],
          },
          ...currentZones,
        ]);
        setName("");
        setCode("");
        setPage(1);
        setSuccess("Shipping zone created.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to create shipping zone",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, canCreate, name, normalizedCode],
  );

  const toggleZone = useCallback(
    async (zone: adminApi.AdminShippingZone) => {
      if (!accessToken) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const updatedZone = await adminApi.updateAdminShippingZone(
          accessToken,
          zone.id,
          {
            isActive: !zone.isActive,
          },
        );
        mergeZone(updatedZone);
        setSuccess("Shipping zone updated.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update shipping zone",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, mergeZone],
  );

  const startEditingZone = useCallback((zone: adminApi.AdminShippingZone) => {
    setEditingZoneId(zone.id);
    setEditName(zone.name);
    setError(null);
    setSuccess(null);
  }, []);

  const cancelEditingZone = useCallback(() => {
    setEditingZoneId("");
    setEditName("");
  }, []);

  const saveZone = useCallback(
    async (zone: adminApi.AdminShippingZone) => {
      if (!accessToken || !editName.trim()) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const updatedZone = await adminApi.updateAdminShippingZone(
          accessToken,
          zone.id,
          {
            name: editName.trim(),
          },
        );
        mergeZone(updatedZone);
        cancelEditingZone();
        setSuccess("Shipping zone updated.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update shipping zone",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, cancelEditingZone, editName, mergeZone],
  );

  const deleteZone = useCallback(
    async (zone: adminApi.AdminShippingZone) => {
      if (!accessToken) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        await adminApi.deleteAdminShippingZone(accessToken, zone.id);
        setZones((currentZones) =>
          currentZones.filter((currentZone) => currentZone.id !== zone.id),
        );
        setSuccess("Shipping zone deleted.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to delete shipping zone",
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
          <h1>Zones</h1>
          <p>Create and activate the regions used for shipping rules.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="shipping-workspace">
        <form className="catalog-section admin-form" onSubmit={handleCreateZone}>
          <div className="section-title">
            <h2>Add Zone</h2>
            <span>{activeZones.length} active</span>
          </div>
          <label>
            Zone name
            <input
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSuccess(null);
              }}
            />
          </label>
          <label>
            Code
            <input
              maxLength={20}
              required
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setSuccess(null);
              }}
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
                  ? "Use 2-20 letters, numbers, underscores, or hyphens."
                  : codeStatus === "available"
                    ? "Zone code is available."
                    : codeStatus === "unavailable"
                      ? "Zone code already exists."
                      : "Checking zone code..."}
              </small>
            ) : null}
          </label>
          <button className="primary-button" disabled={!canCreate} type="submit">
            {isSubmitting ? "Saving..." : "Add Zone"}
          </button>
        </form>

        <section className="catalog-section">
          <div className="section-title">
            <h2>Existing Zones</h2>
            <span>{zones.length}</span>
          </div>
          {isLoading ? (
            <p className="muted-text">Loading zones...</p>
          ) : (
            <>
              <div className="admin-data-list">
                {visibleZones.map((zone) => (
                  <ZoneRow
                    disabled={isSubmitting}
                    editName={editName}
                    editing={editingZoneId === zone.id}
                    key={zone.id}
                    zone={zone}
                    onCancelEdit={cancelEditingZone}
                    onDelete={deleteZone}
                    onEditNameChange={setEditName}
                    onSave={saveZone}
                    onStartEdit={startEditingZone}
                    onToggle={toggleZone}
                  />
                ))}
              </div>
              {zones.length === 0 ? (
                <p className="muted-text">No shipping zones configured yet.</p>
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

type ZoneRowProps = {
  disabled: boolean;
  editing: boolean;
  editName: string;
  zone: adminApi.AdminShippingZone;
  onCancelEdit: () => void;
  onDelete: (zone: adminApi.AdminShippingZone) => void;
  onEditNameChange: (value: string) => void;
  onSave: (zone: adminApi.AdminShippingZone) => void;
  onStartEdit: (zone: adminApi.AdminShippingZone) => void;
  onToggle: (zone: adminApi.AdminShippingZone) => void;
};

const ZoneRow = memo(function ZoneRow({
  disabled,
  editing,
  editName,
  zone,
  onCancelEdit,
  onDelete,
  onEditNameChange,
  onSave,
  onStartEdit,
  onToggle,
}: ZoneRowProps) {
  return (
    <article className="shipping-row">
      <div>
        {editing ? (
          <label>
            Zone name
            <input
              required
              value={editName}
              onChange={(event) => onEditNameChange(event.target.value)}
            />
          </label>
        ) : (
          <>
            <h3>{zone.name}</h3>
            <p>
              {zone.code} | {zone.countries.length} countries |{" "}
              {zone.rates.length} rates
            </p>
          </>
        )}
      </div>
      <StatusSwitch
        checked={zone.isActive}
        disabled={disabled}
        label={`${zone.isActive ? "Disable" : "Enable"} ${zone.name}`}
        onChange={() => onToggle(zone)}
      />
      <div className="row-actions">
        {editing ? (
          <>
            <button
              className="primary-button compact-button"
              disabled={disabled || !editName.trim()}
              type="button"
              onClick={() => onSave(zone)}
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
              onClick={() => onStartEdit(zone)}
            >
              Edit
            </button>
            <button
              className="danger-button compact-button"
              disabled={disabled}
              type="button"
              onClick={() => onDelete(zone)}
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
