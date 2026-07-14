import { useCallback, useEffect, useMemo, useState } from "react";

export interface DashboardBlockDef {
  id: string;
  label: string;
}

export interface DashboardLayoutState {
  hidden: string[];
  order: string[];
}

const STORAGE_KEY = "fm.dashboard.layout-v1";

function load(): DashboardLayoutState {
  if (typeof window === "undefined") return { hidden: [], order: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { hidden: [], order: [] };
    const parsed = JSON.parse(raw);
    return {
      hidden: Array.isArray(parsed?.hidden) ? parsed.hidden.filter((x: unknown) => typeof x === "string") : [],
      order: Array.isArray(parsed?.order) ? parsed.order.filter((x: unknown) => typeof x === "string") : [],
    };
  } catch {
    return { hidden: [], order: [] };
  }
}

function save(state: DashboardLayoutState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useDashboardLayout(blocks: DashboardBlockDef[]) {
  const [state, setState] = useState<DashboardLayoutState>(() => load());

  useEffect(() => {
    save(state);
  }, [state]);

  const orderedIds = useMemo(() => {
    const defs = blocks.map((b) => b.id);
    const keptOrder = state.order.filter((id) => defs.includes(id));
    const missing = defs.filter((id) => !keptOrder.includes(id));
    return [...keptOrder, ...missing];
  }, [blocks, state.order]);

  const isHidden = useCallback((id: string) => state.hidden.includes(id), [state.hidden]);

  const toggleHidden = useCallback((id: string) => {
    setState((prev) => {
      const hidden = prev.hidden.includes(id)
        ? prev.hidden.filter((x) => x !== id)
        : [...prev.hidden, id];
      return { ...prev, hidden };
    });
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setState((prev) => {
      const defs = blocks.map((b) => b.id);
      const cur = [
        ...prev.order.filter((x) => defs.includes(x)),
        ...defs.filter((x) => !prev.order.includes(x)),
      ];
      const idx = cur.indexOf(id);
      if (idx === -1) return prev;
      const swap = idx + dir;
      if (swap < 0 || swap >= cur.length) return prev;
      const next = [...cur];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return { ...prev, order: next };
    });
  }, [blocks]);

  const reset = useCallback(() => setState({ hidden: [], order: [] }), []);

  return { orderedIds, isHidden, toggleHidden, move, reset };
}
