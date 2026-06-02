import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { FieldError } from "../components/FieldError";

export function Login() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  usePageTitle("auth.login");

  const from = (location.state as any)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const touch = (field: keyof typeof touched) => setTouched((t) => ({ ...t, [field]: true }));

  const emailError = touched.email && !email.trim() ? t("validation.required") : null;
  const passwordError = touched.password && !password ? t("validation.required") : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!email.trim() || !password) return;
    setServerError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      nav(from, { replace: true });
    } catch {
      setServerError(t("auth.invalid"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <h2>{t("auth.login")}</h2>
      <div className="card">
        <form onSubmit={onSubmit} noValidate>
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
              autoComplete="current-password"
            />
            <FieldError message={passwordError} />
          </div>

          {serverError && <div className="alert alert-error">{serverError}</div>}

          <button className="btn btn-primary" style={{ width: "100%", marginTop: 4 }} disabled={submitting}>
            {submitting ? "…" : t("auth.login")}
          </button>
        </form>
      </div>
      <div style={{ marginTop: 14, textAlign: "center", fontSize: 14, color: "var(--text-secondary)" }}>
        {t("auth.noAccount")}{" "}
        <Link to="/register" style={{ fontWeight: 600 }}>
          {t("auth.register")}
        </Link>
      </div>
    </div>
  );
}
