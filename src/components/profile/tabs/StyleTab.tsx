import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClubSeasonFilter } from "@/components/ClubPlantelSection";
import { usePlayerStatsData } from "@/lib/usePlayerStatsData";
import type { ProfileContext } from "@/lib/profile/types";
import { useProfileUniverse } from "@/components/profile/useProfileUniverse";
import { analyzeStyle, compareStyle, getStyleSeasons, type StyleAnalysis } from "@/lib/profile/style";
import { StyleRadar } from "@/components/profile/style/StyleRadar";
import { TacticalSummary } from "@/components/profile/style/TacticalSummary";
import { TacticalIndicators } from "@/components/profile/style/TacticalIndicators";
import { StyleTraits } from "@/components/profile/style/StyleTraits";
import { StrengthsCard } from "@/components/profile/style/StrengthsCard";
import { WeaknessesCard } from "@/components/profile/style/WeaknessesCard";
import { StyleSimilarity } from "@/components/profile/style/StyleSimilarity";
import { useRecruitmentSourceData } from "@/features/recruitment/data/useRecruitmentSourceData";
import { buildRecruitmentStyleAnalysis } from "@/features/recruitment/services/recruitment-style";
import { analyzeCollectiveMetrics } from "@/lib/profile/explain";
import type { RecruitmentPlayer } from "@/features/recruitment/types/recruitment-models";

export function StyleTab({ ctx }: { ctx: ProfileContext }) {
  const statsQuery = usePlayerStatsData();
  const recruitment = useRecruitmentSourceData();
  const sourceText = useMemo(() => describeStyleSource(ctx.kind), [ctx.kind]);

  const seasons = useMemo(() => {
    const base = new Set<number>(getStyleSeasons(ctx, statsQuery.data?.players ?? []));
    const players = recruitment.source?.entities.players ?? [];
    for (const player of players) {
      if (belongsToEntity(ctx, player)) {
        if (player.currentSeason != null) base.add(player.currentSeason);
        const history = ((player.metadata ?? {}).history as Array<Record<string, unknown>> | undefined) ?? [];
        for (const point of history) {
          const season = Number(point.season ?? 0);
          if (Number.isFinite(season) && season > 0) base.add(season);
        }
      }
    }
    return [...base].sort((a, b) => b - a);
  }, [ctx, recruitment.source?.entities.players, statsQuery.data?.players]);
  const [season, setSeason] = useState<number | null>(seasons[0] ?? null);

  useEffect(() => {
    if (!seasons.length) {
      setSeason(null);
      return;
    }
    if (season == null || !seasons.includes(season)) setSeason(seasons[0]);
  }, [seasons, season]);

  const analysis = useMemo(() => {
    if (season == null) return null;
    if (statsQuery.data) {
      const fromStats = analyzeStyle(ctx, statsQuery.data.players, season);
      if (fromStats.sampleSize > 0) return fromStats;
    }

    const fallback = buildFallbackStyleAnalysis(ctx, season, recruitment.source?.entities.players ?? []);
    return fallback;
  }, [ctx, season, statsQuery.data, recruitment.source?.entities.players]);

  const uni = useProfileUniverse(ctx);

  const similarity = useMemo(() => {
    if (!statsQuery.data || season == null || !analysis || analysis.sampleSize === 0) return { items: [] };
    return compareStyle(ctx, statsQuery.data.players, season);
  }, [ctx, season, statsQuery.data, analysis]);

  if (statsQuery.isLoading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        A carregar análise de estilo...
      </p>
    );
  }

  if (!seasons.length || season == null || !analysis || analysis.sampleSize === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análise do Estilo de Jogo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sem dados suficientes para calcular o estilo de jogo desta entidade.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Análise Determinística de Estilo
        </h3>
        <ClubSeasonFilter years={seasons} value={season} onChange={setSeason} label="Época" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fonte de dados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{sourceText}</p>
          {uni?.country || uni?.idu ? (
            <p className="text-xs text-muted-foreground mt-2">
              {uni?.country ? `Nacionalidade (Universe): ${uni.country}` : null}
              {uni?.idu ? (uni?.country ? " · " : "") + `UID: ${uni.idu}` : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <TacticalSummary analysis={analysis} />
      <StyleRadar analysis={analysis} />
      <TacticalIndicators analysis={analysis} />

      <div className="grid gap-4 md:grid-cols-2">
        <StrengthsCard items={analysis.strengths} />
        <WeaknessesCard items={analysis.weaknesses} />
      </div>

      <StyleTraits traits={analysis.traits} />
      <StyleSimilarity result={similarity} />
    </div>
  );
}

function buildFallbackStyleAnalysis(
  ctx: ProfileContext,
  season: number,
  players: RecruitmentPlayer[],
): StyleAnalysis | null {
  const scoped = players.filter((player) => belongsToEntity(ctx, player));
  if (!scoped.length) return null;

  if (ctx.kind === "player") {
    const selected = scoped.find((player) => normalize(player.name) === normalize(ctx.name));
    if (!selected) return null;
    const style = buildRecruitmentStyleAnalysis(selected);
    return {
      ...style,
      season,
      sampleSize: 1,
      summary:
        style.summary +
        " (fallback construído com dados de Player Profiles/Recruitment quando o mapeamento de player_stats é insuficiente).",
    };
  }

  const collective = analyzeCollectiveMetrics(scoped);
  return {
    entity: ctx.name,
    season,
    sampleSize: scoped.length,
    vector: collective.vector,
    strengths: [
      `Forte em construção (${collective.build})`,
      `Forte em ataque (${collective.attack})`,
      `Forte em defesa (${collective.defense})`,
      `Boa gestão de posse (${collective.possession})`,
    ],
    weaknesses: [
      `Transições com margem (${collective.transitions})`,
      `Criatividade coletiva (${collective.creativity})`,
      `Organização (${collective.organization})`,
      `Imprevisibilidade (${collective.unpredictability})`,
    ],
    offensive: [
      { label: "Finalização", value: collective.vector.finishing },
      { label: "Criatividade", value: collective.vector.creativity },
      { label: "Progressão", value: collective.vector.progression },
      { label: "Transições", value: collective.transitions },
      { label: "Contra-Ataque", value: collective.vector.counterAttack },
    ],
    defensive: [
      { label: "Pressão", value: collective.vector.pressing },
      { label: "Recuperação", value: collective.vector.recovery },
      { label: "Intensidade Defensiva", value: collective.vector.defensiveIntensity },
      { label: "Disciplina", value: collective.vector.discipline },
    ],
    build: [
      { label: "Passe Curto", value: collective.vector.shortPassing },
      { label: "Passe Longo", value: collective.vector.longPassing },
      { label: "Construção", value: collective.build },
      { label: "Posse", value: collective.possession },
      { label: "Progressão", value: collective.vector.progression },
    ],
    traits: [
      collective.attack >= 70 ? "Equipa ofensiva" : "Ataque equilibrado",
      collective.defense >= 70 ? "Equipa intensa sem bola" : "Defesa de risco controlado",
      collective.possession >= 70 ? "Controlo de posse" : "Posse mista",
      collective.transitions >= 70 ? "Transição forte" : "Transição moderada",
    ],
    summary:
      `Análise de estilo agregada de ${scoped.length} jogadores com métricas válidas do clube/perfil. ` +
      "Este fallback evita falsos 'sem dados' quando existem dados suficientes fora de player_stats.",
  };
}

function belongsToEntity(ctx: ProfileContext, player: RecruitmentPlayer): boolean {
  if (ctx.kind === "player") return normalize(player.name) === normalize(ctx.name);
  if (ctx.kind === "club") return normalize(player.club) === normalize(ctx.name);
  if (ctx.kind === "coach") return normalize((player.metadata?.coach as string | null) ?? null) === normalize(ctx.name);
  if (ctx.kind === "competition") return normalize(player.competition) === normalize(ctx.name);
  if (ctx.kind === "country") return normalize(player.country) === normalize(ctx.name);
  return false;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function describeStyleSource(kind: ProfileContext["kind"]): string {
  if (kind === "player") {
    return "Jogador: cálculo feito com as estatísticas importadas do próprio jogador na época selecionada.";
  }
  if (kind === "club") {
    return "Clube: cálculo feito com as estatísticas importadas dos jogadores do clube na época selecionada.";
  }
  if (kind === "coach") {
    return "Treinador: cálculo feito com as estatísticas importadas dos jogadores dos clubes treinados por este treinador na época selecionada.";
  }
  if (kind === "competition") {
    return "Competição: cálculo feito com as estatísticas importadas dos jogadores dos clubes que participam na competição na época selecionada.";
  }
  return "País: cálculo feito com as estatísticas importadas dos jogadores com essa nacionalidade na época selecionada.";
}
