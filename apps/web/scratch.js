import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

const rootRoute = createRootRoute();
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => null });
const appRoute = createRoute({ getParentRoute: () => rootRoute, id: "app", component: () => null });
const indexRoute = createRoute({ getParentRoute: () => appRoute, path: "/", component: () => null });

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([indexRoute])
]);

try {
  const router = createRouter({ routeTree });
  console.log("Router created successfully");
} catch (e) {
  console.error("Router error:", e.message);
}
