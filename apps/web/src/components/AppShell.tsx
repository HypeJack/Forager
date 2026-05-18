import { Outlet, Link, useRouter, useParams } from "@tanstack/react-router";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { TenantThemeProvider } from "@/components/TenantThemeProvider";

/**
 * Authenticated app shell with sidebar navigation.
 * Wraps all authenticated routes.
 */
export function AppShell() {
  const { user } = useAuth();
  const router = useRouter();
  const { slug } = useParams({ strict: false }) as { slug: string };


  async function handleSignOut() {
    await signOut();
    router.navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen bg-surface-background">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-950 text-neutral-300 flex flex-col border-r border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
              <path d="M16 6C12.5 6 10 8.5 10 11.5C10 14.5 12 16 14 17.5C14.5 17.9 15 18.3 15 19V22H17V19C17 18.3 17.5 17.9 18 17.5C20 16 22 14.5 22 11.5C22 8.5 19.5 6 16 6Z" fill="#D4A373" />
            </svg>
          </div>
          <span className="font-serif text-lg font-bold text-white tracking-tight">Forager</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            to="/org/$slug"
            params={{ slug: slug || '' }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white [&.active]:bg-white/8 [&.active]:text-white"
            activeProps={{ className: "active bg-white/8 text-white" }}
            id="nav-profile"
            activeOptions={{ exact: true }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </Link>

          <Link
            to="/org/$slug/vault"
            params={{ slug: slug || '' }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white [&.active]:bg-white/8 [&.active]:text-white"
            activeProps={{ className: "active bg-white/8 text-white" }}
            id="nav-vault"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Vault
          </Link>

          <Link
            to="/org/$slug/opportunities"
            params={{ slug: slug || '' }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white [&.active]:bg-white/8 [&.active]:text-white"
            activeProps={{ className: "active bg-white/8 text-white" }}
            id="nav-opportunities"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
               <circle cx="11" cy="11" r="8"></circle>
               <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Opportunities
          </Link>

          <Link
            to="/org/$slug/pipeline"
            params={{ slug: slug || '' }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white [&.active]:bg-white/8 [&.active]:text-white"
            activeProps={{ className: "active bg-white/8 text-white" }}
            id="nav-pipeline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
               <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
               <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            Pipeline
          </Link>

          <Link
            to="/org/$slug/agents"
            params={{ slug: slug || '' }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white [&.active]:bg-white/8 [&.active]:text-white"
            activeProps={{ className: "active bg-white/8 text-white" }}
            id="nav-agents"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
               <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            Activity
          </Link>
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-brand-accent text-neutral-950 text-xs font-bold flex items-center justify-center">
              {user?.email?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              aria-label="Sign out"
              id="btn-sign-out"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <TenantThemeProvider>
          <Outlet />
        </TenantThemeProvider>
      </main>
    </div>
  );
}
