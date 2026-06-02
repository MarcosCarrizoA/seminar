import { Router } from "express";
import { getDb } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { isInKansai } from "../geo/kansai";

const router = Router();

// GET /places/curated — list all curated suggestions (no auth required)
router.get("/curated", async (_req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT id, title, title_ja, description, category, address, latitude, longitude, sort_order
       FROM curated_places ORDER BY sort_order ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
