# Frontend Zero-Trust Guidelines

- **No derived state for logic**: All quiz flow, scoring, and eligibility come from server responses.
- **No optimistic scoring**: Display score only after server confirms (e.g. /quiz/finish response).
- **Client timers are display-only**: Countdown uses server `expiresAt`; server rejects late answers regardless.
- **Use X-Poll-Interval**: When polling /quiz/status or /quiz/state, respect `X-Poll-Interval` header if present.
- **Use If-None-Match**: Send `If-None-Match: <etag>` when re-polling to reduce payload (304 = unchanged).
