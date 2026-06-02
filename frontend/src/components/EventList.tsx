import React from "react";
import { EventCard, type EventSummary } from "./EventCard";

export function EventList({
  events,
  onOpenEvent,
  emptyMessage,
}: {
  events: EventSummary[];
  onOpenEvent: (id: number) => void;
  emptyMessage?: string;
}) {
  if (!events.length) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-secondary)" }}>
        <p style={{ fontSize: 32, marginBottom: 8 }}>🗓️</p>
        <p>{emptyMessage ?? "No events."}</p>
      </div>
    );
  }

  return (
    <div>
      {events.map((e) => (
        <EventCard key={e.id} event={e} onOpen={() => onOpenEvent(e.id)} />
      ))}
    </div>
  );
}
