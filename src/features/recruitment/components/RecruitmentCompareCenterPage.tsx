import { useMemo, useState } from "react";
import { GitCompareArrows, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RecruitmentLayout } from "./RecruitmentLayout";
import { RecruitmentSection } from "./RecruitmentSection";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";
import { RecruitmentPlayerExplainSheet } from "./explain/RecruitmentPlayerExplainSheet";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function scoreTone(delta: number): string {
  if (delta > 0) return "text-emerald-400";
  if (delta < 0) return "text-red-400";
  return "text-muted-foreground";
}

export function RecruitmentCompareCenterPage() {
  const { source, isLoading } = useRecruitmentSourceData();
  const [leftName, setLeftName] = useState<string>("");
  const [rightName, setRightName] = useState<string>("");

  const options = useMemo(() => {
    return (source?.playerUniverse?.list ?? []).map((p) => p.name).sort((a, b) => a.localeCompare(b));
  }, [source]);

  const leftResolved = useMemo(() => source?.resolvePlayerByName?.(leftName ?? null) ?? null, [source, leftName]);
  const rightResolved = useMemo(() => source?.resolvePlayerByName?.(rightName ?? null) ?? null, [source, rightName]);

  const scoreDelta = Math.round((Number(leftResolved?.individual?.ca ?? 0) - Number(rightResolved?.individual?.ca ?? 0)) * 100) / 100;
  const caDelta = Math.round((Number(leftResolved?.individual?.ca ?? 0) - Number(rightResolved?.individual?.ca ?? 0)) * 100) / 100;
  const paDelta = Math.round((Number(leftResolved?.individual?.pa ?? 0) - Number(rightResolved?.individual?.pa ?? 0)) * 100) / 100;

  const breadcrumbs = buildRecruitmentBreadcrumbs("Centro de Comparacao");

  return (
    <RecruitmentLayout
      title="Centro de Comparacao"
      subtitle="Compara dois jogadores e abre o Explain detalhado de cada perfil."
      breadcrumbs={breadcrumbs}
      isLoading={isLoading}
    >
      <RecruitmentSection
        title="Selecao"
        description="Escolhe dois jogadores para comparar score, CA/PA e contexto competitivo."
      >
        <Card>
          <CardContent className="pt-5 grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Jogador A</Label>
              <select
                value={leftName}
                onChange={(event) => setLeftName(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="">Selecionar...</option>
                {options.map((name) => (
                  <option key={`left-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Jogador B</Label>
              <select
                value={rightName}
                onChange={(event) => setRightName(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="">Selecionar...</option>
                {options.map((name) => (
                  <option key={`right-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="Comparacao"
        description="Resumo lado a lado com leitura imediata do diferencial."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_auto_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserRound className="size-4 text-primary" />
                {leftResolved?.name ?? "Jogador A"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Score: {leftResolved?.individual?.ca ?? "-"}</p>
              <p>CA: {leftResolved?.individual?.ca ?? "-"}</p>
              <p>PA: {leftResolved?.individual?.pa ?? "-"}</p>
              <p>Idade: {leftResolved?.individual?.age ?? "-"}</p>
              <p>Posicao: {String(leftResolved?.individual?.extras?.primary_position ?? leftResolved?.individual?.extras?.primaryPosition ?? "-")}</p>
              <p>Clube: {leftResolved?.individual?.club ?? "-"}</p>
              <p>Pais: {leftResolved?.individual?.country ?? "-"}</p>
              <RecruitmentPlayerExplainSheet
                playerName={leftResolved?.name ?? null}
                triggerLabel="Explain Jogador A"
                triggerVariant="outline"
                disabled={!leftResolved}
              />
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GitCompareArrows className="size-4 text-primary" />
                Delta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className={scoreTone(scoreDelta)}>Score: {leftResolved && rightResolved ? scoreDelta : "-"}</p>
              <p className={scoreTone(caDelta)}>CA: {leftResolved && rightResolved ? caDelta : "-"}</p>
              <p className={scoreTone(paDelta)}>PA: {leftResolved && rightResolved ? paDelta : "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserRound className="size-4 text-primary" />
                {rightResolved?.name ?? "Jogador B"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Score: {rightResolved?.individual?.ca ?? "-"}</p>
              <p>CA: {rightResolved?.individual?.ca ?? "-"}</p>
              <p>PA: {rightResolved?.individual?.pa ?? "-"}</p>
              <p>Idade: {rightResolved?.individual?.age ?? "-"}</p>
              <p>Posicao: {String(rightResolved?.individual?.extras?.primary_position ?? rightResolved?.individual?.extras?.primaryPosition ?? "-")}</p>
              <p>Clube: {rightResolved?.individual?.club ?? "-"}</p>
              <p>Pais: {rightResolved?.individual?.country ?? "-"}</p>
              <RecruitmentPlayerExplainSheet
                playerName={rightResolved?.name ?? null}
                triggerLabel="Explain Jogador B"
                triggerVariant="outline"
                disabled={!rightResolved}
              />
            </CardContent>
          </Card>
        </div>
      </RecruitmentSection>
    </RecruitmentLayout>
  );
}
