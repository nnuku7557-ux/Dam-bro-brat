const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const sharp = require("sharp");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({
  windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false,
  message: { success: false, error: "Terlalu banyak request. Coba lagi sebentar." }
}));

const esc = value => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
})[c]);

function textLines(text, max = 30) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    let remaining = word;
    while (remaining.length > max) {
      if (current) { lines.push(current); current = ""; }
      lines.push(remaining.slice(0, max));
      remaining = remaining.slice(max);
    }
    const candidate = current ? `${current} ${remaining}` : remaining;
    if (candidate.length > max && current) {
      lines.push(current);
      current = remaining;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines.slice(0, 16);
}

function wrapText(text, x, y, maxChars, lineHeight, className) {
  return textLines(text, maxChars).map((line, i) =>
    `<text class="${className}" x="${x}" y="${y + i * lineHeight}">${esc(line)}</text>`
  ).join("");
}

function svgDocument(data) {
  const sender = data.sender === "me" ? "me" : "other";
  const message = String(data.message ?? data.messageText ?? "").trim();
  const time = String(data.time || data.timestamp || "21.02").slice(0, 12);
  const carrier = String(data.status?.carrierName || "INDOSAT OORE...").slice(0, 24);
  const battery = Math.max(0, Math.min(100, Number(data.status?.batteryPercentage ?? data.batteryPercentage ?? 88) || 0));
  const signal = Math.max(0, Math.min(4, Number(data.status?.signalStrength ?? 4) || 0));
  const wifi = data.status?.wifi !== false;
  const bgUrl = String(data.backgroundUrl || "").trim();
  const hasBg = /^https?:\/\//i.test(bgUrl);
  const lines = textLines(message, 25);
  const bubbleWidth = Math.min(560, Math.max(190, Math.max(...lines.map(x => x.length), 6) * 15 + 54));
  const lineHeight = 39;
  const bubbleHeight = Math.max(86, 48 + lines.length * lineHeight);
  const bubbleX = sender === "me" ? 1024 - bubbleWidth - 32 : 32;
  const bubbleY = 370;
  const textX = bubbleX + 24;
  const textY = bubbleY + 46;
  const bubbleColor = sender === "me" ? "#075E54" : "#25272D";
  const messageSvg = lines.map((line, i) =>
    `<text x="${textX}" y="${textY + i * lineHeight}" class="msg">${esc(line)}</text>`
  ).join("");
  const quote = data.quote || data.quotedMessage;
  const quoteText = typeof quote === "string" ? quote : quote?.text || "";
  const quoteSvg = quoteText ? `
    <rect x="${bubbleX + 10}" y="${bubbleY + 12}" width="${bubbleWidth - 20}" height="62" rx="12" fill="#111820" opacity=".72"/>
    <rect x="${bubbleX + 10}" y="${bubbleY + 12}" width="4" height="62" rx="2" fill="#42C7A5"/>
    <text x="${textX + 5}" y="${bubbleY + 37}" class="quote">${esc(String(quote?.sender || "Quoted message").slice(0, 45))}</text>
    <text x="${textX + 5}" y="${bubbleY + 60}" class="quoteBody">${esc(quoteText.slice(0, 70))}</text>` : "";
  const messageOffset = quoteText ? 72 : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#10151b"/><stop offset=".52" stop-color="#071d20"/><stop offset="1" stop-color="#080b12"/>
      </linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="28"/></filter>
      <style>
        .status{font:600 23px Arial,sans-serif;fill:#f5f5f5}
        .tiny{font:500 17px Arial,sans-serif;fill:#f2f2f2}
        .msg{font:500 29px Arial,sans-serif;fill:#f8f8fa}
        .time{font:400 17px Arial,sans-serif;fill:#a9b0ba}
        .quote{font:700 19px Arial,sans-serif;fill:#55d8b6}
        .quoteBody{font:400 17px Arial,sans-serif;fill:#d8dce2}
      </style>
    </defs>
    <rect width="1024" height="1536" fill="url(#bg)"/>
    <g filter="url(#blur)" opacity=".75">
      <rect x="590" y="180" width="440" height="220" rx="40" fill="#064f46"/>
      <rect x="-70" y="500" width="650" height="210" rx="40" fill="#30333a"/>
      <rect x="160" y="820" width="820" height="190" rx="40" fill="#00665a"/>
      <rect x="40" y="1160" width="600" height="240" rx="40" fill="#22272f"/>
    </g>
    ${hasBg ? `<image href="${esc(bgUrl)}" x="0" y="0" width="1024" height="1536" opacity=".25" preserveAspectRatio="xMidYMid slice"/>` : ""}
    <rect width="1024" height="72" fill="#111318" opacity=".97"/>
    <text x="48" y="45" class="status">${esc(time)}</text>
    <text x="670" y="44" class="tiny">${esc(carrier)} · LTE</text>
    <text x="854" y="44" class="tiny">${wifi ? "Wi-Fi" : "No Wi-Fi"} · ${battery}%</text>
    <rect x="962" y="24" width="36" height="18" rx="4" fill="none" stroke="#eee" stroke-width="2"/>
    <rect x="965" y="27" width="${Math.round(30 * battery / 100)}" height="12" rx="2" fill="${battery <= 15 ? "#e74c3c" : "#35c86a"}"/>
    <g fill="#f5f5f5">${Array.from({length: signal}, (_, i) => `<rect x="${700 + i * 9}" y="${42 - i * 5}" width="6" height="${8 + i * 5}" rx="1"/>`).join("")}</g>
    <rect x="${bubbleX}" y="${bubbleY}" width="${bubbleWidth}" height="${bubbleHeight + messageOffset}" rx="30" fill="${bubbleColor}" opacity=".98"/>
    ${quoteSvg}
    ${messageSvg}
    <text x="${bubbleX + bubbleWidth - 72}" y="${bubbleY + bubbleHeight + messageOffset - 18}" class="time">${esc(time)}</text>
    <rect x="0" y="1494" width="1024" height="42" fill="#08090d"/>
    <rect x="380" y="1510" width="264" height="7" rx="4" fill="#bfc0c5"/>
  </svg>`;
  return svg;
}

app.get("/", (_req, res) => res.json({
  name: "NalaNeo iPhone Quoted API",
  status: "online",
  endpoint: "POST /v2/iphone-quoted",
  contentType: "application/json",
  output: "image/png",
  author: "NalaNeo"
}));

app.get("/health", (_req, res) => res.json({ success: true, status: "ok" }));

app.post("/v2/iphone-quoted", async (req, res) => {
  const body = req.body || {};
  const message = body.message ?? body.messageText;
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Field "message" wajib diisi.' });
  }
  if (message.length > 4000) {
    return res.status(400).json({ success: false, error: "Pesan maksimal 4000 karakter." });
  }
  try {
    const png = await sharp(Buffer.from(svgDocument(body))).png().toBuffer();
    res.set({
      "Content-Type": "image/png",
      "Content-Length": png.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    return res.status(200).send(png);
  } catch (err) {
    console.error("Image generation error:", err.message);
    return res.status(500).json({ success: false, error: "Gagal membuat gambar." });
  }
});

app.use((req, res) => res.status(404).json({ success: false, error: "Endpoint tidak ditemukan." }));
app.listen(PORT, () => console.log(`NalaNeo iPhone Quoted API listening on ${PORT}`));
