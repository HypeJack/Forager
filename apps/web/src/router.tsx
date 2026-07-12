import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { LoginPage } from "@/pages/LoginPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { WaitlistPage } from "@/pages/WaitlistPage";
import { VaultPage } from "@/pages/VaultPage";
import { OrgProfilePage } from "@/pages/OrgProfilePage";
import { OpportunitiesPage } from "@/pages/OpportunitiesPage";
import { OpportunityDetailPage } from "@/pages/OpportunityDetailPage";
import { DraftEditorPage } from "@/pages/DraftEditorPage";
import { PipelinePage } from "@/pages/PipelinePage";
import { AgentActivityPage } from "@/pages/AgentActivityPage";
import { LandingPage } from "@/pages/LandingPage";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

// ── Auth check ─────────────────────────────────────────────────

async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login" });
  }
  
  // Also check if user has a tenant
  const { data: user } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", session.user.id)
    .single();
    
  if (!user || !user.tenant_id) {
    throw redirect({ to: "/waitlist" });
  }
}

// ── Root Layout ────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: function RootLayout() {
    return <Outlet />;
  },
});

// ── Public Routes ──────────────────────────────────────────────

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      throw redirect({ to: "/opportunities" });
    }
  },
  component: LandingPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/callback",
  component: AuthCallbackPage,
});

const waitlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/waitlist",
  component: WaitlistPage,
});

// ── Authenticated Shell ────────────────────────────────────────

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: requireAuth,
  component: AppShell,
});

// ── Flattened Routes (No Slug) ─────────────────────────────────

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/profile",
  component: OrgProfilePage,
});

const vaultRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/vault",
  component: VaultPage,
});

const opportunitiesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/opportunities",
  component: OpportunitiesPage,
});

const opportunityDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/opportunities/$id",
  component: OpportunityDetailPage,
});

const draftEditorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/drafts/$id",
  component: DraftEditorPage,
});

const pipelineRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/pipeline",
  component: PipelinePage,
});

const agentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/agents",
  component: AgentActivityPage,
});

// ── Router Instance ────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  callbackRoute,
  waitlistRoute,
  appRoute.addChildren([
    profileRoute,
    vaultRoute,
    opportunitiesRoute,
    opportunityDetailRoute,
    draftEditorRoute,
    pipelineRoute,
    agentsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
