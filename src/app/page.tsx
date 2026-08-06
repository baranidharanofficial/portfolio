import { Hero } from "@/components/hero";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Five viewports tall, so there are four of scroll: one to drive the
          portrait from its resting size up to 50vw, and — because the three
          phases split that same 0..1 progress — about 1.3 viewports each for
          projects, companies and education. Shorten this and the sets start
          overtaking each other. */}
      <div className="h-[500svh]">
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
