// Vercel Serverless Function - /api/send-email
// Sends a Grab-themed email with the guest's QR pass. Used by the RSVP form (default
// confirmation) and by the admin Email tab (custom subject + message template).
// Needs RESEND_KEY (and optionally FROM_EMAIL) in Vercel env vars.
import { buildEmailHtml } from "../src/emailTemplate.js";

const RESEND_KEY = process.env.RESEND_KEY;
// Sender on the verified domain used for Koerber (smartsl-events.com). FROM_EMAIL in Vercel overrides it.
const FROM_EMAIL = (process.env.FROM_EMAIL || "").trim() || "Grab MY Hari Sukan <events@smartsl-events.com>";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!RESEND_KEY) return res.status(200).json({ ok: false, skipped: true, error: "RESEND_KEY not set in Vercel" });

  const { to, name, token, house, houseHex, challenge, passUrl, agendaUrl, logoUrl, subject, message, event = {} } = req.body || {};
  if (!to || !name || !token) return res.status(400).json({ ok: false, error: "Missing fields" });

  const html = buildEmailHtml({ name, token, house, houseHex, challenge, passUrl, agendaUrl, logoUrl, message, event });

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL, to: [to],
        subject: subject || "You're in - " + (event.name || "RSVP") + " (House " + house + ")",
        html,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ ok: false, error: data.message || "Resend error " + r.status });
    return res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
