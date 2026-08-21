"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminAttribute,
  createAdminAttributeOption,
  getAdminAttributes,
} from "@/lib/api/admin";

export default function AddAttributeOptionPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [attributeId, setAttributeId] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadAttributes() {
      setError(null);
      setIsLoading(true);

      try {
        const nextAttributes = await getAdminAttributes(token);

        if (isMounted) {
          setAttributes(nextAttributes);
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load attributes",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAttributes();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const optionAttributes = useMemo(() => {
    return attributes.filter(
      (attribute) =>
        attribute.isActive &&
        (attribute.dataType === "SELECT" ||
          attribute.dataType === "MULTI_SELECT"),
    );
  }, [attributes]);

  function handleLabelChange(nextLabel: string) {
    setLabel(nextLabel);

    if (!value) {
      setValue(toOptionValue(nextLabel));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !attributeId) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await createAdminAttributeOption(accessToken, attributeId, {
        label,
        value,
        sortOrder,
        isActive,
      });

      setSuccess("Attribute option created successfully");
      setLabel("");
      setValue("");
      setSortOrder(0);
      setIsActive(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create attribute option",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Add Attribute Option</h1>
          <p>Add selectable values for select and multi-select attributes.</p>
        </div>
        <Link className="secondary-link-button" href="/admin/attributes">
          Back to Attributes
        </Link>
      </section>

      <section className="form-surface">
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            Attribute definition
            <select
              disabled={isLoading}
              value={attributeId}
              onChange={(event) => setAttributeId(event.target.value)}
              required
            >
              <option value="">Select attribute</option>
              {optionAttributes.map((attribute) => (
                <option key={attribute.id} value={attribute.id}>
                  {attribute.name} ({attribute.dataType.replace("_", " ")})
                </option>
              ))}
            </select>
          </label>

          <div className="split-fields">
            <label>
              Option label
              <input
                value={label}
                onChange={(event) => handleLabelChange(event.target.value)}
                required
              />
            </label>
            <label>
              Option value
              <input
                value={value}
                onChange={(event) => setValue(toOptionValue(event.target.value))}
                required
              />
            </label>
          </div>

          <label>
            Sort order
            <input
              min={0}
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
            />
          </label>

          <label className="checkbox-field">
            <input
              checked={isActive}
              type="checkbox"
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active option
          </label>

          {optionAttributes.length === 0 && !isLoading ? (
            <p className="form-error">
              Create a SELECT or MULTI_SELECT attribute before adding options.
            </p>
          ) : null}
          {success ? <p className="form-success">{success}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting || optionAttributes.length === 0}
            >
              {isSubmitting ? "Creating..." : "Create Attribute Option"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => router.push("/admin/attributes")}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function toOptionValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
