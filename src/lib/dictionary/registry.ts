import { ATTRIBUTES } from "../data-dictionary/attributes";
import { METRICS } from "../data-dictionary/metrics";
import { POSITIONS } from "../data-dictionary/positions";
import { STATISTICS } from "../data-dictionary/statistics";
import { buildDictionaryIndexes, type DictionaryIndexes } from "./indexes";
import { normalizeDictionaryToken } from "./resolver";
import type {
  DictionaryCategory,
  DictionaryDataType,
  DictionaryDomain,
  DictionaryEntry,
  DictionaryEntryDraft,
  DictionaryEntity,
  DictionaryImportGroup,
} from "./types";

const CUSTOM_KEY = "fm-dictionary-custom-v2";

let customEntriesCache: DictionaryEntry[] | null = null;
let importedEntries: DictionaryEntry[] = [];
let mutationVersion = 0;
let memoizedVersion = -1;
let memoizedEntries: DictionaryEntry[] = [];
let memoizedIndexes: DictionaryIndexes = buildDictionaryIndexes([]);

function safeWindow(): Window | null {
  return typeof window !== "undefined" ? window : null;
}

function normalizeSlug(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim();
}

function dedupeAliases(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const clean = String(value ?? "").trim();
    if (!clean) continue;
    const key = normalizeDictionaryToken(clean);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(clean);
  }
  return output;
}

function inferDataTypeFromKey(key: string): DictionaryDataType {
  const lower = key.toLowerCase();
  if (lower.includes("date") || lower.includes("season")) return "date";
  if (lower.includes("is_") || lower.startsWith("has_")) return "boolean";
  return "number";
}

function inferImportGroup(
  entity: DictionaryEntity,
  category: DictionaryCategory,
  domain: DictionaryDomain,
): DictionaryImportGroup {
  if (entity === "player") {
    return domain === "statistics" ? "player_statistics" : "player_profile";
  }
  if (entity === "club") {
    return category === "rating" ? "club_classification" : "club_information";
  }
  if (entity === "coach") return "coach_information";
  return "competition_information";
}

function convertLegacyIdToNewId(legacyId: string): string {
  if (/^(player|club|coach|competition)\./.test(legacyId)) return legacyId;

  const [prefix, rest] = legacyId.split(".", 2);
  if (!rest) return `player.derived.${normalizeSlug(legacyId) || "field"}`;

  if (prefix === "attribute") return `player.attribute.${rest}`;
  if (prefix === "metric") return `player.metric.${rest}`;
  if (prefix === "statistic") return `player.metric.stat_${rest}`;
  if (prefix === "position") return `player.context.position_${rest}`;
  if (prefix === "identifier") return `player.identifier.${rest}`;
  if (prefix === "profile") return `player.profile.${rest}`;
  if (prefix === "context") return `player.context.${rest}`;
  if (prefix === "rating") return `player.rating.${rest}`;

  return `player.derived.${normalizeSlug(legacyId) || "field"}`;
}

function extractKeyFromId(id: string): string {
  const chunks = id.split(".");
  return chunks[chunks.length - 1] || id;
}

function fromLegacyCatalog(args: {
  id: string;
  name: string;
  abbreviation?: string;
  aliases: string[];
  entity: DictionaryEntity;
  domain: DictionaryDomain;
  category: DictionaryCategory;
  dataType?: DictionaryDataType;
  unit?: string;
  description?: string;
  source?: string;
  deprecated?: boolean;
}): DictionaryEntry {
  const newId = convertLegacyIdToNewId(args.id);
  const key = extractKeyFromId(newId);
  const dataType = args.dataType ?? inferDataTypeFromKey(key);
  const importGroup = inferImportGroup(args.entity, args.category, args.domain);

  return {
    id: newId,
    key,
    name: args.name,
    abbreviation: args.abbreviation,
    aliases: dedupeAliases([args.id, ...args.aliases]),
    entity: args.entity,
    domain: args.domain,
    category: args.category,
    importGroup,
    dataType,
    unit: args.unit,
    description: args.description,
    source: args.source ?? "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: Boolean(args.deprecated),
  };
}

const CORE_LEGACY_ENTRIES = [
  {
    id: "identifier.idu",
    name: "IDU",
    abbreviation: "IDU",
    aliases: ["IDU", "UID", "ID"],
    category: "identifier" as const,
  },
  {
    id: "identifier.player_name",
    name: "Nome",
    abbreviation: "Nome",
    aliases: ["Nome", "Name", "Jogador", "Player"],
    category: "identifier" as const,
  },
  {
    id: "identifier.uid_fm",
    name: "UID FM",
    abbreviation: "UID FM",
    aliases: ["UID FM", "FM UID", "FM_ID"],
    category: "identifier" as const,
  },
  {
    id: "identifier.uid_db",
    name: "UID DB",
    abbreviation: "UID DB",
    aliases: ["UID DB", "DB UID", "DB_ID"],
    category: "identifier" as const,
  },
  {
    id: "context.country",
    name: "Pais",
    abbreviation: "Pais",
    aliases: ["País", "Pais", "Country", "Nac", "Nacionalidade"],
    category: "context" as const,
  },
  {
    id: "profile.age",
    name: "Idade",
    abbreviation: "Idade",
    aliases: ["Idade", "Age"],
    category: "profile_field" as const,
  },
  {
    id: "profile.nationality",
    name: "Nacionalidade",
    abbreviation: "Nac",
    aliases: ["Nac", "Nacionalidade", "Nationality"],
    category: "profile_field" as const,
  },
  {
    id: "profile.value",
    name: "Valor",
    abbreviation: "VP",
    aliases: ["VP", "Valor", "Valor de Mercado", "Market Value", "Value"],
    category: "profile_field" as const,
  },
  {
    id: "profile.salary",
    name: "Salario",
    abbreviation: "Sal",
    aliases: ["Salario", "Salary", "Wage"],
    category: "profile_field" as const,
  },
  {
    id: "profile.personality",
    name: "Personalidade",
    abbreviation: "Pers",
    aliases: ["Personalidade", "Personality"],
    category: "profile_field" as const,
  },
  {
    id: "profile.preferred_foot",
    name: "Pe Preferido",
    abbreviation: "Pe",
    aliases: ["Pe", "Pe Preferido", "Preferred Foot", "Foot"],
    category: "profile_field" as const,
  },
  {
    id: "profile.height",
    name: "Altura",
    abbreviation: "Alt",
    aliases: ["Altura", "Height"],
    category: "profile_field" as const,
  },
  {
    id: "profile.weight",
    name: "Peso",
    abbreviation: "Peso",
    aliases: ["Peso", "Weight"],
    category: "profile_field" as const,
  },
  {
    id: "profile.reputation",
    name: "Reputacao",
    abbreviation: "Rep",
    aliases: ["Reputacao", "Reputation"],
    category: "profile_field" as const,
  },
  {
    id: "context.club",
    name: "Clube",
    abbreviation: "Clube",
    aliases: ["Clube", "Club", "Equipa", "Team"],
    category: "context" as const,
  },
  {
    id: "context.competition",
    name: "Competicao",
    abbreviation: "Comp",
    aliases: [
      "Competicao",
      "Competition",
      "Liga",
      "League",
      "Divisao",
      "Divisão",
      "Division",
      "Tier",
      "Nivel",
      "Nível",
    ],
    category: "context" as const,
  },
  {
    id: "context.season",
    name: "Epoca",
    abbreviation: "Epoca",
    aliases: ["Epoca", "Season", "Ano"],
    category: "context" as const,
  },
  {
    id: "context.continent",
    name: "Continente",
    abbreviation: "Cont",
    aliases: ["Continente", "Continent"],
    category: "context" as const,
  },
  {
    id: "context.primary_position",
    name: "Posicao Principal",
    abbreviation: "Pos",
    aliases: ["Posicao", "Position", "Posicao Principal", "Primary Position", "Pos"],
    category: "context" as const,
  },
  {
    id: "context.secondary_positions",
    name: "Posicoes Secundarias",
    abbreviation: "Pos Sec",
    aliases: ["Posicoes Secundarias", "Secondary Positions", "Pos Sec"],
    category: "context" as const,
  },
  {
    id: "rating.ca",
    name: "C.A.",
    abbreviation: "CA",
    aliases: ["CA", "C.A.", "Current Ability", "Capacidade Atual"],
    category: "rating" as const,
  },
  {
    id: "rating.cp",
    name: "C.P.",
    abbreviation: "CP",
    aliases: ["CP", "C.P.", "PA", "P.A.", "Potential Ability", "Capacidade Potencial"],
    category: "rating" as const,
  },
  {
    id: "rating.ra",
    name: "R.A.",
    abbreviation: "RA",
    aliases: ["RA", "R.A.", "Rating Average", "Reputação Atual", "Reputacao Atual"],
    category: "rating" as const,
  },
  {
    id: "rating.rm",
    name: "RM",
    abbreviation: "RM",
    aliases: [
      "RM",
      "Rating Medio",
      "Classificação Média",
      "Classificacao Media",
      "Average Rating",
      "Reputação Mundial",
      "Reputacao Mundial",
    ],
    category: "rating" as const,
  },
  {
    id: "rating.rc",
    name: "RC",
    abbreviation: "RC",
    aliases: ["RC", "Rating Clube", "Rating Club", "Reputação Continental", "Reputacao Continental"],
    category: "rating" as const,
  },
] as const;

const EXTRA_ALIASES_BY_LEGACY_ID: Record<string, string[]> = {
  "attribute.acceleration": ["ACL", "Acl"],
  "attribute.agility": ["Agi"],
  "attribute.aggression": ["Agr"],
  "attribute.anticipation": ["Ant"],
  "attribute.natural_fitness": ["AF", "Aptidão Física", "Aptidao Fisica", "Cnc", "Condição Natural", "Condicao Natural"],
  "attribute.bravery": ["Bra", "Bravura"],
  "attribute.heading": ["Cab", "Cabeceamento"],
  "attribute.concentration": ["Cnt", "Concentração", "Concentracao"],
  "attribute.composure": ["Cmp", "Compostura"],
  "attribute.crossing": ["Cruz", "Cruzamentos"],
  "attribute.decisions": ["Decis", "Decision", "Decisões", "Decisoes"],
  "attribute.tackling": ["Des", "Desarme"],
  "attribute.determination": ["Det", "Determinação", "Determinacao"],
  "attribute.balance": ["Eql", "Equilíbrio", "Equilibrio"],
  "attribute.finishing": ["Fnl", "Finalização", "Finalizacao"],
  "attribute.first_touch": ["Fnt", "Primeiro Toque"],
  "attribute.strength": ["For", "Força", "Forca"],
  "attribute.jumping_reach": ["Imp", "Impulsão", "Impulsao"],
  "attribute.flair": ["Imp2", "Imprevisibilidade"],
  "attribute.off_the_ball": ["In Tr", "SB", "Sem Bola"],
  "attribute.throwing": ["Lan", "Lançamentos", "Lancamentos"],
  "attribute.long_throws": ["LnçL", "Lançamentos Longos", "Lancamentos Longos"],
  "attribute.leadership": ["Lid", "Liderança", "Lideranca"],
  "attribute.free_kick": ["Liv", "Livre Diretos", "Livres Diretos"],
  "attribute.marking": ["Mar", "Marcação", "Marcacao"],
  "attribute.penalty_taking": ["Pen", "Penáltis", "Penaltis"],
  "attribute.passing": ["Pas", "Passe", "Passing"],
  "attribute.kicking": ["Pont", "Pontapé de Baliza", "Pontape de Baliza"],
  "attribute.positioning": ["Pos", "Posicionamento"],
  "attribute.reflexes": ["Ref", "Reflexos"],
  "attribute.long_shots": ["Rem Lo", "Remates de Longe"],
  "attribute.stamina": ["Res", "Resistência", "Resistencia"],
  "attribute.technique": ["Téc", "Tec", "Técnica", "Tecnica"],
  "attribute.teamwork": ["Tr Eq", "Trabalho de Equipa"],
  "attribute.work_rate": ["In Tr Índice de Trabalho", "Indice de Trabalho"],
  "attribute.one_on_ones": ["1x1", "Um para Um"],
  "attribute.pace": ["Vel", "Velocidade"],
  "attribute.vision": ["Vis", "Visão", "Visao"],
  "attribute.eccentricity": ["Exc", "Excentricidade"],
  "attribute.communication": ["Com", "Comunicação", "Comunicacao"],
  "attribute.command_of_area": ["Cmd", "Comando da Área", "Comando da Area"],
  "attribute.aerial_reach": ["Aer", "Alcance Aéreo", "Alcance Aereo"],
  "attribute.rushing_out": ["TSB", "Tendência para Sair dos Postes", "Tendencia para Sair dos Postes"],
  "attribute.handling": ["Soc", "Socos", "Jg Mãos", "Jg Maos", "Jogo de Mãos", "Jogo de Maos"],
};

const FM24_EXTRA_ATTRIBUTE_ROWS: Array<{ abbreviation: string; name: string }> = [
  { abbreviation: "Ada", name: "Adaptabilidade" },
  { abbreviation: "Amb", name: "Ambição" },
  { abbreviation: "Cons", name: "Consistência" },
  { abbreviation: "Cont", name: "Controvérsia" },
  { abbreviation: "Desp", name: "Desportivismo" },
  { abbreviation: "Newgen", name: "Importância dos Jogos (Hidden Newgen Flag)" },
  { abbreviation: "Mald", name: "Maldade" },
  { abbreviation: "J Imp", name: "Jogos Importantes" },
  { abbreviation: "Lea", name: "Lealdade" },
  { abbreviation: "Pres", name: "Pressão" },
  { abbreviation: "Prof", name: "Profissionalismo" },
  { abbreviation: "Pri", name: "Propensão para Lesões" },
  { abbreviation: "Prob Les", name: "Propensão para Lesões" },
  { abbreviation: "Temp", name: "Temperamento" },
  { abbreviation: "Vers", name: "Versatilidade" },
];

const FM24_EXTRA_ATTRIBUTE_ENTRIES: DictionaryEntry[] = FM24_EXTRA_ATTRIBUTE_ROWS.map((row) => {
  const slug = normalizeSlug(row.abbreviation || row.name) || "hidden";
  return {
    id: `player.attribute.hidden_${slug}`,
    key: `hidden_${slug}`,
    name: row.name,
    abbreviation: row.abbreviation,
    aliases: dedupeAliases([row.abbreviation, row.name]),
    entity: "player",
    domain: "profile",
    category: "attribute",
    importGroup: "player_profile",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  };
});

const FM24_METRIC_ROWS: Array<{ abbreviation: string; name: string }> = [
  { abbreviation: "Ast", name: "Assistências" },
  { abbreviation: "xA", name: "Assistências Esperadas (Expected Assists)" },
  { abbreviation: "xA/90", name: "Assistências Esperadas por 90 minutos" },
  { abbreviation: "Ast Sel", name: "Assistências para Seleção Nacional" },
  { abbreviation: "Amr", name: "Cartões Amarelos" },
  { abbreviation: "Vermelhos", name: "Cartões Vermelhos" },
  { abbreviation: "Cl Med", name: "Classificação Média" },
  { abbreviation: "Class Med Int", name: "Classificação Média Internacional" },
  { abbreviation: "Fls", name: "Faltas Sofridas" },
  { abbreviation: "xG/90", name: "Golos Esperados por 90 minutos" },
  { abbreviation: "xG AcE", name: "xG Acumulado em Excesso (Overperformance de xG)" },
  { abbreviation: "xG SP", name: "xG sem Penáltis (Non-Penalty xG)" },
  { abbreviation: "xG SP/90", name: "xG sem Penáltis por 90 minutos" },
  { abbreviation: "Gls/90", name: "Golos por 90 minutos" },
  { abbreviation: "HdJ", name: "Homem do Jogo" },
  { abbreviation: "Jogos Int", name: "Jogos Internacionais" },
  { abbreviation: "Mins", name: "Minutos Jogados" },
  { abbreviation: "Mins/Gl", name: "Minutos por Golo" },
  { abbreviation: "Mins/Gm", name: "Minutos por Jogo" },
  { abbreviation: "Pens", name: "Penáltis Marcados" },
  { abbreviation: "Pen. Defendidos", name: "Penáltis Defendidos" },
  { abbreviation: "Pen. Enfrentados", name: "Penáltis Enfrentados" },
  { abbreviation: "Pens M", name: "Penáltis Falhados" },
  { abbreviation: "Pts/Gm", name: "Pontos por Jogo" },
  { abbreviation: "Jogos", name: "Jogos Disputados" },
  { abbreviation: "Pen/R", name: "Penáltis por Remate" },
  { abbreviation: "% de Pen. Def.", name: "Percentagem de Penáltis Defendidos" },
  { abbreviation: "Jvit", name: "Jogos sem Derrota" },
  { abbreviation: "Sem golos sofridos", name: "Clean Sheets" },
  { abbreviation: "FL/90", name: "Faltas por 90 minutos" },
  { abbreviation: "Defesas/90", name: "Defesas por 90 minutos" },
  { abbreviation: "xG", name: "Golos Esperados" },
  { abbreviation: "Sofr", name: "Golos Sofridos" },
  { abbreviation: "Sofr Int", name: "Golos Sofridos Internacionais" },
  { abbreviation: "GsfE", name: "Golos Sofridos face ao Esperado" },
  { abbreviation: "SofE/90", name: "Golos Sofridos Esperados por 90 minutos" },
  { abbreviation: "Sof/90", name: "Golos Sofridos por 90 minutos" },
  { abbreviation: "Gls", name: "Golos" },
  { abbreviation: "GlsE", name: "Golos Esperados Convertidos (Golos acima do xG)" },
  { abbreviation: "GlsE/90", name: "Golos Esperados Convertidos por 90 minutos" },
  { abbreviation: "% Cr T", name: "Percentagem de Cruzamentos Totais" },
  { abbreviation: "Alívios", name: "Alívios" },
  { abbreviation: "Alí/90", name: "Alívios por 90 minutos" },
  { abbreviation: "Assis/90", name: "Assistências por 90 minutos" },
  { abbreviation: "Blq", name: "Bloqueios" },
  { abbreviation: "Blq/90", name: "Bloqueios por 90 minutos" },
  { abbreviation: "Cab Dec/90", name: "Cabeceamentos Decisivos por 90 minutos" },
  { abbreviation: "Cabs", name: "Cabeceamentos" },
  { abbreviation: "Cab %", name: "Percentagem de Cabeceamentos Ganhos" },
  { abbreviation: "Cab G/90", name: "Cabeceamentos Ganhos por 90 minutos" },
  { abbreviation: "Cab P/90", name: "Cabeceamentos Perdidos por 90 minutos" },
  { abbreviation: "Cr C", name: "Cruzamentos Completados" },
  { abbreviation: "CC-JA", name: "Cruzamentos Certos por Jogo Ativo" },
  { abbreviation: "CC-JA/90", name: "Cruzamentos Certos por 90 minutos" },
  { abbreviation: "Crz Con/90", name: "Cruzamentos Concluídos por 90 minutos" },
  { abbreviation: "Ps A/90", name: "Passes Tentados por 90 minutos" },
  { abbreviation: "Conv %", name: "Percentagem de Conversão de Remates" },
  { abbreviation: "Sprints/90", name: "Sprints por 90 minutos" },
  { abbreviation: "Remt/90", name: "Remates por 90 minutos" },
  { abbreviation: "Rems.livres", name: "Remates de Livre" },
  { abbreviation: "Remates fora da área/90", name: "Remates Fora da Área por 90 minutos" },
  { abbreviation: "Rems Bloq", name: "Remates Bloqueados" },
  { abbreviation: "Rems Bloq/90", name: "Remates Bloqueados por 90 minutos" },
  { abbreviation: "Remt/902", name: "Remates à Baliza por 90 minutos" },
  { abbreviation: "Rem %", name: "Percentagem de Remates Enquadrados" },
  { abbreviation: "Remates", name: "Remates" },
  { abbreviation: "% Df", name: "Percentagem de Dribles Falhados" },
  { abbreviation: "% Remates", name: "Percentagem de Remates Enquadrados" },
  { abbreviation: "% Passe", name: "Percentagem de Passes Completados" },
  { abbreviation: "M Des", name: "Distância Média de Desarme" },
  { abbreviation: "CC-JA %", name: "Percentagem de Cruzamentos Certos" },
  { abbreviation: "Pr T/90", name: "Passes Progressivos Tentados por 90 minutos" },
  { abbreviation: "Pr C/90", name: "Passes Progressivos Completados por 90 minutos" },
  { abbreviation: "Poss Perd/90", name: "Posses Perdidas por 90 minutos" },
  { abbreviation: "Poss Con/90", name: "Posses Conquistadas por 90 minutos" },
  { abbreviation: "% Dfp", name: "Percentagem de Dribles Falhados pelo Adversário" },
  { abbreviation: "Pas A", name: "Passes Tentados" },
  { abbreviation: "Passes Pr/90", name: "Passes Progressivos por 90 minutos" },
  { abbreviation: "Passes prog.", name: "Passes Progressivos" },
  { abbreviation: "PC/90", name: "Passes Completados por 90 minutos" },
  { abbreviation: "PD-JA", name: "Passes Decisivos por Jogo Ativo" },
  { abbreviation: "PD-JC/90", name: "Passes Decisivos por 90 minutos" },
  { abbreviation: "Pass D", name: "Passes Decisivos" },
  { abbreviation: "Ps C/90", name: "Passes Completados por 90 minutos" },
  { abbreviation: "Ps C", name: "Passes Completados" },
  { abbreviation: "Op C/90", name: "Oportunidades Criadas por 90 minutos" },
  { abbreviation: "OCG", name: "Ocasiões Claras de Golo" },
  { abbreviation: "Press. tent.", name: "Pressões Tentadas" },
  { abbreviation: "Press. conc.", name: "Pressões Concluídas com Sucesso" },
  { abbreviation: "JAr T/90", name: "Jardas Percorridas por 90 minutos" },
  { abbreviation: "Cab A", name: "Cabeceamentos Aéreos" },
  { abbreviation: "Int/90", name: "Interceções por 90 minutos" },
  { abbreviation: "Crt", name: "Cortes" },
  { abbreviation: "Golos fora da área", name: "Golos Marcados Fora da Área" },
  { abbreviation: "xG/remate", name: "xG por Remate" },
  { abbreviation: "xGP/90", name: "xG Proveniente de Penáltis por 90 minutos" },
  { abbreviation: "xGD", name: "Diferença entre Golos Esperados e Golos Sofridos" },
  { abbreviation: "Fj", name: "Foras de Jogo" },
  { abbreviation: "Fnt/90", name: "Fintas por 90 minutos" },
  { abbreviation: "Fnt", name: "Fintas" },
  { abbreviation: "Gl Err", name: "Erros que Originaram Golo" },
  { abbreviation: "Dist/90", name: "Distância Percorrida por 90 minutos" },
  { abbreviation: "Distância", name: "Distância Percorrida" },
  { abbreviation: "T Desa", name: "Tentativas de Desarme" },
  { abbreviation: "Des/90", name: "Desarmes por 90 minutos" },
  { abbreviation: "Des Dec/90", name: "Desarmes Decisivos por 90 minutos" },
  { abbreviation: "Crt D", name: "Cortes Decisivos" },
  { abbreviation: "Des G", name: "Desarmes Ganhos" },
  { abbreviation: "Ds", name: "Desarmes" },
  { abbreviation: "Dfa", name: "Dribles Falhados" },
  { abbreviation: "Dft", name: "Dribles Tentados" },
  { abbreviation: "CT-JA/90", name: "Cruzamentos Tentados por 90 minutos" },
  { abbreviation: "CT-JA", name: "Cruzamentos Tentados" },
  { abbreviation: "Crz T/90", name: "Cruzamentos por 90 minutos" },
  { abbreviation: "Cr T", name: "Cruzamentos Totais" },
];

const FM24_METRIC_OVERLAY_ENTRIES: DictionaryEntry[] = FM24_METRIC_ROWS.map((row) => {
  const slug = normalizeSlug(row.abbreviation || row.name) || "metric";
  return {
    id: `player.metric.fm24_${slug}`,
    key: `fm24_${slug}`,
    name: row.name,
    abbreviation: row.abbreviation,
    aliases: dedupeAliases([row.abbreviation, row.name]),
    entity: "player",
    domain: "statistics",
    category: "metric",
    importGroup: "player_statistics",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  };
});

const BASE_ENTRIES: DictionaryEntry[] = [
  ...CORE_LEGACY_ENTRIES.map((entry) =>
    fromLegacyCatalog({
      id: entry.id,
      name: entry.name,
      abbreviation: entry.abbreviation,
      aliases: [...entry.aliases],
      entity: "player",
      domain:
        entry.category === "rating"
          ? "classification"
          : entry.category === "context"
            ? "context"
            : "profile",
      category: entry.category,
      dataType: entry.category === "rating" ? "number" : "string",
    }),
  ),
  ...ATTRIBUTES.map((attribute) =>
    fromLegacyCatalog({
      id: attribute.id,
      name: attribute.displayName,
      abbreviation: attribute.shortName,
      aliases: [
        attribute.englishName,
        attribute.shortName,
        ...attribute.aliases,
        ...(EXTRA_ALIASES_BY_LEGACY_ID[attribute.id] ?? []),
      ],
      entity: "player",
      domain: "profile",
      category: "attribute",
      dataType: "number",
      unit: attribute.unit ?? undefined,
      description: attribute.description,
      deprecated: Boolean(attribute.deprecated),
    }),
  ),
  ...METRICS.map((metric) =>
    fromLegacyCatalog({
      id: metric.id,
      name: metric.displayName,
      abbreviation: metric.shortName,
      aliases: [metric.englishName, metric.shortName, ...metric.aliases],
      entity: "player",
      domain: "statistics",
      category: "metric",
      dataType: "number",
      unit: metric.unit ?? undefined,
      description: metric.description,
      deprecated: Boolean(metric.deprecated),
    }),
  ),
  ...STATISTICS.map((statistic) =>
    fromLegacyCatalog({
      id: statistic.id,
      name: statistic.displayName,
      abbreviation: statistic.shortName,
      aliases: [statistic.englishName, statistic.shortName, ...statistic.aliases],
      entity: "player",
      domain: "statistics",
      category: "metric",
      dataType: "number",
      unit: statistic.unit ?? undefined,
      description: statistic.description,
      deprecated: Boolean(statistic.deprecated),
    }),
  ),
  ...POSITIONS.map((position) =>
    fromLegacyCatalog({
      id: position.id,
      name: position.displayName,
      abbreviation: position.shortName,
      aliases: [position.englishName, position.shortName, ...position.aliases],
      entity: "player",
      domain: "context",
      category: "context",
      dataType: "string",
      description: position.description,
      deprecated: Boolean(position.deprecated),
    }),
  ),
  ...FM24_EXTRA_ATTRIBUTE_ENTRIES,
  ...FM24_METRIC_OVERLAY_ENTRIES,
  {
    id: "club.identifier.name",
    key: "name",
    name: "Club Name",
    abbreviation: "Club",
    aliases: ["club", "club name", "team", "equipa"],
    entity: "club",
    domain: "profile",
    category: "identifier",
    importGroup: "club_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "club.profile.country",
    key: "country",
    name: "Club Country",
    abbreviation: "Country",
    aliases: ["country", "pais", "país"],
    entity: "club",
    domain: "profile",
    category: "profile_field",
    importGroup: "club_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "club.profile.continent",
    key: "continent",
    name: "Club Continent",
    abbreviation: "Cont",
    aliases: ["continent"],
    entity: "club",
    domain: "profile",
    category: "profile_field",
    importGroup: "club_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "club.profile.reputation",
    key: "reputation",
    name: "Club Reputation",
    abbreviation: "REP",
    aliases: ["reputation", "reputacao", "reputação", "rep"],
    entity: "club",
    domain: "classification",
    category: "rating",
    importGroup: "club_classification",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "club.profile.avg_attendance",
    key: "avg_attendance",
    name: "Average Attendance",
    abbreviation: "Attend",
    aliases: ["avg attendance", "attendance", "assistencia media", "assistência média"],
    entity: "club",
    domain: "profile",
    category: "metric",
    importGroup: "club_classification",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "club.profile.season_ticket_holders",
    key: "season_ticket_holders",
    name: "Season Ticket Holders",
    abbreviation: "STH",
    aliases: [
      "season ticket holders",
      "detentores de bilhetes de época",
      "detentores de bilhetes de epoca",
    ],
    entity: "club",
    domain: "profile",
    category: "metric",
    importGroup: "club_classification",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.identifier.name",
    key: "name",
    name: "Competition Name",
    abbreviation: "Comp",
    aliases: ["competition", "competition name", "comp", "liga", "competicao"],
    entity: "competition",
    domain: "profile",
    category: "identifier",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.profile.country",
    key: "country",
    name: "Competition Country",
    abbreviation: "Country",
    aliases: ["country", "pais", "país"],
    entity: "competition",
    domain: "profile",
    category: "profile_field",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.profile.reputation",
    key: "reputation",
    name: "Competition Reputation",
    abbreviation: "REP",
    aliases: ["reputation", "reputacao", "reputação", "rep"],
    entity: "competition",
    domain: "classification",
    category: "rating",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.identifier.idu",
    key: "idu",
    name: "Coach IDU",
    abbreviation: "IDU",
    aliases: ["idu", "uid", "id"],
    entity: "coach",
    domain: "profile",
    category: "identifier",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.name",
    key: "name",
    name: "Coach Name",
    abbreviation: "Name",
    aliases: ["nome", "name"],
    entity: "coach",
    domain: "profile",
    category: "identifier",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.nationality",
    key: "nationality",
    name: "Coach Nationality",
    abbreviation: "Nac",
    aliases: ["nac", "nationalidade", "nationality"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.age",
    key: "age",
    name: "Coach Age",
    abbreviation: "Age",
    aliases: ["idade", "age"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.club",
    key: "club",
    name: "Coach Club",
    abbreviation: "Club",
    aliases: ["clube", "club", "equipa", "team"],
    entity: "coach",
    domain: "profile",
    category: "context",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.country",
    key: "country",
    name: "Coach Country",
    abbreviation: "Country",
    aliases: ["pais", "país", "country"],
    entity: "coach",
    domain: "profile",
    category: "context",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.club_role",
    key: "club_role",
    name: "Coach Club Role",
    abbreviation: "Club Role",
    aliases: ["função no clube", "funcao no clube", "club role"],
    entity: "coach",
    domain: "contract",
    category: "context",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.intl_role",
    key: "intl_role",
    name: "Coach International Role",
    abbreviation: "Intl Role",
    aliases: ["função internacional", "funcao internacional", "international role"],
    entity: "coach",
    domain: "contract",
    category: "context",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.contract.salary",
    key: "salary",
    name: "Coach Salary",
    abbreviation: "Salary",
    aliases: ["salario", "salário", "salary", "wage"],
    entity: "coach",
    domain: "contract",
    category: "metric",
    importGroup: "coach_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.contract.intl_salary",
    key: "intl_salary",
    name: "Coach International Salary",
    abbreviation: "Intl Salary",
    aliases: ["orden. intern.", "orden intern", "ordenado internacional", "international salary"],
    entity: "coach",
    domain: "contract",
    category: "metric",
    importGroup: "coach_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.tactical_style",
    key: "tactical_style",
    name: "Coach Tactical Style",
    abbreviation: "Tactical",
    aliases: ["estilo tactico", "estilo táctico", "tactical style"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.play_style",
    key: "play_style",
    name: "Coach Play Style",
    abbreviation: "Play",
    aliases: ["estilo de jogo", "play style"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.attacking_formation",
    key: "attacking_formation",
    name: "Coach Attacking Formation",
    abbreviation: "Atk Form",
    aliases: ["formação atacante preferida", "formacao atacante preferida", "attacking formation"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.defensive_formation",
    key: "defensive_formation",
    name: "Coach Defensive Formation",
    abbreviation: "Def Form",
    aliases: [
      "formação defensiva preferida",
      "formacao defensiva preferida",
      "defensive formation",
    ],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.preferred_formation",
    key: "preferred_formation",
    name: "Coach Preferred Formation",
    abbreviation: "Pref Form",
    aliases: ["formação preferida", "formacao preferida", "preferred formation"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.secondary_formation",
    key: "secondary_formation",
    name: "Coach Secondary Formation",
    abbreviation: "Sec Form",
    aliases: ["segunda formação preferida", "segunda formacao preferida", "secondary formation"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.mentality",
    key: "mentality",
    name: "Coach Mentality",
    abbreviation: "Mentality",
    aliases: ["mentalidade de jogo", "mentalidade", "mentality"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.marking_type",
    key: "marking_type",
    name: "Coach Marking Type",
    abbreviation: "Marking",
    aliases: ["tipo de marcação", "tipo de marcacao", "marking type"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.pressing_type",
    key: "pressing_type",
    name: "Coach Pressing Type",
    abbreviation: "Pressing",
    aliases: ["tipo de pressão", "tipo de pressao", "pressing type"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.training_type",
    key: "training_type",
    name: "Coach Training Type",
    abbreviation: "Training",
    aliases: ["tipo de treino", "training type"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.personality",
    key: "personality",
    name: "Coach Personality",
    abbreviation: "Pers",
    aliases: ["personalidade", "personality"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.profile.press_relationship",
    key: "press_relationship",
    name: "Coach Press Relationship",
    abbreviation: "Press",
    aliases: ["relação com imprensa", "relacao com imprensa", "press relationship"],
    entity: "coach",
    domain: "profile",
    category: "profile_field",
    importGroup: "coach_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.rating.rm",
    key: "rm",
    name: "Coach RM",
    abbreviation: "RM",
    aliases: ["rm", "r.m."],
    entity: "coach",
    domain: "classification",
    category: "rating",
    importGroup: "coach_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.rating.rc",
    key: "rc",
    name: "Coach RC",
    abbreviation: "RC",
    aliases: ["rc", "r.c."],
    entity: "coach",
    domain: "classification",
    category: "rating",
    importGroup: "coach_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.rating.ca",
    key: "ca",
    name: "Coach CA",
    abbreviation: "CA",
    aliases: ["ca", "c.a."],
    entity: "coach",
    domain: "classification",
    category: "rating",
    importGroup: "coach_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "coach.rating.cp",
    key: "cp",
    name: "Coach CP",
    abbreviation: "CP",
    aliases: ["cp", "c.p."],
    entity: "coach",
    domain: "classification",
    category: "rating",
    importGroup: "coach_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.position",
    key: "position",
    name: "Competition Position",
    abbreviation: "Pos",
    aliases: ["pos", "posição", "posicao", "position"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.info",
    key: "info",
    name: "Competition Info",
    abbreviation: "Info",
    aliases: ["inf", "info"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.club",
    key: "club",
    name: "Competition Club",
    abbreviation: "Club",
    aliases: ["clube", "club", "equipa", "team"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.played",
    key: "played",
    name: "Competition Played",
    abbreviation: "Pld",
    aliases: ["j", "jogos", "played", "matches"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.wins",
    key: "wins",
    name: "Competition Wins",
    abbreviation: "W",
    aliases: ["v", "vitoria", "vitória", "wins"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.vp",
    key: "vp",
    name: "Competition VP",
    abbreviation: "VP",
    aliases: ["vp"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.penalties",
    key: "penalties",
    name: "Competition Penalties",
    abbreviation: "Pen",
    aliases: ["penaltis", "penalties"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.draws",
    key: "draws",
    name: "Competition Draws",
    abbreviation: "D",
    aliases: ["e", "empates", "draws"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.losses",
    key: "losses",
    name: "Competition Losses",
    abbreviation: "L",
    aliases: ["d", "derrotas", "losses"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.gf",
    key: "gf",
    name: "Competition Goals For",
    abbreviation: "GF",
    aliases: ["gm", "gf", "goals for"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.ga",
    key: "ga",
    name: "Competition Goals Against",
    abbreviation: "GA",
    aliases: ["gs", "ga", "goals against"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.gd",
    key: "gd",
    name: "Competition Goal Difference",
    abbreviation: "GD",
    aliases: ["dg", "gd", "goal diff"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.points",
    key: "points",
    name: "Competition Points",
    abbreviation: "Pts",
    aliases: ["pts", "pontos", "points"],
    entity: "competition",
    domain: "classification",
    category: "metric",
    importGroup: "competition_information",
    dataType: "number",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.team1",
    key: "team1",
    name: "Competition Team 1",
    abbreviation: "T1",
    aliases: ["equipa 1", "equipa1", "team1"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.team2",
    key: "team2",
    name: "Competition Team 2",
    abbreviation: "T2",
    aliases: ["equipa 2", "equipa2", "team2"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.result",
    key: "result",
    name: "Competition Result",
    abbreviation: "Res",
    aliases: ["resultado", "result"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.winner",
    key: "winner",
    name: "Competition Winner",
    abbreviation: "Winner",
    aliases: ["vencedor", "winner"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.finalist",
    key: "finalist",
    name: "Competition Finalist",
    abbreviation: "Finalist",
    aliases: ["finalista", "finalist"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.sf1",
    key: "sf1",
    name: "Competition Semi Final 1",
    abbreviation: "SF1",
    aliases: ["meia final equipa 1", "sf equipa 1"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.sf2",
    key: "sf2",
    name: "Competition Semi Final 2",
    abbreviation: "SF2",
    aliases: ["meia final equipa 2", "sf equipa 2"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.qf1",
    key: "qf1",
    name: "Competition Quarter Final 1",
    abbreviation: "QF1",
    aliases: ["quartos de final equipa 1", "qf equipa 1"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.qf2",
    key: "qf2",
    name: "Competition Quarter Final 2",
    abbreviation: "QF2",
    aliases: ["quartos de final equipa 2", "qf equipa 2"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.qf3",
    key: "qf3",
    name: "Competition Quarter Final 3",
    abbreviation: "QF3",
    aliases: ["quartos de final equipa 3", "qf equipa 3"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
  {
    id: "competition.classification.qf4",
    key: "qf4",
    name: "Competition Quarter Final 4",
    abbreviation: "QF4",
    aliases: ["quartos de final equipa 4", "qf equipa 4"],
    entity: "competition",
    domain: "classification",
    category: "context",
    importGroup: "competition_information",
    dataType: "string",
    source: "football_manager",
    originType: "football_manager",
    searchable: true,
    visible: true,
    deprecated: false,
  },
];

function loadCustomEntries(): DictionaryEntry[] {
  if (customEntriesCache) return customEntriesCache;

  try {
    const w = safeWindow();
    if (!w) {
      customEntriesCache = [];
      return customEntriesCache;
    }
    const raw = w.localStorage.getItem(CUSTOM_KEY);
    if (!raw) {
      customEntriesCache = [];
      return customEntriesCache;
    }

    const parsed = JSON.parse(raw) as DictionaryEntry[];
    customEntriesCache = Array.isArray(parsed)
      ? parsed.filter(
          (entry) => entry && typeof entry.id === "string" && typeof entry.key === "string",
        )
      : [];
    return customEntriesCache;
  } catch {
    customEntriesCache = [];
    return customEntriesCache;
  }
}

function saveCustomEntries(entries: DictionaryEntry[]): void {
  customEntriesCache = entries;
  try {
    const w = safeWindow();
    if (!w) return;
    w.localStorage.setItem(CUSTOM_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage failures in environments without localStorage access
  }
}

function invalidateMemo(): void {
  mutationVersion += 1;
}

function composeEntries(): DictionaryEntry[] {
  if (memoizedVersion === mutationVersion) return memoizedEntries;

  const byId = new Map<string, DictionaryEntry>();
  for (const entry of BASE_ENTRIES) byId.set(entry.id, entry);
  for (const entry of loadCustomEntries()) byId.set(entry.id, entry);
  for (const entry of importedEntries) byId.set(entry.id, entry);

  memoizedEntries = [...byId.values()];
  memoizedIndexes = buildDictionaryIndexes(memoizedEntries);
  memoizedVersion = mutationVersion;
  return memoizedEntries;
}

export function getDictionaryIndexes(): DictionaryIndexes {
  composeEntries();
  return memoizedIndexes;
}

export function listDictionaryEntries(): DictionaryEntry[] {
  return [...composeEntries()];
}

export function getDictionaryEntry(id: string): DictionaryEntry | null {
  return getDictionaryIndexes().byId.get(id) ?? null;
}

export function listByEntity(entity: DictionaryEntity): DictionaryEntry[] {
  return [...(getDictionaryIndexes().byEntity.get(entity) ?? [])];
}

export function listByDomain(domain: DictionaryDomain): DictionaryEntry[] {
  return [...(getDictionaryIndexes().byDomain.get(domain) ?? [])];
}

export function listByCategory(category: DictionaryCategory): DictionaryEntry[] {
  return [...(getDictionaryIndexes().byCategory.get(category) ?? [])];
}

export function listByImportGroup(group: DictionaryImportGroup): DictionaryEntry[] {
  return [...(getDictionaryIndexes().byImportGroup.get(group) ?? [])];
}

export function listAliases(id: string): string[] {
  const entry = getDictionaryEntry(id);
  return entry ? [...entry.aliases] : [];
}

function defaultIdFromDraft(draft: DictionaryEntryDraft): string {
  const key = normalizeSlug(draft.key || draft.name || "field") || "field";
  return `${draft.entity}.${draft.category}.${key}`;
}

export function upsertDictionaryEntry(
  draft: DictionaryEntryDraft,
  persist = true,
): DictionaryEntry {
  const entry: DictionaryEntry = {
    id: (draft.id && draft.id.trim()) || defaultIdFromDraft(draft),
    key: normalizeSlug(draft.key || draft.name || "field") || "field",
    name: draft.name.trim(),
    abbreviation: draft.abbreviation?.trim() || undefined,
    aliases: dedupeAliases(draft.aliases),
    entity: draft.entity,
    domain: draft.domain,
    category: draft.category,
    importGroup: draft.importGroup,
    dataType: draft.dataType,
    unit: draft.unit?.trim() || undefined,
    description: draft.description?.trim() || undefined,
    source: draft.source?.trim() || "manual",
    originType: draft.originType ?? "manual",
    searchable: draft.searchable,
    visible: draft.visible,
    deprecated: draft.deprecated,
    // v2.0 Knowledge Base optional fields
    ...(draft.status !== undefined ? { status: draft.status } : {}),
    ...(draft.originSource !== undefined ? { originSource: draft.originSource } : {}),
    ...(draft.subcategory !== undefined ? { subcategory: draft.subcategory } : {}),
    ...(draft.importContexts !== undefined ? { importContexts: draft.importContexts } : {}),
    ...(draft.examples !== undefined ? { examples: draft.examples } : {}),
    ...(draft.similarIds !== undefined ? { similarIds: draft.similarIds } : {}),
  };

  if (!persist) return entry;

  const current = loadCustomEntries();
  const filtered = current.filter((existing) => existing.id !== entry.id);
  filtered.push(entry);
  saveCustomEntries(filtered);
  invalidateMemo();
  return entry;
}

export function replaceImportedDictionaryEntries(entries: DictionaryEntry[]): void {
  importedEntries = [...entries];
  invalidateMemo();
}

export function listCustomDictionaryEntries(): DictionaryEntry[] {
  return [...loadCustomEntries()];
}
