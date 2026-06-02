import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Playlist } from "../api/client";
import { apiAddPlaylistItem, apiGetPlaylists } from "../api/client";

interface Props {
  lat: number;
  lon: number;
  address?: string;
  curatedPlaceId?: number | null;
  defaultTitle?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AddPlaceModal({
  lat,
  lon,
  address,
  curatedPlaceId,
  defaultTitle,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistId, setPlaylistId] = useState<number | null>(null);
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGetPlaylists().then((ps) => {
      setPlaylists(ps);
      const def = ps.find((p) => p.isDefault) ?? ps[0];
      if (def) setPlaylistId(def.id);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !playlistId) return;
    setSaving(true);
    setError(null);
    try {
      await apiAddPlaylistItem(playlistId, {
        title: title.trim(),
        notes,
        latitude: lat,
        longitude: lon,
        address: address ?? "",
        curatedPlaceId: curatedPlaceId ?? null,
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error ?? t("errors.server"));
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="card modal-card"
        style={{ maxWidth: 420, padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: 16, fontSize: 18 }}>{t("playlist.modalTitle")}</h3>
        {address && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            📍 {address}
          </p>
        )}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="form-label">{t("playlist.title")}</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("playlist.titlePlaceholder")}
              required
            />
          </div>
          <div>
            <label className="form-label">{t("playlist.notesLabel")}</label>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("playlist.notesPlaceholder")}
              style={{ resize: "vertical" }}
            />
          </div>
          <div>
            <label className="form-label">{t("playlist.selectPlaylist")}</label>
            <select
              className="input"
              value={playlistId ?? ""}
              onChange={(e) => setPlaylistId(Number(e.target.value))}
            >
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t("playlist.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
