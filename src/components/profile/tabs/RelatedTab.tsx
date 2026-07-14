import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRelated, type RelatedEntity } from "@/lib/profile/related";
import type { ProfileContext } from "@/lib/profile/types";

const HREF: Record<RelatedEntity["kind"], string> = {
  club: "/clubes/$name",
  coach: "/treinadores/$name",
  country: "/paises/$name",
  competition: "/competicoes/$name",
  player: "/jogadores/$name",
};

export function RelatedTab({ ctx }: { ctx: ProfileContext }) {
  const groups = useMemo(() => buildRelated(ctx.kind, ctx.name, ctx.data), [ctx]);
  if (!groups.length) {
    return <p className="text-sm text-muted-foreground">Sem entidades relacionadas.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <Card key={g.id}>
          <CardHeader>
            <CardTitle className="text-base">{g.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {g.items.map((it) => (
                <li key={`${it.kind}:${it.name}`}>
                  <Link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to={HREF[it.kind] as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    params={{ name: it.name } as any}
                    className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
                    search={true}
                  >
                    {it.name}
                    {it.hint && <span className="ml-1 opacity-60 tabular-nums">{it.hint}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
