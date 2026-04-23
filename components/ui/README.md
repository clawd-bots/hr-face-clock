# Sweldo UI primitives

Every surface in this app is built from these primitives plus Sweldo design
tokens. When building something new, reach for a primitive before raw HTML.

See the live visual spec at [`/design`](../../app/design/page.tsx) — it renders
every primitive, token, and pattern so you can eyeball changes.

## Token reference

Tokens are declared in `app/sweldo-tokens.css` via Tailwind v4 `@theme {}`.
Use them as Tailwind utilities.

| Category    | Token prefix      | Example                                          |
|-------------|-------------------|--------------------------------------------------|
| Colors      | `sw-gold-*`, `sw-ink-*`, `sw-cream-*`, `sw-lilac-*`, `sw-success-*`, `sw-warn-*`, `sw-danger-*` | `bg-sw-gold-500`, `text-sw-ink-700`, `border-sw-ink-200` |
| Spacing     | default Tailwind  | `p-5` = 20 px, `gap-3` = 12 px (base = 4 px)     |
| Radius      | `sw-sm` → `sw-full` | `rounded-sw-lg` (20 px), `rounded-sw-pill` (40 px) |
| Shadows     | `shadow-sw-1/2/3`, `shadow-sw-ring-accent` | `shadow-sw-1` (resting card), `shadow-sw-ring-accent` (focus ring) |
| Motion      | `duration-sw-fast/normal`, `ease-sw-std` | `transition duration-sw-fast ease-sw-std`       |
| Typography  | `t-display`, `t-h2`–`t-h5`, `t-body-lg`, `t-body`, `t-caption`, `t-micro`, `t-eyebrow` | `<h1 className="t-display">…</h1>` |

Font is **Figtree** (variable, 100–900) via `next/font/local` — wired to
`--font-sans`. No font family needed on elements; Tailwind `font-sans`
resolves to Figtree.

## Primitives

### `Button`

```tsx
<Button variant="primary" size="md">Save</Button>
<Button variant="secondary" size="sm" asChild>
  <Link href="/employees">View all</Link>
</Button>
<Button variant="ghost">Cancel</Button>
```

- **variant**: `primary` (gold), `secondary` (white + border), `ghost`, `onDark` (white pill on dark surface)
- **size**: `sm` (34 px), `md` (44 px, default), `lg` (50 px) — all 40 px pill radius
- **asChild**: render as the child element (common: wrapping `<Link>`)

### `Chip`

Status badges. 26 px tall, 40 px pill.

```tsx
<Chip tone="success">Active</Chip>
<Chip tone="warn">Pending</Chip>
<Chip tone="danger">Rejected</Chip>
<Chip tone="lilac">Overtime</Chip>
<Chip tone="gold">Featured</Chip>
<Chip tone="neutral">Draft</Chip>
```

**Rule of thumb**: success = done/active/clocked-in, warn = pending/awaiting,
danger = rejected/error, lilac = overtime/scheduling/informational,
gold = featured/premium/role, neutral = default.

### `Card`

```tsx
<Card variant="cream">…</Card>   // white bg + ink-200 border (default)
<Card variant="wheat">…</Card>   // cream-25 bg — softer than cream on cream-50 page
<Card variant="lilac">…</Card>   // lilac-100 bg — attendance / scheduling surfaces
<Card variant="gold">…</Card>    // gold-500 bg + white text — hero / CTA
```

20 px radius, 24 px padding, `shadow-sw-1` by default. Override with
`className="shadow-sw-2 p-8"` etc.

### `Input`, `Textarea`, `Select`, `Label`

```tsx
<div>
  <Label>Email</Label>
  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
</div>
<div>
  <Label>Department</Label>
  <Select value={dept} onChange={(e) => setDept(e.target.value)}>
    <option value="">Select…</option>
    <option value="eng">Engineering</option>
  </Select>
</div>
<div>
  <Label>Notes</Label>
  <Textarea rows={4} />
</div>
```

- 44 px tall, 12 px radius, `sw-ink-200` border
- Focus: `sw-gold-500` border + `shadow-sw-ring-accent`
- Pair with `<Label>` above (6 px gap baked in)

### `Eyebrow`

Small pill used above hero headings. Gold hairline + gold text, `✦` default icon.

```tsx
<Eyebrow>New</Eyebrow>
<Eyebrow icon="✓">Verified</Eyebrow>
```

### `StatCard`

Dashboard summary metric.

```tsx
<StatCard label="Currently In" value={42} tone="success" />
<StatCard
  label="Payroll total"
  value="$64,000"
  tone="gold"
  delta={{ value: "3.2%", direction: "up" }}
/>
```

**tone**: `gold` (dark, hero), `lilac`, `success`, `neutral` (default, cream-25).

### `SweldoLogo`

Gold brand mark.

```tsx
<SweldoLogo />                             // gold (default) — use on cream/white
<SweldoLogo variant="white" />             // white fill — use on gold/dark bg
<SweldoLogo width={28} height={30} />      // default 24×26
```

### `SidebarNav`

Full sidebar shell — used by admin + employee layouts.

```tsx
<SidebarNav
  brand={<Link href="/admin"><SweldoLogo /> Sweldo</Link>}
  items={navItems}                 // { href, label, icon, exact? }[]
  activeHref={pathname}
  collapsed={collapsed}
  onToggle={() => setCollapsed(!collapsed)}
  footer={<UserMenu />}
  extraLinks={kioskLink}            // optional — e.g. link to /
/>
```

Icons come from `components/ui/icons.tsx` (lucide-react re-exports).

### `icons.tsx`

Single import surface for lucide icons. Add new ones here to keep the icon set
auditable.

```tsx
import { Grid, Users, LogIn, Check } from "@/components/ui/icons";
```

Default stroke 1.5, 20 × 20. Pass `className="w-4 h-4"` to resize.

## Composition patterns (no primitive — compose inline)

### Data table

```tsx
<div className="glass-card rounded-sw-lg overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="text-left bg-sw-cream-25 border-b border-sw-ink-100">
        <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">
          Name
        </th>
        {/* … */}
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-sw-ink-100 hover:bg-sw-cream-25 transition-colors duration-sw-fast">
        <td className="px-6 py-4 text-sw-caption font-medium text-sw-ink-900">Row</td>
        {/* … */}
      </tr>
    </tbody>
  </table>
</div>
```

Outer container is `.glass-card` (a legacy class that now renders as a flat
Sweldo surface — white bg, hairline border, `shadow-sw-1`). No row striping.
Hover state `bg-sw-cream-25`.

### Error banner

```tsx
<div className="px-4 py-3 bg-sw-danger-100 border border-sw-danger-500/20 rounded-[12px] text-sw-caption font-medium text-[#a11b35]">
  {errorMessage}
</div>
```

### Success card (kiosk-style)

```tsx
<Card variant="gold" className="text-center p-12 rounded-sw-xl shadow-sw-2">
  <h2 className="t-display text-sw-white">Welcome</h2>
  <p className="t-body-lg text-sw-white/90">Clocked in at 09:02</p>
</Card>
```

### Empty state inside a card

```tsx
<div className="glass-card rounded-sw-lg p-16 text-center">
  <p className="t-body text-sw-ink-500 mb-4">No employees registered yet.</p>
  <Button asChild variant="primary">
    <Link href="/admin/employees/register">Register your first employee</Link>
  </Button>
</div>
```

## Legacy `.glass-*` classes

`app/globals.css` defines `.glass-card`, `.glass-stat`, `.glass-table`,
`.glass-sidebar`, `.glass-nav-active`, `.glass-modal`. These are *not*
glass-morphism anymore — they were rewritten to Sweldo's flat aesthetic
(white/cream-25 bg, hairline borders, `shadow-sw-1/2`). The class names stuck
around so existing call sites didn't need to change.

Prefer composing with tokens directly on new code; keep `.glass-*` classes
where they already exist to reduce churn. If you want the names cleaned up,
it's a one-shot codemod (`.glass-card` → `.sw-card` etc.).

## When in doubt

1. Use a primitive if one exists.
2. Otherwise, build with tokens (`bg-sw-*`, `text-sw-*`, `rounded-sw-*`,
   `shadow-sw-*`) — **no inline hex codes**.
3. Visit `/design` to see the live reference.
