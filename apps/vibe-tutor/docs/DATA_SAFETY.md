# Google Play Data Safety Answers for Vibe Tutor

**App:** Vibe Tutor  
**Reviewed Against Code:** March 9, 2026  
**Policy Baseline:** [PRIVACY_POLICY.md](C:\dev\apps\vibe-tutor\docs\PRIVACY_POLICY.md)

This file is the working source of truth for Play Console Data safety answers.

It is based on the current code paths for:

- AI chat and homework parsing
- optional microphone-based homework entry
- analytics and operational logging
- radio streaming
- local SQLite / local storage persistence
- local export and sync features
- Android permissions in the release manifest

## High-Level Answer

**Does your app collect or share any of the required user data types?**  
**Recommended answer:** `Yes`

Reason:

- the app sends chat prompts, conversation context, and homework transcript text off-device when AI features are used
- the app sends pseudonymous analytics / operational events off-device
- the backend and infrastructure necessarily receive network metadata for requests

## Recommended Data Types to Declare

### 1. App activity -> Other user-generated content

**Recommended answer:** `Collected: Yes`

What this covers:

- AI tutor / AI buddy prompts
- conversation context sent to backend AI routes
- homework transcript text generated from optional voice-entry flow
- homework text submitted for parsing

Recommended form selections:

- `Shared: Yes`
- `Processed ephemerally: No`
- `Required: No`
- `Purpose(s): App functionality`

Why:

- this content leaves the device and is sent to backend + third-party AI providers
- the current implementation does not guarantee strict ephemeral-only handling across all providers
- the feature is optional, so it should not be marked required

### 2. App activity -> App interactions

**Recommended answer:** `Collected: Yes`

What this covers:

- pseudonymous analytics events
- AI usage metrics such as prompt length, response length, duration, and feature events
- operational events logged through `/api/analytics/log`

Recommended form selections:

- `Shared: No`
- `Processed ephemerally: No`
- `Required: No`
- `Purpose(s): Analytics`

Why:

- the app sends interaction-related telemetry to your backend
- current code does not send those analytics events directly to ad tech or another third-party analytics SDK
- this is optional from a feature perspective

## Recommended Data Types to Mark Not Collected

Unless implementation changes, the following should be marked `Not collected`:

- Personal info -> Name
- Personal info -> Email address
- Personal info -> User IDs
- Personal info -> Address
- Personal info -> Phone number
- Personal info -> Race and ethnicity
- Personal info -> Political or religious beliefs
- Personal info -> Sexual orientation
- Financial info -> all categories
- Health and fitness -> all categories
- Messages -> Emails
- Messages -> SMS or MMS
- Messages -> Other in-app messages
- Photos and videos -> all categories
- Audio files -> Voice or sound recordings
- Audio files -> Music files
- Audio files -> Other audio files
- Files and docs
- Calendar
- Contacts
- Location -> Precise location
- Location -> Approximate location
- Web browsing
- App info and performance -> Crash logs
- App info and performance -> Diagnostics
- App info and performance -> Other app performance data
- Device or other identifiers

Notes on the trickier ones:

- `Audio files`: the app may access microphone input for speech recognition, but it sends transcript text, not stored audio recordings, through the AI flow.
- `Files and docs`: the app can export locally and request storage access, but it does not send user files/documents off-device as a collected data type.
- `Device or other identifiers`: current code does not use advertising ID, Android ID, IMEI, or similar device identifiers in the app flow reviewed.
- `Diagnostics`: `@sentry/react` is in dependencies, but no active initialization was found in the reviewed runtime code.
- `Personal info -> Other info`: this worksheet does not recommend declaring ordinary backend request metadata as a Play Console app data type for the current implementation.

## Security and Handling Answers

### Is all user data encrypted in transit?

**Recommended answer:** `Yes`

Reason:

- app network calls use HTTPS/TLS backend endpoints in production
- AI provider calls from backend also use HTTPS

### Can users request that data be deleted?

**Recommended answer:** `Yes`

Reason:

- local app data can be cleared in-app through `Settings -> Data Management -> Clear All Data`
- the app does not rely on long-term account profiles for core usage

Important nuance:

- if Play asks specifically about server-side deletion workflows, the backend currently has limited account-linked deletion capability because there is no normal user account system

## Android Permission Alignment

Current manifest permissions reviewed:

1. `android.permission.INTERNET`
2. `android.permission.RECORD_AUDIO`
3. `android.permission.READ_EXTERNAL_STORAGE` (`maxSdkVersion=32`)
4. `android.permission.READ_MEDIA_AUDIO`
5. `android.permission.WAKE_LOCK`
6. `android.permission.FOREGROUND_SERVICE`
7. `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`

Recommended Play Console explanations:

- `RECORD_AUDIO`: optional voice homework entry
- `READ_MEDIA_AUDIO` / `READ_EXTERNAL_STORAGE`: optional user-initiated audio / export-related functionality where applicable
- foreground service permissions: background audio playback
- `WAKE_LOCK`: audio / session continuity

## Store Reviewer Notes

If a reviewer compares the code and disclosures, these are the main points they will likely see:

- chat content is transmitted off-device when AI is used
- transcript text is transmitted off-device when voice homework parsing is used
- analytics / usage telemetry is posted to backend routes
- radio requests are proxied through backend routes
- local educational data is also stored on-device
- there is no sign-in system and no obvious ad SDK

## Practical Recommendation

Use this posture:

- declare `Other user-generated content` as collected and shared for app functionality
- declare `App interactions` as collected for analytics

## Before Submission

Verify all of the following match each other:

- Play Console Data Safety answers
- [PRIVACY_POLICY.md](C:\dev\apps\vibe-tutor\docs\PRIVACY_POLICY.md)
- [privacy-policy.html](C:\dev\apps\vibe-tutor\public\privacy-policy.html)
- target audience / age settings
- any future telemetry or crash-reporting SDKs added after this review
