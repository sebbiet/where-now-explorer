# Deployment Guide for Where Now Explorer

The app is a static Vite + React site plus one serverless function that
proxies OpenStreetMap Nominatim. **Netlify is the primary host.** GitHub
Pages cannot run that proxy, so `/api/geocoding` would 404 there.

Geolocation only works over HTTPS. Netlify provides HTTPS automatically.
The custom domain is `thereyetapp.com` (see `public/CNAME`).

All mapping services used (Nominatim, Photon, the OSRM public demo) are
free and need no API keys. Do not add paid keys or `VITE_*` secrets: Vite
inlines those into the client bundle.

## Deploy on Netlify (free)

1. Push this repository to GitHub (already at
   https://github.com/sebbiet/where-now-explorer).
2. Sign in at [Netlify](https://www.netlify.com/) on the free (Starter) plan.
3. **Add new site → Import an existing project** and choose this repo.
4. Confirm the build settings (also set in `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `20`
   - Functions directory: `netlify/functions`
5. Deploy. Netlify will:
   - Build the static app
   - Publish `dist`
   - Serve `netlify/functions/geocoding-proxy.ts` at
     `/.netlify/functions/geocoding-proxy`
   - Rewrite `/api/geocoding/*` to that function
6. Open the generated `*.netlify.app` URL over HTTPS, allow location
   access, and check that the current-location card and destination
   search both work.

### Custom domain and HTTPS

1. In the Netlify site, open **Domain management** and add
   `thereyetapp.com`.
2. At your DNS host, point the domain at Netlify:
   - Apex: an ALIAS, ANAME, or Netlify DNS to the site, or the A records
     Netlify shows.
   - `www`: a CNAME to the Netlify site hostname.
3. Netlify will provision a Let's Encrypt certificate. Wait until HTTPS
   shows as issued before relying on geolocation.
4. Keep `public/CNAME` as `thereyetapp.com` so the domain is included in
   the build.

### What the geocoding proxy does

`netlify/functions/geocoding-proxy.ts` forwards `/search`, `/reverse` and
`/status.php` to Nominatim with a real User-Agent
(`ThereYetApp/1.1 (https://thereyetapp.com; family location app)`),
spaces requests to at most one per second, caches successful responses
for five minutes, and rate-limits each client IP to 60 requests per
minute. The browser also caches results in `GeocodingCacheService`.

Do not call `https://nominatim.openstreetmap.org` directly from the
browser: you cannot set the User-Agent header, and that breaks
Nominatim's usage policy.

## Local development

```bash
npm install
npm run dev
```

The Vite dev server (port 8080) proxies `/api/geocoding` to Nominatim and
sends a development User-Agent. Some browsers still need HTTPS for
geolocation: set `https: true` in `vite.config.ts` or test the Netlify
deploy.

```bash
npm run build
npm run preview
```

Preview does not include the Netlify function. Use `npm run dev` or a
Netlify draft deploy to test geocoding.

## Environment variables

None are required. In particular, **do not set `VITE_DEBUG_KEY`**. Any
`VITE_*` value is baked into the public JavaScript bundle. The debug
panel is available only in local development.

## GitHub Pages

The GitHub Pages workflow is disabled. Use Netlify instead so the
geocoding proxy is available.
