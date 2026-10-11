# NalaNeo iPhone Quoted Backend

Backend Node.js untuk menghasilkan gambar simulasi screenshot chat bergaya iPhone/WhatsApp. Ini implementasi mandiri, bukan salinan kode internal Siputzx.

## Jalankan
Butuh Node.js 20+.

```bash
npm install
npm start
```

Cek `GET /health`.

## Endpoint
`POST /v2/iphone-quoted`

Header:
- `Content-Type: application/json`
- `Accept: image/png`

Contoh body:
```json
{
  "sender": "other",
  "message": "gimana",
  "timestamp": "21.02",
  "time": "21.02",
  "status": {
    "carrierName": "INDOSAT OORE...",
    "batteryPercentage": 88,
    "signalStrength": 4,
    "wifi": true
  },
  "backgroundUrl": "",
  "readStatus": true,
  "emojiStyle": "apple",
  "quote": {
    "sender": "NalaNeo",
    "text": "Pesan sebelumnya"
  }
}
```

Respons sukses adalah PNG langsung (`Content-Type: image/png`), bukan JSON. Kalau menggunakan `fetch()` di website, baca respons dengan `response.blob()`.

## Catatan
- Backend ini menghasilkan mockup gambar bergaya chat; bukan screenshot asli dari aplikasi WhatsApp atau iOS.
- `backgroundUrl` hanya dipakai jika URL HTTP(S) tersedia. Untuk keamanan dan keandalan, gunakan URL gambar yang tepercaya.
- Field yang tidak digunakan oleh renderer tetap dapat dikirim dan diabaikan.
- Gunakan `CORS_ORIGIN` untuk membatasi origin website, misalnya `https://domain-kamu.com`.
