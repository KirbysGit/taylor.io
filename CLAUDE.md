# taylor.io — CLAUDE.md

Resume-building SaaS ("taylor", domain trytaylor.io). FastAPI + SQLAlchemy + Alembic backend, React + Vite + Tailwind frontend. Currently pre-launch beta (free tier, no payments).

## ⚠️ REQUIRED: update HANDOFF.md after every change

After **every** code change you make in this repo — feature, fix, style tweak, migration, config change, anything — append an entry to `HANDOFF.md` before ending your turn. This is the handoff log between AI sessions and models. No exceptions: if you touched a file, HANDOFF.md gets an entry.

Entry format (newest entries at the TOP of the Change Log section):

```
### YYYY-MM-DD — short title
- What changed (files touched, one line per logical change)
- Why (one line)
- Gotchas / follow-ups (only if real)
```

Keep the Change Log to roughly the 30 most recent entries — when it grows past that, fold the oldest entries into the "Older history (summarized)" section at the bottom as one-liners.

## Project layout

- `backend/` — FastAPI app. Routers in `backend/routers/` (auth, profile, resume_generator, templates, ai). Models in `backend/models/`. Schemas in `backend/schemas.py`. Migrations in `backend/alembic/versions/`.
- `frontend/` — React (JSX, no TS). Pages in `src/pages/` numbered by flow: `1landing`, `2auth`, `3setup`, `4home`, `5resume`, plus `info`, `templates`, `settings`, `notfound`. Shared components in `src/components/`. API services in `src/api/services/`.
- Local dev DB is SQLite (`backend/tailor.db`); production is Postgres via `DATABASE_URL`. Run migrations with `backend/venv/Scripts/alembic upgrade head`.

## Conventions

- Auth: session cookie (`taylor_session`, httpOnly) or Bearer token; dependency is `get_current_user_from_token` in `backend/routers/auth.py`. New routers must require auth (router-level `dependencies=[Depends(get_current_user_from_token)]`) unless explicitly public.
- Frontend API calls go through `src/api/api.js` helpers (`apiRequest`, `apiRequestText`, `apiRequestBlob`) — they send credentials automatically. Never hardcode `localhost:8000` in components.
- Brand: cream background `#fff8ef`/`#fffaf3`, brand-pink `rgb(214,86,86)`, dark red `#9f3a40`. Headings use `font-serif` (Georgia). Error banners: brand-pink background, white text, `ErrorIcon`, slide-down in / fade out.
- Auth-related emails send via Resend from `EMAIL_FROM`; support address is hello@trytaylor.io (reference it only for genuine failures, not user-fixable errors).
- Python venv: use `backend/venv/Scripts/python` and `backend/venv/Scripts/pip` (Windows machine — global pip is broken).
- Alembic on SQLite: new NOT NULL columns need `server_default`.

## Before ending any session

1. HANDOFF.md updated (see above).
2. If you changed backend models: migration created AND run locally.
3. If you changed frontend: `npx vite build` passes.
