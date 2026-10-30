// Vercel Serverless Function - /api/send-email
// Sends a Grab-themed email with the guest's QR pass. Used by the RSVP form (default
// confirmation) and by the admin Email tab (custom subject + message template).
// Needs RESEND_KEY (and optionally FROM_EMAIL) in Vercel env vars.
const RESEND_KEY = process.env.RESEND_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Grab MY Hari Sukan <rsvp@smartsolutionsevent.my>";

const DEFAULT_MESSAGE =
  "Your RSVP is confirmed. Show this QR at the lobby desk to check in, then at the gift counter to collect your door gift (one per pass).";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!RESEND_KEY) return res.status(200).json({ ok: false, skipped: true, error: "RESEND_KEY not set in Vercel" });

  const { to, name, token, house, houseHex, department, passUrl, logoUrl, subject, message, event = {} } = req.body || {};
  if (!to || !name || !token) return res.status(400).json({ ok: false, error: "Missing fields" });

  const esc = (v) => String(v == null ? "" : v).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const color = /^#[0-9a-f]{6}$/i.test(houseHex || "") ? houseHex : "#00B14F";
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=8&data=" + encodeURIComponent(token);
  const row = (k, v) => v ? `<tr><td style="padding:9px 0;border-bottom:1px solid #dde6dd;font:12px Arial;color:#6b7f74;text-transform:uppercase;letter-spacing:1px;width:38%">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #dde6dd;font:600 15px Arial;color:#06180e">${esc(v)}</td></tr>` : "";
  // Message: blank line = new paragraph, single newline = line break.
  const paras = String(message || DEFAULT_MESSAGE).trim().split(/\n\s*\n/)
    .map((p) => `<p style="font:15px Arial;color:#2b4235;line-height:1.6;margin:0 0 14px">${esc(p).replace(/\n/g, "<br/>")}</p>`).join("");
  const logo = /^https:\/\//.test(logoUrl || "")
    ? `<img src="${esc(logoUrl)}" height="64" alt="${esc(event.name || "Grab")}" style="display:block;height:64px;margin-bottom:14px"/>` : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f1f6f1">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:26px 12px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden">
<tr><td style="background:#00B14F;padding:26px 32px 22px;color:#fff">
  ${logo}
  <div style="font:600 13px Arial;letter-spacing:2px;opacity:.92">${esc((event.name || "").toUpperCase())} ${esc(event.year || "")}</div>
  <div style="font:800 30px Arial;margin-top:6px">${esc(event.dateLong || "")}</div>
</td></tr>
<tr><td style="background:${color};height:10px;line-height:10px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:26px 32px 0">
  <p style="font:16px Arial;color:#06180e;margin:0 0 12px">Hi <strong>${esc(name)}</strong>,</p>
  ${paras}
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px">${row("Pass code", token)}${row("House", house)}${row("Department", department)}${row("Date", event.dateLong)}${row("Venue", event.venue)}${row("Doors open", event.doorsOpen)}</table>
</td></tr>
<tr><td align="center" style="padding:26px 32px">
  <div style="font:600 11px Arial;letter-spacing:3px;color:#6b7f74;text-transform:uppercase;margin-bottom:12px">Your check-in QR</div>
  <img src="${qrUrl}" width="220" height="220" alt="QR ${esc(token)}" style="display:block;border:8px solid #fff;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.12)"/>
  <div style="font:700 18px Arial;letter-spacing:2px;margin-top:10px;color:#06180e">${esc(token)}</div>
  ${passUrl ? `<a href="${esc(passUrl)}" style="display:inline-block;margin-top:18px;background:#00B14F;color:#fff;font:700 15px Arial;padding:13px 26px;border-radius:999px;text-decoration:none">Open my pass</a>` : ""}
</td></tr>
<tr><td align="center" style="padding:0 32px 26px;font:12px Arial;color:#6b7f74">${esc(event.name || "")} ${esc(event.year || "")} &middot; ${esc(event.venue || "")}</td></tr>
</table></td></tr></table></body></html>`;

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
