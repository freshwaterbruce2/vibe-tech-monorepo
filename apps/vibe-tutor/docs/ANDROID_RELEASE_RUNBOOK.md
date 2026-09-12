# Vibe Tutor Android release runbook — held prerequisites

This is a readiness reference for the current checkout at
`C:\projects\vibe-tech-monorepo`. It authorizes no build, signing, device,
hosting, Play Console, upload, pricing, submission, or publication action.

## Current local identity

- Package: `com.vibetech.tutor`
- Candidate version: `1.5.13` / `10514`
- Android SDK levels: min 23, compile 36, target 36

## Held prerequisites

Before a separately approved local artifact gate, confirm that safe existing
inputs are available without revealing them: JDK 21, Android SDK, server-side
OpenRouter and entitlement configuration, the existing upload-signing material
outside the checkout, and the required Play Integrity project number. Do not
create, rotate, copy, print, or place credentials in this repository.

Before a separately approved external gate, confirm the public privacy-policy
URL, cloud/report retention enforcement, Play Console declarations, listing
assets, distribution, price, and review/submission requirements. These are not
local completion signals.

## Release evidence boundary

The maintained source-level validators check only configured invariants. They
do not prove a signed artifact, provider availability, Firestore retention,
physical-device behavior, Play Console state, or publication. Any future build,
Gradle, signing, device/ADB, hosting, upload, pricing, or submission action
requires an explicitly named approval.
