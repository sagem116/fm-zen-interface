import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RankingExplainSheet } from "@/components/RankingExplainSheet";
import { RecruitmentPlayerExplainSheet } from "@/features/recruitment/components/explain/RecruitmentPlayerExplainSheet";
import { useRecruitmentSourceData } from "@/features/recruitment/data/useRecruitmentSourceData";
import { ProfileExplainSections } from "@/components/profile/explain/ProfileExplainSections";
import type { ProfileContext } from "@/lib/profile/types";
import { buildClubExplainModel, buildPlayerExplainModel } from "@/lib/profile/explain";
import type { RecruitmentPlayer } from "@/features/recruitment/types/recruitment-models";

type ExplainKind = "clubes" | "treinadores" | "paises";

const MAP: Record<string, ExplainKind> = {
  club: "clubes",
  coach: "treinadores",
  country: "paises",
};

export function ExplainTab({ ctx }: { ctx: ProfileContext }) {
  const [open, setOpen] = useState(false);
  const mapped = MAP[ctx.kind];
  const recruitment = useRecruitmentSourceData();

  const clubExplain = useMemo(() => {
    if (ctx.kind !== "club" || !recruitment.source) return null;
    const players = recruitment.source.entities.players;
    const ownPlayers = players.filter((player) => normalize(player.club) === normalize(ctx.name));
    if (!ownPlayers.length) return null;
    const season = ownPlayers[0]?.currentSeason ?? recruitment.source.currentSeason ?? new Date().getFullYear();
    return buildClubExplainModel({
      clubName: ctx.name,
      season,
      players: ownPlayers,
      allPlayers: players,
    });
  }, [ctx.kind, ctx.name, recruitment.source]);

  const playerExplain = useMemo(() => {
    if (ctx.kind !== "player" || !recruitment.source) return null;
    const players = recruitment.source.entities.players;
    const selected = players.find((player) => normalize(player.name) === normalize(ctx.name));
    if (!selected) return null;
    const teamPlayers = players.filter((player) => normalize(player.club) === normalize(selected.club));
    const leaguePlayers = players.filter(
      (player) => normalize(player.competition) === normalize(selected.competition),
    );
    return buildPlayerExplainModel({
      player: selected as RecruitmentPlayer,
      peers: players,
      teamPlayers,
      leaguePlayers,
    });
  }, [ctx.kind, ctx.name, recruitment.source]);

  if (ctx.kind === "player") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Explain Mode do jogador reutiliza a inteligência do Recruitment e acrescenta comparação contextual por posição, equipa, liga e universo global.
        </p>
        <div className="flex items-center gap-2">
          <RecruitmentPlayerExplainSheet
            playerName={ctx.name}
            triggerLabel="Abrir Explain completo"
            triggerVariant="outline"
          />
        </div>
        {playerExplain ? <ProfileExplainSections sections={playerExplain.sections} /> : null}
        {!playerExplain ? (
          <p className="text-sm text-muted-foreground">Não foi possível gerar Explain Mode do jogador com os dados atuais.</p>
        ) : null}
      </div>
    );
  }

  if (ctx.kind === "club") {
    if (!clubExplain) {
      return (
        <p className="text-sm text-muted-foreground">
          Não foi possível gerar Explain coletivo do clube com os dados atuais.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Explain Mode coletivo construído por agregação de métricas dos jogadores do clube, com comparação automática face à liga e clubes semelhantes.
        </p>
        <ProfileExplainSections sections={clubExplain.sections} />
      </div>
    );
  }

  if (!mapped) {
    return <p className="text-sm text-muted-foreground">Explain não aplicável a esta entidade.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Consulte a fórmula, pesos, contribuições por competição e origem dos dados que produzem o
        ranking desta entidade.
      </p>
      <Button onClick={() => setOpen(true)}>Abrir análise completa</Button>
      <RankingExplainSheet
        open={open}
        onOpenChange={setOpen}
        name={ctx.name}
        kind={mapped}
        ranks={ctx.data.ranks}
        config={ctx.data.config}
        activeProfileId={ctx.data.activeProfileId}
        dataSummary={{ seasons: ctx.data.data.seasons.length }}
      />
    </div>
  );
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}
