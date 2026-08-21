"use client";

import { useState } from "react";

type PasswordFieldProps = {
  label: string;
  name: string;
  autoComplete: string;
  minLength?: number;
};

export function PasswordField({
  label,
  name,
  autoComplete,
  minLength,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label>
      {label}
      <span className="password-field">
        <input
          name={name}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <button
          aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
          className="password-toggle"
          type="button"
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? (
            <svg
              aria-hidden="true"
              fill="none"
              height="20"
              viewBox="0 0 24 24"
              width="20"
            >
              <path
                d="M3 3L21 21"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M10.6 10.6A2 2 0 0 0 13.4 13.4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M9.9 4.24A10.66 10.66 0 0 1 12 4C17 4 20.73 7.61 22 12C21.64 13.24 20.99 14.4 20.12 15.38"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M17.56 17.56A10.55 10.55 0 0 1 12 20C7 20 3.27 16.39 2 12A11.69 11.69 0 0 1 6.44 6.44"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              fill="none"
              height="20"
              viewBox="0 0 24 24"
              width="20"
            >
              <path
                d="M2 12C3.27 7.61 7 4 12 4C17 4 20.73 7.61 22 12C20.73 16.39 17 20 12 20C7 20 3.27 16.39 2 12Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M12 15A3 3 0 1 0 12 9A3 3 0 0 0 12 15Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}
