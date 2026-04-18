import { useEffect, useRef } from "react";
import { HudPanel } from "./HudFrame";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function Transcript({
  messages,
  thinking,
}: {
  messages: ChatMessage[];
  thinking: boolean;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, thinking]);

  return (
    <HudPanel title="Communication Log" className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 text-sm min-h-[200px] max-h-[40vh]">
        {messages.length === 0 && !thinking && (
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Awaiting input, sir.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="space-y-1">
            <div
              className={`text-[10px] font-bold uppercase tracking-[0.25em] ${
                m.role === "user" ? "hud-text-gold" : "hud-text"
              }`}
            >
              {m.role === "user" ? "▶ USER" : "◀ JARVIS"}
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
              {m.content}
            </p>
          </div>
        ))}
        {thinking && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] hud-text">
              ◀ JARVIS
            </div>
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--hud-cyan-bright)] animate-pulse" />
              <span
                className="h-2 w-2 rounded-full bg-[var(--hud-cyan-bright)] animate-pulse"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-[var(--hud-cyan-bright)] animate-pulse"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </HudPanel>
  );
}
