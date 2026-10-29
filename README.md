# Daily budget

A phone-first page for glancing at spending. It reads a Google Sheet and never writes to it. Money Kick (or anything else) can add, edit, and delete rows; this app only watches them.

Today and this month follow Asia/Dhaka. Amounts are in taka. While the tab is visible, the page asks the server for a fresh summary about every 15 seconds, and again as soon as the tab is focused. The server may reuse a sheet read for about five seconds.

The passcode in `APP_PASSCODE` unlocks an httpOnly signed cookie that lasts 30 days. Middleware sends everyone else to the passcode page, and the API returns 401. Lock on the page clears the cookie.

## Run it locally

Fixture data is used when `GOOGLE_SERVICE_ACCOUNT_JSON` is unset, so the app runs without a Google key.

```bash
npm install
cp .env.example .env.local
```

Set `APP_PASSCODE` in `.env.local` to any passcode, then:

```bash
npm run dev
```

Open http://localhost:3000.

The sample ledger is in `data/fixture.json`. It follows the sheet columns, leaves a gap in the ids (there is no 3), and includes an income row plus the example water purchase on 28 Oct 2026. 29 Oct has its own expenses and a ৳100 plan, which is "today" when the Dhaka date is 29 Oct 2026. On any other day, today's total may be ৳0. October's totals still show during October. A "Sample" label marks fixture mode.

## Connect the real sheet

1. In Google Cloud Console, create or pick a project and enable the **Google Sheets API**.
2. Create a service account. It does not need project roles.
3. Create a JSON key for that account and download it.
4. Share the spreadsheet with the service account email (`client_email` in the key) as a **Viewer**. Viewer is the right access: the app never writes.
5. Set the environment variables, in `.env.local` or in the host:

```bash
SHEET_ID=1N77DmM-QnE7TYgaYL9tUok23fWTJUQGNElkbqi5fyGI
APP_PASSCODE=choose-a-passcode
GOOGLE_SERVICE_ACCOUNT_JSON="$(jq -c . /path/to/key.json)"
```

`GOOGLE_SERVICE_ACCOUNT_JSON` is the full key, minified to one line. It stays on the server and is never sent to the browser.

The sheet has two tabs:

- `Transactions` — headers on row 1, data from row 2. Columns A–G are id, date, amount, currency, category, note, and type (`expense` or `income`). Every read loads `A2:G` again. Rows can be appended, edited, or deleted, and ids are not contiguous, so nothing is treated as append-only.
- `Daily Spend` — one row per day of 2026, and row 2 is 1 Jan. Column A is the date. Column C is the planned daily budget (৳100 from 22 Oct; earlier plans are blank). Columns D–F are formulas and are not read.

Dates are requested with `valueRenderOption=UNFORMATTED_VALUE` and `dateTimeRenderOption=SERIAL_NUMBER`, then converted from the Sheets epoch (day 0 is 30 Dec 1899). A cell that comes back as `YYYY-MM-DD` text is accepted too. A row that fails validation is skipped.

Check the real sheet without starting the site:

```bash
npm run check-sheet
```

That prints today's spend, this month's spend and income, and the category totals as JSON. It does not print the key. If the service-account variable is missing, the command exits instead of falling back to the fixture.

## Deploy on Vercel

Import this repo. Leave the framework preset on Next.js and do not change the build command. Add `APP_PASSCODE`, `SHEET_ID`, and `GOOGLE_SERVICE_ACCOUNT_JSON` (the same one-line JSON), then deploy. The free tier is enough: the sheet is read from a Node server route.

Install it from the phone browser after that (Add to Home Screen on iOS, or Install app in Chrome). The manifest and icons are included. There is no service worker, so the home-screen icon opens the live site instead of a cached copy.

Changing the passcode takes effect on the next request in local dev. On Vercel, redeploy after changing environment variables if a running deployment still has the old value.

## Scripts

- `npm run dev` — local site
- `npm test` — parsing, Dhaka totals, and the fixture
- `npm run lint`
- `npm run build`
- `npm run check-sheet` — real sheet totals as JSON
