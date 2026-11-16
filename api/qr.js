// Vercel Serverless Function - /api/qr?c=GRB-XXXXXX
// QR image for emails, served from our own site instead of a third-party QR
// generator (third-party image hosts make spam filters more suspicious).
import QRCode from "qrcode";

export default async function handler(req, res) {
  const code = String((req.query && req.query.c) || "").toUpperCase();
  if (!/^GRB-[A-Z0-9]{6}$/.test(code)) { res.status(400).send("bad code"); return; }
  const png = await QRCode.toBuffer(code, { width: 440, margin: 2, errorCorrectionLevel: "M" });
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.status(200).send(png);
}
