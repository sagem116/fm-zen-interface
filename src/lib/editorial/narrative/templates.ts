/**
 * PT-PT editorial templates (magazine/yearbook tone).
 * Deterministic. No LLM. Multiple variants per block for tonal variety.
 *
 * Placeholders (all optional):
 *   {name} {role} {club} {country} {competition} {continent}
 *   {score} {grade} {percentile} {rank} {total}
 *   {deltaRank} {deltaScore} {prevSeason} {season}
 *   {topDriver1} {topDriver2}
 *   {seasons} {titles} {clubs} {peakSeason} {peakScore}
 *   {avgStrength} {topClub1} {topClub2}
 *   {talentProduction} {generationLabel}
 *   {longevity} {era}
 *   {headline} {trophyCount}
 */

export type TemplateVariant = string;

export interface TemplateBlock {
  variants: TemplateVariant[];
}

/* ---------------- Rankings (competitive present) ---------------- */

export const OPENING_STRONG: TemplateBlock = {
  variants: [
    "Depois de uma época extraordinária, {name} consolida-se entre a elite mundial da posição.",
    "A campanha realizada por {name} coloca-o naturalmente no topo do ranking da sua posição.",
    "{name} atravessa um dos momentos mais brilhantes da sua carreira, refletido de forma clara neste ranking.",
  ],
};

export const OPENING_STABLE: TemplateBlock = {
  variants: [
    "{name} continua a afirmar-se como uma das principais referências da posição.",
    "A regularidade demonstrada por {name} volta a ter tradução direta no ranking desta época.",
    "Época sólida de {name}, que mantém o estatuto ganho nos últimos anos.",
  ],
};

export const OPENING_DECLINE: TemplateBlock = {
  variants: [
    "Apesar da qualidade demonstrada, {name} perdeu algumas posições face à época anterior devido à forte concorrência.",
    "{name} cede terreno no ranking desta época, ainda que mantenha um patamar de referência.",
    "Época menos conseguida de {name}, que se afasta ligeiramente dos lugares cimeiros.",
  ],
};

export const POSITIONING: TemplateBlock = {
  variants: [
    "Ocupa atualmente o {rank}.º lugar de {total}, pertencendo ao percentil {percentile} das entidades avaliadas.",
    "Aparece no {rank}.º lugar entre {total}, no percentil {percentile}, com a classificação {grade}.",
    "Encontra-se em {rank}.º lugar num universo de {total} avaliações, dentro do percentil {percentile}.",
  ],
};

export const DRIVERS: TemplateBlock = {
  variants: [
    "A sua posição é explicada sobretudo por {topDriver1} e {topDriver2}, os fatores que mais contribuem para o Score final.",
    "Destacam-se, entre os principais contribuintes, {topDriver1} e {topDriver2}.",
    "Os grandes responsáveis por esta pontuação são {topDriver1} e {topDriver2}.",
  ],
};

export const EVOLUTION_UP: TemplateBlock = {
  variants: [
    "A evolução registada face a {prevSeason} coloca-o entre as maiores revelações da temporada.",
    "Subiu {deltaRank} posições relativamente à época anterior, uma das progressões mais expressivas do ranking.",
    "A consistência demonstrada permitiu-lhe subir várias posições relativamente à época passada.",
  ],
};

export const EVOLUTION_DOWN: TemplateBlock = {
  variants: [
    "Cedeu {deltaRank} posições face à época anterior, sinal da exigência crescente da categoria.",
    "Perde alguma tração face à temporada anterior, num ranking cada vez mais competitivo.",
    "A época encerra abaixo do patamar da anterior, apesar de manter valores muito assinaláveis.",
  ],
};

export const EVOLUTION_FLAT: TemplateBlock = {
  variants: [
    "Mantém uma posição em linha com a época anterior, prova da sua regularidade.",
    "A época termina numa cadência semelhante à anterior, sem grandes oscilações.",
  ],
};

export const CONTEXT_BEST_WORLD: TemplateBlock = {
  variants: [
    "É, presentemente, o melhor do mundo na sua posição.",
    "Reina isolado no topo do ranking mundial da posição.",
  ],
};

export const CONTEXT_BEST_CONTINENT: TemplateBlock = {
  variants: [
    "É a principal referência {continent} da posição.",
    "Ocupa a liderança continental do ranking.",
  ],
};

export const CONTEXT_BEST_COUNTRY: TemplateBlock = {
  variants: [
    "Impõe-se como o melhor do seu país no ranking.",
    "Assume-se como referência nacional inequívoca.",
  ],
};

export const CONTEXT_BEST_COMPETITION: TemplateBlock = {
  variants: [
    "É a principal figura da {competition} nesta avaliação.",
    "Domina o ranking da {competition}.",
  ],
};

export const CONTEXT_BEST_CLUB: TemplateBlock = {
  variants: [
    "Lidera o ranking dentro do próprio clube.",
    "Assume-se como a figura mais destacada do plantel neste score.",
  ],
};

export const CLOSING_ELITE: TemplateBlock = {
  variants: [
    "Uma época que confirma o estatuto ganho nos últimos anos.",
    "Mais uma temporada em que a exigência é honrada com resultados.",
    "Um exercício que reforça o lugar de {name} entre a elite.",
  ],
};

export const CLOSING_NEUTRAL: TemplateBlock = {
  variants: [
    "O futuro dirá se este é o início de um novo ciclo ou um pico de forma.",
    "A próxima época confirmará ou não a solidez deste desempenho.",
  ],
};

/* ---------------- Player profile (biographical) ---------------- */

export const OPENING_BIOGRAPHICAL_ASCENDING: TemplateBlock = {
  variants: [
    "Depois de várias épocas de crescimento sustentado, {name} passa de promessa a referência da posição.",
    "A trajetória de {name} confirma uma progressão sólida: cada época elevou o patamar da anterior.",
    "Ao longo de {seasons} épocas, {name} construiu um percurso ascendente que agora se traduz em estatuto internacional.",
  ],
};

export const OPENING_BIOGRAPHICAL_PEAK: TemplateBlock = {
  variants: [
    "{name} vive o auge da carreira, com {seasons} épocas ao mais alto nível e um patamar competitivo raro.",
    "No pico da carreira, {name} afirma-se como uma das figuras marcantes da sua geração.",
    "A carreira de {name} atingiu o ponto mais alto, sustentada por {seasons} épocas de rendimento consistente.",
  ],
};

export const OPENING_BIOGRAPHICAL_VETERAN: TemplateBlock = {
  variants: [
    "Com {seasons} épocas de carreira, {name} mantém a competitividade que o distingue há vários anos.",
    "Veterano de {seasons} épocas, {name} continua a impor-se num universo cada vez mais jovem.",
    "A longevidade de {name} é já um dos traços mais notáveis da sua carreira.",
  ],
};

export const OPENING_BIOGRAPHICAL_EMERGING: TemplateBlock = {
  variants: [
    "{name} começa a impor-se e as primeiras épocas de carreira apontam para um percurso promissor.",
    "Ainda no início da carreira, {name} já mostra sinais claros de potencial para chegar ao topo.",
    "As primeiras épocas de {name} colocam-no entre os nomes a seguir de perto.",
  ],
};

export const TRAJECTORY_ASCENT: TemplateBlock = {
  variants: [
    "A época de {peakSeason} marcou a viragem, com o pico de rendimento a chegar em {peakScore} pontos.",
    "Foi em {peakSeason} que {name} atingiu o pico da carreira ({peakScore}).",
    "O ponto mais alto até hoje foi registado em {peakSeason}, num valor de {peakScore}.",
  ],
};

export const TRAJECTORY_CONSOLIDATION: TemplateBlock = {
  variants: [
    "A regularidade ao longo dos anos consolidou-o como uma presença fixa entre os melhores.",
    "A carreira de {name} desenha uma curva estável, sinal de uma consistência raramente vista.",
  ],
};

export const TRAJECTORY_LEGACY: TemplateBlock = {
  variants: [
    "Os números acumulados ao longo da carreira colocam-no numa categoria à parte.",
    "O legado de {name} é já uma referência para gerações futuras.",
  ],
};

/* ---------------- Club profile (institutional) ---------------- */

export const OPENING_INSTITUTIONAL_RISING: TemplateBlock = {
  variants: [
    "O {name} atravessa o período mais forte da sua história recente, acumulando várias épocas entre as principais forças continentais.",
    "Nunca o {name} esteve tão consistentemente próximo do topo — o presente é fruto de um projeto de vários anos.",
    "O {name} vive um ciclo de afirmação claro, sustentado por várias épocas de rendimento crescente.",
  ],
};

export const OPENING_INSTITUTIONAL_DOMINANT: TemplateBlock = {
  variants: [
    "O {name} assume a condição de força dominante, prolongando um ciclo raro no futebol.",
    "Poucos clubes conseguiram, na história recente, o domínio que o {name} construiu no presente.",
    "O {name} vive um estado de excelência que o coloca acima da concorrência direta.",
  ],
};

export const OPENING_INSTITUTIONAL_DECLINE: TemplateBlock = {
  variants: [
    "O {name} atravessa uma fase de reorganização, longe do patamar competitivo das melhores épocas.",
    "Após anos de afirmação, o {name} enfrenta agora um período mais exigente.",
    "O ciclo recente do {name} obriga a uma leitura mais moderada face aos anos de maior sucesso.",
  ],
};

export const OPENING_INSTITUTIONAL_STABLE: TemplateBlock = {
  variants: [
    "O {name} mantém uma linha de continuidade, sem sobressaltos assinaláveis.",
    "Época após época, o {name} confirma a identidade competitiva que o distingue.",
  ],
};

export const CLUB_CYCLE_TITLES: TemplateBlock = {
  variants: [
    "O palmarés recente reforça a dimensão institucional do clube, com {titles} títulos conquistados no período.",
    "Nos últimos anos, o {name} somou {titles} títulos, tradução direta do momento vivido.",
  ],
};

export const CLUB_CYCLE_CONSISTENCY: TemplateBlock = {
  variants: [
    "A regularidade nas competições nacionais e internacionais confirma a identidade competitiva.",
    "A presença constante nos lugares cimeiros distingue o clube dentro do panorama nacional.",
  ],
};

/* ---------------- Competition profile (analytical) ---------------- */

export const OPENING_COMPETITION_STRENGTHENING: TemplateBlock = {
  variants: [
    "A {name} consolidou a sua posição entre as ligas mais fortes, com aumento consistente da qualidade média dos seus participantes.",
    "A qualidade média dos participantes da {name} tem crescido de forma sustentada nas últimas épocas.",
    "A {name} atravessa uma fase de crescimento competitivo, refletido no patamar dos clubes envolvidos.",
  ],
};

export const OPENING_COMPETITION_STABLE: TemplateBlock = {
  variants: [
    "A {name} confirma-se como uma competição de referência, com estabilidade competitiva assinalável.",
    "O nível competitivo da {name} mantém-se num patamar consistente com épocas anteriores.",
  ],
};

export const OPENING_COMPETITION_DECLINING: TemplateBlock = {
  variants: [
    "A {name} atravessa uma fase de ajustamento, com uma qualidade média inferior à observada em anos anteriores.",
    "A competitividade da {name} tem-se moderado face ao pico das últimas épocas.",
  ],
};

export const COMPETITION_TOP_CLUBS: TemplateBlock = {
  variants: [
    "{topClub1} e {topClub2} continuam a liderar a dinâmica competitiva.",
    "A dupla {topClub1}–{topClub2} concentra grande parte da atenção competitiva da prova.",
  ],
};

/* ---------------- Country profile (ecosystem) ---------------- */

export const OPENING_ECOSYSTEM_TALENT_ENGINE: TemplateBlock = {
  variants: [
    "O {name} continua a destacar-se como uma das maiores fontes de talento, com crescimento sustentado ao longo das últimas gerações.",
    "A produção de talento do {name} confirma o país como referência do futebol mundial.",
    "O ecossistema do {name} sustenta uma linha ininterrupta de jogadores de topo há várias gerações.",
  ],
};

export const OPENING_ECOSYSTEM_EMERGING: TemplateBlock = {
  variants: [
    "O {name} começa a produzir uma nova geração de jogadores capazes de disputar patamares superiores.",
    "As últimas épocas mostram um {name} em ascensão, com crescimento visível na qualidade média.",
  ],
};

export const OPENING_ECOSYSTEM_STABLE: TemplateBlock = {
  variants: [
    "O {name} mantém a sua tradição competitiva, sem alterações estruturais recentes.",
    "O panorama do futebol do {name} conserva a identidade construída ao longo dos anos.",
  ],
};

/* ---------------- Coach profile (career) ---------------- */

export const OPENING_COACH_TRANSFORMER: TemplateBlock = {
  variants: [
    "Após transformar vários projetos competitivos, {name} consolidou-se como um dos treinadores mais influentes da sua geração.",
    "Os ciclos liderados por {name} deixaram marca em cada um dos clubes que orientou.",
    "A carreira de {name} é indissociável dos projetos que ajudou a construir de raiz.",
  ],
};

export const OPENING_COACH_ESTABLISHED: TemplateBlock = {
  variants: [
    "{name} afirma-se pela consistência ao longo de vários ciclos e clubes.",
    "A carreira de {name} desenha-se numa sucessão de projetos sólidos, cada um deles com uma identidade competitiva clara.",
  ],
};

export const OPENING_COACH_EMERGING: TemplateBlock = {
  variants: [
    "{name} constrói agora as bases de uma carreira que promete afirmar-se nos próximos ciclos.",
    "Os primeiros projetos liderados por {name} confirmam o potencial para maiores desafios.",
  ],
};

/* ---------------- Hall of Fame (legacy) ---------------- */

export const OPENING_LEGACY_DOMINANCE: TemplateBlock = {
  variants: [
    "O legado de {name} assenta num domínio raro dentro da sua categoria.",
    "Poucos conseguiram, na história recente, o nível de domínio construído por {name}.",
    "A carreira de {name} deixa uma marca de excelência dificilmente replicável.",
  ],
};

export const OPENING_LEGACY_LONGEVITY: TemplateBlock = {
  variants: [
    "A longevidade de {name} — {longevity} épocas ao mais alto nível — é, por si só, um feito histórico.",
    "Manter-se durante {longevity} épocas entre os melhores confirma o estatuto de {name} como referência intemporal.",
  ],
};

/* ---------------- Career Center (season magazine) ---------------- */

export const OPENING_SEASON_MAGAZINE: TemplateBlock = {
  variants: [
    "A época de {season} fica marcada por momentos que ajudam a definir o rumo da carreira.",
    "Uma temporada de contornos únicos, com histórias que merecem ser preservadas.",
    "A época de {season} deixa memórias que se somam ao capítulo mais recente da carreira.",
  ],
};

export const SEASON_HIGHLIGHT_TROPHIES: TemplateBlock = {
  variants: [
    "Os troféus conquistados marcam de forma indelével o balanço da época.",
    "As conquistas alcançadas devolvem à época um peso simbólico particular.",
  ],
};

export const SEASON_HIGHLIGHT_HEADLINE: TemplateBlock = {
  variants: ["{headline}"],
};

/* ---------------- Helpers ---------------- */

export function fill(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template
    .replace(/\{(\w+)\}/g, (_, key) => {
      const v = vars[key];
      if (v == null || v === "") return "";
      return String(v);
    })
    .replace(/\s+/g, " ")
    .trim();
}
