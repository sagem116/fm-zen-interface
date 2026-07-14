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
    "É difícil ler o atual momento de {name} sem o colocar entre a elite: o desempenho recente não é um episódio, é a extensão natural da forma como o resto da temporada foi conduzido.",
    "Há épocas que se afirmam pela regularidade e outras pela intensidade. A de {name} conseguiu as duas coisas — e o ranking limita-se a traduzir o que já era evidente ao longo da temporada.",
    "{name} está num daqueles ciclos raros em que tudo se alinha: contexto, forma e decisões técnicas caminham na mesma direção, e o desempenho reflete-o de forma inequívoca.",
  ],
};

export const OPENING_STABLE: TemplateBlock = {
  variants: [
    "A leitura mais interessante de {name} nesta época não está numa métrica isolada — está na ausência de quebras. É essa constância que mantém o estatuto competitivo.",
    "{name} reforça a ideia de que estabilidade, em alta densidade competitiva, é uma forma silenciosa de excelência: sem exageros, mas sem cedências.",
    "Época sem ruído para {name}, no melhor sentido possível: continua a produzir dentro da faixa de rendimento onde os melhores costumam permanecer.",
  ],
};

export const OPENING_DECLINE: TemplateBlock = {
  variants: [
    "É legítimo dizer que {name} perde alguma tração nesta época — mas seria injusto ler o momento fora do contexto: a concorrência subiu antes de o seu registo baixar.",
    "A época obriga a moderar o tom em torno de {name}. Não deixou de ser competitivo, mas o teto do próprio ranking subiu mais depressa do que o seu.",
    "O ciclo atual de {name} exige leitura mais fina: o patamar continua acima da média, mas a distância para o topo cresceu por comparação, não por queda absoluta.",
  ],
};

export const POSITIONING: TemplateBlock = {
  variants: [
    "Neste universo de {total} avaliações, o {rank}.º lugar coloca-o dentro do percentil {percentile} — sinal de que a leitura competitiva se faz já num plano mais restrito do que o comum.",
    "Um {rank}.º lugar entre {total} avaliações não é apenas uma posição numérica: representa o percentil {percentile}, aquele patamar em que qualquer variação passa a exigir contexto para ser interpretada.",
    "A posição atual — {rank}.º entre {total} — situa-o no percentil {percentile}, uma zona onde as diferenças entre entidades deixam de ser explicadas por acaso.",
  ],
};

export const DRIVERS: TemplateBlock = {
  variants: [
    "A leitura do desempenho não passa por um único traço: é a combinação entre {topDriver1} e {topDriver2} que sustenta o patamar atual e explica por que razão a avaliação se distancia da média.",
    "Mais do que qualquer indicador isolado, o peso de {topDriver1} associado a {topDriver2} desenha um perfil coerente, com pontos de apoio bem definidos.",
    "Onde muitos dependem de um só ponto forte, aqui a solidez nasce do cruzamento entre {topDriver1} e {topDriver2}, o que dá previsibilidade ao rendimento.",
    "{topDriver1} é o traço mais evidente, mas seria injusto ignorar como {topDriver2} funciona como segundo eixo — sem ele, o retrato ficaria incompleto.",
  ],
};

export const EVOLUTION_UP: TemplateBlock = {
  variants: [
    "A distância percorrida face a {prevSeason} não se explica por um único acontecimento: foi a acumulação de pequenos ganhos que empurrou a leitura para outro patamar.",
    "A subida face à época passada não é acidental — é o tipo de progressão que só acontece quando o desempenho passa a ser lido de forma diferente pelos adversários e pelo próprio contexto competitivo.",
    "Quando uma temporada devolve este tipo de salto, quase nunca é por sorte. A evolução face a {prevSeason} sugere uma reorganização real do rendimento, não um pico isolado.",
  ],
};

export const EVOLUTION_DOWN: TemplateBlock = {
  variants: [
    "O recuo face a {prevSeason} tem menos a ver com uma quebra do que com o ritmo dos outros: o ranking subiu de nível, e isso pesa mesmo em quem mantém padrão.",
    "A leitura da queda exige contexto: {name} não deixou de produzir — a comparação é que se tornou mais dura, num ranking que continua a apertar critérios.",
    "Uma quebra na posição raramente conta a história completa. Aqui, o patamar continua respeitável; o que mudou foi o teto competitivo em redor.",
  ],
};

export const EVOLUTION_FLAT: TemplateBlock = {
  variants: [
    "A ausência de movimento face à época passada é, por si só, uma leitura: mantém-se estável num universo que raramente se estabiliza.",
    "Em rankings desta natureza, repetir posição costuma ser mais difícil do que subir. A época devolve exatamente esse tipo de continuidade.",
    "O registo mantém-se dentro da mesma faixa da época anterior, o que num contexto competitivo tão volátil funciona quase como um sinal de solidez.",
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
    "Fechar a época com este patamar é a parte mais fácil de descrever — o difícil é sustentar, ano após ano, o padrão que agora se lê com naturalidade.",
    "Um exercício que reforça o lugar de {name} entre a elite não pela pontuação isolada, mas pela repetição do sinal.",
    "Em síntese: o rendimento não é surpresa e é essa ausência de surpresa que hoje já é o argumento mais forte.",
  ],
};

export const CLOSING_NEUTRAL: TemplateBlock = {
  variants: [
    "Ficará para a próxima época a resposta à pergunta que este exercício deixa aberta: consolidação ou pico?",
    "O retrato atual permite duas leituras — otimista ou cautelosa — e a próxima temporada é que vai decidir qual delas prevalece.",
    "É um momento intermédio, do género que só ganha significado com o passar do tempo. Convém ler com paciência.",
  ],
};

/* ---------------- Player profile (biographical) ---------------- */

export const OPENING_BIOGRAPHICAL_ASCENDING: TemplateBlock = {
  variants: [
    "A carreira de {name} deixou de se ler como promessa: as últimas épocas encadeiam-se numa progressão que já não é acidental, mas o resultado de um crescimento sustentado.",
    "Não é uma explosão pontual — é a soma de várias épocas em que o patamar competitivo foi sendo empurrado ligeiramente para cima. {name} atravessa hoje a fase em que a trajetória se torna estatuto.",
    "Ao longo de {seasons} épocas seguidas, o registo de {name} conta uma história linear: menos oscilações, mais consolidação e, sobretudo, um teto que continua a subir.",
  ],
};

export const OPENING_BIOGRAPHICAL_PEAK: TemplateBlock = {
  variants: [
    "Chegou a fase em que a carreira se lê no presente. {name} está no auge — não pelo brilho de uma época isolada, mas pela densidade competitiva acumulada em {seasons} temporadas.",
    "Poucos atletas conseguem transformar longevidade em pico ao mesmo tempo. É esse o retrato de {name}: um jogador no seu melhor momento, com histórico suficiente para sustentar a leitura.",
    "A curva de rendimento estabilizou no ponto mais alto. Aquilo que antes eram lampejos passou a ser padrão, e a carreira de {name} vive agora a fase em que a exigência dos outros é maior do que a sua própria.",
  ],
};

export const OPENING_BIOGRAPHICAL_VETERAN: TemplateBlock = {
  variants: [
    "Aos {seasons}.º ano de carreira ao alto nível, {name} já não precisa de provar nada — e é aí que o seu contributo se torna mais interessante de ler, porque assenta em decisões e não em impulsos.",
    "A longevidade de {name} é, por si só, a parte mais difícil de replicar. Manter competitividade tanto tempo obriga a uma reinvenção que raramente se lê nos números brutos.",
    "Já ninguém fala de {name} pela idade — fala-se pela forma como continua a resistir num ecossistema cada vez mais jovem e exigente.",
  ],
};

export const OPENING_BIOGRAPHICAL_EMERGING: TemplateBlock = {
  variants: [
    "É prematuro fechar um retrato definitivo de {name}, mas os primeiros sinais já não se explicam por acaso: há regularidade suficiente para justificar atenção.",
    "As primeiras épocas de {name} não são só uma promessa — mostram base competitiva já reconhecível, o que raramente acontece tão cedo.",
    "Ainda no arranque da carreira, o registo de {name} contém indicadores incompatíveis com uma simples curiosidade. O caminho, embora curto, é sólido.",
  ],
};

export const TRAJECTORY_ASCENT: TemplateBlock = {
  variants: [
    "A época de {peakSeason} funcionou como ponto de viragem: o rendimento subiu para {peakScore} e, sobretudo, deixou de ser um pico isolado para se transformar em referência interna da carreira.",
    "É difícil ignorar {peakSeason} quando se analisa {name}. Foi nessa temporada que o teto se moveu para {peakScore} e o corpo da carreira se reorganizou em torno dessa marca.",
    "Todas as carreiras têm um ponto onde tudo alinha. Para {name}, aconteceu em {peakSeason}, ao atingir {peakScore} — e a leitura seguinte passou a fazer-se sempre à luz desse patamar.",
  ],
};

export const TRAJECTORY_CONSOLIDATION: TemplateBlock = {
  variants: [
    "A regularidade tornou-se o traço mais valioso: {name} não depende de picos para manter o estatuto — mantém-no pela ausência de quebras.",
    "A curva de rendimento é linear há vários anos, e isso é raro. Onde outros oscilam, {name} escolhe repetir, e é essa repetição que sustenta a leitura atual.",
    "Consistência não é sinónimo de rotina. Ao longo destas épocas, {name} conseguiu manter-se dentro de uma faixa apertada de rendimento, mesmo em contextos competitivos distintos.",
  ],
};

export const TRAJECTORY_LEGACY: TemplateBlock = {
  variants: [
    "O que ficará de {name} não são as épocas isoladas — é o padrão. E poucos padrões sobrevivem tanto tempo à comparação direta.",
    "A carreira já entrou no território em que a comparação passa a ser feita entre gerações, e não entre pares. É o sinal mais claro de que a marca deixará impacto.",
    "O legado começa a ler-se antes do fim da carreira: {name} já é referência histórica dentro da sua categoria.",
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
