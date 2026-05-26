# Portfolio Live Dashboard

Personal portfolio website with a live price adapter.

## Files

- `app/page.tsx` — interactive dashboard
- `app/api/quotes/route.ts` — server-side quote proxy
- `.env.example` — environment variables
- `components/ui/*` — minimal local UI components

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

This project is pinned for Node 22.x and npm 11.x.

## Verify with Vercel CLI

```bash
npm run vercel:build
```

The local Vercel build writes output to `.vercel/output`. Deploy that output after logging in/linking the project:

```bash
vercel deploy --prebuilt
```

## API keys

Put keys in `.env.local`, never in frontend code.

```env
ALPHA_VANTAGE_API_KEY=your_key_here
FX_FALLBACK_USDTHB=32.61
QUOTE_CACHE_SECONDS=60

# Optional Thai market data
SET_API_KEY=your_set_key_here
SET_QUOTE_BASE_URL=https://marketplace.set.or.th/api/public/delay-data/stock
```

## Data mode

- If `ALPHA_VANTAGE_API_KEY` is present, US prices and USDTHB FX are fetched through `app/api/quotes/route.ts`.
- If no API is available or the provider rate-limits the request, the website falls back to screenshot prices.
- SET/Thai quotes require your own SET market data access or a compatible provider endpoint.
- Cash is manual input by design.

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add the same environment variables in Vercel Project Settings.
4. Deploy.
