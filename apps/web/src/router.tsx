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
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

// ── Auth check ─────────────────────────────────────────────────

async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/" });
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

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
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

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
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
  loginRoute,
  callbackRoute,
  waitlistRoute,
  appRoute.addChildren([
    indexRoute,
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
