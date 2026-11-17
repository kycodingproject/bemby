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
const isPhone = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));

/**
 * Talk instead of typing. `onText` receives each finished phrase; `interim` is what's being heard right now.
 * Keeps listening through pauses until stop() is called.
 *
 * Phones behave differently from computers: iPhones often never mark words as "final", and Android repeats
 * phrases in continuous mode. So on phones we listen one phrase at a time, and whatever was heard is kept
 * when listening ends instead of being thrown away.
 */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const rec = useRef<Recognizer | null>(null);
  const want = useRef(false);
  const live = useRef(""); // heard but not final yet
  const cb = useRef(onText);
  useEffect(() => {
    cb.current = onText;
  }, [onText]);

  /** Keep what was heard so far (used when listening ends before the browser "finalizes" it). */
  const flush = useCallback(() => {
    const t = live.current.trim();
    live.current = "";
    setInterim("");
    if (t) cb.current(t);
  }, []);

  const stop = useCallback(() => {
    want.current = false;
    flush();
    try {
      rec.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, [flush]);

  useEffect(() => () => {
    want.current = false;
    try {
      rec.current?.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const start = useCallback(() => {
    setError("");
    const Ctor = getRecognizer();
    if (!Ctor) {
      setError("Voice typing isn't available in this browser. Tap the 🎙 on your phone's keyboard instead, or type it.");
      return;
    }
    const r = new Ctor();
    r.continuous = !isPhone();
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    let done = 0; // results already handed over in this listening session
    const begin = () => {
      done = 0;
      r.start();
    };
    r.onresult = (e) => {
      let heard = "";
      for (let i = done; i < e.results.length; i++) {
        const res = e.results[i];
        const piece = res[0].transcript;
        if (res.isFinal && i === done) {
          if (piece.trim()) cb.current(piece.trim());
          done = i + 1;
        } else heard += piece;
      }
      live.current = heard;
      setInterim(heard);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      want.current = false;
      flush();
      setListening(false);
      setError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Allow microphone access for this site in your browser settings, then try again."
          : e.error === "network"
            ? "Voice typing needs an internet connection to your browser's speech service. Try again, or type it."
            : "The microphone stopped. Tap the mic to keep going.",
      );
    };
    // Each phrase (on phones) or long pause (on computers) ends a session: keep the words, then listen again.
    r.onend = () => {
      flush();
      if (!want.current) return setListening(false);
      try {
        begin();
      } catch {
        want.current = false;
        setListening(false);
      }
    };
    rec.current = r;
    want.current = true;
    try {
      begin();
      setListening(true);
    } catch {
      want.current = false;
      setError("Couldn't start the microphone. Try again.");
    }
  }, [flush]);

  return { listening, interim, error, start, stop };
}
