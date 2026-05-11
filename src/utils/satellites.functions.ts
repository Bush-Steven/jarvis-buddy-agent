import { createServerFn } from "@tanstack/react-start";

export type TLE = { name: string; line1: string; line2: string };

// Celestrak "active satellites" TLE feed — public, no key required.
const TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

export const fetchActiveTLEs = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ tles: TLE[]; error: string | null; fetchedAt: string }> => {
    try {
      const res = await fetch(TLE_URL, {
        headers: { "User-Agent": "JarvisHUD/1.0 (radar)" },
      });
      if (!res.ok) {
        return {
          tles: [],
          error: `Celestrak returned ${res.status}`,
          fetchedAt: new Date().toISOString(),
        };
      }
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const tles: TLE[] = [];
      for (let i = 0; i + 2 < lines.length; i += 3) {
        const name = lines[i].trim();
        const l1 = lines[i + 1];
        const l2 = lines[i + 2];
        if (l1?.startsWith("1 ") && l2?.startsWith("2 ")) {
          tles.push({ name, line1: l1, line2: l2 });
        }
      }
      // Cap to keep payload small — first 250 are enough to populate the scope.
      return {
        tles: tles.slice(0, 250),
        error: null,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("fetchActiveTLEs failed:", err);
      return {
        tles: [],
        error: "Orbital uplink unreachable",
        fetchedAt: new Date().toISOString(),
      };
    }
  }
);
