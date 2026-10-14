"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

/** One thing with a logo and an entry in the text box: an app, an employer, a
 *  school. The three sections differ only in what fills these fields.
 *  `crowned` marks the flagship — set it on one mark in the whole file, or the
 *  crown stops meaning anything. */
type Mark = {
  slug: string;
  name: string;
  meta: string;
  desc: string;
  logo: string;
  crowned?: boolean;
};

type Section = { key: string; label: string; short: string; marks: Mark[] };

const SECTIONS: Section[] = [
  {
    key: "built",
    label: "Things I've built",
    short: "Built",
    marks: [
      {
        slug: "readio",
        name: "Readio AI",
        meta: "2025",
        desc: "Turns PDFs, EPUBs, web articles and photographed pages into audiobooks. It finds the chapters, reads them aloud and keeps playing in the background.",
        logo: "/readio.png",
      },
      {
        slug: "habidots",
        name: "Habidots",
        meta: "2026",
        desc: "A habit tracker where every day is a dot. Build streaks, set reminders, earn badges, read your progress in analytics and keep habits on your home screen.",
        logo: "/habidots.png",
      },
      {
        slug: "buildsuite",
        name: "BuildSuite",
        meta: "2024",
        desc: "Construction management for builders and contractors: follow every site, keep materials and inventory in check, and handle HR for the crew from one app.",
        logo: "/buildsuite.png",
      },
      {
        slug: "travafa",
        name: "Travafa",
        meta: "2024",
        desc: "An AI trip planner you build with friends. Plan the itinerary together, get AI suggestions on where to go, and split the costs in one shared trip.",
        logo: "/travafa.png",
        crowned: true,
      },
      {
        slug: "dog-on-walk",
        name: "Dog on Walk",
        meta: "2026",
        desc: "A Pomodoro focus timer: while you focus, your dog walks. The scene follows the real time and weather, the dog can match your own, and friends can walk together.",
        logo: "/dog-on-walk.png",
      },
      {
        slug: "delights",
        name: "Delights",
        meta: "2026",
        desc: "The website for a milkshake and snack shop, plus a staff-only POS behind Google sign-in that runs the counter, kitchen orders, menu, inventory and reports.",
        logo: "/delights.png",
      },
    ],
  },
  {
    key: "worked",
    // Oldest first, so the set builds up to the current role rather than
    // counting back from it — the titles climb with it.
    // Casing is LinkedIn's own: ZenDynamix, not Zendynamix.
    label: "Where I've worked",
    short: "Worked",
    marks: [
      {
        slug: "cognizant",
        name: "Cognizant",
        meta: "Feb 2021 — Mar 2022",
        desc: "Programmer Analyst",
        logo: "/cognizant.jpg",
      },
      {
        slug: "zendynamix",
        name: "ZenDynamix",
        meta: "Mar 2022 — Mar 2023",
        desc: "React & Flutter Developer",
        logo: "/zendynamix.jpg",
      },
      {
        slug: "buildsuite",
        name: "BuildSuite",
        meta: "Jun 2023 — Dec 2024",
        desc: "Flutter Developer",
        // The app icon, not the 200px company logo off LinkedIn: same mark at
        // five times the resolution. Appearing in both sections is the point —
        // the product in one, the employer in the other.
        logo: "/buildsuite.png",
      },
      {
        slug: "travafa",
        name: "Travafa",
        meta: "Jan 2024 — Now",
        // U+2011 non-breaking hyphen, so the line breaks after "and" rather
        // than mid-word at "co-".
        desc: "Front-end lead and co‑founder",
        logo: "/travafa.png",
      },
    ],
  },
  {
    key: "studied",
    label: "Where I studied",
    short: "Studied",
    marks: [
      {
        slug: "christ-college",
        name: "Christ College of Engineering and Technology",
        meta: "2016 — 2020",
        desc: "B.Tech Electronics and Communication",
        logo: "/christ-college.jpg",
      },
      {
        slug: "amalorpavam",
        name: "Amalorpavam Higher Secondary School",
        meta: "2012 — 2016",
        desc: "Higher secondary",
        logo: "/amalorpavam.jpg",
      },
    ],
  },
];

/** The reel, one entry per scroll step: the intro, every mark in order, then
 *  the contact screen. Scroll is the only source of truth for which step is on
 *  screen — the arrows, tabs and icons all just scroll the page to a step. */
type Step =
  | { kind: "intro" }
  | { kind: "mark"; s: number; i: number }
  | { kind: "contact" };

const STEPS: Step[] = [
  { kind: "intro" },
  ...SECTIONS.flatMap((sec, s) =>
    sec.marks.map((_, i): Step => ({ kind: "mark", s, i })),
  ),
  { kind: "contact" },
];

/** Index of each section's first step, for the level tabs and for icons in the
 *  contact ring, which jump back to where their mark was introduced. */
const FIRST_STEP = SECTIONS.map((_, s) =>
  STEPS.findIndex((st) => st.kind === "mark" && st.s === s),
);

/** Every distinct logo, in order of first appearance — BuildSuite and Travafa
 *  appear in two sections but get one seat in the contact ring. */
const RING = SECTIONS.flatMap((sec, s) =>
  sec.marks.map((m, i) => ({ s, i, logo: m.logo })),
).filter((m, n, all) => all.findIndex((o) => o.logo === m.logo) === n);

/** Height of the tallest text box in the dock arrangement, in px — the yardstick
 *  layout() uses to decide whether docking fits. Raise it if a longer entry is
 *  added. */
const DOCK_BOX_H = 236;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Rounds for inline styles: sub-pixel noise past a tenth only churns the DOM. */
const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Where everything sits for a screen of W×H on step `step`. One function, no
 *  breakpoints: the marks ride an ellipse around the head whose size comes from
 *  the screen, so a seventh mark or an odd aspect ratio needs no hand-tuning.
 *  It picks one of three arrangements, by what fits rather than by width:
 *  - dock: the text box sits over the portrait's hem — any wide screen tall
 *    enough that the box clears the chin.
 *  - split: portrait and ring on the left, text box on the right — a wide
 *    screen too short to dock, like a 1280×720 laptop.
 *  - tall: text box stacked above the ring — phones, portrait tablets, and the
 *    narrow-and-short screens that have room for neither of the others. */
function layout(W: number, H: number, step: number, boxH: number) {
  const st = STEPS[step];
  const intro = st.kind === "intro";
  const contact = st.kind === "contact";

  const g = W < 640 ? 16 : W < 1024 ? 32 : 48;

  // Docking works while the chin (0.45P up from the bottom) stays above the
  // box. Judged against the tallest docked box the reel has (Things I've
  // built, three lines of description) rather than the measured one, so a
  // screen keeps one arrangement for the whole scroll instead of switching
  // between sections whose boxes differ in height.
  const dockP = Math.min(H * 0.8, W * 0.48);
  const dockFits = H - 0.45 * dockP <= H - g - DOCK_BOX_H - 8;
  const mode: "tall" | "dock" | "split" =
    H > W * 1.15 ? "tall" : dockFits ? "dock" : W >= 900 ? "split" : "tall";
  const tall = mode === "tall";

  const icon = tall ? clamp(W * 0.16, 52, 88) : clamp(W * 0.07, 64, 96);
  // Every mark is laid out at the focused size and scaled down from it, so the
  // focused one is the only one drawn 1:1 and nothing is ever scaled up.
  const front = icon * 1.25;
  const lead = contact ? icon * 0.62 : front;

  const headerTop = tall ? g : 32;
  const headerH = tall ? 40 : 48;
  const headerEnd = headerTop + headerH;

  let boxW: number;
  let boxX: number;
  let boxY: number;
  if (mode === "tall") {
    boxW = W - 2 * g;
    boxX = g;
    boxY = headerEnd + (W < 640 ? 16 : 24);
  } else if (mode === "dock") {
    boxW = Math.min(640, W - 2 * g);
    boxX = (W - boxW) / 2;
    boxY = H - g - boxH;
  } else {
    boxW = Math.min(560, W * 0.42);
    boxX = W - g - boxW;
    boxY = clamp((H - boxH) / 2, headerEnd + 24, H - g - boxH);
  }

  // The column the portrait and ring live in: the whole screen, except in a
  // split, where it is everything left of the box.
  const colW = mode === "split" ? boxX - 24 : W;
  const sx = colW / 2;

  // On a tall screen the ring is a literal halo: a flat ellipse whose centre
  // sits on the top of the hair (0.12P below the portrait's top edge), so the
  // marks either side of the crown ride above the head instead of over it.
  // Its crown also has to clear the text box. The crown sits at
  // H - 0.88P - ry, so it clears minTop while P <= (H - minTop - ry) / 0.88 —
  // on a short phone the portrait shrinks rather than the halo being pushed
  // down onto the face.
  const minTop = boxY + boxH + 28 + lead / 2;
  const tallRx = W / 2 - g - icon / 2;
  const tallRy = tallRx * 0.6;
  const full =
    mode === "tall"
      ? Math.min(W * 1.12, H * 0.6, (H - minTop - tallRy) / 0.88)
      : mode === "dock"
        ? dockP
        : Math.min(H * 0.8, colW * 0.78);
  const rest = tall
    ? Math.min(W * 0.62, H * 0.34)
    : Math.min(H * 0.42, W * 0.3);
  const P = intro ? rest : full;
  const headY = H - P + 0.3 * P;
  // The intro is centred on the whole screen whatever the arrangement; the
  // portrait slides into its column when the reel starts.
  const px = intro ? W / 2 : sx;

  const cx = sx;
  let cy = headY;
  let rx: number;
  let ry: number;
  if (tall) {
    rx = tallRx;
    ry = tallRy;
    cy = Math.max(H - P + 0.12 * P, minTop + ry);
  } else {
    rx = Math.min(W * 0.34, 560, colW / 2 - icon / 2 - 12);
    ry = Math.min(H * 0.3, P * 0.42);
    cy = Math.max(cy, headerEnd + 24 + lead / 2 + ry);
  }

  /** A point on the ring at angle `a` (degrees, 90 = the crown). */
  const at = (a: number) => {
    const r = (a * Math.PI) / 180;
    const sin = Math.sin(r);
    const cos = Math.cos(r);
    return { x: cx + rx * cos, y: cy - ry * sin, sin, cos };
  };

  /** Where mark i of section s sits when its section's focus is `focus`. The
   *  ring wraps, so the set reads as a loop; a tall screen only shows the arc
   *  either side of the crown, a wide one the whole ring with depth. */
  const onRing = (s: number, i: number, focus: number) => {
    const k = SECTIONS[s].marks.length;
    let d = i - focus;
    if (d >= k / 2) d -= k;
    if (d < -k / 2) d += k;
    const stepDeg = tall ? 34 : Math.min(360 / k, 52);
    const p = at(90 - d * stepDeg);
    const depth = (p.sin + 1) / 2;
    const focused = d === 0;
    let opacity = focused ? 1 : 0.45 + 0.4 * depth;
    if (tall && Math.abs(d * stepDeg) > 80) opacity = 0;
    return {
      x: p.x,
      y: p.y,
      scale: focused ? 1 : (icon * (0.7 + 0.3 * depth)) / front,
      opacity,
      z: focused ? 6 : p.sin < -0.2 ? 1 : 4,
      rot: focused ? 0 : -p.cos * 8,
      focused,
    };
  };

  const marks = SECTIONS.map((sec, s) =>
    sec.marks.map((m, i) => {
      if (st.kind === "mark" && st.s === s) {
        return { ...onRing(s, i, st.i), live: true };
      }
      if (contact) {
        const seat = RING.findIndex((r) => r.s === s && r.i === i);
        if (seat >= 0) {
          // The payoff: every mark scrolled past, collected into one ring.
          const p = at(90 + seat * (360 / RING.length));
          const depth = (p.sin + 1) / 2;
          return {
            x: p.x,
            y: p.y,
            scale: (lead * (0.75 + 0.35 * depth)) / front,
            // A tall screen's halo sits on the hair, so its back half would
            // peek around the face rather than hide behind it.
            opacity: tall && p.sin < -0.2 ? 0 : 0.5 + 0.5 * depth,
            z: p.sin < -0.2 ? 1 : 4,
            rot: -p.cos * 8,
            focused: false,
            live: true,
          };
        }
      }
      // Off stage: parked where it will arrive, shrunk and invisible, so a
      // section grows in place rather than flying in from a corner.
      const park = onRing(s, i, 0);
      return {
        ...park,
        scale: park.scale * 0.6,
        opacity: 0,
        focused: false,
        live: false,
      };
    }),
  );

  const crownTop = cy - ry - front / 2;
  const tailTop = boxY + boxH + 8;

  return {
    tall,
    g,
    front,
    headerTop,
    headerH,
    box: { x: boxX, y: boxY, w: boxW },
    portrait: { size: full, scale: P / full, x: px - full / 2 },
    glow: { x: px, y: headY, size: P * 1.5 },
    ring: { cx, cy, rx, ry },
    marks,
    tail:
      tall && st.kind === "mark" && crownTop - 12 - tailTop > 12
        ? { x: W / 2 - 1, y: tailTop, h: crownTop - 12 - tailTop }
        : null,
  };
}

/** A right-pointing arrow drawn on a 2px grid, so it reads as a sprite. */
function PixelArrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 8 10" className={className}>
      <path d="M1 0h2v2h2v2h2v2h-2v2h-2v2h-2z" fill="currentColor" />
    </svg>
  );
}

/** Marks the flagship, drawn in the same pixel grid as the arrows. */
function Crown() {
  return (
    <svg aria-hidden viewBox="0 0 11 8" className="halo-crown">
      <path
        d="M1 1h2v4h-2zM4.5 0h2v5h-2zM8 1h2v4h-2zM1 5h9v3h-9z"
        fill="#ffd34d"
      />
      <path d="M2 6h1v1h-1zM5 6h1v1h-1zM8 6h1v1h-1z" fill="#e2463c" />
    </svg>
  );
}

const LINKS = [
  { label: "Instagram", href: "https://instagram.com/baranidharan_b_" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/baranidharanb" },
  // mailto, not a form: there is no backend here, and a link hands the reader
  // straight to the client they already have.
  { label: "Email", href: "mailto:baranidharan.balamurugan@travafa.com" },
];

const pad2 = (n: number) => String(n).padStart(2, "0");

export function Hero() {
  const stage = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLElement>(null);
  // Null until the stage has been measured: everything placed by layout() waits
  // for a real size rather than flashing at a guessed one.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const ready = size !== null;
  const [step, setStep] = useState(0);
  const [boxH, setBoxH] = useState(220);
  const stepRef = useRef(0);

  // The stage's own box, not window.innerHeight: it is 100svh, which is what
  // the portrait's bottom edge is actually anchored to on a phone.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The text box sizes itself to the tallest entry in its section (they share
  // one grid cell), and the ring on a tall screen hangs under it — so its real
  // height feeds back into the layout.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  // Scroll writes --sp for the rail and picks the step. A step only changes on
  // a boundary, so a scroll frame inside one re-renders nothing.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        distance > 0 ? clamp(window.scrollY / distance, 0, 1) : 0;
      el.style.setProperty("--sp", progress.toFixed(4));
      const next = Math.min(
        STEPS.length - 1,
        Math.floor(progress * STEPS.length),
      );
      if (next !== stepRef.current) {
        stepRef.current = next;
        setStep(next);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /** Scrolls to the middle of a step's band, so a tap lands squarely inside it
   *  rather than on the knife edge between two. */
  const goTo = useCallback((target: number) => {
    const t = clamp(target, 0, STEPS.length - 1);
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    const top =
      t === 0
        ? 0
        : t === STEPS.length - 1
          ? distance
          : ((t + 0.5) / STEPS.length) * distance;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }, []);

  const W = size?.w ?? 1440;
  const H = size?.h ?? 900;
  const L = layout(W, H, step, boxH);
  const st = STEPS[step];
  const section = st.kind === "mark" ? SECTIONS[st.s] : null;
  const focus = st.kind === "mark" ? st.i : 0;
  const level =
    st.kind === "mark" ? st.s : st.kind === "contact" ? SECTIONS.length : -1;

  return (
    <div ref={stage} data-step={st.kind} className="stage absolute inset-0">
      <div className="halo-intro" inert={st.kind !== "intro"}>
        <h1 className="wordmark halo-wordmark">Baranidharan</h1>
        <p className="halo-tagline">Turning ideas into cool apps</p>
        <button type="button" onClick={() => goTo(1)} className="halo-start">
          <PixelArrow className="halo-start-arrow" />
          Press start
        </button>
        <p className="halo-or">or scroll</p>
      </div>

      {/* Everything below is placed by layout(), which needs the stage's real
          size — so it mounts once that is measured, rather than rendering at a
          guess on the server and jumping on hydration. */}
      {size && (
        <>
          <span
            aria-hidden
            className="halo-glow"
            style={{
              width: L.glow.size,
              height: L.glow.size,
              transform: `translate3d(${r1(L.glow.x - L.glow.size / 2)}px, ${r1(L.glow.y - L.glow.size / 2)}px, 0)`,
            }}
          />

          <svg aria-hidden className="halo-orbit" width={W} height={H}>
            <ellipse
              cx={L.ring.cx}
              cy={L.ring.cy}
              rx={L.ring.rx}
              ry={L.ring.ry}
            />
          </svg>

          {SECTIONS.map((sec, s) =>
            sec.marks.map((m, i) => {
              const p = L.marks[s][i];
              const visible = p.live && p.opacity > 0;
              return (
                <button
                  key={`${sec.key}-${m.slug}`}
                  type="button"
                  aria-label={m.name}
                  aria-hidden={!visible}
                  tabIndex={visible ? 0 : -1}
                  data-focused={p.focused ? "" : undefined}
                  data-live={visible ? "" : undefined}
                  onClick={() => goTo(FIRST_STEP[s] + i)}
                  className="halo-mark"
                  style={{
                    width: L.front,
                    height: L.front,
                    zIndex: p.z,
                    opacity: p.opacity,
                    transform: `translate3d(${r1(p.x - L.front / 2)}px, ${r1(p.y - L.front / 2)}px, 0) rotate(${r1(p.rot)}deg) scale(${r3(p.scale)})`,
                  }}
                >
                  <Image
                    src={m.logo}
                    alt=""
                    width={1024}
                    height={1024}
                    sizes={`${Math.ceil(L.front)}px`}
                    className="halo-mark-art"
                  />
                  {p.focused && (
                    <span aria-hidden className="halo-brackets">
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                  {m.crowned && <Crown />}
                </button>
              );
            }),
          )}

          {/* Laid out at its full size and scaled down for the intro, never laid
          out small and scaled up: a composited layer is rasterised at its
          untransformed size, so scaling down keeps it sharp. Scales from the
          bottom edge, so it never leaves it. */}
          <div
            aria-hidden
            className="halo-portrait"
            style={{
              width: L.portrait.size,
              height: L.portrait.size,
              transform: `translate3d(${r1(L.portrait.x)}px, ${r1(H - L.portrait.size)}px, 0) scale(${r3(L.portrait.scale)})`,
            }}
          >
            <Image
              src="/hero.png"
              alt=""
              width={1254}
              height={1254}
              loading="eager"
              // Tracks layout()'s full size: min(112vw, 60vh) on a tall screen
              // (narrower than 20:23), min(80vh, 48vw) on a wide one.
              sizes="(max-aspect-ratio: 20/23) min(112vw, 60vh), min(80vh, 48vw)"
              className="h-full w-full"
            />
          </div>

          <header
            className="halo-header"
            inert={st.kind === "intro"}
            style={{
              left: L.g,
              right: L.g,
              top: L.headerTop,
              height: L.headerH,
            }}
          >
            <p className="halo-name">Baranidharan</p>
            <nav aria-label="Sections" className="halo-levels">
              {L.tall && (
                <span className="halo-lv">
                  LV {Math.max(1, Math.min(level + 1, SECTIONS.length))}/
                  {SECTIONS.length}
                </span>
              )}
              {SECTIONS.map((sec, s) => (
                <button
                  key={sec.key}
                  type="button"
                  aria-label={sec.label}
                  aria-current={s === level ? "step" : undefined}
                  data-state={s === level ? "on" : s < level ? "done" : "next"}
                  onClick={() => goTo(FIRST_STEP[s])}
                  className="halo-level"
                >
                  <span className="halo-level-bar" />
                  {!L.tall && (
                    <span className="halo-level-label">
                      {pad2(s + 1)} {sec.short}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </header>

          {L.tail && (
            <span
              aria-hidden
              className="halo-tail"
              style={{
                height: r1(L.tail.h),
                transform: `translate3d(${r1(L.tail.x)}px, ${r1(L.tail.y)}px, 0)`,
              }}
            />
          )}

          <section
            ref={boxRef}
            aria-live="polite"
            inert={st.kind === "intro"}
            className="halo-box"
            style={{
              width: L.box.w,
              transform: `translate3d(${r1(L.box.x)}px, ${r1(L.box.y)}px, 0)`,
            }}
          >
            {st.kind === "contact" ? (
              <>
                <div className="halo-box-row">
                  <p className="halo-box-label">Continue?</p>
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="halo-replay"
                  >
                    Replay
                  </button>
                </div>
                <h2 className="halo-box-name">Let&rsquo;s make the next one</h2>
                <nav aria-label="Contact" className="halo-menu">
                  {LINKS.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      {...(link.href.startsWith("http") && {
                        target: "_blank",
                        rel: "noreferrer noopener",
                      })}
                    >
                      <PixelArrow className="halo-menu-cursor" />
                      {link.label}
                    </a>
                  ))}
                </nav>
              </>
            ) : (
              <>
                {/* Every entry of the section in one grid cell, only the current one
                visible: the cell is as tall as the longest, so the box — and the
                ring hung under it — holds still while you step through. */}
                <div className="halo-entries">
                  {(section ?? SECTIONS[0]).marks.map((m, i) => (
                    <div
                      key={m.slug}
                      className="halo-entry"
                      data-on={i === focus ? "" : undefined}
                      aria-hidden={i !== focus}
                    >
                      <div className="halo-box-row">
                        <p className="halo-box-label">
                          {(section ?? SECTIONS[0]).label}
                        </p>
                        <span className="halo-box-meta">{m.meta}</span>
                      </div>
                      <h2 className="halo-box-name">{m.name}</h2>
                      <p className="halo-box-desc">{m.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="halo-box-foot">
                  <span className="halo-count">
                    {pad2(focus + 1)} /{" "}
                    {pad2((section ?? SECTIONS[0]).marks.length)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label="Previous"
                      onClick={() => goTo(step - 1)}
                      className="halo-nav"
                    >
                      <PixelArrow className="halo-nav-arrow -scale-x-100" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next"
                      onClick={() => goTo(step + 1)}
                      className="halo-nav halo-nav-next"
                    >
                      <PixelArrow className="halo-nav-arrow" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {/* The scrollbar's replacement: a column that fills top to bottom with
          --sp. Above everything — it is chrome, not content. */}
      <div aria-hidden className="scroll-rail">
        <span className="scroll-rail-fill" />
      </div>
    </div>
  );
}
