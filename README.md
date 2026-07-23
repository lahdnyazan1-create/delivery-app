# Zest — Production notes

Local-first food delivery PWA (Next.js App Router + Tailwind + Framer Motion).

## Run

```bash
npm install
npm run build
npm start
```

Dev: `npm run dev`

## Architecture (intentional)

- **No backend.** Cart, catalog, orders, user profile, and admin CRUD persist in `localStorage` (`zest-app-v3`).
- **Admin PIN** (`1234`) is client-side only (`sessionStorage` unlock). Suitable for demos / single-device ops — **not** real multi-user security.
- **Login** stores name + phone locally (identity mock, not OTP/auth).
- **Order tracking** uses animated stage progress (no live GPS map). Admin status updates sync instantly via shared state.

## PWA

- Manifest + PNG icons under `public/icons/`
- Service worker: `public/sw.js` (register on load)

## Deploy

Any Node host that supports Next.js 16 (Vercel, etc.):

```bash
npm run build && npm start
```

Set `metadataBase` in `src/app/layout.tsx` to your real production URL before launch.
