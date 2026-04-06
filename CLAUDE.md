**LITMUS Scrum Board — Full Build Prompt**

Build a single-page scrum board app for a 3-person startup team (Devansh, Devasy, Niel) deployed on Netlify with Google Sheets as the database. No backend — only Netlify Functions.

---

**STACK**
- Frontend: single `index.html` (vanilla JS, no framework)
- Backend: Netlify Functions (Node.js) in `netlify/functions/`
- Database: Google Sheets via Google Sheets API v4 using a Service Account
- Hosting: Netlify (static site + functions)

---

**GOOGLE SHEETS STRUCTURE**

Two tabs in one sheet:

`tickets` tab columns:
`id | title | description | status | created_at`

`board` tab columns:
`date | member | ticket_id | free_text | status`

---

**NETLIFY FUNCTIONS**

Create these 4 functions. All functions read `GOOGLE_SHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_KEY` (full JSON stringified) from `process.env`.

Use `googleapis` npm package for all Sheets calls. Create a shared `netlify/functions/_sheets.js` helper that authenticates and returns an authorized `sheets` client — import this in all functions.

`GET /api/tickets` — fetch all rows from `tickets` tab, return as JSON array
`POST /api/tickets` — body: `{title, description, status}`. Auto-generate ticket ID as `LITMUS-001`, `LITMUS-002` etc. (read last row to determine next number). Append row. Return created ticket.
`GET /api/board?date=YYYY-MM-DD` — fetch all rows from `board` tab where date matches. Return grouped by member.
`POST /api/board` — body: `{date, member, ticket_id (optional), free_text (optional), status}`. Append row.
`PATCH /api/tickets` — body: `{id, status}`. Find row by id and update status column in-place.

Route these via `netlify.toml`:
```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

---

**FRONTEND — `index.html`**

Single file, all CSS and JS inline. Monospace font throughout. Dark-green (`#1D9E75`) as the only accent color. Clean minimal UI — no frameworks, no CDN imports.

**MEMBERS config at top of JS:**
```js
const MEMBERS = ['Devansh', 'Devasy', 'Niel'];
// To add a member: just push a new name to this array. 
// The board column and sheet grouping will update automatically.
```

**Three tabs:**

`board` tab:
- Table with date rows × member columns
- Default view: current week (Mon–Sun). Button to append next week.
- Each cell shows tasks for that member on that date
- Each task renders as: `LITMUS-001` (clickable link to `<NETLIFY_URL>/LITMUS-001`) + task title + status badge inline
- Status badges: todo (gray), in prog (blue), review (amber), done (green), on hold (pink)
- Each cell has an `+ add` button that opens the Add Task modal pre-filled with that date and member
- On load: fetch current week's board data from `GET /api/board` for each date in the week. Show loading state per cell.

`tickets` tab:
- List all tickets fetched from `GET /api/tickets` on tab open
- Each ticket card shows: ID, title, description, status badge, URL (`<NETLIFY_URL>/<id>`)
- Inline status update button that cycles through statuses and calls `PATCH /api/tickets`

`setup` tab:
- Input fields for `GOOGLE_SHEET_ID` and `NETLIFY_SITE_URL` — saved to `localStorage`
- Members list: each member shown with an editable input and a remove button. `+ add member` button to push to MEMBERS array.
- "Test connection" button that calls `GET /api/tickets` and shows success/error

**Modals (no `<form>` tags, use button `onclick` handlers):**

Create Ticket modal: fields for title, description, status dropdown → calls `POST /api/tickets` → shows created ticket ID in a toast

Add Task modal: member dropdown (from MEMBERS array), date picker, ticket dropdown (fetched from `/api/tickets`), OR free text field, status dropdown → calls `POST /api/board`

**Ticket URL routing:**
Add this to `netlify.toml` so `litmus.netlify.app/LITMUS-001` loads the app and the app reads `window.location.pathname` to show that ticket's detail:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
On load, if `window.location.pathname` matches `/LITMUS-\d+`, fetch that ticket and show a simple detail view (title, description, status, back button).

---

**ENV VARS (set in Netlify dashboard)**

```
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":...}  ← full JSON stringified
```

---

**`netlify.toml`**
```toml
[build]
  functions = "netlify/functions"
  publish = "."

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

**`package.json`** (for functions)
```json
{
  "dependencies": {
    "googleapis": "^140.0.0"
  }
}
```

---

**IMPORTANT IMPLEMENTATION NOTES FOR THE AGENT**
- All Netlify functions must use CommonJS (`require`, not `import`) unless you set `"type": "module"` in package.json
- The service account JSON is stored as a single stringified env var — parse it with `JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)`
- When authenticating with Google, use `google.auth.GoogleAuth` with `scopes: ['https://www.googleapis.com/auth/spreadsheets']`
- `PATCH /api/tickets` needs to do a full column scan to find the row number before updating — Sheets API requires row index for updates
- All API calls from the frontend should include `Content-Type: application/json` headers
- Show a loading spinner (simple CSS animation) in each board cell while fetching
- All fetch errors should show a user-visible error message, not just a console log
- Do not use `localStorage` for ticket/board data — only for config (sheet ID, site URL)

---

**GOOGLE SHEETS SETUP STEPS** (include this as a `SETUP.md` in the repo)
1. Create a Google Sheet with two tabs named exactly `tickets` and `board`
2. Add header rows matching the column structure above
3. Go to Google Cloud Console → APIs & Services → enable Google Sheets API
4. Create a Service Account → download JSON key
5. Share the Google Sheet with the service account email (Editor access)
6. In Netlify dashboard → Site settings → Environment variables → add `GOOGLE_SHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_KEY`
7. Deploy — functions will be available at `/.netlify/functions/*` and routed via `/api/*`
