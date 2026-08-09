# Demoify — Reddit launch posts

_Written: 2026-08-09 · Companion to [`marketing-strategy.md`](marketing-strategy.md) §2b · Covers the Week 3 checklist item "write + peer-review … 3 subreddit posts (each native to its sub)"_

Five ready-to-post drafts, the subreddit shortlist they map to, and the schedule. Copy is written
to the adopted positioning: **"GitHub for songs" appears only in builder subs**; musician subs lead
with the pain.

---

## Pre-flight — do not post until these clear

All five verified missing/unconfirmed at HEAD `830dfa3` on 2026-08-09.

| # | Blocker | Check |
|---|---|---|
| 1 | **No terms / privacy / DMCA page** — nothing under `src/app` matches `*terms*`, `*privacy*`, `*dmca*`. Strategy assumption #5, now confirmed. | `demoify.app/terms` loads an own-work-only rights page with a DMCA contact |
| 2 | **No OG images / `metadataBase`** — Reddit will render a bare grey card. Strategy 2a #1: *"Do before ANY outreach."* | `grep -rn "metadataBase" src/` hits, and a song URL unfurls with artwork in Discord |
| 3 | **No `?ref`/UTM capture** in `src/lib/analytics.ts`. Kills the "signups by source" metric and the Sep 5 retro decision. | A signup via `?ref=reddit_musicproduction` shows that source in `/admin/analytics` |
| 4 | **Production `CREDITS_ENABLED` unconfirmed** — defaults to `true`. Every draft below says "free right now." | Confirmed `false` in prod; upload UI shows no credit cost |
| 5 | **Launch gate: ≥100 real tracks in Explore by Aug 27**, else slip a week. | Explore shows ≥100 tracks from outside accounts |

**Independent of all of the above — start now.** The Week-1 task *"warm Reddit accounts (genuine
feedback, zero promo)"* hasn't begun. Three weeks of real commenting in these subs is what makes a
Sep 3 post land instead of reading as a drive-by. ~15 min/day.

---

## The subreddits

### Tier 1 — a native post each

| Sub | Why | Post | Date |
|---|---|---|---|
| **r/selfhosted** | Strategy's *"beachhead-of-the-beachhead."* Open source + bring-your-own-S3 + federation is genuinely novel there, and they tolerate a v0.1. Best signal-to-risk on the list. | A | Wed Sep 2 |
| **r/musicproduction** | Largest musician sub materially more tolerant of free tools than WATMM. Bouncing revisions and collecting notes is its daily subject. | C | Thu Sep 3 |
| **r/homerecording** | *Added — not in the strategy doc.* Its core activity **is** bounce → send to collaborator → get notes. Closest workflow match of any musician sub. | D | Fri Sep 4 |
| **r/WeAreTheMusicMakers** | Biggest reach, strictest mods. Deliberately **last**, once the framing is proven and there's real launch-week activity to point at. | E | Mon Sep 7 |

### Tier 2 — drip after launch week, one per ~3 days

`r/edmproduction` (Sep 10) · `r/Songwriting` (Sep 14) · `r/mixingmastering` (Sep 17) ·
`r/makinghiphop` (Sep 21). Re-cut post C's opening for each. Several route self-promo into
designated weekly threads — check first.

### Tier 3 — builder sinks, ~10 min each, near-zero risk

`r/SideProject` and `r/opensource` (post B, Fri Sep 4) · `r/webdev` **Showoff Saturday thread only**
(Sat Sep 5).

### Do NOT post the tool to these

- **r/IndieMusicFeedback** — the strategy calls it the *"highest-fit single community,"* and that's
  true of the **culture**, but it's a sub for feedback on **songs**, not for launching tools. A tool
  post reads as off-topic. Participate, use the Discord, and **message the mods first** if you want
  to post at all.
- **r/audioengineering** — strict, skews working professionals; rough-demo sharing isn't their problem.
- **r/Music, r/listentothis, r/spotifyplaylists** — wrong audience, fast ban.

### Rules for every post

1. **Re-read the sub's rules the same day you post.** None of the rule text was verifiable when this
   was written (Reddit is blocked from the authoring environment). Some subs require flair or route
   self-promo into weekly threads.
2. **Never reuse a title or body.** Cross-sub duplicate text is the most reliable way to trip both
   the spam filter and a mod checking your history. That's why there are five drafts, not one.
3. **One musician sub per day, maximum.**
4. **90/10 give-to-ask** — comment on other people's tracks in that sub before and after you post.
5. **Reply within 2h** all launch week.
6. **Never imply federation is in use.** Strategy assumption #4: zero external instances exist.
   Post A says so explicitly — keep it that way.

---

## Post A — r/selfhosted

**Title**

> Demoify — self-hostable demo sharing for musicians: one permanent link per song, new versions don't break it, comments anchored to version + timestamp

**Body**

Solo dev in Hamilton, New Zealand. Been building this for a while and it's finally stable enough to show.

**The problem it solves:** sharing a song that isn't finished is a mess. You bounce `final_mix_v2_REAL.mp3`, drop it in Discord, and three days later someone says "chorus is too loud" — except you've bounced twice since, so nobody knows which version that was about. WeTransfer links expire. Dropbox is a file browser, not a player. Private SoundCloud hands you a brand new link every time you re-upload.

**What it does:** every song gets one permanent URL at `/{artist}/{slug}`. Upload a new take and that same URL serves it — old versions stay archived, each with its own changelog. Listeners just press play; no account, no app. Comments anchor to a specific version and optionally a timestamp, so "vocal's buried here" lands at 1:47 of v3 and still says v3 after you've shipped v4.

**Self-hosting specifics:**

- Next.js 16 on Cloudflare Workers via OpenNext, D1 (SQLite) through Prisma 7, R2 for audio.
- No database server to install. Local dev runs an emulated D1 — fully offline, no Docker, no connection string.
- Storage is plain S3 API, so R2 / S3 / MinIO / Backblaze B2 all work.
- `CREDITS_ENABLED=false` removes the upload-credit gate entirely: free unlimited uploads, all credit UI hidden, Stripe can stay unconfigured. The credit thing is purely a gate on the hosted instance — there's no transcoding or AI behind an upload, so once you bring your own storage there's nothing real to meter.
- Every optional integration (Google/Apple login, R2, Stripe, Resend) is feature-gated and stays dormant until its credentials exist. The app boots with only the core config set.
- **Federated Explore:** your instance can submit its public tracks' *metadata* to a central hub so they appear in a shared discovery feed, while audio keeps streaming from your own storage and listeners click through to you. Honest status — the protocol works and is documented, but **zero external instances exist today**. I'm the only one running it. That's the direction, not something you can go look at.

Apache 2.0. Source: `github.com/brogan89/demoify` — full Cloudflare/D1/R2/CI walkthrough in `DEPLOYMENT.md`.

Hosted instance at demoify.app is free right now — credits disabled, Stripe off.

Happy to answer anything about the setup. Running Prisma against a Worker binding and the presigned browser-upload path were the two genuinely annoying parts.

---

## Post B — r/SideProject and r/opensource

Use a different title per sub; same body is fine across these two since the audiences barely overlap.

**Title (r/SideProject)**

> Demoify — one permanent link per song, so sending an unfinished mix doesn't turn into five links and a guessing game

**Title (r/opensource)**

> Demoify (Apache 2.0) — versioned demo sharing for musicians, self-hostable on Cloudflare or any S3-compatible storage

**Body**

Solo dev, Hamilton NZ. Apache 2.0, source at `github.com/brogan89/demoify`.

The problem: sharing a work-in-progress song is a mess. Re-uploading to SoundCloud gives you a new link. WeTransfer expires. Dropbox is a file browser, not a player. And feedback arrives with no idea which version or which second it was about.

Demoify gives each song one permanent URL. New versions serve from the same link, old takes stay archived, and comments anchor to a version plus an optional timestamp. Listeners press play — no account.

Next.js 16 on Cloudflare Workers, D1 via Prisma, R2 for audio. Self-hostable against any S3-compatible store, and `CREDITS_ENABLED=false` makes uploads free and unlimited.

Hosted at demoify.app, free right now.

Mostly after feedback on one thing: **is the landing page clear about what this actually is within about five seconds?** That's the bit I can't judge anymore.

---

## Post C — r/musicproduction

Do not use "GitHub for songs" in this or any musician sub.

**Title**

> Got tired of sending my band `mix_v3_FINAL_actual.mp3` — so I built a free thing where the link never changes

**Body**

I'm a solo dev (and a pretty average guitarist) in Hamilton, New Zealand. Built this to scratch my own itch, it's free, and I'm honestly more after a reality check than signups.

**The itch.** Every time I sent a mix to someone, the same three things went wrong:

1. **Version chaos.** `mix_v2.mp3`, `mix_v2_fixed.mp3`, `mix_FINAL_real.mp3` — five links for one song and nobody knows which is current.
2. **Feedback with nothing attached to it.** "Chorus is too loud," buried in a Discord scroll. Which version? Which second? By the time I read it I'd already redone the chorus.
3. **Getting people to actually listen.** WeTransfer expires. Dropbox makes them download a file. Private SoundCloud gives you a different link every re-upload.

**What I made.** Each song gets one permanent link. Bounce a new version, upload it, and the *same link* plays the new one — earlier takes stay there with a note on what changed. Whoever you sent it to just presses play. No account, no app, works fine on a phone.

Comments stick to a specific version, and optionally to a specific second of the track. So a note at 1:47 of v3 still says v3 after you've uploaded v4, instead of floating free.

Songs can be private (only your band sees them) or public. Bands are a real thing in it — the band owns the handle and the songs, and one login can run several projects.

It's free right now, nothing to pay for, no payment stuff switched on. It's early and it's one person, so expect rough edges.

The genuinely useful thing for me would be this: **does this solve a problem you actually have, or have you already got a workflow that works?** I'd rather hear "shared Dropbox folder, works fine, don't need this" than nothing at all.

demoify.app if you want a look.

---

## Post D — r/homerecording

Leads on the collaborator/tracking angle and puts unanchored feedback first, since mix notes are
that sub's currency. Deliberately shares no sentences with post C.

**Title**

> Free tool for sending mixes to collaborators — the link doesn't change when you re-bounce

**Body**

Solo dev in Hamilton, New Zealand. I made this for myself and it's free — posting because I want to know whether the problem is real for other people or just me.

The thing that kept happening: I'd send a rough mix to whoever I was tracking with, get notes back a few days later, and by then I'd already re-bounced twice. So "the snare is clicky" arrives with no version attached and no timestamp, and I'm sitting there guessing whether they meant Tuesday's take or Thursday's.

So — comments land on a specific version, and optionally on a specific second. A note at 2:14 of v3 still says v3 after you upload v4. Nothing floats free.

The other half is the link. Each song has one permanent URL. Re-bounce, upload, and the same URL plays the new one, with the earlier takes kept underneath and a line about what changed. The person you sent it to doesn't re-learn anything, doesn't download a file, doesn't need an account. They press play.

Private if you want it private — only the people in your band see it — or public.

Free right now, no payment anything switched on. One person built it, so it's rough in places.

What I'd actually like to know: **how are you handling this at the moment?** If you've got a system that works I want to hear it — half of why I'm posting is to find out whether I've built something nobody needed.

demoify.app

---

## Post E — r/WeAreTheMusicMakers

Post **last** (Mon Sep 7), after C and D have proven the framing. Most conservative cut: shortest,
"free / want feedback" in the opening paragraph, no numbered pain list. **Check whether WATMM
requires self-promo to go in a designated thread before posting at all.**

**Title**

> I built a free tool for sharing works-in-progress — after honest feedback on whether it's actually useful

**Body**

Quick note for the mods: this is free, I'm not selling anything, and I'm here for feedback rather than traffic. Happy to take it down if it's the wrong fit.

I'm a solo developer in Hamilton, New Zealand who plays a bit of guitar. I built a tool for one specific annoyance — sharing a song that isn't finished. You send someone a bounce, they reply days later, and by then the file they heard isn't the file you have.

Briefly, what it does: one permanent link per song. Upload a new version and that same link plays it, with earlier takes kept underneath. Comments attach to a version and optionally a timestamp, so feedback stays pinned to the take it was about. Whoever you send it to doesn't need an account — they press play.

It's free, there's nothing to buy, and it's early enough that you'll find rough edges.

> _Add one honest line here about what launch week actually taught you — e.g. a thing people asked for, or something that broke. Posting a week behind the others is only worth it if you use it._

I'm not really chasing signups. What would help is knowing whether this is a problem worth solving at all — plenty of people have a Dropbox folder and a group chat and are perfectly happy with it, and I'd like to know if that's most of you.

demoify.app if you want a look. I'll answer anything in the comments.

---

## Comment reply bank

Answer speed is what the strategy asks for; have these ready.

| Question | Answer |
|---|---|
| **"How is this different from a private SoundCloud link?"** | Re-uploading on SoundCloud gives you a new link and no version history — it's a public artist profile pretending to be a collab tool. Here the link is the permanent thing and versions stack behind it. |
| **"Why not Dropbox / Google Drive?"** | Those are file delivery, not listening: no inline comments, no notion of "the latest version," and the recipient has to download something. |
| **"Is it free? What's the catch?"** | Free right now, nothing switched on. Longer term there's an optional credit system for uploads on the hosted instance, and self-hosters can switch it off entirely. Nobody's being charged today. *(Depends on blocker #4.)* |
| **"Do you claim any rights to my music?"** | **Blocked on #1.** Needs a real link to an own-work-only terms page. Do not post to a music sub before this exists. |
| **"Can I self-host it?"** | Yes — Apache 2.0, walkthrough in `DEPLOYMENT.md`, and `CREDITS_ENABLED=false` gives free unlimited uploads against your own S3-compatible storage. |
| **"What happens to my music if you shut down?"** | It's open source and self-hostable, and I'd give notice and an export path. Don't overpromise beyond that. |
| **"Is this AI?"** | No. No AI anywhere in it. |
| **"Can I federate / run my own instance in the shared feed?"** | The protocol works and is documented, but no external instances exist yet — you'd be the first. Say exactly that; never imply usage. |

---

## After posting

Per the strategy's Phase 1 metrics: **signups by `?ref` tag per subreddit**, and **% of new artists
who get ≥1 comment from outside their band within 7 days**. Both feed the Fri Sep 5 retro and the
"pick ONE channel to double down on" decision.
