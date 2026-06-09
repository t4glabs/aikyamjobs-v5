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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/companies" className="text-blue-600 hover:text-blue-700 font-medium">
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
              <h1 className="text-4xl font-bold text-gray-900">
                {company.attributes.name}
              </h1>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              {company.attributes.location && (
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">📍</span>
                  <span>{company.attributes.location}</span>
                </div>
              )}
              {company.attributes.size && (
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">👥</span>
                  <span>{company.attributes.size}</span>
                </div>
              )}
              {company.attributes.industry && (
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">🏢</span>
                  <span>{company.attributes.industry}</span>
                </div>
              )}
            </div>

            {company.attributes.website && (
              <a
                href={company.attributes.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition mb-6"
              >
                Visit Website →
              </a>
            )}

            {company.attributes.description && (
              <div className="mt-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                <Markdown
                  content={company.attributes.description}
                  className="prose max-w-none"
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Open Positions</h2>
            <div className="space-y-4">
              {/* Job listings will be populated when jobs are added */}
              <p className="text-gray-600">
                View all jobs from {company.attributes.name} on our{" "}
                <Link href="/jobs" className="text-blue-600 hover:text-blue-700">
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
