import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const CareerDashboard = lazy(() =>
  import("./CareerDashboard").then((m) => ({ default: m.CareerDashboard })),
);
const CareerTimeline = lazy(() =>
  import("./CareerTimeline").then((m) => ({ default: m.CareerTimeline })),
);
const CareerManagerIdentity = lazy(() =>
  import("./CareerManagerIdentity").then((m) => ({ default: m.CareerManagerIdentity })),
);
const CareerPlayers = lazy(() =>
  import("./CareerPlayers").then((m) => ({ default: m.CareerPlayers })),
);
const CareerCompetitions = lazy(() =>
  import("./CareerCompetitions").then((m) => ({ default: m.CareerCompetitions })),
);
const CareerTransfers = lazy(() =>
  import("./CareerTransfers").then((m) => ({ default: m.CareerTransfers })),
);
const CareerBestXI = lazy(() =>
  import("./CareerBestXI").then((m) => ({ default: m.CareerBestXI })),
);
const CareerHallOfFame = lazy(() =>
  import("./CareerHallOfFame").then((m) => ({ default: m.CareerHallOfFame })),
);
const CareerMemories = lazy(() =>
  import("./CareerMemories").then((m) => ({ default: m.CareerMemories })),
);
const CareerTrophyRoom = lazy(() =>
  import("./CareerTrophyRoom").then((m) => ({ default: m.CareerTrophyRoom })),
);
const CareerRecords = lazy(() =>
  import("./CareerRecords").then((m) => ({ default: m.CareerRecords })),
);
const CareerYearbooks = lazy(() =>
  import("./CareerYearbooks").then((m) => ({ default: m.CareerYearbooks })),
);

const TABS = [
  { id: "resumo", label: "Resumo", Comp: CareerDashboard },
  { id: "epocas", label: "Épocas", Comp: CareerTimeline },
  { id: "identity", label: "Manager Identity", Comp: CareerManagerIdentity },
  { id: "jogadores", label: "Jogadores", Comp: CareerPlayers },
  { id: "competicoes", label: "Competições", Comp: CareerCompetitions },
  { id: "transferencias", label: "Transferências", Comp: CareerTransfers },
  { id: "best-xi", label: "Melhor XI", Comp: CareerBestXI },
  { id: "hall-of-fame", label: "Hall of Fame", Comp: CareerHallOfFame },
  { id: "memorias", label: "Memórias", Comp: CareerMemories },
  { id: "trofeus", label: "Sala de Troféus", Comp: CareerTrophyRoom },
  { id: "recordes", label: "Recordes", Comp: CareerRecords },
  { id: "anuarios", label: "Anuários", Comp: CareerYearbooks },
] as const;

export function CareerTabs() {
  const [active, setActive] = useState<string>("resumo");

  return (
    <Tabs value={active} onValueChange={setActive} className="w-full">
      <div className="overflow-x-auto -mx-2 px-2">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/60">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {TABS.map((t) => (
        <TabsContent key={t.id} value={t.id} className="mt-6 focus-visible:outline-none">
          {active === t.id ? (
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <t.Comp />
            </Suspense>
          ) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
