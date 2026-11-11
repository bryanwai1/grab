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

const icon = (emoji, size = 32) =>
  `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td align="center" valign="middle" width="${size}" height="${size}" style="width:${size}px;height:${size}px;background:${SOFT};border-radius:10px;font-size:${Math.round(size * 0.5)}px;line-height:${size}px">${emoji}</td></tr></table>`;

export function buildEmailHtml(o) {
  const { name, token, house, houseHex, houseColour, challenge, passUrl, agendaUrl, logoUrl, message, event = {} } = o;
  const color = /^#[0-9a-f]{6}$/i.test(houseHex || "") ? houseHex : GREEN;
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=8&data=" + encodeURIComponent(token || "");
  const title = ((event.name || "") + " " + (event.year || "")).trim();

  const intro = String(message || `Your registration for ${title} is confirmed. You're in House **${house || ""}**.`)
    .trim().split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 8px;font:15px/1.5 Arial,sans-serif;color:${INK}">${rich(p, color).replace(/\n/g, "<br/>")}</p>`).join("");

  const detail = (emoji, k, v) => v ? `<tr>
    <td width="22" valign="top" style="padding:3px 0;font-size:14px">${emoji}</td>
    <td class="klbl" width="140" valign="top" style="padding:3px 6px;font:700 13px Arial,sans-serif;color:${INK}">${esc(k)}</td>
    <td width="10" valign="top" style="padding:3px 0;font:13px Arial,sans-serif;color:${INK}">:</td>
    <td valign="top" style="padding:3px 0;font:13px/1.4 Arial,sans-serif;color:${INK}">${v}</td></tr>` : "";

  const infoRow = (emoji, label, body) => `<tr><td style="padding:4px 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="38" valign="middle">${icon(emoji)}</td>
      <td class="lbl" width="140" valign="middle" style="padding:0 10px;font:800 12px/1.25 Arial,sans-serif;color:${DARK};text-transform:uppercase">${label}</td>
      <td valign="middle" style="border-left:1px solid #cfdcd3;padding:2px 0 2px 12px;font:13px/1.45 Arial,sans-serif;color:${INK}">${body}</td>
    </tr></table></td></tr>`;

  const dress = (event.dressCode || []).map((d, i) => "&bull; " + (i === 0 && houseColour ? esc(String(d).replace("your house colour", "")) + `<strong style="color:${color}">${esc(String(houseColour).toLowerCase())}</strong>` : esc(d))).join("<br/>");

  const rates = event.parkingRates || [];
  const parkingTable = rates.length ? `<tr><td style="padding:6px 0">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #cfdcd3;border-radius:14px;border-collapse:separate;overflow:hidden"><tr>
      <td class="pk" width="140" valign="middle" style="background:${DARK};padding:12px 14px;color:#fff;border-radius:13px 0 0 13px">
        <div style="font:800 16px/1.2 Arial,sans-serif">🅿️ PARKING RATE</div>
        <div style="font:11px/1.35 Arial,sans-serif;opacity:.85;margin-top:4px">${esc(event.venue || "")} &middot; Monday - Friday</div>
      </td>
      <td class="pk" valign="top" style="padding:0">
        <table width="100%" cellpadding="0" cellspacing="0">
        ${rates.map(([k, v], i) => `<tr style="background:${i === 0 ? SOFT : "#fff"}">
          <td width="70" style="padding:7px 12px;border-bottom:1px solid #e3ebe5;font:800 13px Arial,sans-serif;color:${INK}">${esc(v)}</td>
          <td style="padding:7px 12px 7px 0;border-bottom:1px solid #e3ebe5;font:13px Arial,sans-serif;color:${INK}">${esc(k)}</td></tr>`).join("")}
        </table>
      </td>
    </tr></table></td></tr>` : "";

  const itin = (event.emailItinerary || []).map(([t, n]) => `<tr>
      <td width="70" style="padding:5px 12px;border-bottom:1px solid #d7e6dc;font:700 12px Arial,sans-serif;color:${INK}">${esc(t)}</td>
      <td style="padding:5px 12px 5px 0;border-bottom:1px solid #d7e6dc;font:12px Arial,sans-serif;color:${INK}">${esc(n)}</td></tr>`).join("");

  const btn = (href, label, style) => href ? `<a href="${esc(href)}" target="_blank" style="display:inline-block;margin:5px;font:700 14px Arial,sans-serif;padding:10px 20px;border-radius:999px;text-decoration:none;${style}">${label}</a>` : "";
  const mapHref = event.address ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((event.venue || "") + ", " + event.address) : "";

  const logo = /^https?:\/\//.test(logoUrl || "")
    ? `<img src="${esc(logoUrl)}" height="64" alt="${esc(title)}" style="display:block;height:64px;width:auto;margin:0 auto 8px"/>` : "";

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>@media only screen and (max-width:520px){
  .stack{display:block!important;width:auto!important;border-right:0!important;padding-left:14px!important;padding-right:14px!important}
  .regl{padding-bottom:4px!important}
  .lbl{width:84px!important;padding:0 8px!important;font-size:11px!important}
  .klbl{width:92px!important}
  .pk{border-radius:13px 13px 0 0!important}
  .pk{display:block!important;width:auto!important}
  .col{display:block!important;width:auto!important;padding:0 0 12px 0!important}
}</style></head>
<body style="margin:0;padding:0;background:#eef3ef">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3ef"><tr><td align="center" style="padding:12px 8px">
<table width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#fff;border-radius:18px;overflow:hidden">

<tr><td align="center" style="background:${GREEN};background-image:linear-gradient(160deg,#00B14F 0%,#0B7A3E 100%);padding:18px 20px 16px;color:#fff">
  ${logo}
  <div style="font:900 22px/1.15 Arial,sans-serif;letter-spacing:.5px">${esc(title.toUpperCase())}</div>
</td></tr>
<tr><td style="font-size:0;line-height:0"><table width="100%" cellpadding="0" cellspacing="0"><tr>
  <td style="height:8px;background:#F2C230">&nbsp;</td><td style="height:8px;background:#E8382F">&nbsp;</td><td style="height:8px;background:${color}">&nbsp;</td>
</tr></table></td></tr>

<tr><td style="padding:16px 20px 2px">
  <p style="margin:0 0 6px;font:800 17px Arial,sans-serif;color:${INK}">Hi ${esc(name)},</p>
  ${intro}
</td></tr>

<tr><td style="padding:2px 20px">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border-radius:12px"><tr>
    <td width="44" align="center" valign="middle" style="padding:8px 0 8px 10px;font-size:24px">📱</td>
    <td valign="middle" style="padding:8px 12px;font:14px/1.45 Arial,sans-serif;color:${INK}">Keep a <strong style="color:${DARK}">screenshot of your QR code</strong> on your phone and <strong style="color:${DARK}">bring it with you</strong> on the event day for check-in at the lobby registration counter.</td>
  </tr></table>
  <p style="margin:8px 0 2px;font:14px Arial,sans-serif;color:${INK}">See you at ${esc(event.venue || "")}!</p>
</td></tr>

<tr><td style="padding:8px 20px">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border-left:6px solid #E8382F;border-radius:12px"><tr>
    <td valign="top" style="padding:10px 14px">
      <div style="font:900 14px Arial,sans-serif;color:${DARK};padding-bottom:6px;margin-bottom:4px;border-bottom:1px solid #cfdcd3">📋 YOUR REGISTRATION DETAILS</div>
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

<tr><td style="padding:4px 20px">
  <table width="100%" cellpadding="0" cellspacing="0">
    ${dress ? infoRow("👕", "Dress code", dress) : ""}
    ${event.obstacleRemark ? infoRow("🏃", "Obstacle challenge remark", rich(event.obstacleRemark)) : ""}
    ${event.parkingNote ? infoRow("🚗", "Parking", esc(event.parkingNote)) : ""}
    ${parkingTable}
    ${event.storageNote ? infoRow("🎒", "Storage of personal belongings", esc(event.storageNote)) : ""}
  </table>
</td></tr>

<tr><td style="padding:8px 20px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td class="col" width="58%" valign="top" style="padding-right:8px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border-radius:12px;overflow:hidden">
        <tr><td colspan="2" style="background:${DARK};padding:8px 12px;font:800 13px Arial,sans-serif;color:#fff;border-radius:12px 12px 0 0">📅 EVENT ITINERARY</td></tr>
        ${itin}
      </table>
    </td>
    <td class="col" width="42%" valign="top" style="padding-left:8px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF4CC;border-radius:12px"><tr><td align="center" style="padding:10px 12px">
        <div style="font:900 14px Arial,sans-serif;color:${DARK}">🏆 SPECIAL BONUS</div>
        <div style="font:13px/1.45 Arial,sans-serif;color:${INK};margin-top:6px">${rich(event.bonus || "", INK)}</div>
        <div style="font:italic 900 22px Arial,sans-serif;color:${DARK};margin-top:2px">${esc(event.bonusPoints || "")}</div>
      </td></tr></table>
    </td>
  </tr></table>
</td></tr>

<tr><td align="center" style="padding:14px 20px 4px">
  <div style="font:700 11px Arial,sans-serif;letter-spacing:4px;color:${INK};margin-bottom:8px">YOUR CHECK-IN QR</div>
  <img src="${qrUrl}" width="170" height="170" alt="QR ${esc(token)}" style="display:block;border:10px solid #fff;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.14)"/>
  <div style="font:800 18px Arial,sans-serif;letter-spacing:2px;margin-top:6px;color:${INK}">${esc(token)}</div>
</td></tr>
<tr><td align="center" style="padding:4px 12px 12px">
  ${btn(passUrl, "Open my pass", `background:${GREEN};color:#fff;border:2px solid ${GREEN}`)}
  ${btn(mapHref, "Get directions", `background:#fff;color:${DARK};border:2px solid ${DARK}`)}
  ${/^https?:\/\//.test(agendaUrl || "") ? btn(agendaUrl, "View agenda", `background:${DARK};color:#fff;border:2px solid ${DARK}`) : ""}
</td></tr>
<tr><td align="center" style="padding:0 20px 14px;font:12px Arial,sans-serif;color:${MUTED}">${esc(title)} &middot; ${esc(event.venue || "")}</td></tr>
<tr><td style="font-size:0;line-height:0"><table width="100%" cellpadding="0" cellspacing="0"><tr>
  <td style="height:8px;background:${GREEN}">&nbsp;</td><td style="height:8px;background:#F2C230">&nbsp;</td><td style="height:8px;background:#E8382F">&nbsp;</td>
</tr></table></td></tr>
</table></td></tr></table></body></html>`;
}
