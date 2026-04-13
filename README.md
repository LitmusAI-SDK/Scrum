<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c53829e5-f9a9-4522-8b82-9caf51de8074

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set required environment variables in [.env.local](.env.local):
   `GEMINI_API_KEY=your_key`
   `GOOGLE_SHEET_ID=your_google_sheet_id`
   `GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}`
3. Keep `GOOGLE_SERVICE_ACCOUNT_KEY` as a single-line JSON string (or other env-safe encoded single-line form) so Node can parse it correctly.
4. These Google env vars are read by [netlify/functions/_sheets.js](netlify/functions/_sheets.js) and are required for local `/api/*` routes to access Google Sheets.
5. Run the app:
   `npm run dev`
