"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The browser's built-in speech-to-text (Chrome, Edge, Safari incl. iPhone). Not in TypeScript's DOM types yet.
interface SpeechResultList { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } }
interface Recognizer {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: SpeechResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognizerCtor = new () => Recognizer;
const getRecognizer = (): RecognizerCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/**
 * Talk instead of typing. `onText` receives each finished phrase; `interim` is what's being heard right now.
 * Keeps listening through pauses until stop() is called.
 */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const rec = useRef<Recognizer | null>(null);
  const want = useRef(false);
  const cb = useRef(onText);
  useEffect(() => {
    cb.current = onText;
  }, [onText]);

  const stop = useCallback(() => {
    want.current = false;
    rec.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  useEffect(() => () => {
    want.current = false;
    rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    setError("");
    const Ctor = getRecognizer();
    if (!Ctor) {
      setError("Voice typing isn't available in this browser. Tap the 🎙 on your phone's keyboard instead, or type it.");
      return;
    }
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    r.onresult = (e) => {
      let finals = "";
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals += piece;
        else live += piece;
      }
      if (finals.trim()) cb.current(finals.trim());
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      want.current = false;
      setListening(false);
      setError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Allow microphone access for this site in your browser, then try again." : "The microphone stopped. Tap the mic to keep going.");
    };
    // Browsers stop after a pause; keep going until the owner taps stop.
    r.onend = () => {
      if (want.current) {
        try {
          r.start();
        } catch {
          setListening(false);
        }
      } else setListening(false);
    };
    rec.current = r;
    want.current = true;
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Couldn't start the microphone. Try again.");
    }
  }, []);

  return { listening, interim, error, start, stop };
}
