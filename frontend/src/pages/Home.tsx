import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  apiGetEvents,
  apiGetCuratedPlaces,
  apiGetPlaylists,
  apiGetPlaylistItems,
  apiAddPlaylistItem,
  type CuratedPlace,
  type PlaylistItem,
} from "../api/client";
import { KansaiMap, type MapFilter } from "../components/KansaiMap";
import type { EventSummary } from "../components/EventCard";
import { MapFilterBar } from "../components/MapFilterBar";
import { AddPlaceModal } from "../components/AddPlaceModal";
import { EventList } from "../components/EventList";
import { useAuth } from "../context/AuthContext";

type Tab = "map" | "list";
type ListFilter = "all" | "joined" | "notJoined";

export function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  usePageTitle("nav.home");

  const [tab, setTab] = useState<Tab>("map");
  const [filter, setFilter] = useState<MapFilter>("all");
  const [listFilter, setListFilter] = useState<ListFilter>("all");

  // Data
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [curated, setCurated] = useState<CuratedPlace[]>([]);
  const [userItems, setUserItems] = useState<PlaylistItem[]>([]);
  const [defaultPlaylistId, setDefaultPlaylistId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-place mode
  const [addingPlace, setAddingPlace] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lon: number; address?: string } | null>(null);

  // "Add to playlist" from curated popup
  const [curatedToAdd, setCuratedToAdd] = useState<CuratedPlace | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [evts, crts] = await Promise.all([
        apiGetEvents(),
        apiGetCuratedPlaces(),
      ]);
      setEvents(evts);
      setCurated(crts);

      if (user) {
        const playlists = await apiGetPlaylists();
        const def = playlists.find((p) => p.isDefault) ?? playlists[0] ?? null;
        if (def) {
          setDefaultPlaylistId(def.id);
          const items = await loadAllUserItems(playlists.map((p) => p.id));
          setUserItems(items);
        }
      }
    } catch {
      setError(t("home.loadError"));
    } finally {
      setLoading(false);
    }
  }

  async function loadAllUserItems(playlistIds: number[]): Promise<PlaylistItem[]> {
    const all: PlaylistItem[] = [];
    for (const id of playlistIds) {
      const items = await apiGetPlaylistItems(id);
      all.push(...items);
    }
    return all;
  }

  async function refreshUserItems() {
    if (!user) return;
    const playlists = await apiGetPlaylists();
    const items = await loadAllUserItems(playlists.map((p) => p.id));
    setUserItems(items);
  }

  useEffect(() => {
    loadAll();
  }, [user]);

  // Map click — only in adding-place mode
  const handleMapClick = useCallback(async (lat: number, lon: number) => {
    // Reverse geocode for address hint
    let address = "";
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
      const res = await fetch(url, { headers: { "User-Agent": "exchange-events-app/1.0" } });
      const data = await res.json();
      address = data.display_name ?? "";
    } catch {}
    setPendingPin({ lat, lon, address });
    setAddingPlace(false);
  }, []);

  function handleDeleteUserItem(item: PlaylistItem) {
    // Optimistically remove; real deletion happens in popup → MyPlaces flow
    // Here we just refresh
    refreshUserItems();
  }

  function handleAddToPlaylist(place: CuratedPlace) {
    setCuratedToAdd(place);
  }

  async function handleSaveFromModal() {
    setPendingPin(null);
    setCuratedToAdd(null);
    await refreshUserItems();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 56px)",
        overflow: "hidden",
      }}
    >
      {/* Hero strip */}
      <div
        style={{
          padding: "10px 20px",
          background: "linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("home.title")}</h1>
          <p style={{ fontSize: 13, margin: 0, opacity: 0.85 }}>{t("home.subtitle")}</p>
        </div>
        {user ? (
          <Link
            to="/create"
            className="btn btn-primary"
            style={{
              background: "#fff",
              color: "#2563eb",
              fontWeight: 600,
              padding: "7px 16px",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            + {t("app.createEvent")}
          </Link>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to="/login"
              style={{
                background: "#fff",
                color: "#2563eb",
                fontWeight: 600,
                padding: "7px 16px",
                fontSize: 13,
                borderRadius: 8,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {t("auth.login")}
            </Link>
            <Link
              to="/register"
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
                fontWeight: 600,
                padding: "7px 16px",
                fontSize: 13,
                borderRadius: 8,
                textDecoration: "none",
                whiteSpace: "nowrap",
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              {t("auth.register")}
            </Link>
          </div>
        )}
      </div>

      {/* Tab + filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setTab("map")}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              background: tab === "map" ? "var(--primary)" : "transparent",
              color: tab === "map" ? "#fff" : "var(--text-secondary)",
              fontWeight: tab === "map" ? 600 : 400,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t("app.map")}
          </button>
          <button
            onClick={() => setTab("list")}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              background: tab === "list" ? "var(--primary)" : "transparent",
              color: tab === "list" ? "#fff" : "var(--text-secondary)",
              fontWeight: tab === "list" ? 600 : 400,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t("app.list")}
          </button>
        </div>

        {/* Map filters — only shown in map tab */}
        {tab === "map" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <MapFilterBar active={filter} onChange={setFilter} />
            {!addingPlace && (
              <button
                className="btn btn-secondary"
                style={{ padding: "5px 12px", fontSize: 12, whiteSpace: "nowrap" }}
                onClick={() => user ? setAddingPlace(true) : navigate("/login")}
              >
                📍 {t("map.addPlace")}
              </button>
            )}
            {addingPlace && (
              <button
                className="btn btn-secondary"
                style={{ padding: "5px 12px", fontSize: 12 }}
                onClick={() => setAddingPlace(false)}
              >
                ✕ {t("home.cancelAddPlace")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Adding-place banner */}
      {addingPlace && (
        <div
          style={{
            padding: "6px 16px",
            background: "#a855f722",
            borderBottom: "1px solid #a855f766",
            fontSize: 13,
            color: "#7e22ce",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {t("home.addingPlace")}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-secondary)",
              fontSize: 15,
            }}
          >
            {t("common.loading")}
          </div>
        ) : error ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--danger)",
            }}
          >
            {error}
          </div>
        ) : tab === "map" ? (
          <KansaiMap
            events={events}
            curatedPlaces={curated}
            userItems={user ? userItems : []}
            filter={filter}
            addingPlace={addingPlace}
            isLoggedIn={!!user}
            onMapClick={user ? handleMapClick : undefined}
            onAddToPlaylist={user ? handleAddToPlaylist : undefined}
            onDeleteUserItem={user ? () => refreshUserItems() : undefined}
          />
        ) : (
          <div style={{ height: "100%", overflowY: "auto" }}>
            {/* List sub-filter bar */}
            <div style={{
              display: "flex",
              gap: 6,
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}>
              {(["all", "joined", "notJoined"] as ListFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setListFilter(f)}
                  style={{
                    padding: "5px 16px",
                    borderRadius: 999,
                    border: listFilter === f ? "2px solid var(--primary)" : "2px solid var(--border)",
                    background: listFilter === f ? "var(--primary)" : "transparent",
                    color: listFilter === f ? "#fff" : "var(--text-secondary)",
                    fontWeight: listFilter === f ? 600 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  {f === "all" && t("home.listFilter.all")}
                  {f === "joined" && `✓ ${t("home.listFilter.joined")}`}
                  {f === "notJoined" && t("home.listFilter.notJoined")}
                </button>
              ))}
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-secondary)", alignSelf: "center" }}>
                {(() => {
                  const filtered = listFilter === "joined"
                    ? events.filter(e => e.isJoined)
                    : listFilter === "notJoined"
                    ? events.filter(e => !e.isJoined)
                    : events;
                  return `${filtered.length} event${filtered.length !== 1 ? "s" : ""}`;
                })()}
              </span>
            </div>

            <div style={{ padding: 16 }}>
              {events.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
                  <p style={{ fontSize: 40 }}>🗓️</p>
                  <p>{t("home.noEvents")}</p>
                  {user && (
                    <Link to="/create" className="btn btn-primary" style={{ marginTop: 12 }}>
                      + {t("app.createEvent")}
                    </Link>
                  )}
                </div>
              ) : (
                <EventList
                  events={
                    listFilter === "joined"
                      ? events.filter(e => e.isJoined)
                      : listFilter === "notJoined"
                      ? events.filter(e => !e.isJoined)
                      : events
                  }
                  onOpenEvent={(id) => navigate(`/events/${id}`)}
                  emptyMessage={t("home.noEventsFilter")}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add-place modal (map click) */}
      {pendingPin && (
        <AddPlaceModal
          lat={pendingPin.lat}
          lon={pendingPin.lon}
          address={pendingPin.address}
          onClose={() => setPendingPin(null)}
          onSaved={handleSaveFromModal}
        />
      )}

      {/* Add-to-playlist modal (from curated popup) */}
      {curatedToAdd && (
        <AddPlaceModal
          lat={curatedToAdd.latitude}
          lon={curatedToAdd.longitude}
          address={curatedToAdd.address}
          defaultTitle={curatedToAdd.title}
          curatedPlaceId={curatedToAdd.id}
          onClose={() => setCuratedToAdd(null)}
          onSaved={handleSaveFromModal}
        />
      )}
    </div>
  );
}
