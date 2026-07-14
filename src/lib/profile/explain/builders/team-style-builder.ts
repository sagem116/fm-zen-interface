import type { TeamCollectiveMetrics } from "../types";

function pushIf(out: string[], condition: boolean, text: string) {
  if (condition) out.push(text);
}

export function buildTeamStyleTags(metrics: TeamCollectiveMetrics): string[] {
  const tags: string[] = [];
  pushIf(tags, metrics.attack >= 68 && metrics.defense >= 62, "equipa equilibrada");
  pushIf(tags, metrics.attack >= 72, "equipa ofensiva");
  pushIf(tags, metrics.defense >= 72, "equipa defensiva");
  pushIf(tags, metrics.possession >= 70, "equipa dominante");
  pushIf(tags, metrics.transitions >= 68, "equipa vertical");
  pushIf(tags, metrics.organization >= 70, "equipa organizada");
  pushIf(tags, metrics.intensity >= 70, "equipa intensa");
  pushIf(tags, metrics.physicality >= 68, "equipa física");
  pushIf(tags, metrics.creativity >= 70, "equipa criativa");
  pushIf(tags, metrics.build >= 68 && metrics.possession >= 68, "equipa paciente");
  pushIf(tags, metrics.attack < 58 && metrics.defense >= 66, "equipa pragmática");
  pushIf(tags, metrics.unpredictability >= 55, "equipa imprevisível");
  return [...new Set(tags)];
}

export function buildTeamStyleNarrative(metrics: TeamCollectiveMetrics): string {
  const buildText =
    metrics.build >= 70
      ? "inicia construção curta com circulação estável"
      : metrics.build <= 45
        ? "procura construção direta e vertical"
        : "alterna construção curta e passes de progressão";

  const attackText =
    metrics.attack >= 70
      ? "cria volume ofensivo elevado e converte com frequência"
      : metrics.attack <= 45
        ? "gera poucas ocasiões limpas e depende de eficiência pontual"
        : "mantém ataque funcional, mas sem domínio consistente";

  const defenseText =
    metrics.defense >= 70
      ? "pressiona e recupera com agressividade controlada"
      : metrics.defense <= 45
        ? "tem dificuldade em estabilizar recuperação e duelo"
        : "apresenta comportamento defensivo intermédio";

  const possessionText =
    metrics.possession >= 70
      ? "controla ritmo e posse com segurança"
      : metrics.possession <= 45
        ? "prefere posse curta e acelera transição rapidamente"
        : "mistura momentos de controlo com fases diretas";

  const transitionText =
    metrics.transitions >= 70
      ? "é forte na reação à perda e no ataque após recuperação"
      : metrics.transitions <= 45
        ? "transita de forma mais lenta e previsível"
        : "tem transições competitivas, mas não dominantes";

  return (
    `A equipa ${buildText}, ${attackText}. ` +
    `Sem bola, ${defenseText}; com bola, ${possessionText}. ` +
    `No momento de mudança de estado, ${transitionText}.`
  );
}
