import { Hero } from "@/components/hero";

export default function Home() {
  return (
    <main className="flex-1">
      {/* The hero is a reel of 14 steps — the intro, twelve marks, the contact
          screen — split evenly across the scroll. 620svh leaves 5.2 viewports
          of scroll, about 37svh per step: long enough that one flick of a
          trackpad lands on the next mark rather than skipping two. */}
      <div className="h-[620svh]">
        {/* Pinned: the section is the screen, which is what the portrait's
            bottom edge is anchored to. */}
        <section className="sticky top-0 h-[100svh] overflow-hidden">
          {/* Layered background: colour wash, hairline grid, vignette, film grain. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="atmosphere absolute inset-[-20%]" />
            <div className="grid-veil absolute inset-0" />
            <div className="vignette absolute inset-0" />
            <div className="grain absolute inset-0" />
          </div>

          <Hero />
        </section>
      </div>
    </main>
  );
}
