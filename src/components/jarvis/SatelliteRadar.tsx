import { useEffect, useMemo, useRef, useState } from "react";
import { HudPanel } from "./HudFrame";

type Contact = {
  id: string;
  // Polar coords
  angle: number; // degrees, 0 = up
  radius: number; // 0..1 (fraction of radar radius)
  type: "aircraft" | "satellite" | "vessel" | "unknown";
  threat: "low" | "medium" | "high";
  speed: number; // deg/sec orbital drift
  detectedAt: number; // sweep angle when last lit
  bornAt: number;
};

const TYPE_LABEL: Record<Contact["type"], string> = {
  aircraft: "AIR",
  satellite: "SAT",
  vessel: "NAV",
  unknown: "UNK",
};

const THREAT_COLOR: Record<Contact["threat"], string> = {
  low: "var(--hud-cyan-bright)",
  medium: "var(--hud-gold-bright)",
  high: "var(--hud-red, oklch(0.7 0.22 25))",
};

function randomContact(): Contact {
  const types: Contact["type"][] = ["aircraft", "satellite", "vessel", "unknown"];
  const threats: Contact["threat"][] = ["low", "low", "low", "medium", "medium", "high"];
  return {
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    angle: Math.random() * 360,
    radius: 0.15 + Math.random() * 0.8,
    type: types[Math.floor(Math.random() * types.length)],
    threat: threats[Math.floor(Math.random() * threats.length)],
    speed: (Math.random() - 0.5) * 8,
    detectedAt: -1,
    bornAt: Date.now(),
  };
}

export function SatelliteRadar() {
  const SIZE = 220;
  const center = SIZE / 2;
  const maxR = SIZE / 2 - 8;

  const [sweep, setSweep] = useState(0); // 0..360
  const [contacts, setContacts] = useState<Contact[]>(() =>
    Array.from({ length: 5 }, randomContact)
  );
  const [selected, setSelected] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(performance.now());

  // Sweep animation
  useEffect(() => {
    const tick = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setSweep((s) => (s + dt * 90) % 360); // 90 deg/sec → 4s/rev
      setContacts((cs) =>
        cs.map((c) => ({
          ...c,
          angle: (c.angle + c.speed * dt + 360) % 360,
        }))
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Light up contacts when sweep passes them
  useEffect(() => {
    setContacts((cs) =>
      cs.map((c) => {
        const diff = ((sweep - c.angle + 360) % 360);
        if (diff < 4 && c.detectedAt !== Math.floor(sweep / 4)) {
          return { ...c, detectedAt: Math.floor(sweep / 4) };
        }
        return c;
      })
    );
  }, [sweep]);

  // Periodic contact churn
  useEffect(() => {
    const id = setInterval(() => {
      setContacts((cs) => {
        const next = cs.filter(() => Math.random() > 0.18);
        while (next.length < 6) next.push(randomContact());
        if (next.length > 8) next.length = 8;
        return next;
      });
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const high = contacts.filter((c) => c.threat === "high").length;
    const med = contacts.filter((c) => c.threat === "medium").length;
    return { total: contacts.length, high, med };
  }, [contacts]);

  const selectedContact = contacts.find((c) => c.id === selected) ?? null;

  return (
    <HudPanel title="Satellite Radar · Orbital Scan" accent="cyan">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em]">
          <span className="text-muted-foreground">{stats.total} contacts</span>
          <div className="flex items-center gap-2">
            <span className="hud-text-gold">{stats.med} med</span>
            <span style={{ color: THREAT_COLOR.high }}>{stats.high} hi</span>
          </div>
        </div>

        <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="absolute inset-0"
          >
            <defs>
              <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="oklch(0.22 0.06 235)" stopOpacity="0.9" />
                <stop offset="100%" stopColor="oklch(0.08 0.03 240)" stopOpacity="1" />
              </radialGradient>
              <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--hud-cyan-bright)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="var(--hud-cyan-bright)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Background disc */}
            <circle cx={center} cy={center} r={maxR} fill="url(#radarBg)" />

            {/* Concentric rings */}
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <circle
                key={f}
                cx={center}
                cy={center}
                r={maxR * f}
                fill="none"
                stroke="var(--hud-cyan)"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
            ))}

            {/* Crosshair */}
            <line
              x1={center}
              y1={center - maxR}
              x2={center}
              y2={center + maxR}
              stroke="var(--hud-cyan)"
              strokeOpacity={0.3}
            />
            <line
              x1={center - maxR}
              y1={center}
              x2={center + maxR}
              y2={center}
              stroke="var(--hud-cyan)"
              strokeOpacity={0.3}
            />

            {/* Sweep wedge */}
            <g transform={`rotate(${sweep - 90} ${center} ${center})`}>
              <path
                d={`M ${center} ${center} L ${center + maxR} ${center} A ${maxR} ${maxR} 0 0 0 ${
                  center + maxR * Math.cos((-60 * Math.PI) / 180)
                } ${center + maxR * Math.sin((-60 * Math.PI) / 180)} Z`}
                fill="url(#sweepGrad)"
              />
              <line
                x1={center}
                y1={center}
                x2={center + maxR}
                y2={center}
                stroke="var(--hud-cyan-bright)"
                strokeWidth={1.5}
                style={{ filter: "drop-shadow(0 0 4px var(--hud-cyan-bright))" }}
              />
            </g>

            {/* Contacts */}
            {contacts.map((c) => {
              const rad = (c.angle - 90) * (Math.PI / 180);
              const x = center + Math.cos(rad) * c.radius * maxR;
              const y = center + Math.sin(rad) * c.radius * maxR;
              const diff = (sweep - c.angle + 360) % 360;
              // Fade based on time since last sweep
              const intensity = Math.max(0.2, 1 - diff / 360);
              const color = THREAT_COLOR[c.threat];
              const isSel = selected === c.id;
              return (
                <g key={c.id} onClick={() => setSelected(c.id)} style={{ cursor: "pointer" }}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isSel ? 6 : 3.5}
                    fill={color}
                    fillOpacity={intensity}
                    stroke={color}
                    strokeWidth={isSel ? 2 : 1}
                    style={{ filter: `drop-shadow(0 0 ${4 * intensity}px ${color})` }}
                  />
                  {(isSel || c.threat === "high") && (
                    <text
                      x={x + 7}
                      y={y - 5}
                      fill={color}
                      fontSize={8}
                      fontFamily="monospace"
                      style={{ letterSpacing: "0.1em" }}
                    >
                      {TYPE_LABEL[c.type]}-{c.id}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Contact list / details */}
        {selectedContact ? (
          <div
            className="rounded-md border p-2 text-[11px] space-y-1"
            style={{
              borderColor: THREAT_COLOR[selectedContact.threat],
              background: "oklch(0.18 0.04 235 / 0.5)",
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ color: THREAT_COLOR[selectedContact.threat] }}
              >
                {TYPE_LABEL[selectedContact.type]} · {selectedContact.id}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:hud-text"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-muted-foreground">
              <span>BEARING</span>
              <span className="hud-text text-right">
                {selectedContact.angle.toFixed(0)}°
              </span>
              <span>RANGE</span>
              <span className="hud-text text-right">
                {(selectedContact.radius * 1200).toFixed(0)} km
              </span>
              <span>THREAT</span>
              <span className="text-right" style={{ color: THREAT_COLOR[selectedContact.threat] }}>
                {selectedContact.threat.toUpperCase()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground text-center">
            Tap a contact for telemetry
          </p>
        )}
      </div>
    </HudPanel>
  );
}
