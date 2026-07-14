import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { RecruitmentDashboardPage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center")({
  head: () => ({
    meta: [
      { title: "Recruitment Center — FM World Rankings" },
      {
        name: "description",
        content:
          "Centro de recrutamento com dashboard de mercado, favoritos e atalhos de scouting.",
      },
    ],
  }),
  component: RecruitmentCenterRoute,
});

function RecruitmentCenterRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname === "/recruitment-center") {
    return <RecruitmentDashboardPage />;
  }
  return <Outlet />;
}
