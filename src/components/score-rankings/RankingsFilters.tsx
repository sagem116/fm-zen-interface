import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RankingsFiltersState } from "./useRankingsExplorer";

interface Props {
  seasons: number[];
  filters: RankingsFiltersState;
  onChange: (patch: Partial<RankingsFiltersState>) => void;
  showPlayerFilters?: boolean;
}

/** Presentation-only filter grid; consumers wire values to the explorer state. */
export function RankingsFilters({ seasons, filters, onChange, showPlayerFilters = true }: Props) {
  return (
    <div className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-3 lg:grid-cols-4">
      <Field label="Época">
        <select
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={filters.season ?? ""}
          onChange={(e) =>
            onChange({ season: e.target.value ? Number(e.target.value) : undefined })
          }
        >
          <option value="">Todas</option>
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <TextField
        label="Continente"
        value={filters.continent}
        onChange={(v) => onChange({ continent: v })}
      />
      <TextField label="País" value={filters.country} onChange={(v) => onChange({ country: v })} />
      <TextField
        label="Competição"
        value={filters.competition}
        onChange={(v) => onChange({ competition: v })}
      />
      <TextField label="Clube" value={filters.club} onChange={(v) => onChange({ club: v })} />
      {showPlayerFilters && (
        <>
          <TextField
            label="Nacionalidade"
            value={filters.nationality}
            onChange={(v) => onChange({ nationality: v })}
          />
          <TextField
            label="Posição"
            value={filters.position}
            onChange={(v) => onChange({ position: v })}
          />
          <TextField
            label="Personalidade"
            value={filters.personality}
            onChange={(v) => onChange({ personality: v })}
          />
          <TextField
            label="Pé Preferido"
            value={filters.foot}
            onChange={(v) => onChange({ foot: v })}
          />
          <NumberField
            label="Idade mínima"
            value={filters.minAge}
            onChange={(v) => onChange({ minAge: v })}
          />
          <NumberField
            label="Idade máxima"
            value={filters.maxAge}
            onChange={(v) => onChange({ maxAge: v })}
          />
          <NumberField
            label="Minutos mínimos"
            value={filters.minMinutes}
            onChange={(v) => onChange({ minMinutes: v })}
          />
          <NumberField
            label="Altura mínima (cm)"
            value={filters.minHeight}
            onChange={(v) => onChange({ minHeight: v })}
          />
        </>
      )}
      <TextField label="Estado" value={filters.status} onChange={(v) => onChange({ status: v })} />
      <NumberField
        label="Top X"
        value={filters.topX}
        onChange={(v) => onChange({ topX: v })}
        placeholder="100"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <Field label={label}>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="h-8 text-sm"
        placeholder="Todos"
      />
    </Field>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="h-8 text-sm"
        placeholder={placeholder ?? "—"}
      />
    </Field>
  );
}
