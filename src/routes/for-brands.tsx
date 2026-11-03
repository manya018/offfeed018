import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/for-brands")({
  beforeLoad: ({ location }) => {
    // Only redirect the exact landing path. Child routes such as
    // /for-brands/apply must be allowed to render normally.
    if (location.pathname.replace(/\/+$/, "") === "/for-brands") {
      throw redirect({ to: "/for-brands/apply" });
    }
  },
  component: () => <Outlet />,
});
