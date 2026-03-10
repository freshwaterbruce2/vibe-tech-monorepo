# Play Console Quick Setup Guide

**Goal:** Get to Internal Testing as fast as possible

---

## 1. App Access (REQUIRED)

**Location:** Left sidebar → App access

**Question:** "Do all of the functionality and content in your app have any restrictions?"

**Answer:** No (all functionality is available to all users)

**Click:** Save

---

## 2. Ads (REQUIRED)

**Location:** Left sidebar → Ads

**Question:** "Does your app contain ads?"

**Answer:** No, my app does not contain ads

**Click:** Save

---

## 3. Content Rating (REQUIRED)

**Location:** Left sidebar → Content rating

**Click:** "Start questionnaire"

### Form Fields

**Email address:** [Your email]

**App category:** Utility, productivity, communication, or other

### Content Questions (Answer NO to all)

- Violence: NO
- Sexual content: NO
- Language: NO
- Controlled substances: NO
- Discrimination: NO
- User-generated content: NO
- Location sharing: NO
- Personal info sharing: NO

**Click:** Next → Save questionnaire → Apply rating

✅ You'll get: Everyone / PEGI 3 / ESRB E

---

## 4. Target Audience (REQUIRED)

**Location:** Left sidebar → Target audience

**Select age groups:** 13-17 ONLY (uncheck all others)

**Question about under 13:** NO

**Click:** Next → Save

---

## 5. News App (REQUIRED)

**Location:** Left sidebar → News app

**Answer:** No, my app is not a news app

**Click:** Save

---

## 6. COVID-19 Contact Tracing (REQUIRED)

**Location:** Left sidebar → COVID-19 contact tracing and status apps

**Answer:** My app is not a COVID-19 contact tracing or status app

**Click:** Save

---

## 7. Data Safety (REQUIRED)

**Location:** Left sidebar → Data safety

**Click:** "Start"

### Data Collection

**Question:** Does your app collect or share any of the required user data types?

**Answer:** Yes (minimal - AI chat only)

### Data Types - Select

**App activity -> App interactions**

- Collected: YES
- Shared: YES (AI chat processing with Google Gemini primary + OpenRouter fallback)
- Purpose: App functionality + Analytics
- Optional: mark based on your final implementation toggle policy

**All other data types:** Select NO/None (as long as app behavior remains unchanged)

### Security

**Is all user data encrypted in transit?** YES

**Do you provide a way for users to request data deletion?** YES (in-app via parent dashboard)

**Click:** Next → Submit

---

## 8. Government Apps (REQUIRED)

**Location:** Left sidebar → Government apps

**Answer:** My app is not a government app

**Click:** Save

---

## 9. Financial Features (REQUIRED - if shown)

**Answer:** My app does not contain financial features

**Click:** Save

---

## 10. Privacy Policy (REQUIRED)

**Location:** Left sidebar → App content → Privacy policy

**Privacy policy URL:**

```
https://freshwaterbruce2.github.io/vibetech/privacy-policy/
```

**Click:** Save

---

---

## 11. Permissions Declaration Cross-Check (Recommended)

In App content / permissions declarations, ensure wording matches manifest permissions:

- `RECORD_AUDIO`: voice input for chat
- `READ_MEDIA_AUDIO` and `READ_EXTERNAL_STORAGE (maxSdkVersion=32)`: audio library/file access where used
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK`: background audio playback
- `WAKE_LOCK`: focus timer/session continuity

---

## ✅ Minimum Setup Complete

Once all items in "App content" have green checkmarks, you can proceed to:

**Left sidebar → Testing → Internal testing**

---

**Time to complete:** 10-15 minutes
**Next step:** Upload AAB to Internal Testing
