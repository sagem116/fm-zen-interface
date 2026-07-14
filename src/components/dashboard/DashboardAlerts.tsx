import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DashboardCard } from "./DashboardCard";

export interface AlertEntry {
  key: string;
  label: string;
  count: number;
  to: string;
}

export function DashboardAlerts({ alerts }: { alerts: AlertEntry[] }) {
  return (
    <DashboardCard title="Alertas" icon={AlertTriangle}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {alerts.map((a) => (
          <Link
            key={a.key}
            to={a.to as any}
            search={true}
            className={`rounded-xl border p-3 hover:bg-muted/40 transition-colors ${
              a.count > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border/60"
            }`}
          >
            <p
              className={`text-2xl font-bold tabular-nums ${
                a.count > 0 ? "text-amber-500" : "text-success"
              }`}
            >
              {a.count.toLocaleString("pt-PT")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{a.label}</p>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
