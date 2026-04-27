import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VOICE_STORAGE_KEY = "jarvis.voice.uri.v1";

// Hints for "premium / human-clear" voices across OS/browsers
const PREMIUM_HINTS =
  /(neural|enhanced|premium|natural|online|google|microsoft|siri|eloquence)/i;
const BRITISH_NAME_HINTS =
  /(uk|british|england|daniel|arthur|oliver|george|ryan|libby|sonia|kate|serena|martha|hazel|mia)/i;

function scoreVoice(v: SpeechSynthesisVoice): number {
  let score = 0;
  const lang = (v.lang || "").toLowerCase();
  const name = v.name || "";
  if (lang.startsWith("en-gb")) score += 100;
  else if (lang.startsWith("en")) score += 40;
  if (BRITISH_NAME_HINTS.test(name)) score += 60;
  if (PREMIUM_HINTS.test(name)) score += 50;
  // Male British JARVIS-ish names get a small bump
  if (/(daniel|arthur|oliver|george|ryan)/i.test(name)) score += 20;
  if (v.localService) score += 5;
  if (v.default) score += 2;
  return score;
}

// Minimal Web Speech API typings (avoid using `any`)
interface SRAlternative {
  transcript: string;
}
interface SRResult {
  0: SRAlternative;
  isFinal: boolean;
}
interface SRResultList {
  length: number;
  [index: number]: SRResult;
}
interface SREvent {
  resultIndex: number;
  results: SRResultList;
}
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}
type SRConstructor = new () => SR;

export function useJarvisVoice() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recogRef = useRef<SR | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SRConstructor;
      webkitSpeechRecognition?: SRConstructor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const r = new Ctor();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = "";
      let final = finalRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      finalRef.current = final;
      setLiveTranscript((final + interim).trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    return () => {
      try {
        r.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recogRef.current) return;
    finalRef.current = "";
    setLiveTranscript("");
    try {
      recogRef.current.start();
      setListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    if (!recogRef.current) return;
    try {
      recogRef.current.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const clean = text
      .replace(/```[\s\S]*?```/g, " code block. ")
      .replace(/[*_#`>]/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .slice(0, 600);
    const u = new SpeechSynthesisUtterance(clean);
    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => /UK|British|Daniel|Arthur|Oliver/i.test(v.name)) ??
      voices.find((v) => v.lang?.startsWith("en-GB")) ??
      voices[0];
    if (preferred) u.voice = preferred;
    u.rate = 1.02;
    u.pitch = 0.9;
    synth.speak(u);
    return u;
  }, []);

  return { supported, listening, liveTranscript, start, stop, speak };
}
