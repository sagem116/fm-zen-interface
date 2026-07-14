import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/**
 * Non-blocking progress overlay for long-running imports.
 * The importers currently execute end-to-end without emitting granular
 * milestones, so this component provides *perceived* continuous feedback:
 *
 * - Elapsed time (updated every 250 ms)
 * - Estimated time to completion based on a per-import-kind rolling average
 *   persisted in localStorage from previous successful imports
 * - Indeterminate phase label when we don't have a percentage yet
 *
 * When importers later start emitting a real progress ratio, pass it in via
 * `progress` (0..1) and the ETA becomes exact.
 */
export interface ImportProgressOverlayProps {
  active: boolean;
  label: string;
  /** Optional 0..1 real progress. When absent, we animate towards 90% based on avg duration. */
  progress?: number | null;
  /** Stable key for persisting rolling averages, e.g. "season-classifications". */
  historyKey?: string;
  onFinished?: (elapsedMs: number) => void;
}

const AVG_KEY = "fm-import-avg-v1";

function readAvg(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AVG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { avgMs: number; runs: number }>;
    return parsed[key]?.avgMs ?? null;
  } catch {
    return null;
  }
}

function writeAvg(key: string, elapsedMs: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(AVG_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, { avgMs: number; runs: number }>)
      : {};
    const prev = parsed[key];
    const runs = (prev?.runs ?? 0) + 1;
    const avgMs = prev ? Math.round((prev.avgMs * prev.runs + elapsedMs) / runs) : elapsedMs;
    parsed[key] = { avgMs, runs: Math.min(runs, 20) };
    window.localStorage.setItem(AVG_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs.toString().padStart(2, "0")}s`;
}

export function ImportProgressOverlay({
  active,
  label,
  progress = null,
  historyKey,
  onFinished,
}: ImportProgressOverlayProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const avgRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    if (active && !activeRef.current) {
      activeRef.current = true;
      startRef.current = performance.now();
      avgRef.current = historyKey ? readAvg(historyKey) : null;
      setElapsed(0);
      const timer = window.setInterval(() => {
        if (startRef.current == null) return;
        setElapsed(performance.now() - startRef.current);
      }, 250);
      return () => window.clearInterval(timer);
    }
    if (!active && activeRef.current) {
      activeRef.current = false;
      if (startRef.current != null) {
        const total = performance.now() - startRef.current;
        if (historyKey && total > 500) writeAvg(historyKey, total);
        onFinished?.(total);
      }
      startRef.current = null;
    }
    return undefined;
  }, [active, historyKey, onFinished]);

  if (!active) return null;

  const avg = avgRef.current;
  let pct: number;
  let etaMs: number | null = null;
  if (progress != null && progress >= 0) {
    pct = Math.max(2, Math.min(100, Math.round(progress * 100)));
    if (progress > 0.02 && elapsed > 400) {
      etaMs = Math.max(0, Math.round(elapsed / progress - elapsed));
    }
  } else if (avg && avg > 0) {
    // Asymptotic curve toward 92% based on historical average
    const ratio = 1 - Math.exp(-elapsed / avg);
    pct = Math.round(Math.min(0.92, ratio) * 100);
    etaMs = Math.max(0, Math.round(avg - elapsed));
  } else {
    // No history yet — gentle linear crawl capped at 80%
    pct = Math.min(80, Math.round((elapsed / 20000) * 100));
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-border/60 bg-muted/40 p-3 space-y-2"
    >
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span className="font-medium">{label}</span>
        <span className="ml-auto tabular-nums text-muted-foreground">
          {formatDuration(elapsed)}
          {etaMs != null ? ` · ~${formatDuration(etaMs)} restantes` : ""}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
      <p className="text-xs text-muted-foreground">
        A processar — não feches esta janela. A interface continua responsiva.
      </p>
    </div>
  );
}
