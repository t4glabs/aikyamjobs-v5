export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getCompanies, getStrapiMediaUrl } from "@/lib/api";
import { Company, StrapiResponse } from "@/lib/types";

function truncate(text: string): string {
  if (!text) return '';
  const plain = text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    .replace(/`{1,3}[^`]+`{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 200 ? plain.slice(0, 200) + '…' : plain;
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-2">
            Discover organizations making an impact
            {pagination && <span className="text-gray-400 text-sm ml-2">— {pagination.total} organisations</span>}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.attributes.slug}`}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="flex items-center gap-4 mb-3">
                {company.attributes.logo?.data && (
                  <img
                    src={getStrapiMediaUrl(company.attributes.logo.data.attributes.url)}
                    alt={company.attributes.name}
                    className="w-14 h-14 object-contain rounded-lg border border-gray-100 flex-shrink-0"
                  />
                )}
                <h2 className="text-xl font-bold text-gray-900">
                  {company.attributes.name}
                </h2>
              </div>
              {company.attributes.location && (
                <p className="text-sm text-gray-600 mb-2">📍 {company.attributes.location}</p>
              )}
              {company.attributes.industry && (
                <p className="text-sm text-gray-500 mb-3">
                  {company.attributes.industry}
                </p>
              )}
              {(company.attributes.excerpt || company.attributes.description) && (
                <p className="text-sm text-gray-700">
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
                className="text-gray-600 hover:text-gray-900 transition"
              >
                ← Previous
              </Link>
            ) : (
              <span className="text-gray-300">← Previous</span>
            )}
            <span className="text-gray-400">{page} of {pagination.pageCount}</span>
            {page < pagination.pageCount ? (
              <Link
                href={`/companies?page=${page + 1}`}
                className="text-gray-600 hover:text-gray-900 transition"
              >
                Next →
              </Link>
            ) : (
              <span className="text-gray-300">Next →</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
