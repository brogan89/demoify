# Demoify MVP — Implementation Plan

> **Archived plan.** This is the original Claude plan the MVP was built from, kept
> for reference. A few things drifted during implementation — see
> **As-built deviations** at the bottom before treating any detail here as current.
> The credit/payment system was added later; see [credits-and-payments.md](./credits-and-payments.md).
> Everything built after the MVP is logged chronologically in [changelog.md](./changelog.md).

## Context

Demoify is "GitHub for songs": musicians share works-in-progress where each song has a permanent URL, multiple versions, and version history. The same link always serves the latest version while preserving older ones.

This is a **greenfield build** — `/home/brogan/mainframe/demoify` is empty, not yet a git repo. The plan scaffolds a Next.js 15 app from scratch and delivers the MVP workflow: a musician creates a song, uploads multiple revisions, and shares one permanent URL.

### Decisions confirmed with user
- **Auth**: Better Auth email + password. Username picked at signup, used in the permanent URL (`/[username]/[slug]`).
- **Upload**: Presigned direct-to-R2 upload from the browser (bypasses Vercel's 4.5 MB API body limit).
- **Duration**: Read client-side via HTML5 `Audio` element before upload, persisted with version metadata.

### Out of scope (Phase 2+)
Social feeds, notifications, mobile, AI, recommendations, payments, collaboration, comments, waveforms, version diffing.

---

## Tech Stack
Next.js 15 (App Router) · React · TypeScript · Tailwind · shadcn/ui · PostgreSQL · Prisma · Better Auth · Cloudflare R2 (S3 API) · Vercel.

---

## Step 1 — Project setup
- `npx create-next-app@latest` (TypeScript, Tailwind, App Router, `src/` dir, `@/*` alias).
- `npx shadcn@latest init`; add components as needed: `button card input label textarea avatar dropdown-menu sonner`.
- `git init`; add `.gitignore` (`.env*`, `/node_modules`, `.next`).
- `.env.local` keys (document in `.env.example`):
  - `DATABASE_URL`
  - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
- Verify: `npm run dev` serves default page.

## Step 2 — Database schema (Prisma + Postgres)
- `npm i -D prisma`; `npm i @prisma/client`; `npx prisma init`.
- Singleton client at `src/lib/db.ts` (guard against dev hot-reload duplicate connections).
- `prisma/schema.prisma` models:
  - **User** — `id, username @unique, displayName, email @unique, avatarUrl?, createdAt`. Plus Better Auth's required relations (Session, Account, Verification — generated per Better Auth's Prisma adapter).
  - **SongProject** — `id, ownerId -> User, slug, title, description?, createdAt`. `@@unique([ownerId, slug])` so the permanent URL is stable per artist.
  - **SongVersion** — `id, projectId -> SongProject, versionNumber Int, audioUrl, changelog?, duration Float?, uploadedAt`. `@@unique([projectId, versionNumber])`.
- `npx prisma migrate dev`. Verify with `npx prisma studio`.

## Step 3 — Authentication (Better Auth)
- `npm i better-auth`.
- `src/lib/auth.ts`: `betterAuth({ database: prismaAdapter(...), emailAndPassword: { enabled: true }, user: { additionalFields: { username, displayName } } })`.
- Route handler: `src/app/api/auth/[...all]/route.ts` → `toNextJsHandler(auth)`.
- Client helpers: `src/lib/auth-client.ts` (`createAuthClient`).
- `src/middleware.ts` or server-side guards protecting `/dashboard` and project-management actions; public pages stay open.
- Pages: `/signup` (email, password, username, displayName — validate username is unique + URL-safe), `/login`, sign-out action.
- Verify: register → land on dashboard; logout/login round-trips.

## Step 4 — Song project CRUD
- Server actions in `src/app/actions/projects.ts` (or route handlers): create / list-mine / get-by-owner-slug.
- Slug helper `src/lib/slug.ts`: slugify title, ensure unique per owner (append `-2`, `-3`…).
- **Dashboard** `/dashboard`: list current user's songs (card per project, latest version label), "Create Song" form (title + optional description → creates project, redirects to project page).
- Verify: create a project, see it on dashboard, project page loads (empty version state).

## Step 5 — Audio upload (presigned → R2)
- `npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`.
- `src/lib/r2.ts`: S3 client pointed at R2 endpoint (`https://<account>.r2.cloudflarestorage.com`).
- Route `POST /api/upload/presign`: auth-checked; takes `{ projectId, contentType, fileName }`; verifies caller owns project; returns presigned `PUT` URL + the final public object key/URL. Key shape: `songs/{projectId}/{uuid}.{ext}`.
- Client upload util `src/lib/upload.ts`: `PUT` file directly to presigned URL with progress; restrict to `audio/mpeg`, `audio/wav`.
- Duration: before upload, load file into `new Audio(URL.createObjectURL(file))`, read `loadedmetadata` → `duration`.
- Verify: upload an MP3, confirm object in R2 and playable at public URL.

## Step 6 — Version creation
- After successful R2 upload, server action `createVersion({ projectId, audioUrl, changelog, duration })`:
  - Compute next `versionNumber` = `max(existing) + 1` (start at 1).
  - Insert SongVersion. Wrap in a transaction / unique constraint to avoid race on versionNumber.
- "Upload new version" UI on project page: file picker → changelog textarea → upload → create version → refresh timeline.
- Verify: second upload becomes v2; URL unchanged; both versions persist.

## Step 7 — Project & public pages
- **Project page** (owner view) `/dashboard/[projectId]` or reuse public route with edit affordances:
  - Title, latest-version audio player, vertical version timeline, "Upload new version".
- **Public song page** `/[username]/[slug]` (no auth):
  - Resolve user by username → project by slug → versions desc.
  - Title, artist (displayName), latest-version player default, version history with changelogs.
  - Clicking a version loads it into the player (client state holds selected version; latest is default).
  - Permanent shareable URL; add `generateMetadata` for OG tags.
- **Audio player** `src/components/audio-player.tsx`: HTML5 `<audio>` wrapper — play/pause, seekable progress bar, current time / duration. No waveform.
- Verify: open public URL in a logged-out browser; switch versions; latest plays by default.

## Step 8 — Landing page + UI polish
- `/` landing: "GitHub for songs" headline, example version-history mockup (v1→v4), CTA to signup. Visible logged-out.
- Consistent shadcn styling, loading/empty/error states, toasts (`sonner`) on upload/create, basic responsive layout.

---

## Critical files
- `prisma/schema.prisma` — data model (User / SongProject / SongVersion + Better Auth tables).
- `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/r2.ts`, `src/lib/slug.ts`, `src/lib/upload.ts`.
- `src/app/api/auth/[...all]/route.ts`, `src/app/api/upload/presign/route.ts`.
- `src/app/actions/projects.ts`, `src/app/actions/versions.ts`.
- `src/app/(auth)/login`, `src/app/(auth)/signup`.
- `src/app/dashboard/...`, `src/app/[username]/[slug]/page.tsx`, `src/app/page.tsx`.
- `src/components/audio-player.tsx`, `src/components/version-timeline.tsx`, `src/components/upload-version.tsx`.

## Reuse / conventions
- Better Auth's Prisma adapter generates Session/Account/Verification tables — do not hand-roll auth.
- Single Prisma client singleton (`src/lib/db.ts`) reused everywhere.
- One presign route + one upload util reused by initial upload and every subsequent version.
- `versionNumber` derived from DB max under unique constraint — never trust client.

## Build order & guardrails
Follow steps 1→8 in order. After each step: app runs (`npm run dev`), TypeScript types written, no premature optimization, architecture stays simple.

---

## Verification (end-to-end)
1. `npm run dev`, register a new user with a username.
2. Create song project → appears on dashboard, gets permanent URL `/[username]/[slug]`.
3. Upload MP3 → v1 created, plays in player; confirm object lands in R2.
4. Upload again with a changelog → v2 created; same URL still resolves, now defaults to v2.
5. Open `/[username]/[slug]` in a logged-out browser → see title, artist, latest player, full version history; click v1 to load older version.
6. `npx prisma studio` → confirm User / SongProject / SongVersion rows and unique constraints.

**Success criteria**: a musician creates a song, uploads multiple revisions, and shares one permanent URL that always shows the latest version while preserving history.

---

## As-built deviations

What changed between this plan and the shipped code:

- **Next.js 16 / Prisma 7**, not 15/earlier — `create-next-app@latest` and Prisma's
  latest. Prisma 7 needs a **driver adapter** (`@prisma/adapter-pg`) and the DB URL
  in `prisma.config.ts` (not the schema `datasource` block). Client is generated to
  `src/generated/prisma` (gitignored).
- **Username is auto-derived**, not typed at signup. Signup asks only for a **band
  name**; the username is slugified from it and made unique with a numeric suffix
  (`band-name`, `band-name-2`, …) in a Better Auth `databaseHooks.user.create.before`
  hook. This covers social sign-ups too.
- **Google + Apple social sign-in** added (`signIn.social`), gated by env
  (`GOOGLE_*` / `APPLE_*`) via `src/lib/social.ts`; buttons only render when configured.
- **Credits + Stripe payments** added after the MVP — not in this plan. See
  [credits-and-payments.md](./credits-and-payments.md).
- **Local dev DB** runs in a Docker `postgres:16` container.
- `src/components/version-timeline.tsx` from the plan was folded into
  `src/components/song-view.tsx` (player + clickable timeline + selection in one).
- Server-side auth guards are used (`src/lib/session.ts` `getCurrentUser`) rather
  than `src/middleware.ts`.
