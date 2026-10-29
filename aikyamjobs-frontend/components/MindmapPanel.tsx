'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import type { MindmapNode } from '@/lib/types';

/**
 * "Role / Organisation at a glance" -- the interactive version of the
 * mindmaps that are already in the JD PDF, built from the same mindmapJson
 * (sanitized by the backend's GET /jobs/:slug/mindmap and
 * /companies/:slug/mindmap). Used on the JD page (role + org views) and the
 * company page (org view only). Plain nested lists + disclosure buttons
 * rather than a diagram library: text wraps naturally at phone widths, each
 * +/- is a real <button aria-expanded>, and a collapsed branch's children
 * simply aren't rendered.
 *
 * Inline view: root + top-level branches, each expandable. "Full screen"
 * opens a native <dialog> with every branch laid out open side by side.
 */

// Same branch palette as the PDF (mindmap-template.typ) so both read as the
// same artifact. All ≥4.5:1 on white.
const PALETTE = ['#AE4634', '#2E6F5E', '#3F5D8A', '#8A5A3F', '#5A4F8A', '#3F7A8A', '#7A3F6E'];

export interface MindmapView {
  // Also sent to analytics as `mindmap_view` ('role' / 'org').
  key: string;
  heading: string;
  // Switcher label; only shown when there's more than one view.
  tab?: string;
  tree: MindmapNode;
}

interface Props {
  // First view is the default.
  views: MindmapView[];
  // Plausible event name + the props identifying the page (job_slug /
  // company_slug); mindmap_* props are added per interaction.
  event: string;
  eventProps: Record<string, string>;
  className?: string;
}

// Root details arrive as "Location: X | Organization: Y" -- shown as a small
// fact row instead of one run-on line.
function parseFacts(details?: string) {
  if (!details) return [];
  return details.split(' | ').map((part) => {
    const m = part.match(/^([^:]{1,40}):\s*(.+)$/);
    return m ? { key: m[1], value: m[2] } : { key: null, value: part };
  });
}

// Every node id that has children, so "Expand all" can open them in one go.
function collectIds(node: MindmapNode, prefix: string, out: string[] = []) {
  node.children?.forEach((child, i) => {
    const id = `${prefix}.${i}`;
    if (child.children?.length) {
      out.push(id);
      collectIds(child, id, out);
    }
  });
  return out;
}

function ToggleIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" d="M3.5 8h9" />
      {!open && <path strokeLinecap="round" d="M8 3.5v9" />}
    </svg>
  );
}

function Leaf({ node }: { node: MindmapNode }) {
  return (
    <>
      <p className="text-sm font-medium text-gray-900">{node.label}</p>
      {node.details && <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{node.details}</p>}
    </>
  );
}

interface NodeListProps {
  nodes: MindmapNode[];
  prefix: string;
  color: string;
  expanded: Set<string>;
  onToggle: (id: string, label: string) => void;
}

// Children of a branch (depth >= 2). Nodes that themselves have children get
// their own smaller toggle; everything else is a plain label + details.
function NodeList({ nodes, prefix, color, expanded, onToggle }: NodeListProps) {
  return (
    <ul
      className="mm-tree"
      style={{ '--mm-line': `${color}59`, '--mm-tick-y': '10px' } as React.CSSProperties}
    >
      {nodes.map((node, i) => {
        const id = `${prefix}.${i}`;
        const open = expanded.has(id);
        return (
          <li key={id}>
            {node.children?.length ? (
              <>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onToggle(id, node.label)}
                  className="flex items-start gap-2 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span
                    className="mt-[3px] flex h-4 w-4 flex-none items-center justify-center rounded border"
                    style={{ color, borderColor: color }}
                  >
                    <ToggleIcon open={open} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-gray-900">{node.label}</span>
                    {node.details && <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">{node.details}</span>}
                  </span>
                </button>
                {open && (
                  <div className="mt-2 ml-2">
                    <NodeList nodes={node.children} prefix={id} color={color} expanded={expanded} onToggle={onToggle} />
                  </div>
                )}
              </>
            ) : (
              <Leaf node={node} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Full-screen view: everything below a branch, already open, no toggles.
function OpenList({ nodes, color }: { nodes: MindmapNode[]; color: string }) {
  return (
    <ul
      className="mm-tree"
      style={{ '--mm-line': `${color}59`, '--mm-tick-y': '10px' } as React.CSSProperties}
    >
      {nodes.map((node, i) => (
        <li key={i}>
          <Leaf node={node} />
          {node.children && (
            <div className="mt-2 ml-2">
              <OpenList nodes={node.children} color={color} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function RootHeader({ root }: { root: MindmapNode }) {
  const facts = parseFacts(root.details);
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-[7px] h-3 w-3 flex-none rounded-full bg-gray-800" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold text-gray-900">{root.label}</p>
        {facts.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            {facts.map((f, i) => (
              <li key={i}>
                {f.key && <span className="font-medium text-gray-700">{f.key}: </span>}
                {f.value}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function MindmapPanel({ views, event, eventProps, className = 'mb-8' }: Props) {
  const headingId = useId();
  const dialogHeadingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState(views[0].key);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [fullScreen, setFullScreen] = useState(false);

  const current = views.find((v) => v.key === view) ?? views[0];
  const root = current.tree;
  const branches = root.children ?? [];
  const allIds = collectIds(root, view);
  const allOpen = allIds.length > 0 && allIds.every((id) => expanded.has(id));

  // Prop names are prefixed: Plausible custom properties are site-wide, and a
  // bare `action`/`branch` would be ambiguous next to other events' props.
  const report = (action: string, branch?: string, map: string = view) =>
    track(event, {
      ...eventProps,
      mindmap_view: map,
      mindmap_action: action,
      ...(branch ? { mindmap_branch: branch } : {}),
    });

  const toggle = (id: string, label: string) => {
    const opening = !expanded.has(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (opening) next.add(id);
      else next.delete(id);
      return next;
    });
    if (opening) report('expand', label);
  };

  const toggleAll = () => {
    if (allOpen) {
      setExpanded((prev) => new Set([...prev].filter((id) => !allIds.includes(id))));
    } else {
      setExpanded((prev) => new Set([...prev, ...allIds]));
      report('expand_all');
    }
  };

  const switchView = (next: string) => {
    if (next === view) return;
    setView(next);
    // Only switching away from the default view is interesting ("org_tab").
    if (next !== views[0].key) report(`${next}_tab`, undefined, next);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (fullScreen && !dialog.open) dialog.showModal();
    if (!fullScreen && dialog.open) dialog.close();
  }, [fullScreen]);

  const viewSwitch = views.length > 1 && (
    <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 text-xs font-semibold" role="group" aria-label="Which map to show">
      {views.map((v) => (
        <button
          key={v.key}
          type="button"
          aria-pressed={view === v.key}
          onClick={() => switchView(v.key)}
          className={`rounded px-2.5 py-1 transition ${view === v.key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {v.tab ?? v.heading}
        </button>
      ))}
    </div>
  );

  const actionClass =
    'inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100';

  return (
    <section aria-labelledby={headingId} className={`${className} rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id={headingId} className="text-base font-semibold text-gray-900">
            {current.heading}
          </h2>
          <p className="text-xs text-gray-600">Tap a section to open it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggleAll} className={actionClass}>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFullScreen(true);
              report('full_screen');
            }}
            className={actionClass}
          >
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
            </svg>
            Full screen
          </button>
        </div>
      </div>

      {viewSwitch && <div className="mb-4">{viewSwitch}</div>}

      <RootHeader root={root} />

      <ul className="mm-tree mt-3" style={{ '--mm-tick-y': '21px' } as React.CSSProperties}>
        {branches.map((branch, i) => {
          const id = `${view}.${i}`;
          const color = PALETTE[i % PALETTE.length];
          const open = expanded.has(id);
          const count = branch.children?.length ?? 0;
          return (
            <li key={id}>
              {count > 0 ? (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggle(id, branch.label)}
                  className="flex w-full items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-left transition hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  <span
                    className="flex h-5 w-5 flex-none items-center justify-center rounded border"
                    style={{ color, borderColor: color }}
                  >
                    <ToggleIcon open={open} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900">{branch.label}</span>
                    {branch.details && <span className="block text-xs text-gray-600">{branch.details}</span>}
                  </span>
                  <span className="flex-none text-xs text-gray-500">{count} {count === 1 ? 'point' : 'points'}</span>
                </button>
              ) : (
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2" style={{ borderLeft: `3px solid ${color}` }}>
                  <Leaf node={branch} />
                </div>
              )}
              {open && branch.children && (
                <div className="mt-2 mb-1 ml-3">
                  <NodeList nodes={branch.children} prefix={id} color={color} expanded={expanded} onToggle={toggle} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        aria-labelledby={dialogHeadingId}
        onClose={() => setFullScreen(false)}
        onClick={(e) => {
          // Click on the backdrop (the dialog element itself, outside the panel) closes it.
          if (e.target === e.currentTarget) setFullScreen(false);
        }}
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-gray-900/60 sm:m-auto sm:h-[min(92vh,900px)] sm:w-[min(96vw,1200px)]"
      >
        {fullScreen && (
          <div className="flex h-full flex-col overflow-hidden bg-white sm:rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id={dialogHeadingId} className="text-base font-semibold text-gray-900">
                  {current.heading}
                </h2>
                {viewSwitch}
              </div>
              <button type="button" onClick={() => setFullScreen(false)} className={actionClass}>
                Close
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
              <RootHeader root={root} />
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {branches.map((branch, i) => {
                  const color = PALETTE[i % PALETTE.length];
                  return (
                    <div
                      key={`${view}.${i}`}
                      className="rounded-lg border border-gray-200 bg-white p-4"
                      style={{ borderTop: `3px solid ${color}` }}
                    >
                      <h3 className="text-sm font-semibold" style={{ color }}>
                        {branch.label}
                      </h3>
                      {branch.details && <p className="mt-1 text-xs text-gray-600">{branch.details}</p>}
                      {branch.children && (
                        <ul className="mt-3 space-y-3">
                          {branch.children.map((child, j) => (
                            <li key={j}>
                              <Leaf node={child} />
                              {child.children && (
                                <div className="mt-2 ml-1">
                                  <OpenList nodes={child.children} color={color} />
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
