import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiCreateEvent } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { LocationPicker } from "../components/LocationPicker";
import { FieldError } from "../components/FieldError";
import { usePageTitle } from "../hooks/usePageTitle";

// ─── Field-level validators ───────────────────────────────────────────────────

function vTitle(v: string): string | null {
  if (!v.trim()) return "validation.required";
  if (v.trim().length < 3) return "validation.titleMin";
  return null;
}
function vDescription(v: string): string | null {
  if (!v.trim()) return "validation.required";
  if (v.trim().length < 10) return "validation.descriptionMin";
  return null;
}
function vMaxPeople(v: number): string | null {
  if (!v || v < 1) return "validation.maxParticipantsMin";
  if (v > 500) return "validation.maxParticipantsMax";
  return null;
}
function vFee(v: string): string | null {
  if (!v.trim()) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return "validation.feeNonNegative";
  return null;
}
function vStartsAt(v: string): string | null {
  if (!v) return "validation.startsAtRequired";
  return null;
}
function vEndsAt(startsAt: string, endsAt: string): string | null {
  if (!endsAt) return "validation.endsAtRequired";
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return "validation.endsAfterStarts";
  return null;
}
function vAddress(v: string): string | null {
  if (!v.trim()) return "validation.addressRequired";
  return null;
}
function vPhrase(v: string): string | null {
  const s = v.trim();
  if (s && s.length < 4) return "validation.verificationPhraseMin";
  return null;
}

// ─── CreateEvent page ─────────────────────────────────────────────────────────

type TouchedFields = {
  title: boolean;
  description: boolean;
  maxPeople: boolean;
  startsAt: boolean;
  endsAt: boolean;
  address: boolean;
  verificationPhrase: boolean;
  feeAmount: boolean;
};

export function CreateEvent() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { user } = useAuth();
  usePageTitle("app.createEvent");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxPeople, setMaxPeople] = useState<number>(10);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [address, setAddress] = useState("");
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLon, setGeoLon] = useState<number | null>(null);
  const [verificationPhrase, setVerificationPhrase] = useState("");
  const [feeAmount, setFeeAmount] = useState("");

  const [touched, setTouched] = useState<TouchedFields>({
    title: false, description: false, maxPeople: false,
    startsAt: false, endsAt: false, address: false, verificationPhrase: false,
    feeAmount: false,
  });
  const touch = (field: keyof TouchedFields) => setTouched((p) => ({ ...p, [field]: true }));
  const touchAll = () =>
    setTouched({ title: true, description: true, maxPeople: true, startsAt: true, endsAt: true, address: true, verificationPhrase: true, feeAmount: true });

  const errors = {
    title: vTitle(title),
    description: vDescription(description),
    maxPeople: vMaxPeople(maxPeople),
    startsAt: vStartsAt(startsAt),
    endsAt: vEndsAt(startsAt, endsAt),
    address: vAddress(address),
    verificationPhrase: vPhrase(verificationPhrase),
    feeAmount: vFee(feeAmount),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    touchAll();
    if (hasErrors) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        maxParticipants: Number(maxPeople),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        address: address.trim(),
        verificationPhrase: verificationPhrase.trim() || undefined,
        feeAmount: feeAmount.trim() ? Number(feeAmount) : undefined,
        latitude: geoLat ?? undefined,
        longitude: geoLon ?? undefined,
      };
      const out = await apiCreateEvent(payload);
      nav(`/events/${out.id}`);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === "outside_kansai") {
        setServerError(t("create.outsideKansai"));
      } else if (code === "ends_must_be_after_starts") {
        setServerError(t("create.endsMustBeAfterStarts"));
      } else if (code === "verification_phrase_too_short") {
        setServerError(t("create.verificationPhraseTooShort"));
      } else if (code === "invalid_fee") {
        setServerError(t("validation.feeNonNegative"));
      } else {
        setServerError(t("errors.server"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <div className="page-header">
        <h2 className="page-title">✏️ {t("app.createEvent")}</h2>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-label">{t("create.eventDetails")}</div>

          <div className="form-group">
            <label className="form-label">{t("create.title")} *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => touch("title")}
              placeholder={t("create.placeholderTitle")}
            />
            <FieldError
              message={touched.title ? (errors.title ? t(errors.title) : null) : null}
              hint={t("validation.titleMin")}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t("create.description")} *</label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => touch("description")}
              rows={4}
              placeholder={t("create.placeholderDesc")}
            />
            <FieldError
              message={touched.description ? (errors.description ? t(errors.description) : null) : null}
              hint={t("validation.descriptionMin")}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t("create.maxPeople")} *</label>
              <input
                className="input"
                type="number"
                value={maxPeople}
                onChange={(e) => setMaxPeople(Number(e.target.value))}
                onBlur={() => touch("maxPeople")}
                min={1}
                max={500}
              />
              <FieldError
                message={touched.maxPeople ? (errors.maxPeople ? t(errors.maxPeople) : null) : null}
                hint="1 – 500"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t("create.startsAt")} *</label>
              <input
                className="input"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                onBlur={() => touch("startsAt")}
              />
              <FieldError message={touched.startsAt ? (errors.startsAt ? t(errors.startsAt) : null) : null} />
            </div>

            <div className="form-group">
              <label className="form-label">{t("create.endsAt")} *</label>
              <input
                className="input"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                onBlur={() => touch("endsAt")}
              />
              <FieldError message={touched.endsAt ? (errors.endsAt ? t(errors.endsAt) : null) : null} />
            </div>
            <div className="form-group">
              <label className="form-label">{t("create.feeAmount")}</label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                onBlur={() => touch("feeAmount")}
                placeholder="e.g. 500"
              />
              <FieldError
                message={touched.feeAmount ? (errors.feeAmount ? t(errors.feeAmount) : null) : null}
                hint={t("create.feeHint")}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-label">{t("create.locationSection")}</div>
          <LocationPicker
            address={address}
            onAddressChange={(v) => { setAddress(v); touch("address"); }}
            lat={geoLat}
            lon={geoLon}
            onLatLonChange={(lat, lon) => { setGeoLat(lat); setGeoLon(lon); }}
            hint={t("create.addressHint")}
          />
          <FieldError message={touched.address ? (errors.address ? t(errors.address) : null) : null} />
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-label">{t("create.verificationSection")}</div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t("create.verificationPhrase")}</label>
            <input
              className="input"
              value={verificationPhrase}
              onChange={(e) => setVerificationPhrase(e.target.value)}
              onBlur={() => touch("verificationPhrase")}
              placeholder="e.g. SakuraPink2025"
            />
            <FieldError
              message={touched.verificationPhrase ? (errors.verificationPhrase ? t(errors.verificationPhrase) : null) : null}
              hint={t("create.verificationHint")}
            />
          </div>
        </div>

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <button
          className="btn btn-primary"
          style={{ width: "100%", padding: "12px", fontSize: 15, marginBottom: 24 }}
          disabled={submitting}
        >
          {submitting ? t("create.creating") : `🎉 ${t("create.create")}`}
        </button>
      </form>
    </div>
  );
}
