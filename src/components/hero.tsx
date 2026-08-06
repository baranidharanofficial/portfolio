"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

/** How long the name holds the stage alone before the portrait arrives. */
const PORTRAIT_DELAY_MS = 3000;

/** How long a mark takes to fade in, as a share of the whole scroll. Must match
 *  the 0.09 divisor in .mark-icon — it is also when the mark becomes hoverable. */
const FADE_IN = 0.09;

/** How long the set takes to fade back out. Must match the 0.05 divisor in
 *  .mark-icon. */
const FADE_OUT = 0.05;

/** Scroll a phase spends with its whole set on screen and nothing moving. This
 *  is the part worth reading, so it is reserved first and the staggered intro
 *  gets whatever the window has left — reserve it the other way round and the
 *  last mark of a phase lands just in time to start fading out again. */
const HOLD = 0.08;

/** Where marks sit on the stage, in reveal order. Sides alternate so a phase
 *  with only two marks still reads as balanced, and every slot clears the
 *  centre, which the name and the growing portrait own.
 *  `tilt` is degrees, and its sign picks the side the hover card hangs off:
 *  negative dips the mark's left side, so the card hangs left. Keep each tilt's
 *  sign matching the side of the screen its slot sits on — that is also the side
 *  with the most room for the card, so a centre slot's card still has somewhere
 *  to go. The card itself is never rotated — it is a bitmap frame.
 *  From lg: up, slots sit either side of the portrait.
 *  Below lg: the portrait fills the width, so they all live in the band above
 *  the name — and they trace an arc across it rather than stacking into two
 *  columns. The arc is what fits the space: the head owns the middle and rises
 *  highest, so the slots nearest the centre sit highest and each pair steps down
 *  as it moves out, following the dome of empty sky over the portrait.
 *  Ordered by how many marks a phase has rather than along the curve: the crown
 *  pair first so a two-mark phase gets a balanced pair high in the band, then
 *  the two ends so a four-mark phase spans the whole arc, and only then the
 *  pair between them, which just fills the curve in at five and six. Taking them
 *  in order along the curve instead would leave a four-mark phase — which is two
 *  of the three phases here — crowded into one half of it.
 *  A phase with more marks than there are slots wraps and overlaps two of them —
 *  ugly on sight, which is the point. Add a slot rather than let one hide.
 *
 *  `hug` hands a slot's horizontal placement to CSS at lg: and up, pinning it
 *  just outside the portrait's edge — see .mark-slot[data-hug] in globals.css.
 *  The slots beside the portrait need it: a fixed percentage that clears the
 *  portrait on a wide screen sits inside it on a narrow one, and the shoulders
 *  swallowed two marks whole at tablet width. `gap` widens the offset so hugging
 *  slots on the same side don't stack into a column. Both are lg:-only, so they
 *  have no bearing on the arc. */
const SLOTS: {
  place: string;
  tilt: number;
  hug?: "left" | "right";
  gap?: string;
}[] = [
  // Crown of the arc: nearest the centre, so highest — over the head below and
  // clear of the phase rail above. First, so a two-mark phase takes this pair.
  {
    place: "left-[20%] top-[10%] lg:left-[9%] lg:top-[16%]",
    tilt: -8,
  },
  {
    place: "right-[20%] top-[10%] lg:right-[10%] lg:top-[25%]",
    tilt: 6,
  },
  // Ends of the arc: hard against the edges and lowest, where the portrait has
  // narrowed to nothing and there is the most room to drop. Taken third and
  // fourth so a four-mark phase spans the whole curve rather than crowding one
  // end of it.
  {
    place: "left-[3%] top-[29%] lg:top-auto lg:bottom-[25%]",
    tilt: -5,
    hug: "left",
  },
  {
    place: "right-[3%] top-[29%] lg:top-auto lg:bottom-[14%]",
    tilt: 9,
    hug: "right",
  },
  // Between the two, filling the arc in when a phase runs to five or six.
  {
    place: "left-[11%] top-[19%] lg:top-[46%]",
    tilt: -6,
    hug: "left",
    gap: "2.75rem",
  },
  {
    place: "right-[11%] top-[19%] lg:top-[44%]",
    tilt: 7,
    hug: "right",
    gap: "2.75rem",
  },
];

/** One thing with a logo and a card: an app, an employer, a school. The three
 *  phases differ only in what fills these fields.
 *  `logo` is a path under /public. Leave it off and the mark renders as a
 *  monogram tile instead, so a phase reads correctly before its artwork lands.
 *  `tint` colours that monogram and is ignored once a logo exists.
 *  `crowned` marks the flagship — set it on one mark in the whole file, or the
 *  crown stops meaning anything. */
type Mark = {
  slug: string;
  name: string;
  meta: string;
  desc: string;
  logo?: string;
  tint?: string;
  crowned?: boolean;
};

/** The three sets, in the order the scroll walks them. `from`/`to` are absolute
 *  scroll progress (0..1), and they are contiguous: each set starts its exit as
 *  the next one starts arriving, so the stage is never crowded and never empty.
 *  The last phase is special-cased below — it never exits, because the scroll
 *  ends inside it and there is no room left to carry a mark back off. */
const PHASES: { key: string; label: string; from: number; to: number; marks: Mark[] }[] = [
  {
    key: "projects",
    label: "Things I've Built",
    from: 0.0,
    to: 0.34,
    marks: [
      {
        slug: "readio",
        name: "Readio AI",
        desc: "Turns PDFs and docs into audiobooks",
        meta: "2025",
        logo: "/readio.png",
      },
      {
        slug: "habidots",
        name: "Habidots",
        desc: "Daily habit tracker built on streaks",
        meta: "2026",
        logo: "/habidots.png",
      },
      {
        slug: "buildsuite",
        name: "BuildSuite",
        desc: "Site, inventory and HR for builders",
        meta: "2024",
        logo: "/buildsuite.png",
      },
      {
        slug: "travafa",
        name: "Travafa",
        desc: "Collaborative AI trip planner",
        meta: "2024",
        logo: "/travafa.png",
        crowned: true,
      },
    ],
  },
  {
    key: "companies",
    // Oldest first, so the set builds up to the current role rather than
    // counting back from it — the titles climb with it.
    // Casing is LinkedIn's own: ZenDynamix, not Zendynamix.
    label: "Where I've Worked",
    from: 0.34,
    to: 0.67,
    marks: [
      {
        slug: "cognizant",
        name: "Cognizant",
        desc: "Programmer Analyst",
        meta: "Feb 2021 — Mar 2022",
        logo: "/cognizant.jpg",
      },
      {
        slug: "zendynamix",
        name: "ZenDynamix",
        desc: "React & Flutter Developer",
        meta: "Mar 2022 — Mar 2023",
        logo: "/zendynamix.jpg",
      },
      {
        slug: "buildsuite-co",
        name: "BuildSuite",
        desc: "Flutter Developer",
        meta: "Jun 2023 — Dec 2024",
        // The app icon, not the 200px company logo off LinkedIn: same mark at
        // five times the resolution, and the coloured ground sits better on a
        // dark page than the logo's white one. Appearing in both phases is the
        // point — the product in one, the employer in the other.
        logo: "/buildsuite.png",
      },
      {
        slug: "travafa-co",
        name: "Travafa",
        // U+2011 non-breaking hyphen, so the measure below breaks the line
        // after "and" rather than mid-word at "co-".
        desc: "Front-end lead and co‑founder",
        meta: "Jan 2024 — Now",
        // Same reasoning as BuildSuite above.
        logo: "/travafa.png",
      },
    ],
  },
  {
    key: "education",
    // Names and dates are from the LinkedIn profile's structured data, which
    // leaves both schools unmasked; the degrees were masked there and came from
    // you. Crests are the profile's own 100px logos — small for the tile, so
    // swap in larger art if you have it.
    label: "Where I Studied",
    from: 0.67,
    to: 1.0,
    marks: [
      {
        slug: "christ-college",
        name: "Christ College of Engineering and Technology",
        desc: "B.Tech Electronics and Communication",
        meta: "2016 — 2020",
        logo: "/christ-college.jpg",
      },
      {
        slug: "amalorpavam",
        name: "Amalorpavam Higher Secondary School",
        desc: "Higher secondary",
        meta: "2012 — 2016",
        logo: "/amalorpavam.jpg",
      },
    ],
  },
];

/** Flattened once at module scope, not per render: every mark paired with the
 *  slot it sits in and the absolute scroll window it lives in. `at` spreads the
 *  marks of a phase across the front of that phase's window; `end` is where the
 *  whole set leaves together, which reads as a set rather than a queue. */
const MARKS = PHASES.flatMap((phase, p) => {
  // What the window has left once the last mark's fade-in, the hold and the
  // exit are paid for. Floored at 0 so a phase too narrow to stagger drops to
  // every mark arriving at once rather than going backwards.
  const intro = Math.max(
    0,
    phase.to - phase.from - FADE_IN - HOLD - FADE_OUT,
  );
  const step = phase.marks.length > 1 ? intro / (phase.marks.length - 1) : 0;
  // Well past 1, so the clamp in .mark-icon can never start the exit fade: the
  // scroll runs out inside the last phase and its marks have to stay put.
  const end = p === PHASES.length - 1 ? 9 : phase.to;

  return phase.marks.map((mark, i) => ({
    ...mark,
    slot: SLOTS[i % SLOTS.length],
    at: phase.from + i * step,
    end,
  }));
});

/** Stands in for a logo until the artwork lands: two letters, which is all that
 *  fits the tile at icon size. One initial per word where there are two words,
 *  and the first two letters where there is only one — a lone "T" reads as a
 *  rendering failure rather than a placeholder. */
function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const pick =
    words.length > 1
      ? words[0][0] + words[1][0]
      : words[0].slice(0, 2);
  return pick.toUpperCase();
}

/** Marks the flagship. The emoji itself, not artwork — it inherits whatever
 *  crown the reader's platform ships, which is the point: it always looks native
 *  to their OS. Sized and placed in globals.css. */
function Crown() {
  return (
    <span aria-hidden className="mark-crown">
      👑
    </span>
  );
}

export function Hero() {
  const [revealed, setRevealed] = useState(false);
  // Bitmask over MARKS: bit i is set while mark i is hoverable. One number, so
  // a scroll frame that changes nothing re-renders nothing.
  const [live, setLive] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const liveRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), PORTRAIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Scroll writes one number, --sp (0..1), and CSS derives everything from it:
  // the portrait's growth, which phase's label is showing, and which marks are
  // on screen. The portrait is anchored to the bottom edge and scales from it,
  // both in CSS, so there is no geometry to measure here.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;

    // Scroll at which the portrait finishes growing: the end of the first phase,
    // so the growth is spent on the projects reveal and the two phases after it
    // play against a portrait already at full size. Written here rather than as
    // a style prop because this effect is the sole owner of the stage's inline
    // custom properties — React would otherwise be diffing a style attribute
    // that --sp is mutating behind its back.
    el.style.setProperty("--grown-by", String(PHASES[0].to));

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

      // Only a mark that has fully arrived and has not begun leaving accepts a
      // hover, so a card can never be summoned by a mark nobody can see.
      let mask = 0;
      for (let i = 0; i < MARKS.length; i++) {
        const mark = MARKS[i];
        if (progress >= mark.at + FADE_IN && progress < mark.end) mask |= 1 << i;
      }
      if (mask !== liveRef.current) {
        liveRef.current = mask;
        setLive(mask);
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
          The layer itself never takes pointer events — only live marks do.
          Carries no z-index on purpose: a z-index here would make this a
          stacking context and trap the hover cards inside it, under the portrait.
          Without one, the marks still paint below the type and the portrait —
          they are auto-level and come first in the DOM — while .mark-card can
          raise itself above both. Nothing in this subtree may take a z-index. */}
      <div className="pointer-events-none absolute inset-0">
        {MARKS.map((mark, i) => {
          const on = (live & (1 << i)) !== 0;
          return (
            <div
              key={mark.slug}
              data-live={on ? "" : undefined}
              data-lean={mark.slot.tilt < 0 ? "left" : "right"}
              data-hug={mark.slot.hug}
              className={`mark-slot absolute ${mark.slot.place}`}
              style={
                {
                  "--at": mark.at,
                  "--end": mark.end,
                  "--tilt": `${mark.slot.tilt}deg`,
                  ...(mark.slot.gap && { "--hug-gap": mark.slot.gap }),
                } as CSSProperties
              }
              // Off the tab order while invisible, so tabbing never lands on a
              // mark two phases away and opens its card over the wrong set.
              tabIndex={on ? 0 : -1}
            >
              {/* The icon carries the scroll-driven reveal; the card is its
                  sibling so it inherits neither the tilt nor the scale. The crown
                  is inside it, so it does inherit both — it arrives with the mark
                  it belongs to and leans at the same angle. */}
              <div className="mark-icon">
                {mark.crowned && <Crown />}
                {mark.logo ? (
                  <Image
                    src={mark.logo}
                    alt=""
                    width={1024}
                    height={1024}
                    // Tracks --icon in globals.css: capped at 6.5rem from
                    // ~1095px up, on the 9.5vw slope between there and 640px,
                    // and pinned to the 4rem floor below that. Rounded up at
                    // each step — over-estimating costs a slightly larger file,
                    // under-estimating costs a soft one.
                    sizes="(min-width: 1095px) 104px, (min-width: 640px) 10vw, 68px"
                    className="mark-art block h-full w-full"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="mark-art mark-monogram"
                    style={{ "--tint": mark.tint } as CSSProperties}
                  >
                    {initials(mark.name)}
                  </span>
                )}
              </div>

              <div className="mark-card">
                <p className="mark-card-head">
                  <span className="mark-card-name">{mark.name}</span>
                  <span className="mark-card-meta">{mark.meta}</span>
                </p>
                <p className="mark-card-desc">{mark.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Names the set on stage. Pinned near the top edge rather than left in
          the eyebrow under the name: by the last phase the portrait has grown
          up over that spot, and a label nobody can read is worse than none.
          z-25 clears the portrait (20) but stays under the hover cards (30), so
          a card opening near the top still wins the overlap.
          Every label shares one grid cell, so the cell is as wide as the longest
          of them and the rules either side hold still as the words cross-fade. */}
      {/* Higher below lg:, where the marks arc across the band beneath it and
          the crown of that arc needs the room. */}
      <div className="phase-rail pointer-events-none absolute inset-x-0 top-[4%] z-[25] flex items-center justify-center px-5 lg:top-[7%]">
        {/* Typography lives in .eyebrow, not here: a pixel face only stays
            crisp at whole-pixel sizes, and Tailwind's type scale is in rem. */}
        <p className="eyebrow">
          {PHASES.map((phase, p) => (
            <span
              key={phase.key}
              className="eyebrow-label"
              style={
                {
                  "--from": phase.from,
                  // The last label stays for the same reason its marks do.
                  "--to": p === PHASES.length - 1 ? 9 : phase.to,
                } as CSSProperties
              }
            >
              {/* Each label carries its own rules rather than sharing a pair
                  parked on the rail: on the beat between two phases every label
                  is at zero, and shared rules would sit there framing nothing. */}
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/30 sm:w-12" />
              <span className="eyebrow-word">{phase.label}</span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/30 sm:w-12" />
            </span>
          ))}
        </p>
      </div>

      <div className="flex h-full flex-col items-center justify-center px-5 sm:px-6">
        <div className="relative z-10">
          {/* Lifts once the portrait lands, so the pair stays optically centred,
              then recedes as the portrait grows over it. */}
          <div className="type-lift flex flex-col items-center">
            {/* The rise wrapper and the fade are separate elements on purpose:
                .rise fills its animation forwards, so an opacity set on the same
                element would never win against it. */}
            <div className="rise" style={{ animationDelay: "80ms" }}>
              <div className="scroll-hint flex items-center gap-4">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/30 sm:w-12" />
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.42em] text-white/55 sm:text-xs">
                  Scroll to Know More
                </p>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/30 sm:w-12" />
              </div>
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
            {/* sizes tracks --target in globals.css — the width the portrait is
                laid out at, which is the width it reaches fully grown. A
                narrower hint would fetch a file the grown portrait outruns.
                It omits --target's third cap (the one keeping a lane clear for
                the hugging marks), so on the narrow viewports that cap bites it
                over-estimates. That is the safe direction: a slightly larger
                file, never a soft one. */}
            <Image
              src="/hero.png"
              alt=""
              width={1254}
              height={1254}
              loading="eager"
              // Tracks --target in globals.css, which changes shape at lg:.
              // Below that the portrait fills the width; above it, it steps back
              // to 50vw to leave lanes for the marks. The lg: arm omits --target's
              // third cap, so it over-estimates on the narrow viewports where
              // that cap bites — the safe direction: a larger file, never a soft
              // one.
              sizes="(min-width: 1024px) min(115vh, max(50vw, 55vh)), min(115vh, max(100vw, 55vh))"
              quality={90}
              className="portrait-img h-auto w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
