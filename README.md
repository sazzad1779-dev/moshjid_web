# Mosque Financial Dashboard

A React dashboard that reads income/expense data live from a published Google Sheet
(via a Vercel serverless function, to avoid browser CORS issues) and shows KPI cards,
monthly income vs expense, and category breakdowns.

## 1. Prepare the Google Sheet

Your "Transactions" tab needs these columns (headers can be English, Bengali, or both —
matching is done by keyword, e.g. "Date of Transaction / লেনদেনের তারিখ" is fine):

| Date | Type | Category | Amount | Description |
|------|------|----------|--------|--------------|
| 6/19/2026 | Income | Regular Donation | 150 | donation |
| 6/24/2026 | Expense | Electricity Bill | 17064 | utility bill |

- `Type` must contain "Income"/"আয়"/"জমা" or "Expense"/"ব্যয়"/"খরচ" — anything containing
  "income" is treated as income, everything else as expense.
- `Amount` should be a plain number (commas like 1,200 are fine).

Then: **File → Share → Publish to web** → pick the **Transactions** tab specifically
(not "Entire Document", not a summary/dashboard tab) → format **CSV** → **Publish** →
copy the link. It should look like:

```
https://docs.google.com/spreadsheets/d/e/.../pub?gid=1694128401&single=true&output=csv
```

Since the fetch now happens through the serverless function rather than the browser,
this link itself never reaches site visitors.

## 2. Local setup

```bash
npm install
cp .env.example .env
# paste your CSV URL into .env as SHEET_CSV_URL (no VITE_ prefix)
npx vercel dev
```

Use `vercel dev` (not `npm run dev`) locally — it runs both the Vite frontend and the
`/api/transactions` serverless function together, matching production behavior.
(First run will ask you to log in / link a Vercel project — free, just follow the prompts.)

## 3. Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. Go to vercel.com -> Add New Project -> import the repo.
3. Vercel auto-detects Vite. Before deploying, add an Environment Variable:
   - Key: `SHEET_CSV_URL`
   - Value: your published CSV link
4. Deploy. Every time someone submits a new entry to the sheet, refreshing the site shows
   updated data within about 30 seconds (cached briefly server-side, then refetched).

## Why a serverless function instead of fetching the CSV directly in React?

Google's "publish to web" CSV link redirects through `googleusercontent.com`. Browsers
often block that redirect when JavaScript running on your site tries to fetch it directly
(CORS), even though the link works fine when opened directly or fetched from a server.
Routing the request through `/api/transactions` (which runs server-side on Vercel) avoids
that entirely, and also keeps the sheet URL — which includes contributor email addresses —
out of the public browser bundle.

## Notes

- If you add new categories in the sheet, they show up automatically in the charts.
- The "Recent Transactions" table shows the last 30 rows — adjust `rows.slice(-30)` in
  `src/App.jsx` if you want more/fewer.
- Rows with a missing/non-numeric Amount are silently skipped.
