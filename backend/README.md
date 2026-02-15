# Go Backend (PostgreSQL / Railway)

## Run locally
1. `cd backend`
2. `cp .env.example .env`
3. Fill env vars (`DATABASE_URL`, Firebase related values)
4. `go mod tidy`
5. `go run ./cmd/server`

Server starts at `http://localhost:8080`.

## API base
All endpoints are provided under `/api/*` with compatibility to existing Next.js frontend API shape.

## Admin auth
- Protected endpoints require `Authorization: Bearer <Firebase ID token>`.
- Optional allow-list:
  - `ADMIN_EMAILS` (comma-separated)
  - `ADMIN_UIDS` (comma-separated)
- If neither is set, any valid Firebase token is accepted.
- Frontend login should call backend auth APIs:
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `GET /api/auth/me`
- App mode check API:
  - `GET /api/app-mode`
  - If `APP_MODE=true`, frontend can redirect `/admin/login` -> `/admin/signin`.
- Admin image upload API:
  - `POST /api/images/upload` (Bearer token required)
  - multipart form fields:
    - `file` (image file)
    - `path` (`product` | `profile` | `other`)

## Railway deploy
- Set `PORT` (Railway usually injects automatically)
- Set `APP_MODE` (`true` to enable `/admin/login` -> `/admin/signin` flow)
- Set `DATABASE_URL` to Railway Postgres URL
- Set Firebase env vars
  - `FIREBASE_WEB_API_KEY` (for email/password login API)
- Set SES env vars (for inquiry mail send/receive flow)
  - `MAIL_FROM`
  - `MAIL_TO` (comma-separated recipients for inquiry notifications)
  - `MAIL_RETRY_MAX` (default: `3`)
  - `MAIL_RETRY_INTERVAL_MS` (default: `500`)
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `SES_CONFIGURATION_SET` (optional)
- Set GitHub env vars (for image upload)
  - `GITHUB_TOKEN` (repo write permission)
  - `GITHUB_OWNER`
  - `GITHUB_REPO`
  - `GITHUB_BRANCH` (default: `main`)
- Set CORS env vars:
  - `CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com`
  - `CORS_ALLOW_CREDENTIALS=false` (recommended for bearer-token auth)

## Table assumptions
This backend is currently aligned to your migrated Railway schema:
- `products`
- `activities`
- `activityCategories`
- `sectionMeta`
- `sections`
- `technologies`
- `adminLogs`

If `public.inquiries` does not exist, inquiry APIs return `501 Not Implemented` with a clear message.

## Create inquiries table
Run this on Railway Postgres if `public.inquiries` is missing:

```sql
\i backend/docs/migrations/001_create_inquiries.sql
```

If you are inside a remote `psql` session where local file include is unavailable, copy and run the SQL directly from:
`backend/docs/migrations/001_create_inquiries.sql`

## Inquiry mail behavior
- `POST /api/inquiries`
  - Sends notification mail to `MAIL_TO`
  - Sends auto-reply to inquiry sender (`contact_email`)
- `POST /api/inquiries/{id}/reply`
  - Sends reply mail to inquiry sender (`contact_email`)
