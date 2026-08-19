"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface NavLink {
  label: string;
  url: string;
  external?: boolean;
}

interface NavbarClientProps {
  logoUrl: string | null;
  siteName: string;
  brandColor: string;
  navLinks: NavLink[];
}

export default function NavbarClient({ logoUrl, siteName, brandColor, navLinks }: NavbarClientProps) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo — Strapi logo if set, otherwise the brand lockup */}
          <Link href="/" aria-label={siteName} className="flex items-center" onClick={() => setOpen(false)}>
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={siteName}
                width={140}
                height={32}
                className="object-contain h-8 w-auto"
                unoptimized
              />
            ) : (
              <span
                className="inline-flex items-center gap-[13px] rounded px-3 py-2.5"
                style={{ background: brandColor }}
              >
                <Image
                  src="/logo/clasp-vector-bold-white.svg"
                  alt=""
                  width={28}
                  height={32}
                  className="block flex-none"
                  unoptimized
                />
                <span className="whitespace-nowrap text-[15px] font-semibold tracking-[0.02em] text-white">
                  aikyam <span className="font-normal tracking-[-0.02em]">jobs</span>
                </span>
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.url}
                href={link.url}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center min-h-11 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/subscribe"
              className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium transition hover:opacity-80"
              style={{ border: `1px solid ${brandColor}`, color: brandColor }}
            >
              Get job alerts
            </Link>
          </div>

          {/* Mobile hamburger — 44px target */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-11 h-11 gap-1.5"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <span className={`block h-0.5 w-5 bg-gray-800 transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 w-5 bg-gray-800 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-gray-800 transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-2 flex flex-col">
          {navLinks.map((link) => (
            <Link
              key={link.url}
              href={link.url}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="flex items-center min-h-11 text-[15px] text-gray-700 hover:text-gray-900 border-b border-gray-50 transition"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/subscribe"
            className="flex items-center justify-center min-h-11 mt-3 mb-1 rounded-md text-[15px] font-medium transition hover:opacity-80"
            style={{ border: `1px solid ${brandColor}`, color: brandColor }}
            onClick={() => setOpen(false)}
          >
            Get job alerts
          </Link>
        </div>
      )}
    </nav>
  );
}
