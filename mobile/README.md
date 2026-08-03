# LogiOp Pro — Android app

Expo (React Native) Android client for the LogiOp Pro backend.

## Features

- Dashboard — INR/THB payables & receivables, bag status
- Parties — customers, carry persons, FX quotes
- Ledger khata — you gave / you got, bill attachments
- Shipments — create lots with N bags
- Bag tracker — search by lot/batch
- Transport — assign carry person / cargo + optional ledger sync
- Settings — point app at your server API URL

## Run (Expo Go)

1. Start the web API from repo root:
   ```bash
   npm run dev
   ```
2. Start the mobile app:
   ```bash
   cd mobile
   npm start
   ```
3. Install **Expo Go** on your Android phone, scan the QR code.
4. Open **Settings** in the app and set API URL to your computer LAN IP, e.g. `http://192.168.1.10:3000`.

### Android emulator

Default API URL is `http://10.0.2.2:3000` (maps to host `localhost:3000`).

```bash
cd mobile
npm run android
```

## Build an APK (EAS)

```bash
cd mobile
npx eas-cli login
npx eas build -p android --profile preview
```

`eas.json` includes a `preview` profile that outputs an installable APK.
