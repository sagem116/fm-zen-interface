import type { EditorialContext } from "../types";
import { formatSigned } from "./shared";

export function buildComparisonNarrative(ctx: EditorialContext): string[] {
  const out: string[] = [];

  const world = ctx.rankings.world;
  if (world) {
    const share = world.total > 1 ? (1 - (world.rank - 1) / (world.total - 1)) * 100 : 100;
    out.push(
      `No universo global, a entidade está no grupo de cima: ocupa ${world.rank}.º lugar entre ${world.total}, o que a coloca acima de ${share.toFixed(1)}% do conjunto avaliado.`,
    );
  }

  if (ctx.rankings.continental) {
    const cont = ctx.rankings.continental;
    out.push(
      `No contexto continental, o posicionamento é ${cont.rank}.º em ${cont.total}, pelo que a leitura já depende mais da densidade regional do que do valor absoluto do score.`,
    );
  }

  if (ctx.rankings.national) {
    const nat = ctx.rankings.national;
    out.push(
      `A comparação nacional reforça ou suaviza o retrato global: ${nat.rank}.º em ${nat.total}${nat.country ? ` no país ${nat.country}` : ""}.`,
    );
  }

  if (ctx.rankings.competition) {
    const comp = ctx.rankings.competition;
    out.push(
      `Dentro da competição ${comp.competition ?? "de referência"}, a posição relativa é ${comp.rank}.º em ${comp.total}.`,
    );
  }

  if (ctx.rankings.club) {
    const club = ctx.rankings.club;
    out.push(
      `No microcontexto do clube${club.club ? ` (${club.club})` : ""}, a leitura confirma o peso interno da entidade no seu próprio ecossistema.`,
    );
  }

  if (ctx.similar.length) {
    const closest = ctx.similar[0];
    const second = ctx.similar[1];
    out.push(
      `A comparação com pares semelhantes aponta ${closest.name} como o contacto mais próximo, com uma distância editorial de ${closest.distance.toFixed(2)}.`,
    );
    if (second) {
      out.push(
        `A seguir surge ${second.name}, o que mostra que a zona de referência competitiva está bem definida e não depende de um único espelho.`,
      );
    }
  }

  const comparisonFacts = ctx.comparisons.slice(0, 3).map((fact) => fact.text);
  if (comparisonFacts.length) {
    out.push(...comparisonFacts);
  }

  if (ctx.evolution.deltaScore != null || ctx.evolution.deltaRank != null) {
    out.push(
      `Face à época anterior, a mudança líquida é ${formatSigned(ctx.evolution.deltaScore ?? 0)} no score e ${formatSigned(-(ctx.evolution.deltaRank ?? 0), 0)} na posição, o que ajuda a separar melhoria real de simples manutenção.`,
    );
  }

  return out.slice(0, 6);
}
