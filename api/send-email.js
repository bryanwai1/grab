// Vercel Serverless Function - /api/send-email
// Sends a Grab-themed email with the guest's QR pass. Used by the RSVP form (default
// confirmation) and by the admin Email tab (custom subject + message template).
// Needs RESEND_KEY (and optionally FROM_EMAIL) in Vercel env vars.
import { buildEmailHtml } from "../src/emailTemplate.js";
import { HOUSES, SITE_URL, ITINERARY_PDF } from "../src/config.js";

const RESEND_KEY = process.env.RESEND_KEY;
// Sender on the verified domain used for Koerber (smartsl-events.com). FROM_EMAIL in Vercel overrides it.
const FROM_EMAIL = (process.env.FROM_EMAIL || "").trim() || "Grab MY Hari Sukan <events@smartsl-events.com>";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!RESEND_KEY) return res.status(200).json({ ok: false, skipped: true, error: "RESEND_KEY not set in Vercel" });

  const { to, name, token, house, houseHex, houseColour, challenge, subject, message, event = {} } = req.body || {};
  if (!to || !name || !token) return res.status(400).json({ ok: false, error: "Missing fields" });

  // Second safety check on the server: refuse anything that would show wrong info.
  const problems = [];
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(String(to).trim())) problems.push("invalid email address");
  if (!/^GRB-[A-Z0-9]{6}$/.test(String(token))) problems.push("invalid pass code");
  const h = HOUSES.find((x) => x.name === house);
  if (!h) problems.push("unknown house");
  else if ((houseColour && houseColour !== h.colour) || (houseHex && houseHex.toLowerCase() !== h.hex.toLowerCase())) problems.push("house colour mismatch");
  if (/\{\w+\}/.test(String(subject || "") + String(message || ""))) problems.push("unfilled template fields");
  if (problems.length) return res.status(400).json({ ok: false, error: "Not sent: " + problems.join("; ") });

  // Always link to the public site. Links built on a Vercel preview address
  // open a Vercel login page for guests, so they are rebuilt here.
  const html = buildEmailHtml({
    name, token, house, houseHex, houseColour, challenge, message, event,
    passUrl: SITE_URL + "/#/pass/" + token,
    agendaUrl: SITE_URL + "/" + ITINERARY_PDF,
    logoUrl: SITE_URL + "/hari-sukan-logo.png",
  });

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL, to: [to],
        // Joanne's subject. An old cached admin page may still send the previous "You're in - ..." subject; replace it.
        subject: subject && !/^You're in/i.test(subject) ? subject : "Grab MY Hari Sukan 2026 - Your Check-In QR Code and Event Details",
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
