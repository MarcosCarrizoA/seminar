import React from "react";

/**
 * Shows a red validation message below a field when `message` is truthy.
 * Optionally shows a hint when the field is not yet touched / has no error.
 */
export function FieldError({ message, hint }: { message?: string | null; hint?: string }) {
  if (message) {
    return (
      <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 4, marginBottom: 0 }}>
        ⚠ {message}
      </p>
    );
  }
  if (hint) {
    return (
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, marginBottom: 0 }}>
        {hint}
      </p>
    );
  }
  return null;
}
