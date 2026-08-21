"use client";

import { FormEvent, useState } from "react";

import {
  AdminAttribute,
  createAdminAttribute,
} from "@/lib/api/admin";

type AttributeDefinitionModalProps = {
  accessToken: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (attribute: AdminAttribute) => void;
};

const attributeTypes: Array<AdminAttribute["dataType"]> = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "SELECT",
  "MULTI_SELECT",
];

export function AttributeDefinitionModal({
  accessToken,
  isOpen,
  onClose,
  onCreated,
}: AttributeDefinitionModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [dataType, setDataType] = useState<AdminAttribute["dataType"]>("TEXT");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  function handleNameChange(nextName: string) {
    setName(nextName);

    if (!slug) {
      setSlug(toSlug(nextName));
    }
  }

  function resetForm() {
    setName("");
    setSlug("");
    setDescription("");
    setDataType("TEXT");
    setIsActive(true);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const attribute = await createAdminAttribute(accessToken, {
        name,
        slug,
        description: description || undefined,
        dataType,
        isActive,
      });

      onCreated(attribute);
      resetForm();
      onClose();
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
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="attribute-definition-modal-title"
        aria-modal="true"
        className="modal-panel"
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Attribute Definition</p>
            <h2 id="attribute-definition-modal-title">Create Attribute</h2>
          </div>
          <button
            aria-label="Close attribute popup"
            className="icon-button"
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            x
          </button>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="split-fields">
            <label>
              Name
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
              rows={3}
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
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
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
