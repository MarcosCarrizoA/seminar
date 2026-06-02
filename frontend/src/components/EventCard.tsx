import React from "react";
import { useTranslation } from "react-i18next";

export type EventSummary = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  address: string;
  participantCount: number;
  maxParticipants: number;
  hasVerificationPhrase: boolean;
  isJoined: boolean;
  latitude: number | null;
  longitude: number | null;
};

export function EventCard({
  event,
  onOpen,
}: {
  event: EventSummary;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const spotsLeft = Math.max(0, event.maxParticipants - event.participantCount);
  const pct = Math.round((event.participantCount / event.maxParticipants) * 100);
  const isFull = spotsLeft === 0;

  const fillColor = isFull
    ? "var(--danger)"
    : pct >= 75
    ? "#f59e0b"
    : "var(--success)";

  return (
    <div className="event-card" onClick={onOpen}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {event.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            📅 {new Date(event.startsAt).toLocaleString()} - {new Date(event.endsAt).toLocaleString()}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            📍 {event.address}
          </div>
        </div>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {event.isJoined && <span className="badge badge-blue">✓ {t("event.joined")}</span>}
          {event.hasVerificationPhrase && <span className="badge badge-gray">🔑</span>}
          {isFull && <span className="badge badge-red">{t("common.full")}</span>}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
          <span>{t("event.joinedCount", { count: event.participantCount })}</span>
          <span>
            {isFull
              ? t("common.full")
              : t("event.spotsLeft", { count: spotsLeft })
            } / {event.maxParticipants}
          </span>
        </div>
        <div className="capacity-bar">
          <div
            className="capacity-bar-fill"
            style={{ width: `${Math.min(pct, 100)}%`, background: fillColor }}
          />
        </div>
      </div>
    </div>
  );
}
