import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  apiGetEvent,
  apiJoinEvent,
  apiLeaveEvent,
  apiCancelEvent,
  apiDeleteEvent,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { FieldError } from "../components/FieldError";

type EventDetailData = {
  id: number;
  title: string;
  description: string;
  maxParticipants: number;
  startsAt: string;
  endsAt: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  participantCount: number;
  isJoined: boolean;
  isCreator: boolean;
  creatorName: string;
  hasVerificationPhrase: boolean;
  verificationPhrase: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
};

export function EventDetail() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  usePageTitle("nav.events");

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setEvent(await apiGetEvent(id) as EventDetailData);
    } catch {
      setError(t("errors.server"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function onJoin() {
    if (!id) return;
    setWorking(true);
    try {
      await apiJoinEvent(id);
      await load();
    } catch {
      setError(t("event.full"));
    } finally {
      setWorking(false);
    }
  }

  async function onLeave() {
    if (!id) return;
    setWorking(true);
    try {
      await apiLeaveEvent(id);
      await load();
    } finally {
      setWorking(false);
    }
  }

  async function onDelete() {
    if (!id || !confirm(t("event.deleteConfirm"))) return;
    setWorking(true);
    try {
      await apiDeleteEvent(id);
      nav("/");
    } catch {
      setError(t("errors.server"));
      setWorking(false);
    }
  }

  async function onCancelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cancelReason.trim().length < 3) {
      setCancelReasonError(t("event.cancelReasonMin"));
      return;
    }
    setCancelReasonError(null);
    setCancelling(true);
    try {
      await apiCancelEvent(id!, cancelReason.trim());
      setShowCancelModal(false);
      setCancelReason("");
      await load();
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === "already_cancelled") {
        setCancelReasonError(t("event.alreadyCancelled"));
      } else {
        setCancelReasonError(t("errors.server"));
      }
    } finally {
      setCancelling(false);
    }
  }

  async function copyText(text: string, setFlag: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy:", text);
    }
    setFlag(true);
    setTimeout(() => setFlag(false), 2000);
  }

  function openGoogleMaps() {
    if (!event) return;
    const q =
      event.latitude != null && event.longitude != null
        ? `${event.latitude},${event.longitude}`
        : event.address;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (loading) {
    return (
      <div style={{ paddingTop: 40, textAlign: "center", color: "var(--text-secondary)" }}>
        {t("common.loading")}
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ paddingTop: 40, maxWidth: 480, margin: "0 auto" }}>
        <div className="alert alert-error">{error || t("event.notFound")}</div>
        <button className="btn btn-secondary" onClick={() => nav("/")}>{t("event.back")}</button>
      </div>
    );
  }

  const isCancelled = !!event.cancelledAt;
  const spotsLeft = Math.max(0, event.maxParticipants - event.participantCount);
  const pct = Math.round((event.participantCount / event.maxParticipants) * 100);
  const isFull = spotsLeft === 0;
  const fillColor = isFull ? "var(--danger)" : pct >= 75 ? "#f59e0b" : "var(--success)";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 40 }}>
      {/* header */}
      <div style={{ margin: "16px 0 4px" }}>
        <button className="btn btn-ghost" style={{ padding: "4px 0", marginBottom: 8 }} onClick={() => nav("/")}>
          {t("event.back")}
        </button>
        <h1 style={{ margin: "0 0 6px", fontSize: 24 }}>{event.title}</h1>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 14, color: "var(--text-secondary)" }}>
          <span>📅 {new Date(event.startsAt).toLocaleString()} — {new Date(event.endsAt).toLocaleString()}</span>
          <span>👤 {event.creatorName}</span>
        </div>
      </div>

      {/* Cancelled banner */}
      {isCancelled && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1.5px solid #fca5a5",
            borderRadius: 10,
            color: "#991b1b",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            🚫 {t("event.cancelledBanner")}
          </div>
          {event.cancellationReason && (
            <div style={{ fontSize: 14 }}>
              {t("event.cancelledReason", { reason: event.cancellationReason })}
            </div>
          )}
        </div>
      )}

      {/* action bar */}
      <div className="card" style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {event.isCreator ? (
          <>
            <span className="badge badge-green">{t("event.youreTheHost")}</span>
            {!isCancelled && (
              <>
                <button
                  className="btn btn-secondary"
                  style={{ borderColor: "#f59e0b", color: "#92400e" }}
                  disabled={working}
                  onClick={() => setShowCancelModal(true)}
                >
                  {t("event.cancelEvent")}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                  disabled={working}
                  onClick={onDelete}
                >
                  {t("event.deleteEvent")}
                </button>
              </>
            )}
          </>
        ) : event.isJoined ? (
          <button
            className="btn btn-secondary"
            disabled={working || isCancelled}
            onClick={onLeave}
          >
            {working ? "…" : `✗ ${t("event.leave")}`}
          </button>
        ) : !isCancelled ? (
          <button
            className="btn btn-primary"
            disabled={working || isFull}
            onClick={onJoin}
          >
            {working ? "…" : isFull ? t("event.full") : `✓ ${t("event.join")}`}
          </button>
        ) : null}

        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
            <span>{t("event.joinedCount", { count: event.participantCount })}</span>
            <span>{isFull ? t("common.full") : t("event.spotsLeft", { count: spotsLeft })} / {event.maxParticipants}</span>
          </div>
          <div className="capacity-bar">
            <div className="capacity-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: fillColor }} />
          </div>
        </div>

        {event.hasVerificationPhrase && !event.isJoined && !event.isCreator && (
          <span className="badge badge-gray">🔑 {t("home.verificationAtEvent")}</span>
        )}
      </div>

      {/* description */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="section-label">{t("event.about")}</div>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 15 }}>
          {event.description}
        </div>
      </div>

      {/* address */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="section-label">{t("event.location")}</div>
        <div style={{ fontSize: 15, marginBottom: 12 }}>📍 {event.address}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => copyText(event.address, setCopied)}>
            {copied ? t("event.copied") : t("event.copyAddress")}
          </button>
          <button className="btn btn-secondary" onClick={openGoogleMaps}>
            🗺 {t("event.openMaps")}
          </button>
        </div>
      </div>

      {/* verification phrase – only for joined / creator */}
      {event.verificationPhrase && (
        <div className="card" style={{ marginTop: 12, border: "1.5px solid #fde68a", background: "#fffbeb" }}>
          <div className="section-label" style={{ color: "#92400e" }}>🔑 {t("event.verificationPhrase")}</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>
            {event.verificationPhrase}
          </div>
          <button className="btn btn-secondary" onClick={() => copyText(event.verificationPhrase!, setCopiedPhrase)}>
            {copiedPhrase ? t("event.copied") : t("event.copyPhrase")}
          </button>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#92400e" }}>
            {t("event.phraseHint")}
          </p>
        </div>
      )}

      {/* Cancel modal */}
      {showCancelModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="card"
            style={{ width: 420, maxWidth: "92vw", padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 8, fontSize: 18 }}>🚫 {t("event.cancelModalTitle")}</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
              {t("event.cancelReasonHint")}
            </p>
            <form onSubmit={onCancelSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label">{t("event.cancelReasonLabel")}</label>
                <textarea
                  className="input"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => { setCancelReason(e.target.value); setCancelReasonError(null); }}
                  placeholder={t("event.cancelReasonPlaceholder")}
                  style={{ resize: "vertical" }}
                  autoFocus
                />
                <FieldError message={cancelReasonError} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: "#dc2626" }}
                  disabled={cancelling}
                >
                  {cancelling ? "…" : t("event.cancelConfirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
