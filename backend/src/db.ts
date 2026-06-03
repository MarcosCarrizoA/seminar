import path from "path";
import fs from "fs";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

const DEFAULT_DB_PATH =
  process.env.SQLITE_PATH || path.join(__dirname, "..", "data", "app.db");

let dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null =
  null;

export async function getDb() {
  if (!dbPromise) {
    const dbDir = path.dirname(DEFAULT_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbPromise = open({
      filename: DEFAULT_DB_PATH,
      driver: sqlite3.Database,
    }).then(async (db) => {
      await db.exec("PRAGMA foreign_keys = ON");

      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          display_name TEXT NOT NULL,
          preferred_locale TEXT NOT NULL DEFAULT 'en',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          creator_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          max_participants INTEGER NOT NULL CHECK (max_participants >= 1),
          fee_amount REAL,
          starts_at TEXT NOT NULL,
          ends_at TEXT NOT NULL,
          address TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          verification_phrase TEXT,
          cancelled_at TEXT,
          cancellation_reason TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS event_participants (
          event_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          joined_at TEXT NOT NULL DEFAULT (datetime('now')),
          reminder_sent_at TEXT,
          PRIMARY KEY (event_id, user_id),
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS curated_places (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          title_ja TEXT,
          description TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'landmark',
          address TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS place_playlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          is_default INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS place_playlist_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          playlist_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          latitude REAL,
          longitude REAL,
          address TEXT NOT NULL DEFAULT '',
          curated_place_id INTEGER,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (playlist_id) REFERENCES place_playlists(id) ON DELETE CASCADE,
          FOREIGN KEY (curated_place_id) REFERENCES curated_places(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS event_announcements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          author_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
          FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // Lightweight migrations for existing dev DBs
      const columns = await db.all(`PRAGMA table_info(events)`);
      const colNames = new Set((columns as any[]).map((c) => c.name));

      if (!colNames.has("ends_at")) {
        await db.exec(`ALTER TABLE events ADD COLUMN ends_at TEXT`);
        await db.exec(`UPDATE events SET ends_at = starts_at WHERE ends_at IS NULL`);
      } else {
        await db.exec(`UPDATE events SET ends_at = starts_at WHERE ends_at IS NULL`);
      }
      if (!colNames.has("cancelled_at")) {
        await db.exec(`ALTER TABLE events ADD COLUMN cancelled_at TEXT`);
      }
      if (!colNames.has("cancellation_reason")) {
        await db.exec(`ALTER TABLE events ADD COLUMN cancellation_reason TEXT`);
      }
      if (!colNames.has("fee_amount")) {
        await db.exec(`ALTER TABLE events ADD COLUMN fee_amount REAL`);
      }

      // Seed curated places if empty
      const curatedCount = await db.get(`SELECT COUNT(*) AS c FROM curated_places`);
      if (Number(curatedCount.c) === 0) {
        const seedPath = path.join(
          __dirname,
          "..",
          "data",
          "kansai-curated-places.json"
        );
        const places = JSON.parse(fs.readFileSync(seedPath, "utf8")) as Array<{
          title: string;
          title_ja?: string;
          description: string;
          category: string;
          address: string;
          latitude: number;
          longitude: number;
          sort_order: number;
        }>;
        for (const p of places) {
          await db.run(
            `INSERT INTO curated_places (title, title_ja, description, category, address, latitude, longitude, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            p.title,
            p.title_ja ?? null,
            p.description,
            p.category,
            p.address,
            p.latitude,
            p.longitude,
            p.sort_order
          );
        }
      }

      // Migration: create default playlists for users who don't have one
      await seedDefaultPlaylists(db);

      return db;
    });
  }

  return dbPromise;
}

/** Create a "Places to visit" default playlist for a user and populate it with all curated places. */
export async function createDefaultPlaylistForUser(
  db: Database<sqlite3.Database, sqlite3.Statement>,
  userId: number,
  locale: string = "en"
) {
  const name = locale === "ja" ? "訪れたい場所" : "Places to visit";
  const result = await db.run(
    `INSERT INTO place_playlists (user_id, name, is_default) VALUES (?, ?, 1)`,
    userId,
    name
  );
  const playlistId = result.lastID as number;

  const curated = await db.all(`SELECT * FROM curated_places ORDER BY sort_order ASC`);
  for (const place of curated as any[]) {
    await db.run(
      `INSERT INTO place_playlist_items (playlist_id, title, notes, latitude, longitude, address, curated_place_id)
       VALUES (?, ?, '', ?, ?, ?, ?)`,
      playlistId,
      place.title,
      place.latitude,
      place.longitude,
      place.address,
      place.id
    );
  }

  return playlistId;
}

async function seedDefaultPlaylists(db: Database<sqlite3.Database, sqlite3.Statement>) {
  const users = await db.all(`SELECT id, preferred_locale FROM users`);
  for (const user of users as any[]) {
    const existing = await db.get(
      `SELECT id FROM place_playlists WHERE user_id = ? AND is_default = 1`,
      user.id
    );
    if (!existing) {
      await createDefaultPlaylistForUser(db, user.id, user.preferred_locale);
    }
  }
}
