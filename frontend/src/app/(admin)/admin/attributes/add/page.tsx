"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminAttribute,
  createAdminAttribute,
} from "@/lib/api/admin";

const attributeTypes: Array<AdminAttribute["dataType"]> = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "SELECT",
  "MULTI_SELECT",
];

export default function AddAttributePage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [dataType, setDataType] = useState<AdminAttribute["dataType"]>("TEXT");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleNameChange(nextName: string) {
    setName(nextName);

    if (!slug) {
      setSlug(toSlug(nextName));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await createAdminAttribute(accessToken, {
        name,
        slug,
        description: description || undefined,
        dataType,
        isActive,
      });

      setSuccess("Attribute created successfully");
      setName("");
      setSlug("");
      setDescription("");
      setDataType("TEXT");
      setIsActive(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create attribute",
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
          <h1>Add Attribute</h1>
          <p>Create reusable attribute definitions for categories and products.</p>
        </div>
        <Link className="secondary-link-button" href="/admin/attributes">
          Back to Attributes
        </Link>
      </section>

      <section className="form-surface">
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="split-fields">
            <label>
              Attribute name
              <input
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                required
              />
            </label>
            <label>
              Slug
              <input
                value={slug}
                onChange={(event) => setSlug(toSlug(event.target.value))}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                required
              />
            </label>
          </div>

          <label>
            Data type
            <select
              value={dataType}
              onChange={(event) =>
                setDataType(event.target.value as AdminAttribute["dataType"])
              }
            >
              {attributeTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label>
            Description
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <label className="checkbox-field">
            <input
              checked={isActive}
              type="checkbox"
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active attribute
          </label>

          {success ? <p className="form-success">{success}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Attribute"}
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

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
