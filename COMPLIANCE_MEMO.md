# IndiYatra — Child-Data Compliance Memo (Roadmap 1.8 / R1)

**Date:** 19 July 2026 · **Author:** Claude (AI session) · **Status:** Draft for legal review

> **⚠ THIS IS NOT LEGAL ADVICE.** It is an engineering-team analysis to guide product
> decisions. The legal landscape described here is current to the author's knowledge of
> **mid-2025** (DPDP Act 2023 enacted; **Draft** DPDP Rules published January 2025 for
> consultation; enforcement not yet begun). Online verification was not possible in this
> session. **The single most important action in this memo is item A: have an Indian
> data-protection lawyer confirm the final DPDP Rules text, the child-consent mechanism
> they prescribe, and the enforcement timeline.** Because IndiYatra's audience is
> school children (Classes 3–12), this is worth a few hours of real legal time.

---

## 1. What IndiYatra actually collects (data inventory, verified against the code)

Per-user data: email address (Supabase auth), display name (free text — children often
enter full real names), likes and bookmarks, lesson completions with points, quiz
attempts and scores, plant/dharma tokens, per-lesson **active reading time**
(`lesson_views` via `useViewTracking`, used to power recommendations), snippet comments
(body + display-name snapshot), and settings (share messages, `leaderboard_visible`).
Anonymous guest sessions collect the same interaction data keyed to a throwaway
Supabase anonymous ID but no email or name. There is **no** date of birth, age, class,
school, phone number, or location collected today, no third-party analytics or ad SDK,
and no advertising of any kind.

Sharing is outbound-only: WhatsApp/Twitter share links contain the app URL and a canned
message, no personal data. The leaderboard now shows first names only, gated by
`leaderboard_visible` (Phase 1.6). Comments are locked to real accounts, filtered for
profanity, and admin-moderated with a report queue (Phase 1.5).

## 2. Which laws apply

**DPDP Act 2023 (India) — the law that matters.** It applies to digital personal data
processed in India. Under the Act a **child is anyone under 18** (much stricter than
COPPA's 13). Section 9 imposes three obligations on anyone processing children's data:
(1) obtain **verifiable consent of a parent/guardian** before processing; (2) do not
process data **likely to cause detrimental effect on a child's well-being**; (3) do not
undertake **tracking, behavioural monitoring of children, or targeted advertising
directed at children**. The Draft Rules (Jan 2025) proposed verifiable parental consent
via DigiLocker-linked identity or a virtual token, and contemplated limited exemptions
(e.g. for educational institutions and child-safety purposes) from the tracking
restriction — whether those exemptions survived into the final Rules, and whom they
cover (an edtech app is not obviously an "educational institution"), **must be
confirmed by counsel (action A)**. Penalties under the Act run to ₹200 crore for
child-data violations, so this is not a corner to cut.

**COPPA (US)** applies only to services directed at US children under 13 or with actual
knowledge of collecting from them. IndiYatra is India-directed; COPPA is unlikely to
apply unless the app is marketed to US users. **GDPR** similarly only if EU users are
targeted. Treat DPDP as the design bar — it is the strictest of the three on age (18)
and the one with jurisdiction.

### Decision record: "market it as not-for-children" — considered and rejected (19 Jul 2026)

The idea of avoiding child-data obligations by repositioning IndiYatra as a
general-audience site was considered and rejected. Reasons: regulators assess what a
service *is*, not its marketing label — the class bands (Classes 3–5/6–8/9–12) are baked
into the database, content, and copy; under COPPA-style "directed to children" tests a
disclaimer over a product visibly built for schoolchildren counts for nothing and can
read as deliberate evasion; and the DPDP Act has no "directed to children" threshold at
all — its obligations attach to processing any under-18 user's data, so not asking ages
is not a defence, merely an absence of reasonable steps. Repositioning would also gut
the product's purpose. **Do not revisit; proceed with actions B and C instead.**

## 3. Gap analysis

The biggest structural gap: **the app has no concept of age at all.** There is no age
gate, no parental consent flow, and no privacy policy — while nearly every user is, by
DPDP definition, a child. Specific issues, roughly risk-ordered:

1. **No verifiable parental consent** (DPDP §9(1)). Nothing in signup involves a parent.
2. **No privacy policy / notice** (DPDP §5 requires notice of what's collected and why,
   in plain language, available in English and Indian languages).
3. **Behavioural-monitoring exposure** (DPDP §9(3)): `lesson_views` reading-time
   tracking feeding a recommendations engine is arguably "behavioural monitoring of
   children." It is benign, first-party, and educational — exactly what the draft
   exemptions seemed aimed at — but until counsel confirms, treat it as at-risk (action D).
4. **No data-rights plumbing**: no way for a user (or parent) to view, correct, export,
   or delete their data; account deletion doesn't exist in the UI.
5. **No grievance channel** (DPDP requires a published contact for data questions) and
   no breach-response plan (breaches must be reported to the Data Protection Board and
   affected users).
6. **No retention policy**: interaction data is kept forever, including for abandoned
   anonymous sessions.
7. **Display names are full real names** entered by children — mitigated in leaderboard
   and comments display, but the full name still sits in `profiles` and in every
   comment's `user_name` snapshot.
8. **Leaderboard default is opt-out** (`leaderboard_visible` defaults true). For minors
   the defensible default is opt-in (already noted in roadmap Phase 3 / R1).

Working in IndiYatra's favour: no ads, no third-party trackers, no sale or sharing of
data, minimal collection (no DOB/phone/location), self-hosted analytics plan (R3), and
the Phase 1 lockdowns. The distance to compliance is mostly consent + policy + rights
plumbing, not a re-architecture.

## 4. Action plan

| # | Action | When | Notes |
|---|--------|------|-------|
| A | **Lawyer review**: final DPDP Rules status, child-consent mechanism, edtech exemption scope, enforcement dates | Before wider release | The one action only a human can close. Bring this memo. |
| B | Publish a privacy policy (draft in Appendix) + kid-friendly summary page in-app | Before wider release | No code dependency; do immediately after A. |
| C | Signup asks age band; under-18 path captures parent email → parent clicks consent link before account activates | Before wider release | Interim mechanism; swap in DigiLocker/token flow if final Rules require it. Existing users: consent on next login. |
| D | Decide recommendations/view-tracking posture for minors: default off pending counsel, or proceed under educational-purpose exemption if counsel confirms | With A | If default-off: recommendations fall back to editorial/popular ordering — feature degrades gracefully. |
| E | Flip `leaderboard_visible` default to false + Settings toggle | Phase 3 (already roadmapped) | Opt-in for minors; R1. |
| F | Account deletion (cascade across all user tables) + data export | Phase 2–3 | Most tables already `ON DELETE CASCADE` from profiles; needs an RPC + Settings button + a grievance-email fallback. |
| G | Retention: purge anonymous-session interaction data after ~90 days; document retention periods in the policy | Phase 2 (with 2.10 SQL pass) | Simple scheduled job or periodic manual script. |
| H | Publish grievance contact (email) in policy + footer; write a one-page breach-response note (who emails the DPB, who emails parents) | Before wider release | |
| I | Nudge display-name field toward first name / nickname ("What should we call you?") and stop snapshotting `user_name` into new comments (join at read time) | Phase 3 | Data minimisation. |

### Design note for action C: minimising consent drop-off (added 19 Jul 2026)

Verifiable parental consent will cost some conversions — every consent flow does. The
mitigation is placement and friction, not avoidance:

1. **Try-before-consent.** Keep the generous anonymous guest mode (already built): full
   reading/browsing/quizzes with no account. The consent wall appears only at the moment
   of value — "Sign up to save your forest and your streak" — when the child is already
   invested, not at first open.
2. **One-tap parent approval.** Child enters a parent's email/WhatsApp; parent receives a
   short message with a single approve link. No parent account, no form, no password —
   parent-account creation is where consent funnels die.
3. **Frame as a parent benefit.** "See what your child is learning each week" turns the
   consent contact into a parent-facing channel (the share-message feature already points
   this way); for this audience, parents recommend apps to parents.
4. **School channel.** The Draft DPDP Rules contemplated educational-institution
   exemptions — class-wide onboarding via schools may carry consent institutionally.
   Confirm scope in the action-A lawyer review; potentially the highest-volume,
   zero-drop-off path.
5. **Measure it.** Instrument the funnel with the 2.6 events table
   (`consent_sent` → `consent_approved`) so drop-off is a number, not a fear.

**Rules for every future feature** (R1 ongoing check, binds Phases 3–5): no targeted
advertising ever; no third-party trackers (R3 events stay self-hosted, keyed to
pseudonymous IDs); no public display of full names or contact data; any new
data-collecting feature (Flow mode, share-image, per-quiz leaderboards) gets a line in
the privacy policy and a re-check against §9 before shipping.

## 5. What Phase 3+ may collect (the question this memo exists to answer)

Safe under any reading: content interaction data (likes, bookmarks, completions,
quizzes, streaks, tokens) tied to a consented account; self-hosted aggregate analytics;
class-band (not DOB) for reading-level fit. Conditional on counsel (action D):
per-user behavioural personalisation (recommendations, "For You"). Off the table:
third-party ad/analytics SDKs, targeted advertising, precise location, contact books,
public full names, or any data sold/shared with third parties.

---

## Appendix — Draft Privacy Policy (plain language, for legal review)

**IndiYatra Privacy Policy** *(draft — not yet published)*

**Who we are.** IndiYatra is a learning app about Indian history and culture, made for
students of Classes 3–12. Contact for any privacy question or request:
[grievance email — to be set up, action H].

**What we collect.** When you create an account: your email address and the name you
choose to show. As you use the app: which lessons you read and for how long, your
likes, bookmarks, quiz scores, points, tokens and badges, and any comments you post.
If you use IndiYatra as a guest, we store your activity against a temporary anonymous
ID with no name or email. We do not collect your date of birth, phone number, school,
or location. We do not show ads and we never sell or share your data with anyone.

**Why we collect it.** To save your progress, award your points and plants, show your
place on the leaderboard (only if you allow it), and suggest lessons you might like.
That's all.

**Children and parents.** Most IndiYatra users are under 18. We ask for a
parent/guardian's consent before activating an account for anyone under 18
[pending action C]. Parents can ask to see, correct, or delete their child's data at
any time using the contact above.

**Your choices.** You can hide yourself from the leaderboard in Settings, use a
nickname instead of your real name, delete your comments, and ask us to delete your
whole account and all its data.

**How long we keep data.** Account data is kept while the account exists and deleted
when you ask. Guest-session activity is deleted after [90] days.

**Security.** Data is stored with our infrastructure provider (Supabase) with
row-level access controls, and only IndiYatra administrators can see moderation data.
If a data breach affects you, we will inform you and the Data Protection Board of
India as the law requires.

**Changes.** If we change this policy or collect anything new, we will show a notice
in the app.
