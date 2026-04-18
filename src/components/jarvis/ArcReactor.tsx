type Props = {
  state: "idle" | "listening" | "thinking" | "speaking";
  size?: number;
};

export function ArcReactor({ state, size = 280 }: Props) {
  const isActive = state !== "idle";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`JARVIS reactor — ${state}`}
    >
      {/* Outer rotating ring */}
      <div
        className="absolute inset-0 rounded-full reactor-ring"
        style={{
          animation: "reactor-spin 18s linear infinite",
          opacity: isActive ? 1 : 0.55,
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-0 h-3 w-px bg-[var(--hud-cyan-bright)]"
            style={{
              transform: `translateX(-50%) rotate(${i * 30}deg)`,
              transformOrigin: `50% ${size / 2}px`,
              boxShadow: "0 0 6px var(--hud-cyan-bright)",
            }}
          />
        ))}
      </div>

      {/* Mid counter-rotating ring */}
      <div
        className="absolute rounded-full reactor-ring"
        style={{
          inset: size * 0.12,
          animation: "reactor-spin-reverse 12s linear infinite",
          borderStyle: "dashed",
          opacity: isActive ? 0.9 : 0.4,
        }}
      />

      {/* Inner ring with notches */}
      <div
        className="absolute rounded-full reactor-ring"
        style={{
          inset: size * 0.22,
          animation: "reactor-spin 8s linear infinite",
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1 rounded-full bg-[var(--hud-cyan-bright)]"
            style={{
              transform: `translateX(-50%) rotate(${i * 45}deg) translateY(-${size * 0.28}px)`,
              boxShadow: "0 0 8px var(--hud-cyan-bright)",
            }}
          />
        ))}
      </div>

      {/* Core */}
      <div
        className="reactor-core rounded-full"
        style={{
          width: size * 0.42,
          height: size * 0.42,
          animationDuration:
            state === "thinking"
              ? "0.8s"
              : state === "speaking"
                ? "0.5s"
                : state === "listening"
                  ? "1.2s"
                  : "2.4s",
        }}
      />

      {/* Inner triangle (Mark IV style) */}
      <svg
        className="absolute"
        width={size * 0.22}
        height={size * 0.22}
        viewBox="0 0 100 100"
        style={{ filter: "drop-shadow(0 0 6px var(--hud-cyan-bright))" }}
      >
        <polygon
          points="50,12 88,80 12,80"
          fill="none"
          stroke="var(--hud-deep)"
          strokeWidth="3"
        />
      </svg>

      {/* Status label */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.4em] hud-text">
        {state === "idle" && "STANDBY"}
        {state === "listening" && "● LISTENING"}
        {state === "thinking" && "PROCESSING…"}
        {state === "speaking" && "▲ TRANSMITTING"}
      </div>
    </div>
  );
}
