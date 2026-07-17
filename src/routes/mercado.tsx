import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles, Info } from "lucide-react";
import { MarketFiltersBar } from "@/components/market/MarketFilters";
import { MarketTable } from "@/components/market/MarketTable";
import { MarketNarrative } from "@/components/market/MarketNarrative";
import { useMarketRanking } from "@/lib/market-rankings/hooks";
import type {
  MarketEntityKind,
  MarketFilters,
} from "@/lib/market-rankings/types";

export const Route = createFileRoute("/mercado")({
  head: () => ({
    meta: [
      { title: "Mercado — Rankings de Transferências" },
      {
        name: "description",
        content:
          "Rankings de mercado de transferências por competição, clube e treinador. Análise de investimento, saldo, idade média e maiores contratações.",
      },
      { property: "og:title", content: "Mercado — Rankings de Transferências" },
      {
        property: "og:description",
        content:
          "Rankings de transferências por competição, clube e treinador com narrativa automática.",
      },
    ],
  }),
  component: MercadoPage,
});

const DEFAULT_FILTERS: MarketFilters = {
  seasonFrom: null,
  seasonTo: null,
  country: null,
  continent: null,
  competition: null,
  type: "all",
};

function MercadoPage() {
  const [filters, setFilters] = useState<MarketFilters>(DEFAULT_FILTERS);
  const [tab, setTab] = useState<MarketEntityKind>("competition");
  const [mode, setMode] = useState<"narrative" | "explain">("narrative");

  const { result, dataset, isLoading } = useMarketRanking(tab, filters);

  const patch = useCallback(
    (p: Partial<MarketFilters>) => setFilters((prev) => ({ ...prev, ...p })),
    [],
  );
  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5 p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mercado</h1>
            <p className="text-sm text-muted-foreground">Rankings de Transferências</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={mode === "narrative" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("narrative")}
            >
              <Sparkles className="h-4 w-4 mr-1" /> Narrative
            </Button>
            <Button
              variant={mode === "explain" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("explain")}
            >
              <Info className="h-4 w-4 mr-1" /> Explain
            </Button>
          </div>
        </header>

        <MarketFiltersBar
          filters={filters}
          onChange={patch}
          onReset={reset}
          seasons={dataset?.seasons ?? []}
          countries={dataset?.countries ?? []}
          continents={dataset?.continents ?? []}
          competitions={dataset?.competitions ?? []}
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as MarketEntityKind)}>
          <TabsList>
            <TabsTrigger value="competition">Competição</TabsTrigger>
            <TabsTrigger value="club">Clube</TabsTrigger>
            <TabsTrigger value="coach">Treinador</TabsTrigger>
          </TabsList>

          {(["competition", "club", "coach"] as const).map((k) => (
            <TabsContent key={k} value={k} className="space-y-4">
              <MarketNarrative result={result} kind={k} mode={mode} />
              {isLoading ? (
                <p className="text-sm text-muted-foreground">A calcular ranking…</p>
              ) : (
                <MarketTable
                  rows={result?.rows ?? []}
                  kind={k}
                  title={
                    k === "competition"
                      ? "Ranking de Competições"
                      : k === "club"
                        ? "Ranking de Clubes"
                        : "Ranking de Treinadores"
                  }
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}
