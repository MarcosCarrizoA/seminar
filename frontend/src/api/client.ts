import axios from "axios";

export const api = axios.create({
  withCredentials: true,
});

export async function apiRegister(params: {
  email: string;
  password: string;
  displayName: string;
  preferredLocale?: "en" | "ja";
}) {
  const res = await api.post("/auth/register", params);
  return res.data;
}

export async function apiLogin(params: {
  email: string;
  password: string;
}) {
  const res = await api.post("/auth/login", params);
  return res.data;
}

export async function apiLogout() {
  const res = await api.post("/auth/logout");
  return res.data;
}

export async function apiMe() {
  const res = await api.get("/auth/me");
  return res.data;
}

export async function apiUpdateLocale(preferredLocale: "en" | "ja") {
  const res = await api.patch("/auth/me", { preferredLocale });
  return res.data;
}

export async function apiGetEvents() {
  const res = await api.get("/events");
  return res.data as any[];
}

export async function apiGetEvent(id: number | string) {
  const res = await api.get(`/events/${id}`);
  return res.data;
}

export async function apiCreateEvent(params: {
  title: string;
  description: string;
  maxParticipants: number;
  feeAmount?: number;
  startsAt: string;
  endsAt: string;
  address: string;
  verificationPhrase?: string;
}) {
  const res = await api.post("/events", params);
  return res.data as { id: number };
}

export async function apiUpdateEvent(
  id: number | string,
  params: {
    title: string;
    description: string;
    maxParticipants: number;
    feeAmount?: number;
    startsAt: string;
    endsAt: string;
    address: string;
    verificationPhrase?: string;
    latitude?: number;
    longitude?: number;
  }
) {
  const res = await api.patch(`/events/${id}`, params);
  return res.data as { ok: true };
}

export async function apiJoinEvent(id: number | string) {
  const res = await api.post(`/events/${id}/join`);
  return res.data;
}

export async function apiLeaveEvent(id: number | string) {
  const res = await api.delete(`/events/${id}/join`);
  return res.data;
}

export async function apiCancelEvent(id: number | string, reason: string) {
  const res = await api.patch(`/events/${id}/cancel`, { reason });
  return res.data;
}

export async function apiDeleteEvent(id: number | string) {
  const res = await api.delete(`/events/${id}`);
  return res.data;
}

export async function apiGeocodeAddress(address: string) {
  const res = await api.post("/events/geocode", { address });
  return res.data as { latitude: number; longitude: number };
}

export async function apiKickParticipant(eventId: number | string, userId: number) {
  const res = await api.delete(`/events/${eventId}/participants/${userId}`);
  return res.data;
}

// ─── Announcements ───────────────────────────────────────────────────────────

export interface Announcement {
  id: number;
  content: string;
  created_at: string;
  author_name: string;
}

export async function apiGetAnnouncements(eventId: number | string) {
  const res = await api.get(`/events/${eventId}/announcements`);
  return res.data as Announcement[];
}

export async function apiPostAnnouncement(eventId: number | string, content: string) {
  const res = await api.post(`/events/${eventId}/announcements`, { content });
  return res.data as Announcement;
}

export async function apiDeleteAnnouncement(eventId: number | string, annId: number) {
  const res = await api.delete(`/events/${eventId}/announcements/${annId}`);
  return res.data;
}

// ─── Curated Places ──────────────────────────────────────────────────────────

export interface CuratedPlace {
  id: number;
  title: string;
  title_ja?: string;
  description: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  sort_order: number;
}

export async function apiGetCuratedPlaces() {
  const res = await api.get("/places/curated");
  return res.data as CuratedPlace[];
}

// ─── Playlists ───────────────────────────────────────────────────────────────

export interface Playlist {
  id: number;
  name: string;
  isDefault: boolean;
  createdAt: string;
  itemCount: number;
}

export interface PlaylistItem {
  id: number;
  title: string;
  notes: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  curatedPlaceId: number | null;
  category: string;
  createdAt: string;
}

export async function apiGetPlaylists() {
  const res = await api.get("/playlists");
  return res.data as Playlist[];
}

export async function apiCreatePlaylist(name: string) {
  const res = await api.post("/playlists", { name });
  return res.data as Playlist;
}

export async function apiRenamePlaylist(id: number, name: string) {
  const res = await api.patch(`/playlists/${id}`, { name });
  return res.data;
}

export async function apiDeletePlaylist(id: number) {
  const res = await api.delete(`/playlists/${id}`);
  return res.data;
}

export async function apiGetPlaylistItems(playlistId: number) {
  const res = await api.get(`/playlists/${playlistId}/items`);
  return res.data as PlaylistItem[];
}

export async function apiAddPlaylistItem(
  playlistId: number,
  item: {
    title: string;
    notes?: string;
    latitude?: number | null;
    longitude?: number | null;
    address?: string;
    curatedPlaceId?: number | null;
  }
) {
  const res = await api.post(`/playlists/${playlistId}/items`, item);
  return res.data as { id: number };
}

export async function apiUpdatePlaylistItem(
  itemId: number,
  fields: { title?: string; notes?: string }
) {
  const res = await api.patch(`/playlists/items/${itemId}`, fields);
  return res.data;
}

export async function apiDeletePlaylistItem(itemId: number) {
  const res = await api.delete(`/playlists/items/${itemId}`);
  return res.data;
}

