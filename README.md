# Portfolio

## Structure
- `frontend/`: Next.js frontend
- `backend/`: Go API server
- `docker-compose.yml`: local runtime (frontend + backend)

## Run with Docker + Make
0. Prepare env files:
   - `make init-env`
1. Start:
   - `make up`
   - `make help` (all available targets)
2. Check:
   - Frontend: `http://localhost:3001`
   - Backend health: `http://localhost:8081/health`
3. Logs:
   - `make logs`
4. Stop:
   - `make down`

## Notes
- Frontend does not require Firebase env vars for login.
- Auth is handled by backend endpoints (`/api/auth/login`, `/api/auth/refresh`, `/api/auth/me`).
- `APP_MODE=true` in `backend/.env` enables redirect from `/admin/login` to `/admin/signin`.
- Docker Compose reads env files from:
  - `frontend/.env`
  - `backend/.env`
