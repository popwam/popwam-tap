# POPWAM Tap Android (future)

This directory is intentionally a placeholder. No Android project is created or modified by the web MVP.

The future native Android client will authenticate against the POPWAM Tap API, list the signed-in user's tags, write the fixed `https://go.popwam.com/t/{token}` URL to NFC stickers, optionally lock stickers read-only, and read/test programmed stickers. A later phase may add Android HCE for an offline tap mode.

The web app already reserves `src/app/api/mobile`, `src/lib/api-auth.ts`, and ownership helpers so API-token and refresh-token authentication can be introduced without coupling the domain model to the browser dashboard.
