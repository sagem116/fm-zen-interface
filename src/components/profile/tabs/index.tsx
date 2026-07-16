// Central bootstrap that registers the reorganized profile tabs.
// The 15 original modules remain as building blocks — they are now composed
// into 6 top-level tabs plus a collapsible Explain panel rendered by the
// ProfileShell. Deep-links to the legacy tab ids continue to work via the
// compatibility map in ProfileTabs.

import { registerProfileTab } from "../registry";
import {
  Compass,
  Sparkles,
  Trophy,
  GitCompareArrows,
  Clock,
  Network,
  Fingerprint,
  Target,
  TrendingUp,
  ArrowLeftRight,
} from "lucide-react";
import { SummaryTab } from "./SummaryTab";
import { PerformanceTab } from "./PerformanceTab";
import { IntelligenceTab } from "./IntelligenceTab";
import { HistoryTab } from "./HistoryTab";
import { NetworkTab } from "./NetworkTab";
import { CompareTab } from "./CompareTab";
import { CoachIdentityTab } from "./CoachIdentityTab";
import { CoachTacticalIdentityTab } from "./CoachTacticalIdentityTab";
import { CoachDevelopmentTab } from "./CoachDevelopmentTab";
import { CoachTransfersTab } from "./CoachTransfersTab";
import { CompetitionMarketTab } from "./CompetitionMarketTab";

const ALL_KINDS = ["club", "player", "coach", "competition", "country"] as const;

registerProfileTab({
  id: "overview",
  label: "Visão Geral",
  icon: Compass,
  order: 100,
  kinds: [...ALL_KINDS],
  render: (ctx) => <SummaryTab ctx={ctx} />,
});

registerProfileTab({
  id: "performance",
  label: "Desempenho",
  icon: Trophy,
  order: 200,
  kinds: [...ALL_KINDS],
  render: (ctx) => <PerformanceTab ctx={ctx} />,
});

registerProfileTab({
  id: "intelligence",
  label: "Inteligência",
  icon: Sparkles,
  order: 300,
  kinds: [...ALL_KINDS],
  render: (ctx) => <IntelligenceTab ctx={ctx} />,
});

registerProfileTab({
  id: "history",
  label: "Histórico",
  icon: Clock,
  order: 400,
  kinds: [...ALL_KINDS],
  render: (ctx) => <HistoryTab ctx={ctx} />,
});

registerProfileTab({
  id: "network",
  label: "Rede",
  icon: Network,
  order: 500,
  kinds: [...ALL_KINDS],
  render: (ctx) => <NetworkTab ctx={ctx} />,
});

registerProfileTab({
  id: "compare",
  label: "Comparar",
  icon: GitCompareArrows,
  order: 600,
  kinds: [...ALL_KINDS],
  render: (ctx) => <CompareTab ctx={ctx} />,
});

registerProfileTab({
  id: "coach-identity",
  label: "Identidade",
  icon: Fingerprint,
  order: 250,
  kinds: ["coach"],
  render: (ctx) => <CoachIdentityTab ctx={ctx} />,
});

registerProfileTab({
  id: "coach-tactical-identity",
  label: "Identidade Tática",
  icon: Target,
  order: 260,
  kinds: ["coach"],
  render: (ctx) => <CoachTacticalIdentityTab ctx={ctx} />,
});

registerProfileTab({
  id: "coach-development",
  label: "Desenvolvimento",
  icon: TrendingUp,
  order: 270,
  kinds: ["coach"],
  render: (ctx) => <CoachDevelopmentTab ctx={ctx} />,
});

registerProfileTab({
  id: "coach-transfers",
  label: "Transferências",
  icon: ArrowLeftRight,
  order: 280,
  kinds: ["coach"],
  render: (ctx) => <CoachTransfersTab ctx={ctx} />,
});

export {};
