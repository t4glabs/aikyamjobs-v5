'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

// ── Config ────────────────────────────────────────────────────────────────────
// Set NEXT_PUBLIC_MEILISEARCH_URL and NEXT_PUBLIC_MEILISEARCH_KEY in .env.local
const MEILI_URL = process.env.NEXT_PUBLIC_MEILISEARCH_URL || 'https://search.aikyamfellows.org';
const MEILI_KEY = process.env.NEXT_PUBLIC_MEILISEARCH_KEY || '';
const INDEX     = 'aikyamjobs_search';

// ── Types ─────────────────────────────────────────────────────────────────────
type ResultType = 'job' | 'company' | 'blog';
type FilterType = 'all' | ResultType;

interface SearchHit {
  id: string;
  type: ResultType;
  title: string;
  excerpt: string;
  url: string;
  location?: string;
  jobType?: string;
  experienceLevel?: string;
  company?: string;
  categories?: string[];
  skills?: string[];
  industry?: string;
  author?: string;
  category?: string;
  featured?: boolean;
  published_at?: string;
  _formatted?: {
    title?: string;
    excerpt?: string;
    content?: string;
    company?: string;
  };
}

// ── Meilisearch fetch ─────────────────────────────────────────────────────────
async function searchMeili(query: string, filter: FilterType): Promise<{ hits: SearchHit[]; processingTimeMs: number; estimatedTotalHits: number }> {
  const body: Record<string, unknown> = {
    q: query,
    limit: 40,
    attributesToHighlight: ['title', 'excerpt', 'company'],
    highlightPreTag: '<mark class="bg-yellow-100 text-yellow-900 rounded-sm px-0.5">',
    highlightPostTag: '</mark>',
  };

  if (filter !== 'all') {
    body.filter = `type = ${filter}`;
  }

  const res = await fetch(`${MEILI_URL}/indexes/${INDEX}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MEILI_KEY ? { Authorization: `Bearer ${MEILI_KEY}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

// ── Badge helpers ─────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<ResultType, string> = {
  job: 'Job',
  company: 'Company',
  blog: 'Blog / Resource',
};

const TYPE_COLORS: Record<ResultType, string> = {
  job:     'bg-green-50 text-green-700 border-green-200',
  company: 'bg-blue-50 text-blue-700 border-blue-200',
  blog:    'bg-purple-50 text-purple-700 border-purple-200',
};

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ hit }: { hit: SearchHit }) {
  const title   = hit._formatted?.title   || hit.title;
  const excerpt = hit._formatted?.excerpt || hit.excerpt;
  const company = hit._formatted?.company || hit.company;

  return (
    <Link
      href={hit.url}
      target={hit.url.startsWith('http') && !hit.url.includes('aikyamjobs.org') ? '_blank' : undefined}
      rel="noreferrer"
      className="group flex flex-col gap-3 p-5 border border-gray-200 rounded-xl bg-white hover:shadow-sm transition-shadow"
    >
      {/* Top row: type badge + featured */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center border px-1.5 py-0.5 text-xs font-semibold rounded-sm ${TYPE_COLORS[hit.type]}`}>
          {TYPE_LABELS[hit.type]}
        </span>
        {hit.featured && (
          <span className="text-xs font-semibold text-amber-600">★ Featured</span>
        )}
      </div>

      {/* Title */}
      <h3
        className="text-base font-semibold text-gray-900 group-hover:text-gray-700 leading-snug"
        dangerouslySetInnerHTML={{ __html: title }}
      />

      {/* Company (for jobs) */}
      {company && hit.type === 'job' && (
        <p
          className="text-sm text-gray-500 -mt-1"
          dangerouslySetInnerHTML={{ __html: company }}
        />
      )}

      {/* Excerpt */}
      {excerpt && (
        <p
          className="text-sm text-gray-500 leading-relaxed line-clamp-2"
          dangerouslySetInnerHTML={{ __html: excerpt }}
        />
      )}

      {/* Meta chips */}
      <div className="flex flex-wrap gap-1.5 mt-1">
        {hit.type === 'job' && (
          <>
            {hit.location && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{hit.location}</span>
            )}
            {hit.jobType && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{hit.jobType}</span>
            )}
            {(hit.categories || []).slice(0, 2).map(cat => (
              <span key={cat} className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-50 text-gray-500 rounded-full">{cat}</span>
            ))}
          </>
        )}
        {hit.type === 'company' && hit.industry && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{hit.industry}</span>
        )}
        {hit.type === 'blog' && hit.category && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full capitalize">{hit.category}</span>
        )}
        {hit.type === 'blog' && hit.author && (
          <span className="text-xs text-gray-400">by {hit.author}</span>
        )}
      </div>

      {/* Date */}
      {hit.published_at && (
        <p className="text-xs text-gray-400 mt-auto">{formatDate(hit.published_at)}</p>
      )}
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [query,   setQuery]   = useState(searchParams.get('q') || '');
  const [filter,  setFilter]  = useState<FilterType>('all');
  const [hits,    setHits]    = useState<SearchHit[]>([]);
  const [total,   setTotal]   = useState(0);
  const [timing,  setTiming]  = useState(0);
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef    = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (q: string, f: FilterType) => {
    if (!q.trim()) { setStatus('idle'); setHits([]); return; }
    setStatus('loading');
    try {
      const { hits: h, processingTimeMs, estimatedTotalHits } = await searchMeili(q.trim(), f);
      setHits(h);
      setTotal(estimatedTotalHits);
      setTiming(processingTimeMs);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, []);

  // Debounce as user types
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query, filter), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, filter, runSearch]);

  // Sync URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (query) params.set('q', query); else params.delete('q');
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [query]);

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const FILTERS: { value: FilterType; label: string; count?: number }[] = [
    { value: 'all',     label: 'All' },
    { value: 'job',     label: 'Jobs' },
    { value: 'company', label: 'Companies' },
    { value: 'blog',    label: 'Blogs' },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero / search bar ── */}
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Search aikyamjobs</h1>
          <p className="text-sm text-gray-500 mb-8">Search across jobs, organisations, and resources</p>

          {/* Input */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search jobs, companies, resources…"
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-600 focus:ring-2 focus:ring-gray-600/20 transition-colors shadow-sm"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Stats */}
          {status === 'done' && query && (
            <p className="mt-4 text-xs text-gray-400">
              {total} result{total !== 1 ? 's' : ''} for <strong className="text-gray-600">&ldquo;{query}&rdquo;</strong> · {timing}ms
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Filter tabs ── */}
        {status !== 'idle' && (
          <div className="flex items-center gap-1 mb-6">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`h-8 px-3 rounded-md text-sm font-medium transition-all ${
                  filter === f.value
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {f.label}
                {f.value !== 'all' && status === 'done' && (
                  <span className={`ml-1.5 text-xs ${filter === f.value ? 'text-gray-300' : 'text-gray-400'}`}>
                    {hits.filter(h => h.type === f.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading ── */}
        {status === 'loading' && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="animate-spin h-6 w-6 rounded-full border-2 border-gray-200 border-t-gray-900" />
            <p className="text-sm text-gray-400">Searching…</p>
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <div className="text-center py-16">
            <p className="text-sm text-red-500">Search is unavailable right now. Please try again.</p>
          </div>
        )}

        {/* ── No results ── */}
        {status === 'done' && hits.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg font-medium text-gray-700">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-sm text-gray-400 mt-2">Try different keywords or browse by category</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Link href="/jobs" className="inline-flex items-center h-8 px-4 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Browse jobs</Link>
              <Link href="/companies" className="inline-flex items-center h-8 px-4 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Browse companies</Link>
            </div>
          </div>
        )}

        {/* ── Results grid ── */}
        {status === 'done' && hits.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hits
              .filter(h => filter === 'all' || h.type === filter)
              .map(hit => (
                <ResultCard key={hit.id} hit={hit} />
              ))
            }
          </div>
        )}

        {/* ── Idle state ── */}
        {status === 'idle' && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">Start typing to search across all content</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Link href="/jobs" className="inline-flex items-center h-8 px-4 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Browse jobs</Link>
              <Link href="/companies" className="inline-flex items-center h-8 px-4 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Browse companies</Link>
              <Link href="/blogs" className="inline-flex items-center h-8 px-4 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Browse blogs</Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
