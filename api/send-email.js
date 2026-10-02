// Vercel Serverless Function - /api/send-email
// Sends the RSVP confirmation with the QR pass. Needs RESEND_KEY (and optionally FROM_EMAIL) in Vercel env vars.
const RESEND_KEY = process.env.RESEND_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Grab MY Hari Sukan <rsvp@smartsolutionsevent.my>";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!RESEND_KEY) return res.status(200).json({ ok: false, skipped: true, error: "RESEND_KEY not set" });

  const { to, name, token, house, houseHex, department, passUrl, event = {} } = req.body || {};
  if (!to || !name || !token) return res.status(400).json({ ok: false, error: "Missing fields" });

  const esc = (v) => String(v == null ? "" : v).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const color = /^#[0-9a-f]{6}$/i.test(houseHex || "") ? houseHex : "#00B14F";
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=8&data=" + encodeURIComponent(passUrl || token);
  const row = (k, v) => `<tr><td style="padding:9px 0;border-bottom:1px solid #dde6dd;font:12px Arial;color:#6b7f74;text-transform:uppercase;letter-spacing:1px;width:38%">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #dde6dd;font:600 15px Arial;color:#06180e">${esc(v)}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f1f6f1">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:26px 12px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden">
<tr><td style="background:${color};padding:28px 32px;color:#fff">
  <div style="font:600 13px Arial;letter-spacing:2px;opacity:.9">${esc((event.name || "").toUpperCase())} ${esc(event.year || "")}</div>
  <div style="font:800 34px Arial;margin-top:6px">House ${esc(house)}</div>
</td></tr>
<tr><td style="padding:26px 32px 0">
  <p style="font:16px Arial;color:#06180e;margin:0 0 8px">Hi <strong>${esc(name)}</strong>,</p>
  <p style="font:15px Arial;color:#2b4235;line-height:1.6;margin:0 0 18px">Your RSVP is confirmed. Show this QR at the lobby desk to check in, then at the gift counter to collect your door gift (one per pass).</p>
  <table width="100%" cellpadding="0" cellspacing="0">${row("Pass code", token)}${row("Department", department)}${row("Date", event.dateLong)}${row("Venue", event.venue)}${row("Doors open", event.doorsOpen)}</table>
</td></tr>
<tr><td align="center" style="padding:26px 32px">
  <img src="${qrUrl}" width="220" height="220" alt="QR ${esc(token)}" style="display:block;border:8px solid #fff;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.12)"/>
  <div style="font:700 18px Arial;letter-spacing:2px;margin-top:10px;color:#06180e">${esc(token)}</div>
  ${passUrl ? `<a href="${esc(passUrl)}" style="display:inline-block;margin-top:18px;background:#00B14F;color:#fff;font:700 15px Arial;padding:13px 26px;border-radius:999px;text-decoration:none">Open my pass</a>` : ""}
</td></tr>
</table></td></tr></table></body></html>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject: "You're in - " + (event.name || "RSVP") + " (House " + house + ")", html }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ ok: false, error: data.message || "Resend error" });
    return res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
