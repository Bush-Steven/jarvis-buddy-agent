import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  query: z.string().min(1).max(120).optional(),
  max: z.number().int().min(1).max(20).default(10),
});

export type NewsArticle = {
  title: string;
  description: string | null;
  url: string;
  source: string;
  publishedAt: string;
  country: string; // ISO-2
  countryName: string;
  lat: number;
  lng: number;
};

// Country centroids for headline pins (ISO-2 → [lat, lng, name])
const COUNTRY_COORDS: Record<string, [number, number, string]> = {
  us: [39.5, -98.35, "United States"],
  gb: [54.0, -2.0, "United Kingdom"],
  ca: [56.13, -106.35, "Canada"],
  au: [-25.27, 133.77, "Australia"],
  in: [20.59, 78.96, "India"],
  de: [51.16, 10.45, "Germany"],
  fr: [46.6, 1.88, "France"],
  jp: [36.2, 138.25, "Japan"],
  cn: [35.86, 104.2, "China"],
  br: [-14.24, -51.92, "Brazil"],
  mx: [23.63, -102.55, "Mexico"],
  ru: [61.52, 105.32, "Russia"],
  it: [41.87, 12.57, "Italy"],
  es: [40.46, -3.75, "Spain"],
  nl: [52.13, 5.29, "Netherlands"],
  se: [60.13, 18.64, "Sweden"],
  no: [60.47, 8.47, "Norway"],
  ae: [23.42, 53.85, "United Arab Emirates"],
  sa: [23.89, 45.08, "Saudi Arabia"],
  kr: [35.91, 127.77, "South Korea"],
  sg: [1.35, 103.82, "Singapore"],
  za: [-30.56, 22.94, "South Africa"],
  ng: [9.08, 8.68, "Nigeria"],
  ar: [-38.42, -63.62, "Argentina"],
  ie: [53.41, -8.24, "Ireland"],
  ch: [46.82, 8.23, "Switzerland"],
  pl: [51.92, 19.13, "Poland"],
  tr: [38.96, 35.24, "Turkey"],
  ua: [48.38, 31.17, "Ukraine"],
  il: [31.05, 34.85, "Israel"],
  eg: [26.82, 30.8, "Egypt"],
  th: [15.87, 100.99, "Thailand"],
  id: [-0.79, 113.92, "Indonesia"],
  ph: [12.88, 121.77, "Philippines"],
  nz: [-40.9, 174.89, "New Zealand"],
  hk: [22.32, 114.17, "Hong Kong"],
  tw: [23.7, 120.96, "Taiwan"],
};

const ROTATING_COUNTRIES = Object.keys(COUNTRY_COORDS).slice(0, 18);

export const fetchWorldNews = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      return {
        articles: [] as NewsArticle[],
        error: "News uplink offline: GNews API key not configured.",
      };
    }

    try {
      // Fetch top headlines per country in parallel (cap to keep within free tier)
      const countries = ROTATING_COUNTRIES.slice(0, 8);
      const results = await Promise.all(
        countries.map(async (cc) => {
          const url = new URL("https://gnews.io/api/v4/top-headlines");
          url.searchParams.set("country", cc);
          url.searchParams.set("max", "2");
          url.searchParams.set("lang", "en");
          url.searchParams.set("apikey", apiKey);
          if (data.query) url.searchParams.set("q", data.query);

          const res = await fetch(url.toString());
          if (!res.ok) return [];
          const json = (await res.json()) as {
            articles?: Array<{
              title: string;
              description: string | null;
              url: string;
              publishedAt: string;
              source?: { name?: string };
            }>;
          };
          const [lat, lng, name] = COUNTRY_COORDS[cc];
          return (json.articles ?? []).map<NewsArticle>((a, i) => ({
            title: a.title,
            description: a.description,
            url: a.url,
            source: a.source?.name ?? "Unknown",
            publishedAt: a.publishedAt,
            country: cc,
            countryName: name,
            // Slight jitter so multiple pins per country don't overlap
            lat: lat + (i - 0.5) * 1.2,
            lng: lng + (i - 0.5) * 1.2,
          }));
        })
      );

      const articles = results.flat().slice(0, data.max * 2);
      return { articles, error: null };
    } catch (err) {
      console.error("fetchWorldNews failed:", err);
      return {
        articles: [] as NewsArticle[],
        error: "News service is currently unreachable.",
      };
    }
  });
