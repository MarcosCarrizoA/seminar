import cron from "node-cron";
import nodemailer from "nodemailer";
import { getDb } from "../../db";

export function startReminderJob() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@example.com";
  const hoursBefore = process.env.REMINDER_HOURS_BEFORE
    ? Number(process.env.REMINDER_HOURS_BEFORE)
    : 24;

  const smtpConfigured = host && port && user && pass;

  const transporter = smtpConfigured
    ? nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
    : null;

  // every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      const db = await getDb();
      const now = new Date();
      const windowStart = new Date(
        now.getTime() + (hoursBefore - 0.5) * 60 * 60 * 1000
      );
      const windowEnd = new Date(
        now.getTime() + (hoursBefore + 0.5) * 60 * 60 * 1000
      );

      const rows = await db.all(
        `
        SELECT
          e.id AS event_id,
          e.title,
          e.starts_at,
          e.address,
          e.verification_phrase,
          u.email,
          u.display_name,
          u.preferred_locale,
          ep.user_id
        FROM events e
        JOIN event_participants ep ON ep.event_id = e.id
        JOIN users u ON u.id = ep.user_id
        WHERE
          datetime(e.starts_at) BETWEEN datetime(?) AND datetime(?)
          AND ep.reminder_sent_at IS NULL
        `,
        windowStart.toISOString(),
        windowEnd.toISOString()
      );

      for (const row of rows as any[]) {
        const locale = row.preferred_locale === "ja" ? "ja" : "en";
        const subject =
          locale === "ja"
            ? `イベントのリマインダー: ${row.title}`
            : `Reminder: ${row.title}`;
        const phraseLine =
          row.verification_phrase && row.verification_phrase.length > 0
            ? locale === "ja"
              ? `<p>会場でこのフレーズを主催者に伝えてください: <strong>${row.verification_phrase}</strong></p>`
              : `<p>At the event, tell the host this phrase: <strong>${row.verification_phrase}</strong></p>`
            : "";

        const body =
          locale === "ja"
            ? `<p>${row.display_name} さん</p>
<p>イベント「${row.title}」がもうすぐ始まります。</p>
<p><strong>開始時間:</strong> ${row.starts_at}</p>
<p><strong>場所:</strong> ${row.address}</p>
${phraseLine}
<p>アプリからイベント詳細も確認できます。</p>`
            : `<p>Hi ${row.display_name},</p>
<p>Your event <strong>${row.title}</strong> is starting soon.</p>
<p><strong>Start time:</strong> ${row.starts_at}</p>
<p><strong>Address:</strong> ${row.address}</p>
${phraseLine}
<p>You can also open the event in the app for more details.</p>`;

        if (!transporter) {
          console.log(
            "[reminder] Would send email to",
            row.email,
            "subject:",
            subject
          );
        } else {
          await transporter.sendMail({
            from,
            to: row.email,
            subject,
            html: body,
          });
        }

        await db.run(
          "UPDATE event_participants SET reminder_sent_at = datetime('now') WHERE event_id = ? AND user_id = ?",
          row.event_id,
          row.user_id
        );
      }
    } catch (err) {
      console.error("[reminder] job failed", err);
    }
  });
}

