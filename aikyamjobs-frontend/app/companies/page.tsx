export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getCompanies, getStrapiMediaUrl } from "@/lib/api";
import { Company, StrapiResponse } from "@/lib/types";

function truncate(text: string): string {
  if (!text) return '';
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    .replace(/`{1,3}[^`]+`{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;

  const companiesResponse: StrapiResponse<Company[]> = await getCompanies(page, 24);
  const companies = companiesResponse.data;
  const pagination = companiesResponse.meta?.pagination;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-2">
            Discover organizations making an impact
            {pagination && <span className="text-gray-600 text-sm ml-2">— {pagination.total} organisations</span>}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.attributes.slug}`}
              className="bg-white border border-gray-200 rounded-lg p-6 transition hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-4 mb-3">
                {company.attributes.logo?.data && (
                  <img
                    src={getStrapiMediaUrl(company.attributes.logo.data.attributes.url)}
                    alt={company.attributes.name}
                    className="w-14 h-14 object-contain rounded-lg border border-gray-100 flex-shrink-0"
                  />
                )}
                <h2 className="text-[19px] font-semibold tracking-tight text-gray-900">
                  {company.attributes.name}
                </h2>
              </div>
              {(company.attributes.location || company.attributes.industry) && (
                <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                  {company.attributes.location && <span>{company.attributes.location}</span>}
                  {company.attributes.location && company.attributes.industry && (
                    <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                  )}
                  {company.attributes.industry && <span>{company.attributes.industry}</span>}
                </div>
              )}
              {(company.attributes.excerpt || company.attributes.description) && (
                <p className="text-[15px] leading-relaxed text-gray-700 line-clamp-3">
                  {truncate(company.attributes.excerpt || company.attributes.description || '')}
                </p>
              )}
            </Link>
          ))}
        </div>

        {pagination && pagination.pageCount > 1 && (
          <div className="flex items-center justify-center gap-8 mt-10 text-sm">
            {page > 1 ? (
              <Link
                href={`/companies?page=${page - 1}`}
                className="inline-flex items-center min-h-11 px-1 text-gray-600 hover:text-gray-900 transition"
              >
                ← Previous
              </Link>
            ) : (
              <span className="inline-flex items-center min-h-11 px-1 text-gray-300">← Previous</span>
            )}
            <span className="text-gray-600">{page} of {pagination.pageCount}</span>
            {page < pagination.pageCount ? (
              <Link
                href={`/companies?page=${page + 1}`}
                className="inline-flex items-center min-h-11 px-1 text-gray-600 hover:text-gray-900 transition"
              >
                Next →
              </Link>
            ) : (
              <span className="inline-flex items-center min-h-11 px-1 text-gray-300">Next →</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
