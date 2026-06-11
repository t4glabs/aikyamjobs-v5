import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-gray-200 leading-none select-none">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Page not found</h1>
        <p className="mt-3 text-gray-500 text-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/jobs"
            className="btn-brand px-5 py-2 rounded-full text-sm font-medium"
          >
            Browse Jobs
          </Link>
          <Link
            href="/"
            className="px-5 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:border-gray-400 transition"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
