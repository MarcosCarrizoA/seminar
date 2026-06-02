import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import eventsRoutes from "./routes/events";
import placesRoutes from "./routes/places";
import playlistsRoutes from "./routes/playlists";
import { startReminderJob } from "./routes/jobs/reminders";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/events", eventsRoutes);
app.use("/places", placesRoutes);
app.use("/playlists", playlistsRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

startReminderJob();

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

