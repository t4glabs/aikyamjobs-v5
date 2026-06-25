'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── tiny helpers ────────────────────────────────────────────────────────────
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6 pb-3 border-b border-gray-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      {label && <p className="text-xs text-gray-400 mb-2 font-mono">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Swatch({ color, label, hex }: { color: string; label: string; hex: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-12 h-12 rounded-lg border border-black/5 ${color}`} />
      <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
      <span className="text-xs text-gray-300 font-mono text-center">{hex}</span>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────
export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<'segmented' | 'underline'>('segmented');
  const [activeSegment, setActiveSegment] = useState('all');
  const [toggleOn, setToggleOn] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Page header ── */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-white via-white/80 to-white/60 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Ghost Design System</h1>
            <p className="text-xs text-gray-400 mt-0.5">Reference implementation sourced from <span className="font-mono">apps/shade</span></p>
          </div>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← back to site
          </Link>
        </div>
      </div>

      {/* ── Notice banner ── */}
      <div className="bg-amber-50 border-b border-amber-100 px-6 py-3">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> This shows Ghost&apos;s <em>admin panel</em> design (the &ldquo;shade&rdquo; system — used in Ghost Dashboard, Ghost Admin). Ghost also has <em>frontend theme</em> design (Casper/Source themes) which is more editorial/magazine-style. Scroll to the bottom for a side-by-side comparison.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="colors" title="Color Palette">
          <p className="text-sm text-gray-500 mb-6">Ghost uses a cool-grey scale (slight blue tint) plus semantic color aliases. Nearly all UI is black + grey + white.</p>

          <Row label="Grey scale — the foundation of everything">
            <Swatch color="bg-gray-50" label="grey-50" hex="#f9f9fb" />
            <Swatch color="bg-gray-100" label="grey-100" hex="#f4f5f7" />
            <Swatch color="bg-gray-200" label="grey-200" hex="#eff0f3" />
            <Swatch color="bg-gray-300" label="grey-300" hex="#e3e5ea" />
            <Swatch color="bg-gray-400" label="grey-400" hex="#d6d9e0" />
            <Swatch color="bg-gray-500" label="grey-500" hex="#c0c4cf" />
            <Swatch color="bg-gray-600" label="grey-600" hex="#adb2bf" />
            <Swatch color="bg-gray-700" label="grey-700" hex="#8f96a7" />
            <Swatch color="bg-gray-800" label="grey-800" hex="#6b7280" />
            <Swatch color="bg-gray-900" label="grey-900" hex="#3d4451" />
            <Swatch color="bg-black" label="black" hex="#202226" />
          </Row>

          <Row label="Status / semantic colors">
            <Swatch color="bg-green-500" label="success" hex="#30cf43" />
            <Swatch color="bg-red-500" label="danger" hex="#f30b0b" />
            <Swatch color="bg-blue-500" label="info" hex="#42a4f5" />
            <Swatch color="bg-yellow-400" label="warning" hex="#f5c000" />
          </Row>

          <Row label="Semantic surface tokens (light mode)">
            <div className="flex flex-col gap-2 w-full">
              {[
                ['--background', 'white', 'Page background'],
                ['--foreground', 'black', 'Primary text'],
                ['--muted', 'grey-100', 'Subtle backgrounds (sidebar, input fill)'],
                ['--border', 'grey-200', 'All borders'],
                ['--accent', 'grey-100', 'Hover background'],
                ['--text-secondary', 'grey-700', 'Secondary text'],
                ['--text-tertiary', 'grey-400', 'Placeholder, meta text'],
                ['--focus-ring', 'grey-600', 'Focus rings (NOT green in new system)'],
                ['--sidebar-background', 'grey-50', 'Sidebar background'],
              ].map(([token, value, note]) => (
                <div key={token} className="flex items-center gap-4 text-sm">
                  <code className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-600 w-44 shrink-0">{token}</code>
                  <span className="text-gray-700 w-20 shrink-0">{value}</span>
                  <span className="text-gray-400">{note}</span>
                </div>
              ))}
            </div>
          </Row>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="typography" title="Typography">
          <p className="text-sm text-gray-500 mb-6">Font: <strong>Inter</strong>. Base size: <strong>13px</strong> (called <code className="text-xs bg-gray-100 px-1 rounded">text-control</code>). Ghost Admin uses a compact, information-dense type scale.</p>

          <div className="space-y-3 mb-8">
            {[
              { size: 'text-4xl', label: 'text-4xl / 32px', weight: 'font-bold', sample: 'Dashboard' },
              { size: 'text-3xl', label: 'text-3xl / 28px', weight: 'font-bold', sample: 'Posts & Pages' },
              { size: 'text-2xl', label: 'text-2xl / 22px', weight: 'font-semibold', sample: 'Site settings' },
              { size: 'text-xl', label: 'text-xl / 20px', weight: 'font-semibold', sample: 'Design settings' },
              { size: 'text-lg', label: 'text-lg / 18px', weight: 'font-medium', sample: 'Members overview' },
              { size: 'text-base', label: 'text-base / 16px', weight: 'font-normal', sample: 'Regular body text, card descriptions' },
              { size: 'text-sm', label: 'text-sm / 14px — ghost default', weight: 'font-normal', sample: 'Most UI labels, metadata, secondary text' },
              { size: 'text-xs', label: 'text-xs / 12px', weight: 'font-normal', sample: 'Tags, captions, timestamps, badge text' },
            ].map(({ size, label, weight, sample }) => (
              <div key={size} className="flex items-baseline gap-4 border-b border-gray-50 pb-3">
                <code className="text-xs text-gray-400 font-mono w-52 shrink-0">{label}</code>
                <span className={`${size} ${weight} text-gray-900`}>{sample}</span>
              </div>
            ))}
          </div>

          <Row label="Font weights">
            {['font-normal', 'font-medium', 'font-semibold', 'font-bold'].map(w => (
              <div key={w} className={`text-sm ${w} text-gray-900`}>
                {w.replace('font-', '')}
              </div>
            ))}
          </Row>

          <Row label="Letter spacing">
            <span className="text-sm tracking-tight text-gray-700">tracking-tight: Heading text</span>
            <span className="text-sm tracking-normal text-gray-700">tracking-normal: Body text</span>
            <span className="text-xs tracking-widest uppercase text-gray-400">tracking-widest: Section labels</span>
          </Row>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="buttons" title="Buttons">
          <p className="text-sm text-gray-500 mb-6">Ghost uses <strong>black as the primary action colour</strong> — no blue or brand-coloured buttons. Height is 32px (default) or 28px (sm).</p>

          <Row label="variant=default (primary)">
            <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-gray-900 text-white text-sm font-semibold whitespace-nowrap hover:bg-gray-900/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 disabled:opacity-50">
              Publish
            </button>
            <button className="inline-flex items-center justify-center gap-1.5 h-9 px-5 rounded-md bg-gray-900 text-white text-sm font-semibold whitespace-nowrap hover:bg-gray-900/90 transition-colors" disabled>
              Disabled
            </button>
          </Row>

          <Row label="variant=secondary">
            <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-gray-100 text-gray-900 text-sm font-medium whitespace-nowrap hover:bg-gray-200 transition-colors">
              Save draft
            </button>
            <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-gray-100 text-gray-900 text-sm font-medium whitespace-nowrap hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </Row>

          <Row label="variant=outline">
            <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-gray-200 bg-white text-gray-700 text-sm font-medium whitespace-nowrap hover:bg-gray-50 transition-colors">
              Export
            </button>
            <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-gray-200 bg-white text-gray-700 text-sm font-medium whitespace-nowrap hover:bg-gray-50 transition-colors">
              Download CSV
            </button>
          </Row>

          <Row label="variant=ghost">
            <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-gray-700 text-sm font-medium whitespace-nowrap hover:bg-gray-100 transition-colors">
              Settings
            </button>
            <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-gray-700 text-sm font-medium whitespace-nowrap hover:bg-gray-100 transition-colors">
              More options
            </button>
          </Row>

          <Row label="variant=destructive">
            <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-red-500 text-white text-sm font-medium whitespace-nowrap hover:bg-red-500/90 transition-colors">
              Delete post
            </button>
          </Row>

          <Row label="variant=link">
            <button className="inline-flex items-center text-sm font-medium text-gray-900 underline-offset-4 hover:underline transition-colors">
              Learn more
            </button>
            <button className="inline-flex items-center text-sm text-gray-500 underline-offset-4 hover:underline transition-colors">
              View all members
            </button>
          </Row>

          <Row label="sizes — sm / default / lg">
            <button className="inline-flex items-center justify-center h-7 px-3 rounded-md bg-gray-900 text-white text-xs font-semibold">
              Small (28px)
            </button>
            <button className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-gray-900 text-white text-sm font-semibold">
              Default (32px)
            </button>
            <button className="inline-flex items-center justify-center h-11 px-8 rounded-md bg-gray-900 text-white text-base font-semibold">
              Large (44px)
            </button>
          </Row>

          <Row label="icon button">
            <button className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round"/>
              </svg>
            </button>
          </Row>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="badges" title="Badges & Tags">
          <p className="text-sm text-gray-500 mb-6">Ghost uses very slightly rounded badges (<code className="text-xs bg-gray-100 px-1 rounded">rounded-sm</code>), 11px text, semibold. Status variants use 20% tinted backgrounds — not full colour.</p>

          <Row label="All variants">
            <span className="inline-flex items-center border border-transparent px-1.5 text-xs font-semibold bg-gray-900 text-white rounded-sm">Published</span>
            <span className="inline-flex items-center border border-transparent px-1.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-sm">Draft</span>
            <span className="inline-flex items-center border border-transparent px-1.5 text-xs font-semibold bg-red-500/20 text-red-600 rounded-sm">Destructive</span>
            <span className="inline-flex items-center border border-transparent px-1.5 text-xs font-semibold bg-green-500/20 text-green-700 rounded-sm">Success</span>
            <span className="inline-flex items-center border border-transparent px-1.5 text-xs font-semibold bg-yellow-400/20 text-yellow-700 rounded-sm">Warning</span>
            <span className="inline-flex items-center border border-gray-200 px-1.5 text-xs font-semibold text-gray-700 rounded-sm">Outline</span>
          </Row>

          <Row label="Pill / rounded-full variant (for tags like aikyamjobs uses)">
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Social Impact</span>
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Full-time</span>
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">Remote</span>
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">NGO</span>
          </Row>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="inputs" title="Form Inputs">
          <p className="text-sm text-gray-500 mb-6">
            Ghost inputs: <strong>white background</strong> (not grey-tinted), <code className="text-xs bg-gray-100 px-1 rounded">border-gray-200</code>, 36px tall.
            Focus ring: grey (not green — this changed in the new shade system).
          </p>

          <div className="max-w-sm space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Text input — default</label>
              <input
                type="text"
                placeholder="Enter job title..."
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-600/25 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Text input — with value</label>
              <input
                type="text"
                defaultValue="Product Designer"
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-600/25 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Text input — error state</label>
              <input
                type="text"
                defaultValue="bad value"
                aria-invalid="true"
                className="h-9 w-full rounded-md border border-red-400 bg-white px-3 py-1 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/20 transition-colors"
              />
              <p className="mt-1.5 text-xs text-red-500">This field is required</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select</label>
              <div className="relative">
                <select className="h-9 w-full appearance-none rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900 focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-600/25 transition-colors cursor-pointer">
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Volunteer</option>
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Textarea</label>
              <textarea
                rows={3}
                placeholder="Job description..."
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-600/25 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Search input (with icon)</label>
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="6.5" cy="6.5" r="4"/>
                  <path d="M11 11l3 3" strokeLinecap="round"/>
                </svg>
                <input
                  type="search"
                  placeholder="Search jobs..."
                  className="h-9 w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-600/25 transition-colors"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="cards" title="Cards">
          <p className="text-sm text-gray-500 mb-6">Cards use <code className="text-xs bg-gray-100 px-1 rounded">rounded-xl</code> (12px), <code className="text-xs bg-gray-100 px-1 rounded">border-gray-200</code>, 24px padding. On hover: very subtle shadow lift (no bg change).</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Outline card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-sm cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Program Manager</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Aam Aadmi Party</p>
                </div>
                <span className="inline-flex items-center px-1.5 text-xs font-semibold bg-green-500/15 text-green-700 rounded-sm border border-transparent">Active</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Lead program delivery for policy initiatives across Delhi. 3+ years experience in public policy or governance required.
              </p>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">Full-time</span>
                <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">New Delhi</span>
                <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">Governance</span>
              </div>
            </div>

            {/* Stats card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Total views</p>
              <p className="text-3xl font-bold text-gray-900">2,847</p>
              <p className="text-sm text-gray-500 mt-1">+12% from last month</p>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900 rounded-full" style={{ width: '68%' }} />
              </div>
            </div>

            {/* Featured card */}
            <div className="rounded-xl border border-gray-900 bg-gray-900 text-white p-6 transition-shadow hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Featured opportunity</p>
              <h3 className="font-semibold text-white mb-1">Communications Lead</h3>
              <p className="text-sm text-gray-400">Greenpeace India · Remote</p>
              <button className="mt-4 inline-flex items-center justify-center h-8 px-3 rounded-md bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-colors">
                Apply now
              </button>
            </div>

            {/* Empty card */}
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 4v12M4 10h12" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Add a company</p>
              <p className="text-xs text-gray-400 mt-1">No companies listed yet</p>
            </div>
          </div>

          <Row label="Plain card variant (no border)">
            <div className="w-full border-b border-gray-100">
              {['Program Manager — Aam Aadmi Party', 'Field Organiser — Greenpeace India', 'Data Analyst — NITI Aayog'].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors cursor-pointer">
                  <span className="text-sm text-gray-900">{item}</span>
                  <span className="text-xs text-gray-400">2 days ago</span>
                </div>
              ))}
            </div>
          </Row>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="separators" title="Separators & Dividers">
          <Row label="Horizontal separator — bg-gray-200, 1px height">
            <div className="w-full h-px bg-gray-200" />
          </Row>
          <Row label="Subtle — bg-gray-100">
            <div className="w-full h-px bg-gray-100" />
          </Row>
          <Row label="Strong — bg-gray-300">
            <div className="w-full h-px bg-gray-300" />
          </Row>
          <Row label="Vertical separator">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Option A</span>
              <div className="h-4 w-px bg-gray-200" />
              <span className="text-sm text-gray-600">Option B</span>
              <div className="h-4 w-px bg-gray-200" />
              <span className="text-sm text-gray-600">Option C</span>
            </div>
          </Row>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="tabs" title="Tabs">
          <p className="text-sm text-gray-500 mb-6">Ghost has 6 tab variants. Most used: <strong>segmented</strong> (pill group, for view toggles), <strong>underline</strong> (content navigation).</p>

          {/* Segmented tabs */}
          <Row label="variant=segmented (pill group — for grid/list toggle, filters)">
            <div className="inline-flex items-center h-8 rounded-lg bg-gray-100 px-[3px] gap-[2px]">
              {['All jobs', 'Published', 'Drafts'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveSegment(tab.toLowerCase().replace(' ', '-'))}
                  className={`h-7 px-3 rounded-md text-sm font-medium transition-all ${
                    activeSegment === tab.toLowerCase().replace(' ', '-')
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </Row>

          {/* Underline tabs */}
          <Row label="variant=underline (section navigation — used for page-level nav)">
            <div className="w-full">
              <div className="flex gap-5 border-b border-gray-200">
                {['Overview', 'Members', 'Posts', 'Settings'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab === 'Overview' ? 'segmented' : 'underline')}
                    className={`relative h-9 px-0 text-sm font-semibold transition-colors ${
                      (tab === 'Overview' && activeTab === 'segmented') || (tab !== 'Overview' && tab === 'Members' && activeTab === 'underline')
                        ? 'text-gray-900 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="pt-4">
                <p className="text-sm text-gray-500">{activeTab === 'segmented' ? 'Overview panel content' : 'Members panel content'}</p>
              </div>
            </div>
          </Row>

          {/* Pill tabs */}
          <Row label="variant=pill (compact selector)">
            <div className="inline-flex items-center h-[30px] gap-px">
              {['Daily', 'Weekly', 'Monthly'].map((period, i) => (
                <button
                  key={period}
                  className={`h-[30px] px-3 rounded-md text-sm font-medium transition-all ${
                    i === 1 ? 'bg-gray-900/10 text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="switch" title="Switch / Toggle">
          <p className="text-sm text-gray-500 mb-6">Ghost switches are <strong>black when on</strong> (not green). Thumb is white, background flips from grey to black.</p>

          <Row label="Interactive switch">
            <button
              role="switch"
              aria-checked={toggleOn}
              onClick={() => setToggleOn(!toggleOn)}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 ${
                toggleOn ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                  toggleOn ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">{toggleOn ? 'Enabled' : 'Disabled'}</span>
          </Row>

          <Row label="All states">
            {/* off */}
            <div className="flex items-center gap-2">
              <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-gray-200 border-2 border-transparent">
                <span className="block h-3 w-3 rounded-full bg-white shadow-sm translate-x-0" />
              </div>
              <span className="text-xs text-gray-500">Off</span>
            </div>
            {/* on */}
            <div className="flex items-center gap-2">
              <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-gray-900 border-2 border-transparent">
                <span className="block h-3 w-3 rounded-full bg-white shadow-sm translate-x-3" />
              </div>
              <span className="text-xs text-gray-500">On</span>
            </div>
            {/* small off */}
            <div className="flex items-center gap-2">
              <div className="relative inline-flex h-3 w-5 items-center rounded-full bg-gray-200 border-2 border-transparent">
                <span className="block h-2 w-2 rounded-full bg-white shadow-sm translate-x-0" />
              </div>
              <span className="text-xs text-gray-500">Small off</span>
            </div>
            {/* small on */}
            <div className="flex items-center gap-2">
              <div className="relative inline-flex h-3 w-5 items-center rounded-full bg-gray-900 border-2 border-transparent">
                <span className="block h-2 w-2 rounded-full bg-white shadow-sm translate-x-2" />
              </div>
              <span className="text-xs text-gray-500">Small on</span>
            </div>
          </Row>

          <Row label="With label (typical settings usage)">
            <div className="w-full max-w-sm">
              {[
                { label: 'Email notifications', sub: 'Receive alerts for new applications', on: true },
                { label: 'Weekly digest', sub: 'Summary of job activity every Monday', on: false },
                { label: 'Public profile', sub: 'Allow organisations to discover your profile', on: true },
              ].map(({ label, sub, on }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                  </div>
                  <div className={`relative inline-flex h-4 w-7 items-center rounded-full border-2 border-transparent cursor-pointer ${on ? 'bg-gray-900' : 'bg-gray-200'}`}>
                    <span className={`block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-3' : 'translate-x-0'}`} />
                  </div>
                </div>
              ))}
            </div>
          </Row>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="loading" title="Loading States">
          <Row label="Spinner — sm / md / lg">
            {/* sm */}
            <div className="animate-spin h-4 w-4 rounded-full border-2 border-black/10" style={{ borderTopColor: '#202226' }} />
            {/* md */}
            <div className="animate-spin h-5 w-5 rounded-full border-2 border-black/10" style={{ borderTopColor: '#202226' }} />
            {/* lg */}
            <div className="animate-spin h-10 w-10 rounded-full border-2 border-black/10" style={{ borderTopColor: '#202226' }} />
          </Row>

          <Row label="Spinner in button">
            <button className="inline-flex items-center justify-center gap-2 h-8 px-3 rounded-md bg-gray-900 text-white text-sm font-semibold">
              <div className="animate-spin h-3.5 w-3.5 rounded-full border-[1.5px] border-white/30" style={{ borderTopColor: 'white' }} />
              Publishing...
            </button>
          </Row>

          <Row label="Skeleton — single line (animate-pulse)">
            <div className="w-full space-y-2">
              <div className="h-4 bg-gray-900/10 rounded animate-pulse" style={{ width: '57%' }} />
              <div className="h-4 bg-gray-900/10 rounded animate-pulse" style={{ width: '33%' }} />
              <div className="h-4 bg-gray-900/10 rounded animate-pulse" style={{ width: '40%' }} />
            </div>
          </Row>

          <Row label="Skeleton card">
            <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 bg-gray-100 rounded-lg animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-900/10 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-900/10 rounded animate-pulse w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-900/10 rounded animate-pulse w-full" />
                <div className="h-3 bg-gray-900/10 rounded animate-pulse w-full" />
                <div className="h-3 bg-gray-900/10 rounded animate-pulse w-2/3" />
              </div>
            </div>
          </Row>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="modal" title="Modal / Dialog">
          <p className="text-sm text-gray-500 mb-6">Modal appears at <code className="text-xs bg-gray-100 px-1 rounded">top: 8vmin</code> (not vertically centred). Backdrop is <code className="text-xs bg-gray-100 px-1 rounded">bg-black/30 + backdrop-blur-[3px]</code>.</p>

          <Row>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-gray-900 text-white text-sm font-semibold hover:bg-gray-900/90 transition-colors"
            >
              Open modal
            </button>
          </Row>

          {showModal && (
            <div className="fixed inset-0 z-50 flex">
              <div
                className="fixed inset-0 bg-black/30 backdrop-blur-[3px] animate-in fade-in"
                onClick={() => setShowModal(false)}
              />
              <div className="fixed left-1/2 top-[8vmin] z-50 -translate-x-1/2 w-full max-w-lg bg-white rounded-xl shadow-xl p-6 grid gap-5">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold text-gray-900">Delete this job listing?</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone. The listing will be permanently removed and all application data will be lost.</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="inline-flex items-center justify-center h-8 px-3 min-w-[80px] rounded-md border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="inline-flex items-center justify-center h-8 px-3 min-w-[80px] rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-500/90 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Static preview of modal */}
          <div className="mt-4 relative rounded-xl border border-gray-200 overflow-hidden" style={{ height: 300 }}>
            <div className="absolute inset-0 bg-gray-900/10 backdrop-blur-[2px]" />
            <div className="absolute left-1/2 top-8 -translate-x-1/2 w-80 bg-white rounded-xl shadow-xl p-6 grid gap-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Confirm action</h3>
                <p className="text-sm text-gray-500 mt-1.5">This is how a Ghost modal looks. Notice the backdrop blur and position from the top.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="inline-flex items-center justify-center h-8 px-3 min-w-[80px] rounded-md border border-gray-200 bg-white text-gray-700 text-sm font-medium">Cancel</button>
                <button className="inline-flex items-center justify-center h-8 px-3 min-w-[80px] rounded-md bg-gray-900 text-white text-sm font-semibold">Confirm</button>
              </div>
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="layout" title="Layout Patterns">
          <p className="text-sm text-gray-500 mb-6">Ghost Admin uses a sidebar layout (grey-50) + content area (white). Sticky blur header on both. Content has generous 24–32px padding.</p>

          {/* Sidebar + content mockup */}
          <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ height: 380 }}>
            <div className="flex h-full">
              {/* Sidebar */}
              <div className="w-[220px] bg-gray-50 border-r border-gray-100 flex flex-col shrink-0">
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gray-900" />
                    <span className="text-sm font-semibold text-gray-900">aikyamjobs</span>
                  </div>
                </div>
                <nav className="px-2 py-3 flex-1">
                  {[
                    { icon: '○', label: 'Dashboard', active: false },
                    { icon: '◈', label: 'Jobs', active: true },
                    { icon: '⬡', label: 'Companies', active: false },
                    { icon: '◉', label: 'Members', active: false },
                    { icon: '⊞', label: 'Analytics', active: false },
                  ].map(({ icon, label, active }) => (
                    <div key={label} className={`flex items-center gap-2.5 px-2 py-2 rounded-md mb-0.5 cursor-pointer text-sm ${active ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-200/60'}`}>
                      <span className="text-xs opacity-60">{icon}</span>
                      {label}
                    </div>
                  ))}
                </nav>
                <div className="px-3 pb-4 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-300" />
                    <span className="text-xs text-gray-500">Greeshma</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 bg-white overflow-hidden flex flex-col">
                {/* Content header */}
                <div className="bg-gradient-to-b from-white via-white/80 to-white/60 backdrop-blur-md px-6 py-4 border-b border-gray-100 sticky top-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
                    <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-gray-900 text-white text-sm font-semibold">
                      + New job
                    </button>
                  </div>
                </div>
                {/* Content body */}
                <div className="px-6 py-4 flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="inline-flex items-center h-8 rounded-lg bg-gray-100 px-[3px] gap-[2px]">
                      {['All', 'Published', 'Drafts'].map((t, i) => (
                        <button key={t} className={`h-7 px-3 rounded-md text-xs font-medium ${i === 0 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{t}</button>
                      ))}
                    </div>
                    <div className="relative">
                      <input type="text" placeholder="Search..." className="h-8 w-36 rounded-md border border-gray-200 bg-white pl-7 pr-3 text-xs text-gray-900 placeholder:text-gray-400" />
                      <svg className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l3 3" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                  {['Program Manager · Aam Aadmi Party', 'Field Organiser · Greenpeace India', 'Data Analyst · NITI Aayog'].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                      <div>
                        <span className="text-sm text-gray-900">{item.split(' · ')[0]}</span>
                        <span className="text-xs text-gray-400 ml-2">{item.split(' · ')[1]}</span>
                      </div>
                      <span className={`text-xs px-1.5 font-semibold rounded-sm ${i === 1 ? 'bg-gray-100 text-gray-500' : 'bg-green-500/15 text-green-700'}`}>
                        {i === 1 ? 'Draft' : 'Live'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="comparison" title="Ghost Admin vs Ghost Frontend Theme Design">
          <p className="text-sm text-gray-500 mb-6">
            Ghost has <strong>two separate design aesthetics</strong>. The above is the <em>admin/dashboard UI</em>. Ghost&apos;s public-facing frontend themes (like Casper, Source) are more editorial and magazine-style — more colour, more white space, more visual hierarchy.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Admin style card */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin / Dashboard UI</p>
                <p className="text-xs text-gray-400 mt-0.5">apps/shade · compact · monochrome</p>
              </div>
              <div className="p-4">
                <div className="rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Program Manager</p>
                      <p className="text-xs text-gray-400">Aam Aadmi Party</p>
                    </div>
                    <span className="text-xs px-1.5 font-semibold bg-green-500/15 text-green-700 rounded-sm">Live</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">Lead program delivery for policy initiatives across Delhi...</p>
                  <div className="flex gap-1.5 mt-3">
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-sm">Full-time</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-sm">Delhi</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-300 text-center">compact · data-dense · monochrome</div>
              </div>
            </div>

            {/* Frontend theme style card */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Frontend Theme Style</p>
                <p className="text-xs text-gray-400 mt-0.5">Casper/Source · editorial · spacious</p>
              </div>
              <div className="p-4">
                <div className="group cursor-pointer">
                  <div className="aspect-video bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg mb-3 flex items-center justify-center">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full opacity-40" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Governance</span>
                  <h3 className="text-base font-bold text-gray-900 mt-1 group-hover:underline">Program Manager at Aam Aadmi Party</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">Lead program delivery for policy initiatives across Delhi...</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-5 h-5 rounded-full bg-gray-200" />
                    <span className="text-xs text-gray-400">Aam Aadmi Party · 3 days ago</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-300 text-center">editorial · spacious · image-led</div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-gray-50 border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-2">Which style fits aikyamjobs?</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Our site is a <strong>public-facing job board</strong>, not an admin panel. The Ghost admin style (left) is better for a <em>management tool</em> you log into. The Ghost frontend theme style (right) is better for a <em>discovery product</em> that visitors browse — which is what we are. However, the Ghost admin&apos;s design tokens (colors, radius, spacing, typography scale) are excellent and can be applied to either aesthetic.
            </p>
            <div className="flex gap-3 mt-4">
              <button className="inline-flex items-center h-8 px-3 rounded-md bg-gray-900 text-white text-sm font-semibold">
                Admin-style → good for internal tools
              </button>
              <button className="inline-flex items-center h-8 px-3 rounded-md border border-gray-200 bg-white text-gray-700 text-sm font-medium">
                Frontend-style → better for job boards
              </button>
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="jobcard" title="Ghost-Styled Job Card (for aikyamjobs)">
          <p className="text-sm text-gray-500 mb-6">
            How our current job card would look if restyled with Ghost design tokens — using the admin system&apos;s colours, radius, spacing, and type scale.
          </p>

          <div className="grid gap-4">
            {[
              { title: 'Field Organiser', company: 'Greenpeace India', type: 'Full-time', location: 'Remote', tags: ['Climate', 'Advocacy'], featured: false },
              { title: 'Data Analyst', company: 'NITI Aayog', type: 'Contract', location: 'New Delhi', tags: ['Research', 'Policy'], featured: true },
            ].map(({ title, company, type, location, tags, featured }) => (
              <div key={title} className={`relative rounded-xl border p-5 transition-shadow hover:shadow-sm cursor-pointer ${featured ? 'border-gray-900 bg-gray-900' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Company logo placeholder */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${featured ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {company[0]}
                    </div>
                    <div>
                      <h3 className={`text-sm font-semibold ${featured ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                      <p className={`text-xs mt-0.5 ${featured ? 'text-gray-400' : 'text-gray-500'}`}>{company}</p>
                    </div>
                  </div>
                  {featured && <span className="text-xs px-1.5 font-semibold bg-white/20 text-white rounded-sm shrink-0">Featured</span>}
                </div>
                <div className={`flex items-center gap-2 mt-4 pt-4 border-t ${featured ? 'border-white/10' : 'border-gray-100'}`}>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-sm ${featured ? 'bg-white/10 text-gray-300' : 'bg-blue-50 text-blue-700'}`}>{type}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-sm ${featured ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{location}</span>
                  {tags.map(tag => (
                    <span key={tag} className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded-sm ${featured ? 'text-gray-500' : 'text-gray-400'}`}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="cheatsheet" title="Quick Reference Cheatsheet">
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Element</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Key classes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Border', 'border-gray-200', '1px, grey-200 everywhere'],
                  ['Card radius', 'rounded-xl', '12px'],
                  ['Control radius', 'rounded-md', '6px'],
                  ['Badge radius', 'rounded-sm or rounded-full', '4px or pill'],
                  ['Control height', 'h-8', '32px'],
                  ['Input height', 'h-9', '36px'],
                  ['Card padding', 'p-6', '24px'],
                  ['Font', 'font-sans (Inter)', '—'],
                  ['Base text', 'text-sm', '14px (13px in shade)'],
                  ['Focus ring', 'ring-2 ring-gray-600/25', 'grey, not blue/green'],
                  ['Hover bg', 'hover:bg-gray-100', 'accent = grey-100'],
                  ['Primary btn', 'bg-gray-900 text-white', 'black, not brand-coloured'],
                  ['Shadow on hover', 'hover:shadow-sm', 'very subtle lift'],
                  ['Sidebar bg', 'bg-gray-50', 'grey-50'],
                  ['Disabled', 'opacity-50 pointer-events-none', '50% opacity'],
                ].map(([el, cls, val]) => (
                  <tr key={el} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700 font-medium">{el}</td>
                    <td className="px-4 py-2.5"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{cls}</code></td>
                    <td className="px-4 py-2.5 text-gray-500">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════════════════ */}
        <Section id="theme-how" title="Ghost Frontend Theme System — How It Works">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-5 mb-8">
            <p className="text-sm font-semibold text-amber-900 mb-2">Short answer: there is no shared CSS library for Ghost themes.</p>
            <p className="text-sm text-amber-800 leading-relaxed">
              Ghost themes are completely self-contained CSS + Handlebars. There is no Bootstrap or utility framework. The only things Ghost <em>injects</em> into every theme are: <strong>(1)</strong> <code className="text-xs bg-amber-100 px-1 rounded">--ghost-accent-color</code> CSS variable from Admin brand settings, <strong>(2)</strong> <code className="text-xs bg-amber-100 px-1 rounded">.kg-*</code> card CSS for rich content editor cards if the theme opts in with <code className="text-xs bg-amber-100 px-1 rounded">&quot;card_assets&quot;: true</code>, <strong>(3)</strong> <code className="text-xs bg-amber-100 px-1 rounded">--gh-font-heading</code> / <code className="text-xs bg-amber-100 px-1 rounded">--gh-font-body</code> from Admin typography settings. The <code className="text-xs bg-amber-100 px-1 rounded">.gh-*</code> classes you see in Ghost themes are just Ghost&apos;s internal naming convention — not a required API.
            </p>
          </div>

          <h3 className="text-sm font-semibold text-gray-900 mb-4">What Ghost injects into every theme (the actual standards)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="w-8 h-8 bg-pink-500 rounded-lg mb-3 flex items-center justify-center">
                <span className="text-white text-xs font-bold">AC</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">--ghost-accent-color</p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">Set in Admin Settings → Brand. Ghost injects this into every page. Themes use it for buttons, links, and header backgrounds.</p>
              <div className="h-7 rounded-md flex items-center px-3 text-white text-xs font-semibold" style={{ background: 'var(--brand, #6366f1)' }}>
                var(--ghost-accent-color)
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg mb-3 flex items-center justify-center">
                <span className="text-white text-xs font-bold">KG</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">.kg-* card CSS</p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">Rich editor card styles injected by Ghost. Theme opts in with <code className="bg-gray-100 px-1 rounded">card_assets: true</code>. Not relevant to us (we use Strapi/markdown).</p>
              <div className="space-y-1">
                {['.kg-bookmark-card', '.kg-callout-card', '.kg-gallery-card', '.kg-button-card'].map(c => (
                  <div key={c} className="text-xs font-mono text-gray-400">{c}</div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="w-8 h-8 bg-purple-500 rounded-lg mb-3 flex items-center justify-center">
                <span className="text-white text-xs font-bold">Aa</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">--gh-font-heading / body</p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">Custom fonts set in Admin → Design. Ghost injects these as CSS variables. Themes use them or fall back to their own fonts.</p>
              <div className="space-y-1 text-xs font-mono text-gray-400">
                <div>--gh-font-heading: Inter</div>
                <div>--gh-font-body: Georgia</div>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-900 mb-2">Casper theme design conventions (the visual reference)</h3>
          <p className="text-sm text-gray-500 mb-6">Casper is Ghost&apos;s default theme — the de facto design reference for the ecosystem. Here are its key patterns.</p>

          <p className="text-xs text-gray-400 mb-2 font-mono">outer + inner layout — full viewport width sections with max-width centered content</p>
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="text-xs font-mono text-blue-500">.outer</span>
              <span className="text-xs text-gray-400">padding: 0 max(4vmin, 20px) — full width, breathing room on sides</span>
            </div>
            <div className="px-6 py-3 flex items-center gap-2">
              <div className="w-4 shrink-0" />
              <span className="text-xs font-mono text-green-600">.inner</span>
              <span className="text-xs text-gray-400">max-width: 1200px, margin: 0 auto — centers content</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-2 font-mono">gh-canvas — article content grid (3 reading zones: main 720px / wide / full bleed)</p>
          <div className="rounded-xl border border-gray-200 p-4 mb-8">
            <div className="flex items-center h-12 text-xs font-mono gap-0 overflow-hidden rounded-lg">
              <div className="bg-gray-100 flex items-center justify-center text-gray-400 h-full px-1 shrink-0" style={{ width: '8%' }}>gap</div>
              <div className="bg-blue-50 flex items-center justify-center text-blue-500 h-full shrink-0 border-x border-blue-100" style={{ width: '15%' }}>wide</div>
              <div className="bg-blue-100 flex items-center justify-center text-blue-700 font-semibold h-full flex-1">main (720px)</div>
              <div className="bg-blue-50 flex items-center justify-center text-blue-500 h-full shrink-0 border-x border-blue-100" style={{ width: '15%' }}>wide</div>
              <div className="bg-gray-100 flex items-center justify-center text-gray-400 h-full px-1 shrink-0" style={{ width: '8%' }}>gap</div>
            </div>
            <p className="text-xs text-gray-400 mt-2">full-bleed spans 100% (hero images, section breaks) · wide = intermediate breakout · main = 720px reading width</p>
          </div>

          <p className="text-xs text-gray-400 mb-4 font-mono">post-card — Casper&apos;s editorial card (image 55% ratio → tag → title → excerpt → meta)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { tag: 'CLIMATE', title: "Why India's NGO sector is losing talent", excerpt: 'A deep look at attrition rates and what organisations can do differently.', author: 'Greeshma R', date: '12 Jun 2026', image: 'from-emerald-100 to-teal-50' },
              { tag: 'GOVERNANCE', title: 'Field notes from a year of community organising', excerpt: 'What we learned running campaigns across 40 villages in UP.', author: 'Jinso Raj', date: '8 Jun 2026', image: 'from-blue-100 to-indigo-50' },
              { tag: 'TECH FOR GOOD', title: 'Data tools that actually help NGOs measure impact', excerpt: 'A practical guide to impact measurement without a data team.', author: 'Founder', date: '1 Jun 2026', image: 'from-rose-100 to-pink-50' },
            ].map(({ tag, title, excerpt, author, date, image }) => (
              <div key={title} className="flex flex-col cursor-pointer group">
                <div className="relative overflow-hidden rounded-lg mb-6" style={{ paddingBottom: '55%' }}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${image}`} />
                </div>
                <div className="text-xs font-semibold tracking-wide text-gray-400 mb-2">{tag}</div>
                <h3 className="text-lg font-extrabold leading-tight text-gray-900 group-hover:opacity-80 transition-opacity mb-2" style={{ letterSpacing: '-0.01em' }}>{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500 line-clamp-2 mb-3 flex-1">{excerpt}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-5 h-5 rounded-full bg-gray-200 shrink-0" />
                  <span>{author}</span>
                  <span>·</span>
                  <span>{date}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-4 font-mono">article typography — Casper&apos;s post body (clamp-based sizes, generous line-height)</p>
          <div className="max-w-2xl rounded-xl border border-gray-200 p-8 mb-8">
            <div className="text-xs font-semibold tracking-widest text-gray-400 mb-4">CLIMATE</div>
            <h1 className="font-extrabold text-gray-900 mb-4" style={{ fontSize: 'clamp(3.2rem, 5vw, 5.2rem)', letterSpacing: '-0.01em', lineHeight: 1.05 }}>
              Why NGOs are struggling to retain talent
            </h1>
            <p className="text-gray-600 mb-6" style={{ fontSize: '2rem', lineHeight: 1.45 }}>
              A deep look at attrition rates in the social impact sector.
            </p>
            <div className="flex items-center gap-3 mb-8 pb-8 border-b border-gray-100 text-sm text-gray-400">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <span>Greeshma R</span>
              <span>·</span>
              <span>June 12, 2026</span>
              <span>·</span>
              <span>6 min read</span>
            </div>
            <p className="mb-4 text-gray-700" style={{ fontSize: '1.8rem', lineHeight: 1.65 }}>
              The social impact sector in India faces a paradox: more people want to work in it than ever before, yet attrition continues to climb.
            </p>
            <h2 className="font-bold text-gray-900 mt-8 mb-3" style={{ fontSize: '2.4rem', letterSpacing: '-0.01em' }}>The compensation gap</h2>
            <p className="text-gray-700" style={{ fontSize: '1.8rem', lineHeight: 1.65 }}>
              Mid-career professionals regularly cite a 40–60% salary differential versus equivalent corporate roles.
            </p>
          </div>

          <p className="text-xs text-gray-400 mb-3 font-mono">kg-callout-card variants — editorial highlight boxes (we can use these in our blog posts)</p>
          <div className="space-y-3 mb-8 max-w-2xl">
            {[
              { emoji: '💡', label: 'Callout (grey)', bg: 'rgba(124,139,154,0.13)', text: 'text-gray-700', desc: 'Tips, notes, things worth highlighting without urgency.' },
              { emoji: '✅', label: 'Callout (green)', bg: 'rgba(52,183,67,0.12)', text: 'text-gray-700', desc: 'Confirmation, success state, or a positive conclusion.' },
              { emoji: '⚠️', label: 'Callout (red)', bg: 'rgba(209,46,46,0.11)', text: 'text-gray-700', desc: 'Warnings or caveats the reader must not miss.' },
              { emoji: '📌', label: 'Callout (yellow)', bg: 'rgba(240,165,15,0.13)', text: 'text-gray-700', desc: 'Gentle reminder or note needing attention.' },
            ].map(({ emoji, label, bg, text, desc }) => (
              <div key={label} className="flex gap-3 p-4 rounded-lg" style={{ background: bg }}>
                <span className="text-xl shrink-0">{emoji}</span>
                <p className={`text-sm leading-relaxed ${text}`}><strong>{label}</strong> — {desc}</p>
              </div>
            ))}
            <div className="flex gap-3 p-4 rounded-lg text-white" style={{ background: 'var(--brand, #6366f1)' }}>
              <span className="text-xl shrink-0">🚀</span>
              <p className="text-sm leading-relaxed"><strong>Callout (accent)</strong> — uses <code className="text-xs bg-white/20 px-1 rounded">--ghost-accent-color</code>. Key takeaways or CTAs.</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3 font-mono">kg-bookmark-card — link preview card (unfurl-style)</p>
          <div className="max-w-2xl mb-8">
            <div className="flex bg-white rounded-lg border overflow-hidden hover:shadow-sm transition-shadow cursor-pointer" style={{ borderColor: 'rgba(124,139,154,0.25)' }}>
              <div className="flex flex-col flex-1 p-5">
                <div className="text-sm font-semibold text-gray-900">How to write a compelling nonprofit job description</div>
                <div className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">A practical guide for social impact organisations. Covers structure, tone, and common mistakes to avoid.</div>
                <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                  <div className="w-5 h-5 bg-gray-200 rounded-sm shrink-0" />
                  <span>aikyamjobs.org</span>
                  <span>·</span>
                  <span>Resources</span>
                </div>
              </div>
              <div className="relative w-36 shrink-0 bg-gradient-to-br from-green-100 to-emerald-50" />
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3 font-mono">site-header — Casper&apos;s dramatic cover (accent colour background, large type)</p>
          <div className="rounded-xl overflow-hidden mb-8" style={{ height: 180, background: 'var(--brand, #6366f1)' }}>
            <div className="flex flex-col items-center justify-center h-full text-white text-center px-6">
              <h1 className="font-extrabold text-white mb-2" style={{ fontSize: '3.2rem', letterSpacing: '-0.02em' }}>aikyamjobs</h1>
              <p className="text-white/80 font-medium" style={{ fontSize: '1.6rem' }}>Curated jobs for social impact careers in India</p>
            </div>
          </div>

          <div className="rounded-xl bg-gray-900 text-white p-6">
            <p className="text-sm font-semibold mb-3">What this means for aikyamjobs</p>
            <div className="space-y-2 text-sm text-gray-300 leading-relaxed">
              <p><strong className="text-white">✓ Adopt now:</strong> The post card pattern (tag → title → excerpt → meta) for our blog section. Cleaner and more editorial than our current style.</p>
              <p><strong className="text-white">✓ Adopt for blog posts:</strong> The gh-canvas content grid (main/wide/full zones) is the best article reading layout we&apos;ve seen. Our blog post page should use this pattern.</p>
              <p><strong className="text-white">✓ Adopt for blog prose:</strong> Callout card styles as Tailwind prose components in our blog posts.</p>
              <p><strong className="text-white">✗ Not relevant:</strong> kg-* card CSS (we use Strapi/markdown, not Ghost&apos;s Koenig editor). The .gh-* class names themselves.</p>
              <p><strong className="text-white">→ Verdict:</strong> Admin system tokens (colors, spacing, radius) → use for job board UI. Frontend theme patterns (card layout, article typography, callouts) → use for blog pages. Both together = Ghost-quality output.</p>
            </div>
          </div>
        </Section>

      </div>

      {/* ── Sticky TOC ── */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-1">
        {[
          ['colors', 'Colors'],
          ['typography', 'Type'],
          ['buttons', 'Buttons'],
          ['badges', 'Badges'],
          ['inputs', 'Inputs'],
          ['cards', 'Cards'],
          ['separators', 'Lines'],
          ['tabs', 'Tabs'],
          ['switch', 'Switch'],
          ['loading', 'Loading'],
          ['modal', 'Modal'],
          ['layout', 'Layout'],
          ['comparison', 'Comparison'],
          ['jobcard', 'Job card'],
          ['cheatsheet', 'Cheatsheet'],
          ['theme-how', 'Theme system'],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="text-xs text-gray-300 hover:text-gray-700 transition-colors"
          >
            {label}
          </a>
        ))}
      </div>

    </div>
  );
}
