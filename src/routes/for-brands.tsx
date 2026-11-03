import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/for-brands")({
  beforeLoad: () => {
    throw redirect({ to: "/for-brands/apply" });
  },
});
