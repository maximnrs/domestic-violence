# Legal Dashboard Frontend

The legal dashboard is a Vite and React application for reviewing cases, incidents, evidence, and report workflows in the Nura platform.

## Features

- Case overview and case detail pages.
- Incident and evidence review tables.
- Legal report flow for selecting cases, evidence, transcription, integrity review, and package review.
- Optional direct Whisper transcription for local demos.
- API-backed authentication with optional local auto-login support.

## Requirements

- Node.js 20+
- npm
- Running Nura backend API

## Configuration

Create `legal-dashboard-frontend/.env` for local development:

```env
VITE_API_URL=http://localhost:8000
VITE_WHISPER_URL=http://localhost:5000/transcribe
```

Optional demo login variables:

```env
VITE_DASHBOARD_AUTO_LOGIN=true
VITE_DASHBOARD_EMAIL=demo@example.com
VITE_DASHBOARD_PASSWORD=demo-password
```

If `VITE_WHISPER_URL` is set, transcription requests can be sent directly from the browser to the Whisper service. If it is not set, the dashboard falls back to the backend transcription endpoints.

## Local Development

```bash
npm install
npm run dev
```

The default Vite dev server starts at `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

## Project Structure

| Path | Purpose |
| --- | --- |
| `src/pages/` | Route-level dashboard pages. |
| `src/components/` | UI, case, evidence, incident, and report-flow components. |
| `src/layout/` | Sidebar, top bar, and dashboard shell. |
| `src/services/` | API clients, mappers, transcription, report draft, and PDF support. |
| `src/types/` | Shared TypeScript domain types. |

## Notes

- The dashboard uses in-memory auth token storage, so refreshing the browser clears the token unless auto-login is enabled.
- Local API CORS must allow the Vite origin, usually `http://localhost:5173`.
- Do not commit `.env` files containing real credentials.
