import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  apiGetEvents,
  apiGetPlaylists,
  apiGetPlaylistItems,
  type Playlist,
  type PlaylistItem,
} from "../api/client";
import { KansaiMap, type MapFilter, type UserMapItem } from "../components/KansaiMap";
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
  const [filter, setFilter] = useState<MapFilter>("events");
  const [listFilter, setListFilter] = useState<ListFilter>("all");

  // Data
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [userItems, setUserItems] = useState<UserMapItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-place mode
  const [addingPlace, setAddingPlace] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lon: number; address?: string } | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const evts = await apiGetEvents();
      setEvents(evts);

      if (user) {
        const ps = await apiGetPlaylists();
        setPlaylists(ps);
        const def = ps.find((p) => p.isDefault) ?? ps[0] ?? null;
        if (def) {
          const items = await loadAllUserItems(ps);
          setUserItems(items);
          setFilter((curr) => curr === "events" ? (`playlist:${def.id}` as MapFilter) : curr);
        }
      } else {
        setPlaylists([]);
        setUserItems([]);
        setFilter("events");
      }
    } catch {
      setError(t("home.loadError"));
    } finally {
      setLoading(false);
    }
  }

  async function loadAllUserItems(ps: Playlist[]): Promise<UserMapItem[]> {
    const all: UserMapItem[] = [];
    for (const p of ps) {
      const items = await apiGetPlaylistItems(p.id);
      all.push(...items.map((i) => ({ ...i, playlistId: p.id })));
    }
    return all;
  }

  async function refreshUserItems() {
    if (!user) return;
    const ps = await apiGetPlaylists();
    setPlaylists(ps);
    const items = await loadAllUserItems(ps);
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

  async function handleSaveFromModal() {
    setPendingPin(null);
    await refreshUserItems();
  }

  return (
    <div className="home-shell">
      <section className="home-hero">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 30, marginBottom: 6 }}>{t("home.title")}</h1>
            <p className="home-hero-subtitle">{t("home.subtitle")}</p>
          </div>
          {user ? (
            <Link to="/create" className="btn btn-primary">+ {t("app.createEvent")}</Link>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <Link to="/login" className="btn btn-primary">{t("auth.login")}</Link>
              <Link to="/register" className="btn btn-secondary">{t("auth.register")}</Link>
            </div>
          )}
        </div>
      </section>

      <section className="home-content-card">
        <div className="home-toolbar">
          <div className="home-toolbar-left">
            <div className="pill-tabs">
              <button className={tab === "map" ? "active" : ""} onClick={() => setTab("map")}>{t("app.map")}</button>
              <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>{t("app.list")}</button>
            </div>
          </div>
          <div className="home-toolbar-right">
            {tab === "map" && (
              <>
                {user ? (
                  <MapFilterBar active={filter} onChange={setFilter} playlists={playlists} />
                ) : (
                  <button
                    className={`map-filter-chip${filter === "events" ? " active" : ""}`}
                    onClick={() => setFilter("events")}
                  >
                    🔵 {t("map.eventsOnly")}
                  </button>
                )}
                {!addingPlace ? (
                  <button className="btn btn-secondary" onClick={() => user ? setAddingPlace(true) : navigate("/login")}>
                    📍 {t("map.addPlace")}
                  </button>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setAddingPlace(false)}>
                    ✕ {t("home.cancelAddPlace")}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {addingPlace && <div className="map-banner">{t("home.addingPlace")}</div>}

        <div className="home-content-scroll">
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
            userItems={user ? userItems : []}
            filter={filter}
            addingPlace={addingPlace}
            onMapClick={user ? handleMapClick : undefined}
            onDeleteUserItem={user ? () => refreshUserItems() : undefined}
          />
        ) : (
          <div style={{ height: "100%", overflowY: "auto" }}>
            {/* List sub-filter bar */}
            <div className="home-list-subtoolbar">
              {(["all", "joined", "notJoined"] as ListFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setListFilter(f)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: listFilter === f ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
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
      </section>

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

    </div>
  );
}
