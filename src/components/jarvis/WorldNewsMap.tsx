import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ClientOnly } from "@tanstack/react-router";
import { fetchWorldNews, type NewsArticle } from "@/utils/news.functions";
import { HudPanel } from "./HudFrame";

function MapInner({ articles }: { articles: NewsArticle[] }) {
  const [Comp, setComp] = useState<null | {
    MapContainer: typeof import("react-leaflet").MapContainer;
    TileLayer: typeof import("react-leaflet").TileLayer;
    CircleMarker: typeof import("react-leaflet").CircleMarker;
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

  const { MapContainer, TileLayer, CircleMarker, Popup } = Comp;

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
      {articles.map((a, i) => (
        <CircleMarker
          key={`${a.url}-${i}`}
          center={[a.lat, a.lng]}
          radius={6}
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
    </MapContainer>
  );
}

export function WorldNewsMap() {
  const fetchNews = useServerFn(fetchWorldNews);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNews({ data: { max: 10 } });
      setArticles(res.articles);
      if (res.error) setError(res.error);
      setLastSync(new Date());
    } catch {
      setError("Transmission failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <HudPanel title="Global Intelligence Feed" accent="cyan">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em]">
          <span className="text-muted-foreground">
            {articles.length} active dispatches
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            className="hud-text border border-[var(--hud-cyan)] rounded px-2 py-1 hover:bg-[oklch(0.30_0.06_235)/0.4] transition-colors disabled:opacity-40"
          >
            {loading ? "Syncing…" : "Refresh"}
          </button>
        </div>

        <div
          className="relative h-[320px] w-full overflow-hidden rounded-md border"
          style={{ borderColor: "var(--hud-cyan)" }}
        >
          <ClientOnly fallback={<div className="h-full w-full bg-[var(--hud-deep)]" />}>
            <MapInner articles={articles} />
          </ClientOnly>
        </div>

        {error && (
          <p className="text-[11px] text-[var(--hud-red)]">{error}</p>
        )}
        {lastSync && (
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground" suppressHydrationWarning>
            Last sync · {lastSync.toLocaleTimeString("en-GB", { hour12: false })}
          </p>
        )}
      </div>
    </HudPanel>
  );
}
