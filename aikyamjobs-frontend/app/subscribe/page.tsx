'use client';

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

// Sign-ups go through Strapi (/api/newsletter/subscribe), which checks a
// Cloudflare Turnstile token before Listmonk sends any email. Turnstile runs
// in "interaction-only" mode: most visitors see nothing, and a suspicious
// browser gets a single checkbox, never an image puzzle.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type Status = 'idle' | 'submitting' | 'done' | 'error';

export default function SubscribePage() {
  const widgetEl = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef('');
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const renderWidget = useCallback(() => {
    if (!SITE_KEY || !window.turnstile || !widgetEl.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetEl.current, {
      sitekey: SITE_KEY,
      action: 'subscribe',
      appearance: 'interaction-only',
      theme: 'light', // the site has no dark mode; 'auto' would follow the OS
      size: 'flexible', // spans the form width (Turnstile's minimum is 300px)
      callback: (t: string) => { token.current = t; },
      'expired-callback': () => { token.current = ''; },
      'error-callback': () => { token.current = ''; },
    });
  }, []);

  // Covers both a fresh script load and coming back to the page with the
  // script already on window.
  useEffect(() => {
    if (scriptReady || window.turnstile) renderWidget();
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [scriptReady, renderWidget]);

  // Tokens are single-use: get a fresh one after every attempt.
  function resetWidget() {
    token.current = '';
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }

  // Turnstile usually finishes within a second or two of page load; if the
  // visitor is quicker than that, wait for it rather than failing.
  async function waitForToken(timeoutMs = 20000): Promise<string> {
    const start = Date.now();
    while (!token.current && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 200));
    }
    return token.current;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    const form = new FormData(e.currentTarget);
    setStatus('submitting');
    setMessage('');

    const turnstileToken = await waitForToken();
    if (!turnstileToken) {
      setStatus('error');
      setMessage("We couldn't verify you're human. If a checkbox appeared, tick it and try again; otherwise refresh the page.");
      resetWidget();
      return;
    }

    try {
      const res = await fetch(`${STRAPI_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          website: form.get('website'),
          token: turnstileToken,
        }),
      });
      if (res.ok) {
        setStatus('done');
        track('Newsletter Subscribed');
        return;
      }
      const data = await res.json().catch(() => null);
      setStatus('error');
      setMessage(data?.error?.message || "We couldn't subscribe you right now. Please try again later.");
    } catch {
      setStatus('error');
      setMessage("We couldn't reach the server. Please check your connection and try again.");
    }
    resetWidget();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
        />
      )}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="link-brand font-mono text-sm font-medium">
            ← Back to home
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-5 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Subscribe for Job Alerts
            </h1>

            {status === 'done' ? (
              <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="font-semibold text-green-900">Almost done: check your inbox.</p>
                <p className="mt-1 text-sm text-green-800">
                  We&apos;ve sent you an email with a link to confirm your subscription. If it isn&apos;t
                  there in a few minutes, check your spam folder. (If you&apos;re already subscribed,
                  there&apos;s nothing more to do.)
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  Join a community discovering meaningful careers in social impact.
                </p>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      autoComplete="email"
                      maxLength={254}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono text-sm text-gray-900 placeholder:text-gray-500"
                      placeholder="your@email.com"
                    />
                  </div>

                  {/* Honeypot: hidden from people and screen readers; bots that
                      fill every field get silently dropped by the server. */}
                  <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                    <label htmlFor="website">Website</label>
                    <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
                  </div>

                  {/* Turnstile mounts here; it stays invisible unless it needs a click. */}
                  <div ref={widgetEl} />

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="btn-brand w-full px-6 py-3 rounded-lg font-mono text-sm font-semibold disabled:opacity-60"
                  >
                    {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
                  </button>

                  <p role="alert" aria-live="polite" className="text-sm text-red-700 empty:hidden">
                    {status === 'error' ? message : ''}
                  </p>
                </form>
              </>
            )}

            <p className="text-sm text-gray-500 mt-4">
              By subscribing, you agree to receive job alerts and updates from aikyam jobs.
              You can unsubscribe from any email.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-2">Prefer WhatsApp?</p>
              <a
                href="https://whatsapp.com/channel/0029Vb8DvZ5CxoAsvj0Oie2C"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('WhatsApp Channel Click')}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition"
              >
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Join our WhatsApp channel
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
