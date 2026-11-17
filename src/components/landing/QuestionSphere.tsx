"use client";

import { useEffect, useRef } from "react";

const QUESTIONS = [
  "Are you accepting new clients?", "What’s your availability this week?", "Do you take walk-ins or is it appointment only?", "How far in advance do I need to book?",
  "Do you have evening or weekend appointments?", "How do I book — online, text, or call?", "Do you require a deposit to book?", "What’s your cancellation or reschedule policy?",
  "What happens if I’m running late?", "Can I book multiple services in one appointment?", "How much is a women’s/men’s haircut?", "How much does color cost?",
  "Do prices vary based on hair length or thickness?", "Is a consultation free?", "What forms of payment do you accept?", "Do you charge extra for long or thick hair?",
  "Is the price for a blowout included with the cut?", "Do you offer any first-time client discounts?", "Do you sell gift cards?", "Is tipping expected, and can I tip by card?",
  "Do you do balayage / highlights / foils?", "Can you go from dark to blonde in one session?", "Do you do color correction?", "Do you offer extensions, and what type?",
  "Do you do keratin or smoothing treatments?", "Do you work with curly or textured hair?", "Do you do braids, locs, or protective styles?", "Do you do perms?",
  "Do you offer bridal or event styling?", "Do you do kids’ haircuts?", "Do I need a consultation before my color appointment?", "How long will my appointment take?",
  "Should I come with clean or dirty hair?", "Can I send you inspiration photos beforehand?", "Do you do a patch or strand test for color?", "Will my hair be damaged by bleaching?",
  "How many sessions will it take to reach my goal color?", "Can you work with box-dyed hair?", "What if I don’t like how it turns out?", "Is there a fix or adjustment policy after my appointment?",
  "How often should I come back for a trim or touch-up?", "How long will my color last?", "What products should I use at home?", "When can I wash my hair after coloring or a keratin treatment?",
  "Do you sell the products you use?", "How do I keep my blonde from turning brassy?", "Where are you located, and is there parking?", "How long have you been doing hair, and what do you specialize in?",
  "Can I see photos of your work or your Instagram?", "Can I bring a friend or my child with me?",
];

const SECONDS_PER_TURN = 70; // slower = bigger number
const TILT = -0.28; // sphere tilt toward the viewer (radians)
const GOLD = Math.PI * (3 - Math.sqrt(5));
const N = QUESTIONS.length;

// Spread the bubbles evenly over a sphere.
const POINTS = QUESTIONS.map((_, i) => {
  const y = 1 - (2 * (i + 0.5)) / N;
  const r = Math.sqrt(1 - y * y);
  const th = i * GOLD;
  return { x: r * Math.cos(th), y, z: r * Math.sin(th) };
});

/** A slowly turning globe of the questions clients send. Hover or tap a bubble to bring it forward. */
export function QuestionSphere() {
  const stage = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const hovered = useRef(-1);
  const renderRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let angle = 0;
    let last = performance.now();
    let frame = 0;
    let visible = true;

    const render = () => {
      const w = el.clientWidth, h = el.clientHeight;
      const R = Math.min(w, h) * 0.4, F = R * 3.7, cx = w / 2, cy = h / 2;
      const ca = Math.cos(angle), sa = Math.sin(angle), ct = Math.cos(TILT), st = Math.sin(TILT);
      for (let i = 0; i < N; i++) {
        const node = nodes.current[i];
        if (!node) continue;
        const p = POINTS[i];
        const x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca;
        const y2 = p.y * ct - z1 * st, z2 = p.y * st + z1 * ct;
        const persp = F / (F - z2 * R), depth = (z2 + 1) / 2, isH = i === hovered.current;
        const s = persp * (0.72 + 0.28 * depth) * Math.min(1, w / 1400 + 0.25);
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
      if (hovered.current < 0 && !reduce) angle = (angle + (dt / (SECONDS_PER_TURN * 1000)) * Math.PI * 2) % (Math.PI * 2);
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
    window.addEventListener("resize", render);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      el.removeEventListener("touchstart", clear);
      window.removeEventListener("resize", render);
    };
  }, []);

  const set = (i: number) => {
    hovered.current = i;
    renderRef.current();
  };
  const unset = (i: number) => {
    if (hovered.current === i) set(-1);
  };

  return (
    <div ref={stage} className="qsph-stage">
      {QUESTIONS.map((q, i) => {
        const im = i % 2 === 0;
        return (
          <div key={i} ref={(n) => { nodes.current[i] = n; }} className="qsph-node">
            <div
              tabIndex={0}
              className={`qsph-bub ${im ? "qsph-im" : "qsph-ig"}`}
              onMouseEnter={() => set(i)}
              onMouseLeave={() => unset(i)}
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
                  <path d="M0 0 C1 9 6 17 18 22 C9 22 3 20 0 17 Z" fill="#1982FC" />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
