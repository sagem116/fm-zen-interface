import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Trophy, UploadCloud, Clock, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/lib/dashboard/useDashboardData";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { DashboardSeasonSummary } from "@/components/dashboard/DashboardSeasonSummary";
import { DashboardInsightsFeed } from "@/components/dashboard/DashboardInsightsFeed";
import { DashboardAlerts, type AlertEntry } from "@/components/dashboard/DashboardAlerts";
import { DashboardQuickRankings } from "@/components/dashboard/DashboardQuickRankings";
import { DashboardEvolution } from "@/components/dashboard/DashboardEvolution";
import { DashboardHighlights } from "@/components/dashboard/DashboardHighlights";
import { DashboardSmartProfiles } from "@/components/dashboard/DashboardSmartProfiles";
import { DashboardImports } from "@/components/dashboard/DashboardImports";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DashboardTopPerformersByScore } from "@/components/dashboard/DashboardTopPerformersByScore";
import { DashboardNarrative } from "@/components/dashboard/DashboardNarrative";
import { DashboardMarket } from "@/components/dashboard/DashboardMarket";
import { DashboardCustomizeDialog } from "@/components/dashboard/DashboardCustomizeDialog";
import { useDashboardLayout, type DashboardBlockDef } from "@/hooks/useDashboardLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — FM World Rankings" },
      {
        name: "description",
        content:
          "Centro de inteligência da FM World Rankings: KPIs, resumo da época, insights, alertas e atalhos.",
      },
      { property: "og:title", content: "Dashboard — FM World Rankings" },
      {
        property: "og:description",
        content: "Centro de inteligência da FM World Rankings: KPIs, resumo da época, insights, alertas e atalhos.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [showTopScores, setShowTopScores] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("dashboard.showTopScores") !== "0";
  });
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboard.showTopScores", showTopScores ? "1" : "0");
  }, [showTopScores]);

  const { isLoading, derived, imports, lastImport, insights } = useDashboardData();

  const topPlayers = useMemo(() => {
    if (!derived?.psData) return [];
    const m = new Map<string, { goals: number; assists: number }>();
    for (const p of derived.psData.players) {
      const cur = m.get(p.player_name) ?? { goals: 0, assists: 0 };
      cur.goals += p.gls || 0;
      cur.assists += p.ast || 0;
      m.set(p.player_name, cur);
    }
    return [...m.entries()]
      .map(([name, v]) => ({ name, goals: v.goals, assists: v.assists }))
      .sort((a, b) => b.goals + b.assists - (a.goals + a.assists))
      .slice(0, 10);
  }, [derived]);

  const topCompetitions = useMemo(() => {
    if (!derived?.psData) return [];
    const m = new Map<string, Set<string>>();
    for (const p of derived.psData.players) {
      if (!p.competition) continue;
      let s = m.get(p.competition);
      if (!s) {
        s = new Set();
        m.set(p.competition, s);
      }
      if (p.club) s.add(p.club);
    }
    return [...m.entries()]
      .map(([name, s]) => ({ name, clubs: s.size }))
      .sort((a, b) => b.clubs - a.clubs)
      .slice(0, 10);
  }, [derived]);

  const alertEntries = useMemo<AlertEntry[]>(() => {
    if (!derived) return [];
    const warnCount = Array.isArray(lastImport?.warnings) ? lastImport!.warnings!.length : 0;
    return [
      {
        key: "clubs-no-players",
        label: "Clubes sem jogadores",
        count: derived.alerts.clubsWithoutPlayers,
        to: "/debug-clubes",
      },
      {
        key: "players-no-club",
        label: "Jogadores sem clube",
        count: derived.alerts.playersWithoutClub,
        to: "/debug-jogadores",
      },
      {
        key: "coaches-no-club",
        label: "Treinadores sem clube",
        count: derived.alerts.coachesWithoutClub,
        to: "/debug-treinadores",
      },
      {
        key: "comps-no-rep",
        label: "Competições sem reputação",
        count: derived.alerts.compsMissingRep,
        to: "/debug-competicoes",
      },
      {
        key: "import-warns",
        label: "Avisos na última importação",
        count: warnCount,
        to: "/importar",
      },
    ];
  }, [derived, lastImport]);

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" /> A carregar dashboard…
      </div>
    );
  }

  if (!derived || derived.kpis.seasons === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-soft via-gold to-gold-deep text-primary-foreground shadow-[0_0_40px_-6px_oklch(0.82_0.17_88/0.6)] mb-5">
          <Trophy className="size-8" />
        </div>
        <h1 className="text-2xl font-display font-bold">Bem-vindo ao FM World Rankings</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          Importe a sua primeira época de Football Manager para desbloquear o dashboard inteligente.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/importar" search={{ tab: undefined }}>
            <UploadCloud className="size-4" /> Importar primeira época
          </Link>
        </Button>
      </div>
    );
  }

  const { ranks } = derived;
  const years = ranks.years;

  const BLOCKS: DashboardBlockDef[] = [
    { id: "kpis", label: "Visão Geral · KPIs" },
    { id: "summary", label: "Resumo da Época & Destaques" },
    { id: "narrative", label: "Leitura Editorial" },
    { id: "market", label: "Mercado" },
    { id: "alerts", label: "Alertas" },
    { id: "quick-rankings", label: "Rankings Rápidos" },
    { id: "top-scores", label: "Top Performers by Score" },
    { id: "evolution", label: "Evolução & Insights" },
    { id: "smart-imports", label: "Smart Profiles & Imports" },
    { id: "quick-actions", label: "Ações Rápidas" },
  ];

  const layout = useDashboardLayout(BLOCKS);

  const blockContent: Record<string, React.ReactNode> = {
    kpis: (
      <DashboardKPIs
        kpis={{
          ...derived.kpis,
          imports: imports.length,
          insightsCount: insights.length,
          activeProfileId: derived.kpis.activeProfileId ?? null,
        }}
      />
    ),
    summary: (
      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardSeasonSummary insights={insights} />
        <DashboardHighlights highlights={derived.highlights} />
      </div>
    ),
    narrative: (
      <DashboardNarrative
        seasons={derived.kpis.seasons}
        imports={imports.length}
        insights={insights.length}
        clubs={derived.kpis.clubs}
        coaches={derived.kpis.coaches}
        players={derived.kpis.players}
        competitions={derived.kpis.competitions}
        countries={derived.kpis.countries}
        latestYear={derived.latestYear}
        biggestRise={derived.highlights.biggestRise}
        biggestFall={derived.highlights.biggestFall}
        bestSeason={derived.highlights.bestSeason}
        mostRegular={derived.highlights.mostRegular}
        lastImport={
          lastImport
            ? { filename: lastImport.filename, module: lastImport.module, status: lastImport.status }
            : null
        }
      />
    ),
    market: <DashboardMarket />,
    alerts: <DashboardAlerts alerts={alertEntries} />,
    "quick-rankings": (
      <DashboardQuickRankings
        clubs={ranks.clubs}
        coaches={ranks.coaches}
        countries={ranks.countries}
        evolution={ranks.evolution}
        years={years}
        topPlayers={topPlayers}
        topCompetitions={topCompetitions}
      />
    ),
    "top-scores": showTopScores ? <DashboardTopPerformersByScore /> : null,
    evolution: (
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <DashboardEvolution
          clubs={ranks.clubs}
          coaches={ranks.coaches}
          countries={ranks.countries}
          evolution={ranks.evolution}
          years={years}
        />
        <DashboardInsightsFeed insights={insights} />
      </div>
    ),
    "smart-imports": (
      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardSmartProfiles smart={derived.smart} />
        <DashboardImports imports={imports} />
      </div>
    ),
    "quick-actions": <DashboardQuickActions />,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold tracking-tight gold-shimmer">
            Painel de Controlo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {derived.kpis.seasons} época{derived.kpis.seasons > 1 ? "s" : ""}
            {years.length > 0 && ` · ${Math.min(...years)}–${Math.max(...years)}`}
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/rankings" search={{ tab: undefined }}>
            <Trophy className="size-4" /> Rankings
          </Link>
        </Button>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => setShowTopScores((prev) => !prev)}
        >
          {showTopScores ? "Ocultar" : "Mostrar"} Top Performers by Score
        </Button>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => setCustomizeOpen(true)}
        >
          <SlidersHorizontal className="size-4" /> Personalizar
        </Button>
      </div>

      {lastImport && (
        <div className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-2.5 text-sm">
          <Clock className="size-4 text-gold shrink-0" />
          <div className="min-w-0 flex-1 truncate">
            <span className="text-muted-foreground">Última importação: </span>
            <span className="font-medium">{lastImport.filename}</span>
            <span className="text-muted-foreground"> · {lastImport.module}</span>
          </div>
        </div>
      )}

      {layout.orderedIds.map((id) => {
        if (layout.isHidden(id)) return null;
        const node = blockContent[id];
        if (!node) return null;
        return <div key={id}>{node}</div>;
      })}

      <DashboardCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        blocks={BLOCKS}
        orderedIds={layout.orderedIds}
        isHidden={layout.isHidden}
        toggleHidden={layout.toggleHidden}
        move={layout.move}
        reset={layout.reset}
      />
    </div>
  );
}

