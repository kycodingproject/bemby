"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SERVICE_QUESTIONS } from "./questions";

const SECONDS_PER_TURN = 70; // slower = bigger number
const TILT = -0.28; // sphere tilt toward the viewer (radians)
const GOLD = Math.PI * (3 - Math.sqrt(5));
const NAMES = Object.keys(SERVICE_QUESTIONS);

/** Spread n bubbles evenly over a sphere. */
const pointsFor = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const th = i * GOLD;
    return { x: r * Math.cos(th), y, z: r * Math.sin(th) };
  });

/**
 * A slowly turning globe of the questions clients send, with a tab per kind of business.
 * Hover or tap a bubble to bring it forward.
 */
export function QuestionSphere({ className = "" }: { className?: string }) {
  const [tab, setTab] = useState(NAMES[0]);
  const [shown, setShown] = useState(NAMES[0]); // the list on screen (changes after the fade-out)
  const [swapping, setSwapping] = useState(false);
  const list = SERVICE_QUESTIONS[shown];
  const points = useMemo(() => pointsFor(list.length), [list.length]);

  const stage = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const pts = useRef(points);
  const hovered = useRef(-1); // the question being looked at (spun to the front)
  const lockUntil = useRef(0); // ignore other bubbles sliding under the cursor while the sphere turns
  const renderRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let yaw = 0; // spin around the vertical axis
    let pitch = TILT; // tilt toward the viewer
    let last = performance.now();
    let frame = 0;
    let visible = true;

    const render = () => {
      const w = el.clientWidth, h = el.clientHeight;
      // Fit the sphere to the narrower side so bubbles stay inside the column next to the headline.
      const R = Math.min(w * 0.36, h * 0.4), F = R * 3.7, cx = w / 2, cy = h / 2;
      const ca = Math.cos(yaw), sa = Math.sin(yaw), ct = Math.cos(pitch), st = Math.sin(pitch);
      const fit = Math.min(1, w / 1400 + 0.25);
      const P = pts.current;
      for (let i = 0; i < P.length; i++) {
        const node = nodes.current[i];
        if (!node) continue;
        const p = P[i];
        const x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca;
        const y2 = p.y * ct - z1 * st, z2 = p.y * st + z1 * ct;
        const persp = F / (F - z2 * R), depth = (z2 + 1) / 2, isH = i === hovered.current;
        const s = persp * (0.72 + 0.28 * depth) * fit;
        node.style.transform = `translate(${cx + x1 * R * persp}px,${cy - y2 * R * persp}px) translate(-50%,-50%) scale(${s})`;
        node.style.opacity = String(isH ? 1 : 0.18 + 0.82 * depth);
        node.style.zIndex = String(isH ? 1000 : Math.round(depth * 500));
        node.classList.toggle("is-hover", isH);
      }
    };
    renderRef.current = render;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      const h = hovered.current;
      const p = h >= 0 ? pts.current[h] : null;
      // Ease toward the target so the turn feels smooth (instant with reduced motion).
      const k = reduce ? 1 : 1 - Math.exp(-dt / 220);
      if (p) {
        // Turn the sphere until this question faces the viewer, dead center.
        const toYaw = Math.atan2(-p.x, p.z);
        const toPitch = Math.atan2(p.y, Math.hypot(p.x, p.z));
        let d = (toYaw - yaw) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        yaw += d * k;
        pitch += (toPitch - pitch) * k;
      } else {
        if (!reduce) yaw = (yaw + (dt / (SECONDS_PER_TURN * 1000)) * Math.PI * 2) % (Math.PI * 2);
        pitch += (TILT - pitch) * k;
      }
      render();
      if (visible) frame = requestAnimationFrame(tick);
    };
    // Only animate while it's on screen.
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    });
    io.observe(el);
    const clear = () => {
      hovered.current = -1;
      render();
    };
    el.addEventListener("touchstart", clear, { passive: true });
    el.addEventListener("mouseleave", clear); // pointer left the sphere: go back to spinning
    window.addEventListener("resize", render);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      el.removeEventListener("touchstart", clear);
      el.removeEventListener("mouseleave", clear);
      window.removeEventListener("resize", render);
    };
  }, []);

  // A new list of questions: lay the new bubbles out on the sphere straight away.
  useEffect(() => {
    pts.current = points;
    hovered.current = -1;
    renderRef.current();
  }, [points, shown]);

  const select = (name: string) => {
    if (name === tab) return;
    setTab(name);
    setSwapping(true);
    setTimeout(() => {
      setShown(name);
      setSwapping(false);
    }, 250);
  };
  const set = (i: number) => {
    hovered.current = i;
    renderRef.current();
  };
  /** The pointer moved onto a question: spin it to the front (unless the sphere is still turning to the last one). */
  const look = (i: number, at: number) => {
    if (i === hovered.current || at < lockUntil.current) return;
    lockUntil.current = at + 700;
    set(i);
  };
  const unset = (i: number) => {
    if (hovered.current === i) set(-1);
  };

  return (
    <div className={`qsph ${className}`}>
      <div className="qsph-tabs" role="tablist" aria-label="Choose a service">
        {NAMES.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={name === tab} className="qsph-tab" onClick={() => select(name)}>
            {name}
          </button>
        ))}
      </div>
      <div ref={stage} className={`qsph-stage ${swapping ? "is-swapping" : ""}`} role="tabpanel" aria-label={`Questions ${tab === "All" ? "clients" : `${tab.toLowerCase()} clients`} ask`}>
        {list.map((q, i) => {
          const kind = i % 3; // received iMessage grey, Instagram grey, dark
          const im = kind === 0;
          return (
            <div key={`${shown}-${i}`} ref={(n) => { nodes.current[i] = n; }} className="qsph-node">
              <div
                tabIndex={0}
                className={`qsph-bub ${["qsph-im", "qsph-ig", "qsph-dk"][kind]}`}
                onPointerMove={(e) => e.pointerType === "mouse" && look(i, e.timeStamp)}
                onFocus={() => set(i)}
                onBlur={() => unset(i)}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  set(hovered.current === i ? -1 : i);
                }}
              >
                {q}
                {im && (
                  <svg aria-hidden width="18" height="22" viewBox="0 0 18 22">
                    <path d="M0 0 C1 9 6 17 18 22 C9 22 3 20 0 17 Z" fill="#E9E9EB" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
