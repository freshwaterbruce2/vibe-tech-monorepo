# Tab State Persistence Fix

## Problem

When switching between navigation tabs (Dashboard → Settings → Dashboard → Settings), the Settings page would reset to the default "AI & Models" tab instead of remembering which tab you were on.

## Root Cause

The Settings component was using `<Tabs defaultValue="ai">` which means:

- `defaultValue` only sets the initial value when component mounts
- Every time you navigate away and back, the component unmounts and remounts
- On remount, it resets to the default value ("ai")
- User's tab selection is lost

## Solution

Changed from **uncontrolled** to **controlled** tabs with localStorage persistence:

### Before (Uncontrolled)

```tsx
const Settings = () => {
  // No tab state

  return (
    <Tabs defaultValue="ai" className="w-full">
      {/* Tabs reset to "ai" on every mount */}
    </Tabs>
  );
};
```

### After (Controlled + Persisted)

```tsx
const Settings = () => {
  // Controlled state with localStorage
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("settings-active-tab") || "ai";
  });

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem("settings-active-tab", activeTab);
  }, [activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      {/* Tabs remember your selection */}
    </Tabs>
  );
};
```

## Benefits

1. **Persistence Across Navigation**: Tab selection survives page navigation
2. **Persistence Across Sessions**: Tab selection survives app restarts (localStorage)
3. **Better UX**: Users don't lose their place when switching tabs
4. **Standard Pattern**: Follows React best practices for controlled components

## Files Changed

- `apps/nova-agent/src/pages/Settings.tsx`
  - Added `activeTab` state with localStorage initialization
  - Added `useEffect` to persist tab changes
  - Changed `<Tabs defaultValue="ai">` to `<Tabs value={activeTab} onValueChange={setActiveTab}>`

## Testing

1. ✅ Navigate to Settings → API Keys tab
2. ✅ Navigate to Dashboard
3. ✅ Navigate back to Settings
4. ✅ Should still be on API Keys tab (not reset to AI & Models)
5. ✅ Refresh the page
6. ✅ Should still be on API Keys tab (persisted in localStorage)

## Related Improvements

### Enhanced Directory Exclusions

Also improved the Personal Copilot indexer to skip 70+ common directories:

**Before**: 5 exclusions (node_modules, target, dist, .git, build)

**After**: 70+ exclusions including:

- Package managers: node_modules, bower_components, vendor
- Build outputs: dist, build, out, .next, .nuxt, target
- Caches: .cache, .parcel-cache, .turbo, coverage
- Version control: .git, .svn, .hg
- IDEs: .vscode, .idea, .vs
- Python: **pycache**, .venv, venv, site-packages
- And many more...

This prevents indexing unnecessary files and speeds up the indexing process significantly.

## ModelSelector Integration

### Added New Component

Integrated the `ModelSelector` component into the Settings page:

**Features**:

- 🎯 Visual model cards with pricing, quality, speed, and context window
- 💰 Real-time cost estimates (per 1M input + 100K output tokens)
- 🔄 Sortable by cost, quality, or speed
- ⭐ Quality ratings (1-5 stars)
- ⚡ Speed indicators (fast/medium/slow with color coding)
- 🏆 Recommended models highlighted
- 📊 Comparison view for all 2026 models

**Models Included**:

1. DeepSeek V3.2 - $0.28/$0.42 (Best value) ⭐⭐⭐⭐
2. Claude Sonnet 4 - $3.00/$15.00 (Best quality) ⭐⭐⭐⭐⭐
3. Gemini 2.5 Flash - $0.15/$3.50 (Best context - 2M) ⭐⭐⭐⭐
4. GPT-4o - $2.50/$10.00 (Balanced) ⭐⭐⭐⭐
5. Llama 3.3 70B - $0.59/$0.79 (Open source) ⭐⭐⭐⭐
6. Qwen 2.5 Coder - $0.30/$0.60 (Code specialist) ⭐⭐⭐⭐

**Implementation**:

- Primary UI: New ModelSelector component with visual cards
- Fallback: Legacy dropdown in collapsible `<details>` section
- Both update the same `activeModel` state
- Seamless integration with existing model change handler

### Files Changed

**Settings.tsx**:

- Added `ModelSelector` import
- Replaced primary model selection UI with `ModelSelector` component
- Kept legacy dropdown as fallback in collapsible section
- Updated card description to mention pricing/quality/speed comparison

## Future Enhancements

Consider applying this pattern to other components with tabs:

- [ ] ChatInterface (if it has tabs)
- [ ] ContextGuide (if it has tabs)
- [ ] Any future components with tab navigation

## Pattern to Follow

For any component with tabs that should remember state:

```tsx
// 1. Add state with localStorage
const [activeTab, setActiveTab] = useState(() => {
  return localStorage.getItem("component-name-active-tab") || "default-tab";
});

// 2. Persist on change
useEffect(() => {
  localStorage.setItem("component-name-active-tab", activeTab);
}, [activeTab]);

// 3. Use controlled Tabs
<Tabs value={activeTab} onValueChange={setActiveTab}>
  {/* ... */}
</Tabs>;
```

---

**Fixed**: 2026-01-12
**Impact**:

- ✅ Improved UX for Settings page navigation (tab persistence)
- ✅ Enhanced model selection with visual comparison (ModelSelector integration)
- ✅ Better cost transparency for users
