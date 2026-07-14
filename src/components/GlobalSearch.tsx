import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Shield,
  User,
  Users,
  Globe2,
  Trophy,
  Loader2,
  Clock,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRankings } from "@/lib/useRankings";
import { usePlayerUniverse } from "@/lib/player-universe";
import { useRecentProfiles } from "@/lib/profile/recent";

type Kind = "clube" | "treinador" | "jogador" | "pais" | "competicao";

interface Item {
  kind: Kind;
  label: string;
  sub?: string;
  to: string;
  params: Record<string, string>;
  score?: number;
}

const KIND_META: Record<Kind, { label: string; plural: string; icon: typeof Shield; color: string }> = {
  clube: { label: "Clube", plural: "Clubes", icon: Shield, color: "text-blue-400" },
  treinador: { label: "Treinador", plural: "Treinadores", icon: Users, color: "text-emerald-400" },
  jogador: { label: "Jogador", plural: "Jogadores", icon: User, color: "text-violet-400" },
  pais: { label: "País", plural: "Países", icon: Globe2, color: "text-amber-400" },
  competicao: { label: "Competição", plural: "Competições", icon: Trophy, color: "text-gold" },
};

const KIND_ORDER: Kind[] = ["clube", "treinador", "jogador", "competicao", "pais"];
const MAX_PER_GROUP = 6;

const RECENT_SEARCHES_KEY = "fm.global-search.recent-queries";
const MAX_RECENT_SEARCHES = 6;

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Very lightweight fuzzy: allow all chars of `term` to appear in order in `text`. */
function fuzzyContains(text: string, term: string): number | null {
  if (!term) return 0;
  const direct = text.indexOf(term);
  if (direct !== -1) return direct; // exact substring wins
  // subsequence check
  let ti = 0;
  let firstAt = -1;
  for (let i = 0; i < text.length && ti < term.length; i++) {
    if (text[i] === term[ti]) {
      if (firstAt === -1) firstAt = i;
      ti++;
    }
  }
  if (ti === term.length) return 1000 + firstAt; // penalized
  return null;
}

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(list: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list.slice(0, MAX_RECENT_SEARCHES)));
}

const RECENT_KIND_TO_PATH: Record<string, { to: string; kind: Kind }> = {
  club: { to: "/clubes/$name", kind: "clube" },
  coach: { to: "/treinadores/$name", kind: "treinador" },
  player: { to: "/jogadores/$name", kind: "jogador" },
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const { data, isLoading } = useRankings();
  const universe = usePlayerUniverse();
  const recentProfiles = useRecentProfiles(8);
  const [recentQueries, setRecentQueries] = useState<string[]>(() => loadRecentSearches());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo<Item[]>(() => {
    if (!data) return [];
    const out: Item[] = [];
    const seen = new Set<string>();
    const push = (it: Item) => {
      const k = `${it.kind}|${it.label}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push(it);
    };

    Object.keys(data.data.clubCountry).forEach((name) => {
      if (!name) return;
      push({
        kind: "clube",
        label: name,
        sub: data.data.clubCountry[name] ?? undefined,
        to: "/clubes/$name",
        params: { name },
      });
    });

    const coachNat = new Map<string, string | null>();
    data.data.coaches.forEach((c) => {
      if (!c.name) return;
      if (!coachNat.has(c.name)) coachNat.set(c.name, c.nationality ?? null);
    });
    coachNat.forEach((nat, name) => {
      push({
        kind: "treinador",
        label: name,
        sub: nat ?? undefined,
        to: "/treinadores/$name",
        params: { name },
      });
    });

    const countries = new Set<string>();
    Object.values(data.data.clubCountry).forEach((c) => c && countries.add(c));
    (data.data.international ?? []).forEach((i) => {
      [i.team1, i.team2, i.winner, i.sf1, i.sf2, i.qf1, i.qf2, i.qf3, i.qf4].forEach(
        (c) => c && countries.add(c),
      );
    });
    countries.forEach((name) =>
      push({ kind: "pais", label: name, to: "/paises/$name", params: { name } }),
    );

    const players = new Map<string, string | null>();
    data.data.players.forEach((p) => {
      if (!p.name) return;
      if (!players.has(p.name)) players.set(p.name, p.club_name ?? null);
    });
    for (const p of universe.list ?? []) {
      if (!p?.name) continue;
      if (!players.has(p.name)) players.set(p.name, p.currentClub ?? null);
    }
    players.forEach((club, name) => {
      push({
        kind: "jogador",
        label: name,
        sub: club ?? undefined,
        to: "/jogadores/$name",
        params: { name },
      });
    });

    const compCont = new Set<string>();
    data.data.continental.forEach((c) => c.competition && compCont.add(c.competition));
    compCont.forEach((c) =>
      push({
        kind: "competicao",
        label: c,
        sub: "Continental",
        to: "/competicoes/$name",
        params: { name: c },
      }),
    );
    const compIntl = new Set<string>();
    (data.data.international ?? []).forEach((c) => c.competition && compIntl.add(c.competition));
    compIntl.forEach((c) =>
      push({
        kind: "competicao",
        label: c,
        sub: "Internacional",
        to: "/competicoes/$name",
        params: { name: c },
      }),
    );
    const slDivs = new Set<string>();
    data.data.standings.forEach((s) => {
      if (s.module === "superleague") {
        const lab = s.division_label ?? (s.division_num != null ? `Div. ${s.division_num}` : null);
        if (lab) slDivs.add(lab);
      }
    });
    slDivs.forEach((c) =>
      push({
        kind: "competicao",
        label: c,
        sub: "Super League",
        to: "/competicoes/$name",
        params: { name: c },
      }),
    );
    const natLeagues = new Set<string>();
    data.data.standings.forEach((s) => {
      if (s.module === "national" && s.division_label) natLeagues.add(s.division_label);
    });
    natLeagues.forEach((c) =>
      push({
        kind: "competicao",
        label: c,
        sub: "Liga Nacional",
        to: "/competicoes/$name",
        params: { name: c },
      }),
    );

    return out;
  }, [data, universe.list]);

  const grouped = useMemo(() => {
    const term = norm(q.trim());
    const map = new Map<Kind, Item[]>();
    KIND_ORDER.forEach((k) => map.set(k, []));
    if (!term) return map;

    for (const it of allItems) {
      const n = norm(it.label);
      let score: number;
      if (n === term) score = 0;
      else if (n.startsWith(term)) score = 10;
      else {
        const fuzz = fuzzyContains(n, term);
        if (fuzz === null) continue;
        score = 50 + fuzz;
      }
      const arr = map.get(it.kind);
      if (arr) arr.push({ ...it, score });
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || a.label.localeCompare(b.label));
    }
    return map;
  }, [q, allItems]);

  const flatResults = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const k of KIND_ORDER) {
      const arr = grouped.get(k) ?? [];
      out.push(...arr.slice(0, MAX_PER_GROUP));
    }
    return out;
  }, [grouped]);

  useEffect(() => setActiveIdx(0), [q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = containerRef.current?.querySelector("input");
        (input as HTMLInputElement | null)?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const rememberQuery = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recentQueries.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(
      0,
      MAX_RECENT_SEARCHES,
    );
    setRecentQueries(next);
    saveRecentSearches(next);
  };

  const clearRecents = () => {
    setRecentQueries([]);
    saveRecentSearches([]);
  };

  const go = (it: Item) => {
    rememberQuery(q);
    setOpen(false);
    setQ("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: it.to as any, params: it.params as any });
  };

  const goPath = (to: string, params: Record<string, string>) => {
    setOpen(false);
    setQ("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: to as any, params: params as any });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(flatResults.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (flatResults[activeIdx]) {
        e.preventDefault();
        go(flatResults[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const hasQuery = q.trim().length > 0;
  const showPanel = open && (hasQuery || isLoading || recentProfiles.length > 0 || recentQueries.length > 0);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Pesquisar clubes, treinadores, jogadores, países, competições…"
          className="pl-8 pr-12 h-9"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>
      {showPanel && (
        <div className="absolute z-50 mt-1 w-full md:w-[32rem] max-h-[70vh] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> A carregar dados…
            </div>
          )}

          {!isLoading && !hasQuery && (
            <div className="py-1">
              {recentProfiles.length > 0 && (
                <PaletteSection title="Visitados recentemente">
                  {recentProfiles.slice(0, 6).map((r) => {
                    const meta = RECENT_KIND_TO_PATH[r.kind];
                    if (!meta) return null;
                    const kmeta = KIND_META[meta.kind];
                    const Icon = kmeta.icon;
                    return (
                      <PaletteRow
                        key={`${r.kind}-${r.name}`}
                        icon={<Icon className={cn("size-4 shrink-0", kmeta.color)} />}
                        label={r.name}
                        badge={kmeta.label}
                        onClick={() => goPath(meta.to, { name: r.name })}
                      />
                    );
                  })}
                </PaletteSection>
              )}
              {recentQueries.length > 0 && (
                <PaletteSection
                  title="Pesquisas recentes"
                  action={
                    <button
                      type="button"
                      onClick={clearRecents}
                      className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X className="size-3" /> Limpar
                    </button>
                  }
                >
                  {recentQueries.map((rq) => (
                    <PaletteRow
                      key={rq}
                      icon={<Clock className="size-4 shrink-0 text-muted-foreground" />}
                      label={rq}
                      onClick={() => setQ(rq)}
                    />
                  ))}
                </PaletteSection>
              )}
              {recentProfiles.length === 0 && recentQueries.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  Escreva para pesquisar em toda a base de dados.
                </div>
              )}
            </div>
          )}

          {!isLoading && hasQuery && flatResults.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              Sem resultados para “{q}”.
            </div>
          )}

          {!isLoading && hasQuery && flatResults.length > 0 && (
            <div className="py-1">
              {KIND_ORDER.map((kind) => {
                const arr = (grouped.get(kind) ?? []).slice(0, MAX_PER_GROUP);
                if (!arr.length) return null;
                const meta = KIND_META[kind];
                const Icon = meta.icon;
                return (
                  <PaletteSection key={kind} title={meta.plural}>
                    {arr.map((it) => {
                      const globalIdx = flatResults.indexOf(it);
                      const isActive = globalIdx === activeIdx;
                      return (
                        <PaletteRow
                          key={`${it.kind}-${it.label}`}
                          icon={<Icon className={cn("size-4 shrink-0", meta.color)} />}
                          label={it.label}
                          sub={it.sub}
                          active={isActive}
                          onMouseEnter={() => setActiveIdx(globalIdx)}
                          onClick={() => go(it)}
                        />
                      );
                    })}
                  </PaletteSection>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PaletteSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/40 last:border-0 py-1">
      <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

function PaletteRow({
  icon,
  label,
  sub,
  badge,
  active,
  onMouseEnter,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  badge?: string;
  active?: boolean;
  onMouseEnter?: () => void;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
      )}
    >
      {icon}
      <span className="flex-1 truncate">
        <span className="font-medium">{label}</span>
        {sub && <span className="text-muted-foreground"> · {sub}</span>}
      </span>
      {badge ? (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
