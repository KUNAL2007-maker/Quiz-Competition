# Null Origin

A fresh quiz competition application for the existing Null Origin brand. Vite serves the responsive React interface. One Node server API on Vercel uses Firebase Authentication and Cloud Firestore. The browser never receives the private question deck, answer keys, paid-entry email lists, or participant directory.

## Run locally

Use Node 22.12 or later. Run `npm ci`, copy `.env.example` to `.env.local`, fill in the new project settings, then run `npm run dev`. Vite serves both the app and its development API. Run `npm test` for rules-of-play and API tests, including the 200-player simulation. Run `npm run build` for the production bundle. The simulation uses an in-memory store and does not spend Firebase quota.

## Connect a new Firebase project

1. Create a fresh Spark project and a Firestore Standard database in Native mode. Register a Web app. Set the four VITE_FIREBASE values from that app. Use the same project for FIREBASE_PROJECT_ID.
2. Enable Google and Email/Password in Authentication and add your app domains to Authorized domains. Set the support email and configure the consent screen for the new project.
3. Deploy the included Firestore rules and indexes with `firebase deploy --only firestore:rules,firestore:indexes --project YOUR_NEW_PROJECT`. Wait for the attempts index to finish building. Client database reads and writes are denied. The server uses IAM.
4. Create a dedicated server service account with the necessary Firebase Authentication Admin and Cloud Datastore User access in this project. Put its client email and private key in server environment variables. The private key accepts escaped newlines. Never assign a VITE_ prefix to a secret.
5. Sign in to the app, verify your address, then copy your UID from the new project's Authentication user list into ADMIN_UIDS. Comma-separate additional operator UIDs. Redeploy after changing Vercel environment settings.

## Send branded email

Use the transactional email service associated with Zoho (ZeptoMail / Zoho CPaaS). Verify nullorigin.live in its sending console. Publish the exact assigned DKIM and return-path records and align your domain's SPF/DMARC as instructed by the provider. Preserve existing mailbox MX records and merge SPF mechanisms into one SPF record. Use the regional SMTP host, port, username and send token from that service. The From address in the app is contact@nullorigin.live.

Set SITE_ORIGIN to the deployed HTTPS origin and use a cryptographically random secret of at least 32 characters for EMAIL_OTP_SECRET. In Firebase Authentication email templates, set the custom action URL to the same origin plus /auth/action. Verification and reset links use that branded handler. Test registration, resend, reset and password linking with a mailbox you own. Check email authentication results in the receiving mailbox. Delivery and Zoho sending allowance depend on the configured sender account.

## Hosting

Import this repository as a Vite project on Vercel with repository root as the project directory. Use npm ci, npm run build and dist. Set environment values for the intended environment and redeploy. The API is /api/router with rewrites for /api/*. No Render process or paid Firebase Functions deployment is required. Vercel Hobby is limited to personal non-commercial use. Choose eligible hosting before running commercial paid-entry events.

## Operating an event

An administrator publishes a title, entry window, per-question time, and a JSON question array. Each item has text, options and a zero-based correctIndex. Paid competitions take a private list of eligible verified emails. Practice supports fresh retakes. Verify the uploaded question text and correct indices before publishing. Published event settings are immutable.

A verified account with a complete profile may claim one official attempt per email and UID. Entry closes strictly at the host's deadline. An admitted participant receives the full quiz duration, even after closing. A three-second countdown precedes scoring. Next and Submit Quiz confirm the current selection. Unconfirmed choices time out. The backend measures elapsed time, serializes updates, rejects replayed stale answers and stores the result independently of standings. Answer review unlocks after the closing time and the final active attempt.

Public standings use only eligible finishers' usernames. The server caches the published board and reads newly completed attempts incrementally. A participant who receives the final question and reaches its timeout completes the event. Early departures expire as abandoned. Browser warnings can detect observed tab or clipboard events only. Multiple verified addresses can still represent one person. Mobile interruptions can generate visibility events.

Certificates are generated from final standings for the authenticated owner. A QR link provides limited public verification. Historical account, question, score and certificate data are excluded from this version.

## Launch checks

Use a staging Firebase project first. Test both sign-in methods, a real email, paid admission, repeated clicks, reconnects, two simultaneous starts, mobile timing, answer review release, and PDF download. Monitor Firestore reads/writes and Vercel traffic during an event. The local workload simulation cannot predict actual cloud latency, retry rates, cache hit rates or available quota. Inspect server error logs and the service dashboards if a request fails.
