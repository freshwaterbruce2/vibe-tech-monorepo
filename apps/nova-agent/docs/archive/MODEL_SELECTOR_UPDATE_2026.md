# Model Selector Update - January 12, 2026

## ✅ What Changed

Updated the ModelSelector component with the latest OpenRouter models organized into **4 cost tiers**.

## 🎯 New Features

### 1. **4-Tier Cost Organization**

- **FREE** - $0 per 1M tokens (4 models)
- **LOW COST** - Under $1 per 1M tokens (4 models)
- **MEDIUM COST** - $1-$5 per 1M tokens (4 models)
- **HIGH COST** - Over $5 per 1M tokens (4 models)

### 2. **Tier Filtering**

- Click tier badges to filter models by cost
- Shows model count for each tier
- Color-coded for easy identification:
  - 🟢 FREE (Green)
  - 🔵 LOW COST (Blue)
  - 🟡 MEDIUM (Yellow)
  - 🔴 HIGH COST (Red)

### 3. **Enhanced Sorting**

- Sort by Tier (default)
- Sort by Cost
- Sort by Quality
- Sort by Speed

### 4. **Updated Models (Jan 2026)**

#### FREE Tier ($0)

1. **MiMo V2 Flash** ⭐ - Best free model
2. **Devstral 2512** - Free code specialist (256K context)
3. **Llama 3.3 70B** - Free open-source powerhouse
4. **Gemini 2.0 Flash** - Free with 1M context

#### Low Cost Tier (<$1)

1. **DeepSeek V3** ⭐ - GPT-4 quality at 1/10th cost
2. **Gemini 2.5 Flash** - Cheap with 1M context
3. **GPT-5 Mini** - Fast & affordable GPT-5
4. **Claude Haiku 3.5** - Fastest Claude

#### Medium Cost Tier ($1-$5)

1. **GPT-5** ⭐ - Latest GPT flagship
2. **Gemini 2.5 Pro** - Huge 2M context
3. **Claude Sonnet 4.5** - Best for coding
4. **Grok Code Fast 1** - Code specialist

#### High Cost Tier (>$5)

1. **GPT-5.2 Pro** ⭐ - Maximum intelligence
2. **Claude Opus 4.5** - Highest quality
3. **GPT-5.1 Codex Max** - 512K context for code
4. **Gemini 3 Pro Preview** - Experimental cutting edge

## 💡 UI Improvements

### Tier Badges

Each model card now shows its tier with color-coded badges:

- Makes it easy to see cost at a glance
- Consistent color scheme across the UI

### Better Cost Display

- Shows "FREE" for $0 models
- Shows estimated cost per session
- Pricing breakdown: Input/Output costs per 1M tokens

### Improved Layout

- Larger scrollable area (500px max height)
- Better spacing and readability
- Responsive tier filter buttons
- Wrapped badges for mobile

## 📊 Pricing Reference

**Estimated Cost (1M input + 100K output tokens):**

- FREE: $0
- Low: $0.25-$1
- Medium: $1-$5
- High: $5-$30

## 🚀 Usage

The ModelSelector is used in the Settings page:

```tsx
<ModelSelector selectedModel={currentModel} onSelectModel={handleModelChange} />
```

## 🔄 Migration Notes

- All existing model IDs are still supported
- New models added with latest pricing
- Tier property added to all models
- Backward compatible with existing code

## 📝 Model Data Source

Models and pricing verified from:

- OpenRouter API (<https://openrouter.ai/models>)
- Codebase documentation (OPENROUTER_MODEL_GUIDE_2026.md)
- Latest pricing as of January 12, 2026

## ✨ Recommended Models

**For Development (Free):**

- MiMo V2 Flash - Best overall free model
- Devstral 2512 - Best for code (free)

**For Production (Paid):**

- DeepSeek V3 - Best value (low cost)
- GPT-5 - Best general purpose (medium cost)
- Claude Sonnet 4.5 - Best for coding (medium cost)
- GPT-5.2 Pro - Maximum quality (high cost)

## 🎨 Visual Design - Dark Futuristic Theme

**Matches Nova Agent's neon aesthetic:**

- **Dark glassmorphism cards** - `bg-black/40` with `backdrop-blur-sm`
- **Neon accent colors** - Cyan, purple, pink, orange
- **Glowing effects** - `shadow-[0_0_20px_rgba(0,255,255,0.15)]` on selected items
- **Gradient text** - Cyan-to-purple gradient on header
- **Tier badges** - Semi-transparent with neon borders
  - 🔵 FREE - Cyan (`bg-cyan-500/10 text-cyan-400`)
  - 🟣 LOW COST - Purple (`bg-purple-500/10 text-purple-400`)
  - 🩷 MEDIUM - Pink (`bg-pink-500/10 text-pink-400`)
  - 🟠 HIGH COST - Orange (`bg-orange-500/10 text-orange-400`)
- **Interactive states:**
  - Selected: Cyan glow + cyan border
  - Hover: Subtle white overlay
  - Recommended: Purple ring + purple glow
- **Quality stars** - ⭐⭐⭐⭐⭐ (1-5 stars)
- **Speed colors** - Cyan (fast), Purple (medium), Pink (slow)

---

**Updated:** January 12, 2026  
**Component:** `apps/nova-agent/src/components/ModelSelector.tsx`  
**Total Models:** 16 (4 per tier)
