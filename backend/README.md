# Go Backend (PostgreSQL / Railway)

## Run locally
1. `cd backend`
2. `cp .env.example .env`
3. Fill env vars (`DATABASE_URL`, Basic authentication values)
4. `go mod tidy`
5. `go run ./cmd/server`

Server starts at `http://localhost:8080`.

## API base
All endpoints are provided under `/api/*` with compatibility to existing Next.js frontend API shape.

## Admin auth
- Protected endpoints require `Authorization: Basic <base64(username:password)>`.
- Configure the single administrator account with `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD`, and optionally `BASIC_AUTH_EMAIL`.
- Basic authentication must be used over HTTPS in production.
- Frontend login should call backend auth APIs:
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- App mode check API:
  - `GET /api/app-mode`
  - If `APP_MODE=true`, frontend can redirect `/admin/login` -> `/admin/signin`.
- Admin image upload API:
  - `POST /api/images/upload` (Basic authentication required)
  - multipart form fields:
    - `file` (image file)
    - `path` (`product` | `profile` | `other`)

## Railway deploy
- Set `PORT` (Railway usually injects automatically)
- Set `APP_MODE` (`true` to enable `/admin/login` -> `/admin/signin` flow)
- Set `DATABASE_URL` to Railway Postgres URL
- Set `APP_BASE_URL` to the frontend public URL (used for inquiry thread links in emails)
- Run `make migrate` after deployment or schema changes. The API server never migrates the database at startup.
- Run `make mocks` only against the local PostgreSQL service. The mock command rejects non-local `DATABASE_URL` hosts before connecting, and it must never be pointed at production or a shared database.
- Set Basic authentication env vars
  - `BASIC_AUTH_USERNAME`
  - `BASIC_AUTH_PASSWORD`
  - `BASIC_AUTH_EMAIL` (optional, for administrator logs and display)
- Set SES env vars (for inquiry mail send/receive flow)
  - `MAIL_FROM` (optional. unsetならメール送信はスキップ)
  - `MAIL_TO` (optional. comma-separated recipients for inquiry notifications)
  - `MAIL_RETRY_MAX` (default: `3`)
  - `MAIL_RETRY_INTERVAL_MS` (default: `500`)
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `SES_CONFIGURATION_SET` (optional)
- Set Discord env vars (optional for inquiry notifications)
  - `DISCORD_WEBHOOK_URL`
  - or `DISCORD_WEBHOOK_URLS` (comma-separated)
- Set GitHub env vars (for image upload)
  - `GITHUB_TOKEN` (repo write permission)
  - `GITHUB_OWNER`
  - `GITHUB_REPO`
  - `GITHUB_BRANCH` (default: `main`)
- Set Google Calendar env vars (public week view + admin calendar)
  - `GOOGLE_CALENDAR_IDS` (comma-separated)
    - single-calendar fallback: `GOOGLE_CALENDAR_ID`
  - `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON`
    - raw JSON or base64-encoded JSON
  - `GOOGLE_CALENDAR_TIMEZONE` (default: `Asia/Tokyo`)
- Set CORS env vars:
  - `CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com`
  - `CORS_ALLOW_CREDENTIALS=false` (recommended for Basic authentication)

## Table assumptions
This backend is currently aligned to your migrated Railway schema:
- `products`
- `activities`
- `activityCategories`
- `sections`
- `technologies`
- `adminLogs`

If `public.inquiries` does not exist, inquiry APIs return `501 Not Implemented` with a clear message.
If the inquiry thread schema (`thread_id`, `inquiry_replies`) is missing, run `make migrate`.

## Create inquiries table
Run this on Railway Postgres if `public.inquiries` is missing:

```sql
\i backend/docs/migrations/001_create_inquiries.sql
```

If you are inside a remote `psql` session where local file include is unavailable, copy and run the SQL directly from:
`backend/docs/migrations/001_create_inquiries.sql`

If `public.inquiries` already exists from the older schema, run `make migrate`.

## Inquiry mail behavior
- `POST /api/inquiries`
  - Sends notification mail to `MAIL_TO` if configured
  - Sends Discord webhook notification if `DISCORD_WEBHOOK_URL` or `DISCORD_WEBHOOK_URLS` is configured
  - Sends receipt mail to inquiry sender (`contact_email`) if mail sending is configured
  - Returns `threadId` and uses the thread URL in notifications
- `GET /api/inquiries/thread/{threadId}`
  - Returns the inquiry thread for the public confirmation page
- `POST /api/inquiries/thread/{threadId}/reply`
  - Adds a follow-up message to the same inquiry thread
- `POST /api/inquiries/{id}/reply`
  - Sends reply mail to inquiry sender (`contact_email`) if mail sending is configured
- `GET /api/calendar/events` — public: week grid (titles etc. sanitized on the server; empty slots imply free time)
- `GET /api/admin/calendar/events`
  - Admin only
  - Full Google Calendar events for the admin UI
- `GET /api/admin/calendar/preferences`
  - Admin only
  - Returns per-`calendarId` color and label settings
- `PATCH /api/admin/calendar/preferences`
  - Admin only
  - Saves per-`calendarId` color and label settings for the Google Calendar admin UI
