"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StatCard } from "@/components/ui/StatCard";
import { SweldoLogo } from "@/components/ui/SweldoLogo";
import { Check, LogIn } from "@/components/ui/icons";

export default function DesignSpecPage() {
  const [inputVal, setInputVal] = useState("");

  return (
    <div className="min-h-screen bg-sw-cream-50 py-12 px-8">
      <div className="max-w-[1100px] mx-auto">
        <Header />
        <Section id="logo" title="Logo">
          <div className="flex items-center gap-10 flex-wrap">
            <LogoSwatch label="gold (default) — on cream/white">
              <SweldoLogo width={32} height={35} />
            </LogoSwatch>
            <LogoSwatch label='variant="white" — on gold/dark' dark>
              <SweldoLogo variant="white" width={32} height={35} />
            </LogoSwatch>
            <LogoSwatch label="with wordmark">
              <div className="inline-flex items-center gap-2.5">
                <SweldoLogo width={28} height={30} />
                <span className="t-h3 text-sw-ink-900">Sweldo</span>
              </div>
            </LogoSwatch>
          </div>
        </Section>

        <Section id="colors" title="Colors">
          <Group title="Gold">
            <Swatch name="sw-gold-50" hex="#faf2dc" />
            <Swatch name="sw-gold-100" hex="#f4e3b8" />
            <Swatch name="sw-gold-500" hex="#c9972e" />
            <Swatch name="sw-gold-600" hex="#a27420" />
          </Group>
          <Group title="Ink (warm neutrals)">
            <Swatch name="sw-ink-100" hex="#ece8df" />
            <Swatch name="sw-ink-200" hex="#d9d5cc" />
            <Swatch name="sw-ink-300" hex="#b9b5ad" />
            <Swatch name="sw-ink-500" hex="#76726a" />
            <Swatch name="sw-ink-700" hex="#3a362f" />
            <Swatch name="sw-ink-900" hex="#1c1a16" />
          </Group>
          <Group title="Surfaces">
            <Swatch name="sw-cream-50" hex="#fefefd" />
            <Swatch name="sw-cream-25" hex="#f6f5f1" />
            <Swatch name="sw-white" hex="#ffffff" />
          </Group>
          <Group title="Feature tints">
            <Swatch name="sw-lilac-100" hex="#e7e6f5" />
            <Swatch name="sw-lilac-500" hex="#8a7df0" />
            <Swatch name="sw-violet-600" hex="#7c3aed" />
          </Group>
          <Group title="Status">
            <Swatch name="sw-success-100" hex="#cdeedb" />
            <Swatch name="sw-success-500" hex="#23a55a" />
            <Swatch name="sw-warn-100" hex="#fbecb6" />
            <Swatch name="sw-warn-500" hex="#f3c33b" />
            <Swatch name="sw-danger-100" hex="#ffd6de" />
            <Swatch name="sw-danger-500" hex="#f43f5e" />
          </Group>
        </Section>

        <Section id="typography" title="Typography">
          <TypeRow cls="t-display" spec="40 / 600 / -1.6">
            From clock-in to payslip
          </TypeRow>
          <TypeRow cls="t-h2" spec="36 / 600 / -1.44">
            Pricing that scales with your team
          </TypeRow>
          <TypeRow cls="t-h3" spec="24 / 600 / -0.96">Currently Clocked In</TypeRow>
          <TypeRow cls="t-h4" spec="20 / 600 / -0.8">Face Registration</TypeRow>
          <TypeRow cls="t-h5" spec="18 / 600 / -0.72">Details</TypeRow>
          <TypeRow cls="t-body-lg" spec="18 / 400 / -0.36">
            One system from clock-in to payslip, built for Philippine HR teams.
          </TypeRow>
          <TypeRow cls="t-body" spec="16 / 400 / -0.32">
            Sweldo cut our monthly payroll close from three days to one afternoon.
          </TypeRow>
          <TypeRow cls="t-caption" spec="14 / 400 / -0.28">
            Labels, meta, form labels
          </TypeRow>
          <TypeRow cls="t-micro" spec="12 / 400">Table headers, footnotes</TypeRow>
          <TypeRow cls="t-eyebrow" spec="14 / 500 / capitalize">Eyebrow</TypeRow>
        </Section>

        <Section id="radius" title="Radius">
          <div className="flex gap-6 flex-wrap">
            <RadiusSwatch name="sw-sm" px={8} />
            <RadiusSwatch name="sw-md" px={16} />
            <RadiusSwatch name="sw-lg" px={20} />
            <RadiusSwatch name="sw-xl" px={24} />
            <RadiusSwatch name="sw-pill" px={40} pill />
            <RadiusSwatch name="sw-full" circle />
          </div>
        </Section>

        <Section id="shadows" title="Shadows">
          <div className="flex gap-8 flex-wrap">
            <ShadowSwatch name="shadow-sw-1" />
            <ShadowSwatch name="shadow-sw-2" />
            <ShadowSwatch name="shadow-sw-3" />
            <div className="space-y-2">
              <div className="w-40 h-24 rounded-sw-lg bg-sw-white shadow-sw-ring-accent" />
              <div className="text-sw-micro text-sw-ink-500">shadow-sw-ring-accent</div>
            </div>
          </div>
        </Section>

        <Section id="button" title="Button">
          <Group title="Variants (size md)">
            <div className="flex gap-3 items-center flex-wrap">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <div className="bg-sw-ink-900 p-4 rounded-sw-lg">
                <Button variant="onDark">On Dark</Button>
              </div>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </Group>
          <Group title="Sizes">
            <div className="flex gap-3 items-center flex-wrap">
              <Button size="sm">Small (34px)</Button>
              <Button size="md">Medium (44px)</Button>
              <Button size="lg">Large (50px)</Button>
            </div>
          </Group>
          <Group title="With icon">
            <div className="flex gap-3 items-center flex-wrap">
              <Button variant="primary">
                <LogIn className="w-4 h-4" />
                Sign in
              </Button>
              <Button variant="secondary">
                <Check className="w-4 h-4" />
                Confirm
              </Button>
            </div>
          </Group>
          <CodeBlock>{`<Button variant="primary" size="md">Save</Button>`}</CodeBlock>
        </Section>

        <Section id="chip" title="Chip">
          <div className="flex gap-2 items-center flex-wrap">
            <Chip tone="neutral">Neutral</Chip>
            <Chip tone="success">Active</Chip>
            <Chip tone="warn">Pending</Chip>
            <Chip tone="danger">Rejected</Chip>
            <Chip tone="lilac">Overtime</Chip>
            <Chip tone="gold">Featured</Chip>
          </div>
          <CodeBlock>{`<Chip tone="success">Active</Chip>`}</CodeBlock>
        </Section>

        <Section id="card" title="Card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="cream">
              <div className="t-h5 mb-1">Cream</div>
              <div className="t-body text-sw-ink-500">Default. White bg, ink-200 border.</div>
            </Card>
            <Card variant="wheat">
              <div className="t-h5 mb-1">Wheat</div>
              <div className="t-body text-sw-ink-500">Cream-25 bg, ink-200 border.</div>
            </Card>
            <Card variant="lilac">
              <div className="t-h5 mb-1">Lilac</div>
              <div className="t-body text-sw-ink-700">Lilac-100 bg. For attendance/scheduling.</div>
            </Card>
            <Card variant="gold">
              <div className="t-h5 mb-1 text-sw-white">Gold</div>
              <div className="t-body text-sw-white/90">Gold-500 bg, white text. Hero/CTA surface.</div>
            </Card>
          </div>
          <CodeBlock>{`<Card variant="wheat"><h3>…</h3></Card>`}</CodeBlock>
        </Section>

        <Section id="stat" title="StatCard">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Total Employees" value={128} tone="gold" />
            <StatCard
              label="Currently In"
              value={42}
              tone="success"
              delta={{ value: "3.2%", direction: "up" }}
            />
            <StatCard label="Clocked Out" value={86} tone="neutral" />
            <StatCard label="Hours Today" value="287.5" tone="lilac" />
          </div>
          <CodeBlock>{`<StatCard label="Currently In" value={42} tone="success"
  delta={{ value: "3.2%", direction: "up" }} />`}</CodeBlock>
        </Section>

        <Section id="form" title="Form controls">
          <div className="max-w-md space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select defaultValue="">
                <option value="">Select…</option>
                <option value="eng">Engineering</option>
                <option value="hr">HR</option>
                <option value="ops">Operations</option>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Anything else we should know?" />
            </div>
            <div>
              <Label>Disabled</Label>
              <Input disabled placeholder="Read only" />
            </div>
          </div>
          <CodeBlock>{`<Label>Email</Label>
<Input type="email" value={email} onChange={…} />`}</CodeBlock>
        </Section>

        <Section id="eyebrow" title="Eyebrow">
          <div className="flex gap-3 items-center flex-wrap">
            <Eyebrow>New</Eyebrow>
            <Eyebrow icon="✓">Verified</Eyebrow>
            <Eyebrow>Face-recognition attendance</Eyebrow>
          </div>
          <CodeBlock>{`<Eyebrow>New</Eyebrow>`}</CodeBlock>
        </Section>

        <Section id="table" title="Table pattern (composition)">
          <p className="t-body text-sw-ink-500 mb-4">
            Tables are plain <code className="text-sw-ink-900 bg-sw-ink-100 px-1 rounded-sw-sm">&lt;table&gt;</code>{" "}
            wrapped in <code className="text-sw-ink-900 bg-sw-ink-100 px-1 rounded-sw-sm">.glass-card</code>{" "}
            <code className="text-sw-ink-900 bg-sw-ink-100 px-1 rounded-sw-sm">overflow-hidden</code>.
          </p>
          <div className="glass-card rounded-sw-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-sw-cream-25 border-b border-sw-ink-100">
                  <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Name</th>
                  <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Role</th>
                  <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-sw-ink-100 hover:bg-sw-cream-25 transition-colors duration-sw-fast">
                  <td className="px-6 py-4 text-sw-caption font-medium text-sw-ink-900">Angela Cruz</td>
                  <td className="px-6 py-4 text-sw-caption text-sw-ink-700">HR Lead</td>
                  <td className="px-6 py-4"><Chip tone="success">Active</Chip></td>
                </tr>
                <tr className="border-b border-sw-ink-100 hover:bg-sw-cream-25 transition-colors duration-sw-fast">
                  <td className="px-6 py-4 text-sw-caption font-medium text-sw-ink-900">Miguel Reyes</td>
                  <td className="px-6 py-4 text-sw-caption text-sw-ink-700">Payroll Officer</td>
                  <td className="px-6 py-4"><Chip tone="warn">Pending</Chip></td>
                </tr>
                <tr className="hover:bg-sw-cream-25 transition-colors duration-sw-fast">
                  <td className="px-6 py-4 text-sw-caption font-medium text-sw-ink-900">Priya Nair</td>
                  <td className="px-6 py-4 text-sw-caption text-sw-ink-700">Engineering</td>
                  <td className="px-6 py-4"><Chip tone="lilac">On leave</Chip></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="mb-12">
      <div className="inline-flex items-center gap-2.5 mb-4">
        <SweldoLogo width={28} height={30} />
        <span className="t-h3 text-sw-ink-900">Sweldo</span>
      </div>
      <h1 className="t-display mb-2">Design system</h1>
      <p className="t-body-lg text-sw-ink-500 max-w-[56ch]">
        Every token, primitive, and composition pattern used across the HR app.
        Reference this page when building new surfaces — reach for a primitive
        before reaching for raw HTML.
      </p>
    </header>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16">
      <h2 className="t-h2 mb-6 text-sw-ink-900">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="t-caption mb-3 text-sw-ink-500">{title}</div>
      <div className="flex flex-wrap gap-3 items-start">{children}</div>
    </div>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="w-[140px]">
      <div
        className="h-16 rounded-sw-md border border-sw-ink-100"
        style={{ background: hex }}
      />
      <div className="mt-2 text-sw-caption font-medium text-sw-ink-900">{name}</div>
      <div className="text-sw-micro text-sw-ink-500 font-mono">{hex}</div>
    </div>
  );
}

function TypeRow({ cls, spec, children }: { cls: string; spec: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-6 items-baseline py-2 border-b border-sw-ink-100 last:border-0">
      <div>
        <div className="text-sw-caption font-medium text-sw-ink-900">.{cls}</div>
        <div className="text-sw-micro text-sw-ink-500 font-mono">{spec}</div>
      </div>
      <div className={cls}>{children}</div>
    </div>
  );
}

function RadiusSwatch({ name, px, pill, circle }: { name: string; px?: number; pill?: boolean; circle?: boolean }) {
  const radius = circle ? "9999px" : `${px}px`;
  return (
    <div className="text-center">
      <div
        className="w-24 h-24 bg-sw-gold-50 border border-sw-gold-100"
        style={{ borderRadius: radius, width: pill ? "120px" : undefined, height: pill ? "48px" : circle ? "96px" : "96px" }}
      />
      <div className="mt-2 text-sw-caption font-medium text-sw-ink-900">rounded-{name}</div>
      <div className="text-sw-micro text-sw-ink-500 font-mono">{circle ? "9999" : px}px</div>
    </div>
  );
}

function ShadowSwatch({ name }: { name: string }) {
  return (
    <div className="text-center">
      <div className={`w-40 h-24 rounded-sw-lg bg-sw-white ${name}`} />
      <div className="mt-3 text-sw-caption font-medium text-sw-ink-900">{name}</div>
    </div>
  );
}

function LogoSwatch({ label, children, dark }: { label: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="text-center">
      <div
        className={`w-40 h-24 rounded-sw-lg border flex items-center justify-center ${
          dark ? "bg-sw-gold-500 border-sw-gold-500" : "bg-sw-white border-sw-ink-200"
        }`}
      >
        {children}
      </div>
      <div className="mt-3 text-sw-caption text-sw-ink-500">{label}</div>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-3 p-4 rounded-sw-md bg-sw-ink-100 text-sw-ink-900 text-sw-caption font-mono overflow-x-auto whitespace-pre-wrap">
      <code>{children}</code>
    </pre>
  );
}
