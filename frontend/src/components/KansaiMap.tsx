import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { KANSAI_CENTER, KANSAI_DEFAULT_ZOOM, KANSAI_MAX_BOUNDS, isInKansai } from "../geo/kansai";
import type { CuratedPlace, PlaylistItem } from "../api/client";
import type { EventSummary } from "./EventCard";
export type { EventSummary } from "./EventCard";

// ─── Custom div icons ─────────────────────────────────────────────────────────

function makeCircleIcon(color: string, border: string, size = 14) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid ${border};box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  });
}

const eventIcon = makeCircleIcon("#3b82f6", "#1d4ed8", 16);
const curatedIcon = makeCircleIcon("#22c55e", "#15803d", 16);
const userIcon = makeCircleIcon("#f97316", "#c2410c", 16);

// ─── Types ────────────────────────────────────────────────────────────────────

export type MapFilter = "all" | "events" | "curated" | "myplaces";

interface Props {
  events: EventSummary[];
  curatedPlaces: CuratedPlace[];
  userItems: PlaylistItem[];
  filter: MapFilter;
  addingPlace: boolean;
  isLoggedIn: boolean;
  onMapClick?: (lat: number, lon: number) => void;
  onAddToPlaylist?: (place: CuratedPlace) => void;
  onDeleteUserItem?: (item: PlaylistItem) => void;
}

// ─── Inner click handler ──────────────────────────────────────────────────────

function MapClickHandler({
  enabled,
  onMapClick,
}: {
  enabled: boolean;
  onMapClick?: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled || !onMapClick) return;
      if (!isInKansai(e.latlng.lat, e.latlng.lng)) return;
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── KansaiMap ────────────────────────────────────────────────────────────────

export function KansaiMap({
  events,
  curatedPlaces,
  userItems,
  filter,
  addingPlace,
  isLoggedIn,
  onMapClick,
  onAddToPlaylist,
  onDeleteUserItem,
}: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const showEvents = filter === "all" || filter === "events";
  const showCurated = filter === "all" || filter === "curated";
  const showUser = filter === "all" || filter === "myplaces";

  return (
    <MapContainer
      center={KANSAI_CENTER}
      zoom={KANSAI_DEFAULT_ZOOM}
      maxBounds={KANSAI_MAX_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={8}
      style={{ height: "100%", width: "100%", cursor: addingPlace ? "crosshair" : "grab" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      <MapClickHandler enabled={addingPlace} onMapClick={onMapClick} />

      {/* Event markers — blue */}
      {showEvents &&
        events
          .filter((e) => e.latitude != null && e.longitude != null)
          .map((e) => (
            <Marker
              key={`ev-${e.id}`}
              position={[e.latitude!, e.longitude!]}
              icon={eventIcon}
            >
              <Popup>
                <strong>{e.title}</strong>
                <br />
                <small>{fmt(e.startsAt)} → {fmt(e.endsAt)}</small>
                <br />
                <small>{e.address}</small>
                <br />
                <small>{t("event.joinedCount", { count: e.participantCount })} / {e.maxParticipants}</small>
                <br />
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 6, padding: "4px 10px", fontSize: 13 }}
                  onClick={() => navigate(`/events/${e.id}`)}
                >
                  {t("map.viewEvent")}
                </button>
              </Popup>
            </Marker>
          ))}

      {/* Curated markers — green */}
      {showCurated &&
        curatedPlaces.map((p) => (
          <Marker
            key={`cp-${p.id}`}
            position={[p.latitude, p.longitude]}
            icon={curatedIcon}
          >
            <Popup>
              <strong>{p.title}</strong>
              <br />
              <span
                style={{
                  fontSize: 11,
                  background: "var(--surface-raised)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  textTransform: "capitalize",
                }}
              >
                {p.category}
              </span>
              <br />
              <small style={{ display: "block", marginTop: 4 }}>{p.description}</small>
              <small style={{ color: "var(--text-secondary)" }}>{p.address}</small>
              <br />
              {isLoggedIn ? (
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: 6, padding: "4px 10px", fontSize: 12 }}
                  onClick={() => onAddToPlaylist && onAddToPlaylist(p)}
                >
                  {t("map.addToPlaylist")}
                </button>
              ) : (
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: 6, padding: "4px 10px", fontSize: 12 }}
                  onClick={() => navigate("/login")}
                >
                  {t("map.loginToAdd")}
                </button>
              )}
            </Popup>
          </Marker>
        ))}

      {/* User place markers — orange */}
      {showUser &&
        userItems
          .filter((i) => i.latitude != null && i.longitude != null)
          .map((i) => (
            <Marker
              key={`up-${i.id}`}
              position={[i.latitude!, i.longitude!]}
              icon={userIcon}
            >
              <Popup>
                <strong>{i.title}</strong>
                {i.notes && (
                  <>
                    <br />
                    <small>{i.notes}</small>
                  </>
                )}
                {i.address && (
                  <>
                    <br />
                    <small style={{ color: "var(--text-secondary)" }}>{i.address}</small>
                  </>
                )}
                {onDeleteUserItem && (
                  <button
                    style={{
                      marginTop: 6,
                      padding: "3px 8px",
                      fontSize: 12,
                      background: "none",
                      border: "1px solid var(--danger)",
                      color: "var(--danger)",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                    onClick={() => onDeleteUserItem(i)}
                  >
                    {t("map.remove")}
                  </button>
                )}
              </Popup>
            </Marker>
          ))}
    </MapContainer>
  );
}
