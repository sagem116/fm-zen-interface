export type AppDataSource = "player_profiles" | "competitions_statistics";

export type DataConsumerModule =
  | "recruitment"
  | "rankings"
  | "profiles_ranking"
  | "profiles_scouting";

export interface DataConsumerPolicy {
  module: DataConsumerModule;
  source: AppDataSource;
  description: string;
}

const DATA_CONSUMER_POLICIES: Record<DataConsumerModule, DataConsumerPolicy> = {
  recruitment: {
    module: "recruitment",
    source: "player_profiles",
    description: "Recruitment Center usa exclusivamente o Import Jogadores (player_profiles).",
  },
  rankings: {
    module: "rankings",
    source: "competitions_statistics",
    description: "Rankings usa exclusivamente imports de Competições + Estatísticas.",
  },
  profiles_ranking: {
    module: "profiles_ranking",
    source: "competitions_statistics",
    description: "Perfis (ranking/histórico competitivo) usa Competições + Estatísticas.",
  },
  profiles_scouting: {
    module: "profiles_scouting",
    source: "player_profiles",
    description: "Perfis (atributos/scouting/análise individual) usa player_profiles.",
  },
};

export function getDataConsumerPolicy(module: DataConsumerModule): DataConsumerPolicy {
  return DATA_CONSUMER_POLICIES[module];
}

export function assertDataSourceForModule(
  module: DataConsumerModule,
  expected: AppDataSource,
): void {
  const actual = getDataConsumerPolicy(module).source;
  if (actual !== expected) {
    throw new Error(`Data source policy mismatch for ${module}: expected ${expected}, got ${actual}`);
  }
}
