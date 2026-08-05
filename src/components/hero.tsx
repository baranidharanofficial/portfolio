"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

/** How long the name holds the stage alone before the portrait arrives. */
const PORTRAIT_DELAY_MS = 3000;

/** How long an icon takes to fade in, as a share of the scroll. Must match the
 *  0.14 divisor in .app-icon — it is also when the icon becomes hoverable. */
const ICON_FADE = 0.14;

/** The shipped apps, scattered behind the type and revealed one at a time as
 *  the page scrolls. Ordered by `at`, the scroll progress each one starts
 *  arriving at — spaced by more than ICON_FADE so they never overlap, and the
 *  ordering is what lets a single count decide which have landed.
 *  On a phone all four sit in the empty band above the name, because the grown
 *  portrait spans the full width down there.
 *  `tilt` is degrees, and its sign picks the side the hover card hangs off:
 *  negative dips the icon's left side, so the card hangs left. Keep each tilt's
 *  sign matching the side of the screen the icon sits on, or its card will hang
 *  off the edge. The card itself is never rotated — it is a bitmap frame.
 *  Years are first-release dates from the App Store listings.
 *  `crowned` marks the flagship — set it on one app, or the crown stops meaning
 *  anything. The type is spelled out so the optional field exists on every entry
 *  rather than only on the one that sets it. */
const APPS: {
  slug: string;
  name: string;
  desc: string;
  year: string;
  at: number;
  tilt: number;
  place: string;
  crowned?: boolean;
}[] = [
  {
    slug: "readio",
    name: "Readio AI",
    desc: "Turns PDFs and docs into audiobooks",
    year: "2025",
    at: 0.08,
    tilt: -8,
    place: "left-[7%] top-[13%] sm:left-[9%] sm:top-[16%]",
  },
  {
    slug: "habidots",
    name: "Habidots",
    desc: "Daily habit tracker built on streaks",
    year: "2026",
    at: 0.26,
    tilt: 6,
    place: "right-[8%] top-[11%] sm:right-[10%] sm:top-[25%]",
  },
  {
    slug: "buildsuite",
    name: "BuildSuite",
    desc: "Site, inventory and HR for builders",
    year: "2024",
    at: 0.44,
    tilt: -5,
    place: "left-[17%] top-[27%] sm:left-[14%] sm:top-auto sm:bottom-[25%]",
  },
  {
    slug: "travafa",
    name: "Travafa",
    desc: "Collaborative AI trip planner",
    year: "2024",
    at: 0.62,
    tilt: 9,
    place: "right-[16%] top-[30%] sm:right-[12%] sm:top-auto sm:bottom-[14%]",
    crowned: true,
  },
];

/** Marks the flagship app. The emoji itself, not artwork — it inherits whatever
 *  crown the reader's platform ships, which is the point: it always looks native
 *  to their OS. Sized and placed in globals.css. */
function Crown() {
  return (
    <span aria-hidden className="app-crown">
      👑
    </span>
  );
}

export function Hero() {
  const [revealed, setRevealed] = useState(false);
  const [landed, setLanded] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const landedRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), PORTRAIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Scroll writes one number, --sp (0..1), and CSS derives the growth from it.
  // The portrait is anchored to the bottom edge and scales from it, both in CSS,
  // so there is no geometry to measure here.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;

    let forced = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
      el.style.setProperty("--sp", progress.toFixed(4));

      // Scrolling early is a request to see the thing — don't make them wait
      // out the rest of the 3s for a portrait that is already growing.
      if (!forced && progress > 0) {
        forced = true;
        setRevealed(true);
      }

      // How many icons have fully arrived. Only those accept a hover, so a
      // card can never be summoned by an icon that isn't visible yet. APPS is
      // ordered by `at`, so this count is a prefix — four re-renders in total,
      // not one per frame.
      const n = APPS.filter((app) => progress >= app.at + ICON_FADE).length;
      if (n !== landedRef.current) {
        landedRef.current = n;
        setLanded(n);
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

  return (
    <div
      ref={stage}
      data-revealed={revealed ? "" : undefined}
      className="stage absolute inset-0"
    >
      {/* Background layer: behind the type and the portrait, above the wash.
          The layer itself never takes pointer events — only landed icons do.
          Carries no z-index on purpose: a z-index here would make this a
          stacking context and trap the hover cards inside it, under the portrait.
          Without one, the icons still paint below the type and the portrait —
          they are auto-level and come first in the DOM — while .app-card can
          raise itself above both. Nothing in this subtree may take a z-index. */}
      <div className="pointer-events-none absolute inset-0">
        {APPS.map((app, i) => (
          <div
            key={app.slug}
            data-landed={i < landed ? "" : undefined}
            data-lean={app.tilt < 0 ? "left" : "right"}
            className={`app-slot absolute ${app.place}`}
            style={
              { "--at": app.at, "--tilt": `${app.tilt}deg` } as CSSProperties
            }
            tabIndex={0}
          >
            {/* The icon carries the scroll-driven reveal; the card is its
                sibling so it inherits neither the tilt nor the scale. The crown
                is inside it, so it does inherit both — it arrives with the app
                it belongs to and leans at the same angle. */}
            <div className="app-icon">
              {app.crowned && <Crown />}
              <Image
                src={`/${app.slug}.png`}
                alt=""
                width={1024}
                height={1024}
                sizes="(min-width: 640px) 7vw, 13vw"
                className="app-icon-art block h-full w-full"
              />
            </div>

            <div className="app-card">
              <p className="app-card-head">
                <span className="app-card-name">{app.name}</span>
                <span className="app-card-year">{app.year}</span>
              </p>
              <p className="app-card-desc">{app.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex h-full flex-col items-center justify-center px-5 sm:px-6">
        <div className="relative z-10">
          {/* Lifts once the portrait lands, so the pair stays optically centred,
              then recedes as the portrait grows over it. */}
          <div className="type-lift flex flex-col items-center">
            <div
              className="rise flex items-center gap-4"
              style={{ animationDelay: "80ms" }}
            >
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/30 sm:w-12" />
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.42em] text-white/55 sm:text-xs">
                Scroll to Know More
              </p>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/30 sm:w-12" />
            </div>

            {/* "Baranidharan" is one unbreakable 12-character word that cannot
                wrap, so it is sized by vw rather than a rem step. Measured at
                this weight and tracking it renders 6.02x its font-size wide, so
                12vw fills ~80% of the line box from 320px up — snug, never
                clipped. The rise lives on the wrapper because .wordmark already
                owns the element's animation slot for the sheen. */}
            <div
              className="rise mt-7 max-w-full"
              style={{ animationDelay: "200ms" }}
            >
              <h1 className="wordmark text-center text-[clamp(1.75rem,12vw,12rem)] font-bold leading-[0.88] tracking-[-0.045em]">
                Baranidharan
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned to the bottom edge of the screen at every scroll position, and
          above the type: scrolling only scales it, and it scales from that edge,
          so it never leaves the bottom. */}
      <div
        aria-hidden
        className="portrait-slot pointer-events-none absolute bottom-0 left-1/2 z-20 -translate-x-1/2"
      >
        <div className="portrait-grow">
          <div className="portrait-in relative">
            <span className="portrait-glow" />
            {/* sizes mirrors --target in globals.css — the width the portrait
                is laid out at, which is the width it reaches fully grown. A
                narrower hint would fetch a file the grown portrait outruns. */}
            <Image
              src="/hero.png"
              alt=""
              width={1254}
              height={1254}
              loading="eager"
              sizes="min(115vh, max(50vw, 55vh))"
              quality={90}
              className="portrait-img h-auto w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
