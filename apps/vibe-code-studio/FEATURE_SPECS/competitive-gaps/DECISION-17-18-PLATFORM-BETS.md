# Decision: Specs 17 & 18 — The Two Multi-Quarter Platform Bets

**Date**: 2026-07-06
**Decider**: Bruce Freshwater (solo dev, self-funded, Windows 11)
**Status**: DECISION DOC — go/no-go for [17-CLOUD-AGENTS.md](17-CLOUD-AGENTS.md) and [18-EXTENSION-HOST-OPENVSX.md](18-EXTENSION-HOST-OPENVSX.md)
**Facts verified by web search 2026-07-06** (specs were written 2026-07-03; Open VSX facts have since drifted — corrections below).

---

## Context

The competitive-gaps campaign has shipped Phase 1 of everything that runs inside the VCS process: waves 1–2 are ✅/🟡 across specs 01–11, plus 15 (PR bot) and 16 (scheduling); batch 1 merged via PR #77, batch 2 up as PR #80. What remains unstarted are the separately-scoped campaigns (12/13/14) and the two ⛔-deferred platform bets: **17 Cloud Agents** (XL, net-new always-on infra) and **18 Extension Host** (Tier A: M; Tier B: XL). Both were parked deliberately — per the README, neither is a sprint item, and every effort label here excludes the mandatory 100% diff-coverage test burden. This doc decides whether "parked" becomes "killed," "scheduled," or "conditional."

## Spec 17 — Cloud/Background Agents: **NO-GO (park indefinitely)**

**Build cost**: XL = 2+ months of solo full-time across three phases (Docker runner image + headless agent entrypoint, RunnerAPI + streaming, web dashboard, GitHub webhook trigger, entitlements/billing wiring) — realistically a full quarter with the coverage gate. **Run cost**: one always-on Docker host (the existing D:\ box at ~$0 marginal, or a $30–80/mo VPS class machine), plus per-run LLM token spend — the dominant variable cost — plus the thing no invoice shows: _Bruce is the on-call rotation_. A single self-hosted runner has no HA; when it's down, the feature is down.

**Reuse is real** (DEPENDENCY_AUDIT verified): Express backend, `@vibetech/billing`, `@vibetech/entitlements` all exist; `BackgroundAgentSystem`'s event shape and `RemoteConnectionManager`'s transport pattern are proven templates; command-center could host the dashboard. Only the Docker runner itself is new infra. But reuse cuts build cost, not operational burden.

**Strategic value for a solo-dev product**: low today. The user story ("close my laptop, agent keeps working") is mostly satisfied locally now — spec 16 scheduling + spec 10's Agent Manager + spec 09/11 walkthrough artifacts already deliver unattended local runs with reviewable output. Cloud agents matter when there are _other users_ whose machines you don't control, i.e. when billing has actual customers. VCS has none yet. **Risk**: the classic solo-dev trap — a quarter spent operating infrastructure instead of shipping IDE features, for a feature only its author uses.

**Flip condition**: revisit the moment VCS has paying external users (billing live, >0 revenue) AND either (a) users request remote/mobile-triggered runs, or (b) Bruce's own weekly usage includes multi-hour runs that meaningfully block the local machine. Until both, the opportunity cost (12/13/14 or polish on shipped specs) wins.

## Spec 18 — Extension Host + Open VSX

**The legal constraint is confirmed and current**: Microsoft's Marketplace terms state offerings "may only be installed and used with Visual Studio Products and Services," and the VS Code FAQ says flatly that "alternative products including those built on a fork of the Code - OSS Repository, are not permitted to access the Visual Studio Marketplace" — enforced in practice (VSCodium docs; MS-owned extensions like Pylance/C# Dev Kit/Remote-SSH are blocked even for well-funded forks). **Open VSX (Eclipse Foundation) is the only lawful registry** for VCS, as it is for Cursor, Windsurf, Google Antigravity, AWS Kiro, VSCodium, and Theia.

**Open VSX is healthier than the spec assumed** — corrections as of 2026-07: 1.0.0 released June 2026; 300M+ downloads/month, 12,000+ extensions; AWS strategic infrastructure investment (March 2026); Managed Registry launched April 2026 with AWS/Google/Cursor as launch customers. Rate-limit reality: the public registry's free Community Tier is **75 req/s** — a single-user IDE with client-side caching won't get near it. The paid Managed Registry (free tier 3 RPS; Enterprise €100K/yr at 15 RPS; Enterprise XL €500K/yr) is what _at-scale commercial platforms_ pay; irrelevant at dogfood scale, but a real future COGS line if VCS ever ships to thousands of users — Eclipse's stated model is that commercial consumers "contribute proportionally."

### Tier A — curated Open VSX (themes/grammars/snippets), M: **GO — schedule next**

Pullable forward independently (README track A: "any time after 01" — 01 is 🟡 shipped, ThemeImporter exists and is exactly the pipeline Tier A feeds). Declarative-only scope = no extension host, no activation code, no sandboxing, no MS-proprietary-extension wall, minimal legal surface (attribution to Open VSX in UI per AC #8). It converts spec 01's importer from "bring your own JSON file" into "browse 12,000+ extensions' themes/grammars/snippets" — outsized perceived value for 1–2 weeks. Known cost: Open VSX catalog is a subset of MS's (popular non-Microsoft items are generally present); the coverage gate means the parser/client/registrar modules must be pure-logic `.ts` with full tests — fits the effort label.

### Tier B — full VS Code-compatible extension host, XL: **NO-GO (indefinite; do not schedule)**

Cost is not one XL quarter — it's a _permanent_ tax: a sandboxed Node sidecar shimming a `vscode` API surface that Microsoft evolves monthly, with compatibility-chasing forever after (this is why every serious competitor is a VS Code _fork_ that inherits the host rather than reimplementing it). The marquee extensions users would actually want it for (Pylance, C# Dev Kit, Remote-SSH) are licensed against non-MS products and absent from Open VSX regardless — so even a perfect shim under-delivers on "parity with Cursor." For a solo dev, this is the single worst effort-to-moat item on the board: VCS's defensible edge is the agentic stack (README's own strategic call), not extension breadth. Kill criteria for reopening: real product traction plus a named list of ≤10 must-have extensions that Tier A cannot satisfy — then write a fresh scoping spec for a _narrow_ shim targeting exactly that list, per spec 18 Phase 3.

## Revisit triggers

- **First paying user / billing goes live** → reopen 17 Phase 1 (IDE-triggered runner only; dashboard and GitHub triggers stay deferred).
- **A concrete ≤10-extension must-have list emerges from users that Tier A can't cover** → commission the Tier B scoping spec (not Tier B itself).
- **Open VSX policy change** (free/community tier tightened below single-IDE viability, or new fees on client apps) → re-evaluate Tier A's caching strategy and Tier B's economics.
- **Bruce personally loses >2 hrs/week to local machine being blocked by long agent runs** → 17 flip condition (b).
- **Specs 12/13/14 all shipped and no higher-leverage work remains** → cheapest slice of 17 (headless runner on the D:\ box, no billing/dashboard) becomes a defensible internal tool.

## Sources

- [VS Code FAQ — marketplace not permitted for Code-OSS forks](https://code.visualstudio.com/docs/supporting/FAQ)
- [VSCodium extensions doc — why it uses Open VSX](https://github.com/VSCodium/vscodium/blob/master/docs/extensions.md)
- [Eclipse Foundation: Open VSX Managed Registry launch, 2026-04-21](https://newsroom.eclipse.org/news/announcements/eclipse-foundation-launches-open-vsx-managed-registry-0)
- [Managed Open VSX pricing (Free 3 RPS / Enterprise €100K / XL €500K)](https://managed.open-vsx.org/pricing/)
- [Open VSX rate-limiting wiki — 75 req/s Community Tier](https://github.com/EclipseFdn/open-vsx.org/wiki/rate-limiting)
- [Eclipse blog — tiered rate limiting rationale](https://blogs.eclipse.org/post/christopher-guindon/scaling-open-vsx-registry-responsibly-rate-limiting)
- [The Register — AWS backs Open VSX (2026-03)](https://www.theregister.com/2026/03/03/open_vsx_aws/)
- [Visual Studio Magazine — Open VSX 1.0.0 (2026-06)](https://visualstudiomagazine.com/articles/2026/06/24/open-vsx-1-0-0-puts-focus-on-open-extension-registry-for-vs-code-ecosystem.aspx)
- [The New Stack — managed registry, adopters incl. Cursor/Antigravity/Kiro](https://thenewstack.io/open-vsx-managed-registry/)
- [The Hacker News — forks recommending missing Open VSX extensions (2026-01)](https://thehackernews.com/2026/01/vs-code-forks-recommend-missing.html)
