import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  apiGetEvent,
  apiJoinEvent,
  apiLeaveEvent,
  apiDeleteEvent,
  apiUpdateEvent,
  apiKickParticipant,
  apiGetAnnouncements,
  apiPostAnnouncement,
  apiDeleteAnnouncement,
  type Announcement,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { FieldError } from "../components/FieldError";
import { LocationPicker } from "../components/LocationPicker";

type DetailTab = "info" | "participants" | "announcements";

type Participant = { id: number; display_name: string };

type EventDetailData = {
  id: number;
  title: string;
  description: string;
  maxParticipants: number;
  feeAmount: number | null;
  startsAt: string;
  endsAt: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  participantCount: number;
  isJoined: boolean;
  isCreator: boolean;
  creatorId: number;
  creatorName: string;
  hasVerificationPhrase: boolean;
  verificationPhrase: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  participants: Participant[];
};

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

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

  // Detail tabs
  const [detailTab, setDetailTab] = useState<DetailTab>("info");

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMaxPeople, setEditMaxPeople] = useState(10);
  const [editFeeAmount, setEditFeeAmount] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLon, setEditLon] = useState<number | null>(null);
  const [editPhrase, setEditPhrase] = useState("");

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [annText, setAnnText] = useState("");
  const [annError, setAnnError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const annEndRef = useRef<HTMLDivElement>(null);

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

  async function loadAnnouncements() {
    if (!id) return;
    setAnnLoading(true);
    try {
      setAnnouncements(await apiGetAnnouncements(id));
    } finally {
      setAnnLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (detailTab === "announcements") {
      loadAnnouncements();
    }
  }, [detailTab, id]);

  // Scroll to bottom of announcements when they load
  useEffect(() => {
    annEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [announcements]);

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

  async function onDeleteConfirm() {
    if (!id) return;
    setDeleting(true);
    try {
      await apiDeleteEvent(id);
      nav("/");
    } catch {
      setError(t("errors.server"));
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  function openEditModal() {
    if (!event) return;
    setEditTitle(event.title);
    setEditDescription(event.description);
    setEditMaxPeople(event.maxParticipants);
    setEditFeeAmount(event.feeAmount != null ? String(event.feeAmount) : "");
    setEditStartsAt(toDatetimeLocalValue(event.startsAt));
    setEditEndsAt(toDatetimeLocalValue(event.endsAt));
    setEditAddress(event.address);
    setEditLat(event.latitude ?? null);
    setEditLon(event.longitude ?? null);
    setEditPhrase(event.verificationPhrase ?? "");
    setEditError(null);
    setShowEditModal(true);
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    if (!editTitle.trim() || editTitle.trim().length < 3) {
      setEditError(t("validation.titleMin"));
      return;
    }
    if (!editDescription.trim() || editDescription.trim().length < 10) {
      setEditError(t("validation.descriptionMin"));
      return;
    }
    if (!editAddress.trim()) {
      setEditError(t("validation.addressRequired"));
      return;
    }
    if (!editStartsAt) {
      setEditError(t("validation.startsAtRequired"));
      return;
    }
    if (!editEndsAt) {
      setEditError(t("validation.endsAtRequired"));
      return;
    }
    if (new Date(editEndsAt) <= new Date(editStartsAt)) {
      setEditError(t("validation.endsAfterStarts"));
      return;
    }
    if (editPhrase.trim() && editPhrase.trim().length < 4) {
      setEditError(t("validation.verificationPhraseMin"));
      return;
    }
    if (editMaxPeople < 1) {
      setEditError(t("validation.maxParticipantsMin"));
      return;
    }
    if (editMaxPeople > 500) {
      setEditError(t("validation.maxParticipantsMax"));
      return;
    }
    if (editFeeAmount.trim()) {
      const fee = Number(editFeeAmount);
      if (!Number.isFinite(fee) || fee < 0) {
        setEditError(t("validation.feeNonNegative"));
        return;
      }
    }

    setSavingEdit(true);
    setEditError(null);
    try {
      await apiUpdateEvent(id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        maxParticipants: Number(editMaxPeople),
        feeAmount: editFeeAmount.trim() ? Number(editFeeAmount) : undefined,
        startsAt: new Date(editStartsAt).toISOString(),
        endsAt: new Date(editEndsAt).toISOString(),
        address: editAddress.trim(),
        verificationPhrase: editPhrase.trim() || undefined,
        latitude: editLat ?? undefined,
        longitude: editLon ?? undefined,
      });
      setShowEditModal(false);
      await load();
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === "outside_kansai") setEditError(t("create.outsideKansai"));
      else if (code === "ends_must_be_after_starts") setEditError(t("create.endsMustBeAfterStarts"));
      else if (code === "verification_phrase_too_short") setEditError(t("create.verificationPhraseTooShort"));
      else if (code === "invalid_fee") setEditError(t("validation.feeNonNegative"));
      else if (code === "max_below_participants") setEditError(t("event.maxBelowParticipants"));
      else setEditError(t("errors.server"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function onKick(participant: Participant) {
    if (!id || !confirm(t("event.kickConfirm", { name: participant.display_name }))) return;
    try {
      await apiKickParticipant(id, participant.id);
      await load();
    } catch {
      setError(t("errors.server"));
    }
  }

  async function onPostAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    const text = annText.trim();
    if (!text) { setAnnError(t("event.announcementContentEmpty")); return; }
    if (text.length > 1000) { setAnnError(t("event.announcementContentLong")); return; }
    setAnnError(null);
    setPosting(true);
    try {
      const newAnn = await apiPostAnnouncement(id!, text);
      setAnnouncements(prev => [...prev, newAnn]);
      setAnnText("");
    } catch {
      setAnnError(t("errors.server"));
    } finally {
      setPosting(false);
    }
  }

  async function onDeleteAnnouncement(annId: number) {
    if (!confirm(t("event.deleteAnnouncementConfirm"))) return;
    try {
      await apiDeleteAnnouncement(id!, annId);
      setAnnouncements(prev => prev.filter(a => a.id !== annId));
    } catch {
      setError(t("errors.server"));
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

  const spotsLeft = Math.max(0, event.maxParticipants - event.participantCount);
  const pct = Math.round((event.participantCount / event.maxParticipants) * 100);
  const isFull = spotsLeft === 0;
  const fillColor = isFull ? "var(--danger)" : pct >= 75 ? "#f59e0b" : "var(--success)";

  const detailTabs: { key: DetailTab; label: string; count?: number }[] = [
    { key: "info", label: t("event.info") },
    { key: "participants", label: t("event.participants"), count: event.participantCount },
    { key: "announcements", label: t("event.announcements"), count: announcements.length || undefined },
  ];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", paddingBottom: 40 }}>
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

      {/* action bar */}
      <div className="card" style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {event.isCreator ? (
          <>
            <span className="badge badge-green">{t("event.youreTheHost")}</span>
            <button
              className="btn btn-secondary"
              disabled={working}
              onClick={openEditModal}
            >
              {t("event.editEvent")}
            </button>
            <button
              className="btn btn-secondary"
              style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
              disabled={working}
              onClick={() => setShowDeleteModal(true)}
            >
              {t("event.deleteEvent")}
            </button>
          </>
        ) : event.isJoined ? (
          <button
            className="btn btn-secondary"
            disabled={working}
            onClick={onLeave}
          >
            {working ? "…" : `✗ ${t("event.leave")}`}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            disabled={working || isFull}
            onClick={onJoin}
          >
            {working ? "…" : isFull ? t("event.full") : `✓ ${t("event.join")}`}
          </button>
        )}

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

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginTop: 16, borderBottom: "2px solid var(--border)" }}>
        {detailTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setDetailTab(tab.key)}
            style={{
              padding: "8px 18px",
              border: "none",
              borderBottom: detailTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -2,
              background: "none",
              color: detailTab === tab.key ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: detailTab === tab.key ? 700 : 400,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span
                style={{
                  fontSize: 11,
                  background: detailTab === tab.key ? "var(--primary)" : "var(--border)",
                  color: detailTab === tab.key ? "#fff" : "var(--text-secondary)",
                  borderRadius: 999,
                  padding: "1px 7px",
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Info ── */}
      {detailTab === "info" && (
        <>
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
            {event.feeAmount != null && (
              <div style={{ fontSize: 15, marginBottom: 12 }}>💴 {t("event.fee")}: ¥{Number(event.feeAmount).toLocaleString()}</div>
            )}
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
        </>
      )}

      {/* ── Tab: Participants ── */}
      {detailTab === "participants" && (
        <div className="card" style={{ marginTop: 12 }}>
          {event.participants.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>{t("event.noParticipants")}</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {event.participants.map(p => (
                <li
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "var(--primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {p.display_name[0].toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: 15 }}>
                    {p.display_name}
                    {p.id === event.creatorId && (
                      <span className="badge badge-green" style={{ marginLeft: 8 }}>
                        {t("event.host")}
                      </span>
                    )}
                    {user && p.id === user.id && p.id !== event.creatorId && (
                      <span className="badge badge-blue" style={{ marginLeft: 8 }}>
                        {t("event.joined")}
                      </span>
                    )}
                  </span>
                  {event.isCreator && p.id !== event.creatorId && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: "4px 12px", borderColor: "var(--danger)", color: "var(--danger)" }}
                      onClick={() => onKick(p)}
                    >
                      {t("event.kick")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Tab: Announcements ── */}
      {detailTab === "announcements" && (
        <div style={{ marginTop: 12 }}>
          {/* Announcement compose — owner only */}
          {event.isCreator && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-label">{t("event.postAnnouncement")}</div>
              <form onSubmit={onPostAnnouncement} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <textarea
                  className="input"
                  rows={3}
                  value={annText}
                  onChange={e => { setAnnText(e.target.value); setAnnError(null); }}
                  placeholder={t("event.announcementPlaceholder")}
                  maxLength={1000}
                  style={{ resize: "vertical" }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="submit" className="btn btn-primary" disabled={posting}>
                    {posting ? t("event.posting") : `📢 ${t("event.postAnnouncement")}`}
                  </button>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: "auto" }}>
                    {annText.length}/1000
                  </span>
                </div>
                <FieldError message={annError} />
              </form>
            </div>
          )}

          {/* Announcement list */}
          <div className="card">
            {annLoading ? (
              <p style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</p>
            ) : announcements.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>{t("event.noAnnouncements")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {announcements.map(ann => (
                  <div
                    key={ann.id}
                    style={{
                      padding: "12px 14px",
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        <strong style={{ color: "var(--text-primary)" }}>📢 {ann.author_name}</strong>
                        {" · "}
                        {new Date(ann.created_at).toLocaleString()}
                      </div>
                      {event.isCreator && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 12, padding: "2px 8px", color: "var(--danger)", flexShrink: 0 }}
                          onClick={() => onDeleteAnnouncement(ann.id)}
                        >
                          {t("event.deleteAnnouncement")}
                        </button>
                      )}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: 15 }}>
                      {ann.content}
                    </div>
                  </div>
                ))}
                <div ref={annEndRef} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showEditModal && (
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
          onClick={() => !savingEdit && setShowEditModal(false)}
        >
          <div
            className="card"
            style={{ width: 680, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12, fontSize: 20 }}>✏️ {t("event.editEvent")}</h3>
            <form onSubmit={onSaveEdit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">{t("create.title")} *</label>
                <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t("create.description")} *</label>
                <textarea className="input" rows={4} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">{t("create.maxPeople")} *</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={500}
                    value={editMaxPeople}
                    onChange={(e) => setEditMaxPeople(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("create.feeAmount")}</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={editFeeAmount}
                    onChange={(e) => setEditFeeAmount(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
                <div />
                <div className="form-group">
                  <label className="form-label">{t("create.startsAt")} *</label>
                  <input className="input" type="datetime-local" value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("create.endsAt")} *</label>
                  <input className="input" type="datetime-local" value={editEndsAt} onChange={(e) => setEditEndsAt(e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("create.address")} *</label>
                <LocationPicker
                  address={editAddress}
                  onAddressChange={setEditAddress}
                  lat={editLat}
                  lon={editLon}
                  onLatLonChange={(lat, lon) => {
                    setEditLat(lat);
                    setEditLon(lon);
                  }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("create.verificationPhrase")}</label>
                <input className="input" value={editPhrase} onChange={(e) => setEditPhrase(e.target.value)} />
              </div>
              <FieldError message={editError} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn btn-secondary" disabled={savingEdit} onClick={() => setShowEditModal(false)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? t("event.savingChanges") : t("event.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
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
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="card"
            style={{ width: 400, maxWidth: "92vw", padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 8, fontSize: 18 }}>🗑 {t("event.deleteModalTitle")}</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
              {t("event.deleteModalHint")}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn btn-primary"
                style={{ background: "#dc2626" }}
                disabled={deleting}
                onClick={onDeleteConfirm}
              >
                {deleting ? "…" : t("event.deleteConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
