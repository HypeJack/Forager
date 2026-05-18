import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { LoginPage } from "@/pages/LoginPage";
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
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({ to: "/login" });
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
  path: "/login",
  component: LoginPage,
});

// ── Authenticated Shell ────────────────────────────────────────

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: requireAuth,
  component: AppShell,
});

// ── Tenant Scoped Routes (/org/$slug) ──────────────────────────

const orgLayout = createRoute({
  getParentRoute: () => appRoute,
  path: "/org/$slug",
});

const indexRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: "/",
  component: OrgProfilePage,
});

const vaultRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: "/vault",
  component: VaultPage,
});

const opportunitiesRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: "/opportunities",
  component: OpportunitiesPage,
});

const opportunityDetailRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: "/opportunities/$id",
  component: OpportunityDetailPage,
});

const draftEditorRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: "/drafts/$id",
  component: DraftEditorPage,
});

const pipelineRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: "/pipeline",
  component: PipelinePage,
});

const agentsRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: "/agents",
  component: AgentActivityPage,
});

// ── Router Instance ────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    orgLayout.addChildren([
      indexRoute,
      vaultRoute,
      opportunitiesRoute,
      opportunityDetailRoute,
      draftEditorRoute,
      pipelineRoute,
      agentsRoute,
    ]),
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
