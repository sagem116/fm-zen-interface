import { Suspense, useMemo, useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createCareer, setActiveCareer } from "@/lib/career/actions";
import { useCareer } from "@/lib/career/hooks";
import { ScoreNarrative } from "@/components/score-story/ScoreNarrative";
import { buildCareerCenterNarrativeContext } from "@/lib/editorial";
import { makeEditorialDefinition } from "@/lib/editorial/pageNarratives";
import { CareerHeader } from "./CareerHeader";
import { CareerCoachAssociation } from "./CareerCoachAssociation";
import { CareerOverview } from "./CareerOverview";
import { CareerTabs } from "./CareerTabs";
import { CareerSidebar } from "./CareerSidebar";

export function CareerPage() {
  const { career, careers } = useCareer();
  const [careerName, setCareerName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [selectedCareerId, setSelectedCareerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasCareer = useMemo(() => !!career, [career]);
  const narrativeCtx = useMemo(() => {
    if (!career) return null;

    const seasons = Object.values(career.seasons).sort((a, b) => a.season - b.season);
    const currentSeason = career.currentSeasonId
      ? career.seasons[career.currentSeasonId]
      : seasons[seasons.length - 1];
    const trophies = Object.values(career.trophies)
      .filter((t) => (currentSeason ? t.season === currentSeason.season : true))
      .map((t) => t.name);
    const achievements = Object.values(career.achievements)
      .filter((a) => (currentSeason ? a.season === currentSeason.season : true))
      .map((a) => a.name)
      .slice(0, 3);
    const score = trophies.length * 10 + achievements.length * 3 + seasons.length;

    return buildCareerCenterNarrativeContext({
      identity: {
        name: career.name,
        kind: "coach",
        club: currentSeason?.club,
        country: currentSeason?.country,
        competition: currentSeason?.league,
      },
      definition: makeEditorialDefinition("coach", "Career Center Narrative"),
      scoreValue: score,
      rank: 1,
      totalRanked: 1,
      history: seasons.map((s) => ({ season: s.season, score: 1 })),
      career: {
        seasons: seasons.length,
        clubs: [...new Set(seasons.map((s) => s.club))],
        titles: Object.values(career.trophies).length,
        peakSeason: currentSeason?.season,
        peakScore: score,
      },
      seasonStory: {
        season: currentSeason?.season ?? new Date().getFullYear(),
        headline: currentSeason
          ? `${currentSeason.coach} lidera ${currentSeason.club} em ${currentSeason.league}`
          : "Novo capítulo da carreira em construção",
        highlights: achievements,
        trophies,
        club: currentSeason?.club,
        competition: currentSeason?.league,
      },
    });
  }, [career]);

  if (!hasCareer) {
    const handleCreateCareer = () => {
      const name = careerName.trim();
      if (!name) {
        setError("Indica o nome da carreira para continuar.");
        return;
      }

      createCareer({
        name,
        ownerName: ownerName.trim() || undefined,
      });
      setError(null);
      setCareerName("");
      setOwnerName("");
    };

    const handleActivateCareer = () => {
      if (!selectedCareerId) {
        setError("Seleciona uma carreira guardada para ativar.");
        return;
      }

      setActiveCareer(selectedCareerId as `career.${string}`);
      setError(null);
    };

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-soft via-gold to-gold-deep text-primary-foreground shadow-[0_0_40px_-6px_oklch(0.82_0.17_88/0.6)] mb-5">
          <Crown className="size-8" />
        </div>
        <h1 className="text-2xl font-display font-bold">Career Center</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          Ainda não existe uma carreira ativa. Assim que criares ou importares uma carreira, todo o
          Career Center ficará disponível aqui.
        </p>
        <div className="mt-6 w-full max-w-md space-y-3 text-left">
          <Input
            value={careerName}
            onChange={(e) => setCareerName(e.target.value)}
            placeholder="Nome da carreira"
          />
          <Input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Nome do treinador (opcional)"
          />
          <Button className="w-full" onClick={handleCreateCareer}>
            Criar carreira e ativar
          </Button>
        </div>
        {careers.length > 0 && (
          <div className="mt-6 w-full max-w-md space-y-3 text-left">
            <p className="text-xs text-muted-foreground">
              {careers.length} carreira(s) guardadas sem estado ativo.
            </p>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={selectedCareerId}
              onChange={(e) => setSelectedCareerId(e.target.value)}
            >
              <option value="">Selecionar carreira guardada</option>
              {careers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" className="w-full" onClick={handleActivateCareer}>
              Ativar carreira selecionada
            </Button>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <Button asChild variant="outline" className="mt-6">
          <a href="/importar">Ir para Importar</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CareerHeader />
      <CareerCoachAssociation />
      {narrativeCtx && (
        <div className="space-y-4">
          <ScoreNarrative
            ctx={narrativeCtx}
            level="editorial"
            preset="careerCenter"
            title="Narrativa Editorial"
          />
          <ScoreNarrative
            ctx={narrativeCtx}
            level="standard"
            preset="explain"
            mode="explain"
            title="Explain Mode"
          />
        </div>
      )}
      <CareerOverview />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <Suspense fallback={<TabsSkeleton />}>
          <CareerTabs />
        </Suspense>
        <div className="hidden xl:block">
          <CareerSidebar />
        </div>
      </div>
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
