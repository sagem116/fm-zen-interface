import { Trophy, BarChart3, Brain, Sparkles, Settings, Target, UploadCloud } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DashboardCard } from "./DashboardCard";

const ACTIONS = [
  { to: "/rankings", label: "Rankings", icon: Trophy },
  { to: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/intelligence-studio", label: "Intelligence Studio", icon: Brain },
  { to: "/desafios", label: "Desafios", icon: Target },
  { to: "/configuracao", label: "Configurações", icon: Settings },
  { to: "/importar", label: "Imports", icon: UploadCloud },
] as const;

export function DashboardQuickActions() {
  return (
    <DashboardCard title="Acesso Rápido" icon={Sparkles} compact>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/60 py-3 hover:bg-muted/40 hover:border-gold/40 transition-colors text-xs"
            search={{ tab: undefined }}
          >
            <a.icon className="size-4 text-gold" />
            <span className="text-center leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
