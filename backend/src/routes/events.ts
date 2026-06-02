import { Router } from "express";
import { getDb } from "../db";
import { AuthedRequest, requireAuth, optionalAuth } from "../middleware/auth";
import { isInKansai, KANSAI_VIEWBOX } from "../geo/kansai";

const router = Router();

async function geocodeAddress(address: string) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("viewbox", KANSAI_VIEWBOX);
    url.searchParams.set("bounded", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "exchange-events-app/1.0" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

router.post("/geocode", optionalAuth, async (req: AuthedRequest, res) => {
  const { address } = req.body || {};
  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "missing_address" });
  }

  const geo = await geocodeAddress(address);
  if (!geo) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json(geo);
});

router.get("/", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.max_participants,
        e.starts_at,
        e.ends_at,
        e.address,
        e.latitude,
        e.longitude,
        e.cancelled_at,
        e.cancellation_reason,
        e.verification_phrase IS NOT NULL AS hasVerificationPhrase,
        COUNT(ep.user_id) AS participantCount,
        SUM(CASE WHEN ep.user_id = ? THEN 1 ELSE 0 END) AS isJoined
      FROM events e
      LEFT JOIN event_participants ep ON ep.event_id = e.id
      GROUP BY e.id
      ORDER BY e.starts_at ASC
      `,
      req.auth?.userId ?? null
    );

    const mapped = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      maxParticipants: row.max_participants,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      hasVerificationPhrase: !!row.hasVerificationPhrase,
      participantCount: Number(row.participantCount) || 0,
      isJoined: Number(row.isJoined) > 0,
      cancelledAt: row.cancelled_at ?? null,
      cancellationReason: row.cancellation_reason ?? null,
    }));

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", optionalAuth, async (req: AuthedRequest, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) return res.status(400).json({ error: "invalid_id" });

  try {
    const db = await getDb();
    const event = await db.get(
      `
      SELECT
        e.*,
        u.display_name AS creator_name
      FROM events e
      JOIN users u ON u.id = e.creator_id
      WHERE e.id = ?
      `,
      eventId
    );
    if (!event) return res.status(404).json({ error: "not_found" });

    const participants = await db.all(
      `
      SELECT
        u.id,
        u.display_name
      FROM event_participants ep
      JOIN users u ON u.id = ep.user_id
      WHERE ep.event_id = ?
      ORDER BY ep.joined_at ASC
      `,
      eventId
    );

    const participantCount = participants.length;
    const isCreator =
      req.auth && Number(req.auth.userId) === Number(event.creator_id);
    const isJoined =
      req.auth &&
      !!(await db.get(
        "SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?",
        eventId,
        req.auth.userId
      ));

    let verificationPhrase: string | null = null;
    if (event.verification_phrase && (isCreator || isJoined)) {
      verificationPhrase = event.verification_phrase;
    }

    res.json({
      id: event.id,
      title: event.title,
      description: event.description,
      maxParticipants: event.max_participants,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      address: event.address,
      latitude: event.latitude,
      longitude: event.longitude,
      hasVerificationPhrase: !!event.verification_phrase,
      verificationPhrase,
      creatorId: event.creator_id,
      creatorName: event.creator_name,
      participantCount,
      isCreator,
      isJoined: !!isJoined,
      participants,
      cancelledAt: event.cancelled_at ?? null,
      cancellationReason: event.cancellation_reason ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const {
    title,
    description,
    maxParticipants,
    startsAt,
    endsAt,
    address,
    latitude,
    longitude,
    verificationPhrase,
  } = req.body || {};

  if (!title || !description || !maxParticipants || !startsAt || !endsAt || !address) {
    return res.status(400).json({ error: "missing_fields" });
  }

  let lat = latitude ?? null;
  let lon = longitude ?? null;

  if (lat == null || lon == null) {
    const geo = await geocodeAddress(address);
    if (geo) {
      lat = geo.latitude;
      lon = geo.longitude;
    }
  }

  if (verificationPhrase && String(verificationPhrase).trim().length < 4) {
    return res.status(400).json({ error: "verification_phrase_too_short" });
  }

  // Kansai check — only validate when coords are available
  if (lat != null && lon != null && !isInKansai(lat, lon)) {
    return res.status(400).json({ error: "outside_kansai" });
  }

  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    return res.status(400).json({ error: "invalid_datetime" });
  }
  if (ends.getTime() <= starts.getTime()) {
    return res.status(400).json({ error: "ends_must_be_after_starts" });
  }

  try {
    const db = await getDb();
    const result = await db.run(
      `
      INSERT INTO events (
        creator_id, title, description, max_participants, starts_at,
        ends_at,
        address, latitude, longitude, verification_phrase
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      req.auth!.userId,
      title,
      description,
      maxParticipants,
      startsAt,
      endsAt,
      address,
      lat,
      lon,
      verificationPhrase || null
    );

    const eventId = result.lastID as number;
    // auto-join creator
    await db.run(
      "INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)",
      eventId,
      req.auth!.userId
    );

    res.status(201).json({ id: eventId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/join", requireAuth, async (req: AuthedRequest, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) return res.status(400).json({ error: "invalid_id" });

  try {
    const db = await getDb();
    const event = await db.get(
      "SELECT max_participants FROM events WHERE id = ?",
      eventId
    );
    if (!event) return res.status(404).json({ error: "not_found" });

    const row = await db.get(
      "SELECT COUNT(*) AS c FROM event_participants WHERE event_id = ?",
      eventId
    );
    const count = Number(row.c) || 0;
    if (count >= event.max_participants) {
      return res.status(400).json({ error: "event_full" });
    }

    await db.run(
      "INSERT OR IGNORE INTO event_participants (event_id, user_id) VALUES (?, ?)",
      eventId,
      req.auth!.userId
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id/join", requireAuth, async (req: AuthedRequest, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) return res.status(400).json({ error: "invalid_id" });

  try {
    const db = await getDb();
    await db.run(
      "DELETE FROM event_participants WHERE event_id = ? AND user_id = ?",
      eventId,
      req.auth!.userId
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.patch("/:id/cancel", requireAuth, async (req: AuthedRequest, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) return res.status(400).json({ error: "invalid_id" });

  const { reason } = req.body || {};
  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    return res.status(400).json({ error: "cancellation_reason_required" });
  }

  try {
    const db = await getDb();
    const event = await db.get("SELECT creator_id, cancelled_at FROM events WHERE id = ?", eventId);
    if (!event) return res.status(404).json({ error: "not_found" });
    if (Number(event.creator_id) !== req.auth!.userId) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (event.cancelled_at) {
      return res.status(400).json({ error: "already_cancelled" });
    }

    await db.run(
      `UPDATE events SET cancelled_at = datetime('now'), cancellation_reason = ? WHERE id = ?`,
      reason.trim(),
      eventId
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) return res.status(400).json({ error: "invalid_id" });

  try {
    const db = await getDb();
    const event = await db.get(
      "SELECT creator_id FROM events WHERE id = ?",
      eventId
    );
    if (!event) return res.status(404).json({ error: "not_found" });
    if (Number(event.creator_id) !== req.auth!.userId) {
      return res.status(403).json({ error: "forbidden" });
    }

    await db.run("DELETE FROM events WHERE id = ?", eventId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

