import { Rss } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DashboardCard } from "./DashboardCard";
import type { Insight } from "@/lib/insights";

function entityHref(e: Insight["entity"]): { to: string; params?: Record<string, string> } | null {
  switch (e.kind) {
    case "club":
      return { to: "/clubes/$name", params: { name: e.name } };
    case "coach":
      return { to: "/treinadores/$name", params: { name: e.name } };
    case "country":
      return { to: "/paises/$name", params: { name: e.name } };
    case "competition":
      return { to: "/competicoes/$name", params: { name: e.name } };
    case "player":
      return { to: "/jogadores/$name", params: { name: e.name } };
    default:
      return null;
  }
}

export function DashboardInsightsFeed({
  insights,
  limit = 10,
}: {
  insights: Insight[];
  limit?: number;
}) {
  const items = insights.slice(0, limit);
  return (
    <DashboardCard title="Intelligence Feed" icon={Rss} action={{ to: "/insights" }}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Sem insights disponíveis.</p>
      ) : (
        <ol className="relative border-l border-border/60 space-y-3 pl-4">
          {items.map((i) => {
            const href = entityHref(i.entity);
            return (
              <li key={i.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-gold" />
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                    {i.category}
                  </span>
                  {i.season && (
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {i.season}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium leading-tight">
                  {href ? (
                    <Link
                      to={href.to as any}
                      params={href.params as any}
                      className="hover:text-gold"
                      search={true}
                    >
                      {i.title}
                    </Link>
                  ) : (
                    i.title
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{i.description}</p>
              </li>
            );
          })}
        </ol>
      )}
    </DashboardCard>
  );
}
