import { useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TACTICAL_PRESET_PROFILES,
  type TacticalProfileId,
} from "../constants/recruitment-tactical";
import { useRecruitmentKnowledgeBoard } from "../hooks/useRecruitmentKnowledgeBoard";
import { RecruitmentLayout } from "./RecruitmentLayout";
import { RecruitmentSection } from "./RecruitmentSection";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";

export function RecruitmentReplacementCenterPage() {
  const [tab, setTab] = useState<"player" | "coach">("player");
  const [query, setQuery] = useState("");
  const [minCompatibility, setMinCompatibility] = useState(60);
  const [profileId, setProfileId] = useState<TacticalProfileId>("gegenpress");
  const [sortBy, setSortBy] = useState<"recruitmentScore" | "compatibility" | "age" | "value">(
    "recruitmentScore",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const board = useRecruitmentKnowledgeBoard({
    tab,
    query,
    minCompatibility,
    profileId,
    sortBy,
    sortDir,
  });

  return (
    <RecruitmentLayout
      title="Replacement Center"
      subtitle="Necessidades do plantel com ordenação principal por Recruitment Score."
      breadcrumbs={buildRecruitmentBreadcrumbs("Replacement Center")}
      isLoading={board.isLoading}
    >
      <RecruitmentSection
        title="Configuração"
        description="Definir contexto tático e critérios de ordenação."
      >
        <Card>
          <CardContent className="pt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1">
              <Label>Entidade</Label>
              <Tabs value={tab} onValueChange={(value) => setTab(value as "player" | "coach")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="player">Jogadores</TabsTrigger>
                  <TabsTrigger value="coach">Treinadores</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1">
              <Label>Perfil tático</Label>
              <Select
                value={profileId}
                onValueChange={(value) => setProfileId(value as TacticalProfileId)}
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
            </div>
            <div className="space-y-1">
              <Label>Compatibilidade mínima</Label>
              <Input
                type="number"
                value={minCompatibility}
                onChange={(e) => setMinCompatibility(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1 xl:col-span-2">
              <Label>Pesquisa</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome, clube, país..."
              />
            </div>
            <div className="space-y-1">
              <Label>Ordenar por</Label>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recruitmentScore">Recruitment Score</SelectItem>
                    <SelectItem value="compatibility">Compatibilidade</SelectItem>
                    <SelectItem value="age">Idade</SelectItem>
                    <SelectItem value="value">Valor</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                >
                  <ArrowDownUp className="size-4" /> {sortDir === "asc" ? "ASC" : "DESC"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="Candidatos"
        description="Ordenação principal por Recruitment Score com Explain determinístico."
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista de substituição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {board.rows.map((row) => (
              <div key={row.id} className="rounded-md border border-border px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.club ?? "-"} · {row.country ?? "-"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span>
                      Recruitment Score <strong>{row.recruitmentScore.toFixed(1)}</strong>
                    </span>
                    <span>
                      Compatibilidade <strong>{row.compatibility}%</strong>
                    </span>
                    <span>
                      Idade <strong>{row.age ?? "-"}</strong>
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {row.explain.contributions.slice(0, 6).map((item) => (
                    <span key={`${row.id}-${item.criterion}`}>
                      {item.criterion}: {item.impactPercent}%
                    </span>
                  ))}
                </div>
                <div className="mt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to={tab === "player" ? "/jogadores/$name" : "/treinadores/$name"}
                      params={{ name: row.name }}
                      search={{ tab: undefined }}
                    >
                      Abrir perfil
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {!board.rows.length ? (
              <p className="text-sm text-muted-foreground">
                Sem candidatos para os critérios atuais.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </RecruitmentSection>
    </RecruitmentLayout>
  );
}
