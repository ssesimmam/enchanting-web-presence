/**
 * ALTO cinematic hero.
 * Drives a photoreal frame sequence (crossfade + slow push-in) from scroll
 * progress, plus the existing overlay states (rail, stage dots, story text,
 * intro, finale, build caption).
 */

const BUILD_LABELS: [number, string][] = [
  [0.0, "Seeing the empty space"],
  [0.22, "Site inspection"],
  [0.45, "Laying the flooring"],
  [0.62, "Raising the pergola"],
  [0.78, "Planting & lighting"],
  [0.9, "Golden hour"],
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

export function initAltoCinematic(root: HTMLElement) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const layers = Array.from(root.querySelectorAll<HTMLElement>(".frame-layer"));
  const railFill = q<HTMLElement>("#rail-fill");
  const intro = q<HTMLElement>("#intro");
  const finale = q<HTMLElement>("#finale");
  const caption = q<HTMLElement>("#buildcaption");
  const buildLabel = q<HTMLElement>("#buildlabel");
  const loading = q<HTMLElement>("#loading");
  const dots = Array.from(root.querySelectorAll<HTMLElement>(".stagedot"));
  const stories = Array.from(root.querySelectorAll<HTMLElement>(".storytext"));

  // Centers of each photoreal frame along the scroll timeline.
  const centers = [0.06, 0.32, 0.58, 0.88];

  let raf = 0;
  let currentLabel = "";

  const render = () => {
    raf = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? clamp(window.scrollY / max) : 0;

    // --- frame crossfade + parallax push-in ---
    layers.forEach((el, i) => {
      const c = centers[i]!;
      const prev = i === 0 ? c - 0.3 : centers[i - 1]!;
      const next = i === layers.length - 1 ? c + 0.3 : centers[i + 1]!;
      let a = 0;
      if (p <= c) a = smooth(clamp((p - prev) / (c - prev)));
      else a = smooth(clamp((next - p) / (next - c)));
      if (i === 0 && p < c) a = 1;
      if (i === layers.length - 1 && p > c) a = 1;
      el.style.opacity = a.toFixed(3);
      const local = clamp((p - prev) / (next - prev));
      el.style.transform = `scale(${(1.09 - 0.07 * local).toFixed(4)}) translate3d(0,${(
        (0.5 - local) *
        -1.6
      ).toFixed(2)}%,0)`;
    });

    // --- warm grade ramps up toward golden hour ---
    root.style.setProperty("--dusk", smooth(clamp((p - 0.55) / 0.35)).toFixed(3));

    // --- rail ---
    if (railFill) railFill.style.width = `${(p * 100).toFixed(2)}%`;

    // --- intro / finale ---
    if (intro) {
      intro.style.opacity = `${clamp(1 - p / 0.07)}`;
    }
    if (finale) finale.classList.toggle("on", p > 0.9);

    // --- stage dots ---
    const stage = p < 0.2 ? 0 : p < 0.46 ? 1 : p < 0.72 ? 2 : 3;
    dots.forEach((d, i) => d.classList.toggle("active", i === stage));

    // --- story text bands ---
    const bands: [number, number][] = [
      [0.1, 0.24],
      [0.3, 0.46],
      [0.52, 0.68],
      [0.74, 0.88],
    ];
    stories.forEach((s, i) => {
      const b = bands[i]!;
      s.classList.toggle("on", p >= b[0] && p <= b[1]);
    });

    // --- build caption ---
    if (caption) caption.classList.toggle("on", p > 0.08 && p < 0.9);
    if (buildLabel) {
      let label = BUILD_LABELS[0]![1];
      for (const [at, text] of BUILD_LABELS) if (p >= at) label = text;
      if (label !== currentLabel) {
        currentLabel = label;
        buildLabel.textContent = label;
      }
    }
  };

  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(render);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  render();

  // hide the loader once the first frame has decoded
  const first = layers[0]?.querySelector("img") as HTMLImageElement | null;
  const hide = () => {
    if (!loading) return;
    loading.style.opacity = "0";
    window.setTimeout(() => loading.remove(), 800);
  };
  if (!first || first.complete) hide();
  else first.addEventListener("load", hide, { once: true });
  window.setTimeout(hide, 3500);

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    if (raf) cancelAnimationFrame(raf);
  };
}
