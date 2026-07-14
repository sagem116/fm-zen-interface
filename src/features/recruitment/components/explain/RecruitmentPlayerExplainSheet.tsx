import { useState, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Gauge,
  HeartPulse,
  Lightbulb,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRecruitmentPlayerExplain } from "../../hooks/useRecruitmentPlayerExplain";
import type {
  ExplainBadge,
  RecruitmentExplainSection,
} from "../../services/recruitment-player-explain";

interface RecruitmentPlayerExplainSheetProps {
  playerName: string | null | undefined;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerClassName?: string;
  disabled?: boolean;
}

const ICON_BY_SECTION: Record<string, ComponentType<{ className?: string }>> = {
  "profile-general": Sparkles,
  "playing-style": Activity,
  technical: Target,
  mental: Brain,
  physical: HeartPulse,
  statistical: BarChart3,
  "team-role": UserRound,
  strengths: ShieldCheck,
  weaknesses: AlertTriangle,
  "tactical-fit": Swords,
  "role-fit": Gauge,
  evolution: TrendingUp,
  comparison: WandSparkles,
  potential: Lightbulb,
  risk: ShieldAlert,
  recommendations: Sparkles,
};

function badgeClass(tone: ExplainBadge["tone"]): string {
  if (tone === "success") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
  if (tone === "warning") return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  if (tone === "danger") return "bg-red-500/15 text-red-400 border-red-500/40";
  if (tone === "info") return "bg-blue-500/15 text-blue-300 border-blue-500/40";
  return "bg-muted text-muted-foreground border-border";
}

function ExplainCard({ section }: { section: RecruitmentExplainSection }) {
  const Icon = ICON_BY_SECTION[section.id] ?? Sparkles;

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-sm shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className="size-4 text-primary" />
              {section.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{section.subtitle}</p>
          </div>
          {section.badges?.length ? (
            <div className="flex flex-wrap justify-end gap-1">
              {section.badges.map((badge) => (
                <Badge key={`${section.id}-${badge.label}`} variant="outline" className={badgeClass(badge.tone)}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>

        {section.bullets?.length ? (
          <ul className="space-y-1.5 text-sm">
            {section.bullets.map((bullet, index) => (
              <li
                key={`${section.id}-bullet-${index}`}
                className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2"
              >
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}

        {section.indicators?.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {section.indicators.map((indicator) => (
              <div
                key={`${section.id}-${indicator.label}`}
                className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{indicator.label}</span>
                  <span className="tabular-nums font-semibold">{Math.round(indicator.value)}</span>
                </div>
                <Progress value={Math.max(0, Math.min(100, indicator.value))} className="h-1.5 mt-1" />
                {indicator.hint ? (
                  <p className="text-[11px] text-muted-foreground mt-1">{indicator.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {section.ratings?.length ? (
          <div className="space-y-1.5">
            {section.ratings.map((rating) => (
              <div
                key={`${section.id}-${rating.label}`}
                className="grid grid-cols-[1fr_auto] gap-2 items-center text-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span>{rating.label}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(rating.value)}</span>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, rating.value))} className="h-1.5 mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function RecruitmentPlayerExplainSheet({
  playerName,
  triggerLabel = "Explain",
  triggerVariant = "outline",
  triggerClassName,
  disabled,
}: RecruitmentPlayerExplainSheetProps) {
  const [open, setOpen] = useState(false);
  const { model, isLoading } = useRecruitmentPlayerExplain(playerName);

  const canOpen = !disabled && Boolean(playerName);

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        className={cn("gap-2", triggerClassName)}
        onClick={() => setOpen(true)}
        disabled={!canOpen}
      >
        <Sparkles className="size-4" />
        {triggerLabel}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[980px] max-w-[98vw] sm:max-w-[980px] p-0">
          <div className="h-full overflow-y-auto px-5 py-4 space-y-4">
            <SheetHeader>
              <SheetTitle>Explain Mode</SheetTitle>
              <SheetDescription>
                {model
                  ? `${model.playerName} · interpretação editorial baseada em atributos, métricas e estatísticas`
                  : playerName
                    ? `${playerName} · sem dados suficientes para gerar interpretação`
                    : "Seleciona um jogador para gerar análise"}
              </SheetDescription>
            </SheetHeader>

            {isLoading ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  A gerar explicação editorial...
                </CardContent>
              </Card>
            ) : null}

            {!isLoading && model ? (
              <div className="space-y-3 pb-4">
                {model.sections.map((section) => (
                  <ExplainCard key={section.id} section={section} />
                ))}
              </div>
            ) : null}

            {!isLoading && !model ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Não foi possível gerar Explain Mode para este jogador com os dados atuais.
                </CardContent>
              </Card>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
