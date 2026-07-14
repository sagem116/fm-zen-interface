import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ExplainSection, ExplainBadge } from "@/lib/profile/explain";

function badgeClass(tone: ExplainBadge["tone"]): string {
  if (tone === "success") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
  if (tone === "warning") return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  if (tone === "danger") return "bg-red-500/15 text-red-400 border-red-500/40";
  if (tone === "info") return "bg-blue-500/15 text-blue-300 border-blue-500/40";
  return "bg-muted text-muted-foreground border-border";
}

export function ProfileExplainSections({ sections }: { sections: ExplainSection[] }) {
  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <Card key={section.id} className="border-border/70 bg-card/80">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{section.subtitle}</p>
              </div>
              {section.badges?.length ? (
                <div className="flex flex-wrap justify-end gap-1">
                  {section.badges.map((badge) => (
                    <Badge key={`${section.id}-${badge.label}`} variant="outline" className={badgeClass(badge.tone)}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
            {section.bullets?.length ? (
              <ul className="space-y-1.5 text-sm">
                {section.bullets.map((bullet, index) => (
                  <li key={`${section.id}-bullet-${index}`} className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
            {section.indicators?.length ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {section.indicators.map((indicator) => (
                  <div key={`${section.id}-${indicator.label}`} className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{indicator.label}</span>
                      <span className="tabular-nums font-semibold">{Math.round(indicator.value)}</span>
                    </div>
                    <Progress value={Math.max(0, Math.min(100, indicator.value))} className="h-1.5 mt-1" />
                    {indicator.hint ? <p className="text-[11px] text-muted-foreground mt-1">{indicator.hint}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
