import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pessoas/assessment")({
  component: AssessmentLayout,
});

function AssessmentLayout() {
  return <Outlet />;
}
