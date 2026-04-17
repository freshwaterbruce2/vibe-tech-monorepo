# VibeTech Brand Voice Guidelines

**Status:** v1.0 (canonical — 2026-04-16)
**Owner:** Bruce Freshwater
**Scope:** Vibe Tech umbrella brand + all @vibetech products
**Source:** Generated from brand-voice discovery (Google Drive + `C:\dev` monorepo), refined through guided resolution of five open questions.

> This is a living document, but all discovery-phase open questions are resolved as of v1.0. Future updates should append to the changelog.

---

## 1. Brand Identity

**Brand name:** **Vibe Tech** (two words, no hyphen — official external spelling).
**Code identifier:** `VibeTech` (one word, PascalCase) used only in TypeScript types, class names, and file identifiers.
**npm scope:** `@vibetech` (lowercase, one word).
**Domain convention:** `vibetech.com` for the umbrella, `vibe[product].com` or path-based `vibetech.com/[product]` for products. Never hyphenated domains.

**Product naming rule — MANDATORY for every new build:**
- Every product Bruce builds **must include the word "Vibe"** as a prefix (not suffix, not infix).
- Display name: `Vibe [Word]` — two words, single space, no hyphen. *Vibe Tutor, Vibe Code Studio, Vibe Shop, Vibe Agent.*
- Filesystem / package name: `vibe-[word]` — kebab-case (hyphens allowed in code only).
- Acronyms stay all-caps: VTDE, VTCC.

**Founder / face of brand:** Bruce Freshwater.

**Brand posture — HYBRID (LOCKED).** Vibe Tech is the default voice on product surfaces; Bruce's first-person "I" surfaces only on personal-story moments. Clear split:

| Surface | Voice | Example |
|---|---|---|
| Product landing pages | Vibe Tech (third-person / entity) | *"Vibe Tech builds digital solutions that…"* |
| Product READMEs & docs | Vibe Tech (impersonal, technical) | *"Vibe Tutor is an adaptive learning platform for…"* |
| Marketing pages | Vibe Tech | *"Every Vibe Tech product ships with…"* |
| App copy / error messages | Vibe Tech (impersonal) | *"Can't connect. Check that the backend…"* |
| Founder origin / "why I built this" | Bruce (first-person "I") | *"I built Nova Agent because I was tired of…"* |
| Personal blog posts | Bruce (first-person "I") | *"This week I shipped…"* |
| Personal social (LinkedIn, X) | Bruce (first-person "I") | *"I just released Vibe Tutor 2.0."* |
| Company social / announcements | Vibe Tech | *"Vibe Tutor 2.0 is live."* |

**Rule of thumb:** if the surface represents the product, use "Vibe Tech." If the surface represents the human behind it, use "I / Bruce." Never mix the two in a single paragraph.

**One-line positioning:**
> Vibe Tech builds digital solutions where design and code work in perfect harmony — modern, accessible, and built to ship.

**Mission statement:**
> To help businesses and individuals harness the power of technology to achieve their goals — with a focus on creating intuitive, accessible, and visually striking digital experiences.

---

## 2. Voice Attributes

Vibe Tech's voice balances five traits. Every piece of copy should lean on at least two.

| Attribute | What it means | What it isn't |
|-----------|---------------|---------------|
| **Technical + Accessible** | Write for developers without gatekeeping jargon; explain architecture clearly | Dumbed-down; condescending |
| **Aspirational / Visionary** | Paint the future the product unlocks; sensory, outcome language | Overpromising; hype-speak |
| **Modern / Trendy** | Reference current design trends (glassmorphism, neon), latest stack (React 19, Tauri) | Chasing fads; dated buzzwords |
| **Founder-Forward** | First-person from Bruce when it fits ("I built this because…") | Corporate "we" boilerplate |
| **Practical / Action-Oriented** | Feature-driven, imperative, outcome-focused | Abstract philosophy; vague benefits |

**Voice in one sentence:** *Confident-but-not-slick builder who sweats the design and ships the code.*

---

## 3. Tone by Context

Tone shifts by audience and channel. Voice stays constant; tone adapts.

| Context | Tone | Example |
|---------|------|---------|
| **Marketing / landing pages** | Upbeat, aspirational, sensory | *"Imagine a world where your website loads instantly, welcomes every user, and feels as intuitive as a conversation."* |
| **Product READMEs** | Technical, scannable, feature-forward | *"Install dependencies. Configure API endpoint. Start the app."* |
| **Internal docs / CLAUDE.md** | Blunt, imperative, process-only | *"Windows 11. Backslashes. PowerShell 7+, chain with `;` not `&&`."* |
| **About / mission** | Professional, values-driven, measured | *"Our mission is to help businesses and individuals harness…"* |
| **Error messages / troubleshooting** | Empathetic, step-by-step, no blame | *"Check if backend is running. Verify API_URL. Ensure device is on same network."* |
| **Social / short-form** | Concise, confident, one strong idea | *"Shipped: Vibe Tutor 2.0. Now with neurodivergent-friendly mode. Try it."* |

**Default if unsure:** marketing-lite (aspirational but grounded). Always prefer active voice and concrete nouns.

---

## 4. Messaging Pillars

Four pillars. Every marketing surface should ladder up to at least one.

### Pillar 1 — Design + Code in Perfect Harmony
**Claim:** Vibe Tech solves the designer-developer divide.
**Proof:** Products pair rigorous engineering (TypeScript strict, React 19, Tauri) with intentional visual design (glassmorphism, neon accent system, custom typography).
**One-liner:** *"Stunning design meets powerful functionality."*

### Pillar 2 — Cutting-Edge, Modern Tech
**Claim:** We build on today's tools, not yesterday's.
**Proof:** React 19, TypeScript 5.9 strict, Tauri 2.0, pnpm workspaces + Nx, Tailwind 4.x, glassmorphism + neon aesthetic system.
**One-liner:** *"Modern stack. Modern aesthetic. Modern mindset."*

### Pillar 3 — Accessibility & Inclusivity
**Claim:** Every product puts the user first — including users often overlooked.
**Proof:** Vibe Tutor neurodivergent mode; WCAG AA contrast baseline; keyboard-first navigation; intuitive onboarding.
**One-liner:** *"Built for everyone who uses it — not just who we expected."*

### Pillar 4 — Solo Founder, Full Stack
**Claim:** One builder, a portfolio of shipped products, zero committee.
**Proof:** 28 apps, 26 packages, Windows-11-native dev workflow, finisher mode (ship > plan).
**One-liner:** *"Fewer meetings. More shipping."*

---

## 5. Vocabulary

### Preferred terms
- "digital solutions" (not "software" or "apps")
- "platform," "dashboard," "environment," "system" (not generic "app")
- "modern," "cutting-edge," "innovative" (descriptor pattern — use sparingly, no more than one per paragraph)
- "glassmorphism," "neon," "design system" (visual vocabulary)
- "user-centric," "intuitive," "accessible" (design philosophy)
- "ship," "shipped," "shipping" (preferred over "launch," "release," "go-live")

### Avoided terms
- "clone," "template" — products are custom-built, not derivative
- "enterprise-grade," "world-class," "best-in-class" — hype without proof
- "revolutionary," "disruptive," "game-changing" — generic hype
- "leverage," "synergy," "ecosystem" (when used as buzzwords) — use "use," "fit together," "portfolio"
- "legacy," "old-fashioned" — avoid negative framing of others
- Generic "we" when no team exists — use "I" (Bruce) or the brand name

### Product naming conventions (LOCKED)

**Rule 1 — "Vibe" is mandatory.** Every product Bruce builds must carry the "Vibe" prefix. Non-negotiable. This is the portfolio marker.

**Rule 2 — No hyphens in display names.** Two words, single space. "Vibe Tutor" not "Vibe-Tutor."

**Rule 3 — Kebab-case in code only.** Filesystem, package names, and URL slugs use `vibe-[word]`. That's the only place hyphens live.

**Rule 4 — Legacy products.** Nova Agent is an existing exception (predates the rule). Keep its name; don't retroactively rebrand. Anything new must follow Rule 1.

| Surface | Pattern | Example |
|---|---|---|
| Display / marketing | `Vibe [Word]` | Vibe Tutor, Vibe Code Studio, Vibe Shop |
| Acronym products | `ALLCAPS` | VTDE, VTCC |
| Filesystem | `vibe-[word]` (kebab-case) | `apps/vibe-tutor/` |
| npm package | `@vibetech/vibe-[word]` | `@vibetech/vibe-tutor` |
| Domain | `vibe[word].com` (no hyphen) | `vibetutor.com` |
| Social handle | `@vibe[word]` | `@vibetutor` |

**Why no hyphens (for reference when new people ask):**
1. Hyphens are unspeakable — they disappear in voice, podcasts, referrals.
2. Hyphenated domains lose SEO to the un-hyphenated version and look spammy.
3. Social handles and app-store listings read cleaner without them.
4. No major modern brand picks a hyphen (T-Mobile is the legacy exception).

---

## 6. Visual Identity (Summary)

Full tokens live in Tailwind config + CSS custom properties (`--vibe-*`). Summary for reference:

**Palette**
- Neon cyan: `#00f2ff` (`--vibe-neon-cyan`) — primary accent, CTAs, glow effects
- Neon purple / fuchsia: `--vibe-accent` — secondary accent, badges, headings
- Pink: tertiary accent (Vibe Tutor scheme)
- Deep dark base: `--vibe-bg-deep` — default background, dark mode everywhere

**Typography**
- Heading font: `font-heading` (custom)
- Body font: `font-body` (sans-serif modern stack)
- Wide letter-spacing for premium feel: `--vibe-letter-spacing-wide`
- Neon glow text shadow on hero elements: `0 0 20px rgba(0, 242, 255, 0.5)`

**Design language**
- Glassmorphism: frosted-glass surfaces, `backdrop-filter: blur(20px)`, semi-transparent, soft borders with glow
- Neon emphasis: glowing box-shadows on hover / active states
- Motion: smooth transitions, subtle scale on hover (`hover:scale-105 duration-300`)
- Icons: Lucide React for UI, custom SVG gradients for logo and feature marks

**Tokens location — LOCKED.** All design tokens live in `C:\dev\packages\design-tokens`. Single source of truth for every app.

**Structure (target):**
```
packages/design-tokens/
├── src/
│   ├── colors.ts        # --vibe-neon-cyan, --vibe-accent, --vibe-bg-deep, etc.
│   ├── typography.ts    # font-heading, font-body, letter-spacing
│   ├── shadows.ts       # neon glows, glassmorphic shadows
│   ├── motion.ts        # transition durations, easing curves
│   ├── spacing.ts       # spacing scale
│   └── index.ts         # re-exports + CSS-var generator
├── tailwind.preset.ts   # Tailwind preset consumed by all apps
├── tokens.css           # CSS custom properties for raw CSS / Tauri / Electron
└── package.json         # "@vibetech/design-tokens"
```

**Migration rule:** any new component pulling a color, font, or shadow imports from `@vibetech/design-tokens` — no hardcoded hex values, no inline `rgba()` literals. Existing hardcoded values get migrated opportunistically when touching the surrounding code.

---

## 7. Audience & Persona

### Product tiers (two kinds of Vibe Tech products)

Vibe Tech's portfolio splits into two tiers. Brand voice treats them differently.

**Tier 1 — Commercial products** (built for customers, marketed, priced)
- Vibe Tutor — education app sold to parents
- Vibe Shop — two-sided e-commerce marketplace

These get full marketing treatment: landing pages, polished copy, funnel voice, the four messaging pillars.

**Tier 2 — Personal / dogfood tools** (built for Bruce first, released as-is for similar users)
- Nova Agent — Bruce's personal AI agent
- Vibe Code Studio — Bruce's IDE replacing Cursor / VS Code / Lovable
- VTDE — assumed Tier 2 unless moved

These get a different voice: honest, builder-to-builder, "here's what I built, it solves my problem, you might find it useful too." No marketing funnel. No promises. README as the primary surface. Founder-forward ("I built this because…") is welcome here.

---

### Per-product ICPs (LOCKED)

#### Vibe Tutor — Tier 1
**Primary user:** kids (the learner).
**Primary buyer:** parents (the wallet).
**Two audiences, two tracks of copy:**
- **To parents (buyer):** reassuring, trust-building, results-oriented. Lead with safety, privacy, learning outcomes, peace of mind. Example: *"Vibe Tutor meets your child where they are — adaptive lessons that keep them engaged without screen-time guilt."*
- **To kids (user):** warm, encouraging, simple language, friendly visuals. Emoji OK in-product, sparing. Example: *"Nice work! You just unlocked Level 3."*
**Voice emphasis:** Accessibility & Inclusivity pillar leads. Founder-forward ("I built this for my…") works in origin-story marketing.
**Prohibited:** jargon ("gamified adaptive pedagogical engine"), guilt framing toward parents, condescension toward kids.

#### Vibe Shop — Tier 1
**Primary user:** both merchants AND shoppers (two-sided marketplace).
**Two tracks of copy:**
- **To merchants:** confident, revenue-framed, tool-focused. Lead with control, margins, speed to launch. Example: *"Spin up a shop in 20 minutes. Keep 100% of your margin."*
- **To shoppers:** warm, trustworthy, benefit-led, aesthetic. Lead with product quality and checkout ease. Example: *"Handpicked by independent makers. Checkout in three taps."*
**Voice emphasis:** Design + Code in Perfect Harmony pillar leads (shoppers feel the design, merchants trust the engineering).
**Prohibited:** "leverage," "enterprise-grade," B2B SaaS jargon on the shopper side.

#### Nova Agent — Tier 2 (personal / dogfood)
**Primary user:** Bruce. If released publicly, secondary users are solo builders and power users who want a personal automation agent.
**Voice:** builder-to-builder, peer, honest about what it does and doesn't do. No marketing funnel. README is the surface.
**Example positioning:** *"Nova Agent is my personal AI agent. I built it to automate my dev workflow on Windows. It's opinionated, Windows-first, and assumes you're comfortable with a terminal. If that sounds like you, welcome."*
**Voice emphasis:** Founder-Forward + Practical pillars. First-person "I" is the default here.
**Prohibited:** marketing polish, roadmap promises, "revolutionary," comparisons to other agents.

#### Vibe Code Studio — Tier 2 (personal / dogfood)
**Primary user:** Bruce. Built to replace Cursor, VS Code, and Lovable for his own workflow. If released, secondary users are devs who share Bruce's frustrations with those tools.
**Voice:** opinionated, direct, confident about the choices it makes. No apology for being opinionated. Compare honestly to the incumbents when helpful.
**Example positioning:** *"Vibe Code Studio is what I use instead of Cursor, VS Code, and Lovable. It's an opinionated, AI-native IDE that assumes you already know how to code and want the AI to stay out of your way until asked."*
**Voice emphasis:** Founder-Forward + Modern/Trendy pillars. First-person "I" is the default.
**Prohibited:** hedging ("might work for…"), false neutrality about the incumbents it replaces, feature-parity claims it can't back.

#### VTDE — Tier 2 (assumed personal / dogfood)
**Primary user:** Bruce. Secondary users are solo devs wanting a Windows-native, integrated desktop environment.
**Voice:** Same Tier 2 pattern as Nova Agent — builder-to-builder, honest, README-first.
**Voice emphasis:** Founder-Forward + Practical.

---

### Default persona when unclear

*Alex, 32, full-stack developer, ships side projects, cares about design, runs Windows 11 + VS Code, evaluates tools by "can I ship with this in a weekend."* Use Alex as the mental model for any Tier 2 product or any Vibe Tech surface that isn't clearly Vibe Tutor (parents) or Vibe Shop (merchants + shoppers).

---

## 8. Writing Rules

**Do**
- Lead with the benefit, not the feature
- Use active voice
- Keep sentences under 22 words where possible
- Use sensory language in marketing ("loads instantly," "feels intuitive")
- Use imperatives in docs ("Install dependencies. Run the dev server.")
- Show, don't tell — prefer code snippets and screenshots over claims
- Use Bruce's first-person ("I") for origin stories; use "Vibe Tech" for product pages

**Don't**
- Open with "In today's world of…" or "In the digital age…"
- Use three adjectives when one will do
- Claim "enterprise-grade" without proof
- Explain what a thing is without saying what it does
- Mix "we" and "I" in the same paragraph
- Use emoji in technical docs; use them sparingly in marketing (max 1 per section)

---

## 9. Examples (Voice in Action)

**Strong hero (use this pattern):**
> *Ready to Ignite Your Vision? Tell me your goals, and together we'll craft a digital solution that dazzles and delivers.*
— Imperative ("Tell me"), collaborative ("together"), outcome-focused.

**Strong value prop (use this pattern):**
> *Imagine a world where your website loads instantly, welcomes every user, and feels as intuitive as a conversation. That's the power of design and code working in perfect harmony.*
— Sensory, pillar-aligned, ends on the positioning line.

**Strong feature list (use this pattern):**
> - Real-time chat with NOVA AI
> - Native iOS and Android support
> - Offline-first architecture
> - Secure end-to-end encryption
— Noun phrases, no filler verbs, parallel structure.

**Strong error copy (use this pattern):**
> *Can't connect. Check that the backend is running on port 5177 and the API URL matches your `.env`. Device on the same network as the server?*
— Direct, actionable, no blame, points at probable cause.

**Avoid (this is NOT Vibe Tech voice):**
> ❌ *Vibe Tech's revolutionary enterprise-grade platform leverages cutting-edge synergies to disrupt the digital landscape.*
— Hype stack, no concrete claim, no proof.

---

## 10. Quick Reference — Cheat Sheet

- **Voice in five:** Technical + Accessible, Aspirational, Modern, Founder-Forward, Practical
- **Never:** enterprise-grade, revolutionary, synergy, leverage (as buzzword)
- **Always:** active voice, concrete nouns, benefit before feature
- **Brand name:** *Vibe Tech* (external), `VibeTech` / `@vibetech` (code)
- **Founder:** Bruce Freshwater — lean in for origin, honesty, finisher-mode stories
- **Default tone:** aspirational but grounded; if unsure, write it for a developer who's skeptical but curious

---

## Resolved Decisions (v1.0)

All five discovery-phase open questions are resolved. This guide is now canonical.

1. ✅ **Brand name spelling** — "Vibe Tech" external, `VibeTech` in code, `@vibetech` npm.
2. ✅ **Brand posture** — Hybrid. Vibe Tech is the product voice; Bruce's "I" is used only for origin stories, personal blog posts, and personal social.
3. ✅ **Product naming standard** — "Vibe" prefix mandatory on every new product; no hyphens in display names; kebab-case in code only.
4. ✅ **Design tokens location** — Extracted to `packages/design-tokens` as single source of truth across the monorepo.
5. ✅ **ICP per product** — Two-tier product classification (Tier 1 commercial vs. Tier 2 personal/dogfood); per-product ICPs locked for Vibe Tutor, Vibe Shop, Nova Agent, Vibe Code Studio, VTDE.

---

## Changelog

- **2026-04-16 v1.0** — All five open questions resolved. Hybrid brand posture locked. Design tokens location locked (`packages/design-tokens`). Per-product ICPs locked (two-tier: commercial vs. dogfood). Guide is canonical.
- **2026-04-16 v0.2** — Locked brand name ("Vibe Tech") and product naming rules (Vibe prefix mandatory, no hyphens in display).
- **2026-04-16 v0.1** — initial draft generated from brand-voice discovery of Google Drive + `C:\dev` monorepo.
