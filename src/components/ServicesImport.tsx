"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { importServices } from "@/app/_actions/import-services";
import { durationLabel, type ServiceDraft } from "@/lib/templates";

// The browser's built-in speech-to-text (Chrome, Edge, Safari). Not in TypeScript's DOM types yet.
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

/** Shrink phone photos so they upload fast (and stay under the server's size limit). */
async function photoToBase64(file: File): Promise<{ data: string; mediaType: "image/jpeg" }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1], mediaType: "image/jpeg" };
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

/** "Say your services" and "Upload price list": fill the services list without typing each one. */
export function ServicesImport(props: { businessType: string; services: ServiceDraft[]; onApply: (s: ServiceDraft[]) => void }) {
  const [mode, setMode] = useState<"none" | "talk">("none");
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const [found, setFound] = useState<ServiceDraft[] | null>(null);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const rec = useRef<Recognizer | null>(null);
  const wantListening = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    wantListening.current = false;
    rec.current?.stop();
  }, []);

  const stopListening = () => {
    wantListening.current = false;
    rec.current?.stop();
    setListening(false);
    setInterim("");
  };

  const startListening = () => {
    setError("");
    setMode("talk");
    const Ctor = getRecognizer();
    if (!Ctor) {
      setNoVoice(true);
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
      if (finals) setText((t) => (t ? `${t.trimEnd()} ${finals.trim()}` : finals.trim()));
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      wantListening.current = false;
      setListening(false);
      setError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Allow microphone access for this site in your browser, then try again." : "The microphone stopped. Tap Say your services to keep going.");
    };
    // Browsers stop after a pause; keep going until the owner taps Stop.
    r.onend = () => {
      if (wantListening.current) {
        try {
          r.start();
        } catch {
          setListening(false);
        }
      } else setListening(false);
    };
    rec.current = r;
    wantListening.current = true;
    try {
      r.start();
      setListening(true);
    } catch {
      setNoVoice(true);
    }
  };

  const read = (input: Parameters<typeof importServices>[0], from: string) =>
    start(async () => {
      setError("");
      setFound(null);
      const r = await importServices(input);
      if ("error" in r) setError(r.error);
      else {
        setFound(r.services);
        setSource(from);
      }
    });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    stopListening();
    setError("");
    try {
      if (file.type === "application/pdf") {
        if (file.size > 3_000_000) return setError("That PDF is too big. Try one under 3 MB, or a screenshot of it.");
        read({ businessType: props.businessType, file: { data: await fileToBase64(file), mediaType: "application/pdf" } }, "your price list");
      } else if (file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name)) {
        read({ businessType: props.businessType, file: await photoToBase64(file) }, "your price list");
      } else setError("Use a photo (JPG or PNG) or a PDF of your price list.");
    } catch {
      setError("Couldn't open that photo. Try a screenshot or a JPG.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const apply = (how: "replace" | "add") => {
    if (!found) return;
    if (how === "replace") props.onApply(found);
    else {
      // Same name as an existing service: update its price, time and deposit (keeping its questions). New names are added.
      const key = (n: string) => n.trim().toLowerCase();
      const mine = props.services.filter((s) => s.name.trim());
      const merged = mine.map((s) => {
        const f = found.find((x) => key(x.name) === key(s.name));
        return f ? { ...s, price: f.price || s.price, minutes: f.minutes, deposit: f.deposit || s.deposit } : s;
      });
      props.onApply([...merged, ...found.filter((f) => !mine.some((s) => key(s.name) === key(f.name)))]);
    }
    setFound(null);
    setText("");
    setMode("none");
  };

  return (
    <section aria-label="Add services faster" className="flex flex-col gap-3 rounded-[18px] bg-[#f4f1ff] p-4 shadow-[inset_0_0_0_1px_rgba(106,75,245,0.2)]">
      <div>
        <p className="font-display text-[15px] font-semibold">Skip the typing</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">Talk through your services and prices, or upload a photo or PDF of your price list. You&apos;ll check everything before it&apos;s added.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`btn ${listening ? "btn-warn" : "btn-primary"}`} disabled={busy} onClick={listening ? stopListening : startListening}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            {listening ? <rect x="7" y="7" width="10" height="10" rx="1.5" /> : <path d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zm-7 9a7 7 0 0014 0M12 19v3" />}
          </svg>
          {listening ? "Stop" : "Say your services"}
        </button>
        <button type="button" className="btn btn-ghost bg-card" disabled={busy} onClick={() => fileInput.current?.click()}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
          </svg>
          Upload price list
        </button>
        <input ref={fileInput} type="file" accept="image/*,application/pdf,.heic,.heif" className="sr-only" tabIndex={-1} aria-label="Price list photo or PDF" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      {mode === "talk" && (
        <div className="flex flex-col gap-2">
          {noVoice && (
            <p className="text-[13px] text-ink-2">
              Voice typing isn&apos;t available in this browser. Tap the 🎙 on your phone&apos;s keyboard to talk into the box below, or just type.
            </p>
          )}
          {listening && (
            <p className="flex items-center gap-2 text-[13px] font-semibold text-brand-ink" role="status">
              <span className="landing-ping size-2 rounded-full bg-danger" /> Listening… say each service, its price and about how long it takes.
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            What you said (you can fix anything here)
            <textarea
              className="input min-h-28 bg-card py-2.5 leading-relaxed"
              value={text + (interim ? (text ? " " : "") + interim : "")}
              onChange={(e) => {
                setInterim("");
                setText(e.target.value);
              }}
              placeholder="e.g. Silk press is 95 and takes about two and a half hours. Trims are 25, half an hour. Knotless braids medium are 220, six hours, with a 50 dollar deposit."
            />
          </label>
          <button
            type="button"
            className="btn btn-primary self-start"
            disabled={busy || !text.trim()}
            onClick={() => {
              stopListening();
              read({ businessType: props.businessType, text }, "what you said");
            }}
          >
            Turn into services
          </button>
        </div>
      )}

      {busy && <p role="status" className="text-sm text-brand-ink">Reading your services…</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {found && (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-3.5 shadow-[inset_0_0_0_1px_rgba(26,24,48,0.08)]">
          <p className="text-sm font-semibold">Found {found.length} service{found.length === 1 ? "" : "s"} from {source}:</p>
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-[13px]">
            {found.map((s, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-x-3 border-b border-line py-1.5 last:border-0">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted">
                  {[s.price ? `$${s.price}` : "price varies", durationLabel(s.minutes), s.deposit ? `$${s.deposit} deposit` : ""].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Times you didn&apos;t mention are a best guess. &ldquo;Add to my list&rdquo; updates services you already have with the same name. You can adjust anything after.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => apply("replace")}>Use these (replace my list)</button>
            <button type="button" className="btn btn-ghost" onClick={() => apply("add")}>Add to my list</button>
            <button type="button" className="btn btn-ghost" onClick={() => setFound(null)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
