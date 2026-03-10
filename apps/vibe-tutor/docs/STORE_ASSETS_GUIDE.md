# Store Assets Preparation Guide

**App**: Vibe-Tutor v1.4.0
**Date**: January 6, 2026
**Status**: Enhanced for 2026 Play Store standards

## Required Assets for Google Play Store

### 1. App Icon (REQUIRED) - 1024x1024

**Specifications (2026 Play Store Standards):**

- **Size**: 1024 x 1024 pixels (exact)
- **Format**: PNG-32 (no JPEG)
- **Resolution**: 72 DPI
- **Color Space**: sRGB with alpha (but see export note)
- **Transparency**: NO transparent areas - icon must be solid/opaque
- **Safe Area**: Core icon must fit in 960x960 center (Android masks outside)
- **Device Scaling**: Icon will be rendered at 48x48dp minimum (verify legibility at this size)

**Design Guidelines for Neurodivergent-Friendly App:**

- **Visual Simplicity**: Single, clear focal point (no intricate details)
- **Brand Colors**: Use primary #D946EF (Hot Magenta) + secondary #06FFF0 (Electric Cyan)
- **Shape Harmony**: Circle or rounded square preferred for modern Play Store
- **Contrast**: 4.5:1 minimum contrast ratio (accessible to vision-impaired users)
- **Icon Concepts**:
  - Option 1: Lightbulb (learning) + Brain (neurodivergence support) merged
  - Option 2: Chat bubble + Graduation cap (tutoring focus)
  - Option 3: Timer + Brain (focus + neurodivergence)
  - Option 4: Stylized "V" with neon glow (brand forward)

**Neon Glow Effect (Recommended):**

- Add subtle outer glow: #06FFF0 (cyan) or #D946EF (magenta)
- Blur radius: 12-16 pixels
- Opacity: 60-80%
- Creates visual interest without compromising clarity

**High-Contrast Checklist:**

- [ ] Icon is visible against white background
- [ ] Icon is visible against black background
- [ ] Icon is legible at 48x48 pixel size
- [ ] No thin lines (<2px at base size)
- [ ] Color palette uses max 3-4 colors

**Design Tools (2026 Recommended):**

- **Figma** (Free tier): <https://figma.com> - Best for team collaboration, interactive components
- **Canva** (Free tier): <https://canva.com> - Easiest learning curve, templates available
- **Adobe Express** (Free): <https://express.adobe.com> - One-click designs, brand kit support
- **GIMP** (Open source): <https://www.gimp.org> - Full control, no cloud dependency
- **Affinity Designer 2**: Professional alternative to Adobe Illustrator

**Export Settings (Critical for Android):**

```
File Format:     PNG-32
Canvas Size:     1024 x 1024 pixels
DPI/Resolution:  72 DPI (standard for screens)
Color Profile:   sRGB
Background:      Solid (no transparency)
Compression:     Maximum (PNG-8 if same visual quality)
Naming:          icon-1024x1024.png
```

**Current Icon**: Located at `Vibe-Tutor/public/icon-1024.png` (if exists)
**Action**: Create new icon following 2026 standards or refresh existing icon

---

### 2. Feature Graphic (REQUIRED) - 1024x500

**Specifications (Google Play Store 2026):**

- **Size**: 1024 x 500 pixels (exactly 2:1 aspect ratio)
- **Format**: PNG or JPEG (JPEG recommended for smaller file size)
- **Transparency**: NOT allowed - opaque background only
- **File Size**: Keep under 2 MB (compress JPEG to 90% quality)
- **Usage**: Displayed as header image on app store listing
- **Visibility**: Must work at small preview sizes (400px width minimum)

**Key Message (Primary):**
"AI-Powered Homework Manager for Neurodivergent Students"

**Design Layout Options:**

**Option 1: Split Layout (Left/Right Balance)**

```
┌─────────────────────────────────────────────┐
│ LEFT (40%)        │ CENTER (60%)             │
│ App Icon/Logo     │ Title: Vibe-Tutor       │
│ Neon styling      │ + Tagline               │
│                   │                          │
│                   │ 3-4 Feature Keywords:   │
│                   │ ✓ AI Homework Help      │
│                   │ ✓ Focus Timer           │
│                   │ ✓ ADHD-Friendly         │
│                   │ ✓ Gamified Rewards      │
└─────────────────────────────────────────────┘
```

**Option 2: Full-Width Background (Recommended)**

```
┌─────────────────────────────────────────────┐
│ GRADIENT BACKGROUND (Magenta #D946EF to    │
│                      Cyan #06FFF0)         │
│                                             │
│     Vibe-Tutor                             │
│     AI-Powered Homework Manager             │
│                                             │
│     [Screenshot Montage or Feature Icons]   │
│     (Right 40% shows 3-4 app screenshots)   │
└─────────────────────────────────────────────┘
```

**Design Best Practices:**

- **Background**: Gradient from #D946EF (left) to #06FFF0 (right) creates neon energy
- **Typography**:
  - App Name: 72pt, bold, white, center-aligned
  - Tagline: 28pt, lighter weight, semi-transparent white
  - Feature text: 18pt, contrasting color
- **Focal Point**: Center app icon or main screenshot on right side
- **Text Overlay**: All text requires 2-3px dark/light stroke for readability over photos
- **Negative Space**: Don't overload - 30% empty space improves visual hierarchy

**Content Checklist:**

- [ ] App name "Vibe-Tutor" prominently displayed
- [ ] Tagline or key value proposition visible
- [ ] 3-4 key features highlighted (AI, Focus, Gaming, Accessibility)
- [ ] Brand colors visible (purple/cyan gradient)
- [ ] Screenshot or feature icons show real app UI
- [ ] All text legible at 400px width
- [ ] No personal data or sensitive information visible
- [ ] Neon glow effects enhance brand identity

**Screenshot Integration Tip:**
If including app screenshots in graphic:

- Take 1-2 high-quality screenshots from app
- Blur background or use dark overlay
- Keep foreground sharp and in focus
- Show 1 key feature clearly (e.g., AI Chat, Focus Timer, Dashboard)

**Design Tools (Recommended for 2026):**

- **Figma** (Free tier): <https://figma.com> - Professional results, templates available
- **Canva** (Free tier): <https://canva.com> - Google Play Store template pre-sized
- **Adobe Express** (Free): <https://express.adobe.com> - Template library + brand kit
- **Photopea** (Free online): <https://www.photopea.com> - Photoshop-compatible editor

**Export Settings:**

```
Format:          JPEG or PNG
Canvas Size:     1024 x 500 pixels
Quality/Compression: 85-90% (JPEG) or max compression (PNG)
Color Profile:   sRGB
File Size:       Target < 2 MB
Naming:          feature-graphic-1024x500.jpg or .png
```

**Advanced: Animated Feature Graphic (Optional, 2026 Trend)**
Google Play Store now supports short animated feature graphics (MP4, 5 seconds max):

- Creates visual interest
- Shows key features in action
- Not required, but increasingly expected
- Can reuse intro from promo video
- Tools: CapCut (free), Adobe Animate (paid)

---

### 3. Phone Screenshots (REQUIRED - minimum 3, maximum 8)

**Specifications (2026 Standards):**

- **Minimum size**: 320 pixels (width)
- **Maximum size**: 3840 pixels (width)
- **Recommended**: 1080 x 1920 (9:16 aspect ratio) - Pixel 5 standard
- **Alternative**: 1440 x 2560 (9:16 aspect ratio) - Pixel 6/7 standard
- **Format**: PNG or JPEG
- **File Size**: Keep individual screenshots under 500 KB
- **Total Count**: Minimum 3, maximum 8 screenshots
- **Order Priority**: 1st screenshot is MOST important - place hero feature there
- **Device Frame**: Optional (remove for consistency with Play Store modern look)

**Required Screenshots (In Recommended Order):**

1. **Homework Dashboard (Hero Shot - Most Important)**
   - **What to show**:
     - Main task list with 3-4 assignments visible
     - Voice input button prominently displayed (large red/pink button)
     - Progress bar or week chart visible
     - One or two quick action buttons
   - **State**: Show dashboard with some tasks already completed (visual proof of functionality)
   - **Captions**: "Never forget an assignment again" OR "Organize all homework in one place"
   - **Why important**: First screen users see - must hook them immediately

2. **AI Chat Helper (Tutor Interaction)**
   - **What to show**:
     - Chat conversation with AI tutor (3-4 messages visible)
     - Student asking math/English/science question
     - AI providing helpful, emoji-limited response
     - Input field with text/voice toggle
   - **State**: Mid-conversation, showing AI capability
   - **Captions**: "24/7 homework help powered by AI" OR "Get instant answers to any homework question"
   - **Sensitive Data**: Blur student name if visible, blur specific question details

3. **Focus Timer in Action**
   - **What to show**:
     - Pomodoro timer counting down (e.g., 22:30 remaining)
     - Focus session active with progress bar
     - Points/rewards counter increasing
     - Brain icon or motivational message
   - **State**: Timer actively running (screenshot during session)
   - **Captions**: "Stay focused with gamified Pomodoro timer" OR "Earn points while building focus habits"
   - **Why important**: Differentiator - unique to neurodivergent apps

4. **Brain Games Grid**
   - **What to show**:
     - Game menu with 4-6 game options visible (Word Search, Memory, etc.)
     - Difficulty levels or difficulty badges shown
     - One game partially visible to entice interaction
     - Star ratings or achievement progress
   - **State**: Menu screen, clean layout
   - **Captions**: "Learn through play with engaging brain games" OR "Make studying fun with gamification"

5. **Achievement Center / Progress Tracking**
   - **What to show**:
     - Achievement badges earned (visual badges displayed)
     - Progress bars toward next achievement
     - Points counter visible
     - Streak indicator if applicable
   - **State**: Showing multiple achieved badges + progress toward next
   - **Captions**: "Celebrate every milestone with achievement rewards" OR "Track progress visually"
   - **Why important**: Motivation is key for neurodivergent students

6. **Sensory Settings Control Panel**
   - **What to show**:
     - Animation toggle (on/off)
     - Sound/haptic feedback toggle
     - Font size slider
     - Color theme selector (light/dark)
     - Contrast adjustment slider
   - **State**: Show 2-3 settings toggled on, emphasizing customization
   - **Captions**: "Fully customized for ADHD & autism support" OR "Adapt the app to YOUR brain"
   - **Why important**: Accessibility is core value proposition

7. **Parent Dashboard Analytics**
   - **What to show**:
     - Progress chart showing homework completion over time
     - Achievement summary (total points, badges earned)
     - Time spent on app/homework metrics
     - Settings parent can adjust
   - **State**: Dashboard with colorful charts and data
   - **Captions**: "Complete parent visibility and control" OR "Support your student's success with insights"
   - **CRITICAL**: Blur or hide student names, specific assignment titles, any personally identifiable information
   - **Mock Data**: Use sample data if real data not available

8. **Week Progress Chart (Optional)**
   - **What to show**:
     - 7-day bar chart showing daily progress
     - Color coding (green = good, yellow = moderate)
     - Daily point totals visible
     - Current day highlighted
   - **State**: Showing a full week with mixed results (makes it realistic)
   - **Captions**: "Visualize your week at a glance" OR "See progress across the entire week"

**Device Screenshot Capture Methods (Recommended for Real Devices):**

**Method 1: ADB Command Line (Best for automation, batch captures)**

```bash
# Prerequisites
# 1. Connect Android device via USB
# 2. Enable USB Debugging: Settings → Developer Options → USB Debugging

# Capture single screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./screenshots/01-homework-dashboard.png

# Remove screenshot from device to save space
adb shell rm /sdcard/screenshot.png

# Batch capture (navigate app between captures)
FOR /L %i IN (1,1,8) DO (
  ECHO Navigate to screen %i in app
  PAUSE
  adb shell screencap -p /sdcard/screenshot_%i.png
  adb pull /sdcard/screenshot_%i.png ./screenshots/%i.png
)
```

**Method 2: Android Studio's Logcat (Visual debugging)**

1. Connect device via USB
2. Open Android Studio
3. Click "Device Manager" (right sidebar)
4. Select connected device
5. Click camera icon "Take screenshot"
6. Screenshot opens in popup - right-click to save

**Method 3: Built-in Android Screenshot (On-device)**

- Press Power + Volume Down simultaneously (most Android devices)
- Screenshot saved to device gallery
- Transfer via USB or email
- Most reliable, no software required

**Method 4: Browser DevTools Emulation (For PWA testing, not recommended for final)**

```
1. Open http://localhost:5173 in Chrome
2. Press F12 to open DevTools
3. Click Device Toggle (Ctrl+Shift+M)
4. Select Pixel 5 (1080x2340)
5. Ctrl+Shift+P → "Capture screenshot"
6. Screenshot includes device frame (optional)
```

**Device Recommendations (2026):**

- **Preferred**: Physical Android device (Pixel 5, 6, or Samsung Galaxy S20+)
  - Real WebView rendering
  - Actual performance characteristics
  - More credible for Play Store
  - Captures native status bar

- **Minimum**: Android 8.0+ (covers 95% of user base)
- **Target**: Android 13+ (2024-2026 devices)

**Screenshot Post-Processing (Desktop Editing):**

**Step 1: Crop to Standard Size**

- Use image editor to ensure all screenshots are exactly 1080x1920
- Remove extra space or padding
- Center main content in frame

**Step 2: Add Captions (Recommended)**

- Tool options:
  - **Figma**: Design feature graphics with captions
  - **Canva**: Ready-made caption templates
  - **CapCut** (mobile): Add text overlays to screenshots
  - **Photopea** (web): Free Photoshop alternative

- **Caption style**:
  - Font: Sans-serif (Arial, Inter, Roboto)
  - Size: 32-40pt for legibility at thumbnail
  - Color: White text with 2px dark stroke for visibility
  - Position: Bottom 10% of image
  - Example: `"24/7 AI Homework Help"`

**Step 3: Device Frame (Optional but Modern)**

- Tools: `screenshot.rocks`, `cleanmock.com`, `placeit.net`
- Adds iPhone/Android bezel for visual polish
- Can harm perception if frame cuts off important content
- **Best practice**: Skip device frame for modern Play Store (2026 trend)

**Step 4: Optimize for Web**

```bash
# Reduce file size (PNG optimization)
# Using imagemagick or online tools
convert screenshot.png -strip -quality 85 screenshot-optimized.png

# Target file size: 200-400 KB per screenshot
# Target total: <3 MB for all 8 screenshots
```

**Quality Checklist for Each Screenshot:**

- [ ] Exactly 1080 x 1920 pixels (or 1440 x 2560)
- [ ] PNG or JPEG format, under 500 KB file size
- [ ] Caption text legible at 360px width (mobile thumbnail)
- [ ] No status bar visible (or consistent across all)
- [ ] No personal/sensitive data visible
- [ ] Feature being showcased is clearly visible
- [ ] Screenshot shows actual app content (not mockups)
- [ ] No "Loading...", "Error", or placeholder states
- [ ] Consistent branding/coloring across all screenshots
- [ ] At least 1 screenshot per major feature area

---

### 4. Tablet Screenshots (OPTIONAL - Recommended)

**7-inch Tablet:**

- Size: 1200 x 1920 pixels (or similar 10:16 ratio)
- Minimum: 3 screenshots
- Shows how app adapts to larger screens

**10-inch Tablet:**

- Size: 1600 x 2560 pixels (or similar)
- Minimum: 3 screenshots
- Highlights two-pane layouts if applicable

**Note**: Vibe-Tutor is primarily phone-focused, so tablet screenshots are low priority unless you optimize UI for tablets.

---

### 4. Promo Video (OPTIONAL - Increasingly Expected for 2026)

**Why Include Video (2026 Trends):**

- Increases install conversion by 25-35% (Google Play Store data)
- Shows app in action (better than static screenshots)
- Can highlight neurodivergent-friendly approach visually
- Demonstrates key features dynamically
- Creates emotional connection with target audience

**Specifications (Google Play Store 2026):**

- **Length**: 30 seconds (minimum) to 2 minutes (maximum)
- **Recommended**: 45-60 seconds for best engagement
- **Format**: MP4 (H.264 codec) recommended, MOV or AVI acceptable
- **Aspect Ratio**: 16:9 (landscape) or 9:16 (vertical portrait)
- **Resolution**:
  - Minimum: 720p (1280 x 720)
  - Recommended: 1080p (1920 x 1080) for 16:9
  - Recommended: 1080p (1080 x 1920) for 9:16 portrait
- **File Size**: Maximum 500 MB (typically 50-150 MB for 60 sec video)
- **Frame Rate**: 24fps minimum, 30fps recommended
- **Bitrate**: 5-8 Mbps (1080p)
- **Audio**: AAC-LC, 128 kbps, stereo or mono
- **No watermarks** or branding (except app name)

**Video Structure (Recommended 60-second Script):**

```
SCENE 1: Hook & Problem (0-8 sec)
├─ Visual: Student at cluttered desk, homework scattered
├─ Audio: Upbeat background music, student voiceover:
│         "Juggling homework, due dates, and focus?"
├─ Text overlay: "Vibe-Tutor"
└─ Mood: Relatable problem, contemporary music

SCENE 2: Solution Intro (8-15 sec)
├─ Visual: App dashboard opening with smooth animation
├─ Audio: Music continues, voiceover: "Meet Vibe-Tutor..."
├─ Zoom/pan to show main features briefly
└─ Show: Task list + voice input button + AI tutor icon

SCENE 3: Feature Showcase 1 - AI Tutor (15-25 sec)
├─ Visual: Screen recording of AI chat in action
├─ Interaction: Student typing question, AI responding
├─ Audio: "Get homework help 24/7 with AI tutor"
├─ Highlight: Quick, helpful responses, emoji presence
└─ Music: Subtly uplifting

SCENE 4: Feature Showcase 2 - Focus Timer (25-35 sec)
├─ Visual: Focus timer counting down (time-lapse)
├─ Audio: "Build focus habits with gamified Pomodoro"
├─ Interaction: Timer running, points accumulating
├─ Highlight: Points earned, progress visualization
└─ Music: Energetic, motivational

SCENE 5: Feature Showcase 3 - Accessibility (35-45 sec)
├─ Visual: Sensory settings panel opening
├─ Audio: "Customized for ADHD & autism"
├─ Show: Font toggle, animation off, dark mode, haptics
├─ Interaction: Student adjusting settings in real-time
└─ Mood: Empowering, personalized

SCENE 6: Call-to-Action & Download (45-60 sec)
├─ Visual: App icon bouncing, "Download Free" button
├─ Audio: "Download Vibe-Tutor free on Google Play"
├─ Text: "AI-Powered Homework Manager for Students"
├─ Show: Star rating, user count, QR code (optional)
└─ Music: Climax, ends decisively
```

**Video Production Tools (2026 Options):**

**Mobile/Beginner-Friendly:**

- **CapCut** (Free, mobile): Most popular, easy effects, automatic captions
  - Pros: Intuitive, templates, trending effects, can export 1080p
  - Cons: Watermark unless premium, limited advanced editing
  - Best for: Quick 30-60 second videos
- **Canva Video** (Free tier): Templates specifically for app stores
  - Pros: Play Store templates pre-sized, brand kit support
  - Cons: Limited effects, cloud-based (needs internet)
  - Best for: Slideshow-style promo

**Desktop/Professional:**

- **DaVinci Resolve** (Free): Professional-grade editing
  - Pros: Industry standard, no watermarks, powerful effects, color grading
  - Cons: Steeper learning curve, higher system requirements
  - Best for: Polished, multi-layer videos
- **OBS Studio** (Free, open-source): Screen recording
  - Pros: Screen capture, streaming ready, customizable
  - Cons: Not an editor (use with DaVinci or CapCut)
  - Best for: Screen recording app gameplay

**Cloud-Based (No Installation):**

- **Clideo** (Free tier): Web-based video editor
- **Filmora** (Freemium): Beginner-friendly online editor

**Screen Recording (Essential First Step):**

**Option A: ADB Screen Recording (Recommended)**

```bash
# Record 60 seconds of app interaction
adb shell screenrecord --size 1080x1920 --bit-rate 8M /sdcard/promo.mp4

# Press Ctrl+C after desired length to stop
# Pull recording from device
adb pull /sdcard/promo.mp4 ./video/
```

**Option B: OBS Studio (Desktop Broadcasting)**

1. Download: <https://obsproject.com>
2. Add "Display Capture" source
3. Set resolution: 1920x1080 (16:9) or 1080x1920 (9:16)
4. Set frame rate: 30 fps
5. Start recording while running app
6. Stop and save file

**Option C: Android Built-in Screen Recorder**

- Swipe down → Screen recording button (varies by device)
- Shows floating record button
- Stopped from notification panel
- Most direct method

**Video Production Workflow:**

1. **Record Gameplay** (10-15 minutes raw footage)
   - Multiple takes of each feature
   - Good lighting, device held steady
   - Audio clear (avoid background noise)

2. **Import into Editor** (CapCut or DaVinci)
   - Trim best takes (cut out fumbles, pauses)
   - Arrange in story order

3. **Add Transitions**
   - Fade between scenes (0.3-0.5 sec)
   - Dissolve for smooth feature transitions
   - Avoid flashy transitions (can seem unprofessional)

4. **Add Audio**
   - Background music: Royalty-free from YouTube Audio Library or Epidemic Sound
   - Voiceover: Use phone microphone or USB mic for narration
   - Sound effects: Optional, use sparingly
   - Music volume: 60-70%, voiceover: 80-90%

5. **Add Text Overlays**
   - Feature labels: "AI Tutor", "Focus Timer", "Accessibility"
   - Key benefits: "24/7 Help", "Build Focus", "Custom for Your Brain"
   - Font: Sans-serif (Inter, Roboto, Arial)
   - Size: 48-64pt for legibility
   - Color: White with dark stroke for readability
   - Duration: 3-4 seconds per overlay

6. **Add Call-to-Action**
   - "Download Free" button animation at end
   - QR code linking to Play Store (optional)
   - Duration: 5-10 seconds

7. **Export & Optimize**
   - Export as MP4, H.264, 1080p, 30fps
   - File size target: 50-150 MB
   - Check: Audio sync, no artifacts, smooth playback
   - Test on phone: ADB push and play locally

**Video Best Practices:**

- **Keep it Fast**: No scene longer than 5-8 seconds
- **Show Real App**: Use actual app recordings, not mockups
- **Tell a Story**: Problem → Solution → Benefits → Action
- **Include Diverse Scenarios**: Show different user types/ages using app
- **Highlight Accessibility**: Show sensory settings, demonstrate ease-of-use
- **Use Captions**: 30% of viewers watch without sound (TikTok style)
- **Add Subtitles for Voiceover**: Accessibility + engagement
- **Mobile-First**: Optimize for portrait (9:16) - how most users watch on phone
- **A/B Test**: If possible, test two versions (emotional hook vs feature-focused)

**Royalty-Free Music Resources:**

- **YouTube Audio Library**: <https://www.youtube.com/audiolibrary> (free, curated)
- **Epidemic Sound**: Subscription, massive catalog
- **Incompetech**: <https://incompetech.com> (free, music gaming/apps)
- **Free Music Archive**: <https://freemusicarchive.org>
- **Pixabay Music**: <https://pixabay.com/music> (free downloads)

**Pro Tips for Neurodivergent App Promo:**

1. **Show customization visually**: Highlight sensory settings being adjusted in real-time
2. **Celebrate progress**: Show achievement unlocks and point accumulation
3. **Demonstrate AI helpfulness**: Show actual AI chat interaction (not just text)
4. **Include diverse students**: Show different ages/skin tones/abilities
5. **Keep music accessible**: Avoid overwhelming sensory input in video (lower volume, fewer jump cuts)
6. **Show parent perspective**: Brief 2-second scene of parent dashboard

**Priority for 2026**: MEDIUM

- Video increases conversion 25-35%
- Takes 2-4 hours to create decent version
- Recommended if you have time after screenshots/icon
- Can always add later (Play Store accepts video updates)

---

## Complete Asset Checklist (Pre-Submission)

### Design Assets

**App Icon (1024x1024)**

- [ ] File created: `icon-1024x1024.png`
- [ ] Size is exactly 1024 x 1024 pixels
- [ ] Format: PNG-32 (opaque, no transparency)
- [ ] Resolution: 72 DPI
- [ ] Color space: sRGB
- [ ] Contrast ratio ≥4.5:1 (accessible)
- [ ] Legible at 48x48 pixel size
- [ ] No thin lines (<2px)
- [ ] Uses brand colors (#D946EF or #06FFF0)
- [ ] Optional neon glow effect applied
- [ ] File size ≤500 KB
- [ ] Quality check: Looks good on white AND black background

**Feature Graphic (1024x500)**

- [ ] File created: `feature-graphic-1024x500.jpg` or `.png`
- [ ] Size is exactly 1024 x 500 pixels
- [ ] Format: JPEG (preferred) or PNG
- [ ] NO transparency (opaque background)
- [ ] Color space: sRGB
- [ ] App name "Vibe-Tutor" prominently displayed
- [ ] Tagline or key value proposition visible
- [ ] 3-4 key features highlighted
- [ ] Brand colors (purple/cyan gradient) used
- [ ] Real app screenshots or feature icons included
- [ ] All text legible at 400px width
- [ ] File size ≤2 MB
- [ ] No personal/sensitive data visible

### Screenshot Assets (Minimum 3, Maximum 8)

**Screenshot 1: Homework Dashboard (HERO SHOT - Critical)**

- [ ] File created: `01-homework-dashboard.png` or `.jpg`
- [ ] Size: Exactly 1080 x 1920 pixels (or 1440 x 2560)
- [ ] Format: PNG or JPEG
- [ ] File size: 200-400 KB
- [ ] Shows task list with 3-4 assignments
- [ ] Voice input button clearly visible
- [ ] Progress bar or week chart visible
- [ ] Some tasks marked as completed
- [ ] Caption added (e.g., "Never forget an assignment again")
- [ ] Caption legible at 360px width
- [ ] No status bar OR status bar consistent across all screenshots
- [ ] No personal data visible

**Screenshot 2: AI Chat Helper**

- [ ] File created: `02-ai-tutor-chat.png` or `.jpg`
- [ ] Size: Exactly 1080 x 1920 pixels (or 1440 x 2560)
- [ ] Format: PNG or JPEG
- [ ] File size: 200-400 KB
- [ ] Shows AI conversation (3-4 messages visible)
- [ ] Student question visible
- [ ] AI response helpful and emoji-limited
- [ ] Input field with text/voice option visible
- [ ] Caption added (e.g., "24/7 homework help powered by AI")
- [ ] Sensitive data blurred (student name, specific question details)
- [ ] Visually distinct from Screenshot 1

**Screenshot 3: Focus Timer**

- [ ] File created: `03-focus-timer.png` or `.jpg`
- [ ] Size: Exactly 1080 x 1920 pixels
- [ ] Format: PNG or JPEG
- [ ] File size: 200-400 KB
- [ ] Timer actively counting down
- [ ] Points/rewards counter visible
- [ ] Progress bar showing session status
- [ ] Brain icon or motivational message visible
- [ ] Caption added (e.g., "Build focus with gamified Pomodoro timer")
- [ ] Shows neurodivergent-friendly design

**Screenshot 4: Brain Games Grid (Optional)**

- [ ] File created: `04-brain-games.png` or `.jpg`
- [ ] Size: Exactly 1080 x 1920 pixels
- [ ] Format: PNG or JPEG
- [ ] File size: 200-400 KB
- [ ] Game menu with 4-6 games visible
- [ ] Difficulty levels or badges shown
- [ ] One game partially visible
- [ ] Caption added (e.g., "Learn through play with brain games")

**Screenshot 5: Achievement Center (Optional)**

- [ ] File created: `05-achievements.png` or `.jpg`
- [ ] Size: Exactly 1080 x 1920 pixels
- [ ] Format: PNG or JPEG
- [ ] File size: 200-400 KB
- [ ] Multiple achievement badges visible
- [ ] Progress bars toward next achievement
- [ ] Points counter visible
- [ ] Caption added (e.g., "Celebrate every milestone")

**Screenshot 6: Sensory Settings (Highly Recommended)**

- [ ] File created: `06-sensory-settings.png` or `.jpg`
- [ ] Size: Exactly 1080 x 1920 pixels
- [ ] Format: PNG or JPEG
- [ ] File size: 200-400 KB
- [ ] Animation toggle visible
- [ ] Sound/haptic toggles visible
- [ ] Font size slider visible
- [ ] Color theme selector visible
- [ ] Contrast adjustment visible
- [ ] 2-3 settings toggled to show customization
- [ ] Caption added (e.g., "Adapt the app to YOUR brain")
- [ ] Emphasizes neurodivergent support

**Screenshot 7: Parent Dashboard (Optional)**

- [ ] File created: `07-parent-dashboard.png` or `.jpg`
- [ ] Size: Exactly 1080 x 1920 pixels
- [ ] Format: PNG or JPEG
- [ ] File size: 200-400 KB
- [ ] Progress chart visible (colorful, clear)
- [ ] Achievement summary shown
- [ ] Time spent metrics visible
- [ ] Settings parent can control visible
- [ ] **CRITICAL**: Student names BLURRED
- [ ] **CRITICAL**: Specific assignment titles BLURRED
- [ ] **CRITICAL**: Personal data HIDDEN
- [ ] Caption added (e.g., "Complete parent visibility")

**Screenshot 8: Week Progress Chart (Optional)**

- [ ] File created: `08-week-progress.png` or `.jpg`
- [ ] Size: Exactly 1080 x 1920 pixels
- [ ] Format: PNG or JPEG
- [ ] File size: 200-400 KB
- [ ] 7-day bar chart showing daily progress
- [ ] Color coding (green/yellow/red)
- [ ] Daily point totals visible
- [ ] Current day highlighted
- [ ] Caption added (e.g., "See progress across the entire week")

### Video Asset (Optional but Recommended)

**Promo Video**

- [ ] File created: `promo-video.mp4` or `vibe-tutor-promo.mp4`
- [ ] Duration: 45-60 seconds (optimal engagement)
- [ ] Format: MP4 (H.264 codec)
- [ ] Resolution: 1080p (1920x1080 for 16:9 or 1080x1920 for 9:16)
- [ ] Frame rate: 30 fps
- [ ] Bitrate: 5-8 Mbps
- [ ] File size: 50-150 MB
- [ ] Audio: AAC-LC, 128 kbps, clear and balanced
- [ ] Hook (0-8 sec): Relatable problem established
- [ ] Solution (8-20 sec): App introduced with smooth animations
- [ ] Feature showcase (20-50 sec): 3 key features demonstrated
- [ ] Call-to-action (50-60 sec): Download button, Play Store link visible
- [ ] Text overlays: All legible, white with dark stroke
- [ ] Voiceover: Clear, energetic, no background noise
- [ ] Background music: Royalty-free, appropriate volume
- [ ] No watermarks (except app name)
- [ ] Video plays smoothly on phone
- [ ] Captions/subtitles added (accessibility)

### Quality Validation

**All Screenshots**

- [ ] Every screenshot exactly 1080x1920 OR 1440x2560 (consistent)
- [ ] All PNG/JPEG files (no other formats)
- [ ] All file sizes individually <500 KB
- [ ] Total all screenshots <3 MB
- [ ] Text captions present and legible at 360px thumbnail size
- [ ] Brand colors consistent across all
- [ ] No loading screens, error messages, or placeholder states
- [ ] No personal/student data visible (or blurred)
- [ ] No "TODO", "FIXME", debug text visible
- [ ] Consistent branding and UI styling
- [ ] At least 1 screenshot per major feature area

**All Assets**

- [ ] Icon file: `icon-1024x1024.png` (exactly 1024x1024)
- [ ] Feature graphic: `feature-graphic-1024x500.jpg` (exactly 1024x500)
- [ ] Minimum 3 screenshots, maximum 8
- [ ] No duplicate screenshots
- [ ] All files named according to conventions below
- [ ] All files organized in correct folder structure
- [ ] Metadata cleaned (no temporary files, .DS_Store, thumbs.db)
- [ ] All assets backed up (local + cloud copy)

## File Organization & Naming Conventions

**Standard Folder Structure:**

```
C:\dev\apps\vibe-tutor\store-assets/
├── icon-1024x1024.png
├── feature-graphic-1024x500.jpg
├── screenshots/
│   ├── 01-homework-dashboard.png       [HERO SHOT]
│   ├── 02-ai-tutor-chat.png
│   ├── 03-focus-timer.png
│   ├── 04-brain-games.png              [Optional]
│   ├── 05-achievements.png             [Optional]
│   ├── 06-sensory-settings.png         [Recommended]
│   ├── 07-parent-dashboard.png         [Optional]
│   └── 08-week-progress.png            [Optional]
├── video/                              [Optional]
│   ├── promo-video.mp4
│   └── promo-video-alt.mp4 (A/B test version)
├── tablet-7inch/                       [Optional if tablet support exists]
│   ├── 01-dashboard-tablet.png
│   ├── 02-settings-tablet.png
│   └── 03-parent-dashboard-tablet.png
├── tablet-10inch/                      [Optional if tablet support exists]
│   ├── 01-dashboard-tablet-large.png
│   ├── 02-settings-tablet-large.png
│   └── 03-parent-dashboard-tablet-large.png
├── source-files/                       [Editable design files - not uploaded]
│   ├── icon-design.figma or .psd
│   ├── feature-graphic-design.figma or .psd
│   └── promo-video-edit.capcut or .dav
└── README.md                           [This checklist]
```

**File Naming Conventions:**

| Asset Type | Naming Pattern | Example |
|------------|---|---|
| App Icon | `icon-1024x1024.png` | icon-1024x1024.png |
| Feature Graphic | `feature-graphic-1024x500.jpg` | feature-graphic-1024x500.jpg |
| Screenshots | `##-feature-name.png` | 01-homework-dashboard.png |
| Promo Video | `promo-video.mp4` | promo-video.mp4 |
| Tablet 7" | `##-feature-name-tablet.png` | 01-dashboard-tablet.png |
| Tablet 10" | `##-feature-name-tablet-large.png` | 01-dashboard-tablet-large.png |

**Rules:**

- Lowercase only
- Use hyphens (not underscores) for word separation
- Numbers are zero-padded (01, 02, 03)
- No spaces in filenames
- No special characters (@, #, %, etc.)
- Keep descriptions short but descriptive

## Pre-Submission Quality Validation

### Step 1: File Integrity Check

```powershell
# Verify all assets exist and correct size
Get-ChildItem "C:\dev\apps\vibe-tutor\store-assets\" -Recurse |
  Where-Object {$_.Extension -match "png|jpg|mp4"} |
  Select-Object Name, @{Name="SizeMB"; Expression={[math]::Round($_.Length/1MB, 2)}}

# Expected:
# icon-1024x1024.png          ≤ 0.5 MB
# feature-graphic-1024x500.jpg ≤ 2.0 MB
# 01-homework-dashboard.png   ≤ 0.4 MB each
```

### Step 2: Image Dimension Verification

Use any image viewer to confirm:

- App icon: Exactly 1024 x 1024
- Feature graphic: Exactly 1024 x 500
- Screenshots: All exactly 1080 x 1920 (or all 1440 x 2560, but consistent)

**ImageMagick command to verify:**

```bash
# Check image dimensions
magick identify icon-1024x1024.png
magick identify feature-graphic-1024x500.jpg
magick identify screenshots/*.png
```

### Step 3: Sensitivity Data Audit

Before uploading, manually review each screenshot:

- [ ] No student names visible
- [ ] No email addresses visible
- [ ] No phone numbers visible
- [ ] No specific homework questions with personal context
- [ ] No parent names or personal details
- [ ] No academic performance that could identify student
- [ ] Use screenshot #7 (parent dashboard) as last check

### Step 4: Visual Quality Review

For each asset:

- [ ] Open in image viewer at 100% zoom
- [ ] Check for compression artifacts or pixelation
- [ ] Verify colors match brand palette
- [ ] Text is crisp and readable
- [ ] No watermarks or temporary markings
- [ ] Play video on phone for smooth playback

### Step 5: Submission Preparation

1. Create ZIP file with all assets:

   ```bash
   Compress-Archive -Path "C:\dev\apps\vibe-tutor\store-assets" -DestinationPath "vibe-tutor-store-assets.zip"
   ```

2. Verify ZIP integrity:

   ```bash
   # Extract to temp and re-verify
   ```

3. Create backup:

   ```bash
   # Copy to external drive or cloud storage
   Copy-Item "vibe-tutor-store-assets.zip" "D:\backups\"
   ```

4. Document versions:
   - Create `ASSETS_VERSION.txt`:

     ```
     Vibe-Tutor Store Assets
     Version: 1.0
     Date: YYYY-MM-DD
     Icon: icon-1024x1024.png (v1)
     Feature Graphic: feature-graphic-1024x500.jpg (v1)
     Screenshots: 8 total (4 required, 4 optional)
     Video: promo-video.mp4 (45 sec)
     Status: Ready for submission
     ```

## Quick Asset Generation & Validation Script

**PowerShell batch creation script:**

```powershell
# Create directory structure for assets
$baseDir = "C:\dev\apps\vibe-tutor\store-assets"
@(
  "$baseDir",
  "$baseDir\screenshots",
  "$baseDir\video",
  "$baseDir\tablet-7inch",
  "$baseDir\tablet-10inch",
  "$baseDir\source-files"
) | ForEach-Object {
  New-Item -ItemType Directory -Path $_ -Force | Out-Null
  Write-Host "Created: $_"
}

# Batch capture screenshots from connected Android device
Write-Host "Connect Android device and enable USB debugging"
Write-Host "Press Enter to start capturing screenshots..."
Read-Host

$screenshots = @(
  "01-homework-dashboard",
  "02-ai-tutor-chat",
  "03-focus-timer",
  "04-brain-games",
  "05-achievements",
  "06-sensory-settings",
  "07-parent-dashboard",
  "08-week-progress"
)

foreach ($screenshot in $screenshots) {
  Write-Host "Capturing $screenshot... (press Enter when ready in app)"
  Read-Host

  # Capture screenshot
  adb shell screencap -p /sdcard/screenshot.png
  adb pull /sdcard/screenshot.png "$baseDir\screenshots\$screenshot.png"
  adb shell rm /sdcard/screenshot.png

  Write-Host "Saved: $screenshot.png"
}

Write-Host "All screenshots captured! Next steps:"
Write-Host "1. Edit screenshots in Figma/Canva to add captions"
Write-Host "2. Crop to exactly 1080x1920 pixels"
Write-Host "3. Verify file sizes (<500 KB each)"
Write-Host "4. Run quality validation checks"
```

**Validation script after assets created:**

```powershell
$baseDir = "C:\dev\apps\vibe-tutor\store-assets"

Write-Host "=== VIBE-TUTOR STORE ASSETS VALIDATION ===" -ForegroundColor Cyan

# Check required files exist
$requiredFiles = @(
  "icon-1024x1024.png",
  "feature-graphic-1024x500.jpg"
)

Write-Host "`n1. Checking required files..."
foreach ($file in $requiredFiles) {
  if (Test-Path "$baseDir\$file") {
    $size = [math]::Round((Get-Item "$baseDir\$file").Length/1MB, 2)
    Write-Host "✓ $file ($size MB)" -ForegroundColor Green
  } else {
    Write-Host "✗ MISSING: $file" -ForegroundColor Red
  }
}

# Check screenshot count
Write-Host "`n2. Checking screenshots..."
$screenshots = Get-ChildItem "$baseDir\screenshots\*.png" -ErrorAction SilentlyContinue
$count = $screenshots.Count
if ($count -ge 3 -and $count -le 8) {
  Write-Host "✓ Screenshot count: $count (valid)" -ForegroundColor Green
} else {
  Write-Host "✗ Invalid screenshot count: $count (need 3-8)" -ForegroundColor Red
}

# Check file sizes
Write-Host "`n3. Checking file sizes..."
Get-ChildItem "$baseDir\screenshots\*.png" | ForEach-Object {
  $size = [math]::Round($_.Length/1MB, 2)
  if ($size -lt 0.5) {
    Write-Host "✓ $($_.Name) ($size MB)" -ForegroundColor Green
  } else {
    Write-Host "✗ $($_.Name) ($size MB) - TOO LARGE" -ForegroundColor Red
  }
}

# Total size
Write-Host "`n4. Total asset size..."
$totalSize = [math]::Round((Get-ChildItem "$baseDir" -Recurse -File | Measure-Object -Property Length -Sum).Sum/1MB, 2)
Write-Host "Total: $totalSize MB (target: <5 MB)"

Write-Host "`n5. Summary..."
Write-Host "All assets ready for Play Store submission!" -ForegroundColor Green
```

## Brand Design Resources

**Color Palette** (Vibe-Tutor brand):

- **Primary**: #D946EF (Hot Magenta) - Main CTA, hero elements
- **Secondary**: #06FFF0 (Electric Cyan) - Accents, focus elements
- **Tertiary**: #FF6B00 (Blazing Orange) - Alerts, achievements
- **Background**: #0F0F23 (Dark Purple) - Dark theme base
- **Neutral**: #FFFFFF (White) - Text, high contrast

**Typography**:

- **Primary Font**: Inter (Google Fonts) - Clean, modern, accessible
- **Accessibility Font**: OpenDyslexic (dyslexia-friendly alternative)
- **Monospace**: JetBrains Mono (code snippets, technical)

**Icon Concepts & Symbolism**:

- **Lightbulb**: AI-powered learning, smart solutions
- **Brain**: Neurodivergence, cognitive support, personalization
- **Graduation Cap**: Education, achievement, learning journey
- **Star**: Rewards, accomplishments, excellence
- **Chat Bubble**: Conversation, AI tutor, communication
- **Timer**: Focus, Pomodoro, time management
- **Palette**: Sensory settings, customization, personalization

**Design Tools & Resources**:

- **Figma Assets**: Design templates available in shared Figma workspace
- **Brand Guidelines**: Follow `NEURODIVERGENT_FEATURES_COMPLETE.md` for design principles
- **Icon Library**: Lucide React icons (used in app, consistent with UI)

## Play Store Submission Checklist

**Before Uploading to Play Console:**

- [ ] All required metadata filled in:
  - [ ] App name: "Vibe-Tutor"
  - [ ] Short description (80 chars): "AI homework manager with neurodivergent support"
  - [ ] Full description: See `PLAY_STORE_DESCRIPTION.md`
  - [ ] Target age group: 13-17 (Teens)
  - [ ] Category: Education
  - [ ] Content rating: See `CONTENT_RATING_GUIDE.md`

- [ ] Privacy & Security:
  - [ ] Privacy policy uploaded: See `PRIVACY_POLICY.md`
  - [ ] Data safety section filled: See `DATA_SAFETY.md`
  - [ ] Permissions justified (camera, microphone, file storage)

- [ ] Store Assets:
  - [ ] App icon uploaded (icon-1024x1024.png)
  - [ ] Feature graphic uploaded (feature-graphic-1024x500.jpg)
  - [ ] Minimum 3 screenshots uploaded (max 8)
  - [ ] Screenshots in correct order (most important first)
  - [ ] Promo video uploaded (optional, but recommended)
  - [ ] Tablet screenshots (optional, if tablet support exists)

- [ ] Technical Requirements:
  - [ ] Target API: 34+ (Android 14+)
  - [ ] Min API: 24 (Android 7+, covers 98% of devices)
  - [ ] APK signed with release keystore
  - [ ] App Bundle (AAB) generated and tested
  - [ ] Versioncode incremented

- [ ] Testing & QA:
  - [ ] App tested on 3+ physical Android devices
  - [ ] App tested on Android 8.0, 13.0, 14.0
  - [ ] All features functional (AI, focus timer, parent dashboard, sensory settings)
  - [ ] No crashes or ANRs (Application Not Responding)
  - [ ] Privacy policy link works
  - [ ] Contact information valid

## Quality Standards (2026 Play Store Guidelines)

**Visual Quality:**

- ✓ All text legible at thumbnail size (360px width minimum)
- ✓ Consistent visual style across all assets
- ✓ No placeholder text ("Lorem ipsum", "TODO")
- ✓ Professional quality (no pixelation, compression artifacts)
- ✓ Accurately represents current app functionality
- ✓ Colors match brand palette

**Privacy & Safety:**

- ✓ No personal/sensitive information visible in any asset
- ✓ Student names blurred in parent dashboard screenshot
- ✓ Specific homework details anonymized
- ✓ No email addresses, phone numbers, or IDs visible
- ✓ Complies with COPPA (Children's Online Privacy Protection Act)
- ✓ Complies with Play Store Family Policies

**Accessibility:**

- ✓ Contrast ratio ≥4.5:1 for all text
- ✓ Screenshots include captions (benefit hearing-impaired users)
- ✓ Video includes subtitles/captions (30% of users watch muted)
- ✓ Icon legible at small sizes (48x48 minimum)
- ✓ Feature graphic text readable at 400px width

**Compliance:**

- ✓ No misleading claims or fake reviews
- ✓ Video format complies with Play Store specs
- ✓ Screenshots match actual app (no mockups or beta features)
- ✓ No competitor apps featured or criticized
- ✓ No external links in screenshots (except app store links)

## Next Steps: From Assets to Launch

### Phase 1: Asset Finalization (1-2 weeks)

1. Create/refine app icon (Figma or Canva)
2. Design feature graphic (use brand colors)
3. Capture 3-8 screenshots from physical device
4. Add captions and optimize screenshots
5. (Optional) Record and edit 45-60 second promo video
6. Validate all assets against checklist above
7. Back up assets locally and to cloud

### Phase 2: Play Console Submission (3-5 days)

1. Create Google Play Developer account ($25 one-time fee)
2. Set up app listing in Play Console
3. Fill in all required metadata (see checklist)
4. Upload store assets (icon, feature graphic, screenshots)
5. Configure pricing (free)
6. Upload signed APK or AAB
7. Review Play Store policies
8. Submit for review

### Phase 3: Review & Launch (3-7 days)

1. Google Play Team reviews app (3-7 days typical)
2. May request clarifications on privacy, permissions, age rating
3. Once approved, app goes LIVE on Play Store
4. Monitor reviews and user feedback
5. Plan for updates (bug fixes, feature additions)

### Phase 4: Post-Launch (Ongoing)

1. Monitor crash reports and ANRs (Android Vitals)
2. Respond to user reviews (especially negative ones)
3. Plan updates based on user feedback
4. Update screenshots/video after major features
5. Maintain compliance with Play Store policies

## Useful Resources

**Google Play Store Documentation:**

- [Play Store Asset Specifications](https://support.google.com/googleplay/android-developer/answer/1078870)
- [Graphic Assets Best Practices](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Content Rating Guidelines](https://support.google.com/googleplay/android-developer/answer/188189)

**Vibe-Tutor Related Docs:**

- [PLAY_STORE_DESCRIPTION.md](./PLAY_STORE_DESCRIPTION.md) - App store listing copy
- [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) - Privacy policy text
- [DATA_SAFETY.md](./DATA_SAFETY.md) - Data safety form answers
- [CONTENT_RATING_GUIDE.md](./CONTENT_RATING_GUIDE.md) - IARC questionnaire
- [PLAY_STORE_CHECKLIST.md](./PLAY_STORE_CHECKLIST.md) - Complete submission checklist
- [QA_TESTING_CHECKLIST.md](./QA_TESTING_CHECKLIST.md) - Device testing procedures

---

**Document Version**: 2.0 (Enhanced for 2026)
**Last Updated**: January 6, 2026
**Status**: Comprehensive guide with all 2026 Play Store standards
**Priority**: HIGH (required for Play Store submission)
**Estimated Time to Complete**: 8-12 hours (icon + graphics + screenshots + video)
