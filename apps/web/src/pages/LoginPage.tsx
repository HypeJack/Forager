import { Link } from "@tanstack/react-router";

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-background">
      <div className="w-full max-w-xl mx-auto px-6 py-12">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary mb-4 shadow-sm">
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
