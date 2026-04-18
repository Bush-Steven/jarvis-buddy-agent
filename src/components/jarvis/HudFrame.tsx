import type { ReactNode } from "react";

export function HudCorners() {
  return (
    <>
      {/* Four corner brackets */}
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <div
          key={c}
          className="pointer-events-none fixed h-12 w-12 z-40"
          style={{
            top: c.startsWith("t") ? 16 : "auto",
            bottom: c.startsWith("b") ? 16 : "auto",
            left: c.endsWith("l") ? 16 : "auto",
            right: c.endsWith("r") ? 16 : "auto",
            borderTop: c.startsWith("t")
              ? "2px solid var(--hud-cyan-bright)"
              : "none",
            borderBottom: c.startsWith("b")
              ? "2px solid var(--hud-cyan-bright)"
              : "none",
            borderLeft: c.endsWith("l")
              ? "2px solid var(--hud-cyan-bright)"
              : "none",
            borderRight: c.endsWith("r")
              ? "2px solid var(--hud-cyan-bright)"
              : "none",
            boxShadow: "0 0 12px var(--hud-cyan)",
            opacity: 0.7,
          }}
        />
      ))}
    </>
  );
}

export function HudPanel({
  title,
  children,
  className = "",
  accent = "cyan",
}: {
  title: string;
  children: ReactNode;
  className?: string;
  accent?: "cyan" | "gold";
}) {
  return (
    <div className={`hud-panel rounded-lg p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor:
              accent === "gold"
                ? "var(--hud-gold-bright)"
                : "var(--hud-cyan-bright)",
            boxShadow:
              accent === "gold"
                ? "0 0 8px var(--hud-gold-bright)"
                : "0 0 8px var(--hud-cyan-bright)",
          }}
        />
        <h3
          className={`text-[10px] font-bold uppercase tracking-[0.3em] ${
            accent === "gold" ? "hud-text-gold" : "hud-text"
          }`}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}
