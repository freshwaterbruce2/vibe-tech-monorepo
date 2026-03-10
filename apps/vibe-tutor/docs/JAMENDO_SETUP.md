# Jamendo Music API Setup Guide

## Overview

Jamendo provides access to 600,000+ Creative Commons licensed tracks. This guide will help you set up the API integration for Vibe-Tutor.

## Step 1: Create Jamendo Developer Account

1. Visit **<https://developer.jamendo.com/>**
2. Click "Sign Up" or "Register"
3. Create a free account with your email
4. Verify your email address

## Step 2: Create an Application

1. Log in to the Jamendo Developer Portal
2. Navigate to "My Applications" or "Create App"
3. Fill in the application details:
   - **App Name**: `Vibe-Tutor` (or `Vibe-Tutor Dev` for development)
   - **Description**: Educational app for high school students with ADHD/autism support
   - **Application Type**: Non-commercial / Educational
   - **Platforms**: Web, Android
4. Submit the application
5. Copy your **Client ID** (looks like: `a1b2c3d4`)

## Step 3: Configure Environment Variables

### For Web Development (.env.local)

Create or update `C:\dev\Vibe-Tutor\.env.local`:

```bash
# Jamendo Music API
VITE_JAMENDO_CLIENT_ID=your_client_id_here
```

Replace `your_client_id_here` with your actual Jamendo Client ID.

### For Android Build

The `.env.local` file is automatically used by Vite, so no additional configuration needed for Android builds.

## Step 4: Test the Integration

Run the test command:

```bash
cd C:\dev\Vibe-Tutor
pnpm run test:jamendo
```

This will:

- ✅ Verify API key is configured
- ✅ Test search functionality
- ✅ Test genre browsing
- ✅ Test smart search
- ✅ Display sample results

## Step 5: Usage Limits

**Free Tier:**

- 35,000 API requests per month
- Resets on the 1st of each month
- No credit card required

**Current Usage:**
Check usage stats in the app:

```typescript
import { getUsageStats } from './services/jamendoService';

const stats = getUsageStats();
console.log(`Used ${stats.requestsThisMonth} / ${stats.monthlyLimit} requests`);
```

Usage is automatically tracked in localStorage.

## Step 6: Verify Everything Works

1. Start the development server:

   ```bash
   pnpm run dev
   ```

2. Navigate to the Music Library section

3. You should now see:
   - **Browse** tab with genre categories
   - **Search** bar for finding tracks
   - **Trending** section with popular tracks

4. Try searching for:
   - "anime music"
   - "calm study music"
   - "classical piano"
   - "Christian worship"

## Troubleshooting

### Error: "Jamendo API key not configured"

**Cause:** Missing or invalid `VITE_JAMENDO_CLIENT_ID` in `.env.local`

**Solution:**

1. Check that `.env.local` exists in `C:\dev\Vibe-Tutor\`
2. Verify the Client ID is correct (no extra spaces)
3. Restart the development server (`pnpm run dev`)

### Error: "Jamendo API error: 401"

**Cause:** Invalid Client ID

**Solution:**

1. Double-check your Client ID from the Jamendo Developer Portal
2. Ensure you copied the entire ID
3. Verify there are no typos

### Error: "Jamendo API error: 429"

**Cause:** Rate limit exceeded (35,000 requests/month)

**Solution:**

1. Check usage stats: `getUsageStats()`
2. Wait until the next month for reset
3. Consider caching search results
4. Reduce the number of API calls during development

### No search results

**Cause:** Query might be too specific or genre tags don't match

**Solution:**

1. Try broader search terms
2. Use the smart search feature (automatic keyword mapping)
3. Browse by genre instead of searching
4. Check console logs for API response details

## API Endpoints Reference

**Search Tracks:**

```
GET https://api.jamendo.com/v3.0/tracks/?client_id=YOUR_ID&search=query
```

**Browse by Genre:**

```
GET https://api.jamendo.com/v3.0/tracks/?client_id=YOUR_ID&tags=electronic+dance
```

**Get Track Details:**

```
GET https://api.jamendo.com/v3.0/tracks/?client_id=YOUR_ID&id=TRACK_ID
```

## Genre Categories

Vibe-Tutor uses these pre-configured genre mappings:

| Category | Jamendo Tags |
|----------|--------------|
| **Anime** | anime, japanese, oriental, soundtrack, instrumental |
| **EDM** | electronic, dance, techno, trance, house, dubstep |
| **Lo-fi** | chillout, lounge, ambient, downtempo, relaxation |
| **Christian** | world, spiritual, classical, peaceful |
| **Classical** | classical, piano, orchestral, instrumental |
| **Study** | ambient, instrumental, classical, focus, concentration |

## Smart Search Keywords

The smart search feature automatically maps keywords to genres:

- **"anime"** → Anime genre
- **"chill"**, **"calm"**, **"relax"** → Lo-fi genre
- **"study"**, **"focus"**, **"homework"** → Study genre
- **"edm"**, **"electronic"**, **"techno"** → EDM genre
- **"classical"**, **"piano"** → Classical genre
- **"worship"**, **"spiritual"** → Christian genre

## Next Steps

Once configured, you can:

1. **Integrate with Music Library UI** (see Sprint 1 tasks)
2. **Add 30-second preview functionality**
3. **Enable download integration with existing queue**
4. **Create curated playlists for different activities**

## Support

- **Jamendo API Docs**: <https://developer.jamendo.com/v3.0/docs>
- **Jamendo Support**: <https://devportal.jamendo.com/support>
- **Vibe-Tutor Issues**: See CLAUDE.md for project documentation

---

**Last Updated**: November 10, 2025
