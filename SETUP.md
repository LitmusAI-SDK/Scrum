# LITMUS Scrum Board Setup

1. Create a Google Sheet with two tabs named exactly `tickets` and `board`.
2. Add header rows:
   - `tickets`: `id | title | description | status | created_at`
   - `board`: `date | member | ticket_id | free_text | status`
3. In Google Cloud Console, enable Google Sheets API.
4. Create a Service Account and download its JSON key.
5. Share the Google Sheet with the service account email and grant Editor access.
6. In Netlify dashboard, add environment variables:
   - `GOOGLE_SHEET_ID=your_sheet_id_here`
   - `GOOGLE_SERVICE_ACCOUNT_KEY={...full service account JSON stringified...}`
7. Install dependencies:

   ```bash
   npm install
   ```

8. Deploy to Netlify. Functions are available at `/.netlify/functions/*` and routed via `/api/*`.