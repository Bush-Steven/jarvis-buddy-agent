import { createServerFn } from "@tanstack/react-start";

export type CyberThreat = {
  id: string;
  type: "DDoS" | "Malware" | "Phishing" | "Ransomware" | "Intrusion" | "BotNet" | "Exploit";
  severity: "low" | "medium" | "high" | "critical";
  origin: { country: string; lat: number; lng: number };
  target: { country: string; lat: number; lng: number };
  vector: string;
  explanation: string;
  detectedAt: string;
};

const NODES: Array<[string, number, number]> = [
  ["Russia", 55.75, 37.62],
  ["China", 39.9, 116.4],
  ["North Korea", 39.03, 125.75],
  ["Iran", 35.69, 51.42],
  ["United States", 38.9, -77.04],
  ["United Kingdom", 51.5, -0.12],
  ["Germany", 52.52, 13.4],
  ["Brazil", -15.78, -47.93],
  ["India", 28.61, 77.21],
  ["Japan", 35.68, 139.69],
  ["Ukraine", 50.45, 30.52],
  ["Israel", 31.78, 35.21],
  ["Australia", -35.28, 149.13],
  ["Singapore", 1.35, 103.82],
  ["Netherlands", 52.37, 4.89],
];

const TYPES: CyberThreat["type"][] = [
  "DDoS",
  "Malware",
  "Phishing",
  "Ransomware",
  "Intrusion",
  "BotNet",
  "Exploit",
];

const VECTORS: Record<CyberThreat["type"], { vector: string; explain: string }[]> = {
  DDoS: [
    {
      vector: "UDP amplification flood",
      explain:
        "Hostile node is reflecting massive UDP traffic off open DNS resolvers to overwhelm the target's edge bandwidth.",
    },
    {
      vector: "Layer-7 HTTP flood",
      explain:
        "Distributed botnet is hammering application endpoints with legitimate-looking requests to exhaust backend workers.",
    },
  ],
  Malware: [
    {
      vector: "Trojan dropper (Emotet variant)",
      explain:
        "Weaponised Office macro is staging a second-stage payload to harvest credentials and pivot through the network.",
    },
    {
      vector: "Wiper deployment",
      explain:
        "Destructive malware is overwriting MBRs across critical infrastructure — likely state-sponsored sabotage.",
    },
  ],
  Phishing: [
    {
      vector: "Credential harvesting page",
      explain:
        "Spoofed corporate login portal is collecting MFA tokens via a real-time reverse-proxy kit.",
    },
  ],
  Ransomware: [
    {
      vector: "LockBit affiliate intrusion",
      explain:
        "Initial access broker has handed off a network to a ransomware crew; encryption is staging now.",
    },
  ],
  Intrusion: [
    {
      vector: "Edge VPN zero-day",
      explain:
        "Unpatched perimeter appliance is being exploited for unauthenticated remote code execution.",
    },
  ],
  BotNet: [
    {
      vector: "Mirai-class IoT recruitment",
      explain:
        "Compromised routers and cameras are being conscripted into a global C2 mesh for future attacks.",
    },
  ],
  Exploit: [
    {
      vector: "CVE chain on public-facing service",
      explain:
        "Attacker is chaining a disclosure + privilege-escalation CVE to land a shell on the perimeter.",
    },
  ],
};

const SEVERITIES: CyberThreat["severity"][] = ["low", "medium", "high", "critical"];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// Deterministic-ish RNG seeded by time bucket so the feed feels live but stable for ~30s
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export const fetchCyberThreats = createServerFn({ method: "POST" }).handler(async () => {
  const bucket = Math.floor(Date.now() / 30_000);
  const rng = makeRng(bucket);
  const count = 14;

  const threats: CyberThreat[] = Array.from({ length: count }, (_, i) => {
    const originIdx = Math.floor(rng() * NODES.length);
    let targetIdx = Math.floor(rng() * NODES.length);
    if (targetIdx === originIdx) targetIdx = (targetIdx + 1) % NODES.length;
    const [oName, oLat, oLng] = NODES[originIdx];
    const [tName, tLat, tLng] = NODES[targetIdx];
    const type = pick(TYPES, rng);
    const v = pick(VECTORS[type], rng);
    const severity = pick(SEVERITIES, rng);

    return {
      id: `THR-${bucket}-${i}`,
      type,
      severity,
      origin: { country: oName, lat: oLat, lng: oLng },
      target: { country: tName, lat: tLat, lng: tLng },
      vector: v.vector,
      explanation: v.explain,
      detectedAt: new Date(Date.now() - Math.floor(rng() * 1000 * 60 * 30)).toISOString(),
    };
  });

  return { threats, bucket };
});
