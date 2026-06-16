import Link from "next/link";

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="link-brand font-mono text-sm font-medium">
            ← Back to home
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Subscribe for Job Alerts
            </h1>
            <p className="text-gray-600 mb-6">
              Join a community discovering meaningful careers in social impact.
            </p>
            <form
              method="post"
              action="https://mails.tinybridge.org/subscription/form"
              className="space-y-4"
            >
              <input type="hidden" name="nonce" />
              <input
                type="hidden"
                name="l"
                value="4ab2985e-c34e-41c3-9370-7024f8b27bae"
              />

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono text-sm text-gray-900 placeholder:text-gray-400"
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                className="btn-brand w-full px-6 py-3 rounded-lg font-mono text-sm font-semibold"
              >
                Subscribe
              </button>
            </form>

            <p className="text-sm text-gray-500 mt-4">
              By subscribing, you agree to receive job alerts and updates from aikyam jobs.
              You can unsubscribe from any email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
