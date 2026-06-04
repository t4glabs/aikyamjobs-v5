import Link from "next/link";
import { getCompanies } from "@/lib/api";
import { Company, StrapiResponse } from "@/lib/types";

// Helper to extract plain text from markdown
function getPlainTextExcerpt(markdown: string, maxLength: number = 150): string {
  if (!markdown) return '';

  // Remove markdown images ![alt](url)
  let text = markdown.replace(/!\[.*?\]\(.*?\)/g, '');

  // Remove markdown links [text](url) but keep text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // Remove markdown headers (#, ##, etc)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove markdown bold/italic (**text**, *text*, __text__, _text_)
  text = text.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');

  // Remove code blocks and inline code
  text = text.replace(/`{1,3}[^`]+`{1,3}/g, '');

  // Remove extra whitespace and newlines
  text = text.replace(/\s+/g, ' ').trim();

  // Truncate to max length
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }

  return text;
}

export default async function CompaniesPage() {
  const companiesResponse: StrapiResponse<Company[]> = await getCompanies();
  const companies = companiesResponse.data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-2">
            Discover organizations making an impact
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {company.attributes.name}
              </h2>
              {company.attributes.location && (
                <p className="text-gray-600 mb-2">📍 {company.attributes.location}</p>
              )}
              {company.attributes.industry && (
                <p className="text-sm text-gray-500 mb-3">
                  {company.attributes.industry}
                </p>
              )}
              {company.attributes.description && (
                <p className="text-gray-700 line-clamp-3">
                  {getPlainTextExcerpt(company.attributes.description, 150)}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
