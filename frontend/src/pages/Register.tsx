import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { FieldError } from "../components/FieldError";

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateDisplayName(v: string): string | null {
  if (!v.trim()) return "validation.required";
  if (v.trim().length < 2) return "validation.displayNameMin";
  return null;
}

function validateEmail(v: string): string | null {
  if (!v.trim()) return "validation.required";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(v)) return "validation.emailInvalid";
  return null;
}

function validatePassword(v: string): string[] {
  const errors: string[] = [];
  if (v.length < 8) errors.push("validation.passwordMin");
  if (!/[A-Z]/.test(v)) errors.push("validation.passwordUppercase");
  if (!/[0-9]/.test(v)) errors.push("validation.passwordNumber");
  return errors;
}

// ─── PasswordStrength bar ─────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const { t } = useTranslation();
  if (!password) return null;
  const rules = [
    { key: "validation.passwordMin", ok: password.length >= 8, label: "8+ characters" },
    { key: "validation.passwordUppercase", ok: /[A-Z]/.test(password), label: "One uppercase" },
    { key: "validation.passwordNumber", ok: /[0-9]/.test(password), label: "One number" },
  ];
  const passed = rules.filter((r) => r.ok).length;
  const color = passed === 3 ? "#22c55e" : passed >= 2 ? "#f59e0b" : "var(--danger)";

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 4, borderRadius: 4, background: "var(--border)", overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: `${(passed / 3) * 100}%`, background: color, transition: "width .3s, background .3s" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {rules.map((r) => (
          <span key={r.key} style={{ fontSize: 11, color: r.ok ? "#22c55e" : "var(--text-secondary)" }}>
            {r.ok ? "✓" : "○"} {t(r.key)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Register page ────────────────────────────────────────────────────────────

export function Register() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { register } = useAuth();
  usePageTitle("auth.register");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [touched, setTouched] = useState({ displayName: false, email: false, password: false });
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const touch = (field: keyof typeof touched) => setTouched((t) => ({ ...t, [field]: true }));

  const dnError = touched.displayName ? t(validateDisplayName(displayName) ?? "") || null : null;
  const emailError = touched.email ? t(validateEmail(email) ?? "") || null : null;
  const pwErrors = touched.password ? validatePassword(password).map((k) => t(k)) : [];
  const isValid =
    !validateDisplayName(displayName) &&
    !validateEmail(email) &&
    validatePassword(password).length === 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ displayName: true, email: true, password: true });
    if (!isValid) return;
    setServerError(null);
    setSubmitting(true);
    try {
      await register(email, password, displayName);
      nav("/");
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === "email_taken") {
        setServerError(t("validation.emailTaken"));
      } else if (code === "password_too_short") {
        setServerError(t("validation.passwordMin"));
      } else if (code === "display_name_too_short") {
        setServerError(t("validation.displayNameMin"));
      } else {
        setServerError(t("auth.invalid"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <h2>{t("auth.register")}</h2>
      <div className="card">
        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">{t("auth.displayName")}</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => touch("displayName")}
              autoComplete="name"
            />
            <FieldError message={dnError} hint={t("validation.displayNameMin")} />
          </div>

          <div className="form-group">
            <label className="form-label">{t("auth.email")}</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => touch("email")}
              autoComplete="email"
            />
            <FieldError message={emailError} />
          </div>

          <div className="form-group">
            <label className="form-label">{t("auth.password")}</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => touch("password")}
              autoComplete="new-password"
            />
            <PasswordStrength password={password} />
          </div>

          {serverError && <div className="alert alert-error">{serverError}</div>}

          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 4 }}
            disabled={submitting}
          >
            {submitting ? "…" : t("auth.register")}
          </button>
        </form>
      </div>
      <div style={{ marginTop: 14, textAlign: "center", fontSize: 14, color: "var(--text-secondary)" }}>
        {t("auth.alreadyRegistered")}{" "}
        <Link to="/login" style={{ fontWeight: 600 }}>
          {t("auth.login")}
        </Link>
      </div>
    </div>
  );
}
