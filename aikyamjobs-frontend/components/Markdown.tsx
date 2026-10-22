'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getStrapiMediaUrl } from '@/lib/api';
import { isSafeHref } from '@/lib/url-safety';

interface MarkdownProps {
  content: string;
  className?: string;
}

export default function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, href, ...props }) => (
            isSafeHref(href)
              ? <a {...props} href={href} target="_blank" rel="noopener noreferrer" />
              : <span {...props} />
          ),
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ node, src, alt, ...props }) => (
            <img src={getStrapiMediaUrl(typeof src === 'string' ? src : undefined)} alt={alt || ''} {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
