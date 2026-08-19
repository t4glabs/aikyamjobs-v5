export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getCompany, getStrapiMediaUrl } from "@/lib/api";
import { Company, StrapiResponse } from "@/lib/types";
import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const companyResponse: StrapiResponse<Company[]> = await getCompany(slug);

  if (!companyResponse.data || companyResponse.data.length === 0) {
    notFound();
  }

  const company = companyResponse.data[0];

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
            <div className="flex items-center gap-4 mb-4">
              {company.attributes.logo?.data && (
                <img
                  src={getStrapiMediaUrl(company.attributes.logo.data.attributes.url)}
                  alt={company.attributes.name}
                  className="w-16 h-16 object-contain rounded border border-gray-100 flex-shrink-0"
                />
              )}
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                {company.attributes.name}
              </h1>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
              {company.attributes.location && <span>{company.attributes.location}</span>}
              {company.attributes.size && (
                <>
                  <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                  <span>{company.attributes.size}</span>
                </>
              )}
              {company.attributes.industry && (
                <>
                  <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                  <span>{company.attributes.industry}</span>
                </>
              )}
            </div>

            {company.attributes.website && (
              <a
                href={company.attributes.website}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand inline-block px-6 py-2 rounded-md font-semibold mb-6"
              >
                Visit Website →
              </a>
            )}

            {company.attributes.description && (
              <div className="mt-6">
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
