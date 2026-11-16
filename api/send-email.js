// Vercel Serverless Function - /api/send-email
// Sends a Grab-themed email with the guest's QR pass. Used by the RSVP form (default
// confirmation) and by the admin Email tab (custom subject + message template).
// Needs RESEND_KEY (and optionally FROM_EMAIL) in Vercel env vars.
import { buildEmailHtml, buildEmailText } from "../src/emailTemplate.js";
import QRCode from "qrcode";
import { HOUSES, SITE_URL, SPECTATOR } from "../src/config.js";

const RESEND_KEY = process.env.RESEND_KEY;
// Sender on the verified domain used for Koerber (smartsl-events.com). FROM_EMAIL in Vercel overrides it.
const FROM_EMAIL = (process.env.FROM_EMAIL || "").trim() || "Grab MY Hari Sukan <events@smartsl-events.com>";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!RESEND_KEY) return res.status(200).json({ ok: false, skipped: true, error: "RESEND_KEY not set in Vercel" });

  const { to, cc, bcc, name, token, house, houseHex, houseColour, challenge, subject, message, spectator, event = {} } = req.body || {};
  if (!to || !name || !token) return res.status(400).json({ ok: false, error: "Missing fields" });

  // Second safety check on the server: refuse anything that would show wrong info.
  const problems = [];
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(String(to).trim())) problems.push("invalid email address");
  if (!/^GRB-[A-Z0-9]{6}$/.test(String(token))) problems.push("invalid pass code");
  const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
  const ccList = (Array.isArray(cc) ? cc : String(cc || "").split(/[,;\s]+/)).map((x) => String(x).trim()).filter(Boolean);
  if (ccList.length > 5 || ccList.some((x) => !EMAIL.test(x))) problems.push("invalid CC address");
  const bccList = (Array.isArray(bcc) ? bcc : String(bcc || "").split(/[,;\s]+/)).map((x) => String(x).trim()).filter(Boolean);
  if (bccList.length > 5 || bccList.some((x) => !EMAIL.test(x))) problems.push("invalid BCC address");
  const h = spectator ? (house === SPECTATOR.name ? SPECTATOR : null) : HOUSES.find((x) => x.name === house);
  if (!h) problems.push("unknown house");
  else if (spectator) { /* no colour to check */ }
  else if ((houseColour && houseColour !== h.colour) || (houseHex && houseHex.toLowerCase() !== h.hex.toLowerCase())) problems.push("house colour mismatch");
  if (/\{\w+\}/.test(String(subject || "") + String(message || ""))) problems.push("unfilled template fields");
  if (problems.length) return res.status(400).json({ ok: false, error: "Not sent: " + problems.join("; ") });

  const data = { name, token, house, houseHex, houseColour, challenge, message, spectator: !!spectator, event,
    logoUrl: SITE_URL + "/hari-sukan-logo.png", qrBase: SITE_URL };
  const html = buildEmailHtml(data);
  const text = buildEmailText(data);
  // QR also as an attached image: still there when the mail app blocks pictures,
  // and easy for guests to save to their phone.
  let attachments;
  try {
    const png = await QRCode.toBuffer(String(token), { width: 600, margin: 2, errorCorrectionLevel: "M" });
    attachments = [{ filename: "Hari-Sukan-QR-" + token + ".png", content: png.toString("base64") }];
  } catch (e) { attachments = undefined; }
  const replyTo = (process.env.REPLY_TO || "").trim();

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL, to: [String(to).trim()],
        ...(ccList.length ? { cc: ccList } : {}),
        ...(bccList.length ? { bcc: bccList } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
        text,
        ...(attachments ? { attachments } : {}),
        // Joanne's subject. An old cached admin page may still send the previous "You're in - ..." subject; replace it.
        subject: subject && !/^You're in/i.test(subject) ? subject : "Grab MY Hari Sukan 2026 - Your Check-In QR Code and Event Details",
        html,
      }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ ok: false, error: out.message || "Resend error " + r.status });
    return res.status(200).json({ ok: true, id: out.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
