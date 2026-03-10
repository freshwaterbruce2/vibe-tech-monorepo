# ModelSelector Color Palette - Nova Agent Theme

## 🎨 Exact Color Values

### Primary Theme Colors (from theme-variables.css)

```css
--c-cyan: #00FFFF      /* Primary - FREE tier, selected states */
--c-purple: #B933FF    /* Secondary - LOW COST tier, recommended */
--c-pink: #FF00AA      /* Accent - MEDIUM tier */
--c-teal: #00FFCC      /* Alternative cyan */
```

### Additional Tier Colors

```css
Orange: #FFA500        /* HIGH COST tier */
```

## 🏷️ Tier Badge Styles

### FREE Tier (Cyan)

```tsx
className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
```

- Background: `rgba(6, 182, 212, 0.1)` (10% opacity)
- Text: `#22d3ee` (cyan-400)
- Border: `rgba(6, 182, 212, 0.3)` (30% opacity)

### LOW COST Tier (Purple)

```tsx
className="bg-purple-500/10 text-purple-400 border border-purple-500/30"
```

- Background: `rgba(168, 85, 247, 0.1)`
- Text: `#c084fc` (purple-400)
- Border: `rgba(168, 85, 247, 0.3)`

### MEDIUM Tier (Pink)

```tsx
className="bg-pink-500/10 text-pink-400 border border-pink-500/30"
```

- Background: `rgba(236, 72, 153, 0.1)`
- Text: `#f472b6` (pink-400)
- Border: `rgba(236, 72, 153, 0.3)`

### HIGH COST Tier (Orange)

```tsx
className="bg-orange-500/10 text-orange-400 border border-orange-500/30"
```

- Background: `rgba(249, 115, 22, 0.1)`
- Text: `#fb923c` (orange-400)
- Border: `rgba(249, 115, 22, 0.3)`

## 🔘 Button States

### Filter Buttons - FREE (Active)

```tsx
className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,255,255,0.2)]"
```

- Background: 20% cyan
- Text: `#67e8f9` (cyan-300)
- Border: 40% cyan
- Glow: `rgba(0, 255, 255, 0.2)`

### Filter Buttons - FREE (Inactive)

```tsx
className="bg-cyan-500/5 text-cyan-400/70 border border-cyan-500/10 hover:bg-cyan-500/10 hover:text-cyan-400"
```

- Background: 5% cyan → 10% on hover
- Text: 70% opacity cyan-400 → 100% on hover

### Sort Buttons (Active)

```tsx
className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
```

### Sort Buttons (Inactive)

```tsx
className="bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
```

## 🃏 Model Card States

### Default Card

```tsx
className="border-white/10 bg-black/40 backdrop-blur-sm"
```

- Border: `rgba(255, 255, 255, 0.1)`
- Background: `rgba(0, 0, 0, 0.4)` with blur

### Hover Card

```tsx
className="hover:border-cyan-500/30 hover:bg-white/5"
```

- Border: 30% cyan
- Background: 5% white overlay

### Selected Card

```tsx
className="border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(0,255,255,0.15)]"
```

- Border: 50% cyan
- Background: 10% cyan
- Glow: `rgba(0, 255, 255, 0.15)` with 20px blur

### Recommended Card

```tsx
className="ring-1 ring-purple-500/30 shadow-[0_0_15px_rgba(185,51,255,0.1)]"
```

- Ring: 30% purple
- Glow: `rgba(185, 51, 255, 0.1)` with 15px blur

## 📝 Text Colors

| Element | Color | Hex |
|---------|-------|-----|
| **Header (Gradient)** | `from-cyan-400 to-purple-400` | `#22d3ee → #c084fc` |
| **Model Name** | `text-white` | `#ffffff` |
| **Provider** | `text-gray-500` | `#6b7280` |
| **Description** | `text-gray-400` | `#9ca3af` |
| **Cost** | `text-cyan-400` | `#22d3ee` |
| **"per session"** | `text-gray-500` | `#6b7280` |

## 🎯 Icon Colors

| Icon | Color | Hex | Opacity |
|------|-------|-----|---------|
| **DollarSign** | `text-cyan-400/70` | `#22d3ee` | 70% |
| **Brain** | `text-purple-400/70` | `#c084fc` | 70% |
| **Zap (fast)** | `text-cyan-400` | `#22d3ee` | 100% |
| **Zap (medium)** | `text-purple-400` | `#c084fc` | 100% |
| **Zap (slow)** | `text-pink-400` | `#f472b6` | 100% |
| **Clock** | `text-pink-400/70` | `#f472b6` | 70% |
| **Check** | `text-cyan-400` | `#22d3ee` | 100% |
| **Sparkles** | Inherits | - | - |

## 💡 Info Box

```tsx
className="bg-cyan-500/5 p-3 rounded-lg text-sm border border-cyan-500/20 backdrop-blur-sm"
```

- Background: 5% cyan with blur
- Border: 20% cyan
- Title: `text-cyan-300` (#67e8f9)
- Text: `text-gray-400` (#9ca3af)

## 🌈 Opacity Scale Reference

| Opacity | Tailwind | Decimal | Use Case |
|---------|----------|---------|----------|
| 5% | `/5` | 0.05 | Subtle backgrounds |
| 10% | `/10` | 0.1 | Light backgrounds, badges |
| 20% | `/20` | 0.2 | Active states, glows |
| 30% | `/30` | 0.3 | Borders, rings |
| 40% | `/40` | 0.4 | Card backgrounds |
| 50% | `/50` | 0.5 | Selected borders |
| 70% | `/70` | 0.7 | Muted icons |

## 🎨 Shadow/Glow Reference

```css
/* Selected card glow */
shadow-[0_0_20px_rgba(0,255,255,0.15)]

/* Recommended card glow */
shadow-[0_0_15px_rgba(185,51,255,0.1)]

/* Active button glow - Cyan */
shadow-[0_0_10px_rgba(0,255,255,0.2)]

/* Active button glow - Purple */
shadow-[0_0_10px_rgba(185,51,255,0.2)]

/* Active button glow - Pink */
shadow-[0_0_10px_rgba(255,0,170,0.2)]

/* Active button glow - Orange */
shadow-[0_0_10px_rgba(255,165,0,0.2)]
```

---

**Reference:** `apps/nova-agent/src/styles/theme/theme-variables.css`  
**Component:** `apps/nova-agent/src/components/ModelSelector.tsx`  
**Updated:** January 12, 2026

