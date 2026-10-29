# Daily budget

An Android app for glancing at spending, plus a small Next.js backend that reads a Google Sheet and never writes to it. Money Kick (or anything else) can add, edit, and delete rows. The service-account key stays on the server. It is not in the app.

The phone calls `GET /api/summary` with `Authorization: Bearer <APP_PASSCODE>`. The passcode is compared in constant time and stored on the phone in `expo-secure-store`. Today and this month are computed in Asia/Dhaka. Amounts are in taka. The app polls about every 15 seconds while it is in the foreground, refetches when it returns to the foreground, and supports pull-to-refresh.

A browser page is still there. It uses an httpOnly cookie from the same passcode. The phone does not use that page.

## Run the backend

Fixture data is used when `GOOGLE_SERVICE_ACCOUNT_JSON` is unset.

```bash
npm install
cp .env.example .env.local
```

Set `APP_PASSCODE` in `.env.local`, then:

```bash
npm run dev
```

The API is at http://localhost:3000/api/summary. The sample ledger is `data/fixture.json`. It leaves a gap in the ids (there is no 3), includes an income row, and has expenses on 29 Oct 2026, which is "today" when the Dhaka date is that day. On any other day, today's total may be ৳0. October's totals still show during October.

The browser UI is http://localhost:3000. It asks for the same passcode and sets a cookie for 30 days.

### Connect the real sheet

1. In Google Cloud Console, create or pick a project and enable the **Google Sheets API**.
2. Create a service account. It does not need project roles.
3. Create a JSON key for that account and download it.
4. Share the spreadsheet with the service account email (`client_email` in the key) as a **Viewer**.
5. Set the variables in `.env.local` or on the host:

```bash
SHEET_ID=1N77DmM-QnE7TYgaYL9tUok23fWTJUQGNElkbqi5fyGI
APP_PASSCODE=choose-a-passcode
GOOGLE_SERVICE_ACCOUNT_JSON="$(jq -c . /path/to/key.json)"
```

`GOOGLE_SERVICE_ACCOUNT_JSON` is the full key, minified to one line. It never goes to the phone.

The sheet has two tabs:

- `Transactions` — headers on row 1, data from row 2. Columns A–G are id, date, amount, currency, category, note, and type (`expense` or `income`). Every read loads `A2:G` again. Rows can be appended, edited, or deleted, and ids are not contiguous.
- `Daily Spend` — one row per day of 2026, and row 2 is 1 Jan. Column A is the date. Column C is the planned daily budget. Columns D–F are formulas and are not read.

Dates are requested with `valueRenderOption=UNFORMATTED_VALUE` and `dateTimeRenderOption=SERIAL_NUMBER`, then converted from the Sheets epoch (day 0 is 30 Dec 1899). A `YYYY-MM-DD` string is accepted too. A row that fails validation is skipped.

```bash
npm run check-sheet
```

That prints today's spend, this month's spend and income, and the category totals as JSON. It does not print the key. If the service-account variable is missing, the command exits instead of using the fixture.

### Deploy the API on Vercel

Import this repo. Framework preset: Next.js. Add `APP_PASSCODE`, `SHEET_ID`, and `GOOGLE_SERVICE_ACCOUNT_JSON`, then deploy. Point the phone at that origin. Do not put the key in the Expo project.

## Run the app in Expo Go

Install Expo Go from the Play Store. The phone and the computer need to be on the same network, and the backend must be running.

```bash
cd mobile
npm install
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` to the computer's LAN address, for example `http://192.168.1.20:3000`. `localhost` points at the phone, not the computer.

```bash
npx expo start
```

Scan the QR code in Expo Go. The first launch asks for the passcode once and stores it. Sign out to enter a different one.

On the Android emulator, use `http://10.0.2.2:3000` instead. That address is the computer's localhost.

## Build and install an APK

You need a JDK and the Android SDK (platform 35, build-tools 35.0.0). This does not use EAS.

```bash
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

cd mobile
npx expo prebuild --platform android --no-install
cd android
EXPO_PUBLIC_API_URL=https://your-api.example ./gradlew assembleRelease
```

This Expo project signs that local release APK with the debug keystore, so there is no separate upload key. The APK is `mobile/android/app/build/outputs/apk/release/app-release.apk`. Install it with:

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

`EXPO_PUBLIC_API_URL` is baked in when Gradle bundles the JavaScript, so it has to be set for `./gradlew assembleRelease`. For a build that talks to a backend on the same computer from the emulator, use `http://10.0.2.2:3000`. Cleartext HTTP is allowed so that address works. A public deploy should use https.

`npx expo run:android` builds a debug APK that loads JavaScript from Metro, so `npx expo start` has to stay running.

## Scripts

From the repo root:

- `npm run dev` — backend
- `npm test` — parsing, Dhaka totals, fixture, and bearer auth
- `npm run lint`
- `npm run build`
- `npm run check-sheet` — real sheet totals as JSON

From `mobile/`:

- `npx expo start` — Expo Go
- `npm run typecheck`
