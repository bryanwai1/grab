// Builds the confirmation email HTML (layout from Joanne's design).
// Shared by the Vercel function (api/send-email.js) and the admin preview, so both look identical.
// Email-safe: tables + inline styles only, no external CSS.

const GREEN = "#00B14F";
const DARK = "#0B5D35";
const INK = "#06180e";
const SOFT = "#EAF6EE";
const MUTED = "#4a5e53";

const esc = (v) => String(v == null ? "" : v).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
// **bold** -> green bold, everything else escaped.
const rich = (v, color = DARK) => esc(v).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${color}">$1</strong>`);

const icon = (emoji, size = 40) =>
  `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td align="center" valign="middle" width="${size}" height="${size}" style="width:${size}px;height:${size}px;background:${SOFT};border-radius:10px;font-size:${Math.round(size * 0.5)}px;line-height:${size}px">${emoji}</td></tr></table>`;

export function buildEmailHtml(o) {
  const { name, token, house, houseHex, challenge, passUrl, agendaUrl, logoUrl, message, event = {} } = o;
  const color = /^#[0-9a-f]{6}$/i.test(houseHex || "") ? houseHex : GREEN;
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=8&data=" + encodeURIComponent(token || "");
  const title = ((event.name || "") + " " + (event.year || "")).trim();

  const intro = String(message || `Your registration for ${title} is confirmed. You're in House **${house || ""}**.`)
    .trim().split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 10px;font:15px/1.55 Arial,sans-serif;color:${INK}">${rich(p, INK).replace(/\n/g, "<br/>")}</p>`).join("");

  const detail = (emoji, k, v) => v ? `<tr>
    <td width="24" valign="top" style="padding:5px 0;font-size:15px">${emoji}</td>
    <td class="klbl" width="150" valign="top" style="padding:5px 6px;font:700 13px Arial,sans-serif;color:${INK}">${esc(k)}</td>
    <td width="10" valign="top" style="padding:5px 0;font:13px Arial,sans-serif;color:${INK}">:</td>
    <td valign="top" style="padding:5px 0;font:13px/1.45 Arial,sans-serif;color:${INK}">${v}</td></tr>` : "";

  const infoRow = (emoji, label, body) => `<tr><td style="padding:6px 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="48" valign="middle">${icon(emoji)}</td>
      <td class="lbl" width="150" valign="middle" style="padding:0 12px;font:800 13px/1.25 Arial,sans-serif;color:${DARK};text-transform:uppercase">${label}</td>
      <td valign="middle" style="border-left:1px solid #cfdcd3;padding:2px 0 2px 14px;font:13px/1.5 Arial,sans-serif;color:${INK}">${body}</td>
    </tr></table></td></tr>`;

  const dress = (event.dressCode || []).map((d, i) => "&bull; " + esc(i === 0 && house ? String(d).replace("your house colour", "your House colour") : d)).join("<br/>");

  const rates = event.parkingRates || [];
  const parkingTable = rates.length ? `<tr><td style="padding:10px 0">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #cfdcd3;border-radius:14px;border-collapse:separate;overflow:hidden"><tr>
      <td class="pk" width="150" valign="middle" style="background:${DARK};padding:16px;color:#fff;border-radius:13px 0 0 13px">
        <div style="font-size:30px;line-height:1">🅿️🚗</div>
        <div style="font:800 18px/1.15 Arial,sans-serif;margin-top:8px">PARKING<br/>RATE</div>
        <div style="font:12px Arial,sans-serif;opacity:.85;margin-top:4px">(${esc(event.venue || "")})</div>
        <div style="font:700 11px Arial,sans-serif;margin-top:8px;opacity:.9">Monday - Friday</div>
      </td>
      <td class="pk" valign="top" style="padding:0">
        <table width="100%" cellpadding="0" cellspacing="0">
        ${rates.map(([k, v], i) => `<tr style="background:${i === 0 ? SOFT : "#fff"}">
          <td width="80" style="padding:10px 12px;border-bottom:1px solid #e3ebe5;font:800 13px Arial,sans-serif;color:${INK}">${esc(v)}</td>
          <td style="padding:10px 12px 10px 0;border-bottom:1px solid #e3ebe5;font:13px Arial,sans-serif;color:${INK}">${esc(k)}</td></tr>`).join("")}
        </table>
      </td>
    </tr></table></td></tr>` : "";

  const itin = (event.emailItinerary || []).map(([t, n]) => `<tr>
      <td width="70" style="padding:7px 12px;border-bottom:1px solid #d7e6dc;font:700 12px Arial,sans-serif;color:${INK}">${esc(t)}</td>
      <td style="padding:7px 12px 7px 0;border-bottom:1px solid #d7e6dc;font:12px Arial,sans-serif;color:${INK}">${esc(n)}</td></tr>`).join("");

  const btn = (href, label, style) => href ? `<a href="${esc(href)}" target="_blank" style="display:inline-block;margin:5px;font:700 14px Arial,sans-serif;padding:12px 24px;border-radius:999px;text-decoration:none;${style}">${label}</a>` : "";
  const mapHref = event.address ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((event.venue || "") + ", " + event.address) : "";

  const logo = /^https?:\/\//.test(logoUrl || "")
    ? `<img src="${esc(logoUrl)}" height="96" alt="${esc(title)}" style="display:block;height:96px;width:auto;margin:0 auto 12px"/>` : "";

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>@media only screen and (max-width:520px){
  .stack{display:block!important;width:auto!important;border-right:0!important;padding-left:14px!important;padding-right:14px!important}
  .regl{padding-bottom:4px!important}
  .lbl{width:96px!important;padding:0 8px!important;font-size:12px!important}
  .klbl{width:96px!important}
  .pk{display:block!important;width:auto!important;border-radius:13px 13px 0 0!important}
  .col{display:block!important;width:auto!important;padding:0 0 12px 0!important}
}</style></head>
<body style="margin:0;padding:0;background:#eef3ef">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3ef"><tr><td align="center" style="padding:20px 10px">
<table width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#fff;border-radius:18px;overflow:hidden">

<tr><td align="center" style="background:${GREEN};background-image:linear-gradient(160deg,#00B14F 0%,#0B7A3E 100%);padding:26px 24px 22px;color:#fff">
  ${logo}
  <div style="font:900 28px/1.15 Arial,sans-serif;letter-spacing:.5px">${esc(title.toUpperCase())}</div>
</td></tr>
<tr><td style="font-size:0;line-height:0"><table width="100%" cellpadding="0" cellspacing="0"><tr>
  <td style="height:8px;background:#F2C230">&nbsp;</td><td style="height:8px;background:#E8382F">&nbsp;</td><td style="height:8px;background:${color}">&nbsp;</td>
</tr></table></td></tr>

<tr><td style="padding:22px 24px 4px">
  <p style="margin:0 0 6px;font:800 17px Arial,sans-serif;color:${INK}">Hi ${esc(name)},</p>
  ${intro}
</td></tr>

<tr><td style="padding:4px 24px">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border-radius:12px"><tr>
    <td width="56" align="center" valign="middle" style="padding:12px 0 12px 12px;font-size:30px">📱</td>
    <td valign="middle" style="padding:12px 14px;font:15px/1.5 Arial,sans-serif;color:${INK}">Keep a <strong style="color:${DARK}">screenshot of your QR code</strong> on your phone and <strong style="color:${DARK}">bring it with you</strong> on the event day for check-in at the lobby registration counter.</td>
  </tr></table>
  <p style="margin:12px 0 4px;font:14px Arial,sans-serif;color:${INK}">See you at ${esc(event.venue || "")}!</p>
</td></tr>

<tr><td style="padding:10px 24px">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border-left:6px solid #E8382F;border-radius:12px"><tr>
    <td class="stack regl" width="150" valign="middle" style="padding:16px 12px 16px 16px;border-right:1px solid #cfdcd3">
      <div style="font-size:28px;line-height:1">📋</div>
      <div style="font:900 16px/1.2 Arial,sans-serif;color:${DARK};margin-top:6px">YOUR REGISTRATION DETAILS</div>
    </td>
    <td class="stack" valign="top" style="padding:12px 14px">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detail("👤", "Full Name", esc(name))}
        ${detail("👥", "Representing House", house ? `<strong style="color:${color}">${esc(house)}</strong>` : "")}
        ${detail("🏆", "Challenge", esc(challenge))}
        ${detail("📅", "Date", esc(event.dateLong))}
        ${detail("🕗", "Time", esc(event.eventTime))}
        ${detail("📍", "Venue & Address", `<strong>${esc(event.venue)}</strong><br/>${esc(event.address)}`)}
        ${detail("🗂️", "Registration Counter", esc(event.counterTime))}
      </table>
    </td>
  </tr></table>
</td></tr>

<tr><td style="padding:6px 24px">
  <table width="100%" cellpadding="0" cellspacing="0">
    ${dress ? infoRow("👕", "Dress code", dress) : ""}
    ${event.obstacleRemark ? infoRow("🏃", "Obstacle challenge remark", rich(event.obstacleRemark)) : ""}
    ${event.parkingNote ? infoRow("🚗", "Parking", esc(event.parkingNote)) : ""}
    ${parkingTable}
    ${event.storageNote ? infoRow("🎒", "Storage of personal belongings", esc(event.storageNote)) : ""}
  </table>
</td></tr>

<tr><td style="padding:10px 24px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td class="col" width="58%" valign="top" style="padding-right:8px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border-radius:12px;overflow:hidden">
        <tr><td colspan="2" style="background:${DARK};padding:10px 12px;font:800 14px Arial,sans-serif;color:#fff;border-radius:12px 12px 0 0">📅 EVENT ITINERARY</td></tr>
        ${itin}
      </table>
    </td>
    <td class="col" width="42%" valign="top" style="padding-left:8px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF4CC;border-radius:12px"><tr><td align="center" style="padding:14px 12px">
        <div style="font:900 15px Arial,sans-serif;color:${DARK}">🏆 SPECIAL BONUS</div>
        <div style="font:14px/1.5 Arial,sans-serif;color:${INK};margin-top:8px">${rich(event.bonus || "", INK)}</div>
        <div style="font:italic 900 24px Arial,sans-serif;color:${DARK};margin-top:2px">${esc(event.bonusPoints || "")}</div>
      </td></tr></table>
    </td>
  </tr></table>
</td></tr>

<tr><td align="center" style="padding:22px 24px 8px">
  <div style="font:700 11px Arial,sans-serif;letter-spacing:4px;color:${INK};margin-bottom:12px">YOUR CHECK-IN QR</div>
  <img src="${qrUrl}" width="200" height="200" alt="QR ${esc(token)}" style="display:block;border:10px solid #fff;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.14)"/>
  <div style="font:800 18px Arial,sans-serif;letter-spacing:2px;margin-top:10px;color:${INK}">${esc(token)}</div>
</td></tr>
<tr><td align="center" style="padding:8px 16px 18px">
  ${btn(passUrl, "Open my pass", `background:${GREEN};color:#fff;border:2px solid ${GREEN}`)}
  ${btn(mapHref, "Get directions", `background:#fff;color:${DARK};border:2px solid ${DARK}`)}
  ${/^https?:\/\//.test(agendaUrl || "") ? btn(agendaUrl, "View agenda", `background:${DARK};color:#fff;border:2px solid ${DARK}`) : ""}
</td></tr>
<tr><td align="center" style="padding:0 24px 20px;font:12px Arial,sans-serif;color:${MUTED}">${esc(title)} &middot; ${esc(event.venue || "")}</td></tr>
<tr><td style="font-size:0;line-height:0"><table width="100%" cellpadding="0" cellspacing="0"><tr>
  <td style="height:8px;background:${GREEN}">&nbsp;</td><td style="height:8px;background:#F2C230">&nbsp;</td><td style="height:8px;background:#E8382F">&nbsp;</td>
</tr></table></td></tr>
</table></td></tr></table></body></html>`;
}
