import { useEffect, useMemo, useRef, useState } from "react";
import * as satellite from "satellite.js";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { HudPanel } from "./HudFrame";
import { fetchActiveTLEs, type TLE } from "@/utils/satellites.functions";

type AlertSettings = {
  enabled: boolean;
  threshold: number; // deg elevation
  filter: string; // substring match on satellite name (case-insensitive)
  sound: boolean;
};

const ALERT_KEY = "jarvis.radar.alerts.v1";
const DEFAULT_ALERTS: AlertSettings = {
  enabled: true,
  threshold: 10,
  filter: "",
  sound: false,
};

function loadAlerts(): AlertSettings {
  if (typeof window === "undefined") return DEFAULT_ALERTS;
  try {
    const raw = localStorage.getItem(ALERT_KEY);
    if (!raw) return DEFAULT_ALERTS;
    return { ...DEFAULT_ALERTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ALERTS;
  }
}

function beep() {
  try {
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  } catch {
    // ignore
  }
}


type LiveContact = {
  id: string;
  name: string;
  azimuth: number; // deg, 0=N, clockwise
  elevation: number; // deg above horizon
  range: number; // km
  threat: "low" | "medium" | "high";
};

type Observer = { lat: number; lng: number; alt: number; label: string };

const THREAT_COLOR: Record<LiveContact["threat"], string> = {
  low: "var(--hud-cyan-bright)",
  medium: "var(--hud-gold-bright)",
  high: "var(--hud-red, oklch(0.7 0.22 25))",
};

function classifyThreat(name: string): LiveContact["threat"] {
  const n = name.toUpperCase();
  if (/COSMOS|KOSMOS|YAOGAN|USA-|NROL|MILSTAR/.test(n)) return "high";
  if (/STARLINK|ONEWEB|IRIDIUM|GLOBALSTAR/.test(n)) return "medium";
  return "low";
}

const DEFAULT_OBSERVER: Observer = {
  lat: 51.5074,
  lng: -0.1278,
  alt: 0.03,
  label: "LONDON · 51.5N 0.1W",
};

export function SatelliteRadar() {
  const SIZE = 220;
  const center = SIZE / 2;
  const maxR = SIZE / 2 - 8;

  const fetchTLEs = useServerFn(fetchActiveTLEs);

  const [sweep, setSweep] = useState(0);
  const [tles, setTles] = useState<TLE[]>([]);
  const [contacts, setContacts] = useState<LiveContact[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [observer, setObserver] = useState<Observer>(DEFAULT_OBSERVER);
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const [statusMsg, setStatusMsg] = useState("Acquiring uplink…");
  const [alerts, setAlerts] = useState<AlertSettings>(() => loadAlerts());
  const [showSettings, setShowSettings] = useState(false);
  const prevElevRef = useRef<Map<string, number>>(new Map());
  const alertsRef = useRef(alerts);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(performance.now());

  useEffect(() => {
    alertsRef.current = alerts;
    try {
      localStorage.setItem(ALERT_KEY, JSON.stringify(alerts));
    } catch {
      // ignore
    }
  }, [alerts]);

  // Try browser geolocation (silent fall-back to London)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, altitude } = pos.coords;
        setObserver({
          lat: latitude,
          lng: longitude,
          alt: (altitude ?? 0) / 1000,
          label: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
        });
      },
      () => {},
      { timeout: 4000 }
    );
  }, []);

  // Fetch TLEs on mount + every 6 hours
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchTLEs();
        if (cancelled) return;
        if (res.error || res.tles.length === 0) {
          setStatus("error");
          setStatusMsg(res.error ?? "No TLE data");
        } else {
          setTles(res.tles);
          setStatus("live");
          setStatusMsg(`${res.tles.length} tracked · Celestrak`);
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setStatusMsg("Uplink failed");
        }
      }
    };
    load();
    const id = setInterval(load, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchTLEs]);

  // Recompute live look-angles from TLEs (every 2s — propagation is cheap but
  // we don't need 60Hz for orbital positions)
  useEffect(() => {
    if (tles.length === 0) return;
    const compute = () => {
      const now = new Date();
      const obsGd: satellite.GeodeticLocation = {
        longitude: satellite.degreesToRadians(observer.lng),
        latitude: satellite.degreesToRadians(observer.lat),
        height: observer.alt,
      };
      const gmst = satellite.gstime(now);
      const live: LiveContact[] = [];
      for (const t of tles) {
        try {
          const satrec = satellite.twoline2satrec(t.line1, t.line2);
          const pv = satellite.propagate(satrec, now);
          if (!pv.position || typeof pv.position === "boolean") continue;
          const ecf = satellite.eciToEcf(pv.position, gmst);
          const look = satellite.ecfToLookAngles(obsGd, ecf);
          const elDeg = satellite.radiansToDegrees(look.elevation);
          if (elDeg <= 0) continue; // below horizon
          live.push({
            id: t.name,
            name: t.name,
            azimuth: satellite.radiansToDegrees(look.azimuth),
            elevation: elDeg,
            range: look.rangeSat,
            threat: classifyThreat(t.name),
          });
        } catch {
          // Bad TLE, skip
        }
      }
      live.sort((a, b) => b.elevation - a.elevation);
      const capped = live.slice(0, 24);

      // Alert detection: fire when a sat crosses the threshold upward
      // (was below threshold or off-scope last tick → now ≥ threshold).
      const cfg = alertsRef.current;
      if (cfg.enabled) {
        const filter = cfg.filter.trim().toLowerCase();
        for (const c of live) {
          if (filter && !c.name.toLowerCase().includes(filter)) continue;
          const prev = prevElevRef.current.get(c.id) ?? -90;
          if (prev < cfg.threshold && c.elevation >= cfg.threshold) {
            const label =
              cfg.threshold <= 0.5
                ? "entered horizon"
                : `crossed ${cfg.threshold.toFixed(0)}°`;
            toast(`📡 ${c.name}`, {
              description: `${label} · az ${c.azimuth.toFixed(0)}° · el ${c.elevation.toFixed(1)}° · ${c.range.toFixed(0)} km`,
            });
            if (cfg.sound) beep();
          }
        }
      }
      const next = new Map<string, number>();
      for (const c of live) next.set(c.id, c.elevation);
      prevElevRef.current = next;

      setContacts(capped);
    };
    compute();
    const id = setInterval(compute, 2000);
    return () => clearInterval(id);
  }, [tles, observer]);

  // Sweep animation
  useEffect(() => {
    const tick = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setSweep((s) => (s + dt * 90) % 360);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const stats = useMemo(() => {
    const high = contacts.filter((c) => c.threat === "high").length;
    const med = contacts.filter((c) => c.threat === "medium").length;
    return { total: contacts.length, high, med };
  }, [contacts]);

  const selectedContact = contacts.find((c) => c.id === selected) ?? null;

  return (
    <HudPanel title="Satellite Radar · Live Orbital" accent="cyan">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em]">
          <span className="text-muted-foreground">{stats.total} above horizon</span>
          <div className="flex items-center gap-2">
            <span className="hud-text-gold">{stats.med} med</span>
            <span style={{ color: THREAT_COLOR.high }}>{stats.high} hi</span>
          </div>
        </div>

        <div
          className="text-[9px] uppercase tracking-[0.3em] truncate"
          style={{
            color:
              status === "error"
                ? THREAT_COLOR.high
                : status === "live"
                  ? "var(--hud-cyan-bright)"
                  : "var(--hud-gold-bright)",
          }}
        >
          {observer.label} · {statusMsg}
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

            <circle cx={center} cy={center} r={maxR} fill="url(#radarBg)" />

            {[0.33, 0.66, 1].map((f) => (
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

            {/* Cardinal labels — N E S W */}
            {[
              { l: "N", x: center, y: 8 },
              { l: "E", x: SIZE - 6, y: center + 3 },
              { l: "S", x: center, y: SIZE - 2 },
              { l: "W", x: 4, y: center + 3 },
            ].map((p) => (
              <text
                key={p.l}
                x={p.x}
                y={p.y}
                fill="var(--hud-cyan)"
                fontSize={9}
                textAnchor="middle"
                fontFamily="monospace"
                style={{ letterSpacing: "0.1em" }}
              >
                {p.l}
              </text>
            ))}

            <line x1={center} y1={center - maxR} x2={center} y2={center + maxR} stroke="var(--hud-cyan)" strokeOpacity={0.3} />
            <line x1={center - maxR} y1={center} x2={center + maxR} y2={center} stroke="var(--hud-cyan)" strokeOpacity={0.3} />

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

            {/* Live satellites — radius shrinks as elevation → 90 (zenith at center) */}
            {contacts.map((c) => {
              const r = (1 - c.elevation / 90) * maxR;
              // Azimuth: 0=N (up), 90=E (right). Convert to SVG: angle from +x axis = az - 90.
              const rad = (c.azimuth - 90) * (Math.PI / 180);
              const x = center + Math.cos(rad) * r;
              const y = center + Math.sin(rad) * r;
              const sweepDiff = (sweep - c.azimuth + 360) % 360;
              const intensity = Math.max(0.25, 1 - sweepDiff / 360);
              const color = THREAT_COLOR[c.threat];
              const isSel = selected === c.id;
              return (
                <g key={c.id} onClick={() => setSelected(c.id)} style={{ cursor: "pointer" }}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isSel ? 5 : 2.5}
                    fill={color}
                    fillOpacity={intensity}
                    stroke={color}
                    strokeWidth={isSel ? 2 : 0.8}
                    style={{ filter: `drop-shadow(0 0 ${4 * intensity}px ${color})` }}
                  />
                  {(isSel || c.threat === "high") && (
                    <text
                      x={x + 6}
                      y={y - 4}
                      fill={color}
                      fontSize={7.5}
                      fontFamily="monospace"
                      style={{ letterSpacing: "0.05em" }}
                    >
                      {c.name.slice(0, 14)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {selectedContact ? (
          <div
            className="rounded-md border p-2 text-[11px] space-y-1"
            style={{
              borderColor: THREAT_COLOR[selectedContact.threat],
              background: "oklch(0.18 0.04 235 / 0.5)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em] truncate"
                style={{ color: THREAT_COLOR[selectedContact.threat] }}
              >
                {selectedContact.name}
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
              <span className="hud-text text-right">{selectedContact.azimuth.toFixed(1)}°</span>
              <span>ELEVATION</span>
              <span className="hud-text text-right">{selectedContact.elevation.toFixed(1)}°</span>
              <span>RANGE</span>
              <span className="hud-text text-right">{selectedContact.range.toFixed(0)} km</span>
              <span>THREAT</span>
              <span className="text-right" style={{ color: THREAT_COLOR[selectedContact.threat] }}>
                {selectedContact.threat.toUpperCase()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground text-center">
            Tap a contact for live telemetry
          </p>
        )}
      </div>
    </HudPanel>
  );
}
