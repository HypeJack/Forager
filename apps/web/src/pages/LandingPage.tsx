import { Link } from "@tanstack/react-router";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-background">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-neutral-200 bg-white">
        <img
          src="/logo-forager.svg"
          alt="Forager"
          className="w-auto h-8"
        />
        <Link
          to="/login"
          className="inline-flex items-center justify-center py-2 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Log in
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-24 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-6 mb-16">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-950 tracking-tight">
            Find the grants others miss.
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Forager discovers funding opportunities and scores every one 0–100 against your organization's actual profile — mission, budget, eligibility — so your pipeline is ranked, explained, and defensible.
          </p>
          <div className="pt-4">
            <Link
              to="/login"
              className="inline-flex items-center justify-center py-3.5 px-8 bg-brand-primary hover:bg-brand-primary-light text-white text-lg font-semibold rounded-lg transition-colors shadow-sm"
            >
              Log in
            </Link>
          </div>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 text-left">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-neutral-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Scored, not filtered.</h3>
            <p className="text-neutral-600 leading-relaxed">
              Every discovered opportunity gets a 0–100 fit score. Nothing is silently dropped, so you see the whole landscape — ranked.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-neutral-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Every score explained.</h3>
            <p className="text-neutral-600 leading-relaxed">
              A plain-English rationale on every grant: why it fits, or why it doesn't. Reasoning you can defend to your board.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-neutral-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Drafts grounded in your documents.</h3>
            <p className="text-neutral-600 leading-relaxed">
              Proposal drafts cite your organization's own document history — not generic boilerplate.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-neutral-200 text-center">
        <p className="text-sm text-neutral-500">© 2026 Forager</p>
      </footer>
    </div>
  );
}
