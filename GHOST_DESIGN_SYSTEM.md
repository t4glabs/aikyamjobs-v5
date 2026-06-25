# Ghost Design System — Reference for aikyamjobs

This document is a complete study of Ghost's admin UI design system, sourced directly from the TryGhost/Ghost repository. Ghost uses two packages:

- **`admin-x-design-system`** — older system, still used in Ghost admin settings panel (Radix UI + custom Tailwind classes)
- **`@tryghost/shade`** (`apps/shade`) — newer shadcn-based system, the current direction (Radix UI + CVA + Tailwind v4 tokens)

The `shade` package is the one to follow for new work. Both are documented here for completeness.

---

## 1. Design Tokens

### Color Palette

Ghost uses a cool-grey scale (slight blue tint, not neutral grey) plus semantic aliases.

#### Primitive colors (from `tailwind.theme.css`)

| Token | Approx hex | Use |
|---|---|---|
| `grey-50` | `#f9f9fb` | Lightest background tint |
| `grey-100` | `#f4f5f7` | Sidebar background, input fill |
| `grey-200` | `#eff0f3` | Default borders, muted backgrounds |
| `grey-300` | `#e3e5ea` | Dividers |
| `grey-400` | `#d6d9e0` | Disabled borders |
| `grey-500` | `#c0c4cf` | Muted text secondary |
| `grey-600` | `#adb2bf` | Placeholder text |
| `grey-700` | `#8f96a7` | Secondary text |
| `grey-800` | `#6b7280` | Tertiary / meta text |
| `grey-900` | `#3d4451` | Body text (not full black) |
| `grey-950` | `#252a33` | Near-black |
| `black` | `#202226` | Primary text, buttons |
| `white` | `#ffffff` | Backgrounds |
| `green-500` | Ghost green (~`#30cf43`) | Success, focus ring, CTA |
| `red-500` | ~`#f30b0b` | Destructive, error |
| `blue-500` | ~`#42a4f5` | Info state |
| `yellow-500` | ~`#f5c000` | Warning state |

> Ghost uses OKLCH for all color values in `shade`, which gives perceptually uniform colour steps.

#### Semantic tokens (from `theme-variables.css`)

Light mode:

| Semantic token | Maps to |
|---|---|
| `--background` | white |
| `--foreground` | black |
| `--muted` | grey-100 |
| `--muted-foreground` | grey-700 |
| `--border` | grey-200 |
| `--input` | grey-200 |
| `--card` | white |
| `--primary` | black |
| `--primary-foreground` | white |
| `--secondary` | grey-200 |
| `--secondary-foreground` | black |
| `--accent` | grey-100 |
| `--accent-foreground` | black |
| `--destructive` | red-500 |
| `--ring` | grey-600 |
| `--text-primary` | black |
| `--text-secondary` | grey-700 |
| `--text-tertiary` | grey-400 |
| `--border-default` | grey-200 |
| `--border-strong` | grey-500 |
| `--focus-ring` | grey-600 |
| `--surface-page` | white |
| `--surface-panel` | white |
| `--surface-elevated` | white |
| `--sidebar-background` | grey-50 |
| `--sidebar-border` | grey-100 |
| `--control-height` | 32px |

Dark mode swaps to black/grey-950 backgrounds and lightens text to grey-200.

---

### Typography

Font family: **Inter** (all weights). No decorative fonts in admin UI.

```css
--font-sans: Inter, -apple-system, BlinkMacSystemFont, avenir next, avenir, helvetica neue, helvetica, ubuntu, roboto, noto, segoe ui, arial, sans-serif;
```

Font scale (rem-based, 10px root assumed — so 1.3rem = 13px):

| Token | Size | Use |
|---|---|---|
| `text-2xs` | 10px | Micro labels |
| `text-xs` | 11px | Tags, captions |
| `text-sm` | 12px | Secondary body |
| `text-base` / `text-control` | 13px | **Default UI text** |
| `text-md` | 14px | Slightly larger body |
| `text-lg` | 15px | Card titles, section headings |
| `text-xl` | 17px | Page sub-headings |
| `text-2xl` | 22px | Page headings |
| `text-3xl` | 28px | Large headings |
| `text-4xl` | 32px | Hero text |

Line heights:
- Body: `1.5em` (relaxed)
- Headings: `1.35em` (tight)
- Supertight: `1.1em` (display)

Letter spacing:
- Default: `0`
- Tight: `−0.01em` (headings)
- Wide: `+0.01em` (labels/caps)

---

### Spacing

Ghost uses `--spacing: 0.4rem` as the base unit in `shade`. Tailwind spacing scale works on top of this (so `gap-1` = 4px, `gap-2` = 8px, `gap-4` = 16px etc.).

---

### Border Radius

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 3px | Tiny elements |
| `--radius-sm` / `--radius-md` | 4–6px | **Controls (buttons, inputs)** |
| `--radius-lg` | 8px | Cards, surfaces |
| `--radius-xl` | 12px | Larger cards |
| `--radius-2xl` | 16px | Modals, panels |
| `--radius-3xl` | 24px | Sheets, drawers |
| `--radius-full` | 9999px | Badges, avatars, pills |
| `--radius-control` | = radius-md (6px) | All interactive controls |
| `--radius-surface` | = radius-lg (8px) | Card/panel surfaces |
| `--radius-badge` | = radius-full | Badge/tag elements |

---

### Shadows

Ghost has a layered multi-shadow system:

```
xs:  0 0 1px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.03), 0 8px 10px -12px rgba(0,0,0,.1)
sm:  0 0 1px rgba(0,0,0,.12), 0 1px 6px rgba(0,0,0,.03), 0 8px 10px -8px rgba(0,0,0,.1)
md:  adds 0px 24px 37px -21px rgba(0,0,0,.05)
lg:  deeper, 6-layer stack
xl:  deepest, 6-layer stack
```

Cards use `shadow-xs` on hover. Modals use `shadow-lg`. Dropdowns use `shadow-md`.

---

### Animation

| Token | Value |
|---|---|
| `duration-fast` | 150ms |
| `duration-base` | 250ms |
| `duration-slow` | 400ms |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease-emphasized` | `cubic-bezier(0.16, 1, 0.3, 1)` (spring-like) |

Modal enters with `translateY(32px) → 0` at 250ms. Backdrop fades in at 150ms.

---

## 2. Component Patterns

### Buttons

From `shade` (`button.tsx`):

```
Base: inline-flex items-center justify-center gap-1.5 rounded-md
      text-control whitespace-nowrap transition-colors
      focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden
      disabled:pointer-events-none disabled:opacity-50
      [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5px]
```

| Variant | Classes |
|---|---|
| `default` | `bg-primary font-semibold text-primary-foreground hover:bg-primary/90` |
| `destructive` | `bg-destructive font-medium text-destructive-foreground hover:bg-destructive/90` |
| `outline` | `border border-input bg-background font-medium hover:bg-accent hover:text-accent-foreground` |
| `secondary` | `bg-secondary font-medium text-secondary-foreground hover:bg-secondary/80` |
| `ghost` | `font-medium hover:bg-accent hover:text-accent-foreground` |
| `link` | `font-medium text-primary underline-offset-4 hover:underline` |
| `dropdown` | `border border-input bg-background hover:bg-accent` + auto-appends ChevronDown |

| Size | Classes |
|---|---|
| `default` | `h-(--control-height) px-2.5 py-2` → 32px tall |
| `sm` | `h-7 rounded-md px-3 text-sm` → 28px tall |
| `lg` | `h-11 rounded-md px-8 text-md font-semibold` → 44px tall |
| `icon` | `size-9` → 36px square |

**Key observations:**
- Default button is black (`bg-primary`) — no colour. Ghost uses black/white buttons, not coloured ones (no blue "primary" button like most systems).
- Font weight is `font-semibold` on default, `font-medium` on secondary/outline.
- Icons get `stroke-[1.5px]` — slightly thin strokes.
- Hover state is opacity-based (`/90`, `/80`) not a separate colour.

---

### Inputs

From `input-surface.ts` (shared recipe used by Input, Textarea, Select, InputGroup):

```
Base:    rounded-md border border-border-default bg-surface-elevated transition-colors
Focus:   focus-visible:border-focus-ring focus-visible:ring-2 focus-visible:ring-focus-ring/25 focus-visible:bg-transparent
Error:   aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20
```

From `input.tsx`:
```
h-9 w-full px-3 py-1 text-control
placeholder:text-muted-foreground
file:border-0 file:bg-transparent
```

**Key observations:**
- Input height: 36px (not the 32px control height — inputs are slightly taller than buttons).
- Focus ring: `ring-2 ring-focus-ring/25` — a subtle outer glow (grey, not green).
- Error state uses `aria-invalid` attribute, not a class.
- Background is `bg-surface-elevated` (white in light mode) — inputs are not tinted grey.
- Border is `border-border-default` (grey-200) — very subtle.

> **Contrast with older `admin-x-design-system`:** The older system used `bg-grey-100` (tinted grey) with a green focus ring. The new `shade` system uses a white background and grey focus ring. Ghost is moving away from the green focus ring.

---

### Badges / Tags

From `badge.tsx`:

```
Base: inline-flex items-center rounded-xs border px-1.5 text-xs font-semibold transition-colors
```

| Variant | Style |
|---|---|
| `default` | Black background, white text |
| `secondary` | `bg-secondary text-secondary-foreground/70` — grey bg, muted text |
| `destructive` | `bg-destructive/20 text-destructive` — tinted red bg, red text |
| `success` | `bg-green/20 text-green` — tinted green bg, green text |
| `warning` | `bg-state-warning/20 text-yellow-600` — tinted yellow bg |
| `outline` | Border only, no background |

**Key observations:**
- `rounded-xs` (3px) — badges are very slightly rounded, almost square corners.
- Tinted backgrounds (20% opacity) for status variants — not full-colour pills.
- Font is `font-semibold` at `text-xs` (11px).

---

### Cards

From `card.tsx`:

```
Base: flex flex-col bg-card text-card-foreground
```

| Variant | Style |
|---|---|
| `outline` | `rounded-xl border transition-all hover:shadow-xs` |
| `plain` | No border/radius |

Sub-components:
- `CardHeader` (outline): `p-6 flex flex-col gap-y-1.5`
- `CardTitle`: `tracking-tight font-semibold leading-none`
- `CardDescription`: `text-sm text-muted-foreground`
- `CardContent` (outline): `p-6 pt-0`
- `CardFooter` (outline): `p-6 pt-0 flex items-center`

**Key observations:**
- Cards use `rounded-xl` (12px) — noticeably rounded.
- Hover adds a very subtle shadow (`shadow-xs`) — cards "lift" slightly on hover.
- No `hover:bg` change — cards don't change background on hover.
- Padding is `p-6` (24px) — generous internal spacing.

---

### Separator

```tsx
<div className="shrink-0 bg-border h-[1px] w-full" />
```

Color: `--border` = grey-200. Always 1px. No opacity tricks.

---

### Select / Dropdown

Trigger:
```
inputSurface('self') + flex h-(--control-height) w-full items-center justify-between
whitespace-nowrap px-3 py-2 text-control hover:bg-accent
data-[placeholder]:text-muted-foreground
```

Content:
```
relative z-50 max-h-... min-w-[8rem] overflow-y-auto rounded-md border bg-popover
text-popover-foreground shadow-md data-[state=open]:animate-in ...
```

Item:
```
relative flex w-full cursor-default select-none items-center rounded-xs
py-1.5 pl-2 pr-8 text-control outline-hidden
focus:bg-accent focus:text-accent-foreground
```

Check icon sits at `right-2`, absolutely positioned. Items are `rounded-xs` (not full-radius).

---

### Switch / Toggle

```
Base:   peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2
        border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring
        focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50

Off:    data-[state=unchecked]:bg-input  → grey-200
On:     data-[state=checked]:bg-primary  → black
```

Default size: `h-4 w-7` (16×28px). Thumb: `size-3` with `translate-x-3` when checked.

Small size: `h-3 w-5` (12×20px). Thumb: `size-2` with `translate-x-2`.

**Key observation:** Ghost switches are **black when on** (not green). Simple and monochrome.

---

### Tabs

6 variants available. Most common:

**`segmented`** (pill group):
```
List:    h-(--control-height) rounded-lg bg-muted px-[3px]
Trigger: h-7 rounded-md text-control font-medium
Active:  data-[state=active]:bg-background data-[state=active]:shadow-md
```

**`underline`** (content tabs):
```
List:    w-full gap-5 border-b border-border-default
Trigger: relative h-9 px-0 text-control font-semibold text-text-secondary
         after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground
         after:opacity-0 data-[state=active]:after:opacity-100!
```

**`navbar`** (top navigation):
```
List:    h-[52px] items-end gap-6
Trigger: relative h-[52px] px-px text-control font-semibold text-muted-foreground
         after: same underline pattern as above
```

**`pill`** (compact selector):
```
List:    h-[30px] gap-px
Trigger: h-[30px] rounded-md px-3 font-medium text-text-secondary
Active:  data-[state=active]:bg-muted-foreground/10 data-[state=active]:font-semibold
```

---

### Dialog / Modal

Overlay: `fixed inset-0 z-50 bg-black/30 backdrop-blur-[3px] animate-in fade-in-0`

Content:
```
fixed left-[50%] top-[8vmin] z-50 grid w-full max-w-lg translate-x-[-50%]
gap-6 bg-popover p-6 shadow-lg duration-200
animate-in fade-in-0 zoom-in-95
sm:rounded-lg
```

Header: `flex flex-col gap-y-1.5 text-center sm:text-left`

Footer: `flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 sm:items-end [&_button]:min-w-20`

**Key observations:**
- Modal appears at `top-[8vmin]` — 8% viewport height from top (not centered vertically).
- Gap between sections is `gap-6` (24px).
- Footer buttons have `min-w-20` (80px) enforced.
- Backdrop is `bg-black/30` + `backdrop-blur-[3px]` — slight blur, semi-transparent.

---

### Page Header / Header Layout

From `layout/header.tsx`:

```css
sticky top-0 z-50 -mb-4
grid gap-x-4
bg-gradient-to-b from-background via-background/70 to-background/70
p-4 backdrop-blur-md
```

Grid areas: `above`, `title`, `meta`, `actions`, `nav`

Responsive at `sm`: 2 columns (title + actions share a row)
Responsive at `lg`: layout adjusts for `inline-nav` variant

Title: `text-2xl leading-[1.2em] lg:text-3xl`

Meta: `text-muted-foreground pb-4 pt-1`

Actions: `self-start justify-self-end`

**Key observation:** Ghost page headers are **sticky with a blur gradient** — the page content scrolls underneath and the header stays readable via the gradient + blur.

---

### Sidebar

- Width: 300px (desktop), 28rem (mobile sheet)
- Background: `sidebar-background` = grey-50
- Border: `sidebar-border` = grey-100
- Collapsed width: 64px (icon-only mode)
- Keyboard shortcut: `Ctrl/Cmd + B` to toggle
- Mobile: becomes a `Sheet` (drawer from the left)
- State persisted in cookie `sidebar:state`

---

### Loading States

**Spinner** (`LoadingIndicator`):
```
animate-spin rounded-full border-black/10
before: small filled dot as the "head"
sm: 16×16px, 2px border
md: 20×20px, 2px border
lg: 50×50px, 1px border
```

**Skeleton** (`Skeleton`):
```
inline-flex w-full leading-none animate-pulse rounded-[2px] bg-primary/10
```
Can randomize widths between `minWidth` and `maxWidth` % for natural look.

**SkeletonTable**: Multiple rows with staggered widths (57%, 33%, 40%, 48%, 24% cycling).

---

### Toast Notifications

Uses `sonner` (replaces react-hot-toast in `shade`).

```tsx
<Toaster
  className="toaster group"
  theme="light"
  style={{
    '--normal-bg': 'var(--background)',
    '--normal-text': 'var(--foreground)',
    '--normal-border': 'var(--border)'
  }}
/>
```

Always forces `theme="light"` regardless of system dark mode preference.

---

## 3. Layout System

### Breakpoints

```
sm:        480px
md:        640px
tablet:    860px
sidebar:   800px
lg:        1024px
sidebarlg: 1240px
xl:        1320px
xxl:       1440px
```

Note: Ghost's `sm` is 480px (not Tailwind's default 640px).

### Container sizes

```
xs:   32rem  (512px)
sm:   38.4rem (614px)
md:   44.8rem (717px)
lg:   51.2rem (819px)
xl:   57.6rem (922px)
2xl:  67.2rem (1075px)
page: 120rem  (1920px max)
prose: 65ch
```

### Page structure

```
SidebarProvider
├── Sidebar (sticky left, 300px)
│   ├── SidebarHeader
│   ├── SidebarContent (scrollable)
│   └── SidebarFooter
└── SidebarInset (main content area)
    ├── Header (sticky top, blur gradient)
    └── main content
```

---

## 4. Interaction Patterns

### Focus rings

- Always `focus-visible:ring-2` (not `focus:ring`) — only shows on keyboard navigation.
- Ring color: `focus-ring` = grey-600 (not green in new system).
- Ring size: 2px.
- Ring opacity: 25% when used with inputs (`ring-focus-ring/25`).
- No `outline-none` — uses `outline-hidden` (which hides the browser outline only when ring is present).

### Hover states

- Backgrounds: `hover:bg-accent` (grey-100) for most interactive elements.
- Buttons: `hover:bg-primary/90` (opacity reduction, not separate colour).
- Cards: `hover:shadow-xs` (subtle lift, no bg change).
- List items: `hover:bg-accent` across the full row.

### Active / selected states

- Tabs: `data-[state=active]:` attribute selectors.
- Switches: `data-[state=checked]:bg-primary` (black).
- Radix primitives: `data-[state=open]` / `data-[state=closed]` for animations.

### Disabled states

- `disabled:pointer-events-none disabled:opacity-50` — universal pattern.
- 50% opacity, no pointer events.

### Error states

- `aria-[invalid=true]:border-destructive` — uses ARIA attribute, not class.
- Error ring: `aria-[invalid=true]:ring-destructive/20` (20% opacity).
- This means the `aria-invalid="true"` attribute must be set on the input.

---

## 5. Visual Language Summary

| Attribute | Ghost approach |
|---|---|
| Colour | Near-monochrome: black + grey + white. Minimal colour use. |
| Accent | No persistent brand colour for CTAs. Black = primary action. |
| Radius | 6px controls, 8px cards, full-radius badges. |
| Typography | Inter at 13px base. Tight scale. Semibold for primary actions. |
| Borders | Grey-200 everywhere. Very subtle. Never dark. |
| Spacing | 4px base unit. 24px internal card padding. Generous. |
| Motion | Smooth but quick (150–250ms). Spring-like ease for modals. |
| Shadows | Layered, naturalistic. Cards barely lift. Modals have depth. |
| Icons | Lucide React, 16px, `stroke-[1.5px]`. |
| Dark mode | Full support via `.dark` class, semantic tokens flip. |

---

## 6. Applying Ghost Design to aikyamjobs

### What to adopt now (low effort, high impact)

1. **Border colours** — already fixed. Always specify `border-gray-200` (Ghost's grey-200), never bare `border-*`.

2. **Typography** — Inter is already our font. Adopt 13px as the base UI size for labels, tags, metadata.

3. **Badge/tag style** — Switch from coloured `bg-blue-100 text-blue-700` style to Ghost's tinted pattern: `bg-blue-500/10 text-blue-600`. Or use `bg-gray-100 text-gray-700` for neutral tags.

4. **Card hover** — Add `hover:shadow-sm transition-shadow` to job cards instead of `hover:bg-*`.

5. **Button style** — Primary buttons → `bg-gray-900 text-white font-semibold hover:bg-gray-900/90 rounded-md`. No coloured buttons.

6. **Focus rings** — Replace `focus:ring-blue-500` with `focus-visible:ring-2 focus-visible:ring-gray-600`.

### What to adopt gradually (page by page)

1. **Sticky blur header** — Navbar gets `sticky top-0 backdrop-blur-md bg-gradient-to-b from-white via-white/70 to-white/70`.

2. **Sidebar layout** — If we ever add a sidebar for filters or navigation, use grey-50 bg, grey-100 border.

3. **Input style** — Move away from tinted grey inputs to white background inputs (`bg-white border-gray-200`) with grey focus ring.

4. **Tabs** — Use underline tabs for section navigation, segmented (pill group) for view toggles (e.g. grid/list view).

5. **Toast** — Replace any existing toast library with `sonner`.

6. **Empty states** — Follow Ghost's pattern: icon + heading + description + action button, centered.

### What not to copy

- Ghost's sidebar navigation (we don't have admin-level complexity).
- The dark mode system (our users are public, not admin).
- Chart components (we may eventually want analytics but not now).

---

## 7. Quick Reference: Common Class Combinations

```tsx
// Primary button (Ghost-style)
"inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md
 bg-gray-900 text-white text-sm font-semibold whitespace-nowrap
 hover:bg-gray-900/90 transition-colors
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600
 disabled:opacity-50 disabled:pointer-events-none"

// Secondary / ghost button
"inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md
 bg-gray-100 text-gray-900 text-sm font-medium
 hover:bg-gray-200 transition-colors"

// Outline button
"inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md
 border border-gray-200 bg-white text-gray-900 text-sm font-medium
 hover:bg-gray-100 transition-colors"

// Text input
"h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1
 text-sm text-gray-900 placeholder:text-gray-400
 focus-visible:outline-none focus-visible:border-gray-600
 focus-visible:ring-2 focus-visible:ring-gray-600/25 transition-colors"

// Card
"rounded-xl border border-gray-200 bg-white p-6
 transition-shadow hover:shadow-sm"

// Badge / tag (neutral)
"inline-flex items-center rounded-sm border px-1.5
 text-xs font-semibold bg-transparent text-gray-700 border-gray-200"

// Badge / tag (tinted status)
"inline-flex items-center rounded-full px-2 py-0.5
 text-xs font-semibold bg-gray-100 text-gray-700"

// Section separator
"h-px w-full bg-gray-200"

// Sticky blur header
"sticky top-0 z-50 bg-gradient-to-b from-white via-white/70 to-white/70
 backdrop-blur-md px-6 py-4"

// Loading spinner (Ghost-style)
"animate-spin rounded-full h-5 w-5 border-2 border-black/10
 border-t-black"
```

---

## 8. Source references

All code was read directly from `github.com/TryGhost/Ghost` main branch:

- `apps/shade/tailwind.theme.css` — colour palette, typography scale, spacing, radius, animation tokens
- `apps/shade/theme-variables.css` — semantic colour tokens (light + dark)
- `apps/shade/src/components/ui/button.tsx` — button variants
- `apps/shade/src/components/ui/badge.tsx` — badge/tag variants
- `apps/shade/src/components/ui/input.tsx` — text input
- `apps/shade/src/components/ui/input-surface.ts` — shared input surface recipe
- `apps/shade/src/components/ui/card.tsx` — card variants
- `apps/shade/src/components/ui/select.tsx` — select/dropdown
- `apps/shade/src/components/ui/switch.tsx` — toggle switch
- `apps/shade/src/components/ui/tabs.tsx` — tab variants
- `apps/shade/src/components/ui/dialog.tsx` — modal/dialog
- `apps/shade/src/components/ui/separator.tsx` — divider
- `apps/shade/src/components/ui/skeleton.tsx` — loading skeleton
- `apps/shade/src/components/ui/loading-indicator.tsx` — spinner
- `apps/shade/src/components/ui/sonner.tsx` — toast notifications
- `apps/shade/src/components/ui/sidebar.tsx` — sidebar navigation
- `apps/shade/src/components/layout/header.tsx` — page header
- `apps/admin-x-design-system/src/global/button.tsx` — older button (for reference)
- `apps/admin-x-design-system/styles.base.css` — older base typography
