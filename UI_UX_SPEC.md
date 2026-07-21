# UI_UX_SPEC.md — Design System & Interface Specification

> **Role**: Staff Product Designer (Linear & Apple UX Standards)  
> **Visual Philosophy**: Line-of-sight ergonomics, Apple-grade clarity, dark-mode default, zero layout shifts  

---

## 1. Visual Principles & Design Philosophy

1. **Ambient & Line-of-Sight**: Controls mount directly adjacent to where the user is typing (Shadow DOM). Zero context switching.
2. **High-DPI Micro-Typography**: Inter / System UI font stack, precise line heights, micro-badges with subtle contrast.
3. **Keyboard First**: Every core action mapped to rapid keyboard triggers (`Cmd+K`, `Tab`, `Esc`).
4. **Dark Mode First**: Sleek zinc/slate dark surfaces (`#09090b` background, `#18181b` card fills, `#27272a` borders) with vibrant accent accents (emerald for commitment, amber for warning, indigo for AI action).

---

## 2. ASCII Wireframe Layouts

### 2.1 Floating Shadow DOM Overlay Bar (Mounted above Chat Input)

```text
+-----------------------------------------------------------------------------------+
|  🔒 Rapport Local  |  👤 Sarah (Concise)  |  [ De-escalate ]  [ Boundary ]  (Cmd+K) |
+-----------------------------------------------------------------------------------+
| ⚠️ Pending Promise: "Send Q3 Slide Deck by 4 PM"           [ 1-Click Resolve ]    |
+-----------------------------------------------------------------------------------+
|  AI Suggestion Stream:                                                            |
|  "Hi Sarah, here is the updated Q3 deck as promised. Let me know if you need..." |
|                                                                                   |
|  [ Tab ↵ Insert Draft ]   [ Esc Dismiss ]   [ Cmd+R Regenerate ]                  |
+-----------------------------------------------------------------------------------+
```

### 2.2 Extension Sidepanel (Memory Inspector & Settings)

```text
+------------------------------------------------------------------+
|  RAPPORT AI                                     [ 🔒 Local DB ]  |
|  ==============================================================  |
|  [ Contacts ]    [ Commitments ]    [ Settings ]                 |
|                                                                  |
|  SEARCH CONTACTS: [ Q Search Sarah, Alex...                 ]   |
|  --------------------------------------------------------------  |
|  👤 Sarah Jenkins  (Slack)                                       |
|     Style: Concise • Direct • Bullet-points preferred            |
|     Active Notes:                                                |
|     • Prefers quarterly updates in bullet format    [ Delete ]   |
|     • Client POC for Acme Corp deal                 [ Delete ]   |
|                                                                  |
|  --------------------------------------------------------------  |
|  ⚠️ PENDING COMMITMENTS (2)                                      |
|  • "Send Q3 Deck by 4 PM" -> Sarah Jenkins         [ Mark Done ] |
|  • "Review API Spec tomorrow" -> Alex Rivera       [ Mark Done ] |
|                                                                  |
|  --------------------------------------------------------------  |
|  [ 📥 Export Local Data ]                [ 🗑️ Purge All Memory ] |
+------------------------------------------------------------------+
```

---

## 3. Component Inventory & Interaction States

### 3.1 Floating Widget
- **Default State**: Compact pill (opacity 40%) sitting top-right of host input textarea.
- **Focus State**: Expands to active toolbar (opacity 100%, 150ms scale-in) showing context badge and goal triggers.

### 3.2 Tone Selector & Action Pills
- **Pills**: `[ Professional ]` `[ Direct ]` `[ Empathetic ]` `[ De-escalate ]`.
- **Hover**: Subtle border highlight (`#3f3f46`) with micro-tooltip.

### 3.3 Commitment Warning Card
- **Background**: Soft amber tint (`rgba(245, 158, 11, 0.1)`), amber border (`#f59e0b`).
- **Action**: One-click button inserts resolution phrasing.

### 3.4 De-Escalation Alert Card
- **Background**: Soft red tint (`rgba(239, 68, 68, 0.1)`), red border (`#ef4444`).
- **Action**: High-visibility button: `[ Press Tab to Replace with Calm Draft ]`.

---

## 4. Keyboard Shortcuts & Accessibility

- `Cmd + K` / `Ctrl + K`: Open Goal & Strategy Command Palette.
- `Tab`: Accept AI suggestion and inject text into native input field.
- `Esc`: Dismiss AI preview card and return cursor focus to host textarea.
- `Cmd + Shift + D`: Instantly trigger De-escalation rephrase.
- **Accessibility**: High contrast ratios (WCAG AAA), full ARIA live region support for screen readers during streaming updates.

---

## 5. Design System Tokens

- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Font Sizes**: Text Micro (`11px`), Text Small (`12px`), Text Base (`13px`), Text Header (`14px` Bold).
- **Background Colors**: Canvas (`#09090b`), Surface (`#18181b`), Surface Hover (`#27272a`).
- **Border Colors**: Subdued (`#27272a`), Active Focus (`#6366f1`).
- **Accent Colors**: Primary Indigo (`#6366f1`), Success Emerald (`#10b981`), Warning Amber (`#f59e0b`), Alert Red (`#ef4444`).
