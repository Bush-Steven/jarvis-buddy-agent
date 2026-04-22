import { Fragment, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ClientOnly } from "@tanstack/react-router";
import { fetchWorldNews, type NewsArticle } from "@/utils/news.functions";
import { fetchCyberThreats, type CyberThreat } from "@/utils/threats.functions";
import { HudPanel } from "./HudFrame";

const SEVERITY_COLOR: Record<CyberThreat["severity"], string> = {
  low: "oklch(0.85 0.15 95)",
  medium: "oklch(0.78 0.18 60)",
  high: "oklch(0.7 0.22 35)",
  critical: "oklch(0.65 0.25 20)",
};

const SEVERITY_RADIUS: Record<CyberThreat["severity"], number> = {
  low: 4,
  medium: 6,
  high: 8,
  critical: 10,
};

function MapInner({
  articles,
  threats,
  showNews,
  showThreats,
  onSelectThreat,
}: {
  articles: NewsArticle[];
  threats: CyberThreat[];
  showNews: boolean;
  showThreats: boolean;
  onSelectThreat: (t: CyberThreat) => void;
}) {
  const [Comp, setComp] = useState<null | {
    MapContainer: typeof import("react-leaflet").MapContainer;
    TileLayer: typeof import("react-leaflet").TileLayer;
    CircleMarker: typeof import("react-leaflet").CircleMarker;
    Polyline: typeof import("react-leaflet").Polyline;
    Popup: typeof import("react-leaflet").Popup;
  }>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const rl = await import("react-leaflet");
      await import("leaflet/dist/leaflet.css");
      if (mounted)
        setComp({
          MapContainer: rl.MapContainer,
          TileLayer: rl.TileLayer,
          CircleMarker: rl.CircleMarker,
          Polyline: rl.Polyline,
          Popup: rl.Popup,
        });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!Comp) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] hud-text">
        Initializing satellite uplink…
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Polyline, Popup } = Comp;

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={6}
      worldCopyJump
      style={{
        height: "100%",
        width: "100%",
        background: "var(--hud-deep)",
      }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
      />

      {/* News pins */}
      {showNews &&
        articles.map((a, i) => (
          <CircleMarker
            key={`news-${a.url}-${i}`}
            center={[a.lat, a.lng]}
            radius={5}
            pathOptions={{
              color: "oklch(0.92 0.18 200)",
              fillColor: "oklch(0.82 0.16 210)",
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1 max-w-[260px] text-foreground">
                <p className="text-[10px] font-bold uppercase tracking-widest hud-text-gold">
                  {a.countryName} · {a.source}
                </p>
                <p className="text-sm font-bold leading-snug">{a.title}</p>
                {a.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {a.description}
                  </p>
                )}
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-[11px] uppercase tracking-[0.2em] hud-text underline"
                >
                  Open dispatch →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}

      {/* Cyber threat attack vectors */}
      {showThreats &&
        threats.map((t) => {
          const color = SEVERITY_COLOR[t.severity];
          return (
            <Fragment key={t.id}>
              <Polyline
                positions={[
                  [t.origin.lat, t.origin.lng],
                  [t.target.lat, t.target.lng],
                ]}
                pathOptions={{
                  color,
                  weight: t.severity === "critical" ? 2.2 : 1.4,
                  opacity: 0.7,
                  dashArray: "6 6",
                }}
              />
              <CircleMarker
                center={[t.origin.lat, t.origin.lng]}
                radius={3}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.9,
                  weight: 1,
                }}
              />
              <CircleMarker
                center={[t.target.lat, t.target.lng]}
                radius={SEVERITY_RADIUS[t.severity]}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.45,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => onSelectThreat(t),
                }}
              >
                <Popup>
                  <div className="space-y-1 max-w-[280px] text-foreground">
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color }}
                    >
                      {t.severity} · {t.type}
                    </p>
                    <p className="text-sm font-bold leading-snug">
                      {t.origin.country} → {t.target.country}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.15em] hud-text-gold">
                      Vector: {t.vector}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.explanation}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            </Fragment>
          );
        })}
    </MapContainer>
  );
}

export function WorldNewsMap() {
  const fetchNews = useServerFn(fetchWorldNews);
  const fetchThreats = useServerFn(fetchCyberThreats);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [threats, setThreats] = useState<CyberThreat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showNews, setShowNews] = useState(true);
  const [showThreats, setShowThreats] = useState(true);
  const [selectedThreat, setSelectedThreat] = useState<CyberThreat | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [newsRes, threatRes] = await Promise.all([
        fetchNews({ data: { max: 10 } }),
        fetchThreats(),
      ]);
      setArticles(newsRes.articles);
      setThreats(threatRes.threats);
      if (!selectedThreat && threatRes.threats.length) {
        setSelectedThreat(
          threatRes.threats.find((t) => t.severity === "critical") ??
            threatRes.threats[0]
        );
      }
      if (newsRes.error) setError(newsRes.error);
      setLastSync(new Date());
    } catch {
      setError("Transmission failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const t of threats) c[t.severity]++;
    return c;
  }, [threats]);

  return (
    <HudPanel title="Global Intelligence Feed · Cyber Threat Map" accent="cyan">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.25em]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>{articles.length} dispatches</span>
            <span className="hud-text">·</span>
            <span>{threats.length} active threats</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNews((v) => !v)}
              className={`rounded border px-2 py-1 transition-colors ${
                showNews
                  ? "hud-text border-[var(--hud-cyan)] bg-[oklch(0.30_0.06_235)/0.4]"
                  : "border-muted text-muted-foreground"
              }`}
            >
              News
            </button>
            <button
              onClick={() => setShowThreats((v) => !v)}
              className={`rounded border px-2 py-1 transition-colors ${
                showThreats
                  ? "border-[var(--hud-red)] text-[var(--hud-red)] bg-[oklch(0.3_0.1_25)/0.3]"
                  : "border-muted text-muted-foreground"
              }`}
            >
              Threats
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="hud-text border border-[var(--hud-cyan)] rounded px-2 py-1 hover:bg-[oklch(0.30_0.06_235)/0.4] transition-colors disabled:opacity-40"
            >
              {loading ? "Syncing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Severity legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.2em]">
          {(["low", "medium", "high", "critical"] as const).map((sev) => (
            <div key={sev} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: SEVERITY_COLOR[sev],
                  boxShadow: `0 0 6px ${SEVERITY_COLOR[sev]}`,
                }}
              />
              <span className="text-muted-foreground">{sev}</span>
              <span className="hud-text">{counts[sev]}</span>
            </div>
          ))}
        </div>

        <div
          className="relative h-[360px] w-full overflow-hidden rounded-md border"
          style={{ borderColor: "var(--hud-cyan)" }}
        >
          <ClientOnly fallback={<div className="h-full w-full bg-[var(--hud-deep)]" />}>
            <MapInner
              articles={articles}
              threats={threats}
              showNews={showNews}
              showThreats={showThreats}
              onSelectThreat={setSelectedThreat}
            />
          </ClientOnly>
        </div>

        {/* Threat explanation panel */}
        {selectedThreat && (
          <div
            className="rounded-md border p-3 text-xs space-y-1.5"
            style={{
              borderColor: SEVERITY_COLOR[selectedThreat.severity],
              background: "oklch(0.18 0.04 235 / 0.5)",
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ color: SEVERITY_COLOR[selectedThreat.severity] }}
              >
                {selectedThreat.severity} · {selectedThreat.type}
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {selectedThreat.id}
              </span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {selectedThreat.origin.country}{" "}
              <span className="hud-text">→</span>{" "}
              {selectedThreat.target.country}
            </p>
            <p className="text-[11px] uppercase tracking-[0.15em] hud-text-gold">
              {selectedThreat.vector}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {selectedThreat.explanation}
            </p>
          </div>
        )}

        {error && <p className="text-[11px] text-[var(--hud-red)]">{error}</p>}
        {lastSync && (
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            suppressHydrationWarning
          >
            Last sync · {lastSync.toLocaleTimeString("en-GB", { hour12: false })}
          </p>
        )}
      </div>
    </HudPanel>
  );
}
