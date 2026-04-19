# PTO Cal Smart

Single-file HTML PTO optimization web app for hospital workers on a 10-hour rolling schedule.

Live site: [www.ptocalsmart.com](https://www.ptocalsmart.com)

## Features

- 10-hour rolling schedule generator (Mon → Tue → Wed → Thu → Fri+Mon → cycle repeats)
- 12-month calendar view
- Holiday tracking with "I worked this" override
- PTO balance projection with per-paycheck accrual
- PTO Optimizer with multiple strategies:
  - **Free Days Only** — zero-PTO stretches
  - **Long Weekend (3 days)** — Fri–Sun or Sat–Mon
  - **Weekend Extender (1 PTO)** — Tue-off or Thu-off weeks that turn into 4-day weekends with 1 PTO day
  - **4-Day Weekend** — isolation view for natural 4-day weekends (toggle to hide/show)
  - **4-Day + Bridge to Next Weekend**
  - **Full Week (Mon–Sun)**
  - **Max Stretch (10–12 days)**
  - **Holiday Bridge**
  - **Custom Days** (1–14)

## Deploy

This is a single static `index.html` file. Drop it into any static host.

### Cloudflare Pages (current deployment)
1. Push to GitHub
2. Connect repo to Cloudflare Pages
3. Build command: *(none)*
4. Build output directory: `/` (root)
5. Deploy

### Local dev
Just open `index.html` in a browser. No build step, no dependencies besides Google Fonts (loaded via CDN).

## Architecture

- Pure HTML/CSS/JS, single file
- `localStorage` for state persistence (`ShiftPTO` key)
- No framework, no build tools, no template literals (intentionally avoided for simplicity)
- Fonts: Montserrat + Open Sans via Google Fonts

## License

All rights reserved.
