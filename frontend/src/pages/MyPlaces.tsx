import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  apiGetPlaylists,
  apiGetPlaylistItems,
  apiCreatePlaylist,
  apiRenamePlaylist,
  apiDeletePlaylist,
  apiDeletePlaylistItem,
  apiUpdatePlaylistItem,
  type Playlist,
  type PlaylistItem,
} from "../api/client";
import { usePageTitle } from "../hooks/usePageTitle";

export default function MyPlaces() {
  const { t } = useTranslation();
  usePageTitle("app.myPlaces");

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");

  async function loadPlaylists(nextActiveId?: number | null) {
    setLoadingPlaylists(true);
    const ps = await apiGetPlaylists();
    setPlaylists(ps);
    setLoadingPlaylists(false);
    const target = nextActiveId === undefined ? activeId : nextActiveId;
    const stillExists = target != null && ps.some((p) => p.id === target);
    if (stillExists) {
      setActiveId(target);
      return;
    }
    if (ps.length) {
      const def = ps.find((p) => p.isDefault) ?? ps[0];
      setActiveId(def.id);
    } else {
      setActiveId(null);
      setItems([]);
    }
  }

  async function loadItems(id: number) {
    setLoadingItems(true);
    const it = await apiGetPlaylistItems(id);
    setItems(it);
    setLoadingItems(false);
  }

  useEffect(() => { loadPlaylists(); }, []);
  useEffect(() => { if (activeId) loadItems(activeId); }, [activeId]);

  async function handleCreatePlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSavingNew(true);
    await apiCreatePlaylist(newName.trim());
    setNewName("");
    setShowNew(false);
    setSavingNew(false);
    loadPlaylists();
  }

  async function handleRenameSubmit(id: number) {
    if (!renameValue.trim()) return;
    await apiRenamePlaylist(id, renameValue.trim());
    setRenamingId(null);
    loadPlaylists();
  }

  async function handleDeletePlaylist(id: number) {
    if (!confirm(t("places.confirmDelete"))) return;
    await apiDeletePlaylist(id);
    await loadPlaylists(activeId === id ? null : activeId);
  }

  async function handleDeleteItem(itemId: number) {
    await apiDeletePlaylistItem(itemId);
    if (activeId) loadItems(activeId);
  }

  async function handleSaveItemEdit(itemId: number) {
    await apiUpdatePlaylistItem(itemId, { title: editTitle, notes: editNotes });
    setEditingItemId(null);
    if (activeId) loadItems(activeId);
  }

  const activePlaylist = playlists.find((p) => p.id === activeId);

  const CATEGORY_COLORS: Record<string, string> = {
    temple: "#a855f7",
    shrine: "#ec4899",
    food: "#f59e0b",
    nature: "#22c55e",
    landmark: "#3b82f6",
    city: "#06b6d4",
    entertainment: "#f97316",
    museum: "#8b5cf6",
    custom: "#6b7280",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h1 className="page-title">{t("places.title")}</h1>
      </div>

      <div className="places-layout">
        {/* Sidebar — playlist list */}
        <aside className="places-sidebar">
          <div className="card">
            <div className="places-sidebar-header">
              {t("places.playlists")}
              <button
                className="btn btn-secondary"
                style={{ padding: "5px 10px", fontSize: 12 }}
                onClick={() => setShowNew(true)}
              >
                {t("places.newPlaylist")}
              </button>
            </div>

            {showNew && (
              <form onSubmit={handleCreatePlaylist} style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", gap: 6 }}>
                <input
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("places.playlistName")}
                  autoFocus
                  style={{ flex: 1, fontSize: 13, padding: "4px 8px" }}
                />
                <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: 13 }} disabled={savingNew}>
                  {t("common.save")}
                </button>
                <button type="button" className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: 13 }} onClick={() => setShowNew(false)}>
                  ✕
                </button>
              </form>
            )}

            {loadingPlaylists ? (
              <p style={{ padding: 16, fontSize: 13, color: "var(--text-secondary)" }}>{t("common.loading")}</p>
            ) : (
              playlists.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`playlist-row${activeId === p.id ? " active" : ""}`}
                >
                  {renamingId === p.id ? (
                    <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <input
                        className="input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        style={{ fontSize: 13, padding: "2px 6px", flex: 1 }}
                      />
                      <button className="btn btn-primary" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => handleRenameSubmit(p.id)}>✓</button>
                      <button className="btn btn-secondary" style={{ padding: "2px 6px", fontSize: 12 }} onClick={() => setRenamingId(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {t("places.placesCount_other", { count: p.itemCount })}
                        {p.isDefault ? ` · ${t("places.defaultLabel")}` : ""}
                      </span>
                    </>
                  )}
                  {activeId === p.id && renamingId !== p.id && (
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <button
                        style={{ fontSize: 11, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 0 }}
                        onClick={(e) => { e.stopPropagation(); setRenamingId(p.id); setRenameValue(p.name); }}
                      >
                        {t("places.rename")}
                      </button>
                      <button
                        style={{ fontSize: 11, background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 0 }}
                        onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(p.id); }}
                      >
                        {t("places.delete")}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main content — items */}
        <section>
          {activePlaylist ? (
            <>
              <div className="card" style={{ marginBottom: 12, padding: "12px 16px" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{activePlaylist.name}</h2>
              </div>

              {loadingItems ? (
                <p style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</p>
              ) : items.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-secondary)" }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>📍</p>
                  <p>{t("places.empty")}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {items.map((item) => {
                    const catColor = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.custom;
                    return (
                      <div key={item.id} className="card place-item-card">
                        {editingItemId === item.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <input
                              className="input"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                            />
                            <textarea
                              className="input"
                              rows={2}
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              style={{ resize: "vertical" }}
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="btn btn-primary" style={{ padding: "4px 12px", fontSize: 13 }} onClick={() => handleSaveItemEdit(item.id)}>{t("common.save")}</button>
                              <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 13 }} onClick={() => setEditingItemId(null)}>{t("common.cancel")}</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    background: catColor,
                                    flexShrink: 0,
                                  }}
                                />
                                <strong style={{ fontSize: 15 }}>{item.title}</strong>
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: "1px 6px",
                                    borderRadius: 999,
                                    background: catColor + "22",
                                    color: catColor,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {item.category}
                                </span>
                              </div>
                              {item.notes && (
                                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 4px" }}>{item.notes}</p>
                              )}
                              {item.address && (
                                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>📍 {item.address}</p>
                              )}
                            </div>
                            <div className="place-item-actions">
                              <button
                                className="btn btn-secondary"
                                style={{ fontSize: 12, padding: "4px 10px" }}
                                onClick={() => { setEditingItemId(item.id); setEditTitle(item.title); setEditNotes(item.notes); }}
                              >
                                {t("common.edit")}
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ fontSize: 12, padding: "4px 10px", color: "var(--danger)", borderColor: "var(--danger)" }}
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                {t("common.remove")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-secondary)" }}>
              {t("places.noPlaylistSelected")}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
