// @ts-nocheck
/* eslint-disable */
/**
 * ALTO — realism layer.
 * Procedural PBR texture sets, physical sky + IBL environment,
 * cinematic post pipeline (AO + depth of field + bloom) and atmosphere.
 * Purely visual: no scene story / layout logic lives here.
 */
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/* ------------------------------------------------------------------
   PROCEDURAL PBR MAPS
------------------------------------------------------------------ */
function canvas(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

function fbm(ctx, size, cells, alpha, dark) {
  // layered value-noise blocks — cheap but reads as surface variation
  for (let s = cells; s >= 2; s = Math.floor(s / 2)) {
    const step = size / s;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const v = Math.random();
        const l = dark ? 40 + v * 70 : 120 + v * 110;
        ctx.fillStyle = `rgba(${l},${l},${l},${alpha})`;
        ctx.fillRect(x * step, y * step, step + 1, step + 1);
      }
    }
    alpha *= 0.75;
  }
}

function grayscaleData(cv) {
  const ctx = cv.getContext("2d");
  return ctx.getImageData(0, 0, cv.width, cv.height);
}

/** Sobel-derived tangent-space normal map from a height canvas. */
function normalFromHeight(heightCanvas, strength = 2.2) {
  const size = heightCanvas.width;
  const src = grayscaleData(heightCanvas).data;
  const out = canvas(size);
  const octx = out.getContext("2d");
  const img = octx.createImageData(size, size);
  const h = (x, y) => {
    const xi = (x + size) % size;
    const yi = (y + size) % size;
    const i = (yi * size + xi) * 4;
    return (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len) * 0.5 * 255 + 127;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

function tex(cv, repeat, colorSpace) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (colorSpace) t.colorSpace = colorSpace;
  return t;
}

/* --- concrete: troweled screed with pores, stains and hairline cracks --- */
function concreteCanvases(size = 512) {
  const c = canvas(size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#8f8a80";
  ctx.fillRect(0, 0, size, size);
  fbm(ctx, size, 128, 0.16, false);
  // aggregate pores
  for (let i = 0; i < 2600; i++) {
    const r = Math.random() * 1.6 + 0.2;
    ctx.fillStyle = `rgba(${40 + Math.random() * 60},${40 + Math.random() * 55},${38 + Math.random() * 50},${0.08 + Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, 6.283);
    ctx.fill();
  }
  // damp stains
  for (let i = 0; i < 22; i++) {
    const x = Math.random() * size,
      y = Math.random() * size,
      r = 20 + Math.random() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(90,86,78,${0.1 + Math.random() * 0.12})`);
    g.addColorStop(1, "rgba(90,86,78,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // hairline cracks
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    let x = Math.random() * size,
      y = Math.random() * size,
      a = Math.random() * 6.283;
    ctx.strokeStyle = `rgba(58,54,48,${0.22 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.6 + Math.random() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 40; s++) {
      a += (Math.random() - 0.5) * 0.7;
      x += Math.cos(a) * 5;
      y += Math.sin(a) * 5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const rough = canvas(size);
  const rctx = rough.getContext("2d");
  rctx.drawImage(c, 0, 0);
  rctx.fillStyle = "rgba(255,255,255,0.35)";
  rctx.fillRect(0, 0, size, size);
  return { color: c, rough };
}

/* --- wood: grain lines, knots, plank tone drift --- */
function woodCanvases(base, size = 512) {
  const c = canvas(size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 520; i++) {
    const y = Math.random() * size;
    const amp = 2 + Math.random() * 7;
    ctx.strokeStyle = `rgba(${20 + Math.random() * 40},${12 + Math.random() * 26},${6 + Math.random() * 16},${0.05 + Math.random() * 0.16})`;
    ctx.lineWidth = 0.4 + Math.random() * 2.1;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const yy = y + Math.sin((x / size) * 6.283 * (1 + Math.random() * 0.02)) * amp;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const x = Math.random() * size,
      y = Math.random() * size;
    for (let r = 9; r > 0; r--) {
      ctx.strokeStyle = `rgba(48,28,12,${0.05 + r * 0.02})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.7, r * 0.9, Math.random(), 0, 6.283);
      ctx.stroke();
    }
  }
  const rough = canvas(size);
  const rctx = rough.getContext("2d");
  rctx.filter = "grayscale(1) contrast(0.6) brightness(1.5)";
  rctx.drawImage(c, 0, 0);
  return { color: c, rough };
}

/* --- woven fabric --- */
function fabricCanvases(base, size = 256) {
  const c = canvas(size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const step = 4;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const on = ((x / step + y / step) % 2) === 0;
      ctx.fillStyle = on ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
      ctx.fillRect(x, y, step, step);
    }
  }
  fbm(ctx, size, 64, 0.05, false);
  return { color: c, rough: c };
}

/* --- plaster / render wall --- */
function plasterCanvases(size = 512) {
  const c = canvas(size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#cfc7b8";
  ctx.fillRect(0, 0, size, size);
  fbm(ctx, size, 96, 0.1, false);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${140 + Math.random() * 60},${132 + Math.random() * 55},${120 + Math.random() * 50},0.2)`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 2.4, 0, 6.283);
    ctx.fill();
  }
  return { color: c, rough: c };
}

/* --- leaf / foliage tone breakup --- */
function leafCanvases(base, size = 256) {
  const c = canvas(size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size,
      y = Math.random() * size;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * 6.283);
    ctx.fillStyle = `rgba(${20 + Math.random() * 70},${60 + Math.random() * 90},${25 + Math.random() * 55},${0.25 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 2 + Math.random() * 7, 1 + Math.random() * 3, 0, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }
  return { color: c, rough: c };
}

/**
 * Applies procedural PBR maps to the existing material palette in place,
 * so geometry and story code stay untouched.
 */
export function applyPBRMaps(M) {
  const conc = concreteCanvases();
  const concN = normalFromHeight(conc.color, 2.6);
  const plaster = plasterCanvases();
  const plasterN = normalFromHeight(plaster.color, 1.6);
  const woodWarm = woodCanvases("#a8734a");
  const woodDeep = woodCanvases("#6a4728");
  const woodN = normalFromHeight(woodWarm.color, 1.8);
  const woodDeepN = normalFromHeight(woodDeep.color, 1.8);
  const fabLight = fabricCanvases("#d6c8b4");
  const fabN = normalFromHeight(fabLight.color, 1.2);
  const leaf = leafCanvases("#4a6b3f");
  const leafN = normalFromHeight(leaf.color, 1.4);

  const set = (mat, opts) => {
    if (!mat) return;
    if (opts.map) mat.map = tex(opts.map, opts.repeat, THREE.SRGBColorSpace);
    if (opts.rough) mat.roughnessMap = tex(opts.rough, opts.repeat);
    if (opts.normal) {
      mat.normalMap = tex(opts.normal, opts.repeat);
      mat.normalScale = new THREE.Vector2(opts.normalScale ?? 0.8, opts.normalScale ?? 0.8);
    }
    if (opts.envInt !== undefined) mat.envMapIntensity = opts.envInt;
    else mat.envMapIntensity = 1.0;
    mat.needsUpdate = true;
  };

  set(M.concrete, { map: conc.color, rough: conc.rough, normal: concN, repeat: [6, 4], normalScale: 1.0, envInt: 0.5 });
  set(M.concreteDark, { map: conc.color, rough: conc.rough, normal: concN, repeat: [2, 2], normalScale: 0.9, envInt: 0.4 });
  set(M.wallOuter, { map: plaster.color, rough: plaster.rough, normal: plasterN, repeat: [4, 1], normalScale: 0.6, envInt: 0.45 });
  set(M.buildingFar, { map: plaster.color, rough: plaster.rough, normal: plasterN, repeat: [2, 2], envInt: 0.3 });
  set(M.floorPlank, { map: woodWarm.color, rough: woodWarm.rough, normal: woodN, repeat: [3, 1], normalScale: 0.7, envInt: 0.7 });
  set(M.floorPlankAlt, { map: woodDeep.color, rough: woodDeep.rough, normal: woodDeepN, repeat: [3, 1], normalScale: 0.7, envInt: 0.7 });
  set(M.pergolaWood, { map: woodDeep.color, rough: woodDeep.rough, normal: woodDeepN, repeat: [1, 3], normalScale: 0.6, envInt: 0.6 });
  set(M.pergolaWoodDark, { map: woodDeep.color, rough: woodDeep.rough, normal: woodDeepN, repeat: [1, 2], normalScale: 0.6, envInt: 0.6 });
  set(M.screenWood, { map: woodDeep.color, rough: woodDeep.rough, normal: woodDeepN, repeat: [1, 2], envInt: 0.6 });
  set(M.tableWood, { map: woodWarm.color, rough: woodWarm.rough, normal: woodN, repeat: [2, 2], envInt: 0.9 });
  set(M.sofaFabric, { map: fabLight.color, normal: fabN, repeat: [3, 3], normalScale: 0.5, envInt: 0.35 });
  set(M.sofaAccent, { normal: fabN, repeat: [3, 3], normalScale: 0.5, envInt: 0.35 });
  set(M.cushionA, { normal: fabN, repeat: [2, 2], normalScale: 0.6, envInt: 0.3 });
  set(M.cushionB, { normal: fabN, repeat: [2, 2], normalScale: 0.6, envInt: 0.3 });
  set(M.rug, { map: fabLight.color, normal: fabN, repeat: [4, 4], normalScale: 0.7, envInt: 0.25 });
  [M.plantDark, M.plantMid, M.plantLight].forEach((m, i) =>
    set(m, { map: leaf.color, normal: leafN, repeat: [2 + i, 2 + i], normalScale: 0.8, envInt: 0.6 }),
  );
  set(M.planter, { map: plaster.color, rough: plaster.rough, normal: plasterN, repeat: [2, 1], envInt: 0.5 });
  set(M.planterDark, { map: plaster.color, rough: plaster.rough, normal: plasterN, repeat: [2, 1], envInt: 0.5 });

  // metals: anisotropic-ish brushed look through roughness variation
  set(M.metalFrame, { rough: conc.rough, normal: concN, repeat: [3, 3], normalScale: 0.25, envInt: 1.4 });
  set(M.pipe, { rough: conc.rough, normal: concN, repeat: [1, 3], normalScale: 0.3, envInt: 1.3 });
  set(M.fixture, { normal: concN, repeat: [1, 1], normalScale: 0.2, envInt: 1.2 });

  // skin + clothing get subtle sheen instead of flat diffuse
  [M.skinA, M.skinB].forEach((m) => {
    if (!m) return;
    m.roughness = 0.55;
    m.envMapIntensity = 0.55;
    m.needsUpdate = true;
  });
  [M.workwear, M.designerTop, M.designerBottom, M.hiVis, M.hair].forEach((m) =>
    set(m, { normal: fabN, repeat: [2, 2], normalScale: 0.45, envInt: 0.4 }),
  );
  if (M.hair) {
    M.hair.roughness = 0.45;
    M.hair.envMapIntensity = 0.8;
  }
  if (M.hiVis) {
    M.hiVis.roughness = 0.6;
    M.hiVis.envMapIntensity = 0.5;
  }
}

/* ------------------------------------------------------------------
   PHYSICAL SKY + IBL
------------------------------------------------------------------ */
export function createSkyEnvironment(renderer, scene) {
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 4.2;
  u.rayleigh.value = 2.1;
  u.mieCoefficient.value = 0.006;
  u.mieDirectionalG.value = 0.82;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  let envRT = null;
  const sunPos = new THREE.Vector3();
  let elev = 46;

  /* equirect sky painted on canvas — stable, no HDR overflow in the IBL */
  const eqCanvas = document.createElement("canvas");
  eqCanvas.width = 512;
  eqCanvas.height = 256;
  const eqCtx = eqCanvas.getContext("2d");
  const eqTex = new THREE.Texture(eqCanvas);
  eqTex.mapping = THREE.EquirectangularReflectionMapping;
  eqTex.colorSpace = THREE.SRGBColorSpace;
  eqTex.flipY = false;

  function paintEquirect() {
    const dusk = THREE.MathUtils.clamp(1 - elev / 46, 0, 1);
    const zenith = dusk > 0.5 ? `rgb(${40 + 60 * dusk},${52 + 30 * dusk},${92 - 10 * dusk})` : "rgb(52,104,178)";
    const horizon = dusk > 0.35 ? `rgb(${226},${150 - 40 * dusk},${92 - 40 * dusk})` : "rgb(178,206,232)";
    const ground = `rgb(${Math.round(120 - 40 * dusk)},${Math.round(130 - 48 * dusk)},${Math.round(138 - 56 * dusk)})`;
    // flipY=false: canvas row 0 maps to the bottom of the sphere
    const g = eqCtx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, ground);
    g.addColorStop(0.46, ground);
    g.addColorStop(0.54, horizon);
    g.addColorStop(1, zenith);
    eqCtx.fillStyle = g;
    eqCtx.fillRect(0, 0, 512, 256);
    // warm sun disc glow for directional reflections
    const sx = ((Math.atan2(sunPos.z, sunPos.x) / (Math.PI * 2) + 0.5) % 1) * 512;
    const sy = (Math.asin(Math.max(-1, Math.min(1, sunPos.y))) / Math.PI + 0.5) * 256;
    const glow = eqCtx.createRadialGradient(sx, sy, 0, sx, sy, 96);
    glow.addColorStop(0, dusk > 0.5 ? "rgba(255,170,90,0.95)" : "rgba(255,246,226,0.95)");
    glow.addColorStop(0.35, "rgba(255,214,160,0.28)");
    glow.addColorStop(1, "rgba(255,214,160,0)");
    eqCtx.fillStyle = glow;
    eqCtx.fillRect(0, 0, 512, 256);
    eqTex.needsUpdate = true;
  }

  /** elevation in degrees, azimuth in degrees */
  function update(elevation, azimuth, turbidity, rayleigh) {
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    sunPos.setFromSphericalCoords(1, phi, theta);
    u.sunPosition.value.copy(sunPos);
    u.turbidity.value = turbidity;
    u.rayleigh.value = rayleigh;
    elev = elevation;
    return sunPos;
  }

  function refreshEnvironment() {
    paintEquirect();
    // use the equirect sky directly: prefiltered PMREM targets are unstable on
    // software / low-end GL backends and can black out PBR surfaces
    scene.environment = eqTex;
    scene.environmentIntensity = 2.4;
    // controlled gradient sky as the backdrop (the physical Sky shader blows out
    // to white under filmic tone mapping)
    scene.background = eqTex;
    scene.backgroundIntensity = 2.8;
  }

  function dispose() {
    if (envRT) envRT.dispose();
    pmrem.dispose();
    eqTex.dispose();
    sky.geometry.dispose();
    sky.material.dispose();
  }

  return { sky, update, refreshEnvironment, dispose, sunPos };
}

/* ------------------------------------------------------------------
   CINEMATIC POST PIPELINE
------------------------------------------------------------------ */
export function createPostPipeline(renderer, scene, camera, quality) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  let ssao = null;
  if (false && quality === "high") {
    ssao = new SSAOPass(scene, camera, w, h);
    ssao.kernelRadius = 0.55;
    ssao.minDistance = 0.0012;
    ssao.maxDistance = 0.09;
    ssao.output = SSAOPass.OUTPUT.Default;
    composer.addPass(ssao);
  }

  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.28, 0.85, 0.92);
  composer.addPass(bloom);

  let bokeh = null;
  if (quality !== "low") {
    bokeh = new BokehPass(scene, camera, { focus: 9, aperture: 0.00055, maxblur: 0.0075 });
    composer.addPass(bokeh);
  }

  composer.addPass(new OutputPass());

  function setFocus(distance, apertureScale = 1) {
    if (!bokeh) return;
    bokeh.uniforms["focus"].value = distance;
    bokeh.uniforms["aperture"].value = 0.00055 * apertureScale;
  }
  function setBloom(strength) {
    bloom.strength = strength;
  }
  function setSize(nw, nh) {
    composer.setSize(nw, nh);
    if (ssao) ssao.setSize(nw, nh);
  }
  return { composer, setFocus, setBloom, setSize, dispose: () => composer.dispose?.() };
}

/* ------------------------------------------------------------------
   ATMOSPHERE — floating dust / pollen motes
------------------------------------------------------------------ */
export function createAtmosphere(count = 700) {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 1] = Math.random() * 7;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    speeds[i] = 0.05 + Math.random() * 0.16;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const sctx = sprite.getContext("2d");
  const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,246,228,1)");
  g.addColorStop(1, "rgba(255,246,228,0)");
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, 64, 64);

  const mat = new THREE.PointsMaterial({
    size: 0.05,
    map: new THREE.CanvasTexture(sprite),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.35,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  function update(t) {
    const p = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      p[i * 3 + 1] += speeds[i] * 0.004;
      p[i * 3] += Math.sin(t * 0.3 + i) * 0.0012;
      if (p[i * 3 + 1] > 7) p[i * 3 + 1] = 0;
    }
    geo.attributes.position.needsUpdate = true;
  }
  return { points, update, material: mat };
}

/* ------------------------------------------------------------------
   CONTACT SHADOW — soft grounded blob under props & people
------------------------------------------------------------------ */
let contactTexture = null;
function getContactTexture() {
  if (contactTexture) return contactTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.55, "rgba(0,0,0,0.2)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  contactTexture = new THREE.CanvasTexture(c);
  return contactTexture;
}
export function makeContactShadow(radius = 0.4, opacity = 0.75) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map: getContactTexture(),
      transparent: true,
      depthWrite: false,
      opacity,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 2;
  return mesh;
}

/* ------------------------------------------------------------------
   ANATOMICAL FIGURE — smooth, correctly proportioned human
------------------------------------------------------------------ */
function latheProfile(pts, seg = 20) {
  return new THREE.LatheGeometry(
    pts.map((p) => new THREE.Vector2(p[0], p[1])),
    seg,
  );
}

/**
 * ~1.75m human with realistic proportions (7.5 heads), smooth shading,
 * capsule limbs, shoulders/hips, hands, shoes and shadow contact.
 * Exposes the same userData handles as the previous figure builder.
 */
export function makeRealisticFigure(kit, M) {
  const g = new THREE.Group();
  const skin = kit.skin;
  const top = kit.top;
  const bottom = kit.bottom;

  const smooth = (mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // torso: tapered lathe (chest wider than waist), hips block
  const torso = smooth(
    new THREE.Mesh(
      latheProfile([
        [0.001, 0],
        [0.115, 0.03],
        [0.145, 0.12],
        [0.16, 0.26],
        [0.155, 0.38],
        [0.13, 0.46],
        [0.07, 0.5],
        [0.001, 0.51],
      ], 24),
      top,
    ),
  );
  torso.position.y = 0.98;
  torso.scale.z = 0.72;
  g.add(torso);

  const hips = smooth(new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14), bottom));
  hips.position.y = 0.95;
  hips.scale.set(1, 0.72, 0.78);
  g.add(hips);

  const neck = smooth(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.09, 14), skin));
  neck.position.y = 1.5;
  g.add(neck);

  // head: egg-shaped, slight jaw taper
  const head = smooth(new THREE.Mesh(new THREE.SphereGeometry(0.098, 28, 22), skin));
  head.position.y = 1.6;
  head.scale.set(0.92, 1.14, 1.0);
  g.add(head);
  const jaw = smooth(new THREE.Mesh(new THREE.SphereGeometry(0.072, 20, 16), skin));
  jaw.position.set(0, 1.545, 0.018);
  jaw.scale.set(0.95, 0.8, 1.0);
  head.add(jaw.clone().translateY(-0.05));
  const hair = smooth(
    new THREE.Mesh(new THREE.SphereGeometry(0.104, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), kit.hair),
  );
  hair.position.y = 1.615;
  hair.scale.set(0.96, 1.12, 1.02);
  g.add(hair);

  // shoulders
  [-1, 1].forEach((s) => {
    const sh = smooth(new THREE.Mesh(new THREE.SphereGeometry(0.062, 18, 14), top));
    sh.position.set(s * 0.165, 1.42, 0);
    g.add(sh);
  });

  function limb(rTop, rBot, len, mat) {
    const m = smooth(new THREE.Mesh(new THREE.CapsuleGeometry((rTop + rBot) / 2, len, 8, 16), mat));
    m.position.y = -len / 2;
    return m;
  }

  // arms: upper + forearm + hand, hinged at shoulder and elbow
  const arms = {};
  [-1, 1].forEach((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.175, 1.42, 0);
    g.add(pivot);
    const upper = limb(0.042, 0.038, 0.24, top);
    pivot.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    pivot.add(elbow);
    const fore = limb(0.036, 0.03, 0.22, skin);
    elbow.add(fore);
    const hand = smooth(new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), skin));
    hand.scale.set(0.75, 1.15, 0.5);
    hand.position.y = -0.31;
    elbow.add(hand);
    pivot.rotation.z = s * 0.06;
    if (s < 0) {
      arms.L = pivot;
      arms.LE = elbow;
    } else {
      arms.R = pivot;
      arms.RE = elbow;
    }
  });

  // legs: thigh + shin + shoe
  const legs = {};
  [-1, 1].forEach((s) => {
    const hip = new THREE.Group();
    hip.position.set(s * 0.078, 0.9, 0);
    g.add(hip);
    const thigh = limb(0.068, 0.055, 0.36, bottom);
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    const shin = limb(0.052, 0.042, 0.36, bottom);
    knee.add(shin);
    const shoe = smooth(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), M.metalFrame));
    shoe.scale.set(0.85, 0.55, 1.7);
    shoe.position.set(0, -0.47, 0.035);
    knee.add(shoe);
    if (s < 0) {
      legs.L = hip;
      legs.LK = knee;
    } else {
      legs.R = hip;
      legs.RK = knee;
    }
  });

  if (kit.vest) {
    const vest = smooth(
      new THREE.Mesh(
        latheProfile([
          [0.001, 0],
          [0.152, 0.02],
          [0.168, 0.14],
          [0.162, 0.28],
          [0.12, 0.33],
          [0.001, 0.34],
        ], 22),
        M.hiVis,
      ),
    );
    vest.position.y = 1.06;
    vest.scale.z = 0.74;
    g.add(vest);
    const helmet = smooth(new THREE.Mesh(new THREE.SphereGeometry(0.115, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), M.hiVis));
    helmet.position.y = 1.63;
    helmet.scale.set(1, 0.9, 1.05);
    g.add(helmet);
    const brim = smooth(new THREE.Mesh(new THREE.TorusGeometry(0.113, 0.012, 8, 24), M.hiVis));
    brim.rotation.x = Math.PI / 2;
    brim.position.y = 1.628;
    g.add(brim);
  }

  const shadow = makeContactShadow(0.34, 0.6);
  shadow.position.y = 0.005;
  g.add(shadow);

  g.userData.armPivotL = arms.L;
  g.userData.armPivotR = arms.R;
  g.userData.elbowL = arms.LE;
  g.userData.elbowR = arms.RE;
  g.userData.legL = legs.L;
  g.userData.legR = legs.R;
  g.userData.kneeL = legs.LK;
  g.userData.kneeR = legs.RK;
  g.userData.head = head;
  g.userData.torso = torso;
  return g;
}

/** Natural walk / idle animation for figures built above. */
export function animateFigure(fig, t, walking) {
  const u = fig.userData;
  if (!u.legL) return;
  const s = walking ? 1 : 0.18;
  const ph = t * (walking ? 5.6 : 1.4);
  u.legL.rotation.x = Math.sin(ph) * 0.55 * s;
  u.legR.rotation.x = -Math.sin(ph) * 0.55 * s;
  u.kneeL.rotation.x = Math.max(0, -Math.sin(ph - 0.6)) * 0.8 * s;
  u.kneeR.rotation.x = Math.max(0, Math.sin(ph - 0.6)) * 0.8 * s;
  if (u.armPivotL) u.armPivotL.rotation.x = -Math.sin(ph) * 0.42 * s;
  if (u.armPivotR) u.armPivotR.rotation.x = Math.sin(ph) * 0.42 * s;
  if (u.elbowL) u.elbowL.rotation.x = -0.25 - Math.abs(Math.sin(ph)) * 0.3 * s;
  if (u.elbowR) u.elbowR.rotation.x = -0.25 - Math.abs(Math.cos(ph)) * 0.3 * s;
  if (u.torso) u.torso.rotation.y = Math.sin(ph) * 0.06 * s;
}
