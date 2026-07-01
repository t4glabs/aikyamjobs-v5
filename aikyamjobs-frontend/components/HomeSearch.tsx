'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MEILI_URL = process.env.NEXT_PUBLIC_MEILISEARCH_URL || 'https://search.aikyamfellows.org';
const MEILI_KEY = process.env.NEXT_PUBLIC_MEILISEARCH_KEY || '';
const INDEX     = 'aikyamjobs_search';

interface Hit {
  id: string;
  type: 'job' | 'company' | 'blog';
  title: string;
  excerpt: string;
  url: string;
  location?: string;
  jobType?: string;
  company?: string;
  industry?: string;
  author?: string;
  _formatted?: { title?: string };
}

async function quickSearch(query: string): Promise<Hit[]> {
  const res = await fetch(`${MEILI_URL}/indexes/${INDEX}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MEILI_KEY ? { Authorization: `Bearer ${MEILI_KEY}` } : {}),
    },
    body: JSON.stringify({
      q: query,
      limit: 12,
      attributesToHighlight: ['title'],
      highlightPreTag: '<mark class="bg-yellow-100 text-yellow-900">',
      highlightPostTag: '</mark>',
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.hits || [];
}

const TYPE_LABEL: Record<string, string> = { job: 'Jobs', company: 'Companies', blog: 'Blogs & Resources' };
const TYPE_ORDER = ['job', 'company', 'blog'];

export default function HomeSearch() {
  const [query, setQuery]       = useState('');
  const [hits, setHits]         = useState<Hit[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapperRef              = useRef<HTMLDivElement>(null);
  const router                  = useRouter();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setHits([]); setOpen(false); return; }
    setLoading(true);
    const results = await quickSearch(q.trim());
    setHits(results);
    setOpen(results.length > 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  // Group hits by type, max 3 per type
  const grouped = TYPE_ORDER.reduce<Record<string, Hit[]>>((acc, type) => {
    const items = hits.filter(h => h.type === type).slice(0, 3);
    if (items.length) acc[type] = items;
    return acc;
  }, {});

  return (
    <div ref={wrapperRef} className="relative mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); if (!e.target.value.trim()) setOpen(false); }}
              onFocus={() => { if (hits.length) setOpen(true); }}
              placeholder="Search jobs, organisations, resources…"
              className="w-full px-5 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono text-sm text-gray-900 placeholder:text-gray-400"
              autoComplete="off"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-4 w-4 rounded-full border-2 border-gray-200 border-t-gray-500" />
              </div>
            )}
          </div>
          <button
            type="submit"
            className="btn-brand px-8 py-3 rounded-lg font-mono text-sm font-semibold"
          >
            Search
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {TYPE_ORDER.filter(t => grouped[t]).map((type, i) => (
            <div key={type}>
              {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
              {/* Section header */}
              <div className="px-4 pt-3 pb-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {TYPE_LABEL[type]}
                </span>
              </div>
              {grouped[type].map(hit => (
                <Link
                  key={hit.id}
                  href={hit.url}
                  onClick={() => setOpen(false)}
                  className="flex flex-col px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <span
                    className="text-sm font-medium text-gray-900 leading-snug"
                    dangerouslySetInnerHTML={{ __html: hit._formatted?.title || hit.title }}
                  />
                  <span className="text-xs text-gray-400 mt-0.5 truncate">
                    {type === 'job'     && [hit.company, hit.location, hit.jobType].filter(Boolean).join(' · ')}
                    {type === 'company' && [hit.industry, hit.location].filter(Boolean).join(' · ')}
                    {type === 'blog'    && hit.author ? `by ${hit.author}` : ''}
                  </span>
                </Link>
              ))}
            </div>
          ))}

          {/* View all */}
          <div className="border-t border-gray-100 px-4 py-3">
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              View all results for &ldquo;{query}&rdquo; →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
