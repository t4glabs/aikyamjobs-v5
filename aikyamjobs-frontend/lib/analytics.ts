// Thin wrapper around the Plausible custom-event API (window.plausible, loaded
// in app/layout.tsx). Centralized so every call site sends props the same
// shape — and so this is the one place to touch if the analytics vendor ever
// changes. No-ops on the server and if the script hasn't loaded yet.

type EventProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: EventProps }) => void;
  }
}

export function track(event: string, props?: EventProps) {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') return;
  window.plausible(event, props ? { props } : undefined);
}
