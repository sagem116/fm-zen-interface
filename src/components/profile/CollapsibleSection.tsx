import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  /** Persist open/closed state under this key in localStorage. */
  storageKey?: string;
  /** Default state when no persisted value exists. */
  defaultOpen?: boolean;
  /** Left-hand title. */
  title: ReactNode;
  /** Optional subtitle below the title. */
  subtitle?: ReactNode;
  /** Optional icon at the far left. */
  icon?: ReactNode;
  /** Preview line shown while collapsed. */
  preview?: ReactNode;
  /** Actions shown next to the toggle chevron. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "accent";
}

/**
 * Reusable collapsible section used by Explain Mode, Narrativa and dense
 * analytical blocks. Persists its open/closed state per storageKey so the
 * user's preference sticks across profiles.
 */
export function CollapsibleSection({
  storageKey,
  defaultOpen = false,
  title,
  subtitle,
  icon,
  preview,
  actions,
  children,
  className,
  tone = "default",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setHydrated(true);
      return;
    }
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "1") setOpen(true);
      else if (stored === "0") setOpen(false);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, hydrated, storageKey]);

  return (
    <section
      className={cn(
        "rounded-xl border transition-colors",
        tone === "accent"
          ? "border-primary/30 bg-primary/5"
          : "border-border/60 bg-card",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl",
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{title}</span>
            {!open && preview ? (
              <span className="text-xs text-muted-foreground truncate">· {preview}</span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <span
            className={cn(
              "text-[10px] uppercase tracking-wide text-muted-foreground hidden sm:inline",
            )}
          >
            {open ? "Recolher" : "Expandir"}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </button>
      {open ? (
        <div className="border-t border-border/60 p-4 space-y-4">{children}</div>
      ) : null}
    </section>
  );
}
