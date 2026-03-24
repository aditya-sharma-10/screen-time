# Kids Screen Time Tracker

This project now includes:

- a React + Vite frontend
- a local Express API
- a SQLite database for shared app data on your local machine

## Run The App

Use two terminals:

```bash
npm run api
```

```bash
npm run dev
```

The API runs on `http://localhost:3001` and Vite proxies `/api` requests to it during development.

## Current API

Available routes:

- `GET /api/health`
- `GET /api/kids`
- `POST /api/kids`
- `DELETE /api/kids/:kidId`
- `GET /api/sessions`
- `POST /api/sessions`
- `PATCH /api/sessions/:sessionId/stop`
- `GET /api/settings`
- `PUT /api/settings`

## Notes

- The SQLite database file is created automatically in `data/screen-time.db`.
- The database is seeded with the same default kids and settings your frontend currently uses.
- The React frontend is not switched over to the API yet, so your current UI still reads from `localStorage` for now.

## SMS Notifications

To enable SMS alerts for the 15-minute warning and screen-limit reached messages, configure these environment variables before starting the server:

```bash
export TWILIO_ACCOUNT_SID=your_account_sid
export TWILIO_AUTH_TOKEN=your_auth_token
export TWILIO_FROM_NUMBER=+15551234567
```

Then enter the parent and kid phone numbers in Parent View and save the configuration.
