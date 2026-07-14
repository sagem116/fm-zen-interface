export type DataDomain = "individual" | "competitive" | "history";

export type ModuleKey =
  | "rankings"
  | "profiles"
  | "recruitment"
  | "dashboard"
  | "scores"
  | "explain"
  | "compare"
  | "search"
  | "intelligence"
  | "career"
  | "hall_of_fame"
  | string;

export interface ModulePolicy {
  module: ModuleKey;
  domains: Record<DataDomain, boolean>;
  description?: string;
}

const DEFAULT_POLICIES: Record<string, ModulePolicy> = {
  rankings: {
    module: "rankings",
    domains: { individual: false, competitive: true, history: false },
    description: "Rankings use exclusively competitions + statistics (no change).",
  },
  profiles: {
    module: "profiles",
    domains: { individual: true, competitive: true, history: true },
    description: "Profiles aggregate individual + competitive + history.",
  },
  recruitment: {
    module: "recruitment",
    domains: { individual: true, competitive: false, history: false },
    description: "Recruitment uses Player Universe individual domain.",
  },
  dashboard: {
    module: "dashboard",
    domains: { individual: true, competitive: false, history: false },
  },
  scores: {
    module: "scores",
    domains: { individual: true, competitive: false, history: false },
  },
  explain: {
    module: "explain",
    domains: { individual: true, competitive: false, history: false },
  },
  compare: {
    module: "compare",
    domains: { individual: true, competitive: false, history: false },
  },
  search: {
    module: "search",
    domains: { individual: true, competitive: false, history: false },
  },
  intelligence: {
    module: "intelligence",
    domains: { individual: true, competitive: false, history: false },
  },
  career: {
    module: "career",
    domains: { individual: true, competitive: true, history: true },
  },
  hall_of_fame: {
    module: "hall_of_fame",
    domains: { individual: false, competitive: true, history: true },
  },
};

export function getModulePolicy(module: ModuleKey): ModulePolicy {
  return DEFAULT_POLICIES[module] ?? { module, domains: { individual: true, competitive: false, history: false } };
}

export function assertModulePolicy(module: ModuleKey, domain: DataDomain): boolean {
  const policy = getModulePolicy(module);
  return Boolean(policy.domains[domain]);
}

export default { getModulePolicy, assertModulePolicy };
