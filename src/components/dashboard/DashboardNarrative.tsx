import { BrainCircuit } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { buildDashboardNarrative } from "@/lib/editorial/engines/dashboard-engine";

export interface DashboardNarrativeProps {
  seasons: number;
  imports: number;
  insights: number;
  clubs: number;
  coaches: number;
  players: number;
  competitions: number;
  countries: number;
  latestYear?: number | null;
  biggestRise?: { name: string; delta: number } | null;
  biggestFall?: { name: string; delta: number } | null;
  bestSeason?: { name: string; year: number; value: number } | null;
  mostRegular?: { name: string; std: number; mean: number } | null;
  lastImport?: { filename: string; module: string; status: string | null } | null;
}

export function DashboardNarrative(props: DashboardNarrativeProps) {
  const narrative = buildDashboardNarrative(props);
  return (
    <DashboardCard title="Leitura Editorial" icon={BrainCircuit} compact>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {narrative.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </DashboardCard>
  );
}
