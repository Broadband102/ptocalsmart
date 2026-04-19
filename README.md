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
  - Seasonal scoring: best months, avoid months, value-season deals factored in
  - Festival overlap detection — shows events happening during your dates
  - Direct booking links: Google Flights, Kayak, Booking.com, Expedia
  - One-click "Plan This Trip" button from any Optimizer result
  - **Optional: AI Itinerary generation via free Gemini API** (see setup below)

## Architecture

- Pure HTML/CSS/JS, single file (`index.html`)
- `localStorage` for state persistence (`ShiftPTO` for schedule, `TripPlanner` for trip prefs)
- No framework, no build tools, no template literals
- Fonts: Montserrat + Open Sans via Google Fonts
- Cloudflare Pages for static hosting
- Optional Pages Function at `/api/itinerary` for AI trip planning (Gemini proxy)

## Adding Destinations

The Trip Planner's destination database lives inline in `index.html` in the `DESTS` array:

```js
{ id:'destin', name:'Destin, FL', region:'Florida Panhandle',
  type:['beach','foodie'], driveHours:11, airport:'VPS',
  budget:['mid','high'], groups:['couple','kids','teens','group'],
  best:[4,5,9,10], avoid:[6,7,8], value:[3,9,10,11],
  blurb:'Emerald-green water, white sugar sand...',
  costNights:[160,320], costMeals:[40,95],
  tips:{ 9:'Shoulder season sweet spot...' },
  events:[
    { month:10, name:'Destin Seafood Festival', note:'First weekend of October, free admission' }
  ] }
```

Copy an existing entry, edit it, add to the array. No build step — commit and push, Cloudflare Pages auto-deploys.

## AI Itinerary Setup (Optional)

The "Build My Itinerary" button on Trip Planner cards calls `/api/itinerary`, which is a Cloudflare Pages Function that proxies Google's Gemini API. This is optional — without it, the button will show a friendly message pointing users to the seasonal tips and booking links.

### One-time setup:

**1. Get a free Gemini API key**
- Go to https://aistudio.google.com/apikey
- Sign in with any Google account
- Click "Create API key" and copy the `AIza...` string

**2. Add the key to Cloudflare Pages**
- Cloudflare dashboard → Workers & Pages → your ptocalsmart project
- Settings → Environment variables → Production
- Click "Add variable"
  - **Variable name:** `GEMINI_KEY`
  - **Value:** paste your `AIza...` key
  - **Type:** Encrypted (important — this hides the key)
- Save
- Redeploy (or push any small change to trigger redeploy)

**3. Test**
- Go to the live site → Trip Planner → pick dates via Optimizer
- Click "Build My Itinerary" on any destination card
- Should return a personalized day-by-day plan in 3-5 seconds

### How it works

- `functions/api/itinerary.js` receives POST with destination + trip context
- Builds a grounded prompt (includes your curated blurb, tips, and overlapping events)
- Calls Gemini 2.0 Flash free tier (15 requests/min, 1,500 requests/day)
- Returns the generated itinerary to the frontend

### Free tier limits

Gemini's free tier covers ~1,500 itinerary requests/day per project. If the site gets above that, users hit a rate limit and see a friendly "try later" message instead of a crash. To scale beyond free, either:
- Add IP rate-limiting to `itinerary.js` (e.g., 3 per IP per hour)
- Upgrade to Gemini paid tier (~$0.075 per million input tokens — still cents per thousand uses)

## Deploy

### Cloudflare Pages (current setup)
1. Push to GitHub
2. Connect repo to Cloudflare Pages
3. Build command: *(none)*
4. Build output directory: `/` (root)
5. Functions are auto-detected from the `functions/` folder
6. Add `GEMINI_KEY` environment variable (see above) if using AI features
7. Deploy

### Local dev
Just open `index.html` in a browser. No build step, no dependencies besides Google Fonts (loaded via CDN). The AI itinerary button won't work locally unless you use Cloudflare's `wrangler pages dev` with the key set.

## License

All rights reserved.
