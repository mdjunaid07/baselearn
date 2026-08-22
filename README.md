# Foundational Learning Rescue

An offline-first, AI-adaptive reading and math practice app for children who are behind
on foundational skills. It runs a 2–4 minute diagnostic, finds the *exact* skill gap
(not just a low score), and gives short, targeted daily practice that adapts as the
child improves — all with minimal adult supervision and minimal reading required to
operate it.

See **[DESIGN.md](./DESIGN.md)** for the architecture, data models, API, and the
adaptive algorithm in detail. This file is about running and demoing it.

## Quick start

Needs Node 18+. Two terminals, no database setup required.

```bash
# Terminal 1 — API (in-memory by default, zero config)
cd server
npm install
npm run dev            # http://localhost:4000

# Terminal 2 — App
cd client
npm install
npm run dev            # http://localhost:5173
```

Open `http://localhost:5173`. That's it — no MongoDB Atlas account needed for the demo.
To persist data with real MongoDB Atlas instead, copy `server/.env.example` to `.env`
and set `MONGODB_URI`; the server switches automatically, same routes, same behavior.

Run `npm run selfcheck` in `server/` any time to re-verify the adaptive engine's
scoring, difficulty staircase, and error-pattern detection (18 assertions, no test
framework needed).

## Demo script

This walks through the exact flow the brief asks for: *diagnostic → repeated mistakes
in one skill → system identifies the weakness → targeted practice → score improves →
parent dashboard shows it.*

1. **Welcome → pick an avatar** (no typing required — nickname is optional).
2. **Subject Select → Math.** First visit goes to the diagnostic automatically.
3. **Diagnostic:** answer the first few skills correctly, then answer two **Subtraction**
   questions wrong in a row (this is the "repeated errors" trigger). The diagnostic
   stops right there instead of grinding through all 10 questions — that's deliberate.
4. **Diagnostic Result** names Subtraction specifically, with its growth-stage plant.
5. **Today's Rescue:** 5 subtraction questions, starting easy and stepping up when you
   get two right in a row. Answer most of them correctly.
6. **Session Complete:** shows the before → after score and, if the tier crossed a
   boundary (Seedling → Sprout → Sapling → Full Bloom), a new badge.
7. **My Skill Garden:** Subtraction's plant is visibly taller/greener than before.
8. **Parent/Teacher View** (link at the bottom of Subject Select, or "Judges & teachers:
   view sample dashboard" on the Welcome screen for a pre-populated profile): skill bars
   for both subjects, and a plain-language recommendation.

**One nuance worth knowing before you present it:** the dashboard's single "biggest
opportunity" card always names whichever skill is *currently* weakest among skills
that have actually been tested. If your Subtraction practice pushes it above another
skill that's only been lightly diagnosed, the card will rotate to recommend that skill
next — this is correct, adaptive behavior (it keeps pointing at the real current gap),
not a bug, but it means the card won't necessarily keep celebrating Subtraction forever.
The Skill Garden and Session Complete screens are where the Subtraction improvement
itself stays visible.

To try the offline PWA behavior: `npm run build && npm run preview` in `client/`, load
it once, then turn off networking — the diagnostic and Daily Rescue keep working
because both the question bank and the adaptive engine are bundled into the client
(see DESIGN.md §1). Session results queue locally and sync automatically once
connectivity returns.

## What's simplified for the MVP (on purpose)

- **In-memory storage by default.** Real Mongoose models exist and work; they're just
  not exercised against a live Atlas cluster in this environment. Set `MONGODB_URI` to
  use one.
- **~60 questions total** (6 per skill across 3 difficulty tiers) rather than a large
  item bank — enough to demo real adaptive behavior, not enough for months of unique
  daily content. `server/src/data/questionBank.js` is the place to add more; each item
  is a plain object, no build step required.
- **Parent-facing insight sentences are templated, not LLM-generated** — deliberately,
  so the dashboard works offline and never depends on an API key at demo time. See
  `server/src/services/insights.js` for where a real model call would slot in later.
- **Letter-sound questions approximate phonemes via text-to-speech** ("the sound buh,
  like in ball") rather than recorded audio — functional for a demo, a real classroom
  deployment would want recorded native-speaker audio.
- **No automated visual QA.** The build was verified to compile cleanly and every
  screen was written and reviewed carefully, but there was no headless browser available
  in this environment to click through and screenshot the actual rendered app — do a
  pass on a real device before relying on it, especially for touch-target sizing.
- **Offline coverage differs by screen, deliberately:** the child's core loop (profile,
  diagnostic, Daily Rescue, Skill Garden, Progress) works with zero connectivity from
  the very first launch. The Parent Dashboard's rich narrative insight is server-computed
  and needs connectivity at least once; it falls back to a simpler local view if not.

## Tech stack

React + Vite + Tailwind (PWA via `vite-plugin-pwa`) · Node + Express · Mongoose/MongoDB
Atlas with an automatic in-memory fallback. No other services or API keys required to
run the full demo.

## Privacy

No name, photo, or location is ever requested. Identity is a random ID generated on
the child's device at profile creation; the only personalization stored is an optional
nickname and an emoji avatar choice.
