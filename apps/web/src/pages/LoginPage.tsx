import { Link } from "@tanstack/react-router";

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-background">
      <div className="w-full max-w-xl mx-auto px-6 py-12">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <img
            src="/logo-forager.svg"
            alt="Forager"
            className="w-auto h-8 mx-auto mb-6"
          />
          <h1 className="font-serif text-3xl font-bold text-neutral-950 mb-2">
            Welcome to Forager
          </h1>
          <p className="text-neutral-500 font-medium">
            Select a demo environment to explore the platform.
          </p>
        </div>

        {/* Demo Login Cards */}
        <div className="space-y-4">
          <Link
            to="/org/$slug/opportunities"
            params={{ slug: "sunrise" }}
            className="group block p-6 bg-surface-card border-2 border-neutral-200 rounded-2xl hover:border-brand-primary transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-neutral-900 group-hover:text-brand-primary transition-colors">
                  Sunrise Community Health
                </h2>
                <p className="text-sm text-neutral-500 mt-1">Nonprofit Demo Environment</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-colors text-brand-primary">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            to="/org/$slug/opportunities"
            params={{ slug: "northwood" }}
            className="group block p-6 bg-surface-card border-2 border-neutral-200 rounded-2xl hover:border-brand-primary transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-neutral-900 group-hover:text-brand-primary transition-colors">
                  Northwood Architects + Planners
                </h2>
                <p className="text-sm text-neutral-500 mt-1">Industry Demo Environment</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-colors text-brand-primary">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-10 uppercase tracking-widest font-semibold">
          Editorial / Trust
        </p>
      </div>
    </div>
  );
}
