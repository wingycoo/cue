# Cue Notes Design System & Layout Guidelines (DESIGN.md)

This document defines the design tokens, layout boundaries, responsive guidelines, and component specifications for **Cue Notes**.

---

## 1. Color System & Glassmorphism Tokens

| Token Name | Value | Usage |
| :--- | :--- | :--- |
| `--bg-primary` | `#0b0f19` | Main application backdrop |
| `--bg-surface` | `#131b2e` | Card & sidebar surface background |
| `--bg-glass` | `rgba(19, 27, 46, 0.75)` | Glassmorphic containers with `backdrop-filter: blur(16px)` |
| `--border-color` | `rgba(255, 255, 255, 0.08)` | Subtly defined subtle borders |
| `--border-active` | `rgba(99, 102, 241, 0.4)` | Highlighted/active item borders |
| `--accent-gradient` | `linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)` | Primary CTA buttons, logos, active states |
| `--accent-color` | `#6366f1` | Primary brand accent color |
| `--text-primary` | `#f8fafc` | Primary body text & headings |
| `--text-secondary` | `#94a3b8` | Muted descriptions & metadata |
| `--text-muted` | `#64748b` | Placeholders & inactive icons |

---

## 2. Component Specifications

### 2.1 Buttons & Interactive Controls
- **`.glass-btn`**:
  - Layout: `display: inline-flex; align-items: center; flex-direction: row; gap: 6px; white-space: nowrap;`
  - Padding: `8px 12px;` (Desktop), `6px 10px;` (Mobile)
  - Border radius: `10px;`
  - **Rules**: Text labels inside buttons must NEVER wrap vertically (`white-space: nowrap`).

- **`.mobile-back-btn`**:
  - Layout: `display: inline-flex; align-items: center; flex-direction: row; gap: 4px; white-space: nowrap;`
  - Appears ONLY on screens `< 768px` in the Editor header.

- **Note Action Buttons (Pin & Delete)**:
  - Layout: Must be arranged **horizontally side-by-side** (`display: flex; flex-direction: row; align-items: center; gap: 6px;`) next to the note title, NEVER stacked vertically.

### 2.2 Editor Toolbar (`.editor-toolbar`)
- Layout: Single horizontal flex row (`display: flex; flex-direction: row; align-items: center; flex-wrap: nowrap; overflow-x: auto;`)
- Touch scroll: `-webkit-overflow-scrolling: touch;`
- Icon buttons: Strict width/height (`32px x 32px`) touch targets with centered icons.

### 2.3 Modals (`SettingsModal`, `GuideModal`)
- **Header**: `display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;`
- Close button (`'X'`): Placed inside the flex row opposite to the title, avoiding awkward line wraps.
- Input fields: `padding: 10px 14px; width: 100%; border-radius: 10px;`

---

## 3. Responsive Breakpoints

- **Desktop (`>= 768px`)**:
  - Dual pane layout: Sidebar (320px) + Editor workspace (flex 1).
- **Mobile (`< 768px`)**:
  - View switching: Show either **Sidebar (Note List)** or **Editor Workspace** full width.
  - Header: Compact icon-first layout (`height: 52px; padding: 0 12px;`).
