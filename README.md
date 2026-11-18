# Mosque Financial Dashboard

A public financial transparency dashboard for **Madhya Beparipara Mohammadia Jame Masjid**
(মধ্য বেপারীপাড়া মোহাম্মদিয়া জামে মসজিদ). It shows income/expense KPIs, monthly trends,
category breakdowns, and a full transaction history — with a PIN-protected admin area for
collector-wise reporting.

**Stack:** React 18 + Vite · Recharts · Node.js serverless API (Vercel) · PostgreSQL (Supabase)

---

## Features

- Homepage prayer schedule with a live countdown in Dhaka time, published from Admin → Settings
- Public tabs: Home, Dashboard (analytics), Monthly (finance), Transactions (records)
- KPI cards: total income, total expense, net balance, transaction count
- Charts: monthly trend, category radar, income/expense pie charts, day-by-day activity
- Transaction filtering: search, type, category, date range + pagination
- **Admin area** (`Admin` tab): PIN login via JWT-signed HttpOnly cookie
  - **Admin role** — sees all collectors, income/expense per person, quick links, notes
  - **Collector role** — sees only their own collection summary

## Architecture

```
Browser (React/Vite)
   │
   ├─ /api/transactions   → GET  all transactions (public, CDN-cached 60s)
   ├─ /api/auth           → POST login / logout / verify (PIN → JWT cookie)
   ├─ /api/collectors     → GET  per-collector summary (auth required)
   └─ /api/admin-data     → GET  paginated admin data (admin session required)
          │
          └─ PostgreSQL (Supabase)  ← transactions, profiles, monthly_dues, categories
```

- The frontend is built with Vite and served statically; the `api/*.js` handlers run as
  Vercel serverless functions in production.
- The database schema, including `transactions`, `profiles`, and `monthly_dues`, is in
  [`schema.sql`](schema.sql).
- Locally, `server.js` (Express) serves the same API handlers, and Vite proxies `/api`
  to it during development.

## Prerequisites

- Node.js 20.x
- A Supabase project (free tier) with the `transactions` table created
- A Vercel account (free tier) for deployment

## 1. Database setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the contents of [`schema.sql`](schema.sql):

   ```sql
   CREATE TABLE IF NOT EXISTS transactions (
     id          SERIAL PRIMARY KEY,
     date        DATE        NOT NULL,
     type        TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
     category    TEXT        NOT NULL DEFAULT 'Uncategorized',
     amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
     note        TEXT        DEFAULT '',
     entered_by  TEXT        DEFAULT '',
     created_at  TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
   CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
   ```

   For an existing project, rerun the schema script to apply idempotent migrations,
   including the `profiles.monthly_amount` column, monthly-dues index, and
   `settings.prayer_times` column. After migration, confirm all six times in
   **Admin → Settings** and select **Publish prayer times**.

3. In the Supabase dashboard, open **Connect** and copy the **Transaction pooler**
   connection string (port `6543`) for `DATABASE_URL`.

Insert a few rows to test (dates as `YYYY-MM-DD`):

```sql
INSERT INTO transactions (date, type, category, amount, note, entered_by) VALUES
  ('2026-07-01', 'income',  'Regular Donation', 5000,  'July collection', 'Karim'),
  ('2026-07-05', 'expense', 'Electricity Bill',  850,  'Utility bill',     'Rahim');
```

## 2. Local setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, ADMIN_SECRET, ADMIN_PINS, COLLECTOR_PINS in .env
npm run dev
```

This runs both the **Vite frontend** (http://localhost:3000) and the **Express API**
(http://localhost:3001) with `/api` proxied — matching production behavior.

> `npm run dev` is the equivalent of `vercel dev`: it serves the SPA and the
> `api/*.js` handlers together. No Vercel login is required for local development.

### Environment variables

See [`.env.example`](.env.example) for a template.

| Variable | Required | Used by | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | API / server | Supabase pooled Postgres connection string |
| `ADMIN_SECRET` | ✅* | API / server | Secret for signing session JWTs (use a long random string) |
| `ADMIN_PINS` | | API / server | Comma-separated PINs with **admin** access (default `1234`) |
| `COLLECTOR_PINS` | | API / server | Comma-separated PINs with **collector** access (default `5678`) |
| `VITE_INCOME_FORM_URL` | | Frontend | Link shown on the Admin page |
| `VITE_ADMIN_CONTACT_EMAIL` | | Frontend | Contact email shown on the Admin page |

\* A default fallback secret exists, but **set `ADMIN_SECRET` in any deployed environment**.

> **Security:** keep `DATABASE_URL` and `ADMIN_SECRET` server-side only. Never prefix
> them with `VITE_` (that would expose them to the browser).

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to vercel.com → **Add New Project** → import the repo. Vercel auto-detects Vite.
3. Under **Settings → Environment Variables**, add:
   - `DATABASE_URL` — your Supabase **Transaction pooler** connection string (port `6543`)
   - `ADMIN_SECRET` — a long random string (e.g. `openssl rand -base64 32`)
   - `ADMIN_PINS` / `COLLECTOR_PINS` — the PINs you want
   - (optional) `VITE_INCOME_FORM_URL`, `VITE_ADMIN_CONTACT_EMAIL`
4. **Deploy.**

The `/api/*` files are picked up automatically as serverless functions; the Vite build
output is served as static files.

### Node.js version

The required version is pinned to `20.x` via `engines` in `package.json`. To change it,
edit that field (see [Vercel docs on Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)).
Note Vercel is **deprecating Node.js 20 on Oct 1, 2026** — plan to move to `22.x` or `24.x`.

## API reference

All handlers return JSON. CORS is open (`*`) since the frontend and API share an origin.

### `GET /api/transactions` — public

```json
{
  "rows": [
    { "id": 1, "date": "2026-07-01", "type": "income", "category": "Regular Donation",
      "amount": 5000, "note": "July collection", "enteredBy": "Karim" }
  ],
  "count": 1,
  "updatedAt": "2026-08-03T12:00:00.000Z"
}
```

Responses are cached at the CDN for 60s (`s-maxage=60, stale-while-revalidate=300`).

### `POST /api/auth` — login / logout / verify

Body: `{ "action": "login", "pin": "1234" }` → `{ "success": true, "role": "admin" }`
(on success an `HttpOnly` JWT cookie `mosque_session` is set, valid 8h).

Body: `{ "action": "logout" }` → clears the cookie.

Body: `{ "action": "verify" }` → `{ "authenticated": true, "role": "admin" }` or 401.

### `GET /api/collectors` — auth required (admin or collector)

Per-person totals computed from `transactions` where `amount > 0`:

```json
{ "collectors": [ { "name": "Karim", "income": 5000, "expense": 0, "count": 1 } ],
  "totalRows": 1, "updatedAt": "..." }
```

### `GET /api/admin-data` — admin session required

Read-only admin data endpoint. Every request requires the `mosque_session` cookie and
supports one `resource`:

- `overview`: latest transactions, summary totals, member count, and category options.
  Supports `q`, `type`, `category`, `from`, `to`, and `page`.
- `transactions`: paginated transaction history. Supports `page`, `pageSize`, `q`,
  and `type`.
- `members`: paginated `profiles` with `role = 'member'`. Supports `page`, `pageSize`,
  `q`, and `status`.
- `dues`: paginated `monthly_dues` joined to `profiles` by `member_id`. Supports
  `year`, `month` (1–12, or 0 for all months), `page`, and `pageSize`.
- `dues-matrix`: member-by-month dues for a selected `year`, with optional member
  `search`, `page`, and `pageSize`. A member's dues begin in the month of their first
  confirmed income transaction in the `Imam Hadya` category (also accepting the
  existing `Imam Hadiya` spelling) when a monthly amount is configured. Later months
  through the current month are calculated for display. When creating or editing a
  qualifying transaction, admins can select one or more due months and a year; the
  payment is split across those months. If no month is selected, the transaction date
  determines the due month. Explicit allocations are stored in `monthly_due_payments`;
  date-based payments use the transaction's `monthly_due_id` link. Admins can `POST` to
  `resource=dues-refresh` to process existing confirmed Imam Hadya transactions whose
  `monthly_due_id` is null. The refresh creates or finds the due for each transaction's
  month, links the transaction, and recalculates the linked due. Transactions already
  linked or explicitly allocated are left alone.

The response shape depends on the selected resource. `GET` requests only read data;
admin transaction `PATCH` and `DELETE` requests update transactions and synchronize
their associated Imam Hadya dues. The dues refresh endpoint only handles unlinked
transactions; it does not delete transactions.

## Project structure

```
api/             Vercel serverless functions (also served locally by server.js)
  _db.js         Postgres connection pool
  auth.js        PIN login → JWT cookie
  admin-data.js  Paginated admin data (auth)
  transactions.js  Public transactions list
  collectors.js  Per-collector summary (auth)
scripts/         (empty — reserved for data tools)
src/             React frontend
  pages/         Home, Dashboard, Monthly, Transactions, Admin
  components/    Charts, tables, filters, pagination, login UI
  hooks/         useTransactions, useAuth, useCollectorData
  utils/         formatting + computations
schema.sql       Database schema (run in Supabase SQL Editor)
server.js        Local Express server that mounts the api/ handlers
vite.config.js   Vite config — /api proxied to :3001 in dev
```

## Troubleshooting

- **`Function Runtimes must have a valid version` on Vercel deploy** — your
  `vercel.json` had a `functions.runtime` field, which is only for community runtimes.
  Remove it; the Node version is set via `engines` in `package.json`.
- **API returns `DATABASE_URL environment variable is not set`** — the env var is
  missing in the deployed environment. Add it in Vercel → Settings → Environment
  Variables and redeploy.
- **API logs show `EMAXCONNSESSION`** — Supabase's session pooler has run out of
  slots. Set Vercel's `DATABASE_URL` to the Transaction pooler URL from Supabase
  and redeploy to apply the environment change.
- **Login says "Invalid PIN"** — check `ADMIN_PINS` / `COLLECTOR_PINS` are set correctly
  (comma-separated, no spaces) in the environment.

## Mobile API

The standalone **Mosque Finance Mobile** Expo project uses `/api/mobile/v1`. The existing web PIN login continues to serve the website. Mobile staff sign in with Supabase Auth and an active staff profile.

1. Compare the deployed schema with the API queries. The mobile API expects the same live tables, categories, profile IDs, soft-delete flags, and due-payment allocations used by the existing handlers.
2. Apply `migrations/001_mobile_submissions.sql` to a staging Supabase database. The table stores retry keys and committed receipts for mobile submissions.
3. Set `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` in the backend environment. The last value can be the Supabase anon or publishable key. Deploy the backend before building the app against it.
4. Provision Supabase email/password users whose Auth IDs match the appropriate active staff profiles. Set `profiles.collector_id` on the members each collector serves. Enabling email/password in Supabase for staff does not require making public account registration available.

Mobile API requests select an operation with the `resource` query parameter.

| Operation | Method | Access |
|---|---|---|
| `session` | POST | Email and password, or a refresh token |
| `snapshot` | GET | Public fields for guests. Staff bearer tokens add authorized private data. A matching ETag returns 304. |
| `transactions` | POST | Staff bearer token and a durable UUID submission ID |
| `admin&target=members`, `admin&target=transactions`, `admin&target=dues-refresh` | Existing admin methods | Admin bearer token |
| `admin&target=dues-matrix` | GET | Admin bearer token, with year and pagination options |
| `prayer-times` | PATCH | Admin bearer token |

Snapshot reads run in one repeatable-read PostgreSQL transaction. A fresh response replaces the downloaded copy on the phone, including records edited or removed through the web app. Uploads reuse the existing accounting write and monthly dues logic. The retry key, official receipt, and related ledger changes commit together.
