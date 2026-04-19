# PTO Cal Smart

Single-file HTML PTO optimization web app for hospital workers on a 10-hour rolling schedule.

Live site: [www.ptocalsmart.com](https://www.ptocalsmart.com)

## Features

- 10-hour rolling schedule generator (Mon → Tue → Wed → Thu → Fri+Mon → cycle repeats)
- 12-month calendar view
- Holiday tracking with "I worked this" override
- PTO balance projection with per-paycheck accrual
- **PTO Optimizer** with multiple strategies:
  - Free Days Only, Long Weekend, **Weekend Extender (1 PTO)**, 4-Day Weekend (with hide/show toggle), 4-Day + Bridge, Full Week, Max Stretch, Holiday Bridge, Custom
- **Trip Planner** — Turn your time off into real trips
  - Curated destination database (Tulsa-aware: drive hours, seasonal sweet spots, 65+ annual festivals and events)
  - Filter by style, budget, travel group, and distance
  - Seasonal scoring + festival overlap detection
  - Direct booking links: Google Flights, Kayak, Booking.com, Expedia
  - "Plan This Trip" button from any Optimizer result
  - **Optional: AI Itinerary generation via free Gemini API** (see setup below)

## Repo Structure

```
ptocalsmart/
├── wrangler.toml            # Cloudflare Worker config
├── src/
│   └── index.js             # Worker entry point (routes /api/itinerary, serves static files)
├── public/
│   └── index.html           # The single-file app (what users see)
└── README.md
```

## Architecture

- **Frontend:** pure HTML/CSS/JS single file (`public/index.html`)
- **Backend:** Cloudflare Worker (`src/index.js`) routes `POST /api/itinerary` to Google Gemini, passes all other requests through to static assets
- **Hosting:** Cloudflare Workers with Static Assets (unified Workers + Pages model)
- `localStorage` for state persistence (`ShiftPTO` for schedule, `TripPlanner` for trip prefs)
- No build step, no framework, no template literals

## Editing the app

Edit `public/index.html` directly in GitHub's web editor. On commit, Cloudflare auto-deploys within ~30 seconds.

The Trip Planner's destination database lives inline in `index.html` in the `DESTS` array. Copy an existing entry and edit to add new destinations — no code changes needed.

## AI Itinerary Setup

The "Build My Itinerary" button calls `POST /api/itinerary`, which is handled by the Worker code in `src/index.js`.

### One-time setup:

**1. Get a free Gemini API key**
- Go to https://aistudio.google.com/apikey
- Sign in with any Google account
- Click "Create API key", copy the `AIza...` string

**2. Add the key to Cloudflare**
- Cloudflare dashboard → Workers & Pages → click `ptocalsmart`
- Settings → **Variables and Secrets**
- Click **Add**
  - **Variable name:** `GEMINI_KEY`
  - **Value:** paste your `AIza...` key
  - **Type:** Secret
- Save

**3. Redeploy**
- Push any commit, or use **Deployments** tab → three-dot menu → **Retry deployment**

### Free tier limits

Gemini's free tier covers ~1,500 itinerary requests/day per API key. If exceeded, the button gracefully shows a "try again later" message.

## Deploy

- Cloudflare Workers auto-deploys from GitHub on every push to `main`
- First deploy: connect repo to a Worker in the Cloudflare dashboard, let it use the `wrangler.toml` config in the repo

## Local dev

Open `public/index.html` directly in a browser for the frontend. The AI button won't work locally without `wrangler dev` + a local `.dev.vars` file containing `GEMINI_KEY=...`.

## License

All rights reserved.
