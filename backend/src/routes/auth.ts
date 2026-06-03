import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb, createDefaultPlaylistForUser } from "../db";
import { AuthedRequest, signToken, requireAuth } from "../middleware/auth";
import { getAuthCookieOptions } from "../config/cookies";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password, displayName, preferredLocale } = req.body || {};

  if (!email || !password || !displayName) {
    return res
      .status(400)
      .json({ error: "missing_fields", fields: ["email", "password", "displayName"] });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: "password_too_short" });
  }

  if (String(displayName).trim().length < 2) {
    return res.status(400).json({ error: "display_name_too_short" });
  }

  const locale =
    preferredLocale === "ja" || preferredLocale === "en"
      ? preferredLocale
      : "en";

  try {
    const db = await getDb();
    const existing = await db.get(
      "SELECT id FROM users WHERE email = ?",
      email.toLowerCase()
    );
    if (existing) {
      return res.status(409).json({ error: "email_taken" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.run(
      `
      INSERT INTO users (email, password_hash, display_name, preferred_locale)
      VALUES (?, ?, ?, ?)
      `,
      email.toLowerCase(),
      hash,
      displayName,
      locale
    );

    const userId = result.lastID as number;
    await createDefaultPlaylistForUser(db, userId, locale);
    const token = signToken({ userId });

    res
      .cookie("token", token, getAuthCookieOptions())
      .status(201)
      .json({
        id: userId,
        email,
        displayName,
        preferredLocale: locale,
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const db = await getDb();
    const user = await db.get(
      "SELECT id, password_hash, display_name, preferred_locale FROM users WHERE email = ?",
      email.toLowerCase()
    );
    if (!user) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const token = signToken({ userId: user.id });
    res
      .cookie("token", token, getAuthCookieOptions())
      .json({
        id: user.id,
        email: email.toLowerCase(),
        displayName: user.display_name,
        preferredLocale: user.preferred_locale,
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", getAuthCookieOptions()).json({ ok: true });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = await getDb();
    const user = await db.get(
      "SELECT id, email, display_name, preferred_locale FROM users WHERE id = ?",
      req.auth!.userId
    );
    if (!user) {
      return res.status(404).json({ error: "not_found" });
    }
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      preferredLocale: user.preferred_locale,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const { preferredLocale } = req.body || {};
  if (preferredLocale !== "en" && preferredLocale !== "ja") {
    return res.status(400).json({ error: "invalid_preferred_locale" });
  }

  try {
    const db = await getDb();
    await db.run(
      "UPDATE users SET preferred_locale = ? WHERE id = ?",
      preferredLocale,
      req.auth!.userId
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

