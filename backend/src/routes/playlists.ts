import { Router } from "express";
import { getDb } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { isInKansai } from "../geo/kansai";

const router = Router();

// GET /playlists — user's playlists with item counts
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT p.id, p.name, p.is_default, p.created_at,
              COUNT(i.id) AS item_count
       FROM place_playlists p
       LEFT JOIN place_playlist_items i ON i.playlist_id = p.id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.is_default DESC, p.created_at ASC`,
      req.auth!.userId
    );
    res.json(rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      isDefault: !!r.is_default,
      createdAt: r.created_at,
      itemCount: Number(r.item_count) || 0,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /playlists — create a new playlist
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "missing_name" });
  }
  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO place_playlists (user_id, name, is_default) VALUES (?, ?, 0)`,
      req.auth!.userId,
      name.trim()
    );
    res.status(201).json({ id: result.lastID, name: name.trim(), isDefault: false, itemCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// PATCH /playlists/:id — rename
router.patch("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { name } = req.body || {};
  if (!id || !name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "missing_fields" });
  }
  try {
    const db = await getDb();
    const playlist = await db.get(
      `SELECT id, user_id, is_default FROM place_playlists WHERE id = ?`, id
    );
    if (!playlist) return res.status(404).json({ error: "not_found" });
    if (Number(playlist.user_id) !== req.auth!.userId) {
      return res.status(403).json({ error: "forbidden" });
    }
    await db.run(`UPDATE place_playlists SET name = ? WHERE id = ?`, name.trim(), id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// DELETE /playlists/:id — delete (default can also be deleted)
router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "invalid_id" });
  try {
    const db = await getDb();
    const playlist = await db.get(
      `SELECT id, user_id, is_default FROM place_playlists WHERE id = ?`, id
    );
    if (!playlist) return res.status(404).json({ error: "not_found" });
    if (Number(playlist.user_id) !== req.auth!.userId) {
      return res.status(403).json({ error: "forbidden" });
    }
    await db.run(`DELETE FROM place_playlists WHERE id = ?`, id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// GET /playlists/:id/items
router.get("/:id/items", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "invalid_id" });
  try {
    const db = await getDb();
    const playlist = await db.get(
      `SELECT id, user_id FROM place_playlists WHERE id = ?`, id
    );
    if (!playlist) return res.status(404).json({ error: "not_found" });
    if (Number(playlist.user_id) !== req.auth!.userId) {
      return res.status(403).json({ error: "forbidden" });
    }
    const items = await db.all(
      `SELECT i.id, i.title, i.notes, i.latitude, i.longitude, i.address,
              i.curated_place_id, i.created_at,
              cp.category
       FROM place_playlist_items i
       LEFT JOIN curated_places cp ON cp.id = i.curated_place_id
       WHERE i.playlist_id = ?
       ORDER BY i.created_at ASC`,
      id
    );
    res.json(items.map((i: any) => ({
      id: i.id,
      title: i.title,
      notes: i.notes,
      latitude: i.latitude,
      longitude: i.longitude,
      address: i.address,
      curatedPlaceId: i.curated_place_id,
      category: i.category ?? "custom",
      createdAt: i.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /playlists/:id/items — add a place
router.post("/:id/items", requireAuth, async (req: AuthedRequest, res) => {
  const playlistId = Number(req.params.id);
  if (!playlistId) return res.status(400).json({ error: "invalid_id" });

  const { title, notes, latitude, longitude, address, curatedPlaceId } = req.body || {};
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "missing_title" });
  }
  const lat = latitude != null ? Number(latitude) : null;
  const lon = longitude != null ? Number(longitude) : null;
  if (lat != null && lon != null && !isInKansai(lat, lon)) {
    return res.status(400).json({ error: "outside_kansai" });
  }

  try {
    const db = await getDb();
    const playlist = await db.get(
      `SELECT id, user_id FROM place_playlists WHERE id = ?`, playlistId
    );
    if (!playlist) return res.status(404).json({ error: "not_found" });
    if (Number(playlist.user_id) !== req.auth!.userId) {
      return res.status(403).json({ error: "forbidden" });
    }
    const result = await db.run(
      `INSERT INTO place_playlist_items (playlist_id, title, notes, latitude, longitude, address, curated_place_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      playlistId,
      title.trim(),
      notes ?? "",
      lat,
      lon,
      address ?? "",
      curatedPlaceId ?? null
    );
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// PATCH /playlists/items/:itemId — update title/notes
router.patch("/items/:itemId", requireAuth, async (req: AuthedRequest, res) => {
  const itemId = Number(req.params.itemId);
  if (!itemId) return res.status(400).json({ error: "invalid_id" });
  const { title, notes } = req.body || {};
  try {
    const db = await getDb();
    const item = await db.get(
      `SELECT i.id, p.user_id FROM place_playlist_items i
       JOIN place_playlists p ON p.id = i.playlist_id
       WHERE i.id = ?`,
      itemId
    );
    if (!item) return res.status(404).json({ error: "not_found" });
    if (Number(item.user_id) !== req.auth!.userId) {
      return res.status(403).json({ error: "forbidden" });
    }
    const fields: string[] = [];
    const values: any[] = [];
    if (title !== undefined) { fields.push("title = ?"); values.push(String(title).trim()); }
    if (notes !== undefined) { fields.push("notes = ?"); values.push(String(notes)); }
    if (!fields.length) return res.status(400).json({ error: "nothing_to_update" });
    values.push(itemId);
    await db.run(`UPDATE place_playlist_items SET ${fields.join(", ")} WHERE id = ?`, ...values);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// DELETE /playlists/items/:itemId
router.delete("/items/:itemId", requireAuth, async (req: AuthedRequest, res) => {
  const itemId = Number(req.params.itemId);
  if (!itemId) return res.status(400).json({ error: "invalid_id" });
  try {
    const db = await getDb();
    const item = await db.get(
      `SELECT i.id, p.user_id FROM place_playlist_items i
       JOIN place_playlists p ON p.id = i.playlist_id
       WHERE i.id = ?`,
      itemId
    );
    if (!item) return res.status(404).json({ error: "not_found" });
    if (Number(item.user_id) !== req.auth!.userId) {
      return res.status(403).json({ error: "forbidden" });
    }
    await db.run(`DELETE FROM place_playlist_items WHERE id = ?`, itemId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
