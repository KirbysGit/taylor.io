# HANDOFF.md — AI session handoff log

Living log for AI-model handoffs. **Newest entries first.** Every code change gets an entry (rule lives in CLAUDE.md). Read "Current state" + the last few Change Log entries to get up to speed fast.

## Current state (updated 2026-06-10)

- **Stage**: pre-launch beta, preparing for first deployment (Railway planned for backend, frontend host TBD). Domain `trytaylor.io` on Cloudflare DNS; email via Resend (verified domain), support address hello@trytaylor.io.
- **In progress**: working through a pre-deployment audit (see "Open audit items" below).
- **Auth flow**: register → verification email → login (session cookie) → `/setup` onboarding → `/home` dashboard. Setup completion is a server-side `users.setup_completed` flag.
- **Rate limits**: AI tailor capped at 5/day per user; verification/reset emails 60s cooldown + 5/day per type per account.

## Open audit items (pre-deploy)

Deploy blockers (config):
- [ ] Frontend has no production `VITE_API_URL` (falls back to localhost:8000; also hardcoded fallbacks in `ResumeStyling.jsx` + `TemplatesPage.jsx`)
- [ ] `FRONTEND_URL` in backend/.env points to localhost:5173 (breaks email links in prod)
- [ ] Rotate all secrets in backend/.env before launch (OpenAI, Resend ×2 duplicate lines, SECRET_KEY)

Code fixes:
- [ ] Tailor counter increments before the AI call succeeds (failed call burns a daily use) — `backend/routers/ai.py`
- [ ] DashboardDevDock renders for all users in production (needs `import.meta.env.DEV` guard) — `frontend/src/pages/4home/Home.jsx`
- [ ] SavedResumeCard status labels are fake (`index % 3` assigns Draft/Ready/Saved) — `Home.jsx`
- [ ] Resume editor loads silently empty if profile fetch fails — `useResumePreviewBootstrap.js`
- [ ] Verification token lookup is a full-table scan in Python — `_find_user_by_token_hash` in `auth.py`
- [ ] No account management (change name/email/password) — Settings says "coming soon"
- [ ] No `.env.example` for backend or frontend

Done: generator routes auth ✅, /users deleted ✅, setup flag server-side ✅, silent save failure ✅, backend password validation ✅, email throttling ✅, 404 page ✅.

## Change Log

### 2026-06-10 — Email send throttling (anti-bombing)
- `backend/models/user.py` + migration `b41e7a93c5d2`: six columns tracking last-sent/daily-count/count-date for verification + reset emails
- `backend/routers/auth.py`: `_email_throttle_allows()` — 60s cooldown, 5/day per type; applied to `resend-verification`, `forgot-password`, and `register` (initial send counted)
- Throttled requests silently no-op and return the same generic response (no account-enumeration oracle)

### 2026-06-10 — Backend password validation
- `backend/schemas.py`: shared `validate_password_strength()` (8–128 chars, 1 uppercase, 2 digits, 1 special) via `field_validator` on `UserCreate` AND `ResetPasswordRequest`
- `frontend/.../Auth.jsx` ResetPasswordPanel: now mirrors full signup rules client-side (was only length ≥ 8 — users could downgrade their password via reset)
- `Auth.jsx` + `SignUpModal.jsx`: 422 handlers extract human message from pydantic's detail array

### 2026-06-10 — Setup completion server-side (+ silent save failure fix)
- `users.setup_completed` column (migration `8f2c41d09a7e`; existing users grandfathered to true)
- `POST /api/profile/complete-setup` endpoint; flag included in login + `/me` via `UserResponse`
- `ProtectedRoute.jsx` checks server flag (localStorage helper deleted); `AccountSetup.jsx` calls `completeSetup()` after saves succeed; failed save now shows error banner and does NOT navigate; skip-setup also goes through the endpoint
- Login routes by flag: onboarded → `/home`, new → `/setup`

### 2026-06-09 — Deleted dead /users routes
- Removed `backend/routers/users.py` (unauthenticated GET /users dumped all users), unwired from `main.py` + `routers/__init__.py`
- Deleted unused `frontend/src/api/services/user.js` + `experience.js` (never imported; real `createExperience` lives in `profile.js`)

### 2026-06-09 — Locked resume generator routes
- `backend/routers/resume_generator.py`: router-level `dependencies=[Depends(get_current_user_from_token)]` — `/preview`, `/pdf`, `/docx` now require login

### 2026-06-09 — 404 page + landing navbar alignment
- `frontend/src/pages/notfound/NotFound.jsx`: full 404 page (Inter "404", serif heading, Go home / Back to dashboard buttons, trust chips, illustration slot `public/not-found-graphic.png`); routes `/404` + catch-all `*` in `App.jsx`
- Reuses `LandingHeader` (nav links now fall back to `navigate('/#hash')` off-landing)
- `LandingHeader.jsx`: darker red `rgba(181,70,73,0.85)`, width `max-w-[92rem]` aligned to page bounds
- `LandingHero.jsx`: container mirrors header bounds; left `pl-6` aligns text with logo, right keeps `pr-10/12` for illustration
- Custom `GridIcon` (4 hollow sharp-corner squares) added to `src/components/icons/index.jsx`

### 2026-06-09 — Dashboard sidebar redesign (DashboardShell.jsx)
- White sidebar, pink-tinted active states w/ left accent bar, dark-red gradient top fade, brand-pink Create résumé CTA, user card + logout at bottom, nav groups (Workspace/Account)
- "Your career data" card: replaced gradient-border pills/icons with solid borders (emerald Ready pill, gray Missing pill)
- PrimaryResumeCard: white card + pink-gradient featured "Tailor to a role" sub-card, blush top-right

### 2026-06-09 — Setup step empty states + misc
- Branded empty-state SVGs (pink sparkles + icon: grad cap / briefcase / clipboard) in Education/Experience/Projects inputs
- Removed Incomplete/Complete status pills from all three entry summaries
- Steps own headers + add buttons (`hideHeader` pattern); shortened education description copy across 4 files

### Older history (summarized)
- 2026-06 (early): validation system for setup steps (refs + `revealMissingRequired`, red border + shake, error banner outside card w/ scroll-to-top, abrupt-in/fade-out); WelcomeStep horizontal-card redesign; Auth screens rebuilt (AuthCard/IconBadge, lime success states, animated checkmark); error message copy pass app-wide; branded HTML email templates (table layout, inline SVG icons); Georgia as serif font everywhere
- 2026-05: Postgres + Alembic migration setup (`DATABASE_URL` env, initial schema `623682c7611e`, tailor cap `3370e73b321a`); AI tailor rate limit 5/day (429 + UI handling); Resend transactional email w/ trytaylor.io domain, Cloudflare DNS + email routing
