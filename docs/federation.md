# Federation

Federation lets independently hosted Demoify instances share their public tracks
in one **Explore** feed. A **hub** (e.g. `demoify.app`) accepts track submissions
from registered **client** instances and shows the approved ones in its Explore,
mixed in with its own local songs.

Only metadata crosses the wire — title, artist, genre, play/like snapshots, and
links back to the origin. **Audio is never copied.** Each track's audio stays on
the origin instance's storage, and Explore cards link out to the origin's song
page, where playback happens. That means there's no cross-origin audio to
configure (a listener clicking a federated track lands on the origin site).

## Roles

A single instance can be a client, a hub, or neither — selected by env vars:

| Role | Env | Effect |
| --- | --- | --- |
| Client | `FEDERATION_HUB_URL` + `FEDERATION_TOKEN` | Pushes this instance's public tracks to the hub. |
| Hub | `FEDERATION_HUB_ENABLED="true"` | Accepts submissions and shows approved tracks in Explore. |

Client pushes are **best-effort**: a failed submission is logged and never blocks
the local action (publishing, uploading, deleting).

## Client behavior

Once `FEDERATION_HUB_URL` and `FEDERATION_TOKEN` are set, the instance syncs a
song to the hub when it becomes publicly playable and removes it when it isn't:

- Making a song **public** (with at least one uploaded version) → submitted.
- Uploading a new version to a public song → re-submitted (refreshes audio URL).
- Editing genre on a public song → re-submitted (refreshes filter metadata).
- Making a song **private** or **deleting** it → removed from the hub.

See `src/lib/federation.ts` (`syncTrack` / `removeTrack`).

## HTTP API (hub side)

Implemented in `src/app/api/federation/tracks/route.ts`. Active only when
`FEDERATION_HUB_ENABLED="true"`; otherwise returns `404`.

Auth on every request:
- `Authorization: Bearer <token>` — the client's submission token.
- `X-Instance-Url: <origin>` — the client's public origin, matched to a
  registered `FederatedInstance.baseUrl`. The hub stores only the SHA-256 of the
  token and compares hashes.

### `POST /api/federation/tracks`

Body (`FederatedTrackPayload`):

```json
{
  "remoteId": "<SongProject id on origin>",
  "title": "…",
  "artistName": "…",
  "artistUrl": "https://origin/<band>",
  "trackUrl": "https://origin/<band>/<slug>",
  "audioUrl": "https://storage/…",
  "genre": "Electronic",
  "subgenre": "House",
  "playCount": 0,
  "likeCount": 0
}
```

Validation: required fields must be non-empty; `artistUrl` and `trackUrl` must be
on the instance's registered origin (anti-spoofing); `audioUrl` must be an
absolute URL (it lives on separate storage, so it isn't origin-matched); genre is
validated against the shared taxonomy in `src/lib/genres.ts`.

Upserts on `(instanceId, remoteId)`. New tracks are `approved` immediately only
for **trusted** instances; otherwise they land as `pending`. On update, the
status is left untouched so an operator's moderation decision stands.

### `DELETE /api/federation/tracks?remoteId=<id>`

Removes the matching track for the authenticated instance.

## Operating a hub

Use the admin script (`just federation …`, wrapping `scripts/federation.mjs`),
which runs against Cloudflare D1 via `wrangler d1 execute`. It targets the local
emulated DB by default; add `--remote` to manage production.

```bash
just federation add "Bob's Studio" https://music.bob.example   # register + print a one-time token
just federation trust https://music.bob.example                # auto-approve their future tracks
just federation approve https://music.bob.example              # approve their pending tracks now
just federation list                                           # instances + pending counts
just federation token                                          # just mint a token + its sha256

# Manage the production hub:
just federation add "Bob's Studio" https://music.bob.example --remote
```

`add` prints the env vars to hand to the client (the token is shown once; only its
hash is stored). Untrusted instances' tracks stay `pending` until you `approve`
them (or `trust` the instance). You can also moderate by editing `external_track`
rows directly in Prisma Studio (`just studio`) — set `status` to `approved` or
`rejected`.

The federation tables ship in `migrations/0009_federation.sql`; apply them like any
other migration (`npx wrangler d1 migrations apply demoify --local` / `--remote`).

## Security notes

- The submission token is the only credential — treat it like a secret and issue
  a distinct one per instance so you can revoke individually (delete the row).
- Pending-by-default moderation is the safety valve against an untrusted instance
  submitting junk; only `trust` instances you control or vet.
- The hub stores arbitrary text/URLs from clients. Titles/artist names are
  length-clamped and rendered as text; links are constrained to the instance's
  origin. Review pending tracks before approving.
