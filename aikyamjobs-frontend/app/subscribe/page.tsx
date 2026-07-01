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
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 mb-2">Prefer WhatsApp?</p>
              <a
                href="https://whatsapp.com/channel/0029Vb8DvZ5CxoAsvj0Oie2C"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition"
              >
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Join our WhatsApp channel
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
