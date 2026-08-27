# Free PDF Safe

Convert photos and documents into a PDF, stamp a scanned signature onto the page, and scan QR codes — all in the browser. Files never upload to a server.

## What it does

- **Convert** — photos, scans, PDFs, Word (`.docx`), and text into one PDF. Reorder, rotate, pick A4 or Letter.
- **Sign** — photograph a signature (or draw one), lift the ink off the paper, then drag it onto the page.
- **Scan** — point the camera at a QR code or upload a screenshot. Copy the text or open the link.
- **Owner desk** — sign in at `/admin` to allow ads (Google AdSense), set a public notice, and edit the studio tagline.

Nothing in Convert, Sign, or Scan leaves the device until you download the file. Ads, if you turn them on, load from Google and do not receive your PDFs.

## Use it

Open the app, add it to your home screen from the browser menu, and treat it like a small studio for paper. The first signed-in person at the owner desk becomes the owner.

## Privacy

Conversion, signature cleanup, and QR decoding run locally. Signatures and recent scans stay in this browser only (`localStorage`). There is no cloud storage for documents.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
npm run typecheck
```
