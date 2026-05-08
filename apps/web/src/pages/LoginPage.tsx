import { useState } from "react";
import { signInWithMagicLink } from "@/lib/auth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signInWithMagicLink(email);
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSubmitted(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-background">
      <div className="w-full max-w-md mx-auto px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary mb-4">
            <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
              <path
                d="M16 6C12.5 6 10 8.5 10 11.5C10 14.5 12 16 14 17.5C14.5 17.9 15 18.3 15 19V22H17V19C17 18.3 17.5 17.9 18 17.5C20 16 22 14.5 22 11.5C22 8.5 19.5 6 16 6Z"
                fill="#D4A373"
              />
              <path
                d="M14 24H18V25C18 25.6 17.6 26 17 26H15C14.4 26 14 25.6 14 25V24Z"
                fill="#D4A373"
                opacity="0.7"
              />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-bold text-neutral-950">
            Welcome to Forager
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Sign in with your email to continue
          </p>
        </div>

        {/* Form */}
        <div className="bg-surface-card border border-neutral-200 rounded-xl p-6 shadow-md">
          {submitted ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-semantic-success/10 mb-3">
                <svg className="w-6 h-6 text-semantic-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <h2 className="font-semibold text-neutral-900 mb-1">Check your email</h2>
              <p className="text-sm text-neutral-500">
                We sent a magic link to <strong className="text-neutral-700">{email}</strong>.
                Click the link in your email to sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@sunrisehealth.org"
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-surface-background text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors"
              />

              {error && (
                <p className="text-sm text-semantic-error mt-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                id="btn-magic-link"
                className="w-full mt-4 px-4 py-2.5 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Built for mission-driven organizations.
        </p>
      </div>
    </div>
  );
}
