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

        {/* Agent Showcase */}
        <div className="mt-24 sm:mt-32 w-full pt-16 sm:pt-24 border-t border-neutral-200">
          <div className="text-center space-y-6 mb-12 sm:mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-950">
              Meet your grant team
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Four specialist AI agents, engineered to work the way a great development office does.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-left">
            <div className="p-6 sm:p-8 rounded-2xl bg-surface-card border border-neutral-200 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Scout — the finder.</h3>
              <p className="text-neutral-600 leading-relaxed">
                Sweeps funding sources against your mission, budget, and eligibility. Scores every opportunity 0–100 and shows its reasoning — nothing slips past, nothing is hidden.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-surface-card border border-neutral-200 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Librarian — the memory.</h3>
              <p className="text-neutral-600 leading-relaxed">
                Reads and indexes your organization's documents, so every answer and every draft is grounded in your own history.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-surface-card border border-neutral-200 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Architect — the writer.</h3>
              <p className="text-neutral-600 leading-relaxed">
                Drafts grounded, cited proposal sections from your own materials — ready for your team to refine, never generic boilerplate.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-surface-card border border-neutral-200 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Liaison — the relationship-keeper.</h3>
              <p className="text-neutral-600 leading-relaxed">
                Tracks funders, deadlines, and follow-ups so no relationship goes cold.
              </p>
            </div>
          </div>
          
          <div className="mt-12 sm:mt-16 text-center">
            <p className="text-base italic text-neutral-500">
              Your team stays in control — Forager drafts, scores, and recommends. It never submits on your behalf.
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
