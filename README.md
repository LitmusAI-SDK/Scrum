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
2. Add the following to `.env.local` (create it if needed):
   - `GOOGLE_SHEET_ID` - Your Google Sheet ID
   - `GOOGLE_SERVICE_ACCOUNT_KEY` - Your service account JSON as a single-line string (all quotes escaped)
   - These environment variables are referenced in `netlify/functions/_sheets.js`
   - Note: `GOOGLE_SERVICE_ACCOUNT_KEY` should be the full JSON key formatted as a single line
3. Run the app:
   `npm run dev`