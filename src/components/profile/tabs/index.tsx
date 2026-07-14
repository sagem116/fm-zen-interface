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
} from "lucide-react";
import { SummaryTab } from "./SummaryTab";
import { PerformanceTab } from "./PerformanceTab";
import { IntelligenceTab } from "./IntelligenceTab";
import { HistoryTab } from "./HistoryTab";
import { NetworkTab } from "./NetworkTab";
import { CompareTab } from "./CompareTab";

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

export {};
