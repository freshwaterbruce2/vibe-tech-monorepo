# Monorepo Dashboard - Accessibility Code Examples

## Real Code Changes Made

---

## 1. Tab Navigation with ARIA

### Before

```tsx
<div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-lg w-fit">
  {(['overview', 'coverage', 'bundles', ...].map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={...}
      type="button"
    >
      {tab}
    </button>
  ))}
</div>
```

### After

```tsx
<div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-lg w-fit" role="tablist" aria-label="Dashboard tabs">
  {(['overview', 'coverage', 'bundles', ...].map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveTab(tab);
        }
      }}
      className={...}
      type="button"
      role="tab"
      aria-selected={activeTab === tab}
      aria-controls={`${tab}-panel`}
      tabIndex={activeTab === tab ? 0 : -1}
      aria-label={`${tab} tab`}
    >
      {tab}
    </button>
  ))}
</div>
```

**Key Changes:**

- Added `role="tablist"` and `aria-label` to container
- Added `role="tab"`, `aria-selected`, `aria-controls` to buttons
- Added `tabIndex` management for keyboard navigation
- Added `onKeyDown` handler for Enter/Space support

---

## 2. Search Input with Keyboard Support

### Before

```tsx
<input
  type="text"
  placeholder="Search projects..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="w-full pl-10 pr-4 py-2 bg-secondary/20 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
/>
```

### After

```tsx
<div className="flex items-center gap-4" role="search">
  {/* Search */}
  <div className="relative flex-1">
    <label htmlFor="project-search" className="sr-only">
      Search projects by name or path
    </label>
    <Search
      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
      aria-hidden="true"
    />
    <input
      id="project-search"
      type="text"
      placeholder="Search projects..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
          setSearchQuery('');
        }
      }}
      className="w-full pl-10 pr-4 py-2 bg-secondary/20 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
      aria-label="Search projects by name or path"
    />
  </div>
</div>
```

**Key Changes:**

- Added `role="search"` to container
- Added associated `<label>` with `sr-only` class
- Added `aria-hidden="true"` to decorative icon
- Added Escape key handler to clear search
- Added `aria-label` for clarity

---

## 3. Filter Radio Buttons

### Before

```tsx
<div className="flex gap-2">
  {(['all', 'critical', 'recommended', 'optional'].map((filter) => (
    <button
      key={filter}
      onClick={() => setSeverityFilter(filter)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${...}`}
      type="button"
    >
      {filter} {count > 0 && `(${count})`}
    </button>
  )))}
</div>
```

### After

```tsx
<div className="flex gap-2" role="group" aria-label="Filter by severity">
  {(['all', 'critical', 'recommended', 'optional'].map((filter) => (
    <button
      key={filter}
      onClick={() => setSeverityFilter(filter)}
      onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSeverityFilter(filter);
        }
      }}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${...}`}
      type="button"
      role="radio"
      aria-checked={severityFilter === filter}
      aria-label={`Filter by ${filter} ${count > 0 ? `(${count})` : ''}`}
    >
      {filter} {count > 0 && `(${count})`}
    </button>
  )))}
</div>
```

**Key Changes:**

- Added `role="group"` and `aria-label` to container
- Added `role="radio"` and `aria-checked` to buttons
- Added keyboard handler for Space key
- Added descriptive `aria-label` with counts

---

## 4. Expandable Items with aria-expanded

### Before

```tsx
<div
  className={`flex items-center justify-between p-3 transition-all ${
    hasProjects ? 'cursor-pointer hover:bg-white/10' : ''
  }`}
  onClick={() => hasProjects && toggleDepExpanded(dep.name)}
  role={hasProjects ? 'button' : undefined}
  tabIndex={hasProjects ? 0 : undefined}
>
```

### After

```tsx
<div
  className={`flex items-center justify-between p-3 transition-all ${
    hasProjects ? 'cursor-pointer hover:bg-white/10' : ''
  }`}
  onClick={() => hasProjects && toggleDepExpanded(dep.name)}
  onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
    if (hasProjects && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      toggleDepExpanded(dep.name);
    }
  }}
  role={hasProjects ? 'button' : undefined}
  tabIndex={hasProjects ? 0 : undefined}
  aria-expanded={hasProjects ? isExpanded : undefined}
  aria-label={hasProjects ? `Toggle projects using ${dep.name}` : undefined}
>
```

**Key Changes:**

- Added `onKeyDown` handler for Enter/Space
- Added `aria-expanded` to show open/closed state
- Added descriptive `aria-label`

---

## 5. Modal Dialog with Accessibility

### Before

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
  <div className="relative bg-gradient-to-br ... rounded-xl p-6 ...">
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-slate-300 text-sm mb-6">{message}</p>
    <div className="flex gap-3">
      <button onClick={onCancel} type="button">{cancelText}</button>
      <button onClick={onConfirm} type="button">{confirmText}</button>
    </div>
  </div>
</div>
```

### After

```tsx
const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    onCancel();
  }
};

<div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={handleKeyDown}>
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
  <div
    className="relative bg-gradient-to-br ... rounded-xl p-6 ..."
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    aria-describedby="dialog-description"
  >
    <h3 id="dialog-title" className="text-xl font-bold mb-2">{title}</h3>
    <p id="dialog-description" className="text-slate-300 text-sm mb-6">{message}</p>
    <div className="flex gap-3">
      <button
        onClick={onCancel}
        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        type="button"
        aria-label={cancelText}
      >
        {cancelText}
      </button>
      <button
        onClick={onConfirm}
        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onConfirm();
          }
        }}
        type="button"
        aria-label={confirmText}
      >
        {confirmText}
      </button>
    </div>
  </div>
</div>
```

**Key Changes:**

- Added `role="dialog"` and `aria-modal="true"`
- Added `aria-labelledby` and `aria-describedby`
- Added IDs to title and message
- Added Escape key handler to close
- Added keyboard handlers for buttons
- Added `aria-label` to all buttons

---

## 6. Metric Cards with Role and ARIA-Label

### Before

```tsx
<div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-6 ${glow ? 'ring-2 ring-emerald-500/30' : ''}`}>
  <div className="flex items-center justify-between mb-2">
    <p className="text-sm font-medium text-muted-foreground">{title}</p>
    <Icon className="w-5 h-5" />
  </div>
  <p className="text-3xl font-bold">
    <AnimatedCounter value={value} suffix={suffix} />
  </p>
</div>
```

### After

```tsx
<div
  className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-6 ${glow ? 'ring-2 ring-emerald-500/30' : ''}`}
  role="region"
  aria-label={`${title}: ${value}${suffix}`}
>
  <div className="flex items-center justify-between mb-2">
    <p className="text-sm font-medium text-muted-foreground">{title}</p>
    <Icon className="w-5 h-5" aria-hidden="true" />
  </div>
  <p className="text-3xl font-bold">
    <AnimatedCounter value={value} suffix={suffix} />
  </p>
</div>
```

**Key Changes:**

- Added `role="region"` to make it a landmark
- Added `aria-label` with full metric description
- Added `aria-hidden="true"` to decorative icon

---

## 7. Button with Complete Accessibility

### Before

```tsx
<button
  onClick={() => refetch()}
  className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors"
>
  <RefreshCw className="w-4 h-4" />
  Refresh
</button>
```

### After

```tsx
<button
  onClick={() => refetch()}
  onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      refetch();
    }
  }}
  className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors"
  type="button"
  aria-label="Refresh project data"
>
  <RefreshCw className="w-4 h-4" aria-hidden="true" />
  Refresh
</button>
```

**Key Changes:**

- Added `onKeyDown` handler for keyboard support
- Added `type="button"` (explicit button type)
- Added descriptive `aria-label`
- Added `aria-hidden="true"` to icon

---

## 8. Semantic HTML for Form Controls

### Before

```tsx
<div>
  <input
    type="text"
    placeholder="Search projects..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
</div>
```

### After

```tsx
<div>
  <label htmlFor="project-search" className="sr-only">
    Search projects by name or path
  </label>
  <input
    id="project-search"
    type="text"
    placeholder="Search projects..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    aria-label="Search projects by name or path"
  />
</div>
```

**Key Changes:**

- Added `<label>` element with `htmlFor` attribute
- Used `sr-only` class to hide label visually but keep it for screen readers
- Added `id` to input to match label
- Added `aria-label` as additional accessibility support

---

## Common Patterns Used

### Pattern 1: Keyboard Event Handler

```tsx
onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    // handle action
  }
}}
```

### Pattern 2: Screen Reader Only Text

```tsx
<label htmlFor="search" className="sr-only">
  Search description here
</label>
```

### Pattern 3: Decorative Icon

```tsx
<Icon className="w-4 h-4" aria-hidden="true" />
```

### Pattern 4: Expandable Element

```tsx
<div
  role="button"
  aria-expanded={isExpanded}
  aria-label="Toggle content"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpanded();
    }
  }}
>
  {/* content */}
</div>
```

### Pattern 5: Dialog

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Title</h2>
  <p id="dialog-description">Description</p>
</div>
```

---

## TypeScript Types Used

```tsx
import { type KeyboardEvent } from 'react';

// Specific element type
const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
  if (e.key === 'Escape') {
    e.preventDefault();
  }
};
```

---

## CSS Class for Accessibility

The `sr-only` class (from Tailwind CSS) is used for screen reader-only content:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

This hides content visually but keeps it accessible to screen readers.

---

## Summary of Patterns

| Pattern | Purpose | Example |
|---------|---------|---------|
| `aria-label` | Accessible name for elements without text content | Buttons with icons |
| `aria-labelledby` | Links element to its visible label | Dialog title |
| `aria-describedby` | Provides additional description | Form validation messages |
| `aria-expanded` | Shows if expandable content is open/closed | Accordion, dropdowns |
| `aria-selected` | Shows if tab/option is selected | Tab navigation |
| `aria-checked` | Shows if radio/checkbox is checked | Filter buttons |
| `aria-hidden="true"` | Hides decorative content from screen readers | Icons, dividers |
| `role="region"` | Makes generic div a landmark region | Metric cards |
| `role="dialog"` | Marks element as modal dialog | Confirmation dialogs |
| `role="tablist"` | Container for tab navigation | Tab bar |
| `role="tab"` | Individual tab button | Tab button |
| `role="search"` | Marks search section | Search area |
| `role="alert"` | Marks urgent information | Error messages |

---

**Last Updated:** 2026-01-18
**React Version:** 19.0.0
**TypeScript Version:** 5.9.0
