// Templates determinísticos para narrativas. Sem IA generativa.
// Substituição simples de {placeholders}.

export type TemplateKey =
  | "rankings.new_leader"
  | "rankings.enter_top10"
  | "rankings.exit_top10"
  | "rankings.biggest_rise"
  | "rankings.biggest_fall"
  | "rankings.best_ever"
  | "rankings.worst_ever"
  | "evolution.sustained_growth"
  | "evolution.sustained_decline"
  | "evolution.recovery"
  | "evolution.stagnation"
  | "records.highest_score"
  | "records.most_titles"
  | "records.consecutive_seasons"
  | "records.best_streak"
  | "records.absolute_record"
  | "competitions.national_dominance"
  | "competitions.continental_dominance"
  | "competitions.global_dominance"
  | "trends.emerging_club"
  | "trends.emerging_league"
  | "trends.rising_country"
  | "trends.declining_competition"
  | "players.revelation"
  | "players.best_evolution"
  | "players.career_peak"
  | "players.decline"
  | "coaches.dynasty"
  | "coaches.european_specialist"
  | "coaches.recovery"
  | "coaches.club_change";

export const TEMPLATES: Record<TemplateKey, { title: string; description: string }> = {
  "rankings.new_leader": {
    title: "Novo líder mundial: {entity}",
    description: "{entity} assumiu a liderança do ranking mundial na época {season}.",
  },
  "rankings.enter_top10": {
    title: "{entity} entra no Top 10",
    description: "{entity} entrou no Top 10 mundial, subindo de {previous}º para {current}º.",
  },
  "rankings.exit_top10": {
    title: "{entity} sai do Top 10",
    description: "{entity} saiu do Top 10 mundial, caindo de {previous}º para {current}º.",
  },
  "rankings.biggest_rise": {
    title: "Maior subida: {entity}",
    description: "{entity} subiu {delta} posições, passando de {previous}º para {current}º.",
  },
  "rankings.biggest_fall": {
    title: "Maior descida: {entity}",
    description: "{entity} desceu {delta} posições, passando de {previous}º para {current}º.",
  },
  "rankings.best_ever": {
    title: "Melhor classificação histórica: {entity}",
    description:
      "{entity} alcançou a sua melhor classificação de sempre ({current}º) na época {season}.",
  },
  "rankings.worst_ever": {
    title: "Pior classificação histórica: {entity}",
    description:
      "{entity} registou a sua pior classificação de sempre ({current}º) na época {season}.",
  },
  "evolution.sustained_growth": {
    title: "Crescimento sustentado: {entity}",
    description: "{entity} melhorou a classificação em {seasonsCount} épocas consecutivas.",
  },
  "evolution.sustained_decline": {
    title: "Declínio sustentado: {entity}",
    description: "{entity} piorou a classificação em {seasonsCount} épocas consecutivas.",
  },
  "evolution.recovery": {
    title: "Recuperação: {entity}",
    description: "{entity} recuperou {delta} posições após um período de queda.",
  },
  "evolution.stagnation": {
    title: "Estagnação: {entity}",
    description: "{entity} manteve-se em posições semelhantes ao longo de {seasonsCount} épocas.",
  },
  "records.highest_score": {
    title: "Maior pontuação: {entity}",
    description: "{entity} atingiu a maior pontuação registada ({value}).",
  },
  "records.most_titles": {
    title: "Mais títulos: {entity}",
    description: "{entity} lidera o registo histórico com {value} títulos.",
  },
  "records.consecutive_seasons": {
    title: "Mais épocas consecutivas: {entity}",
    description: "{entity} soma {value} épocas consecutivas no Top.",
  },
  "records.best_streak": {
    title: "Melhor série: {entity}",
    description: "{entity} tem a melhor série registada com {value}.",
  },
  "records.absolute_record": {
    title: "Recorde absoluto: {entity}",
    description: "{entity} estabeleceu um recorde absoluto em {metric} ({value}).",
  },
  "competitions.national_dominance": {
    title: "Domínio nacional: {entity}",
    description: "{entity} domina a competição nacional na época {season}.",
  },
  "competitions.continental_dominance": {
    title: "Domínio continental: {entity}",
    description: "{entity} domina a competição continental na época {season}.",
  },
  "competitions.global_dominance": {
    title: "Domínio mundial: {entity}",
    description: "{entity} domina o panorama mundial na época {season}.",
  },
  "trends.emerging_club": {
    title: "Clube emergente: {entity}",
    description: "{entity} destaca-se como clube emergente com subida consistente.",
  },
  "trends.emerging_league": {
    title: "Liga emergente: {entity}",
    description: "{entity} apresenta crescimento consistente entre as ligas.",
  },
  "trends.rising_country": {
    title: "País em crescimento: {entity}",
    description: "{entity} regista crescimento agregado entre os seus clubes.",
  },
  "trends.declining_competition": {
    title: "Competição em declínio: {entity}",
    description: "{entity} regista tendência de declínio agregada.",
  },
  "players.revelation": {
    title: "Revelação: {entity}",
    description: "{entity} destaca-se como revelação da época {season}.",
  },
  "players.best_evolution": {
    title: "Melhor evolução: {entity}",
    description: "{entity} apresenta a melhor evolução individual entre os jogadores.",
  },
  "players.career_peak": {
    title: "Pico de carreira: {entity}",
    description: "{entity} atingiu o pico da sua carreira na época {season}.",
  },
  "players.decline": {
    title: "Declínio: {entity}",
    description: "{entity} regista sinais de declínio no seu desempenho.",
  },
  "coaches.dynasty": {
    title: "Dinastia: {entity}",
    description: "{entity} construiu uma dinastia com {value} épocas de sucesso consecutivas.",
  },
  "coaches.european_specialist": {
    title: "Especialista europeu: {entity}",
    description: "{entity} destaca-se como especialista em competições europeias.",
  },
  "coaches.recovery": {
    title: "Recuperação: {entity}",
    description: "{entity} recuperou desempenho após período negativo.",
  },
  "coaches.club_change": {
    title: "Mudança de clube: {entity}",
    description: "{entity} mudou de clube na época {season}.",
  },
};

export function fill(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}
