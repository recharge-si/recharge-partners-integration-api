# Guide for Coherent Design — Patrik Partner Portal

A practical reference for keeping the portal's UI **visually and behaviourally coherent**. It documents the conventions already established across `src/app` and `src/components` so that any new page, panel, or component looks and feels like it has always belonged.

> **Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 (`@tailwindcss/postcss`). No component library — everything is hand-rolled Tailwind utilities. There is no `tailwind.config.js`; theme tokens live in `src/app/globals.css` (`@import "tailwindcss"`) and as inline values.

---

## 1. Design north star

The portal is a **calm, dark, technical control surface** for partners who sync and export a live product catalog. Three words guide every decision:

1. **Quiet** — dark canvas, low-saturation surfaces, one accent colour used sparingly. Content and status are the only things allowed to be bright. Avoid decoration that competes with data.
2. **Confident** — generous spacing, clear hierarchy, rounded soft surfaces, subtle depth via blur. Never cramped, never loud.
3. **Trustworthy** — honest status (real ping dots, real relative times), explicit confirm/save affordances, no surprise actions. The user always knows what state a store/export is in.

If a new screen feels like a marketing page or a busy dashboard, it's wrong. The reference feel is the **authenticated home** (`src/app/page.js`) and the **Shopify integration page** (`src/components/ShopifyIntegrationPage.js`) — study those two before building anything new.

---

## 2. Colour system

The palette is **neutral-on-black with a single cyan accent**. Semantic tones (amber/red/green/violet) appear only to convey state.

### 2.1 Brand accent — cyan `#01a0be`

This exact hex is the **single brand colour**. It is hard-coded as `#01a0be` (not a Tailwind token) and appears ~216 times across the codebase. Use it for: primary buttons, active nav, focus rings, links-on-hover, icon tiles, selected rows, ping dots.

| Use | Value |
|---|---|
| Accent base | `#01a0be` |
| Accent hover (buttons) | `#018a9f` |
| Accent as Tailwind-ish tints | `bg-[#01a0be]/10`, `/15`, `/20` for fills; `border-[#01a0be]/20`–`/40` for borders; `ring-[#01a0be]/20`–`/60` for rings |
| Gradient partner (hero, CTAs) | `from-[#01a0be] to-cyan-300` (text) / `from-cyan-500 to-blue-500` (toggle) / `from-[#01a0be] to-violet-500` (tier CTA) |

Cyan-family Tailwind tokens (`cyan-300/400/500`, `sky`, `blue`) are used **only** for the ambient background blobs and gradients — never invent a second solid accent. When you need "the accent" in JS (dots, charts), reference `#01a0be` directly, as `DOT_COLOR`/`PingDot` do.

### 2.2 Neutrals (the entire UI is built from these)

| Token | Role |
|---|---|
| `bg-black` | Page canvas (`body`), nav bar (`bg-black/60`), modal scrim (`bg-black/80`) |
| `bg-neutral-900` | Card/panel surface — almost always at opacity: **`bg-neutral-900/60`** (primary cards), `/40` (nested/secondary cards), `/30` (quiet strips) |
| `bg-neutral-800` | Raised controls inside cards (secondary buttons `/60`, hover rows `/30`, mobile sub-cards `/40`) |
| `bg-neutral-700` | Toggle off-track, skeleton blocks, scrollbar thumb |
| `border-neutral-800` | **Default border for every card/section** |
| `border-neutral-700` | Border for interactive controls (inputs, secondary buttons, the Select button) |
| `text-neutral-100` | Headings (`h1–h3` via base layer) |
| `text-white` | Strong emphasis inside body (section titles, key values) |
| `text-neutral-300` | **Default body text** (set on `body`) |
| `text-neutral-400` | Secondary/descriptive copy under headings |
| `text-neutral-500` | Muted labels, captions, placeholder-ish hints |
| `text-neutral-600` | Disabled option text, hairline separators (`·`) |

**Rule of thumb:** surfaces get *more opaque and lighter* as they come forward (`/30 → /40 → /60`), text gets *darker/greyer* as it becomes less important (`white → 300 → 400 → 500`).

### 2.3 Semantic tones

Defined canonically as `BADGE_TONES` in `ShopifyIntegrationPage.js` — reuse these exact triplets anywhere you show status:

```js
const BADGE_TONES = {
  cyan:    "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",   // healthy / active / success-in-progress
  amber:   "bg-amber-500/10 text-amber-400 border-amber-500/20", // needs attention / partial / retry
  red:     "bg-red-500/10 text-red-400 border-red-500/30",       // error / failed / destructive
  green:   "bg-green-500/10 text-green-400 border-green-500/20",  // confirmed done (emerald used for "sent")
  neutral: "bg-neutral-700/40 text-neutral-300 border-neutral-600/40", // queued / type chips / idle
};
```

Tone → meaning mapping (keep consistent):
- **cyan** = the brand "good / live" state (active store, running/done sync, selected).
- **amber** = soft warning the user *can* act on (reconnect needed, partial, future-dated guard).
- **red** = failure or destructive action (disconnect, failed job).
- **green/emerald** = a completed positive outcome (`emerald-500/10 text-emerald-300` for "Request sent").
- **violet/fuchsia** = early-access program ("Alpha" tier). **Cyan = Beta tier.** Never use violet for anything but the tier/early-access program.

Dot colours (JS): `{ cyan:#01a0be, red:#f87171, amber:#fbbf24, neutral:#737373 }`.

---

## 3. Typography

Two Google fonts, wired in `src/app/layout.js` as CSS variables and applied in `globals.css`:

| Font | Variable | Used for |
|---|---|---|
| **Orbitron** (400, 700) | `--font-orbitron` | `h1, h2, h3` (base layer), brand wordmark "Partner Portal", hero headings. Apply explicitly with `font-orbitron` when you want the techy display look outside default headings. |
| **Montserrat** (400–700) | `--font-montserrat` | All body text (`body` font-family), most in-card titles. Reference explicitly via `font-[family-name:var(--font-montserrat)]` when overriding a heading default (e.g. the store-domain title). |

Base settings (`globals.css`): `body` is `text-neutral-300 antialiased`, `line-height: 1.6`. Headings are `text-neutral-100 mb-2` by default — note the **default `mb-2` on headings**; in compact headers it's overridden with `mb-0`.

### Type scale in practice

| Context | Classes |
|---|---|
| Public hero H1 | `font-orbitron text-4xl font-bold tracking-tight sm:text-5xl` |
| Authed page H1 | `font-orbitron text-3xl font-bold tracking-tight sm:text-4xl` |
| **Compact page header H1** (Shopify/Export/Categories) | `text-xl font-bold leading-none tracking-tight text-white mb-0` |
| Section title (H2 in card) | `text-lg font-semibold text-white` |
| Tile/card title | `text-lg font-semibold text-white` |
| Body / description | `text-sm text-neutral-400` (or `leading-relaxed` for paragraphs) |
| Caption / label | `text-xs text-neutral-500`; uppercase eyebrow `text-[10px]/[11px] font-semibold uppercase tracking-widest` |
| Mono (codes, SKUs, domains in tables) | `font-mono text-neutral-200`; numbers `tabular-nums` |

Headline gradient (use only for the single focal hero word):
```jsx
<span className="bg-gradient-to-r from-[#01a0be] to-cyan-300 bg-clip-text text-transparent">built for partners.</span>
```

---

## 4. Layout & spacing

### 4.1 Page shell

Every protected page route renders this exact wrapper (see `integrations/shopify/page.js`):

```jsx
<div className="relative bg-transparent py-6 lg:py-8">
  <div className="relative mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
    {/* page content */}
  </div>
</div>
```

- **Max width:** `max-w-screen-2xl` for app pages (matches the nav bar). Focused/centred screens (home, login, tier gate) narrow to `max-w-2xl`/`max-w-3xl`.
- **Horizontal padding:** always `px-4 sm:px-6 lg:px-8`.
- **Vertical rhythm:** `py-6 lg:py-8` page padding; **`space-y-6` between sections** inside a page.
- Background stays `transparent` so the global animated blobs (in `layout.js`) show through.

### 4.2 The compact page header (standard across feature pages)

Icon tile + title + tier/category badge on the left, a single ghost action (e.g. "Guide") on the right:

```jsx
<header className="mb-6 flex items-center justify-between gap-3">
  <div className="flex min-w-0 items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#01a0be]/30 bg-[#01a0be]/10">
      <Icon className="h-5 w-5 text-[#01a0be]" />
    </div>
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h1 className="mb-0 text-xl font-bold leading-none tracking-tight text-white">Title</h1>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#01a0be]/25 bg-[#01a0be]/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest text-[#01a0be]">Eyebrow</span>
      </div>
      <p className="mt-1 hidden text-xs text-neutral-500 sm:block">One-line description of the page.</p>
    </div>
  </div>
  {/* right-aligned ghost button */}
</header>
```

The icon tile is the recurring motif: `h-10 w-10` (page header) or `h-11 w-11` (home tiles), `rounded-xl`, tinted fill `bg-<tone>/10` + matching `border-<tone>/20–30`. The Shopify page tints its tile in Shopify-green `#95BF47` because it represents that brand — when a panel represents an external brand, tint the tile in that brand's colour; otherwise use cyan.

### 4.3 Section card (the workhorse surface)

```jsx
<section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-sm sm:p-6 lg:p-8">
  <SectionHeading title="…" desc="…" icon={…} right={…} />
  {/* … */}
</section>
```

- **Radius:** cards/sections `rounded-2xl`; large feature/marketing cards `rounded-3xl`; controls/buttons/inputs/rows `rounded-xl`; small chips/menu items `rounded-lg`; pills/badges/dots `rounded-full`.
- **Padding:** responsive `p-4 sm:p-6 lg:p-8` for full sections; `p-6` for simpler ones; `p-3`/`p-4` for nested rows.
- Always `backdrop-blur-sm` on translucent cards so the blobs diffuse pleasantly behind them.

Section heading helper (mirror `SectionHeading` in `ShopifyIntegrationPage.js`):
```jsx
<div className="mb-5 flex items-start justify-between gap-4">
  <div className="min-w-0">
    <h2 className="flex items-center gap-2 text-lg font-semibold text-white">{icon}{title}</h2>
    {desc && <p className="mt-1 text-sm text-neutral-400">{desc}</p>}
  </div>
  {right}
</div>
```

---

## 5. Surfaces, depth & the animated background

- **Global blobs:** `layout.js` paints 8 absolutely-positioned blurred circles (`bg-blue/cyan/sky-*/10–20`, `blur-2xl/3xl`, `animate-blob*`). They live behind a `z-10` content layer. Never add competing full-page backgrounds; let these show through `bg-transparent` pages.
- **Elevation ladder:** flat page → `bg-neutral-900/60` card → nested `bg-neutral-900/40` → raised control `bg-neutral-800/60`. Reinforce with `backdrop-blur-sm` (cards), `backdrop-blur-md` (nav, scrims, save bar), `backdrop-blur-xl` (portaled Select menu).
- **Shadows** are used sparingly and only for genuine elevation: `shadow-lg shadow-[#01a0be]/20` on primary buttons (a cyan glow, not a black shadow), `shadow-2xl` on modals and the Select dropdown, `shadow-xl shadow-black/40` on nav dropdowns.
- **Rings** denote focus/selection: `ring-1 ring-[#01a0be]/20` (focused input), `ring-2 ring-[#01a0be]/60` (focus-visible), `ring-1 ring-neutral-700/60` (dropdown edge).

---

## 6. Component patterns

### 6.1 Buttons

| Variant | Classes | When |
|---|---|---|
| **Primary** | `inline-flex items-center justify-center gap-2 rounded-xl bg-[#01a0be] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#01a0be]/20 transition-all hover:bg-[#018a9f] disabled:cursor-not-allowed disabled:opacity-50` | The one main action per context (Connect, Sync now, Save changes) |
| **Secondary / ghost** | `inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-3 text-sm font-medium text-neutral-300 transition-colors hover:border-[#01a0be]/40 hover:text-white` | View details, Guide, Discard |
| **Small ghost (header)** | `… rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm font-medium …` | Header "Guide" button |
| **Danger (solid)** | `rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500` | Confirmed destructive (Yes, disconnect) |
| **Danger (outline)** | `rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-2.5 text-sm font-semibold text-red-400 hover:border-red-500/60 hover:bg-red-500/10` | Initiate destructive (Disconnect) |
| **Warning** | `rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400` | Reconnect |
| **Gradient (tier CTA only)** | `rounded-xl bg-gradient-to-r from-[#01a0be] to-violet-500 … hover:brightness-110` | TierGate "Request access" |

Conventions: buttons are `text-sm font-semibold`, `rounded-xl` (large) or `rounded-lg` (compact), always `inline-flex items-center gap-2`, always carry a leading icon for primary actions, always include `disabled:cursor-not-allowed disabled:opacity-50`. Loading state swaps the icon for `<SpinnerIcon />` and changes the label (`"Sync now" → "Syncing…"`). Use the `…` ellipsis character for in-progress labels.

Text link (inline): `font-medium text-neutral-300 transition-colors hover:text-[#01a0be]`, often with a trailing `→`. The animated arrow `group-hover:translate-x-1` is a recurring delight on tiles and CTAs.

### 6.2 Badges & pills

Status badge (`StatusBadge`): `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium` + a `BADGE_TONES[tone]` class. Eyebrow/category pill: `rounded-full border border-[#01a0be]/25 bg-[#01a0be]/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest text-[#01a0be]`. Tier badge (nav): alpha = `from-violet-500/20 to-fuchsia-500/20 text-violet-300 ring-violet-400/30`, beta = `from-[#01a0be]/20 to-cyan-400/20 text-cyan-300 ring-cyan-400/30`.

### 6.3 Ping dot (live status)

The signature "is it alive" indicator — a solid dot with an animated ping ring when healthy (`PingDot`):
```jsx
<span className="relative flex h-2.5 w-2.5 shrink-0">
  {healthy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor }} />}
  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor }} />
</span>
```
Only the **cyan/healthy** state pings; amber/red/neutral are static. Reuse for store status, running jobs, and the nav status strip.

### 6.4 Toggle switch

A peer-checkbox track (`ToggleSwitch`), the only "on" control that uses the cyan→blue gradient:
```jsx
<input type="checkbox" className="sr-only peer" … />
<span className="w-10 h-6 rounded-full bg-neutral-700 transition-all duration-200
  peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-500
  after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px]
  after:rounded-full after:bg-white after:shadow-sm after:transition-all after:duration-200
  peer-checked:after:translate-x-[16px]" />
```
Wrap in a `<label>` so the whole row is clickable. Use toggles for boolean sync/feature flags; use radios for mutually-exclusive modes (ownership mode); use the custom Select for value pickers.

### 6.5 Select (custom dropdown — `components/ui/Select.js`)

**Always use this shared `<Select>` instead of native `<select>`.** It accepts `<option>` children, emits `onChange({ target: { value } })` (drop-in for native handlers), and provides full keyboard nav, a portaled `position:fixed` menu, cyan focus ring, and a check on the selected row. Button styling to match if you build a sibling control: `rounded-xl border bg-neutral-900/60 px-4 py-3.5 text-sm backdrop-blur-sm`, focused → `border-[#01a0be]/60 ring-1 ring-[#01a0be]/20`.

### 6.6 Inputs / form fields

Text inputs follow the Select button shape: `rounded-lg/xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm text-white placeholder-neutral-500 backdrop-blur-sm focus:border-[#01a0be]/60 focus:ring-1 focus:ring-[#01a0be]/20`. Labels sit above as `text-xs text-neutral-500 mb-1.5` (or `mb-2`). Group field rows with `grid … sm:grid-cols-[1fr_1fr_auto] sm:items-end gap-3`.

### 6.7 Tables (desktop) + card fallback (mobile)

Tables are **borderless with row dividers**, and **always** paired with a `md:hidden` stacked-card version for mobile (see the sync-activity table):

```jsx
<table className="w-full text-sm">
  <thead><tr className="text-left text-neutral-500">
    <th className="px-4 py-3 font-medium">Type</th> …
  </tr></thead>
  <tbody className="divide-y divide-neutral-800">
    <tr className="cursor-pointer hover:bg-neutral-800/30" onClick={…}>
      <td className="px-4 py-3"><StatusBadge … /></td>
      <td className="px-4 py-3"><span className="font-mono text-neutral-200">{code}</span></td>
      <td className="px-4 py-3 text-right tabular-nums text-neutral-400">{n}</td>
      <td className="max-w-[240px] truncate px-4 py-3 text-neutral-500" title={detail}>{detail}</td>
    </tr>
  </tbody>
</table>
```
Header cells: `text-neutral-500 font-medium`. Cells: `px-4 py-3`. Numbers right-aligned + `tabular-nums`. Codes/SKUs in `font-mono`. Long text `truncate` with a `title` tooltip. Rows that open detail are `cursor-pointer hover:bg-neutral-800/30`. Below `md`, render each row as a `rounded-xl border border-neutral-700/50 bg-neutral-800/40 p-4` card with a `<dl>` of label/value pairs.

### 6.8 Modals

Full-screen scrim + centred panel, click-scrim-to-close, inner `stopPropagation`, mobile-first (full-height sheet on phones, centred card ≥sm):
```jsx
<div className="fixed inset-0 z-[60] flex bg-black/80 backdrop-blur-md sm:items-center sm:justify-center sm:p-6" onClick={close}>
  <div className="flex h-full w-full flex-col overflow-hidden bg-neutral-900 shadow-2xl sm:h-auto sm:max-h-[88vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-neutral-800" onClick={e => e.stopPropagation()}>
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-800 px-5 py-4 sm:px-6">…header…</div>
    <div className="overflow-y-auto …">…body…</div>
    <div className="… border-t border-neutral-800 …">…actions ending in a primary button…</div>
  </div>
</div>
```
Scrim `bg-black/80 backdrop-blur-md`, panel `bg-neutral-900` (opaque, not translucent), `z-[60]`. Confirm dialogs end with the primary/danger action on the right.

### 6.9 Sticky save bar

When config is dirty, a bottom bar slides in (`animate-fade-in`) and Sync is disabled until saved:
```jsx
<div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-black/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md animate-fade-in">
  <div className="mx-auto flex max-w-screen-2xl … px-4 py-3 sm:px-6 lg:px-8">
    <p className="text-sm text-neutral-400">Unsaved changes for <span className="font-medium text-neutral-200">{name}</span>.</p>
    <div className="flex gap-2">{/* Discard (secondary) + Save changes (primary) */}</div>
  </div>
</div>
```
Account for it with bottom page padding (`pb-40 sm:pb-32`) so content isn't hidden. If the user attempts a blocked action, `animate-shake` + a cyan ring draws their eye to the Save button (`saveShake` pattern).

### 6.10 Loading skeletons (`loading.js` per route)

Every async route ships a `loading.js` that **mirrors the real layout's structure** with `animate-pulse` blocks: same header (icon tile + title + badge), same section cards (`rounded-2xl border border-neutral-800`), greyed placeholders `bg-neutral-700/30–50`. Match the real spacing (`space-y-6`, `p-6 sm:p-8`) so there's no layout shift when content arrives.

### 6.11 Empty / access-restricted / tier-gate states

- **Access restricted** (role missing): a centred `rounded-2xl bg-neutral-800/50 border-neutral-700/50` card with a lock icon, `text-xl font-semibold` heading, and a `text-neutral-400` explanation.
- **Tier gate** (`TierGate.js`): a premium `rounded-3xl` card with an ambient glow, a `h-1 gradient hairline` top border (`from-[#01a0be] via-violet-500 to-fuchsia-500`), program chip, perk list, and a single gradient CTA. Use for early-access features; keep the feature discoverable in the nav with an "Alpha"/"Beta" badge.

---

## 7. Iconography

- **Heroicons v2, outline style**, drawn inline as `<path d="…">` (no icon package). Standard SVG attrs: `fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"` with `strokeLinecap="round" strokeLinejoin="round"`.
- Default size `h-5 w-5` (nav/section), `h-4 w-4` (inline/buttons), `h-3 w-3` (badge). Icons inherit colour via `currentColor` — tint the parent.
- Heavier strokes (`strokeWidth={2}`) only for small chevrons/arrows where 1.5 looks thin.
- Keep a small keyed `ICONS`/`ICON_PATHS` map per component (as Navbar and home do) rather than scattering raw SVGs.

---

## 8. Motion

All keyframes live in `globals.css`; keep animation purposeful and short.

| Utility | Keyframe | Use |
|---|---|---|
| `animate-fade-in` | `fadeIn` (0.3s, translateY) | Page/section entrance, save bar |
| `animate-dropdown` | `dropdown` (0.15s, scale+translate) | Nav & Select menus |
| `animate-shake` | `shake` (0.45s) | Draw attention to a blocked Save |
| `animate-ping` (Tailwind) | — | Live status dots |
| `animate-pulse` (Tailwind) | — | Skeletons |
| `animate-blob` / `2` / `3` (+ `animation-delay-2000/4000/6000`) | `blob*` (25–35s) | Background only |

Transitions: prefer `transition-colors` for hovers; `transition-all duration-200` for toggles/controls; `transition-transform` for chevrons (`rotate-180` when open) and the `group-hover:translate-x-1` arrow. Durations stay ≤ 300ms except the ambient blobs.

---

## 9. Navigation

The `Navbar` (`components/Navbar.js`) is `sticky top-0 z-50 bg-black/60 backdrop-blur-md border-b border-neutral-800`. Patterns to preserve:
- Logo + `font-orbitron` "Partner Portal" wordmark on the left; grouped dropdowns ("Products", "Integrations") + profile on the right; hamburger sheet on mobile.
- **Active route** highlight: `text-[#01a0be]` plus an animated underline (`after:` pseudo, `after:bg-[#01a0be]`, `scale-x-0 → scale-x-100`). Dropdown children active state: `bg-[#01a0be]/10 text-[#01a0be]`.
- Dropdowns close on outside-click and `Escape`; chevron rotates 180°. Each child row shows an icon tile + label + description + optional tier badge.
- Mirror new top-level destinations into both the desktop dropdown and the mobile grouped sheet, gated by the same role logic (`https://time-4-action.com/roles`).

---

## 10. Voice & copy

- **Sentence case** everywhere (buttons, headings, labels) — not Title Case. "Sync now", "View details", "Request access".
- **Short, plain, reassuring.** Describe outcomes and safety: *"Reconnect to refresh permissions and resume syncing — your store data is untouched."*
- Use an em-dash `—` for asides and the ellipsis char `…` for in-progress states.
- Greet by first name on the authed home ("Hi, {firstName}").
- Status copy is concrete and relative: "synced 10m ago", "reconnect needed", "2 stores connected · 1 needs attention".
- Lead with the user's benefit, not the mechanism ("Keep it stocked automatically" before listing stock/prices/images).

---

## 11. Accessibility

Already-established baseline to maintain:
- Focus rings on every interactive element: `focus-visible:outline-2 focus-visible:outline-[#01a0be]` or `focus-visible:ring-2 focus-visible:ring-[#01a0be]/60`. Never remove focus styling without a replacement.
- Semantic roles on custom widgets: the Select uses `role="combobox"/"listbox"/"option"`, `aria-expanded`, `aria-selected`; dropdowns use `role="menu"/"menuitem"`, `aria-haspopup`, `aria-current="page"`.
- `aria-label` on icon-only buttons and toggles; `sr-only` text for icon-only triggers (hamburger, profile).
- Keyboard support: menus/selects handle Arrow/Home/End/Enter/Escape; modals close on Escape and scrim click.
- Honour `prefers` constraints implicitly by keeping motion subtle and short; the only infinite animations are decorative background blobs and status pings.
- Render deterministic dates (UTC formatting helpers) to avoid SSR/client hydration drift — reuse `fmtDateTime`/`relTime` rather than `toLocaleString` in render.

---

## 12. Responsiveness

- **Mobile-first**, breakpoints `sm` (640) and `lg` (1024) carry most of the work; `md` (768) toggles table-vs-card.
- Padding scales `p-4 sm:p-6 lg:p-8`; text scales `text-3xl sm:text-4xl`.
- Two-column content collapses to one: `grid grid-cols-1 sm:grid-cols-2` / `flex flex-col lg:flex-row`.
- Tables become stacked cards under `md` (§6.7). Action button pairs become `flex-col-reverse … sm:flex-row` so the primary sits on top on mobile.
- Hide non-essential header descriptions on phones (`hidden … sm:block`). Buttons go full-width on mobile (`w-full sm:w-auto`).

---

## 13. Quick do / don't checklist

**Do**
- Reuse the shared primitives: `<Select>`, `StatusBadge`/`BADGE_TONES`, `PingDot`, `ToggleSwitch`, `SectionHeading`, the page-shell + compact-header pattern.
- Use `#01a0be` for *the* accent; semantic tones only for state.
- Wrap content in `rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm` sections with `space-y-6`.
- Ship a structure-matching `loading.js` for every async route.
- Pair every table with a mobile card view.
- Give primary actions an icon + loading state; gate destructive actions behind a confirm step.

**Don't**
- Don't introduce a second solid accent colour, a component library, or `tailwind.config.js` tokens that fork from the inline scale.
- Don't use native `<select>` — use the custom one.
- Don't use pure-black card surfaces or pure-white body text by default (`neutral-900/60` and `neutral-300` are the defaults).
- Don't use Title Case, heavy drop-shadows, or animations longer than ~300ms (except background blobs).
- Don't paint full-page backgrounds that hide the global blobs — keep pages `bg-transparent`.
- Don't let modals/save bars overlap content — add `z-[60]`/`z-40` and bottom padding respectively.

---

## 14. Reference files

| Pattern | Source of truth |
|---|---|
| Tokens, fonts, keyframes, scrollbar | `src/app/globals.css` |
| Page shell, blobs, font wiring | `src/app/layout.js` |
| Hero / authed home / tiles / status strip | `src/app/page.js` |
| Nav, dropdowns, active state, badges | `src/components/Navbar.js` |
| Buttons, cards, modals, tables, save bar, badges, dots, toggles, headers | `src/components/ShopifyIntegrationPage.js` |
| Custom dropdown | `src/components/ui/Select.js` |
| Early-access / premium card | `src/components/TierGate.js` |
| Skeleton convention | any `loading.js` (e.g. `integrations/shopify/loading.js`) |
| Page-shell + role/tier gating | `src/app/(protected)/integrations/shopify/page.js` |

When in doubt, copy the closest existing pattern from these files rather than inventing a new one — coherence beats novelty here.
