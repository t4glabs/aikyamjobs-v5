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
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
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
              <span className="font-semibold text-gray-900 tracking-tight">{siteName}</span>
            )}
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.url}
                href={link.url}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="text-sm text-gray-600 hover:text-gray-900 transition"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/subscribe"
              className="text-sm px-4 py-1.5 rounded-full font-medium transition hover:opacity-80"
              style={{ border: `1.5px solid ${brandColor}`, color: brandColor }}
            >
              Subscribe
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.url}
              href={link.url}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="text-sm text-gray-700 hover:text-gray-900 py-2 border-b border-gray-50 transition"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/subscribe"
            className="text-sm px-4 py-2 rounded-full font-medium text-center mt-2 transition hover:opacity-80"
            style={{ border: `1.5px solid ${brandColor}`, color: brandColor }}
            onClick={() => setOpen(false)}
          >
            Subscribe
          </Link>
        </div>
      )}
    </nav>
  );
}
