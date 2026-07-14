import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  FileText,
  GitCompareArrows,
  Globe2,
  Plus,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  User,
  Users,
  Activity,
  ArrowRight,
  BookOpen,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRecruitmentDashboard } from "../hooks/useRecruitmentDashboard";
import { useRecruitmentKnowledgeStats } from "../hooks/useRecruitmentKnowledgeStats";
import { useRecruitmentRecommendationInsights } from "../hooks/useRecruitmentRecommendationInsights";
import { useRecruitmentNeeds } from "../hooks/useRecruitmentNeeds";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";
import { formatRecruitmentTimestamp, percentageOf } from "../utils/recruitment-format";
import { PremiumLayout } from "./layout/PremiumLayout";
import { KpiStrip } from "./kpi/KpiStrip";
import { KpiCard } from "./kpi/KpiCard";
import { ContentBlock } from "./layout/ContentBlock";
import { NarrativeCard } from "./layout/NarrativeCard";

function profileRoute(kind: "player" | "coach" | "club" | "competition" | "country") {
  if (kind === "competition") return "/competicoes/$name";
  if (kind === "country") return "/paises/$name";
  if (kind === "club") return "/clubes/$name";
  if (kind === "coach") return "/treinadores/$name";
  return "/jogadores/$name";
}

export function RecruitmentDashboardPage() {
  const { isLoading, data } = useRecruitmentDashboard();
  const { needs } = useRecruitmentNeeds();
  const knowledge = useRecruitmentKnowledgeStats();
  const recommendation = useRecruitmentRecommendationInsights();

  const breadcrumbs = buildRecruitmentBreadcrumbs("Dashboard");

  if (isLoading || !data) {
    return (
      <PremiumLayout title="Recruitment Center" isLoading>
        <span />
      </PremiumLayout>
    );
  }

  const lastUpdate = formatRecruitmentTimestamp(data.summary.lastUpdatedAt);

  return (
    <PremiumLayout
      title="Recruitment Dashboard"
      description="Visão global do estado do mercado, prioridades de observação e pipeline atual."
      breadcrumbs={breadcrumbs}
      lastUpdate={lastUpdate}
      analyzedCount={data.summary.totals.players + data.summary.totals.coaches}
      kpiStrip={
        <KpiStrip>
          <KpiCard
            label="Base de Dados"
            value={data.summary.totals.players}
            hint="Jogadores rastreados"
            icon={Users}
            intent="default"
          />
          <KpiCard
            label="Scouting Ativo"
            value={data.summary.totals.coaches}
            hint="Treinadores e staff"
            icon={ClipboardList}
            trend="up"
            trendValue="Novo"
            intent="info"
          />
          <KpiCard
            label="Recomendações"
            value={recommendation.analyzedCandidates}
            hint="Perfis avaliados no motor"
            icon={Sparkles}
            intent="success"
          />
          <KpiCard
            label="Clubes Monitorizados"
            value={data.summary.totals.clubs}
            hint="Base global"
            icon={Shield}
            intent="default"
          />
        </KpiStrip>
      }
      headerActions={
        <>
          <Button variant="outline" asChild size="sm">
            <Link to="/recruitment-center/shortlists">
              <Plus className="mr-2 size-4" /> Nova Shortlist
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link to="/recruitment-center/observacoes">
              <ClipboardList className="mr-2 size-4" /> Nova Observação
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-gold hover:bg-gold/90 text-gold-foreground">
            <Link to="/recruitment-center/pesquisa">
              <Search className="mr-2 size-4" /> Pesquisa Avançada
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-6">
        <NarrativeCard 
          intent="recommendation"
          title="Resumo Executivo"
          content={`A base de recrutamento tem ${data.summary.totals.players} jogadores. Atualmente existem ${recommendation.analyzedCandidates} candidatos processados pelo Recommendation Engine. A cobertura global do knowledge base encontra-se em ${knowledge.data?.coverage ?? 0}%.`}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <ContentBlock 
            title="Overview de Scouting" 
            description="Distribuição atual por tipo de observação"
            icon={<Target />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-md">
                    <Activity className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Recruitment Score (Média)</p>
                    <p className="text-xs text-muted-foreground">Avaliação global</p>
                  </div>
                </div>
                <p className="text-xl font-bold font-display tabular-nums tracking-tight">
                  {(knowledge.data?.scoreMean ?? 0).toFixed(1)}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-md">
                    <BookOpen className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Perfis Construídos</p>
                    <p className="text-xs text-muted-foreground">Knowledge Base</p>
                  </div>
                </div>
                <p className="text-xl font-bold font-display tabular-nums tracking-tight">
                  {knowledge.data?.profilesBuilt ?? 0}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 text-green-500 rounded-md">
                    <TrendingUp className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Shortlists</p>
                    <p className="text-xs text-muted-foreground">Listas Ativas</p>
                  </div>
                </div>
                <p className="text-xl font-bold font-display tabular-nums tracking-tight">
                  {data.summary.favorites.players.length}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
               <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary">
                 <Link to="/recruitment-center/relatorios">
                    Ver pipeline completo <ArrowRight className="ml-2 size-3" />
                 </Link>
               </Button>
            </div>
          </ContentBlock>

          <ContentBlock 
            title="Mercado & Dinâmicas" 
            description="Estado do mercado e entidades observadas"
            icon={<Globe2 />}
          >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="font-medium text-xs uppercase tracking-wider h-9 px-0">Indicador</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider text-right h-9 w-[100px] px-0">Valores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      label: "Jogadores disponiveis",
                      value: data.summary.marketSnapshot.playersAvailable,
                      max: data.summary.totals.players,
                    },
                    {
                      label: "Jogadores ativos",
                      value: data.summary.marketSnapshot.playersActive,
                      max: data.summary.totals.players,
                    },
                    {
                      label: "Treinadores ativos",
                      value: data.summary.marketSnapshot.coachesActive,
                      max: data.summary.totals.coaches,
                    },
                    {
                      label: "Competicoes observadas",
                      value: data.summary.marketSnapshot.competitionsObserved,
                      max: data.summary.totals.competitions,
                    },
                  ].map((row) => (
                    <TableRow key={row.label} className="border-border/40">
                      <TableCell className="font-medium text-sm py-2.5 px-0">
                        <div className="flex items-center gap-2">
                           {row.label}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm tabular-nums py-2.5 px-0">
                        {row.value.toLocaleString("pt-PT")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </ContentBlock>
        </div>
      </div>
    </PremiumLayout>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2.5 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function LinkedList({
  title,
  items,
}: {
  title: string;
  items: Array<{ kind: "player" | "coach" | "club" | "competition" | "country"; name: string }>;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem registos</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <Link
              key={`${item.kind}-${item.name}-${idx}`}
              to={profileRoute(item.kind) as never}
              params={{ name: item.name } as never}
              className="block truncate text-sm hover:text-gold"
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
