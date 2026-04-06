# Scrum

Single-page scrum board with Netlify Functions and Google Sheets.

## Google Sheet Structure

Create one Google Sheet with exactly two tabs:

1. `tickets`
2. `board`

Add header row in each tab:

- `tickets`: `id | title | description | status | created_at`
- `board`: `date | member | ticket_id | free_text | status`

Also share the sheet with your Service Account email (Editor access), otherwise API calls will fail.

## Where To Put GOOGLE_SHEET_ID And Service Account JSON

### Production (Netlify)

Set these in Netlify Site Settings -> Environment Variables:

- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY` (full JSON stringified into one line)

### Local testing

1. Copy `.env.example` to `.env`.
2. Fill the two values:
	- `GOOGLE_SHEET_ID`
	- `GOOGLE_SERVICE_ACCOUNT_KEY`

Important: the `private_key` inside JSON must contain escaped newlines (`\\n`) in one-line JSON.

## Test Locally

1. Install dependencies:

```powershell
npm install
```

2. Start Netlify local dev server:

```powershell
npx netlify dev
```

3. Open app:

- `http://localhost:8888`

4. Quick API checks:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8888/api/tickets"
Invoke-RestMethod -Method Get -Uri "http://localhost:8888/api/board?date=2026-04-06"
```

## Full Setup Guide

See `SETUP.md` for complete Google Cloud + Netlify deployment steps.
