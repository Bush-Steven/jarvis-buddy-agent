import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { jarvisChat } from "@/utils/jarvis.functions";
import { useJarvisVoice } from "@/hooks/useJarvisVoice";
import { JarvisFace } from "./JarvisFace";
import { HudCorners, HudPanel } from "./HudFrame";
import { SystemStats } from "./SystemStats";
import { Transcript, type ChatMessage } from "./Transcript";
import { InputBar } from "./InputBar";
import { WorldNewsMap } from "./WorldNewsMap";
import { PermissionsLock, usePermissions } from "./PermissionsLock";
import { AuditLogPanel, useAuditLog } from "./AuditLog";

const PC_CONTROL_PATTERNS = [
  /\b(open|launch|run|execute|kill|close|quit)\b.*\b(app|application|program|window|browser|terminal|file|folder)\b/i,
  /\b(shutdown|restart|reboot|sleep|lock screen|log ?out)\b/i,
  /\b(volume|brightness|wifi|bluetooth)\s+(up|down|on|off|to)\b/i,
  /\b(type|click|press|move (the )?(mouse|cursor))\b/i,
  /\b(create|delete|move|copy|rename)\s+(file|folder|directory)\b/i,
];

function isPcControlIntent(text: string) {
  return PC_CONTROL_PATTERNS.some((re) => re.test(text));
}

const SUGGESTIONS = [
  "Status report.",
  "What's the weather over Stark Tower?",
  "Draft a brief on quantum entanglement.",
  "Tell me a joke, J.",
];

export function JarvisInterface() {
  const chat = useServerFn(jarvisChat);
  const voice = useJarvisVoice();
  const { perms, loaded, grant, revoke } = usePermissions();
  const audit = useAuditLog();

  const handleGrant = useCallback(
    (allowPcControl: boolean, requireConfirm: boolean) => {
      grant(allowPcControl, requireConfirm);
      audit.log(
        "unlock",
        `Authorized — PC control ${allowPcControl ? "ON" : "OFF"}, confirm-each ${requireConfirm ? "ON" : "OFF"}.`
      );
    },
    [grant, audit]
  );

  const handleRevoke = useCallback(() => {
    audit.log("lock", "Session locked by operator. Permissions revoked.");
    revoke();
  }, [revoke, audit]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voiceReplies, setVoiceReplies] = useState(true);

  const reactorState: "idle" | "listening" | "thinking" | "speaking" =
    thinking ? "thinking" : speaking ? "speaking" : voice.listening ? "listening" : "idle";

  const send = useCallback(
    async (text: string) => {
      // PC-control gating + audit
      if (isPcControlIntent(text)) {
        audit.log("command_requested", `Detected PC directive: "${text}"`);
        if (!perms?.allowPcControl) {
          audit.log(
            "command_blocked",
            `Blocked — PC control disabled in permissions: "${text}"`
          );
          setErrorMsg(
            "PC control is currently disabled, sir. Re-authorize via the lock screen to permit."
          );
          return;
        }
        if (perms.requireConfirm) {
          const ok = window.confirm(
            `JARVIS requests authorization to execute:\n\n"${text}"\n\nProceed?`
          );
          if (!ok) {
            audit.log("command_blocked", `Operator denied: "${text}"`);
            setErrorMsg("Directive cancelled by operator.");
            return;
          }
        }
        audit.log("command_confirmed", `Cleared for execution: "${text}"`);
      }

      const userMsg: ChatMessage = { role: "user", content: text };
      const next = [...messages, userMsg];
      setMessages(next);
      setThinking(true);
      setErrorMsg(null);

      try {
        const result = await chat({ data: { messages: next } });
        if (result.error) {
          setErrorMsg(result.error);
        } else if (result.reply) {
          setMessages((m) => [...m, { role: "assistant", content: result.reply }]);
          if (voiceReplies) {
            setSpeaking(true);
            const u = voice.speak(result.reply);
            if (u) {
              u.onend = () => setSpeaking(false);
            } else {
              setSpeaking(false);
            }
          }
        }
      } catch (e) {
        console.error(e);
        setErrorMsg("Transmission failed. Please try again, sir.");
      } finally {
        setThinking(false);
      }
    },
    [chat, messages, voice, voiceReplies, perms, audit]
  );

  // Auto-submit when voice listening ends with a transcript
  useEffect(() => {
    if (!voice.listening && voice.liveTranscript && !thinking) {
      const text = voice.liveTranscript.trim();
      if (text.length > 0) {
        void send(text);
      }
    }
    // We intentionally watch `listening` flipping false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.listening]);

  const toggleListen = () => {
    if (voice.listening) voice.stop();
    else voice.start();
  };

  if (loaded && !perms) {
    return <PermissionsLock onUnlock={handleGrant} />;
  }

  return (
    <main className="scanlines relative min-h-screen w-full overflow-hidden">
      <HudCorners />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{
              background: "var(--hud-cyan-bright)",
              boxShadow: "0 0 12px var(--hud-cyan-bright)",
            }}
          />
          <h1 className="text-sm font-bold uppercase tracking-[0.5em] hud-text flicker">
            J.A.R.V.I.S.
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Mark VII · Stark Industries
          </span>
        </div>
        <div className="flex items-center gap-2">
          {voice.voices.length > 0 && (
            <select
              value={voice.selectedVoice?.voiceURI ?? ""}
              onChange={(e) => voice.selectVoice(e.target.value)}
              title="Select voice"
              className="text-[10px] font-bold uppercase tracking-[0.2em] hud-text bg-transparent border border-[var(--hud-cyan)] rounded px-2 py-1.5 max-w-[220px] hover:bg-[oklch(0.30_0.06_235)/0.4] transition-colors"
            >
              {voice.voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI} className="bg-background text-foreground">
                  {v.name} · {v.lang}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setVoiceReplies((v) => !v)}
            className="text-[10px] font-bold uppercase tracking-[0.25em] hud-text border border-[var(--hud-cyan)] rounded px-3 py-1.5 hover:bg-[oklch(0.30_0.06_235)/0.4] transition-colors"
          >
            Voice Reply: {voiceReplies ? "ON" : "OFF"}
          </button>
          <button
            onClick={handleRevoke}
            title="Lock JARVIS and revoke permissions"
            className="text-[10px] font-bold uppercase tracking-[0.25em] border border-[var(--hud-red)] rounded px-3 py-1.5 text-[var(--hud-red)] hover:bg-[oklch(0.30_0.08_25)/0.3] transition-colors"
          >
            🔒 Lock
          </button>
        </div>
      </header>

      {/* Main grid */}
      <div className="relative z-10 mx-auto grid max-w-7xl gap-5 px-6 pb-6 lg:grid-cols-[260px_1fr_260px]">
        {/* Left column */}
        <div className="space-y-5">
          <SystemStats />
          <HudPanel title="Suggested Directives" accent="gold">
            <ul className="space-y-2 text-xs">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => send(s)}
                    disabled={thinking}
                    className="w-full text-left rounded border border-transparent px-2 py-1.5 hover:border-[var(--hud-gold)] hover:bg-[oklch(0.25_0.04_235)/0.4] transition-colors disabled:opacity-40"
                  >
                    <span className="hud-text-gold">▸</span>{" "}
                    <span className="text-foreground/85">{s}</span>
                  </button>
                </li>
              ))}
            </ul>
          </HudPanel>
        </div>

        {/* Center: face */}
        <div className="flex flex-col items-center justify-center min-h-[460px] gap-14 py-8">
          <JarvisFace
            state={reactorState}
            size={340}
            onActivate={voice.supported ? toggleListen : undefined}
          />
          <div className="text-center max-w-md">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              {voice.listening
                ? "Speak — I'm listening"
                : thinking
                  ? "Computing response"
                  : speaking
                    ? "Transmitting"
                    : "Tap the face or type below"}
            </p>
            <p className="mt-2 text-sm text-foreground/70">
              "At your service, sir."
            </p>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <HudPanel title="Identity">
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">DESIGNATION</dt>
                <dd className="hud-text">JARVIS</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">CLEARANCE</dt>
                <dd className="hud-text">ALPHA</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">MODE</dt>
                <dd className="hud-text-gold">ADVISORY</dd>
              </div>
            </dl>
          </HudPanel>
          <HudPanel title="System Link">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Direct OS control pending desktop deployment. Cloud intelligence
              modules online: news, search, analysis.
            </p>
          </HudPanel>
          <AuditLogPanel entries={audit.entries} onClear={audit.clear} />
        </div>
      </div>

      {/* World news map */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-6">
        <WorldNewsMap />
      </section>

      {/* Bottom: transcript + input */}
      <section className="relative z-10 mx-auto max-w-5xl space-y-3 px-6 pb-8">
        <Transcript messages={messages} thinking={thinking} />
        {errorMsg && (
          <div className="hud-panel rounded-md border-[var(--hud-red)] px-3 py-2 text-xs text-[var(--hud-red)]">
            {errorMsg}
          </div>
        )}
        <InputBar
          onSubmit={send}
          disabled={thinking}
          listening={voice.listening}
          onToggleListen={toggleListen}
          speechSupported={voice.supported}
          liveTranscript={voice.liveTranscript}
        />
      </section>
    </main>
  );
}
