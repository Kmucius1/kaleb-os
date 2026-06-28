# Content Engine — Brand System (source of truth)

The engine runs **3 brands Kaleb owns** + **client brands** (managed for others). Each brand is a row
in `brands` with its own voice/pillars/platforms/niches/CTA rules. This doc is the human-readable source;
it seeds the `brands` table.

Deeper identity all brands connect to: **freedom, leverage, growth, business, discipline, self-mastery,
building a life by design.**

- **Personal (`me`)** = the main story / center of gravity.
- **Ka1eb.ai (`ai`)** = AI authority engine + lead-gen for DRYP.
- **Trading (`trading`)** = trading authority engine.
- **Clients** (EHM = `ehm`, on TODO) = social managed for companies.

---

## COLLABORATION SYSTEM (core mechanic)

The personal page builds trust in Kaleb; the niche pages build authority. Most niche content posts as a
**collab WITH the personal page**.

**Posting logic:**
- AI business education → post on **`ai`**, collab with **`me`**.
- Trading education → post on **`trading`**, collab with **`me`**.
- AI + personal growth blend → usually **`ai`** + collab **`me`**.
- Trading + personal growth blend → usually **`trading`** + collab **`me`**.
- Purely personal/emotional/funny/family/spiritual/lifestyle → **`me`** only, no collab.
- Personal life, thoughts, mindset, founder journey → **`me`** only unless a clear niche reason.

`brands.default_collab_with`: `me`→none, `ai`→[`me`], `trading`→[`me`].

---

## BRAND 1 — Personal (`me`) · kind: personal
**Purpose:** Identity content. Make people feel they're watching someone *become*. Trust, depth,
relatability, lifestyle appeal, long-term loyalty. Not only business — identity.
**Voice:** Reflective, grounded, ambitious, human, spiritual, honest, sometimes funny, sometimes deep.
Not too polished, not fake-motivational, not corporate. "I'm building something real, and becoming
someone in the process."
**Pillars:** Becoming/Personal Evolution · Freedom · Spirituality/Presence/Inner Work · Entrepreneurial
Journey · Lifestyle/Human Moments.
**CTAs (connection):** "Have you ever felt this?" · "What season are you in?" · "Save this if you needed
the reminder." · "Send this to someone building quietly."

## BRAND 2 — Ka1eb.ai (`ai`) · kind: niche · collab→`me`
**Purpose:** AI education + lead-gen. Trigger "I didn't know AI could do that" / "I need this." Generate
DMs, consultations, demos, clients for DRYP Digital.
**Voice:** Simple, smart, practical, curious, optimistic, forward-thinking. Explain AI to a smart business
owner who hates jargon. NOT tech-bro / generic AI news / manual / corporate / hype. "Here's how AI
actually helps your business."
**Pillars:** AI for Business Growth · AI Automation · AI Operations (behind-the-scenes systems) · AI Tools
Explained Simply (outcomes>features) · Future of Work · AI + Freedom.
**LEAD-GEN RULE:** Teach what's *possible*, why it matters, the benefit, what to think about — but leave
mystery around the *build* so they want help implementing. Goal = leads, not likes.
**CTAs (lead-gen):** "DM AI to see what this looks like in your business." · "Comment audit for the AI
business checklist." · "If your business still follows up manually, this is your sign."

## BRAND 3 — Trading (`trading`) · kind: niche · collab→`me`
**Purpose:** Trading education/mindset/discipline/risk/chart breakdowns. Attract serious learners, not
gamblers. Build demand for education, community, courses, live sessions, mentorship.
**Voice:** Disciplined, clear, confident, direct, educational, honest. AVOID guru energy, lifestyle
flexing, overpromising, gambling language, "easy money." "If you want to actually learn this skill, lock in."
**Pillars:** Trading Education · Trading Psychology · Risk Management · Trader Lifestyle/Journey · Financial
Education/Freedom.
**CTAs (education):** "Comment chart for more breakdowns." · "DM R2R to learn the system." · "Save this
before your next trading session."

## CLIENT — EHM Strategies (`ehm`) · kind: client · status: TODO
Mortgage client. Fill voice/pillars later. Any EHM **video** must use locked **Noble the Bull** look/voice
(see global CLAUDE.md / `ehm-website/noble-brand-kit/`).

---

## CONTENT OUTPUT CONTRACT (every generated piece returns ALL of these)
1. **Brand/account** the post is for
2. **Collab?** (and which brand)
3. **Content pillar**
4. **Goal** of the post  (one of: trust · teach · curiosity · conversation · leads · authority · connection)
5. **Target audience**
6. **Hook**
7. **Caption**
8. **CTA**
9. **Thumbnail text**
10. **Comment ideas** (for engagement)

## Platform rules (defaults; a brand may override in `brands.platforms`)
- **reels** (IG/TikTok/Shorts): 15–45s, hook in 1.5s, VO + on-screen text beats, one idea, payoff fast.
- **linkedin**: 120–250 words, hook + white space + story/insight + 1 takeaway, no hashtag spam.
- **x**: single punchy post OR 4–7 tweet thread, strong first line.
- **youtube** (long): 5–12 min outline, hook(0:00–0:30)→stakes→3–5 beats w/ retention resets→recap→CTA, b-roll notes.

## FINAL STRATEGIC RULE
Never create content just for views. Every post must do one of: build trust · teach something useful ·
create curiosity · start conversations · generate leads · strengthen authority · deepen connection · move
people closer to working with Kaleb or following the journey. Goal: become a trusted voice in AI, trading,
business, freedom, and personal growth — not look like an influencer. `content_posts.leads` tracks payoff.
