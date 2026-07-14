import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GitCompareArrows, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StyleRadar } from "@/components/profile/style/StyleRadar";
import { StrengthsCard } from "@/components/profile/style/StrengthsCard";
import { WeaknessesCard } from "@/components/profile/style/WeaknessesCard";
import { RecruitmentLayout } from "./RecruitmentLayout";
import { RecruitmentSection } from "./RecruitmentSection";
import {
  TACTICAL_PRESET_PROFILES,
  TACTICAL_STYLE_LABELS,
  type TacticalProfileId,
  tacticalPresetById,
} from "../constants/recruitment-tactical";
import {
  useRecruitmentTacticalRecruitment,
  type TacticalEntityTab,
} from "../hooks/useRecruitmentTacticalRecruitment";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";

const STYLE_KEYS = Object.keys(TACTICAL_STYLE_LABELS) as Array<keyof typeof TACTICAL_STYLE_LABELS>;

function stars(count: number): string {
  return "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));
}

export function RecruitmentTacticalPage() {
  const [profileId, setProfileId] = useState<TacticalProfileId>("gegenpress");
  const [tab, setTab] = useState<TacticalEntityTab>("player");
  const [query, setQuery] = useState("");
  const [minCompatibility, setMinCompatibility] = useState(70);
  const [customVector, setCustomVector] = useState(tacticalPresetById("gegenpress").vector);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { isLoading, data } = useRecruitmentTacticalRecruitment({
    profileId,
    customVector,
    tab,
    query,
    minCompatibility,
  });

  const selected = useMemo(() => {
    if (!data?.candidates.length) return null;
    if (!selectedId) return data.candidates[0];
    return data.candidates.find((item) => item.id === selectedId) ?? data.candidates[0];
  }, [data, selectedId]);

  const compareRows = useMemo(() => {
    if (!data) return [];
    return data.candidates.filter((item) => compareIds.includes(item.id));
  }, [data, compareIds]);

  const profile = tacticalPresetById(profileId);

  const headerActions = (
    <>
      <Button variant="outline" asChild>
        <Link to="/recruitment-center/pesquisa" search={{ tab: undefined }}>
          <Search className="size-4" />
          Pesquisa base
        </Link>
      </Button>
      <Button asChild>
        <Link to="/comparar" search={{ tab: undefined }}>
          <GitCompareArrows className="size-4" />
          Comparar perfis
        </Link>
      </Button>
    </>
  );

  return (
    <RecruitmentLayout
      title="Tactical Recruitment"
      subtitle="Compatibilidade tática determinística para jogadores e treinadores sem Recommendation Engine."
      breadcrumbs={buildRecruitmentBreadcrumbs("Tactical Recruitment")}
      headerActions={headerActions}
      isLoading={isLoading}
      rightPanel={
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estilo da Equipa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.teamSummary.bars.map((bar) => (
                <div key={bar.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{bar.label}</span>
                    <span className="tabular-nums font-semibold">{bar.value}</span>
                  </div>
                  <Progress value={bar.value} className="h-2" />
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                {data?.teamSummary.summary ?? "Sem amostra."}
              </p>
            </CardContent>
          </Card>

          {selected ? (
            <>
              <StyleRadar
                analysis={{
                  entity: selected.name,
                  season: 0,
                  sampleSize: 0,
                  vector: selected.vector,
                  strengths: [],
                  weaknesses: [],
                  offensive: [],
                  defensive: [],
                  build: [],
                  traits: [],
                  summary: selected.summary,
                }}
              />
              <StrengthsCard items={selected.strengths} />
              <WeaknessesCard items={selected.weaknesses} />
            </>
          ) : null}
        </div>
      }
    >
      <RecruitmentSection
        title="Filosofia de jogo"
        description="Define o modelo e ajusta os pesos táticos."
      >
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Perfil tático</Label>
                <Select
                  value={profileId}
                  onValueChange={(value) => {
                    const next = value as TacticalProfileId;
                    setProfileId(next);
                    setCustomVector(tacticalPresetById(next).vector);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TACTICAL_PRESET_PROFILES.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{profile.description}</p>
              </div>

              <div className="space-y-2">
                <Label>Entidade</Label>
                <Tabs value={tab} onValueChange={(value) => setTab(value as TacticalEntityTab)}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="player">Jogadores</TabsTrigger>
                    <TabsTrigger value="coach">Treinadores</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label>Compatibilidade mínima</Label>
                <div className="rounded-md border border-border px-3 py-2">
                  <Slider
                    value={[minCompatibility]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(values) => setMinCompatibility(values[0] ?? 0)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Compatibilidade &gt; {minCompatibility}%
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {STYLE_KEYS.map((key) => (
                <div key={key} className="space-y-1 rounded-md border border-border p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>{TACTICAL_STYLE_LABELS[key]}</span>
                    <span className="tabular-nums font-semibold">{customVector[key]}</span>
                  </div>
                  <Slider
                    value={[customVector[key]]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(values) => {
                      setProfileId("custom");
                      setCustomVector((prev) => ({ ...prev, [key]: values[0] ?? 0 }));
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="Compatibilidade tática"
        description="Global, ofensiva, defensiva, física, técnica e mental."
      >
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_170px]">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar por nome, clube, país..."
              />
              <p className="text-sm text-muted-foreground flex items-center">
                Resultados: {data?.candidates.length ?? 0}
              </p>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="p-2">Cmp</th>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Clube</th>
                    <th className="p-2">Global</th>
                    <th className="p-2">Ofensiva</th>
                    <th className="p-2">Defensiva</th>
                    <th className="p-2">Física</th>
                    <th className="p-2">Técnica</th>
                    <th className="p-2">Mental</th>
                    <th className="p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.candidates.map((item) => {
                    const active = selected?.id === item.id;
                    const checked = compareIds.includes(item.id);
                    const canCheck = checked || compareIds.length < 3;
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer ${active ? "bg-muted/40" : ""}`}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canCheck}
                            onChange={(e) => {
                              const next = e.target.checked;
                              setCompareIds((prev) => {
                                if (next) return [...new Set([...prev, item.id])].slice(0, 3);
                                return prev.filter((id) => id !== item.id);
                              });
                            }}
                          />
                        </td>
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">{item.club ?? "-"}</td>
                        <td className="p-2 tabular-nums">{item.compatibility.global}%</td>
                        <td className="p-2 tabular-nums">{item.compatibility.offensive}%</td>
                        <td className="p-2 tabular-nums">{item.compatibility.defensive}%</td>
                        <td className="p-2 tabular-nums">{item.compatibility.physical}%</td>
                        <td className="p-2 tabular-nums">{item.compatibility.technical}%</td>
                        <td className="p-2 tabular-nums">{item.compatibility.mental}%</td>
                        <td className="p-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              to={
                                item.kind === "player" ? "/jogadores/$name" : "/treinadores/$name"
                              }
                              params={{ name: item.name }}
                              search={{ tab: undefined }}
                            >
                              Perfil
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </RecruitmentSection>

      {selected ? (
        <RecruitmentSection
          title="Diagnóstico tático"
          description="Radar, posições, pontos fortes/fracos e estilo do jogador."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compatibilidade Posicional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.positions.length ? (
                  selected.positions.map((item) => (
                    <div
                      key={item.position}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span>{item.position}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-amber-500">{stars(item.stars)}</span>
                        <span className="tabular-nums">{item.score}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sem posições elegíveis para este perfil.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estilo do Jogador</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.styleIndicators.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{item.label}</span>
                      <span className="tabular-nums font-semibold">{item.value}</span>
                    </div>
                    <Progress value={item.value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </RecruitmentSection>
      ) : null}

      <RecruitmentSection
        title="Comparação de compatibilidade"
        description="Comparação objetiva entre vários candidatos."
      >
        <Card>
          <CardContent className="pt-5">
            {compareRows.length < 2 ? (
              <p className="text-sm text-muted-foreground">
                Seleciona pelo menos 2 candidatos para comparar.
              </p>
            ) : (
              <div className="space-y-3">
                {compareRows.map((item) => (
                  <div key={item.id} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.name}</p>
                      <span className="text-sm tabular-nums">
                        Global {item.compatibility.global}%
                      </span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-5">
                      {[
                        ["Ofensiva", item.compatibility.offensive],
                        ["Defensiva", item.compatibility.defensive],
                        ["Física", item.compatibility.physical],
                        ["Técnica", item.compatibility.technical],
                        ["Mental", item.compatibility.mental],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{label}</span>
                            <span>{value}%</span>
                          </div>
                          <Progress value={Number(value)} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </RecruitmentSection>
    </RecruitmentLayout>
  );
}
