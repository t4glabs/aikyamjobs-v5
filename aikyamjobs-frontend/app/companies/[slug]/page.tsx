export const dynamic = 'force-dynamic';

import Link from "next/link";
import Image from "next/image";
import { getCompany, getCompanyMindmap, getStrapiMediaUrl } from "@/lib/api";
import { Company, MindmapNode, StrapiResponse } from "@/lib/types";
import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import CompanyWebsiteLink from "@/components/CompanyWebsiteLink";
import MindmapPanel from "@/components/MindmapPanel";
import { Fragment } from "react";

// "https://www.ekjutindia.org/about" -> "ekjutindia.org"; falls back to a
// plain label for anything that doesn't parse as a URL.
function websiteLabel(website: string) {
  try {
    return new URL(website).hostname.replace(/^www\./, '') || 'Website';
  } catch {
    return 'Website';
  }
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [companyResponse, orgMap]: [StrapiResponse<Company[]>, MindmapNode | null] = await Promise.all([
    getCompany(slug),
    getCompanyMindmap(slug),
  ]);

  if (!companyResponse.data || companyResponse.data.length === 0) {
    notFound();
  }

  const company = companyResponse.data[0];
  const facts = [company.attributes.location, company.attributes.size, company.attributes.industry].filter(
    (f): f is string => Boolean(f)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href="/companies" className="link-brand font-medium">
            ← Back to all companies
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            {/* Header mirrors the JD page's: logo tile, title, dot-separated
                facts. The website is a secondary action here (brand red is
                kept for Apply), so it's a quiet outlined button showing the
                actual domain rather than a generic "Visit Website". */}
            <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-gray-200 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4 min-w-0">
                {company.attributes.logo?.data ? (
                  <Image
                    src={getStrapiMediaUrl(company.attributes.logo.data.attributes.url)}
                    alt=""
                    width={56}
                    height={56}
                    className="w-14 h-14 flex-none object-contain rounded-md border border-gray-200"
                  />
                ) : (
                  <span className="w-14 h-14 flex-none flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-lg font-semibold text-gray-500">
                    {company.attributes.name?.charAt(0) ?? '·'}
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                    {company.attributes.name}
                  </h1>
                  {facts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                      {facts.map((fact, i) => (
                        <Fragment key={i}>
                          {i > 0 && <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />}
                          <span>{fact}</span>
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {company.attributes.website && (
                <CompanyWebsiteLink
                  href={company.attributes.website}
                  companySlug={company.attributes.slug}
                  className="inline-flex flex-none items-center gap-1.5 self-start rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  {websiteLabel(company.attributes.website)}
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 3.5H3.5v9h9v-3M9.5 2.5h4v4M13.5 2.5 7.5 8.5" />
                  </svg>
                  <span className="sr-only">(opens in a new tab)</span>
                </CompanyWebsiteLink>
              )}
            </div>

            {orgMap && (
              <MindmapPanel
                views={[{ key: 'org', heading: 'Organisation at a glance', tree: orgMap }]}
                event="Company Mindmap Used"
                eventProps={{ company_slug: company.attributes.slug }}
              />
            )}

            {company.attributes.description && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <Markdown
                  content={company.attributes.description}
                  className="prose"
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Open Positions</h2>
            <div className="space-y-4">
              {/* Job listings will be populated when jobs are added */}
              <p className="text-gray-600">
                View all jobs from {company.attributes.name} on our{" "}
                <Link href="/jobs" className="link-brand">
                  jobs page
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
