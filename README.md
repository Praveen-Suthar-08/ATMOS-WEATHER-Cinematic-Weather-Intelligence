# ATMOS WEATHER — Cinematic Weather Intelligence

> **"Understand the weather at a glance, and plan the next hours and days with confidence."**

A premium, production-minded weather dashboard built with **React 19 + TypeScript + Vite + Tailwind CSS v4**.
Real data only — every temperature, forecast, radar frame and timestamp comes from a live provider response or is clearly labelled as cached. No fabricated weather, ever.

| | |
|---|---|
| **Author** | **Praveen Suthar** — Weather Intelligence Architect |
| **GitHub** | (https://github.com/Praveen-Suthar-08/ATMOS-WEATHER-Cinematic-Weather-Intelligence.git) |
| **Data** | [Open-Meteo](https://open-meteo.com/) (forecast, geocoding, archive) · [RainViewer](https://www.rainviewer.com/) (radar) |
| **License of data** | Open-Meteo data under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — attribution shown in-app |

---

## Table of Contents

1. [Features](#1-features)
2. [Architecture](#2-architecture)
3. [Data Flow](#3-data-flow)
4. [API Integration](#4-api-integration)
5. [Caching & Request Budget](#5-caching--request-budget)
6. [Theming & Design System](#6-theming--design-system)
7. [Units, Timezones & Time Handling](#7-units-timezones--time-handling)
8. [Security](#8-security)
9. [Privacy](#9-privacy)
10. [Scaling to 1000+ Concurrent Users](#10-scaling-to-1000-concurrent-users)
11. [Performance](#11-performance)
12. [Accessibility](#12-accessibility)
13. [Local Development](#13-local-development)
14. [Environment Variables](#14-environment-variables)
15. [Deployment](#15-deployment)
16. [Testing Status](#16-testing-status)
17. [Known Limitations](#17-known-limitations)
18. [Roadmap](#18-roadmap)
19. [Attribution & Licensing](#19-attribution--licensing)
20. [Author](#20-author)

---

## 1. Features

### Weather intelligence
- **Cinematic hero** — condition- and time-aware background photography across 8 states
  (clear day, night, cloudy, rain, thunderstorm, snow, fog, golden-hour sunset/sunrise),
  with an animated atmospheric layer (drifting clouds, rain, snow, fog, stars) and smooth crossfades.
- **Current conditions** — temperature, feels-like, condition label, high/low, local live clock
  in the *location's* timezone (updates every 30 s).
- **Daily Briefing** — a generated plain-language summary of today + tomorrow from real forecast values.
- **Weather Mood banner + advisories** — contextual guidance (heat, storm, wind, UV…) and
  rule-based advisories that only appear when thresholds are actually crossed.
- **24-hour forecast** — Recharts area chart (theme-aware axes/tooltips), horizontally scrollable
  hourly cards with icons, temperature and rain probability, and a selected-hour detail panel.
- **Temp & Rain timeline** — dual-axis 24 h temperature + precipitation-probability chart.
- **7-day outlook** — icons, condition, high/low temperature range bars, precipitation probability.
- **Metrics grid** — humidity, wind + compass direction, gusts, precipitation, sunrise, sunset,
  rain chance, and **moon phase** (phase name, icon, illumination %).
- **Sunrise & Sunset arc** — SVG daylight arc with live sun position and daylight duration.
- **Moonrise / Moonset** times in the hero's "More details" dropdown (opens beside the button, never overlapping content).
- **15-minute nowcast** — short-term precipitation (with rain/shower breakdown) when the provider returns it,
  honest "dry conditions" summary when values are genuinely zero.
- **Historical context** — today vs yesterday (high/low/rain) from the Open-Meteo archive API.
- **Smart insights** — rain peak, warmest window, wind outlook, moon-phase note — all derived from fetched arrays.
- **Activity suitability scores** — outdoor / running / cycling / stargazing scores with progress bars.
- **Outfit recommendation** — clothing guidance from temperature, rain probability and wind.
- **Air quality service** — `fetchAirQuality` + `useAirQuality` are implemented in the data layer
  (US AQI, EU AQI, PM2.5, PM10, ozone); a UI panel can be enabled from the service without new plumbing.

### Location
- **Global search** (city or postcode) with 220 ms debounce, keyboard navigation
  (↑/↓/Enter/Escape), disambiguated results ("Bengaluru, Karnataka, India") and a "Top match" badge.
- **Smart ranking** — exact/population/feature-code aware ranking; alias handling
  (`bangalore → bengaluru`, `bombay → mumbai`, …); numeric postcodes get locale-country bias
  and an OpenStreetMap Nominatim fallback so valid pincodes resolve.
- **Use my location** — only on explicit click; coordinates are reverse-geocoded to
  "City, State, Country" and rounded to 3 decimals before storage.
- **Favorites & recent searches** — persisted locally, duplicates prevented, one-tap switching.
- **City comparison** — selected city + favorites (max 4), each with live local time, condition, temperature.

### Radar
- **Real RainViewer precipitation radar** — timeline scrubber, play/pause (disabled under
  `prefers-reduced-motion`), zoom control, intensity legend, frame timestamp, and an explicit
  attribution block. Loading / error / no-frames states are honest — never a fake radar.

### Personalisation & platform
- **Themes** — Light / Dark / System, persisted; System tracks OS changes live.
  Every card, chart axis, tooltip and label is theme-aware (WCAG-conscious contrast in both).
- **Units** — °C/°F, km/h · mph · m/s, mm/in; **clock** — System / 12 h / 24 h with visible format tags.
- **Shareable deep link** — copies a URL with city + preferences; inbound links are validated
  (coordinate ranges, capped label length) before use.
- **Copy weather summary** — one-click plain-text summary card.
- **Smart notifications** — opt-in browser notifications flow (never auto-prompted).
- **Reliability center** — data source, freshness (live vs stale/cached), last update, refresh policy.
- **Offline & stale handling** — offline banner, per-location cached snapshots with a clear
  "cached/stale" label and age, retry controls, auto-refresh every 10 minutes while the tab is visible.
- **Clear local data** — one confirmed action wipes favorites, recents and preferences.

---

## 2. Architecture

Frontend-only SPA. No backend, no database, no accounts — by design (privacy + zero hosting cost).
All provider logic lives behind a typed service layer so the weather provider can be swapped
without touching UI components.

```
┌──────────────────────────────────────────────────────────────────┐
│  UI Layer (React components)                                     │
│  App.tsx · RadarPanel · WeatherTimeline · SunriseSunsetArc ·     │
│  WeatherMoodBanner · OutfitRecommendation · WeatherSummaryCard · │
│  MoonPhaseDisplay · WeatherBackground · WeatherConditionIcon     │
├──────────────────────────────────────────────────────────────────┤
│  State & Data Hooks (TanStack Query + localStorage)              │
│  useWeather · useLocationSearch · useRadar · useAirQuality ·     │
│  usePreferences · useFavorites · useRecentSearches ·             │
│  useOnlineStatus · useDebouncedValue                             │
├──────────────────────────────────────────────────────────────────┤
│  Service Layer (typed, validated, cancellable)                   │
│  openMeteoClient (forecast / geocoding / archive / air quality)  │
│  rainViewer (radar metadata + tile URLs)                         │
│  locationLabelService (reverse geocoding)                        │
├──────────────────────────────────────────────────────────────────┤
│  Utilities                                                       │
│  units (conversions) · dateTime (timezone-safe formatting) ·     │
│  weatherCode (WMO mapping) · insights · storage (safe wrappers)  │
├──────────────────────────────────────────────────────────────────┤
│  Providers (Open-Meteo · RainViewer · OSM Nominatim · BigDataCloud)│
└──────────────────────────────────────────────────────────────────┘
```

### Repository layout

```
src/
  App.tsx                     # Dashboard composition + interaction wiring
  main.tsx                    # Entry (providers + app)
  index.css                   # Design tokens (CSS vars), theme, weather FX, reduced motion
  vite-env.d.ts               # Typed environment variables
  app/
    providers.tsx             # TanStack Query client (cache policy)
  components/
    RadarPanel.tsx            # RainViewer radar timeline
    WeatherTimeline.tsx       # Dual-axis temp/rain chart
    SunriseSunsetArc.tsx      # Daylight arc SVG
    WeatherMoodBanner.tsx     # Condition-driven guidance banner
    OutfitRecommendation.tsx  # Clothing guidance
    WeatherSummaryCard.tsx    # Copyable summary
    MoonPhaseDisplay.tsx      # Lunar phase
    WeatherBackground.tsx     # Animated atmospheric layer
    WeatherConditionIcon.tsx  # WMO code → Lucide icon
    HourlyTemperatureChart.tsx# (legacy hourly chart component)
  hooks/                      # Query + preference + persistence hooks (see above)
  services/                   # Provider clients (see above)
  types/models.ts             # App-owned TypeScript models (no raw API JSON in UI)
  utils/                      # Conversions, time, weather codes, insights, storage
public/
  images/                     # 8 cinematic hero backgrounds
  _headers                    # Security + cache headers (Netlify / Cloudflare Pages)
vercel.json                   # Security + cache headers (Vercel)
.env.example                  # Configuration template (no real secrets)
```

### Key design decisions
- **Canonical units internally** (°C, km/h, mm). Conversion happens once, at display time — never double-converted.
- **Location timezone is authoritative.** All displayed times use the API-returned timezone,
  never the visitor's browser timezone. Open-Meteo's offset-less local time strings are parsed
  as wall-clock values (not UTC) to avoid off-by-hours bugs near midnight/DST.
- **App-owned models.** Raw provider JSON is validated and normalised in the service layer;
  missing values become `null` and render as "–", never as a misleading `0`.
- **Provider replaceability.** Endpoint URLs (and an optional commercial API key) are
  environment-configurable — see [§14](#14-environment-variables).

---

## 3. Data Flow

```
User selects/searches a city
        │
        ▼
Geocoding (debounced 220 ms, AbortController cancels stale queries)
        │  ranked results → user picks one
        ▼
TanStack Query  ── cache hit (fresh) ──► render instantly, 0 network calls
        │ cache miss/stale
        ▼
Service layer fetch (9 s timeout, 1 bounded retry + 600 ms backoff on 5xx/429/network)
        │
        ├──► Forecast (current + 24 h + 7 d + moon data)
        ├──► 15-min nowcast          (parallel, independent failure states)
        ├──► Yesterday archive       (parallel)
        ├──► Comparison cities ≤ 3   (parallel, per-city states)
        └──► Radar metadata          (shared, 5-min cache)
        │
        ▼
Normalised snapshot → rendered + written to localStorage snapshot cache
        │
        └── on network failure → cached snapshot rendered with "stale/cached" label
```

Auto-refresh: every 10 minutes **only while the tab is visible** and online.
Manual refresh always available with a visible loading state.

---

## 4. API Integration

| Purpose | Endpoint (default) | Key required |
|---|---|---|
| Forecast (current/hourly/daily/moon) | `https://api.open-meteo.com/v1/forecast` | No (free tier) |
| Geocoding search | `https://geocoding-api.open-meteo.com/v1/search` | No |
| 15-min nowcast | forecast endpoint, `minutely_15` | No |
| Yesterday comparison | `https://archive-api.open-meteo.com/v1/archive` | No |
| Air quality (service layer) | `https://air-quality-api.open-meteo.com/v1/air-quality` | No |
| Radar metadata + tiles | `https://api.rainviewer.com/public/weather-maps.json` + tile CDN | No |
| Postcode fallback search | `https://nominatim.openstreetmap.org/search` | No |
| Reverse geocoding (My location) | `https://api.bigdatacloud.net/data/reverse-geocode-client` | No |

Requests request **only the fields the UI uses**, are built with `URLSearchParams`
(no string concatenation), and every response is shape-validated before rendering.

**Reliability policy**
- `AbortController` cancels superseded search/weather requests — a slow response for
  City A can never overwrite City B.
- 9 s timeout; exactly **one** bounded retry (600 ms backoff) for transient failures
  (network, 5xx, 429). 4xx/input errors are never retried.
- Malformed payloads degrade to empty/missing states — the app never crashes on bad data
  and never invents a successful result.

---

## 5. Caching & Request Budget

| Layer | Where | Freshness | Effect |
|---|---|---|---|
| Query cache | TanStack Query (memory) | 5–10 min stale, 30 min GC | Repeat views of a city = **0 requests** |
| Snapshot cache | localStorage (≤ 12 locations, validated) | labelled stale after 10 min | Offline/error fallback with honest age |
| Radar metadata | TanStack Query | 5 min | One small JSON per 5 min, all frames reused |
| Static assets | CDN (see `_headers` / `vercel.json`) | 1 year, immutable for `/images` | Repeat visitors load almost nothing |

**Requests per fresh city view:** forecast 1 · nowcast 1 · archive 1 · radar metadata 0–1 ·
comparison cities ≤ 3 · geocoding only while searching. ≈ **4–7 calls**, then silence for 10 minutes.

---

## 6. Theming & Design System

- **Tokens first.** CSS variables in `src/index.css` (`--bg`, `--surface`, `--text`,
  `--text-muted`, `--accent`, `--border`, …) switch via `[data-theme="dark"]`.
- Components receive the resolved theme (`isLight`) and pick contrast-safe classes —
  primary text ≈ `slate-900` on white / white on navy; secondary ≈ `slate-600` / `slate-300`.
- Tailwind's `dark:` variant is bound to the app theme attribute
  (`@custom-variant dark (&:where([data-theme="dark"], …))`), not just the OS setting.
- Charts (Recharts) get theme-aware grid, axis, line and tooltip colors in both themes.
- The hero keeps white text over photography in both themes (readability overlay) — intentional.
- Motion is short (150–300 ms), transform/opacity-based, and fully disabled under
  `prefers-reduced-motion`.

---

## 7. Units, Timezones & Time Handling

- Conversions: `°F = °C × 9/5 + 32` · `mph = km/h ÷ 1.609344` · `m/s = km/h ÷ 3.6` · `in = mm ÷ 25.4`,
  applied to raw values, then rounded for display.
- The hero clock is a **live clock in the selected city's timezone** (ticks every 30 s),
  distinct from the API observation timestamp shown in "last updated".
- 12 h / 24 h preference is applied everywhere (hero, hourly, daily, radar, footer) with a
  visible `12h` / `24h` / `system` tag so the format is never ambiguous.

---

## 8. Security

This is a static frontend with no server, no auth and no user database — the attack surface is
deliberately tiny. Implemented measures:

- **Security headers shipped** (`public/_headers` for Netlify/Cloudflare Pages, `vercel.json` for Vercel):
  `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Permissions-Policy` (camera/mic off,
  geolocation same-origin only), HSTS.
  The CSP allow-lists **only** the provider domains this app actually calls.
  *Note:* the single-file production build inlines its JS/CSS, so the CSP uses
  `'unsafe-inline'` for script/style. If you later split bundles, tighten it to nonces/hashes.
- **No secrets in source.** No provider key is required by default. `.env` is git-ignored;
  only `.env.example` (empty values) is committed. `VITE_*` variables are visible in the
  browser by design — treat them as public configuration, never as credentials. Anything
  truly secret must live behind a backend proxy (see Roadmap).
- **Input validation.** Share-link parameters are treated as untrusted: coordinates must be
  finite and within real-world ranges (±90 / ±180) and labels are length-capped before use.
- **Safe rendering.** No `dangerouslySetInnerHTML` anywhere; all API strings render as text.
- **Safe storage.** All `localStorage` access goes through guarded wrappers with schema
  validation — corrupted or unavailable storage degrades to in-memory defaults, never a crash.
- **Bounded networking.** Timeouts, a single backoff retry, request cancellation, and
  debounced search prevent request storms and stale-response races.
- **Dependency hygiene.** `npm audit` is clean for runtime-relevant issues.
  Remaining: **3 high-severity findings confined to the build-time-only chain
  `vite-plugin-singlefile → micromatch → braces`** (glob matching during bundling).
  They never ship to users and never process untrusted input; fixing them today would require
  a breaking downgrade of the bundling plugin, so they are tracked as an accepted build-time
  risk and re-checked on dependency updates.
- **Geolocation safety.** Requested only after an explicit click; denial/timeout states are
  recoverable; coordinates rounded to 3 decimals (≈ 100 m) before any storage.

---

## 9. Privacy

- No accounts, no analytics, no trackers, no app-owned backend.
- Favorites, recents and preferences live **only in the visitor's browser**.
- The precise device position is never sent to any app server (there is none);
  it is used once to fetch weather and a human-readable place label.
- "Clear local data" removes everything stored, with confirmation.

---

## 10. Scaling to 1000+ Concurrent Users

**Short answer:** the app itself scales trivially; the free API quota is the ceiling — and the
upgrade path is already wired in.

**Why the frontend scales**
- The production build is one static HTML file (~856 KB, ~254 KB gzipped) plus local images.
  Put it on any CDN/static host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, GitHub Pages)
  and **1000 concurrent users are served from edge cache** — there is no server to overload.
  Immutable 1-year caching for `/images` and hashed assets means repeat visits cost almost nothing.

**Where the ceiling actually is: provider quotas**
- Open-Meteo's free endpoints are documented for non-commercial use with daily limits
  (historically < 10,000 calls/day). At ≈ 4–7 calls per *fresh* city view — and zero calls for
  cached views within 10–30 minutes — the free tier comfortably serves roughly
  **1,500–2,500 fresh city sessions/day**, far fewer if users mostly re-check the same cities.
  1000 *simultaneous* users already on the page mostly read cache and refresh every 10 minutes,
  but a launch spike of 1000 brand-new users in one hour would exceed free-tier courtesy limits.

**Production path (already implemented)**
1. Set the commercial endpoints + key in `.env` (no code change):
   `VITE_OPEN_METEO_FORECAST_URL=https://customer-api.open-meteo.com/v1/forecast`, etc.
   (see `.env.example`). Commercial plans exist precisely for this traffic class.
2. Or place a thin edge cache (e.g. Cloudflare Worker) in front of the free endpoints and point
   the same env variables at it — identical city+hour requests collapse to one upstream call.
3. RainViewer free radar is for personal/educational use; for a commercial 1000-user launch,
   obtain RainViewer's commercial terms or swap the radar provider behind `src/services/rainViewer.ts`.

**Launch checklist for 1000 users**
- [ ] Deploy `dist/` to a CDN-backed host; confirm `_headers`/`vercel.json` are applied.
- [ ] Configure commercial API endpoints (or edge cache) via environment variables.
- [ ] Verify provider plan limits against expected fresh-session volume.
- [ ] Keep an eye on 429s; the app already backs off once and falls back to cached data.
- [ ] Optionally enable CDN analytics to watch cache-hit ratio (target > 90% on assets).

---

## 11. Performance

- Single-file build (inlined JS/CSS) = one request for the app shell; images are separate
  cacheable files under `/images`.
- Server state is deduplicated and cached by TanStack Query; identical concurrent requests
  from multiple components collapse into one fetch.
- Heavy panels render conditionally; radar images lazy-load; animations use transform/opacity
  and pause under reduced-motion.
- Future optimisation if needed: split Recharts/charts into a lazy chunk (see Roadmap).

---

## 12. Accessibility

- Skip-to-content link, landmarks, labelled controls, `aria-label` on icon buttons.
- Search is a real combobox: arrow keys, Enter, Escape, `aria-expanded`, live result counts.
- Visible focus rings in both themes; all core flows keyboard-operable.
- Status/toast messages use `aria-live`; errors are text, never colour-only.
- Charts ship with adjacent text summaries (hourly cards, selected-hour details).
- `prefers-reduced-motion` disables decorative animation and radar autoplay.
- Layout is grid/flex based with `min-w-0` guards — no page-level horizontal scroll
  from 320 px to 1920 px.

---

## 13. Local Development

**Prerequisites:** Node.js 20+ and npm (matches the Vite 7 toolchain).

```bash
npm install        # install dependencies
cp .env.example .env   # optional — app works with zero configuration
npm run dev        # start the dev server
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |

---

## 14. Environment Variables

All optional. Defaults are the free public endpoints.

| Variable | Purpose |
|---|---|
| `VITE_GEMINI_API_KEY` | Placeholder for future AI insight experiments (restrict by domain; visible client-side) |
| `VITE_OPEN_METEO_API_KEY` | Commercial Open-Meteo key (sent as `apikey` when set) |
| `VITE_OPEN_METEO_FORECAST_URL` | Forecast endpoint override (commercial/edge cache) |
| `VITE_OPEN_METEO_GEOCODING_URL` | Geocoding endpoint override |
| `VITE_OPEN_METEO_AIR_QUALITY_URL` | Air-quality endpoint override |
| `VITE_OPEN_METEO_ARCHIVE_URL` | Archive endpoint override |
| `VITE_RAINVIEWER_API_URL` | RainViewer metadata endpoint override |

---

## 15. Deployment

1. `npm run build`
2. Deploy the `dist/` folder to any static host:
   - **Vercel** — zero config; `vercel.json` in this repo applies security/cache headers.
   - **Netlify / Cloudflare Pages** — `public/_headers` is copied into `dist/` and applied automatically.
   - **GitHub Pages / S3** — works as-is (single page, no router); replicate the headers at the host if supported.
3. Set environment variables in the host's dashboard (not in the repo) for production endpoints.
4. Confirm HTTPS is enforced (HSTS header assumes it) and that attribution renders.

---

## 16. Testing Status

Honest status — only what has actually been executed is claimed:

- ✅ `npm run build` — passes (TypeScript + Vite production build).
- ✅ `npm audit` — run; runtime-relevant issues fixed (Vite/esbuild upgraded);
  3 build-time-only findings remain, documented in [§8](#8-security).
- ⏳ Lint / unit / component / E2E suites are **not yet wired** in this repo.
  Recommended next step: ESLint + Vitest/RTL for ranking/conversion/time utilities and
  Playwright for the search → select → forecast → favorite journey across the viewport matrix
  (320/360/390/768/1024/1280/1440/1920 px, both themes).

---

## 17. Known Limitations

- Free provider tiers are for non-commercial use within published limits — re-validate terms
  before any commercial or high-traffic launch (see §10).
- Radar availability/coverage depends on RainViewer feeds; some regions have sparse coverage.
- No official severe-weather alerts: the advisories shown are transparent, rule-based guidance
  derived from forecast values, **not** government warnings.
- 15-minute nowcast and moon data availability vary by provider/model and location.
- Favorites/preferences are per-browser (no cloud sync) — a deliberate privacy choice.

---

## 18. Roadmap

- Lint + Vitest/RTL + Playwright suites and CI (lint → typecheck → test → build).
- Lazy-loaded chart bundle; optional PWA (installable, offline shell) with safe stale-data labelling.
- Air-quality panel surfaced from the existing service layer; pollen where supported.
- Optional backend proxy for secret-key providers, rate limiting and shared edge caching.
- Exportable weather card image; region-specific official alert providers where licensed.

---

## 19. Attribution & Licensing

- Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); geocoding includes
  GeoNames-based data via Open-Meteo. Attribution is displayed in the app footer.
- Radar imagery by [RainViewer](https://www.rainviewer.com/) — usage subject to RainViewer terms.
- Reverse geocoding via BigDataCloud; postcode fallback via OpenStreetMap Nominatim
  (© OpenStreetMap contributors) — respect their usage policies.
- Open-Meteo free endpoints: non-commercial use within published limits. Commercial use
  requires the appropriate licence/plan. Do not treat "free to call" as "free for every use".

---

## 20. Author

**Praveen Suthar** — Weather Intelligence Architect
Product design, frontend engineering, data integration and QA for Atmos Weather.

*GitHub repository link: to be added by the author.*

---

*Atmos Weather — built by Praveen Suthar. Real data, honest states, premium craft.*

