import { useEffect, useRef, useState } from "react";
import maskImg from "@/assets/jarvis-mask.jpg";

type Props = {
  state: "idle" | "listening" | "thinking" | "speaking";
  size?: number;
  onActivate?: () => void;
};

export function JarvisFace({ state, size = 320, onActivate }: Props) {
  const [hover, setHover] = useState(false);
  const [pulse, setPulse] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Trigger a quick pulse on every state change
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(t);
  }, [state]);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 12, y: px * 12 });
  };

  const onLeave = () => {
    setHover(false);
    setTilt({ x: 0, y: 0 });
  };

  const intensity =
    state === "speaking" ? 1.4 : state === "thinking" ? 1.2 : state === "listening" ? 1.15 : 1;
  const aura =
    state === "thinking"
      ? "var(--hud-gold-bright)"
      : state === "speaking"
        ? "var(--hud-cyan-bright)"
        : "var(--hud-cyan)";

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width: size, height: size }}
      aria-label={`JARVIS face — ${state}`}
    >
      {/* Outer rotating HUD ring */}
      <div
        className="absolute inset-0 rounded-full reactor-ring pointer-events-none"
        style={{
          animation: "reactor-spin 24s linear infinite",
          opacity: 0.5,
        }}
      />
      <div
        className="absolute rounded-full reactor-ring pointer-events-none"
        style={{
          inset: -14,
          borderStyle: "dashed",
          animation: "reactor-spin-reverse 18s linear infinite",
          opacity: 0.4,
        }}
      />

      {/* Notches around the ring */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ animation: "reactor-spin 30s linear infinite" }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-0 h-2 w-px bg-[var(--hud-cyan-bright)]"
            style={{
              transform: `translateX(-50%) rotate(${i * 22.5}deg)`,
              transformOrigin: `50% ${size / 2}px`,
              boxShadow: "0 0 6px var(--hud-cyan-bright)",
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      {/* Interactive face */}
      <button
        ref={ref as unknown as React.RefObject<HTMLButtonElement>}
        type="button"
        onClick={onActivate}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={onLeave}
        onMouseMove={onMove}
        className="relative rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--hud-cyan-bright)] cursor-pointer"
        style={{
          width: size * 0.78,
          height: size * 0.78,
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${pulse ? 1.04 : hover ? 1.02 : 1})`,
          transition: "transform 200ms ease-out",
          boxShadow: `0 0 ${40 * intensity}px ${aura}, 0 0 ${90 * intensity}px ${aura}, inset 0 0 30px oklch(0.10 0.03 240)`,
          background: "var(--hud-deep)",
        }}
        aria-pressed={state === "listening"}
      >
        <img
          src={maskImg}
          alt="JARVIS — neural interface"
          draggable={false}
          className="h-full w-full object-cover"
          style={{
            filter:
              state === "thinking"
                ? "hue-rotate(20deg) brightness(1.15) contrast(1.1) saturate(1.2)"
                : state === "speaking"
                  ? "brightness(1.3) contrast(1.15) saturate(1.3)"
                  : state === "listening"
                    ? "brightness(1.15) saturate(1.2)"
                    : "brightness(1) saturate(1)",
            transition: "filter 400ms ease",
          }}
        />

        {/* Eye glow overlay — pulses with state */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "38%",
            left: "26%",
            width: "16%",
            height: "10%",
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--hud-cyan-bright) 0%, transparent 70%)",
            filter: "blur(6px)",
            opacity: state === "idle" ? 0.55 : 0.95,
            animation: "reactor-pulse 1.6s ease-in-out infinite",
            mixBlendMode: "screen",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "38%",
            right: "26%",
            width: "16%",
            height: "10%",
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--hud-cyan-bright) 0%, transparent 70%)",
            filter: "blur(6px)",
            opacity: state === "idle" ? 0.55 : 0.95,
            animation: "reactor-pulse 1.6s ease-in-out infinite",
            mixBlendMode: "screen",
          }}
        />

        {/* Scan sweep when thinking */}
        {state === "thinking" && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-[18%]"
            style={{
              background:
                "linear-gradient(180deg, transparent, oklch(0.92 0.18 200 / 0.45), transparent)",
              animation: "scan-sweep 1.6s linear infinite",
              mixBlendMode: "screen",
            }}
          />
        )}

        {/* Cyan vignette */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at center, transparent 55%, oklch(0.10 0.03 240 / 0.7) 100%)",
          }}
        />
      </button>

      {/* Speaking audio bars */}
      {state === "speaking" && (
        <div className="absolute -bottom-2 flex items-end gap-1 h-6">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-[var(--hud-cyan-bright)]"
              style={{
                height: "100%",
                transformOrigin: "bottom",
                animation: `audio-bar ${0.5 + (i % 3) * 0.15}s ease-in-out infinite`,
                animationDelay: `${i * 0.07}s`,
                boxShadow: "0 0 6px var(--hud-cyan-bright)",
              }}
            />
          ))}
        </div>
      )}

      {/* Status label */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.4em] hud-text whitespace-nowrap">
        {state === "idle" && "● TAP TO SPEAK"}
        {state === "listening" && "◉ LISTENING"}
        {state === "thinking" && "PROCESSING…"}
        {state === "speaking" && "▲ TRANSMITTING"}
      </div>
    </div>
  );
}
