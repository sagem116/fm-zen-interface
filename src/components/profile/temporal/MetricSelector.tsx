import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TemporalMetric } from "@/lib/profile/temporal";

export function MetricSelector({
  metrics,
  metricKey,
  onChange,
}: {
  metrics: TemporalMetric[];
  metricKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">Métrica</Label>
      <Select value={metricKey} onValueChange={onChange}>
        <SelectTrigger className="w-[220px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {metrics.map((metric) => (
            <SelectItem key={metric.key} value={metric.key}>
              {metric.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
