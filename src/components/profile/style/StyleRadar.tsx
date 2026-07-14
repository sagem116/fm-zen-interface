import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { StyleAnalysis } from "@/lib/profile/style";

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

function radarData(analysis: StyleAnalysis) {
  return [
    { axis: "Posse", score: analysis.vector.possession },
    { axis: "Construção", score: analysis.vector.buildUp },
    { axis: "Passe Curto", score: analysis.vector.shortPassing },
    { axis: "Passe Longo", score: analysis.vector.longPassing },
    { axis: "Progressão", score: analysis.vector.progression },
    { axis: "Pressão", score: analysis.vector.pressing },
    { axis: "Recuperação", score: analysis.vector.recovery },
    { axis: "Contra-Ataque", score: analysis.vector.counterAttack },
    { axis: "Transições", score: analysis.vector.transitions },
    { axis: "Finalização", score: analysis.vector.finishing },
    { axis: "Criatividade", score: analysis.vector.creativity },
    { axis: "Disciplina", score: analysis.vector.discipline },
  ];
}

export function StyleRadar({ analysis }: { analysis: StyleAnalysis }) {
  const data = radarData(analysis);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Radar Tático</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[340px] w-full max-w-[760px]">
          <RadarChart data={data} outerRadius="72%">
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="var(--color-score)"
              fill="var(--color-score)"
              fillOpacity={0.28}
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
