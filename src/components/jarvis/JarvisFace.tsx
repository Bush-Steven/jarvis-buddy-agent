import { useEffect, useRef, useState } from "react";
import maskImg from "@/assets/cybercrow.png";

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
    setTilt({ x: -py * 24, y: px * 24 });
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
        className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--hud-cyan-bright)] cursor-pointer"
        style={{
          width: size * 0.78,
          height: size * 0.78,
          transformStyle: "preserve-3d",
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${pulse ? 1.06 : hover ? 1.03 : 1})`,
          transition: "transform 200ms ease-out",
          boxShadow: `0 0 ${40 * intensity}px ${aura}, 0 0 ${90 * intensity}px ${aura}, 0 30px 60px -10px oklch(0.05 0.05 240 / 0.8)`,
          background: "radial-gradient(circle at 50% 40%, oklch(0.18 0.05 240) 0%, oklch(0.06 0.03 240) 75%)",
          borderRadius: "50%",
          overflow: "hidden",
        }}
        aria-pressed={state === "listening"}
      >
        {/* Depth backdrop layer (pushed back in 3D) */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            transform: "translateZ(-40px) scale(0.9)",
            background:
              "radial-gradient(circle at 50% 50%, var(--hud-cyan) 0%, transparent 60%)",
            opacity: 0.35,
            filter: "blur(20px)",
          }}
        />

        {/* Main logo — lifted forward in 3D space */}
        <img
          src={maskImg}
          alt="CyberCrow — neural interface"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            transform: `translateZ(40px) scale(${hover ? 1.05 : 1})`,
            transition: "transform 300ms ease-out, filter 400ms ease",
            filter:
              state === "thinking"
                ? "drop-shadow(0 12px 24px oklch(0.05 0.05 240 / 0.9)) hue-rotate(15deg) brightness(1.15) contrast(1.1) saturate(1.3)"
                : state === "speaking"
                  ? "drop-shadow(0 12px 24px oklch(0.05 0.05 240 / 0.9)) brightness(1.35) contrast(1.15) saturate(1.4)"
                  : state === "listening"
                    ? "drop-shadow(0 12px 24px oklch(0.05 0.05 240 / 0.9)) brightness(1.2) saturate(1.25)"
                    : "drop-shadow(0 10px 20px oklch(0.05 0.05 240 / 0.85)) brightness(1.05)",
          }}
        />

        {/* Crow eye glow — positioned over the actual eye */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "33%",
            left: "52%",
            width: "10%",
            height: "7%",
            borderRadius: "50%",
            transform: "translateZ(60px)",
            background: "radial-gradient(circle, var(--hud-cyan-bright) 0%, transparent 70%)",
            filter: "blur(4px)",
            opacity: state === "idle" ? 0.7 : 1,
            animation: "reactor-pulse 1.6s ease-in-out infinite",
            mixBlendMode: "screen",
          }}
        />

        {/* Specular highlight that follows tilt */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            transform: "translateZ(50px)",
            background: `radial-gradient(circle at ${50 + tilt.y * 2}% ${50 - tilt.x * 2}%, oklch(0.95 0.1 220 / 0.18) 0%, transparent 40%)`,
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
