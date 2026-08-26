import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import frame01 from "@/assets/terrace-01-empty.jpg";
import frame02 from "@/assets/terrace-02-inspect.jpg";
import frame03 from "@/assets/terrace-03-build.jpg";
import frame04 from "@/assets/terrace-04-complete.jpg";
import { initAltoCinematic } from "@/lib/alto-cinematic";
import "@/styles/alto.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALTO — From Empty Terrace to Your Own Escape" },
      {
        name: "description",
        content:
          "ALTO designs and builds outdoor terraces. Scroll through a cinematic build: flooring, pergola, seating, greenery and light.",
      },
      { property: "og:title", content: "ALTO — From Empty Terrace to Your Own Escape" },
      {
        property: "og:description",
        content:
          "Watch an empty concrete terrace become a living outdoor escape in a cinematic scroll experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,400&family=Inter:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap",
      },
    ],
  }),
  component: Index,
});

const STAGES = [
  { label: "See the space", num: "01" },
  { label: "Understand", num: "02" },
  { label: "Plan", num: "03" },
  { label: "Complete", num: "04" },
];

const STORY = [
  {
    eyebrow: "01 — SEE THE SPACE",
    lines: ["Before we build anything,", "we understand how the space", "can be lived in."],
  },
  {
    eyebrow: "02 — UNDERSTAND",
    lines: ["Light. Space. Structure.", "Movement. Everything matters."],
  },
  {
    eyebrow: "03 — PLAN",
    lines: ["We don't fill the terrace.", "We design how you'll experience it."],
  },
  { eyebrow: "04 — COMPLETE", lines: ["Not just a terrace.", "A place to slow down."] },
];

const FRAMES = [
  { src: frame01, alt: "Empty concrete rooftop terrace overlooking the city skyline" },
  { src: frame02, alt: "Builders inspecting the bare rooftop terrace slab" },
  { src: frame03, alt: "Craftsmen laying timber decking under a new pergola frame" },
  {
    src: frame04,
    alt: "Finished rooftop terrace at golden hour with pergola, sofa and dining table",
  },
];

function Index() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let dispose: (() => void) | undefined;
    try {
      dispose = initAltoCinematic(root);
    } catch (err) {
      console.error("ALTO hero failed to start", err);
    }
    return () => dispose?.();
  }, []);

  return (
    <div ref={rootRef} className="alto-root">
      <div id="loading">PREPARING THE TERRACE…</div>

      <div id="scroll-spacer">
        <div id="stage">
          <div id="frames">
            {FRAMES.map((f, i) => (
              <div className="frame-layer" data-i={i} key={f.src}>
                <img
                  src={f.src}
                  alt={f.alt}
                  width={1920}
                  height={1088}
                  {...(i === 0 ? {} : { loading: "lazy" as const })}
                />
              </div>
            ))}
          </div>
          <div id="warm" />
          <div id="grade" />
          <div id="grain" />

          <div id="rail">
            <div id="rail-fill" />
          </div>

          <nav>
            <div className="brand">
              ALTO<em>.</em>
            </div>
            <div className="navlinks">
              <a href="#scroll-spacer">Work</a>
              <a href="#scroll-spacer">Process</a>
              <a href="#scroll-spacer">Services</a>
              <a href="#scroll-spacer">About</a>
            </div>
            <button className="navcta">Start a Project</button>
          </nav>

          <div id="stagelist">
            {STAGES.map((s, i) => (
              <div className="stagedot" data-i={i} key={s.num}>
                <span className="label">{s.label}</span>
                <span className="num">{s.num}</span>
                <span className="dot" />
              </div>
            ))}
          </div>

          <div id="buildcaption">
            <span className="bdot" />
            <span id="buildlabel">Seeing the empty space</span>
          </div>

          <div id="intro">
            <h1>What could this space become?</h1>
            <div className="sub">Every transformation starts with an empty terrace.</div>
            <div className="scrollcue">SCROLL TO TRANSFORM ↓</div>
          </div>

          {STORY.map((s, i) => (
            <div className="storytext" data-sec={i} key={s.eyebrow}>
              <div className="eyebrow">{s.eyebrow}</div>
              <h2>
                {s.lines.map((l, j) => (
                  <span key={l}>
                    {l}
                    {j < s.lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </h2>
            </div>
          ))}

          <div id="finale">
            <h2>
              From empty terrace
              <br />
              to <em>your own escape.</em>
            </h2>
            <div className="fsub">
              We design and build outdoor spaces made for relaxing, gathering and living.
            </div>
            <div className="fctas">
              <button className="btn-primary">Start Your Transformation →</button>
              <button className="btn-secondary">See What's Possible</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
