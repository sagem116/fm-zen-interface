// Rich profile header + tabs container.
// Adds: icon, name, subtitle (country/league), quick stat cards, current
// ranking badge, Comparar button, Favorito toggle.
// Content below is delegated to <ProfileTabs> which reads the registry.

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Copy,
  ExternalLink,
  GitCompareArrows,
  Heart,
  History,
  Minus,
  Share2,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CountryLink } from "@/components/CountryLink";
import { useFavorite } from "@/lib/profile/favorites";
import type { ProfileContext } from "@/lib/profile/types";
import { buildRelated } from "@/lib/profile/related";
import { ProfileTabs } from "./ProfileTabs";
import { ExplainTab } from "./tabs/ExplainTab";
import { CollapsibleSection } from "./CollapsibleSection";
import { cn } from "@/lib/utils";
import { useProfileUniverse } from "@/components/profile/useProfileUniverse";

interface ProfileShellProps {
  ctx: ProfileContext;
  icon: LucideIcon;
  /** Back link — kept flexible to preserve per-page navigation. */
  backTo?: { to: string; label: string };
  /** Extra pills rendered next to the name (badges, chips, etc). */
  headerBadges?: ReactNode;
  /** Optional slot rendered above tabs (below the header). */
  slot?: ReactNode;
  /** Default active tab id. */
  defaultTab?: string;
}

export function ProfileShell({
  ctx,
  icon: Icon,
  backTo,
  headerBadges,
  slot,
  defaultTab = "overview",
}: ProfileShellProps) {
  const [explainOpen, setExplainOpen] = useState(false);
  const uni = ctx.kind === "player" ? useProfileUniverse(ctx) : null;
  const { isFavorite, toggle } = useFavorite(ctx.kind, ctx.name);
  const relatedPreview = useMemo(() => {
    const groups = buildRelated(ctx.kind, ctx.name, ctx.data);
    return groups.flatMap((group) => group.items).slice(0, 10);
  }, [ctx]);

  const compareRoute = (() => {
    if (ctx.kind === "club") return "/comparar";
    if (ctx.kind === "coach") return "/comparar";
    if (ctx.kind === "country") return "/comparar";
    return null;
  })();

  const explainAvailable =
    ctx.kind === "player" || ctx.kind === "club" || ctx.kind === "coach" || ctx.kind === "country";
  const breadcrumb = entityBreadcrumb(ctx.kind);
  const ranking = ctx.ranking ?? {
    current: ctx.currentRank,
    best: ctx.currentRank,
    previous: null,
    trend: "na" as const,
    deltaVsPrevious: null,
  };

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(ctx.name);
    } catch {
      // noop on unsupported clipboard API
    }
  };

  const shareProfile = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: ctx.name, url });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // noop on unsupported clipboard API
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-2 z-30 rounded-lg border border-border/60 bg-background/90 backdrop-blur px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-8 items-center justify-center rounded-md bg-[image:var(--gradient-primary)] text-primary-foreground shrink-0">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{ctx.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {uni?.currentClub ?? ctx.meta.club ?? uni?.country ?? ctx.meta.country ?? "Perfil"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0">
            <Badge variant="outline">#{ranking.current ?? "—"}</Badge>
            { (uni?.country ?? ctx.meta.country) && (
              <CountryLink name={uni?.country ?? ctx.meta.country} className="hidden sm:inline" />
            )}
          </div>
        </div>
      </div>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Link to="/rankings" search={true as any}>
                Rankings
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Link to={breadcrumb.to as any} search={true as any}>
                {breadcrumb.label}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{ctx.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {backTo && (
        <Link
          to={backTo.to as any}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          search={true}
        >
          <ArrowLeft className="size-4" /> {backTo.label}
        </Link>
      )}

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex size-14 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)] shrink-0">
            <Icon className="size-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">{ctx.name}</h1>
              {ctx.currentRank != null && (
                <Badge variant="outline" className="gap-1">
                  <Trophy className="size-3 text-gold" /> #{ctx.currentRank}
                </Badge>
              )}
              {headerBadges}
            </div>
            <SubtitleLine ctx={ctx} />
            <HeaderMetaLine ctx={ctx} />
            {ctx.meta.description && (
              <p className="text-xs text-muted-foreground mt-1">{ctx.meta.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remover favorito" : "Adicionar favorito"}
            className={cn(isFavorite && "border-gold/50 text-gold")}
          >
            <Heart className={cn("size-4", isFavorite && "fill-current")} />
            <span className="ml-1 hidden sm:inline">{isFavorite ? "Favorito" : "Favoritar"}</span>
          </Button>
          {compareRoute && (
            <Button asChild variant="outline" size="sm">
              <Link to={compareRoute as any} search={true}>
                <GitCompareArrows className="size-4" />
                <span className="ml-1 hidden sm:inline">Comparar</span>
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={copyName}>
            <Copy className="size-4" />
            <span className="ml-1 hidden sm:inline">Copiar Nome</span>
          </Button>
          <Button variant="outline" size="sm" onClick={shareProfile}>
            <Share2 className="size-4" />
            <span className="ml-1 hidden sm:inline">Partilhar</span>
          </Button>
          {}
          <Button asChild variant="outline" size="sm">
            <Link
              to="."
              search={(p: Record<string, unknown>) => ({ ...p, tab: "intelligence" }) as any}
            >
              <Sparkles className="size-4" />
              <span className="ml-1 hidden sm:inline">Perfil Inteligente</span>
            </Link>
          </Button>
          {explainAvailable && (
            <Button
              variant={explainOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setExplainOpen((v) => !v)}
              aria-pressed={explainOpen}
              aria-expanded={explainOpen}
            >
              <ExternalLink className="size-4" />
              <span className="ml-1 hidden sm:inline">
                {explainOpen ? "Ocultar Explain" : "Explain Mode"}
              </span>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link to="/ranking-historico" search={true as any}>
              <History className="size-4" />
              <span className="ml-1 hidden sm:inline">Histórico</span>
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <RankingChip
            label="Ranking atual"
            value={ranking.current != null ? `#${ranking.current}` : "—"}
          />
          <RankingChip
            label="Melhor ranking"
            value={ranking.best != null ? `#${ranking.best}` : "—"}
          />
          <RankingChip
            label="Ranking época anterior"
            value={ranking.previous != null ? `#${ranking.previous}` : "—"}
          />
          <RankingChip
            label="Tendência"
            value={trendLabel(ranking.trend)}
            icon={trendIcon(ranking.trend)}
          />
          <RankingChip label="Evolução vs anterior" value={formatDelta(ranking.deltaVsPrevious)} />
        </CardContent>
      </Card>

      {ctx.quickStats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ctx.quickStats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{s.value}</p>
                {s.hint && <p className="text-[10px] text-muted-foreground mt-1">{s.hint}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {relatedPreview.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Entidades relacionadas
            </p>
            <div className="flex flex-wrap gap-2">
              {relatedPreview.map((it) => (
                <Link
                  key={`${it.kind}:${it.name}`}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={entityRoute(it.kind) as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  params={{ name: it.name } as any}
                  search={true}
                  className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
                >
                  {it.name}
                  {it.hint && <span className="ml-1 opacity-60">{it.hint}</span>}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {slot}

      {slot}

      {explainAvailable && explainOpen && (
        <CollapsibleSection
          title="Explain Mode"
          subtitle="Como este ranking é calculado — pesos, contribuições e diagnóstico."
          icon={<ExternalLink className="size-4" />}
          storageKey={`fm.profile.explain.${ctx.kind}`}
          defaultOpen
          tone="accent"
        >
          <ExplainTab ctx={ctx} />
        </CollapsibleSection>
      )}

      <ProfileTabs ctx={ctx} defaultTab={defaultTab} />
    </div>
  );
}

function trendIcon(trend: "up" | "down" | "stable" | "na") {
  if (trend === "up") return <ArrowUpRight className="size-3.5 text-emerald-500" />;
  if (trend === "down") return <ArrowDownRight className="size-3.5 text-red-500" />;
  if (trend === "stable") return <Minus className="size-3.5 text-muted-foreground" />;
  return <ArrowRight className="size-3.5 text-muted-foreground" />;
}

function trendLabel(trend: "up" | "down" | "stable" | "na") {
  if (trend === "up") return "A subir";
  if (trend === "down") return "A descer";
  if (trend === "stable") return "Estável";
  return "—";
}

function formatDelta(delta: number | null) {
  if (delta == null) return "—";
  if (delta === 0) return "0";
  return `${delta > 0 ? "+" : ""}${delta}`;
}

function RankingChip({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold inline-flex items-center gap-1">
        {icon}
        {value}
      </p>
    </div>
  );
}

function HeaderMetaLine({ ctx }: { ctx: ProfileContext }) {
  const uni = ctx.kind === "player" ? useProfileUniverse(ctx) : null;

  const tags = [
    (uni?.currentClub ?? ctx.meta.club) ? { label: "Clube", value: uni?.currentClub ?? ctx.meta.club, kind: "club" as const } : null,
    ctx.meta.competition
      ? { label: "Competição", value: ctx.meta.competition, kind: "competition" as const }
      : null,
    ctx.meta.league
      ? { label: "Liga", value: ctx.meta.league, kind: "competition" as const }
      : null,
    (uni?.country ?? ctx.meta.country) ? { label: "País", value: uni?.country ?? ctx.meta.country, kind: "country" as const } : null,
    ctx.meta.continent ? { label: "Continente", value: ctx.meta.continent, kind: null } : null,
    ctx.meta.role ? { label: "Cargo", value: ctx.meta.role, kind: null } : null,
    ctx.meta.currentSeason ? { label: "Época", value: ctx.meta.currentSeason, kind: null } : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
    kind: "club" | "competition" | "country" | null;
  }>;

  if (!tags.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {tags.map((tag, idx) => (
        <span
          key={`${tag.label}-${tag.value}-${idx}`}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs"
        >
          <span className="text-muted-foreground">{tag.label}:</span>
          {tag.kind === "country" ? (
            <CountryLink name={tag.value} />
          ) : tag.kind ? (
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={entityRoute(tag.kind) as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              params={{ name: tag.value } as any}
              search={true}
              className="hover:text-primary"
            >
              {tag.value}
            </Link>
          ) : (
            <span>{tag.value}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function entityRoute(kind: "club" | "coach" | "country" | "competition" | "player") {
  if (kind === "club") return "/clubes/$name";
  if (kind === "coach") return "/treinadores/$name";
  if (kind === "country") return "/paises/$name";
  if (kind === "competition") return "/competicoes/$name";
  return "/jogadores/$name";
}

function entityBreadcrumb(kind: ProfileContext["kind"]): { to: string; label: string } {
  if (kind === "club") return { to: "/clubes", label: "Clubes" };
  if (kind === "player") return { to: "/jogadores", label: "Jogadores" };
  if (kind === "coach") return { to: "/treinadores", label: "Treinadores" };
  if (kind === "competition") return { to: "/competicoes", label: "Competições" };
  return { to: "/paises", label: "Países" };
}

function SubtitleLine({ ctx }: { ctx: ProfileContext }) {
  const parts: ReactNode[] = [];
  if (ctx.meta.country) {
    parts.push(
      <Link
        key="c"
        to={"/paises/$name" as any}
        params={{ name: ctx.meta.country } as any}
        className="hover:text-primary"
        search={true}
      >
        {ctx.meta.country}
      </Link>,
    );
  }
  if (ctx.meta.league) {
    parts.push(
      <Link
        key="l"
        to={"/competicoes/$name" as any}
        params={{ name: ctx.meta.league } as any}
        className="hover:text-primary"
        search={true}
      >
        {ctx.meta.league}
      </Link>,
    );
  }
  if (!parts.length) return null;
  return (
    <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
      {parts.map((n, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden>•</span>}
          {n}
        </span>
      ))}
    </p>
  );
}
