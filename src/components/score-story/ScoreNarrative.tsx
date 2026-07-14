import { useMemo } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import {
  type EditorialContext,
  type EditorialLevel,
  type NarrativePreset,
  buildEditorialNarrativePackage,
  type EditorialNarrativeMode,
} from "@/lib/editorial";
import { CollapsibleSection } from "@/components/profile/CollapsibleSection";

interface Props {
  ctx: EditorialContext;
  level?: EditorialLevel;
  preset?: NarrativePreset;
  title?: string;
  mode?: EditorialNarrativeMode;
  /** When true (default) wraps content in a collapsible section, collapsed by default. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

/**
 * Deterministic editorial narrative renderer.
 *
 * Wrapped in a CollapsibleSection by default so long-form editorial content
 * does not dominate profile pages until the user opts in.
 */
export function ScoreNarrative({
  ctx,
  level = "standard",
  preset = "rankings",
  title,
  mode = "story",
  collapsible = true,
  defaultOpen = false,
}: Props) {
  const package_ = useMemo(
    () => buildEditorialNarrativePackage(ctx, preset, mode),
    [ctx, preset, mode],
  );
  const sections = useMemo(
    () => selectSections(package_.sections, level, mode),
    [package_, level, mode],
  );
  if (!sections.length) return null;

  if (level === "mini") {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        {sections.flatMap((section) => section.items).join(" ")}
      </p>
    );
  }

  const resolvedTitle =
    title ?? (mode === "explain" ? "Explain Mode" : level === "editorial" ? "Análise" : "Resumo");

  const body = (
    <div className="space-y-5 font-serif text-[15px] leading-relaxed">
      {sections.map((section) => (
        <div key={section.id} className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {section.title}
          </p>
          {section.items.map((item) => (
            <p
              key={`${section.id}-${item.slice(0, 24)}`}
              className="text-foreground/90"
            >
              {item}
            </p>
          ))}
        </div>
      ))}
    </div>
  );

  if (!collapsible) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {resolvedTitle}
        </p>
        {body}
      </div>
    );
  }

  const first = sections[0]?.items?.[0];
  const preview = first
    ? first.length > 120
      ? first.slice(0, 117) + "…"
      : first
    : undefined;

  return (
    <CollapsibleSection
      title={resolvedTitle}
      icon={mode === "explain" ? <Sparkles className="size-4" /> : <BookOpen className="size-4" />}
      preview={preview}
      storageKey={`fm.narrative.${ctx.identity.kind}.${preset}.${mode}`}
      defaultOpen={defaultOpen}
      tone={mode === "explain" ? "accent" : "default"}
    >
      {body}
    </CollapsibleSection>
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
    return sections.filter((section) =>
      ["executive", "comparison", "evolution", "interpretation", "explain"].includes(section.id),
    );
  }

  if (level === "standard") {
    return sections.filter((section) =>
      ["executive", "analysis", "comparison", "evolution", "interpretation"].includes(section.id),
    );
  }

  return sections;
}
