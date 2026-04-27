import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "jarvis.audit.v1";
const MAX_ENTRIES = 200;

export type AuditEventType =
  | "unlock"
  | "lock"
  | "command_confirmed"
  | "command_blocked"
  | "command_requested";

export type AuditEntry = {
  id: string;
  type: AuditEventType;
  message: string;
  timestamp: string;
};

function read(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

function write(entries: AuditEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function useAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    setEntries(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEntries(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const log = useCallback((type: AuditEventType, message: string) => {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    const next = [entry, ...read()].slice(0, MAX_ENTRIES);
    write(next);
    setEntries(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setEntries([]);
  }, []);

  return { entries, log, clear };
}

const TYPE_META: Record<
  AuditEventType,
  { label: string; color: string; icon: string }
> = {
  unlock: { label: "UNLOCK", color: "var(--hud-cyan-bright)", icon: "🔓" },
  lock: { label: "LOCK", color: "var(--hud-gold)", icon: "🔒" },
  command_confirmed: {
    label: "EXECUTED",
    color: "var(--hud-cyan-bright)",
    icon: "▸",
  },
  command_blocked: { label: "BLOCKED", color: "var(--hud-red)", icon: "✕" },
  command_requested: {
    label: "REQUEST",
    color: "var(--hud-gold)",
    icon: "?",
  },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function AuditLogPanel({
  entries,
  onClear,
}: {
  entries: AuditEntry[];
  onClear: () => void;
}) {
  return (
    <div className="hud-panel rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              background: "var(--hud-cyan-bright)",
              boxShadow: "0 0 8px var(--hud-cyan-bright)",
            }}
          />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] hud-text">
            Audit Log
          </h3>
          <span className="text-[10px] text-muted-foreground">
            ({entries.length})
          </span>
        </div>
        <button
          onClick={onClear}
          disabled={entries.length === 0}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[var(--hud-red)] disabled:opacity-30"
        >
          Clear
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-muted-foreground">
          No events recorded yet.
        </p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto pr-1 text-[11px]">
          {entries.map((e) => {
            const meta = TYPE_META[e.type];
            return (
              <li
                key={e.id}
                className="flex items-start gap-2 rounded border border-transparent px-1.5 py-1 hover:border-[var(--hud-cyan)]/40"
              >
                <span
                  className="mt-px font-mono text-[10px]"
                  style={{ color: meta.color }}
                >
                  {formatTime(e.timestamp)}
                </span>
                <span
                  className="font-bold uppercase tracking-wider"
                  style={{ color: meta.color, fontSize: 9 }}
                >
                  {meta.icon} {meta.label}
                </span>
                <span className="flex-1 text-foreground/80">{e.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
