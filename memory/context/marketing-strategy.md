# Demoify — Marketing Strategy

_Adopted: 2026-08-06 · Owner: Brogan (solo founder, Hamilton NZ) · Supersedes `docs/Demoify_Marketing_Plan.pptx` (July 2026 deck, kept as reference) · Decision record: `memory/decisions/2026-08-06-marketing-strategy.md`_

**Where we are:** demoify.app is deployed and stable (Next.js 16 on Cloudflare Workers/D1/R2, 31 prod deploys) but unlaunched — every track in production is self-seeded, zero outside users, Stripe not live, and no attribution, sitemap, or OG imagery exists.
**Where this goes:** a free, coordinated public launch in week 4 (Sep 1–4, 2026) after three weeks of build + seeding. Primary market is overseas (US/UK/EU); NZ is a credibility and early-user layer, not the target.

Effort key: **S** = ≤1 day · **M** = 2–3 days · **L** = ~a week. Everything below is sized for ~15–20 marketing hrs/wk alongside dev work.

---

## 1. Positioning & ICP

**Positioning statement**

> Demoify is the permanent link for a song in progress. Push new versions like code — the link never breaks, every take is kept, and feedback lands as comments anchored to the exact version. Listeners just press play, no login. Open source and self-hostable.

Use **"GitHub for songs"** verbatim only with builder audiences (Hacker News, Product Hunt, Indie Hackers). Musicians mostly don't know GitHub — lead with the pain instead.

**Primary ICP (overseas):** US/UK/EU bedroom producers and unsigned bands, ~18–35, actively swapping works-in-progress with bandmates and collaborators. They gather in r/WeAreTheMusicMakers, r/IndieMusicFeedback (+ its Discord), r/musicproduction, r/edmproduction, producer Discords, and home-recording YouTube comment sections.

**Beachhead-of-the-beachhead: musician-developers.** They live on HN and r/selfhosted, get the metaphor instantly, tolerate a v0.1, and are the only audience for the self-host + federation wedge. Reachable free in week 1.

**Top 3 pains Demoify solves**

1. **Version chaos** — `final_mix_v2_REAL.mp3`; five links for one song; nobody knows which bounce is current.
2. **Feedback scattered and unanchored** — "chorus too loud" buried in a Discord scroll… which version? which second? (Demoify comments anchor to version + timestamp.)
3. **Listener friction** — private SoundCloud needs the right link every time; WeTransfer expires; Dropbox is a file browser, not a player. Demoify links just play — no app, no account.

**Why Demoify over the alternative** (reuse this block in posts and landing/SEO pages):

- **Private SoundCloud** — a public artist profile pretending to be a collab tool: re-upload = new link, no version history, free-tier upload caps.
- **Dropbox / WeTransfer** — file delivery, not listening: no inline comments, expiring links, no notion of "latest version".
- **Discord attachments** — feedback happens, then drowns: size caps, no canonical link, zero history.
- **Bandcamp private streaming** — built for releasing, not iterating.
- **The hook:** the only tool designed around the revise → share → get-feedback loop on one permanent URL.

---

## 2. Phase 1 — Free / organic (the main focus)

### 2a. Product-led growth to code (ranked — do in this order)

| # | Build | Effort | What "working" looks like |
|---|-------|--------|---------------------------|
| 1 | **OG images + `metadataBase`** — per-song OG card (artwork or gradient sleeve, title, artist, version count). Hooks: `src/app/layout.tsx` (no `metadataBase` today) and `generateMetadata` in `src/app/[username]/[slug]/page.tsx`. satori/workers-og on CF; static branded fallback if the runtime fights back. | S–M | Links unfurl with art in Discord/Reddit/iMessage. **Do before ANY outreach** — the whole pitch is "one link", and today that link previews bare. |
| 2 | **Attribution + web analytics** — capture first-touch `?ref`/UTM onto the user row; per-channel links; add free Cloudflare Web Analytics for pageviews. Extend `src/lib/analytics.ts` + `/admin/analytics`. | S | Every signup answers "where from"; launch week produces a channel ranking, not a vibe. **Non-negotiable before launch.** |
| 3 | **`sitemap.ts` + `robots.ts` + ~70 programmatic genre pages** — `/explore/[genre]` and `/explore/[genre]/[subgenre]` from the curated taxonomy in `src/lib/genres.ts`, each with intro copy + latest tracks; song/artist pages in the sitemap. | S–M | Indexed in Search Console within 2–3 weeks; impressions on "[subgenre] demos / unsigned [genre]" queries by day 60. Slow payoff — ship early so it compounds. |
| 4 | **Email capture** — "follow this artist / get launch updates" (Resend is already wired for transactional mail). | S | 100+ addresses by launch day; the launch email is the one owned channel. |
| 5 | **Embeddable player** (iframe + oEmbed) | M–L | Players on artists' own sites/blogs = distribution + backlinks. Week 3 only if ahead of schedule; otherwise post-launch. |
| 6 | **Referral mechanics** | M | **Deferred** — referral incentives are hollow at zero liquidity. `?ref` attribution covers who-brought-whom; revisit ~day 60. |

Cheap hack: mint per-channel coupon codes (`HN100`, `PH100`, …) in the existing `/admin/coupons` as secondary attribution + goodwill if credits stay enabled.

### 2b. Communities (rule everywhere: 90/10 give-to-ask, feedback-first, never bare link-drops)

**Musician side** — start participating genuinely in week 1 (these subs check account age/karma):

- **r/WeAreTheMusicMakers, r/musicproduction, r/edmproduction** — S/wk ongoing. Working = posts survive mods and produce `?ref`-tagged signups.
- **r/IndieMusicFeedback + its Discord** — the feedback-for-feedback culture is literally the product's use case; highest-fit single community. S/wk.
- **r/Songwriting, r/makinghiphop** (feedback threads), **r/audioengineering, r/mixingmastering** (producers sharing mixes). Read each sub's self-promo rules before posting. S/wk combined.
- **Gearspace forum** (home-recording section) — slow but high-intent. S. **Produce Like A Pro community** (verify current activity level before investing).

**Builder side — the differentiated wedge:**

- **Show HN: "GitHub for songs"** — open source + CF Workers/D1/R2 + federation is the story. M (post + all-day replies). Working = hours on the front page, 100+ `hn`-tagged signups.
- **Product Hunt** — launch day 2. M. Working = top-10 for the day, `ph`-tagged signups.
- **r/selfhosted + awesome-selfhosted PR + alternativeto.net + opensourcealternative.to** — permanent, SEO-bearing listings; "self-host your band's server and still appear in the shared Explore feed" is genuinely novel there. Submit week 2 (review queues are long). S each.
- **Indie Hackers + dev.to** build-in-public posts recycling the existing federation/credits/tipping docs. S per post.

**Press / outreach:**

- **White-glove the first 25–40 artists** — personal DM/email; offer to do the upload FOR them from their existing SoundCloud/Dropbox links. M/wk during weeks 2–3. Working = 100–150 real tracks live before launch + your first evangelists. This is the seeding engine.
- **Bedroom Producers Blog + Hypebot** news tips — they cover free tools for producers. **CD Baby DIY Musician blog** (verify pitch route). S.
- **5–10 home-recording YouTubers (5–50k subs)** — early access offer, no payment. S–M. Working = 1–2 organic mentions in launch month; the responsive ones become Phase 2 sponsorship candidates.

### 2c. Content & SEO (cadence: max 1 piece/week — bottom-of-funnel first)

- **"Private SoundCloud alternative for sharing demos"** — the money query. Week 1.
- **"Best ways to share a demo with your band (2026)"** — honest listicle including competitors. Week 2.
- **"Demoify vs SoundCloud private links"** and **"How to collect mix feedback without 47 Discord messages"** — post-launch.
- **Builder post: "How I built a federated music platform on Cloudflare D1/R2"** — dev.to/blog; doubles as launch-week HN and r/selfhosted material.
- **Programmatic:** the ~70 genre pages (2a #3) are the only scalable solo-founder SEO — the taxonomy already exists in code.

### 2d. Social — two picks, nothing else

1. **X/Twitter build-in-public**, 3–4 posts/wk, cross-posted to Bluesky (musician migration there is real). Feeds the HN/PH/IH crowd and launch momentum. Working = replies and DMs from musicians/devs, not follower count.
2. **One 90-second demo video** (a song going v1→v4 with feedback) as a reusable asset — PH gallery, landing page, Reddit posts, outreach emails; optionally sliced into 2–3 Shorts. An asset, not a channel.

**Explicitly skipped:** TikTok/Instagram daily content — right audience, wrong cost structure for a build-heavy solo month.

### If Phase 1 were only three moves

1. **Fix the share loop first (OG images + attribution)** — the product IS a link; make it beautiful and measurable before anyone sees it. Everything downstream depends on it.
2. **White-glove seed 25–40 real artists / 100–150 tracks** — kills the empty-Explore risk with real music, creates evangelists, and doubles as user research.
3. **One staggered multi-beachhead launch week** — HN (builder story) → PH → music subreddits/IMF (musician story). Two stories, uncorrelated audiences; survives any single flop.

---

## 3. Phase 2 — Small paid (~NZ$200–500/mo ≈ US$120–300) — only after the §5 triggers fire

**Define "acquisition" first:** the product is free today, so a conversion = **activated artist** — signup + ≥1 upload + first play by someone outside the band. Paid spend buys learning and liquidity, not revenue.

| Channel | Rough cost | Order | Kill / scale |
|---------|-----------|-------|--------------|
| **Micro-creator sponsorships** — home-recording/producer YouTubers, 5–30k subs | US$50–300 per integration | **Test FIRST** — highest trust transfer, exact ICP, 1–2/mo fits the budget, and a good integration keeps converting for months. Per-creator UTM + coupon code. | Kill a creator after one video if <10 activated artists; renew winners. |
| **Reddit ads** targeting the named subs | ~US$1–3 CPM; $150/mo buys real impressions | Second — the only self-serve platform whose targeting equals the actual communities. | Expect weak CTR. Kill at NZ$200 spend if cost per activated artist > ~NZ$15. |
| **Google Search** ("soundcloud alternative"-type queries) | ~US$1–4 CPC | Month 3+ — wait until Search Console shows which queries already get impressions. | Kill if cost/activation > 2× the creator baseline. |
| **Niche newsletter slots** (Ari's Take etc. — verify current rates) | US$150–500+ per slot | Last — one slot eats the whole monthly budget; single-shot risk. Only after a creator test proves the message. | Max one test per quarter. |

- **CAC reality check:** with credit packs at $1.50–$15 and Stripe off, paid can never be the scale engine. Learning bar: **< ~NZ$10–15 per activated artist** to justify continuing any channel.
- **Scale rule:** anything beating organic cost-per-activation scales only up to the NZ$500/mo cap.
- **Hard precondition — zero spend before:** attribution live (2a #2), the activation event tracked, per-channel coupons minted.

---

## 4. Hamilton / NZ angle — credibility + early-user layer (~10% of effort; not a growth channel)

- **Local bands as seed users** — onboard 5–10 Hamilton/Waikato bands face-to-face in weeks 1–3 (practice rooms, gigs, Wintec/UoW music students). In-person concierge onboarding and testimonials no overseas competitor can match. Working = they're inside the pre-launch 100–150 tracks.
- **Creative Waikato** — administers Hamilton's Creative Communities Scheme; a route into the local artist network. ([creativewaikato.co.nz/creative-resources/funding](https://creativewaikato.co.nz/creative-resources/funding))
- **NZ On Air New Music Single funding** (up to ~$11k for emerging artists) — the angle is NOT funding Demoify: NZ demo-stage bands are actively funded to produce singles → pitch Demoify as the WIP/feedback tool they use on the way. ([nzonair.govt.nz](https://www.nzonair.govt.nz/funding/music-funding/new-music-single-funding/))
- **CultivateIT / Waikato tech meetups** (IoT Waikato, Hamilton Python, WLUG) — give one "how I built it" talk; recruits musician-developers and potential contributors. ([cultivateit.co.nz](https://www.cultivateit.co.nz/))
- **Soda Inc** (Hamilton incubator, Wintec House — CO.STARTERS / LIFT, Startup Aotearoa) — free-to-cheap mentoring + local founder cred. (verify current programme intake dates) ([sodainc.com](https://www.sodainc.com/about))
- **KiwiSaaS** (relaunched industry-led under NZTech) — founder peer network and a good build-in-public audience; not a user source. ([kiwisaas.com](https://www.kiwisaas.com/))
- **Grants:** Callaghan Innovation was **disestablished 1 Dec 2025**; founder support now sits under **MBIE "Innovation Services"** ([funds.business.govt.nz](https://funds.business.govt.nz)). Realistic fit for a pre-revenue passion project is low — check listings occasionally, don't plan around them.
- **NZ Music Month (May 2027)** via the NZ Music Commission — a next-year hook. (verify participation route)
- **Founder-story color everywhere:** "built solo from Hamilton, New Zealand" is memorable in overseas posts — use it in the HN post, PH maker comment, and outreach emails.

---

## 5. Metrics & feedback loop

**Already reportable in `/admin/analytics`:** signups, uploads, likes, comments, engagement plays, active users, top songs.
**Must build (all small):** signup source (attribution), **anonymous-listener analytics** (per-song lifetime `playCount` already includes anonymous plays, but `/admin`'s plays-over-time/recent-plays count only logged-in engagement listens, and no pageview/session data exists at all), Explore pageviews (Cloudflare Web Analytics), the activation funnel (signup → upload → shared → got feedback), week-4 return-to-upload cohort.

**Phase 1 wall — only four numbers:**

1. **Activated artists, cumulative** — target 40–60 by Sep 5 (150 = stretch, not plan-of-record).
2. **% of new artists whose track gets ≥1 comment from outside the band within 7 days** — the product's core promise, measurable today.
3. **Week-4 return-to-upload rate** — target 30% (kept from the deck).
4. **Signups by source** — the post-launch channel ranking.

**Phase 1 → Phase 2 triggers (ALL three must hold):**

1. Attribution live and trusted.
2. ≥100 activated artists with ≥20% week-4 return-to-upload — don't pay to fill a leaky bucket.
3. At least one organic channel repeatably producing ≥10 signups/wk — Phase 2 exists to amplify *that* channel's proven message.

---

## 6. First 30 days — Aug 7 → Sep 5, 2026

**Week 1 (Fri Aug 7 – Thu Aug 13) — build the share loop, join the rooms**
- [ ] BUILD: OG images + `metadataBase` · `sitemap.ts`/`robots.ts` · attribution + Cloudflare Web Analytics · email capture
- [ ] DISTRIBUTE: warm Reddit accounts (genuine feedback, zero promo) · join IMF Discord · start X build-in-public · draft the 40-artist white-glove list (incl. 5–10 Hamilton/NZ bands) · publish BOFU article #1
- [ ] DECIDE: credit posture at launch (disabled vs big subsidized balance) and make it visible in the UI · put up an own-work-only/DMCA page

**Week 2 (Aug 14–20) — seed wave 1, plant the slow channels**
- [ ] BUILD: genre/subgenre SEO pages · per-channel coupon codes
- [ ] DISTRIBUTE: white-glove onboard ~15 artists (~50 tracks; offer to upload for them) · awesome-selfhosted PR + AlternativeTo + OpenSourceAlternative submissions · Product Hunt "coming soon" page · record the 90-sec demo video · BOFU article #2 · BPB/Hypebot news tips

**Week 3 (Aug 21–27) — seed wave 2, stage the launch**
- [ ] BUILD: embeddable player only if weeks 1–2 are fully done; otherwise polish + bug bash
- [ ] DISTRIBUTE: wave 2 → 30–40 artists / 100–150 tracks cumulative · founder comments on every seeded track (model the feedback culture) · write + peer-review the Show HN post, PH assets, and 3 subreddit posts (each native to its sub) · line up friendly early users to be present on launch days
  - Subreddit posts **drafted 2026-08-09** → [`reddit-launch-posts.md`](reddit-launch-posts.md): five native drafts (r/selfhosted, r/SideProject+r/opensource, r/musicproduction, r/homerecording, r/WeAreTheMusicMakers), the tiered sub shortlist, and a comment reply bank. Still needs the peer-review pass.
- [ ] **LAUNCH GATE: ≥100 real tracks in Explore by Thu Aug 27, else slip one week. Never launch an empty feed.**

**Week 4 (Aug 28 – Sep 5) — staggered launch** *(weekend Aug 28–31 = final prep + rest)*
- [ ] **Tue Sep 1: Show HN** + Indie Hackers + dev.to architecture post (builder story). Post ~11pm–midnight NZT = 7–8am ET Tuesday, then work the thread overnight NZ time.
- [ ] **Wed Sep 2: Product Hunt** at 12:01am PT — that's **7:01pm Wednesday NZT**, conveniently a NZ evening — + launch email to the captured list + X thread.
- [ ] **Wed Sep 2 (also):** r/selfhosted post. *Deviation from §2b, which bundles r/selfhosted into the week-2 submissions — the long review queues are the awesome-selfhosted PR / AlternativeTo / OpenSourceAlternative listings, which still go week 2. The subreddit post is a launch beat, and lands better next to PH than two weeks early against an unseeded Explore.*
- [ ] **Thu–Fri Sep 3–4:** music subreddits (feedback-first framing) + IMF Discord. Specifically **r/musicproduction Thu**, **r/homerecording Fri** (added to the §2b list — its core activity is bounce → send → get notes), plus r/SideProject + r/opensource Fri. **r/WeAreTheMusicMakers slips to Mon Sep 7** — biggest and strictest, so it goes after the framing is proven. Do **not** post the tool to r/IndieMusicFeedback: the culture fits but it's a sub for song feedback, not tool launches — participate + Discord, and ask the mods first.
- [ ] Drip Tier 2 after launch week, one per ~3 days: r/edmproduction (Sep 10), r/Songwriting (Sep 14), r/mixingmastering (Sep 17), r/makinghiphop (Sep 21).
- [ ] All week: <2h response time on every comment and thread.
- [ ] **Fri Sep 5: retro** — signups by source, activation %, pick ONE channel to double down on in month 2.

---

## Assumptions this plan depends on

1. **Stripe stays off at launch** — the launch is free. Pick ONE visible credit posture (disabled vs subsidized starting balance) so credits don't read as a paywall. If Stripe goes live sooner, Phase 2's CAC math changes.
2. **Seeding assumes ~40 artist yeses in 2 weeks** — the concierge-upload offer is the mitigation; the Aug 27 launch gate (slip a week) is the fallback.
3. **Reddit is the highest-expected-value channel AND the easiest place to get banned** — 90/10 rule, per-sub rules read before every post.
4. **Federation is a story, not a demo** — zero external instances exist today; pitch it as direction, never fake usage.
5. **Rights/moderation posture** (own-work-only terms + DMCA contact) must exist before any public push — **confirmed missing as of 2026-08-09** (nothing under `src/app` matches `*terms*`/`*privacy*`/`*dmca*`). This is now a hard blocker on the music-subreddit posts specifically: *"do you claim rights to my music?"* is the predictable top reply and there is no page to link.
6. **Founder capacity ~15–20 hrs/wk** on marketing alongside dev. If capacity halves: cut content (2c) before community (2b), and never cut the seeding.
7. **ICP is inherited from the July deck**, validated so far only by intuition — the week-2/3 white-glove conversations double as the validation interviews.

---

## Appendix — changes vs the July deck (`docs/Demoify_Marketing_Plan.pptx`)

| Deck said | This plan says | Why |
|-----------|----------------|-----|
| Seed 300+ songs pre-launch | 100–150 real tracks from 25–40 white-gloved artists | 300 solo in 3 weeks forces filler; fake content poisons an artist community. 100 real > 300 fake. |
| 150+ bands in 30 days | 40–60 activated artists (150 = stretch) | The deck's number assumed schedulable virality. |
| Builder side = HN/PH/IH only | + r/selfhosted, awesome-selfhosted, AlternativeTo, OpenSourceAlternative | Permanent SEO assets; federation/self-host is the only truly novel story. |
| No measurement plan | Attribution + OG images are hard preconditions | `/admin` can't answer "where did this signup come from"; bare link previews contradict the one-link pitch. |
| One big-bang launch day | Staggered launch week (Sep 1–4) | A solo founder can actually show up in every thread. |
| Discords as launch channels | Discords as relationship channels | Promo from a fresh account gets muted; presence pays off after weeks of participation. |
| Callaghan Innovation grants | MBIE Innovation Services | Callaghan was disestablished 1 Dec 2025. |
