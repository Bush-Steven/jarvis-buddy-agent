import { useEffect, useState } from "react";
import { HudPanel } from "./HudFrame";

function useTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useDrift(seed: number, base = 70, range = 25) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const id = setInterval(() => {
      setV(() => Math.round(base + (Math.sin(Date.now() / 1000 + seed) + Math.random() * 0.4) * range));
    }, 1500);
    return () => clearInterval(id);
  }, [seed, base, range]);
  return v;
}

function Bar({ value, max = 100, color = "cyan" }: { value: number; max?: number; color?: "cyan" | "gold" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[oklch(0.25_0.04_235)]">
      <div
        className="h-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background:
            color === "gold"
              ? "linear-gradient(90deg, var(--hud-gold), var(--hud-gold-bright))"
              : "linear-gradient(90deg, var(--hud-cyan), var(--hud-cyan-bright))",
          boxShadow:
            color === "gold"
              ? "0 0 8px var(--hud-gold)"
              : "0 0 8px var(--hud-cyan)",
        }}
      />
    </div>
  );
}

export function SystemStats() {
  const now = useTime();
  const cpu = useDrift(1, 42, 20);
  const mem = useDrift(2, 58, 15);
  const net = useDrift(3, 75, 18);
  const power = useDrift(4, 88, 8);

  return (
    <HudPanel title="System Diagnostics">
      <div className="space-y-3 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">CHRONO</span>
          <span className="hud-text font-mono">
            {now.toLocaleTimeString("en-GB", { hour12: false })}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">CPU LOAD</span>
            <span className="hud-text">{cpu}%</span>
          </div>
          <Bar value={cpu} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">MEMORY</span>
            <span className="hud-text">{mem}%</span>
          </div>
          <Bar value={mem} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">UPLINK</span>
            <span className="hud-text">{net} Mb/s</span>
          </div>
          <Bar value={net} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">REACTOR</span>
            <span className="hud-text-gold">{power}%</span>
          </div>
          <Bar value={power} color="gold" />
        </div>
      </div>
    </HudPanel>
  );
}
