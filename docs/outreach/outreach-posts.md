# Outreach: HN Show HN, Reddit, & Music Forums

## Hacker News — Show HN

**Title:** Show HN: Demoify – GitHub for songs (versioned demo sharing for musicians)

**Post body:**

I built Demoify because I was tired of the "final_final_v3.mp3" email chain with my bandmates.

Demoify gives every song a permanent link (`demoify.app/band-name/song-title`), and every upload creates a new version under that same link — old versions stay accessible forever. Listeners leave timestamped feedback right on the track. Think GitHub for songs, but with audio playback built in.

Features ready today:

- Permanent URLs with versioned audio (push new versions, keep the same link)
- Timestamped comments anchored to playback position
- Bands with roles (ADMIN / MANAGER / MEMBER) — switch between artist profiles
- Explore feed with genre filters
- Credits economy — buy upload credits via Stripe or earn them through engagement
- Tipping via Stripe Connect (90% to artist, 10% platform)
- Open source (MIT) — <https://github.com/brogan89/demoify>

It's fully deployed and working at <https://demoify.app> — I'd love feedback.

**Coupon for HN readers:** use `LAUNCH100` at demoify.app/dashboard/credits for 100 free upload credits (no purchase needed). First 100 HN users get the bonus.

---

## Reddit Posts

### Post 1: r/WeAreTheMusicMakers — "Stop emailing demo files"

**Title:** I built a free tool for versioned demo sharing (think Git for songs)

**Post body:**

My band was tired of the "final_final_v3_master_2.mp3" email thread. So I built Demoify — a simple platform where every song gets one permanent link, and every new version replaces the same URL (old versions stay accessible).

Features:
- One link per song, forever
- Push new versions, listeners always hear the latest
- Timestamped feedback in the comments
- Private songs for band-only sharing
- Completely free to start (250 free upload credits with code WELCOME250 at demoify.app/dashboard/credits)

It's open source too if you want to host your own instance. Would love your thoughts: <https://demoify.app>

---

### Post 2: r/audioengineering — "Solving the demo version nightmare"

**Title:** How do you handle demo versioning with collaborators?

**Post body:**

I've been building a platform called Demoify (<https://demoify.app>) that treats song demos like Git commits — one permanent URL per track, new versions replace the URL content, and old versions stay accessible. Listeners can leave timestamped comments right on the audio.

Key question for this community: what's your current workflow for sharing demo versions with clients and collaborators? Dropbox folders? WeTransfer links? Session files?

I built this specifically because the "Demo_v2_for_client_FINAL.mp3" naming convention drives me crazy. But I want to make sure I'm solving the right problems.

Demo is live, free to use, and open source. Use `DEMOIFY100` at demoify.app for 500 bonus credits.

---

### Post 3: r/edmproduction — "Share your WIP and get timestamped feedback"

**Title:** Demoify – get actual timestamped feedback on your WIPs instead of "sounds good"

**Post body:**

We all know the cycle: you send a WIP link, get back "sounds good bro" with zero useful feedback. Demoify (<https://demoify.app>) lets listeners leave comments anchored to a specific moment in the track — "the kick at 1:23 needs more punch" or "the breakdown at 2:45 hits different."

Other features:
- One permanent link per track (no more re-uploading every revision)
- Version history preserved (older takes still playable)
- Public or private songs
- Free credits to start (use WELCOME250)

Built for producers, by a producer. Check it out: <https://demoify.app>

---

### Post 4: r/musicproduction — "Version control for music exists"

**Title:** PSA: there's now a free tool for versioned demo sharing — no more "final_v3.mp3"

**Post body:**

Demoify (<https://demoify.app>) is a new platform where every song gets one URL that never changes, even when you upload new versions. Old versions are preserved. Comments are timestamped to playback position.

Why this matters for collaboration:
- Band members hear the latest mix immediately
- Feedback is contextual ("at 2:30, the bass is muddy" instead of generic)
- No more managing 15 versions of the same file

It's free, open source (<https://github.com/brogan89/demoify>), and the first 100 users get 500 bonus credits with code `DEMOIFY100`.

---

## Dev/Musician Forums & Communities

### Lobste.rs

**Title:** Demoify – open-source versioned demo sharing for musicians (Git mental model)

**Post:**

Most musicians don't use Git, but they'd benefit from its versioning model. Demoify applies the Git mental model to audio demo sharing: one permanent URL per track, push new versions, old ones stay available, timestamped feedback.

Built on Cloudflare Workers + D1 + R2, open source (MIT). <https://github.com/brogan89/demoify>

### r/programming (if allowed) / r/opensource

**Title:** Show HN: Demoify – GitHub for songs, built on Cloudflare Workers (open source)

**Post body:**

Demoify is an open-source platform for versioned demo sharing — "GitHub for musicians." It runs entirely on Cloudflare Workers + D1 + R2 and handles:

- Permanent URL-based song sharing with versioning
- Timestamped audio feedback (like Code Review but for tracks)
- Band roles and permissions
- Stripe credits/tipping economy
- Federation protocol (multi-instance)

Technical stack: Next.js 16, React 19, TypeScript, Cloudflare Workers, D1 (SQLite), R2, Better Auth, Stripe Connect, Resend.

<https://github.com/brogan89/demoify> — contributions welcome!

---

## Sending Strategy

| Platform | Post Title / Angle | Best Time | Coupon Code |
|----------|-------------------|-----------|-------------|
| Hacker News (Show HN) | "GitHub for songs" — tech + music crossover | Mon-Thu 9-11am PT | LAUNCH100 |
| r/WeAreTheMusicMakers | Versioned demos, free tool | Tuesday 10am ET | WELCOME250 |
| r/audioengineering | Solving demo version nightmare, ask for feedback | Wednesday 11am ET | DEMOIFY100 |
| r/edmproduction | Timestamped feedback on WIPs | Thursday 2pm ET | WELCOME250 |
| r/musicproduction | PSA: version control for music exists | Friday 10am ET | DEMOIFY100 |
| Lobste.rs | Git mental model + open source tech | Monday | EARLYBIRD |
| r/opensource | Cloudflare Workers + open source audio platform | Wednesday | EARLYBIRD |

### Cross-posting notes

- Always reply to comments within the first 2 hours of posting (Reddit's algorithm favors early engagement)
- On HN, add a thoughtful comment about why you built it within the first 30 minutes
- Never post the same text verbatim to multiple subreddits — rewrite the angle each time
- Keep coupon codes in the body; include the redemption URL: `demoify.app/dashboard/credits`