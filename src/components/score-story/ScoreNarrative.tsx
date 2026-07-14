import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type EditorialContext,
  type EditorialLevel,
  type NarrativePreset,
  buildEditorialNarrativePackage,
  type EditorialNarrativeMode,
} from "@/lib/editorial";

interface Props {
  ctx: EditorialContext;
  level?: EditorialLevel;
  preset?: NarrativePreset;
  title?: string;
  mode?: EditorialNarrativeMode;
}

/**
 * Deterministic editorial narrative renderer.
 *
 * The same visual/tonal language is reused across the platform,
 * but each caller supplies a `preset` so that Rankings, Profiles,
 * Career Center, Hall of Fame, etc. produce distinct stories from
 * their own contextual data.
 */
export function ScoreNarrative({
  ctx,
  level = "standard",
  preset = "rankings",
  title,
  mode = "story",
}: Props) {
  const package_ = useMemo(
    () => buildEditorialNarrativePackage(ctx, preset, mode),
    [ctx, preset, mode],
  );
  const sections = useMemo(() => selectSections(package_.sections, level, mode), [package_, level, mode]);
  if (!sections.length) return null;

  if (level === "mini") {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        {sections.flatMap((section) => section.items).join(" ")}
      </p>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title ?? (mode === "explain" ? "Explain Mode" : level === "editorial" ? "Análise" : "Resumo")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 font-serif text-[15px] leading-relaxed">
        {sections.map((section) => (
          <div key={section.id} className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {section.title}
            </p>
            {section.items.map((item) => (
              <p key={`${section.id}-${item.slice(0, 24)}`} className="text-foreground/90">
                {item}
              </p>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function selectSections(
  sections: Array<{ id: string; title: string; items: string[] }>,
  level: EditorialLevel,
  mode: EditorialNarrativeMode,
) {
  if (level === "mini") {
    const first = sections.filter((section) => section.id === "executive").slice(0, 1);
    return first.length ? first : sections.slice(0, 1);
  }

  if (mode === "explain") {
    return sections.filter((section) => ["executive", "comparison", "evolution", "interpretation", "explain"].includes(section.id));
  }

  if (level === "standard") {
    return sections.filter((section) => ["executive", "analysis", "comparison", "evolution", "interpretation"].includes(section.id));
  }

  return sections;
}
