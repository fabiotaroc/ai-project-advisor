---
name: Dark Mode Implementation
overview: Add a full light/dark/system theme experience using the app's existing token-based CSS in `src/app/globals.css`, wire a persistent class-based theme controller into the root layout, expose a toggle in shared UI, and audit hardcoded light-only colors so all major routes render correctly in both themes.
todos:
  - id: theme-state
    content: Add a client theme provider that controls the `dark` class on `<html>` and persists light/dark/system preference
    status: completed
  - id: root-layout
    content: Update `src/app/layout.tsx` to mount the provider safely for SSR/hydration and add `suppressHydrationWarning`
    status: completed
  - id: theme-toggle
    content: Add a reusable theme toggle component and place it in shared navigation/header surfaces
    status: completed
  - id: semantic-tokens
    content: Extend `src/app/globals.css` only where needed with any missing semantic status tokens for success/warning/error states
    status: completed
  - id: ui-audit
    content: Replace raw light-biased colors in app surfaces with semantic token-driven classes or explicit dark variants
    status: completed
  - id: verification
    content: Manually verify public, auth, and authenticated app routes in light, dark, and system modes
    status: completed
isProject: false
---

## Current state

The app is already close to supporting dark mode:

- `src/app/globals.css` already defines both `:root` and `.dark` token sets.
- The project already enables Tailwind's class-based dark variant with `@custom-variant dark (&:is(.dark *));`.
- Most shadcn/ui components already rely on semantic tokens like `bg-background`, `bg-card`, `text-foreground`, and `border-border`.

What is missing is the runtime theme controller and a cleanup pass for a few hardcoded colors that will look wrong in dark mode.

## Proposed implementation

### 1. Use class-based theming on `<html>`

Because the CSS is already set up around a `.dark` class, I would keep that approach and avoid a separate theme stylesheet.

Recommended implementation:

- Add `next-themes`.
- Create a small client provider, e.g. `src/components/providers/theme-provider.tsx`.
- Configure it with:
  - `attribute="class"`
  - `defaultTheme="system"`
  - `enableSystem`
  - `disableTransitionOnChange`

Why this fits the repo:

- It matches the existing shadcn pattern.
- It persists preference automatically.
- It avoids building custom localStorage + matchMedia wiring from scratch.
- It works cleanly with the already-defined `.dark` token block.

### 2. Update the root layout for SSR-safe theming

File: `src/app/layout.tsx`

I would:

- Add `suppressHydrationWarning` to `<html>` because the theme class may differ between server render and client hydration.
- Wrap the app body in the new `ThemeProvider`.
- Keep the existing font variables and `font-sans` class on `<html>`.

Target outcome:

- The `dark` class can be applied at the top of the tree.
- All token-based styles update automatically.
- Hydration warnings are avoided.

### 3. Add a reusable theme toggle component

I would add a client component such as:

- `src/components/theme/theme-toggle.tsx`

Behavior:

- Lets the user pick `light`, `dark`, or `system`.
- Uses an existing shadcn primitive already in the repo, most likely `DropdownMenu` or `Select`.
- Shows an icon state with `Sun`, `Moon`, and possibly `Monitor` from `lucide-react`.

Likely placements:

- `src/components/layout/header.tsx` for authenticated pages.
- Optionally the public homepage and auth pages if we want theme switching before login too.

My preference would be:

- Put the toggle in the shared header first.
- If public/auth pages do not render that header, add the same reusable toggle there rather than duplicating logic.

### 4. Audit and replace hardcoded colors that are light-only

Most of the app is token-based already, but there are a few places that should be normalized so they also look right in dark mode.

Known examples from the current codebase:

- `src/app/(app)/app/page.tsx`
  - `border-amber-300/70 bg-amber-50 text-amber-700`
  - `border-red-300/70 bg-red-50 text-red-700`
- `src/components/settings/project-identity-card.tsx`
  - `bg-emerald-600 hover:bg-emerald-700`
- `src/components/sources/sources-panel.tsx`
  - `text-green-600`

I would handle this in one of two ways:

1. Prefer semantic tokens where the meaning is generic enough.
2. Add a few semantic status tokens in `src/app/globals.css` if the app needs repeatable success/warning styling, for example:
   - `--success`, `--success-foreground`
   - `--warning`, `--warning-foreground`

That keeps dark mode maintainable and avoids scattering one-off `dark:*` overrides across many files.

### 5. Confirm all major surfaces inherit correctly

After the provider is in place, many views should work automatically because they already use semantic tokens. I would still explicitly verify:

- Public landing page: `src/app/page.tsx`
- Auth flows:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(auth)/signup/page.tsx`
  - `src/components/auth/auth-form.tsx`
- Authenticated shell:
  - `src/components/layout/header.tsx`
  - `src/components/layout/sidebar.tsx`
- Dashboard and content panels:
  - `src/app/(app)/app/page.tsx`
  - files, sources, search, settings, wiki, and activity components under `src/components/`

Specific things to check:

- card/background contrast
- muted text readability
- hover/active states
- borders on dark surfaces
- dialogs, dropdowns, and command/search overlays
- status badges and error/success messaging

### 6. Add a small polish pass for browser color-scheme behavior

Optional but worthwhile:

- Ensure the active theme also sets a matching browser `color-scheme` so native form controls and scrollbars align better.
- If desired later, add dynamic `theme-color` metadata for mobile browser chrome.

This is not required for the first pass, but it is a good follow-up once the main theme switch works.

## Files I would expect to touch

### New

- `src/components/providers/theme-provider.tsx`
- `src/components/theme/theme-toggle.tsx`

### Modified

- `src/app/layout.tsx`
- `src/components/layout/header.tsx`
- `src/app/page.tsx` or `src/components/auth/auth-form.tsx` if we want the toggle on unauthenticated routes too
- `src/app/globals.css`
- `src/app/(app)/app/page.tsx`
- `src/components/settings/project-identity-card.tsx`
- `src/components/sources/sources-panel.tsx`

### Dependency

- `package.json` to add `next-themes`

## Rollout order

1. Add `next-themes` and create the provider.
2. Wire the provider into `src/app/layout.tsx`.
3. Add the toggle UI in the header.
4. Audit and fix hardcoded colors.
5. Manually test light/dark/system across key routes.
6. Do a final visual polish pass.

## Acceptance criteria

Dark mode is done when:

- users can switch between light, dark, and system themes
- the choice persists across reloads
- no hydration warning appears from theme class changes
- public, auth, and app routes are readable in both themes
- status badges, alerts, and action states remain visually clear in dark mode
- the implementation continues to rely on the existing token system in `src/app/globals.css`
