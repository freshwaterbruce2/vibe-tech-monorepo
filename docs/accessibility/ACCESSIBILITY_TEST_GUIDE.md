# Monorepo Dashboard - Accessibility Testing Guide

## Quick Reference for Testing Accessibility Improvements

### Test Areas by Component

---

## 1. Tab Navigation (MonorepoHealthDashboard.tsx)

### What to Test

1. **Keyboard Navigation**
   - Press Tab to focus on tab buttons
   - Tab order should be: Overview → Coverage → Bundles → Security → Dependencies → Configs → Nx Cloud → Workflow
   - Press Enter or Space to activate a tab
   - Check that the active tab is visually highlighted

2. **Screen Reader**
   - All tabs should be announced as "tab"
   - Active tab should be announced with "selected, true"
   - Tab names should be read clearly

3. **Accessibility Tree**
   - Check DevTools: Elements should have `role="tab"` and `aria-selected="true/false"`

### Files Modified

- `src/monorepo-health/MonorepoHealthDashboard.tsx` (lines 236-262)

---

## 2. Search & Filter (ProjectsTab.tsx)

### What to Test

1. **Search Input**
   - Click/Tab to search input field
   - Type to filter projects
   - Press Escape to clear search (should reset to empty)
   - Verify aria-label is announced: "Search projects by name or path"

2. **Status Filter Dropdown**
   - Tab to filter dropdown
   - Use arrow keys or mouse to select: All Status, Healthy, Warning, Critical
   - Verify aria-label announced for each option

3. **Refresh Button**
   - Tab to Refresh button
   - Press Enter/Space to refresh project data
   - Check aria-label: "Refresh project data"

### Files Modified

- `src/components/projects/ProjectsTab.tsx` (lines 117-155)

---

## 3. Severity Filters (Dependencies Tab)

### What to Test

1. **Filter Radio Buttons**
   - Tab through: All, Critical, Recommended, Optional
   - Press Space to select a filter
   - Verify aria-checked toggles between "true" and "false"
   - Check role="radio" is set

2. **Dynamic Content Update**
   - Filter updates should be announced
   - Number counts should reflect selected filter
   - aria-label should include count: "Filter by critical (5)"

### Files Modified

- `src/monorepo-health/MonorepoHealthDashboard.tsx` (lines 435-471)

---

## 4. Expandable Dependencies

### What to Test

1. **Expand/Collapse**
   - Tab to a dependency with projects
   - Press Enter/Space to expand
   - Check ChevronDown icon rotates
   - Press again to collapse

2. **Screen Reader**
   - aria-expanded should change between "true" and "false"
   - aria-label should say: "Toggle projects using [package-name]"
   - Expanded section should be announced

3. **Accessibility Tree**
   - Check role="button" and aria-expanded attribute

### Files Modified

- `src/monorepo-health/MonorepoHealthDashboard.tsx` (lines 502-512)

---

## 5. Update Buttons

### What to Test

1. **Keyboard Navigation**
   - Tab to "Update" button for each dependency
   - Press Enter/Space to copy update command
   - Verify aria-label: "Update [package] from [version] to [version]"

2. **Screen Reader**
   - Button purpose should be clear from label
   - Copy action should be confirmed

### Files Modified

- `src/monorepo-health/MonorepoHealthDashboard.tsx` (lines 538-555)

---

## 6. Confirmation Dialog

### What to Test

1. **Dialog Accessibility**
   - Press Tab after dialog opens - focus should trap in dialog
   - Check role="dialog" is set
   - aria-labelledby points to title
   - aria-describedby points to message

2. **Keyboard Navigation**
   - Press Escape to close dialog (cancel)
   - Press Tab to navigate between buttons
   - Press Enter/Space to confirm action
   - Tab+Shift to go backwards

3. **Screen Reader**
   - Dialog opening should be announced
   - Title should be read: "Confirm Workflow Execution"
   - Message should be read clearly
   - Button labels should be descriptive

### Files Modified

- `src/monorepo-health/components/ConfirmationDialog.tsx`

---

## 7. Project Cards

### What to Test

1. **View Project Button**
   - Tab to button
   - Press Enter/Space to trigger action
   - Check aria-label includes project name and path
   - Example: "Open [project-name] project directory at [path]"

2. **Card Structure**
   - All interactive elements should be keyboard accessible
   - Tab order should be logical

### Files Modified

- `src/components/projects/ProjectCard.tsx` (lines 110-127)

---

## 8. Metric Cards (Overview)

### What to Test

1. **Region Role**
   - Check role="region" is set
   - aria-label should read: "\[Title\]: \[Value\]\[Suffix\]"
   - Example: "Health Score: 95%"

2. **Screen Reader**
   - Icons should be aria-hidden (not announced)
   - Values should be announced clearly

### Files Modified

- `src/components/overview/OverviewTab.tsx` (lines 174-190)

---

## Automated Testing Tools

### 1. Chrome DevTools

1. Open DevTools → Accessibility tab
2. Check each element for:
   - ARIA attributes
   - Role assignments
   - Proper nesting

### 2. axe DevTools Browser Extension

1. Install: <https://www.deque.com/axe/devtools/>
2. Scan each tab for accessibility violations
3. Check "Best Practices" tab

### 3. WAVE Browser Extension

1. Install: <https://wave.webaim.org/extension/>
2. Run on each tab
3. Check for contrast and structure issues

### 4. Lighthouse (Chrome DevTools)

1. Open DevTools → Lighthouse
2. Run Accessibility audit
3. Target: 95+ score

---

## Screen Reader Testing

### Using NVDA (Windows - Free)

1. Download: <https://www.nvaccess.org/download/>
2. Start NVDA (Ctrl+Alt+N)
3. Use arrow keys to read page
4. Tab to navigate interactive elements
5. Space/Enter to activate
6. Escape to cancel/close

### Using JAWS (Windows - Commercial)

1. Similar to NVDA
2. More features but requires license

### Using VoiceOver (macOS)

1. System Preferences → Accessibility → VoiceOver
2. Enable: Cmd+F5
3. Use VO key (Control+Option) + arrow keys
4. VO key + Space to interact

---

## Manual Keyboard Testing Checklist

### Full Keyboard Navigation Test

1. **Start from Top**
   - [ ] Click somewhere else first to lose focus
   - [ ] Press Tab to start navigation
   - [ ] Tab order should be: Left to right, top to bottom

2. **Tab Through Entire Dashboard**
   - [ ] Tab buttons (8 tabs)
   - [ ] Run Audit button
   - [ ] All interactive elements on active tab
   - [ ] Count total stops and verify all interactive elements are reachable

3. **Press Enter/Space on Each Element**
   - [ ] Tabs should switch
   - [ ] Buttons should activate
   - [ ] Dropdowns should open
   - [ ] Expandables should toggle

4. **Press Escape**
   - [ ] Close any open dialog
   - [ ] Clear search input
   - [ ] Cancel any operation

5. **Tab+Shift (Backwards)**
   - [ ] Navigate backwards through all elements
   - [ ] Verify reverse order works

---

## Focus Indicator Testing

### What to Check

1. **Focus is Visible**
   - [ ] Every interactive element shows focus ring when tabbed
   - [ ] Focus ring is high contrast and clearly visible
   - [ ] No focus loss while navigating

2. **Focus Order is Logical**
   - [ ] Reading order matches visual layout
   - [ ] No jumping around the page
   - [ ] Makes sense for the user

---

## Performance Notes

The accessibility improvements should have minimal performance impact:

- Keyboard event handlers are lightweight
- ARIA attributes are static text attributes
- No new API calls or DOM changes
- Focus management is efficient

Test performance with:

- Tab through all elements (should be instant)
- Open/close dialog multiple times (should be smooth)
- Switch tabs rapidly (no lag or flashing)

---

## Expected Accessibility Score

### Before Improvements: 70/100

- Basic structure in place
- Missing ARIA labels
- Limited keyboard support
- Dialog not properly marked

### After Improvements: 95/100

- All interactive elements labeled
- Full keyboard navigation support
- Proper semantic HTML structure
- Dialog properly marked with role="dialog"
- Focus management implemented

### Potential to Reach 100/100

- Enhanced focus indicators (higher contrast)
- Additional animations for prefers-reduced-motion
- Additional ARIA live regions
- Internationalization support

---

## Regression Testing

After deployment, verify:

1. All tabs switch correctly
2. Search and filter work
3. Dependencies expand/collapse
4. Dialog opens and closes
5. All keyboard shortcuts work
6. No console errors
7. Screen reader announces all content

---

**Last Updated:** 2026-01-18
**Target Score:** 95/100
**Status:** Ready for Testing
