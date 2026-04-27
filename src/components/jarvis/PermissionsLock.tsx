import { useEffect, useState } from "react";
import { HudCorners } from "./HudFrame";

const STORAGE_KEY = "jarvis.permissions.v1";

type Permissions = {
  grantedAt: string;
  allowPcControl: boolean;
  requireConfirm: boolean;
};

export function usePermissions() {
  const [perms, setPerms] = useState<Permissions | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPerms(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const grant = (allowPcControl: boolean, requireConfirm: boolean) => {
    const next: Permissions = {
      grantedAt: new Date().toISOString(),
      allowPcControl,
      requireConfirm,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPerms(next);
  };

  const revoke = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPerms(null);
  };

  return { perms, loaded, grant, revoke };
}

export function PermissionsLock({
  onUnlock,
}: {
  onUnlock: (allowPcControl: boolean, requireConfirm: boolean) => void;
}) {
  const [allowPcControl, setAllowPcControl] = useState(true);
  const [requireConfirm, setRequireConfirm] = useState(true);
  const [code, setCode] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthorize = () => {
    if (!acknowledged) {
      setError("Acknowledge the advisory clause to proceed.");
      return;
    }
    if (code.trim().length < 4) {
      setError("Authorization phrase must be at least 4 characters.");
      return;
    }
    setError(null);
    setScanning(true);
    setTimeout(() => {
      onUnlock(allowPcControl, requireConfirm);
    }, 1100);
  };

  return (
    <div className="scanlines fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background">
      <HudCorners />

      {/* ambient rings */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[640px] w-[640px] rounded-full border opacity-30"
          style={{ borderColor: "var(--hud-cyan)" }}
        />
        <div
          className="absolute h-[460px] w-[460px] rounded-full border opacity-50"
          style={{ borderColor: "var(--hud-cyan-bright)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-xl px-6">
        <div className="hud-panel rounded-md border p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: scanning ? "var(--hud-gold)" : "var(--hud-red)",
                  boxShadow: `0 0 12px ${scanning ? "var(--hud-gold)" : "var(--hud-red)"}`,
                }}
              />
              <h2 className="text-xs font-bold uppercase tracking-[0.4em] hud-text">
                Secure Authorization Required
              </h2>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Mark VII · Lockout
            </span>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-foreground/80">
            Good evening, sir. Before I accept directives that may affect this
            workstation, I require your explicit authorization. Please review
            the operational parameters below.
          </p>

          <div className="mb-5 space-y-3">
            <label className="flex items-start gap-3 rounded border border-[var(--hud-cyan)]/40 px-3 py-2 hover:bg-[oklch(0.25_0.04_235)/0.3]">
              <input
                type="checkbox"
                checked={allowPcControl}
                onChange={(e) => setAllowPcControl(e.target.checked)}
                className="mt-1 accent-[var(--hud-cyan-bright)]"
              />
              <span className="text-xs">
                <span className="block hud-text font-bold uppercase tracking-widest">
                  Permit PC Control Channel
                </span>
                <span className="text-foreground/65">
                  Allow JARVIS to relay system-level commands once a desktop
                  bridge is online.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded border border-[var(--hud-cyan)]/40 px-3 py-2 hover:bg-[oklch(0.25_0.04_235)/0.3]">
              <input
                type="checkbox"
                checked={requireConfirm}
                onChange={(e) => setRequireConfirm(e.target.checked)}
                className="mt-1 accent-[var(--hud-cyan-bright)]"
              />
              <span className="text-xs">
                <span className="block hud-text font-bold uppercase tracking-widest">
                  Confirm Each Action
                </span>
                <span className="text-foreground/65">
                  Prompt before executing any command that modifies files,
                  processes, or settings.
                </span>
              </span>
            </label>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Authorization Phrase
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. Stark-Alpha-7"
              disabled={scanning}
              className="w-full rounded border border-[var(--hud-cyan)] bg-transparent px-3 py-2 text-sm hud-text placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--hud-cyan-bright)]"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Stored locally on this device. Used to gate accidental commands.
            </p>
          </div>

          <label className="mb-4 flex items-start gap-2 text-[11px] text-foreground/70">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 accent-[var(--hud-gold)]"
            />
            I acknowledge that JARVIS may execute requested actions on my behalf
            and accept responsibility for issued directives.
          </label>

          {error && (
            <div className="mb-3 rounded border border-[var(--hud-red)] px-3 py-2 text-xs text-[var(--hud-red)]">
              {error}
            </div>
          )}

          <button
            onClick={handleAuthorize}
            disabled={scanning}
            className="w-full rounded border border-[var(--hud-cyan-bright)] bg-[oklch(0.30_0.06_235)/0.5] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.3em] hud-text transition-colors hover:bg-[oklch(0.35_0.08_235)/0.6] disabled:opacity-50"
          >
            {scanning ? "▸ Verifying biometrics…" : "Authorize & Engage"}
          </button>

          <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
            Stark Industries · Confidential
          </p>
        </div>
      </div>
    </div>
  );
}
