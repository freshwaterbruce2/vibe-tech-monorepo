# Vibe Tutor API

The production API accepts only authenticated `POST /api/chat` requests with `{ chatType: "tutor"|"friend", messages }`. Model, temperature, output, provider, and routing controls are server-owned. The sole production routing order is `deepseek/deepseek-v4-flash-0731` followed once by `google/gemini-3.7-flash`; OpenRouter requests require zero-data-retention and provider data-collection denial.

Production requires `SESSION_SIGNING_SECRET`, `INSTALLATION_HMAC_SECRET`, `PLAY_CERTIFICATE_SHA256`, a Google Play Integrity verifier backed by service identity, an OpenRouter credential, and an injected durable Cloud quota adapter. It fails closed when any of those are unavailable. Test/development may inject a verifier and in-memory quota store; that configuration is never production-ready.

Quota reservations are finalized only after a successful generated response. Local crisis responses and provider failures do not consume allowance. Operational logs must never include message text, credentials, Integrity tokens, session tokens, raw installation IDs, or report content. Reports are metadata-only unless a user explicitly includes bounded content; included content expires after 30 days.

Cloud spending ceilings/alerts, Play Console setup, public policy hosting, and live entitlement/provider checks are external release gates and remain unconfigured in this checkout.
