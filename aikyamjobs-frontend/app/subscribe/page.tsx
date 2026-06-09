"use client";

import { useState } from "react";
import Link from "next/link";

export default function SubscribePage() {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/subscribers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: formData,
        }),
      });

      if (!response.ok) {
        throw new Error("Subscription failed");
      }

      setStatus("success");
      setMessage("Successfully subscribed! You'll receive job alerts in your inbox.");
      setFormData({ email: "", name: "" });
    } catch (error) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
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
              Get notified about new public interest technology jobs that match your interests.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name (optional)
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono text-sm text-gray-900 placeholder:text-gray-400"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono text-sm text-gray-900 placeholder:text-gray-400"
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="btn-brand w-full px-6 py-3 rounded-lg font-mono text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "Subscribing..." : "Subscribe"}
              </button>

              {status === "success" && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                  {message}
                </div>
              )}

              {status === "error" && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  {message}
                </div>
              )}
            </form>

            <p className="text-sm text-gray-500 mt-4">
              By subscribing, you agree to receive job alerts and updates from aikyam jobs.
              You can unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
