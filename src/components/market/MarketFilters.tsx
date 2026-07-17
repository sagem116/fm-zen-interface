import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { MarketFilters, MarketRankingType } from "@/lib/market-rankings/types";

interface Props {
  filters: MarketFilters;
  onChange: (patch: Partial<MarketFilters>) => void;
  seasons: number[];
  countries: string[];
  continents: string[];
  competitions: string[];
  onReset: () => void;
}

const TYPE_OPTIONS: { value: MarketRankingType; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "buys", label: "Apenas compras" },
  { value: "sales", label: "Apenas vendas" },
  { value: "net", label: "Balanço líquido" },
];

const ANY = "__any__";

export function MarketFiltersBar({
  filters,
  onChange,
  seasons,
  countries,
  continents,
  competitions,
  onReset,
}: Props) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3 xl:grid-cols-7">
      <FilterField label="Época de">
        <Select
          value={filters.seasonFrom?.toString() ?? ANY}
          onValueChange={(v) => onChange({ seasonFrom: v === ANY ? null : Number(v) })}
        >
          <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todas</SelectItem>
            {seasons.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Época até">
        <Select
          value={filters.seasonTo?.toString() ?? ANY}
          onValueChange={(v) => onChange({ seasonTo: v === ANY ? null : Number(v) })}
        >
          <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todas</SelectItem>
            {seasons.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Continente">
        <Select
          value={filters.continent ?? ANY}
          onValueChange={(v) => onChange({ continent: v === ANY ? null : v })}
        >
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos</SelectItem>
            {continents.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="País">
        <Select
          value={filters.country ?? ANY}
          onValueChange={(v) => onChange({ country: v === ANY ? null : v })}
        >
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Competição">
        <Select
          value={filters.competition ?? ANY}
          onValueChange={(v) => onChange({ competition: v === ANY ? null : v })}
        >
          <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todas</SelectItem>
            {competitions.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Tipo">
        <Select
          value={filters.type}
          onValueChange={(v) => onChange({ type: v as MarketRankingType })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <div className="flex items-end">
        <Button variant="outline" size="sm" onClick={onReset} className="w-full">
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
