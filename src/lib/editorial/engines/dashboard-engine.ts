export interface DashboardNarrativeInput {
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

export function buildDashboardNarrative(input: DashboardNarrativeInput): string[] {
  const out: string[] = [];

  out.push(
    `O dashboard resume a operação da plataforma em ${input.seasons} época${input.seasons === 1 ? "" : "s"}, agregando ${input.insights} insights e ${input.imports} importações recentes numa única leitura editorial.`,
  );

  if (input.latestYear != null) {
    out.push(
      `A época mais recente continua a ser o eixo principal da análise, mas o valor do painel está em ligar esse presente ao que já aconteceu em ciclos anteriores.`,
    );
  }

  if (input.biggestRise || input.biggestFall) {
    const rise = input.biggestRise;
    const fall = input.biggestFall;
    const parts: string[] = [];
    if (rise) parts.push(`${rise.name} lidera a subida recente`);
    if (fall) parts.push(`${fall.name} sofreu a maior correção`);
    out.push(`No retrato de tendência, ${parts.join(" enquanto ")}.`);
  }

  if (input.bestSeason) {
    out.push(
      `O melhor registo histórico de referência pertence a ${input.bestSeason.name}, o que ajuda a contextualizar o teto competitivo atual da base de dados.`,
    );
  }

  if (input.mostRegular) {
    out.push(
      `A entidade mais regular é ${input.mostRegular.name}, um sinal útil de que o painel não mede apenas explosões, mas também continuidade e robustez.`,
    );
  }

  out.push(
    `A cobertura atual cruza ${input.clubs} clubes, ${input.coaches} treinadores, ${input.players} jogadores, ${input.competitions} competições e ${input.countries} países, o que reforça o papel do dashboard como vista transversal da plataforma.`,
  );

  if (input.lastImport) {
    out.push(
      `A última importação (${input.lastImport.filename}) mantém a disciplina operacional visível no painel e explica porque o contexto do dado importa tanto quanto o valor isolado.`,
    );
  }

  return out.slice(0, 5);
}
