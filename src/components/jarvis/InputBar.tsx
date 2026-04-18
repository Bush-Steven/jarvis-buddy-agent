import { useEffect, useRef, useState } from "react";

type Props = {
  onSubmit: (text: string) => void;
  disabled: boolean;
  listening: boolean;
  onToggleListen: () => void;
  speechSupported: boolean;
  liveTranscript: string;
};

export function InputBar({
  onSubmit,
  disabled,
  listening,
  onToggleListen,
  speechSupported,
  liveTranscript,
}: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (listening) setText(liveTranscript);
  }, [liveTranscript, listening]);

  const submit = () => {
    const value = text.trim();
    if (!value || disabled) return;
    onSubmit(value);
    setText("");
  };

  return (
    <div className="hud-panel rounded-lg p-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleListen}
        disabled={!speechSupported || disabled}
        className="relative h-11 w-11 shrink-0 rounded-full border border-[var(--hud-cyan)] flex items-center justify-center transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: listening
            ? "var(--gradient-reactor)"
            : "oklch(0.20 0.04 235 / 0.6)",
          boxShadow: listening ? "var(--shadow-reactor)" : "var(--shadow-hud)",
        }}
        aria-label={listening ? "Stop listening" : "Start voice input"}
        title={
          speechSupported
            ? listening
              ? "Stop listening"
              : "Hold court — voice input"
            : "Voice input unavailable in this browser"
        }
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="2" width="6" height="13" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder={
          listening ? "Listening, sir…" : "Issue a directive, sir…"
        }
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground placeholder:tracking-wider px-2"
      />

      <button
        type="button"
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="h-11 px-5 rounded-md text-xs font-bold uppercase tracking-[0.25em] transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: "var(--gradient-hud)",
          color: "var(--hud-deep)",
          boxShadow: "var(--shadow-gold)",
        }}
      >
        Engage
      </button>
    </div>
  );
}
