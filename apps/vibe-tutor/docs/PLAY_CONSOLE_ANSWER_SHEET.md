# Play Console Answer Sheet for Vibe Tutor

**App:** Vibe Tutor  
**Prepared:** March 10, 2026  
**Use with:** [DATA_SAFETY.md](C:\dev\apps\vibe-tutor\docs\DATA_SAFETY.md), [PRIVACY_POLICY.md](C:\dev\apps\vibe-tutor\docs\PRIVACY_POLICY.md)

This sheet is written as a fill-in guide for Play Console screens.

## 1. Target Audience

**Location:** `Policy and programs -> App content -> Target audience`

Select:

- `13-15`
- `16-17`

Do not select:

- `Under 5`
- `5-8`
- `9-12`
- `18 and over only`

Recommended supporting description for internal use:

`Vibe Tutor is designed for teen learners ages 13-17, including neurodivergent students who benefit from structured study support.`

## 2. Data Safety

**Location:** `Policy and programs -> App content -> Data safety`

### High-level screen

**Question:** `Does your app collect or share any of the required user data types?`  
**Select:** `Yes`

### Security practices

**Question:** `Is all user data collected by your app encrypted in transit?`  
**Select:** `Yes`

**Question:** `Do you provide a way for users to request that their data is deleted?`  
**Select:** `Yes`

Internal note:

- support this with in-app deletion through `Settings -> Data Management -> Clear All Data`

## 3. Data Types to Declare

Use the following categories and selections.

### A. App activity -> Other user-generated content

Add this category.

Select:

- `Collected`: `Yes`
- `Shared`: `Yes`

Purpose:

- `App functionality`

Handling answers:

- `Is this data processed ephemerally?` -> `No`
- `Is collection of this data required for your app, or can users choose whether it's collected?` -> `Users can choose`

What this covers:

- AI tutor prompts
- AI buddy prompts
- conversation context sent to backend chat routes
- homework text submitted for parsing
- transcript text produced from optional voice homework entry

Why shared:

- backend transmits this content to Google Gemini and OpenRouter for AI responses or parsing

### B. App activity -> App interactions

Add this category.

Select:

- `Collected`: `Yes`
- `Shared`: `No`

Purpose:

- `Analytics`

Handling answers:

- `Is this data processed ephemerally?` -> `No`
- `Is collection of this data required for your app, or can users choose whether it's collected?` -> `Users can choose`

What this covers:

- pseudonymous analytics events
- request timing
- prompt/response length metrics
- operational logging related to feature use and reliability

## 4. Data Types to Mark Not Collected

Mark these as `Not collected`, unless the implementation changes:

- Personal info -> Name
- Personal info -> Email address
- Personal info -> User IDs
- Personal info -> Address
- Personal info -> Phone number
- Financial info -> all
- Health and fitness -> all
- Messages -> all
- Photos and videos -> all
- Audio files -> all
- Files and docs
- Personal info -> Other info
- Calendar
- Contacts
- Location -> Precise
- Location -> Approximate
- Web browsing
- App info and performance -> Crash logs
- App info and performance -> Diagnostics
- Device or other identifiers

Important note:

- do not mark `Audio files` collected just because the app uses the microphone
- the current reviewed flow sends transcript text, not stored audio recordings

## 5. Shared / Sold / Advertising Questions

Where Play asks follow-up questions, use:

- `Is data sold?` -> `No`
- `Is data used for advertising or marketing?` -> `No`

## 6. Suggested Explanations for Internal Use

These are not always pasted directly into Play Console, but they are the rationale behind the answers.

### Other user-generated content

`When users use AI tutoring, AI buddy, or homework parsing features, user-entered text and related context are sent to our backend and to AI providers needed to generate responses or structured results. These features are optional.`

### App interactions

`The app sends limited pseudonymous interaction and reliability events, such as feature events and request timing, to help maintain service reliability and improve functionality.`

### Deletion

`Users can delete locally stored app data from within the app through Settings -> Data Management -> Clear All Data. The app does not rely on long-term user accounts for normal usage.`

## 7. Privacy Policy URL

**Location:** `Policy and programs -> App content -> Privacy policy`

Use the public URL you actually host.

Recommended format from current repo notes:

`https://freshwaterbruce2.github.io/vibetech/privacy-policy/`

Do not submit with an unreachable URL.

## 8. Permissions Cross-Check

Use these explanations if Play asks about permissions elsewhere in App content.

### `RECORD_AUDIO`

`Used only for optional in-app voice homework entry. Users can type instead of using the microphone.`

### `READ_MEDIA_AUDIO`

`Used for optional audio-related features where audio/media access is needed on supported Android versions.`

### `READ_EXTERNAL_STORAGE` (`maxSdkVersion=32`)

`Legacy permission used only on older Android versions for optional media/file-related functionality.`

### `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK`

`Used to support ongoing audio playback with background playback controls and media notification behavior.`

### `WAKE_LOCK`

`Used to help maintain active study/audio sessions without unintended interruption.`

## 9. Content Rating / App Content Alignment

Keep these answers aligned across the Play Console:

- public user-to-user sharing: `No`
- ads: `No`
- in-app purchases: `No`
- under-13 targeting: `No`

If reviewer clarification is needed:

`The app includes private user-to-AI tutoring chat only. User messages are not posted publicly and are not visible to other users.`

## 10. Final Submission Check

Before clicking submit in Play Console, verify all of these match:

- [DATA_SAFETY.md](C:\dev\apps\vibe-tutor\docs\DATA_SAFETY.md)
- [PRIVACY_POLICY.md](C:\dev\apps\vibe-tutor\docs\PRIVACY_POLICY.md)
- hosted privacy-policy URL
- Android manifest permissions
- target audience selections

## 11. Recommended Final Answer Set

Use this exact short version:

- Data collected/shared required user data: `Yes`
- Encrypted in transit: `Yes`
- Deletion available: `Yes`
- `App activity -> Other user-generated content`: `Collected Yes`, `Shared Yes`, `App functionality`, `Not ephemerally processed`, `Users can choose`
- `App activity -> App interactions`: `Collected Yes`, `Shared No`, `Analytics`, `Not ephemerally processed`, `Users can choose`
