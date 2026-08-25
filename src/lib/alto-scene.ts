// @ts-nocheck
/* eslint-disable */
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function initAltoScene(root: HTMLElement): () => void {


/* ============================================================
   UTIL
=============================================================*/
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function seg(p, a, b){ return clamp01((p - a) / (b - a)); }
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t){ return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
function lerp(a,b,t){ return a + (b-a)*t; }
function lerpColor(c1, c2, t, out){
  out = out || new THREE.Color();
  out.r = lerp(c1.r, c2.r, t); out.g = lerp(c1.g, c2.g, t); out.b = lerp(c1.b, c2.b, t);
  return out;
}

/* ============================================================
   CANVAS TEXTURE HELPERS (dimension labels, glow sprites)
=============================================================*/
function makeLabelSprite(text, opts){
  opts = opts || {};
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = "600 30px 'Space Mono', monospace";
  ctx.fillStyle = opts.color || 'rgba(244,238,227,0.92)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite:false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(1.6, 0.4, 1);
  return spr;
}
function makeGlowSprite(color, size){
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,128,128);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0 });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(size,size,1);
  return spr;
}

/* ============================================================
   SCENE / CAMERA / RENDERER
=============================================================*/
const canvas = root.querySelector('canvas#gl');
const scene = new THREE.Scene();
const skyDay = new THREE.Color('#BCD9EA');
const skyGold = new THREE.Color('#E8A15C');
scene.fog = new THREE.Fog(skyDay.getHex(), 18, 60);
scene.background = skyDay.clone();

const camera = new THREE.PerspectiveCamera(42, window.innerWidth/window.innerHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace || renderer.outputColorSpace;

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

const isMobile = window.innerWidth < 760;

/* ============================================================
   LIGHTS
=============================================================*/
const hemi = new THREE.HemisphereLight(0xdfeeff, 0x3a342c, 0.75);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.15);
sun.position.set(10, 16, 8);
sun.castShadow = !isMobile;
if(!isMobile){
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0025;
}
scene.add(sun);
scene.add(sun.target);

const fillLight = new THREE.PointLight(0xffe3c2, 0.25, 30);
fillLight.position.set(-6, 4, 6);
scene.add(fillLight);

/* ============================================================
   ROOT GROUPS
=============================================================*/
const world = new THREE.Group(); scene.add(world);
const gEnvironment   = new THREE.Group(); world.add(gEnvironment);
const gTerraceBase   = new THREE.Group(); world.add(gTerraceBase);
const gWorkers        = new THREE.Group(); world.add(gWorkers);
const gMeasure        = new THREE.Group(); world.add(gMeasure);
const gBlueprint      = new THREE.Group(); world.add(gBlueprint);
const gFlooring        = new THREE.Group(); world.add(gFlooring);
const gPergola         = new THREE.Group(); world.add(gPergola);
const gSeating          = new THREE.Group(); world.add(gSeating);
const gDining           = new THREE.Group(); world.add(gDining);
const gPlanters         = new THREE.Group(); world.add(gPlanters);
const gPrivacy          = new THREE.Group(); world.add(gPrivacy);
const gFixtures          = new THREE.Group(); world.add(gFixtures); // light fixtures + point lights
const gDecor              = new THREE.Group(); world.add(gDecor);
const gPeople              = new THREE.Group(); world.add(gPeople);

/* ============================================================
   MATERIALS PALETTE
=============================================================*/
const M = {
  concrete: new THREE.MeshStandardMaterial({ color:0x9b948a, roughness:0.95, metalness:0.02 }),
  concreteDark: new THREE.MeshStandardMaterial({ color:0x6e685f, roughness:0.9 }),
  wallOuter: new THREE.MeshStandardMaterial({ color:0xd8d0c2, roughness:0.85 }),
  pipe: new THREE.MeshStandardMaterial({ color:0x3c4046, roughness:0.5, metalness:0.6 }),
  floorPlank: new THREE.MeshStandardMaterial({ color:0xa9754a, roughness:0.7 }),
  floorPlankAlt: new THREE.MeshStandardMaterial({ color:0x8f5f3a, roughness:0.7 }),
  pergolaWood: new THREE.MeshStandardMaterial({ color:0x6b4a2e, roughness:0.75 }),
  pergolaWoodDark: new THREE.MeshStandardMaterial({ color:0x4a3220, roughness:0.75 }),
  sofaFabric: new THREE.MeshStandardMaterial({ color:0xd9cbb8, roughness:0.9 }),
  sofaAccent: new THREE.MeshStandardMaterial({ color:0x8c6a4e, roughness:0.85 }),
  tableWood: new THREE.MeshStandardMaterial({ color:0x7a4e2e, roughness:0.6 }),
  metalFrame: new THREE.MeshStandardMaterial({ color:0x2b2b2b, roughness:0.4, metalness:0.7 }),
  plantDark: new THREE.MeshStandardMaterial({ color:0x3e5b3a, roughness:0.85 }),
  plantMid: new THREE.MeshStandardMaterial({ color:0x5b7c4a, roughness:0.85 }),
  plantLight: new THREE.MeshStandardMaterial({ color:0x7fa05c, roughness:0.85 }),
  planter: new THREE.MeshStandardMaterial({ color:0xa8613d, roughness:0.8 }),
  planterDark: new THREE.MeshStandardMaterial({ color:0x5c4436, roughness:0.8 }),
  screenWood: new THREE.MeshStandardMaterial({ color:0x5b4128, roughness:0.8 }),
  rug: new THREE.MeshStandardMaterial({ color:0xb9a688, roughness:0.95 }),
  cushionA: new THREE.MeshStandardMaterial({ color:0xc98a52, roughness:0.9 }),
  cushionB: new THREE.MeshStandardMaterial({ color:0x4f5d4a, roughness:0.9 }),
  fixture: new THREE.MeshStandardMaterial({ color:0x2c2a26, roughness:0.5, metalness:0.4 }),
  bulb: new THREE.MeshStandardMaterial({ color:0xffdca0, emissive:0xffb35c, emissiveIntensity:0, roughness:0.4 }),
  skinA: new THREE.MeshStandardMaterial({ color:0xc99a72, roughness:0.8 }),
  skinB: new THREE.MeshStandardMaterial({ color:0xa87857, roughness:0.8 }),
  hiVis: new THREE.MeshStandardMaterial({ color:0xd9822b, roughness:0.7 }),
  workwear: new THREE.MeshStandardMaterial({ color:0x38424c, roughness:0.8 }),
  designerTop: new THREE.MeshStandardMaterial({ color:0xcabaa4, roughness:0.8 }),
  designerBottom: new THREE.MeshStandardMaterial({ color:0x35302b, roughness:0.8 }),
  hair: new THREE.MeshStandardMaterial({ color:0x241f1b, roughness:0.9 }),
  buildingFar: new THREE.MeshStandardMaterial({ color:0x5a6572, roughness:1 }),
};

/* ============================================================
   TERRACE BASE  (always visible — the constant reference)
=============================================================*/
(function buildTerraceBase(){
  const W = 13, D = 9;
  // structural base below terrace
  const base = new THREE.Mesh(new THREE.BoxGeometry(W+1, 3, D+1), M.buildingFar);
  base.position.y = -1.55; base.receiveShadow = true;
  gTerraceBase.add(base);

  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, D), M.concrete);
  slab.position.y = -0.05; slab.receiveShadow = true; slab.castShadow = true;
  gTerraceBase.add(slab);

  // subtle concrete imperfection patches
  for(let i=0;i<5;i++){
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.25+Math.random()*0.35, 10), M.concreteDark);
    patch.rotation.x = -Math.PI/2;
    patch.position.set((Math.random()-0.5)*W*0.8, 0.101, (Math.random()-0.5)*D*0.8);
    gTerraceBase.add(patch);
  }

  // parapet walls (3 sides — 4th side open for the view)
  const wallH = 0.9, wallT = 0.25;
  const wN = new THREE.Mesh(new THREE.BoxGeometry(W, wallH, wallT), M.wallOuter);
  wN.position.set(0, wallH/2, -D/2); wN.castShadow = true; wN.receiveShadow = true;
  gTerraceBase.add(wN);
  const wE = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, D), M.wallOuter);
  wE.position.set(W/2, wallH/2, 0); wE.castShadow = true; wE.receiveShadow = true;
  gTerraceBase.add(wE);
  const wS1 = new THREE.Mesh(new THREE.BoxGeometry(W*0.32, wallH, wallT), M.wallOuter);
  wS1.position.set(-W*0.34, wallH/2, D/2); wS1.castShadow = true;
  gTerraceBase.add(wS1);
  // west side left low + open toward the view
  const wWlow = new THREE.Mesh(new THREE.BoxGeometry(wallT, 0.45, D*0.5), M.wallOuter);
  wWlow.position.set(-W/2, 0.225, -D*0.22); wWlow.castShadow = true;
  gTerraceBase.add(wWlow);

  // pipe + drainage detail
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.4,10), M.pipe);
  pipe.position.set(W/2-0.4, 0.6, -D/2+0.5); pipe.castShadow = true;
  gTerraceBase.add(pipe);
  const drain = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), M.concreteDark);
  drain.rotation.x = -Math.PI/2; drain.position.set(2.6, 0.102, 1.8);
  gTerraceBase.add(drain);
  const elecBox = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.4,0.12), M.pipe);
  elecBox.position.set(-W/2+0.14, 0.6, D*0.1); elecBox.castShadow = true;
  gTerraceBase.add(elecBox);
})();

/* ============================================================
   CITY SKYLINE / SUN
=============================================================*/
const sunSprite = makeGlowSprite('rgba(255,214,150,1)', 9);
sunSprite.position.set(-14, 9, -16);
gEnvironment.add(sunSprite);

const skylineGroup = new THREE.Group();
gEnvironment.add(skylineGroup);
(function buildSkyline(){
  const n = 14;
  for(let i=0;i<n;i++){
    const w = 0.8 + Math.random()*1.4;
    const h = 2 + Math.random()*7;
    const d = 0.8 + Math.random()*1.4;
    const bld = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M.buildingFar.clone());
    const angle = lerp(-1.1, 1.15, i/(n-1)) + (Math.random()-0.5)*0.05;
    const radius = 20 + Math.random()*6;
    bld.position.set(Math.sin(angle)*radius, h/2 - 2, -Math.cos(angle)*radius - 6);
    bld.material.color.multiplyScalar(0.85 + Math.random()*0.3);
    skylineGroup.add(bld);
  }
})();

/* ============================================================
   HUMANOID BUILDER
=============================================================*/
function makeFigure(kit){
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.19,0.5,10), kit.top);
  torso.position.y = 0.95; torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13,12,10), kit.skin);
  head.position.y = 1.32; head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135,10,8,0,Math.PI*2,0,Math.PI*0.55), kit.hair);
  hair.position.y = 1.36;
  g.add(hair);

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.06,0.55,8), kit.bottom);
  legL.position.set(-0.08, 0.42, 0); legL.castShadow = true; g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.08; g.add(legR);

  const armPivotL = new THREE.Group(); armPivotL.position.set(-0.22, 1.16, 0); g.add(armPivotL);
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.045,0.46,8), kit.top);
  armL.position.y = -0.22; armL.castShadow = true; armPivotL.add(armL);

  const armPivotR = new THREE.Group(); armPivotR.position.set(0.22, 1.16, 0); g.add(armPivotR);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.045,0.46,8), kit.top);
  armR.position.y = -0.22; armR.castShadow = true; armPivotR.add(armR);

  if(kit.vest){
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.175,0.2,0.35,10), M.hiVis);
    vest.position.y = 1.0; g.add(vest);
  }
  g.userData.armPivotL = armPivotL;
  g.userData.armPivotR = armPivotR;
  g.userData.head = head;
  return g;
}

const worker1 = makeFigure({ top:M.workwear, bottom:M.workwear, skin:M.skinA, hair:M.hair, vest:true });
const worker2 = makeFigure({ top:M.designerTop, bottom:M.designerBottom, skin:M.skinB, hair:M.hair, vest:false });
worker1.position.set(-9, 0, 1.2);
worker2.position.set(-9, 0, -1.0);
gWorkers.add(worker1, worker2);

/* small seated/standing life figures for the finale */
const lifeFigures = [];
function addLifeFigure(x,y,z, seated, kit){
  const f = makeFigure(kit || { top:M.designerTop, bottom:M.designerBottom, skin:M.skinB, hair:M.hair });
  f.position.set(x,y,z);
  f.scale.setScalar(0.92);
  if(seated){ f.scale.y *= 0.72; }
  f.scale.setScalar(0.001);
  gPeople.add(f);
  lifeFigures.push(f);
  return f;
}
addLifeFigure(1.1, 0, 2.1, true, { top:M.cushionA, bottom:M.designerBottom, skin:M.skinA, hair:M.hair });
addLifeFigure(1.7, 0, 2.4, true, { top:M.designerTop, bottom:M.designerBottom, skin:M.skinB, hair:M.hair });
addLifeFigure(-2.6, 0, -2.0, false, { top:M.workwear, bottom:M.designerBottom, skin:M.skinA, hair:M.hair });
addLifeFigure(-3.1, 0, -1.7, false, { top:M.cushionB, bottom:M.designerBottom, skin:M.skinB, hair:M.hair });
addLifeFigure(3.4, 0, -1.2, true, { top:M.designerTop, bottom:M.designerBottom, skin:M.skinA, hair:M.hair });

/* ============================================================
   MEASUREMENT LINES (inspection)
=============================================================*/
(function buildMeasure(){
  function tapeLine(x1,z1,x2,z2,label){
    const pts = [ new THREE.Vector3(x1,0.06,z1), new THREE.Vector3(x2,0.06,z2) ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color:0xD9A85C, transparent:true, opacity:0.9 });
    const line = new THREE.Line(geo, mat);
    gMeasure.add(line);
    const lbl = makeLabelSprite(label, {});
    lbl.position.set((x1+x2)/2, 0.35, (z1+z2)/2);
    lbl.scale.set(1.1,0.28,1);
    gMeasure.add(lbl);
    return line;
  }
  tapeLine(-5.8, -3.6, 5.8, -3.6, '12.4 m');
  tapeLine(-5.8, -3.6, -5.8, 3.6, '8.1 m');
  tapeLine(-2, 0, 2, 0, '4.0 m');
})();

/* ============================================================
   BLUEPRINT OVERHEAD ZONES (planning)
=============================================================*/
(function buildBlueprint(){
  const grid = new THREE.GridHelper(13, 26, 0xD9A85C, 0x8C6A34);
  grid.position.y = 0.12;
  grid.material.transparent = true; grid.material.opacity = 0.35;
  gBlueprint.add(grid);

  function zone(x,z,w,d,color,label){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w,d), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.28, side:THREE.DoubleSide }));
    m.rotation.x = -Math.PI/2; m.position.set(x,0.13,z);
    gBlueprint.add(m);
    const lbl = makeLabelSprite(label, {});
    lbl.position.set(x, 0.5, z); lbl.scale.set(1.3,0.32,1);
    gBlueprint.add(lbl);
  }
  zone(-3.6, 1.6, 3.6, 3.2, 0x8fbf7a, 'RELAX');
  zone(0.2, -1.6, 3.4, 2.6, 0xd9a85c, 'SHADE');
  zone(3.6, 1.8, 3.0, 2.6, 0xc98a52, 'DINE');
  zone(-4.6, -2.0, 1.8, 3.6, 0x6fae5a, 'GREEN');
  zone(4.6, -1.6, 1.6, 3.2, 0x9fd4e8, 'VIEW');
})();

/* ============================================================
   LAYER 1 — FLOORING
=============================================================*/
(function buildFlooring(){
  const plankCount = 22;
  for(let i=0;i<plankCount;i++){
    const mat = i%2===0 ? M.floorPlank : M.floorPlankAlt;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.06, 0.36), mat);
    plank.position.set(0, 0.13, -3.6 + i*0.38);
    plank.receiveShadow = true;
    gFlooring.add(plank);
  }
})();

/* ============================================================
   LAYER 3 — PERGOLA
=============================================================*/
const pergolaPosts = [];
const pergolaBeams = new THREE.Group();
const pergolaRoof = new THREE.Group();
(function buildPergola(){
  const cx = 0.2, cz = -1.6, w = 3.2, d = 2.4, h = 2.5;
  const positions = [ [cx-w/2, cz-d/2], [cx+w/2, cz-d/2], [cx-w/2, cz+d/2], [cx+w/2, cz+d/2] ];
  positions.forEach(p=>{
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,h,10), M.pergolaWood);
    post.position.set(p[0], h/2, p[1]); post.castShadow = true;
    post.userData.fullY = h/2; post.userData.baseHeight = h;
    gPergola.add(post);
    pergolaPosts.push(post);
  });
  // beams (top perimeter)
  const beamY = h;
  const beamNS = new THREE.BoxGeometry(w+0.2, 0.1, 0.1);
  [cz-d/2, cz+d/2].forEach(z=>{
    const b = new THREE.Mesh(beamNS, M.pergolaWoodDark); b.position.set(cx, beamY, z); b.castShadow = true;
    pergolaBeams.add(b);
  });
  const beamEW = new THREE.BoxGeometry(0.1, 0.1, d+0.2);
  [cx-w/2, cx+w/2].forEach(x=>{
    const b = new THREE.Mesh(beamEW, M.pergolaWoodDark); b.position.set(x, beamY, cz); b.castShadow = true;
    pergolaBeams.add(b);
  });
  gPergola.add(pergolaBeams);
  // roof slats
  const slatCount = 7;
  for(let i=0;i<slatCount;i++){
    const slat = new THREE.Mesh(new THREE.BoxGeometry(w+0.2, 0.05, 0.12), M.pergolaWood);
    slat.position.set(cx, beamY+0.09, cz - d/2 + (i/(slatCount-1))*d);
    slat.castShadow = true;
    pergolaRoof.add(slat);
  }
  gPergola.add(pergolaRoof);
  // climbing plant accents at two posts
  [0,3].forEach(idx=>{
    const p = positions[idx];
    const vine = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16,0), M.plantMid);
    vine.position.set(p[0], h*0.75, p[1]);
    gPergola.add(vine);
  });
})();

/* ============================================================
   LAYER 4 — SEATING
=============================================================*/
(function buildSeating(){
  const g = new THREE.Group();
  // L sofa
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.34,0.9), M.sofaFabric);
  base.position.set(-3.6, 0.3, 1.2); base.castShadow = true; g.add(base);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.4,0.18), M.sofaAccent);
  back.position.set(-3.6, 0.55, 0.78); back.castShadow = true; g.add(back);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.34,0.9), M.sofaFabric);
  arm.position.set(-4.75, 0.3, 2.0); arm.castShadow = true; g.add(arm);
  const armBack = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.4,0.9), M.sofaAccent);
  armBack.position.set(-5.2, 0.55, 2.0); armBack.castShadow = true; g.add(armBack);

  // lounge chair
  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.3,0.7), M.sofaAccent);
  chair.position.set(-2.0, 0.28, 2.6); chair.castShadow = true; g.add(chair);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.14), M.sofaFabric);
  chairBack.position.set(-2.0, 0.55, 2.9); chairBack.castShadow = true; g.add(chairBack);

  // coffee table
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.06,20), M.tableWood);
  tableTop.position.set(-3.2, 0.42, 2.15); tableTop.castShadow = true; g.add(tableTop);
  const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.4,10), M.metalFrame);
  tableLeg.position.set(-3.2, 0.2, 2.15); g.add(tableLeg);

  gSeating.add(g);
})();

/* ============================================================
   LAYER 5 — DINING
=============================================================*/
const diningLight = { fixture:null, bulb:null };
(function buildDining(){
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.75,0.06,24), M.tableWood);
  top.position.set(3.4, 0.72, 1.8); top.castShadow = true; g.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,0.66,10), M.metalFrame);
  leg.position.set(3.4, 0.38, 1.8); g.add(leg);

  const chairPositions = [
    [3.4, 0.9], [3.4, 2.7], [2.5, 1.35], [2.5, 2.25], [4.3, 1.35], [4.3, 2.25]
  ];
  chairPositions.forEach(p=>{
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.06,0.32), M.pergolaWood);
    seat.position.set(p[0], 0.46, p[1]); seat.castShadow = true; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.34,0.05), M.pergolaWoodDark);
    const dx = p[0]-3.4, dz = p[1]-1.8; const ang = Math.atan2(dx,dz);
    back.position.set(p[0]+Math.sin(ang)*0.15, 0.66, p[1]+Math.cos(ang)*0.15);
    back.rotation.y = ang;
    g.add(back);
    const legS = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.42,6), M.metalFrame);
    legS.position.set(p[0],0.24,p[1]); g.add(legS);
  });

  // pendant light above table
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,1.6,6), M.fixture);
  cord.position.set(3.4, 1.9, 1.8); g.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22,0.22,16,1,true), M.fixture);
  shade.position.set(3.4, 1.1, 1.8); shade.rotation.x = Math.PI; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06,10,8), M.bulb.clone());
  bulb.position.set(3.4, 1.0, 1.8); g.add(bulb);
  diningLight.bulb = bulb;

  gDining.add(g);
})();

/* ============================================================
   LAYER 6 — PLANTERS & GREENERY
=============================================================*/
const plantersList = [];
(function buildPlanters(){
  const spots = [
    [-6.0, 3.4, 1.0], [-6.0, -3.4, 0.85], [5.9, -3.2, 0.9], [5.9, 3.3, 0.95],
    [1.6, -3.6, 0.7], [-1.2, -3.7, 0.65], [-5.6, 0.0, 0.8], [3.9, 3.5, 0.75],
    [-3.0, 3.6, 0.6], [1.4, 3.6, 0.6]
  ];
  spots.forEach((s,i)=>{
    const g = new THREE.Group();
    const size = s[2];
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(size*0.42,size*0.34,size*0.5,10), i%3===0?M.planterDark:M.planter);
    pot.position.y = size*0.25; pot.castShadow = true; g.add(pot);
    const clusterMats = [M.plantDark, M.plantMid, M.plantLight];
    for(let k=0;k<4;k++){
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(size*(0.28+Math.random()*0.16),0), clusterMats[k%3]);
      leaf.position.set((Math.random()-0.5)*size*0.3, size*(0.55+Math.random()*0.35), (Math.random()-0.5)*size*0.3);
      leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(s[0], 0, s[1]);
    g.userData.sway = Math.random()*Math.PI*2;
    gPlanters.add(g);
    plantersList.push(g);
  });
})();

/* ============================================================
   LAYER 7 — PRIVACY SCREEN
=============================================================*/
(function buildPrivacy(){
  const g = new THREE.Group();
  const slats = 9;
  for(let i=0;i<slats;i++){
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08,1.5,0.03), M.screenWood);
    slat.position.set(-6.35, 0.75, -3.0 + i*0.4);
    slat.castShadow = true;
    g.add(slat);
  }
  gPrivacy.add(g);
})();

/* ============================================================
   LAYER 8 — LIGHTING FIXTURES
=============================================================*/
const lightRigs = [];
(function buildLights(){
  const spots = [
    [-6.3, 2.9, 0.4], [-6.3, -2.9, 0.35], [5.85, -2.7, 0.35], [5.85, 2.9, 0.35],
    [0.2, -1.6, 2.6, true] // pergola centered upward fixture flag
  ];
  spots.forEach(s=>{
    const fixture = new THREE.Mesh(new THREE.SphereGeometry(0.06,10,8), M.fixture);
    fixture.position.set(s[0], 1.1, s[1]);
    gFixtures.add(fixture);
    const bulbMat = M.bulb.clone();
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8), bulbMat);
    bulb.position.copy(fixture.position);
    gFixtures.add(bulb);
    const glow = makeGlowSprite('rgba(255,201,138,1)', 1.0);
    glow.position.copy(fixture.position);
    gFixtures.add(glow);
    const pl = new THREE.PointLight(0xffc98a, 0, 3.2, 2);
    pl.position.copy(fixture.position);
    gFixtures.add(pl);
    lightRigs.push({ bulbMat, glow, pl });
  });
  // step / floor accent lights along the walkway
  for(let i=0;i<4;i++){
    const pos = new THREE.Vector3(-4.5 + i*3, 0.12, 0.0);
    const bulbMat = M.bulb.clone();
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.02,10), bulbMat);
    bulb.position.copy(pos);
    gFixtures.add(bulb);
    const glow = makeGlowSprite('rgba(255,201,138,1)', 0.6);
    glow.position.copy(pos).setY(0.05);
    gFixtures.add(glow);
    const pl = new THREE.PointLight(0xffc98a, 0, 1.6, 2);
    pl.position.copy(pos).setY(0.2);
    gFixtures.add(pl);
    lightRigs.push({ bulbMat, glow, pl });
  }
  // pergola light
  diningLight.bulb.material.emissiveIntensity = 0;
  lightRigs.push({ bulbMat: diningLight.bulb.material, glow:null, pl:new THREE.PointLight(0xffc98a,0,2.4,2) });
  lightRigs[lightRigs.length-1].pl.position.set(3.4,1.0,1.8);
  gFixtures.add(lightRigs[lightRigs.length-1].pl);
})();

/* ============================================================
   LAYER 9 — DECOR
=============================================================*/
(function buildDecor(){
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.2), M.rug);
  rug.rotation.x = -Math.PI/2; rug.position.set(-3.6, 0.135, 1.6);
  gDecor.add(rug);

  const cushionSpots = [
    [-4.2, 0.5, 1.0, M.cushionA], [-3.0, 0.5, 1.0, M.cushionB], [-4.9, 0.5, 2.15, M.cushionA]
  ];
  cushionSpots.forEach(c=>{
    const cu = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.14,0.22), c[3]);
    cu.position.set(c[0], c[1], c[2]); cu.rotation.y = Math.random();
    cu.castShadow = true;
    gDecor.add(cu);
  });

  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.2,0.14), M.fixture);
  lantern.position.set(-3.0, 0.5, 2.3);
  const lbulb = new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8), M.bulb.clone());
  lbulb.position.set(-3.0, 0.5, 2.3);
  gDecor.add(lantern, lbulb);
  gDecor.userData.lanternBulb = lbulb;
})();

/* ============================================================
   INITIAL VISIBILITY / OPACITY SETUP
=============================================================*/
function setGroupOpacity(group, opacity, recurseScale){
  group.traverse(o=>{
    if(o.isMesh){
      o.material.transparent = true;
      o.material.opacity = opacity;
      o.visible = opacity > 0.003;
    }
    if(o.isSprite){
      o.material.opacity = opacity;
      o.visible = opacity > 0.003;
    }
    if(o.isLine){
      o.material.opacity = opacity;
      o.visible = opacity > 0.003;
    }
  });
}
[gMeasure, gBlueprint, gFlooring, gPergola, gSeating, gDining, gPlanters, gPrivacy, gDecor].forEach(g=>{
  setGroupOpacity(g, 0);
});
gPergola.children.forEach(c=>{ if(c.userData.baseHeight){ c.scale.y = 0.001; c.position.y = 0.001; } });
pergolaBeams.visible = false; pergolaRoof.visible = false;
worker1.visible = false; worker2.visible = false;
gPeople.children.forEach(f=>f.visible = false);

/* ============================================================
   CAMERA PATH  (Catmull-Rom through cinematic keyframes)
=============================================================*/
const camPoints = [
  new THREE.Vector3(0, 4.4, 11.5),     // 0.00 wide establishing
  new THREE.Vector3(-3.2, 2.6, 6.5),   // 0.06 workers enter
  new THREE.Vector3(-2.0, 2.0, 3.6),   // 0.16 following workers
  new THREE.Vector3(-0.6, 1.9, 3.0),   // 0.24 inspection close
  new THREE.Vector3(0.2, 2.4, 2.2),    // 0.32 measurement
  new THREE.Vector3(0.1, 9.5, 0.4),    // 0.40 overhead blueprint
  new THREE.Vector3(2.6, 3.4, 4.4),    // 0.48 flooring low pass
  new THREE.Vector3(1.4, 1.3, 0.2),    // 0.54 low angle flooring detail
  new THREE.Vector3(0.6, 1.6, 2.4),    // 0.58 pergola rising, look up
  new THREE.Vector3(-3.4, 1.6, 3.4),   // 0.63 seating area
  new THREE.Vector3(3.6, 1.7, 4.0),    // 0.68 dining area
  new THREE.Vector3(-5.4, 1.2, 1.4),   // 0.74 greenery close pass
  new THREE.Vector3(-1.5, 1.5, 6.0),   // 0.80 lighting / dusk transition
  new THREE.Vector3(0.2, 3.0, 8.0),    // 0.88 workers step back / pull begins
  new THREE.Vector3(0.4, 5.6, 12.5),   // 0.94 pulling back
  new THREE.Vector3(0.6, 6.8, 15.5),   // 1.00 final elevated reveal
];
const camLooks = [
  new THREE.Vector3(0,0.4,-1),
  new THREE.Vector3(-6,0.6,0),
  new THREE.Vector3(-1,0.9,0.5),
  new THREE.Vector3(0.2,0.6,-0.5),
  new THREE.Vector3(0.2,0.3,-1),
  new THREE.Vector3(0.1,0,-0.4),
  new THREE.Vector3(0,0.2,-1),
  new THREE.Vector3(0.5,0.5,-1.6),
  new THREE.Vector3(0.2,2.0,-1.6),
  new THREE.Vector3(-3.6,0.6,1.6),
  new THREE.Vector3(3.4,0.9,1.8),
  new THREE.Vector3(-6.0,0.6,0.6),
  new THREE.Vector3(0.2,0.8,-1.4),
  new THREE.Vector3(0.2,0.6,-0.5),
  new THREE.Vector3(0.2,0.4,-0.5),
  new THREE.Vector3(0.2,0.3,-0.6),
];
const camCurve = new THREE.CatmullRomCurve3(camPoints, false, 'catmullrom', 0.4);
const lookCurve = new THREE.CatmullRomCurve3(camLooks, false, 'catmullrom', 0.4);
const tmpLook = new THREE.Vector3();

/* ============================================================
   TEXT SECTIONS + STAGE DOTS + BUILD CAPTIONS
=============================================================*/
const introEl = root.querySelector('#intro');
const finaleEl = root.querySelector('#finale');
const storyEls = Array.from(root.querySelectorAll('.storytext'));
const stageDots = Array.from(root.querySelectorAll('.stagedot'));
const buildCaptionEl = root.querySelector('#buildcaption');
const buildLabelEl = root.querySelector('#buildlabel');
const railFill = root.querySelector('#rail-fill');

const SECTIONS = [
  { key:0, start:0.05, end:0.19 }, // SEE THE SPACE
  { key:1, start:0.20, end:0.31 }, // UNDERSTAND
  { key:2, start:0.33, end:0.44 }, // PLAN
  { key:3, start:0.87, end:1.00 }, // COMPLETE
];
const BUILD_LABELS = [
  { start:0.44, end:0.50, label:'Preparing & laying the flooring' },
  { start:0.50, end:0.585, label:'Raising the pergola' },
  { start:0.585, end:0.63, label:'Bringing in the seating' },
  { start:0.63, end:0.685, label:'Setting the dining area' },
  { start:0.685, end:0.755, label:'Planting the greenery' },
  { start:0.755, end:0.80, label:'Adding privacy screens' },
  { start:0.80, end:0.865, label:'Lighting the terrace' },
  { start:0.865, end:0.90, label:'Placing the finishing decor' },
];

let currentSection = -1;
let currentBuildLabel = '';
let introVisible = true;
let finaleVisible = false;

function updateText(p){
  // intro
  const introOpacity = 1 - seg(p, 0, 0.045);
  if(introOpacity <= 0.01 && introVisible){ introVisible = false; introEl.style.opacity = 0; introEl.style.pointerEvents = 'none'; }
  else if(introOpacity > 0.01 && !introVisible){ introVisible = true; }
  if(introVisible) introEl.style.opacity = String(introOpacity);

  // numbered stage sections
  let activeIdx = -1;
  for(const s of SECTIONS){ if(p >= s.start && p <= s.end){ activeIdx = s.key; break; } }
  if(activeIdx !== currentSection){
    storyEls.forEach(el=>{
      el.classList.toggle('on', Number(el.dataset.sec) === activeIdx);
    });
    currentSection = activeIdx;
  }

  // stage dot highlight (dot 2 "Plan" stays lit through the construction montage)
  let dotIdx = activeIdx;
  if(dotIdx === -1){
    if(p > 0.44 && p < 0.87) dotIdx = 2;
  }
  stageDots.forEach(d=>{
    d.classList.toggle('active', Number(d.dataset.i) === dotIdx);
  });

  // build caption
  let bl = '';
  for(const b of BUILD_LABELS){ if(p >= b.start && p < b.end){ bl = b.label; break; } }
  if(bl !== currentBuildLabel){
    currentBuildLabel = bl;
    if(bl){ buildLabelEl.textContent = bl; buildCaptionEl.classList.add('on'); }
    else{ buildCaptionEl.classList.remove('on'); }
  }

  // finale
  const showFinale = p > 0.94;
  if(showFinale !== finaleVisible){ finaleVisible = showFinale; finaleEl.classList.toggle('on', showFinale); }

  railFill.style.width = (p*100).toFixed(2) + '%';
}

/* ============================================================
   MAIN PROGRESS -> SCENE STATE
=============================================================*/
let progress = 0;
let clockStart = performance.now();

function applyProgress(p){

  /* ---- camera ---- */
  const ct = clamp01(p);
  camera.position.copy(camCurve.getPointAt(ct));
  tmpLook.copy(lookCurve.getPointAt(ct));
  camera.lookAt(tmpLook);

  /* ---- day -> golden hour environment ---- */
  const dusk = seg(p, 0.76, 0.98);
  const skyNow = lerpColor(skyDay, skyGold, easeInOutCubic(dusk));
  scene.background.copy(skyNow);
  scene.fog.color.copy(skyNow);
  hemi.intensity = lerp(0.78, 0.42, dusk);
  hemi.color.copy(lerpColor(new THREE.Color(0xdfeeff), new THREE.Color(0xffd9ad), dusk));
  sun.intensity = lerp(1.2, 0.55, dusk);
  sun.color.copy(lerpColor(new THREE.Color(0xffffff), new THREE.Color(0xffb066), dusk));
  const sunAngle = lerp(0.9, 0.18, dusk);
  sun.position.set(10*Math.cos(sunAngle*0.3), 6+10*sunAngle, 8*Math.cos(sunAngle*0.5));
  sun.target.position.set(0,0,0);
  sunSprite.position.set(-16*Math.cos(dusk*0.4), lerp(9, 2.6, dusk), -16 + dusk*4);
  sunSprite.material.opacity = lerp(0.55, 0.9, dusk);
  sunSprite.scale.setScalar(lerp(9, 13, dusk));

  /* ---- workers arrive & move through beats ---- */
  const arrive = seg(p, 0.04, 0.14);
  worker1.visible = worker2.visible = arrive > 0.001 && p < 0.93;
  const walkE1 = easeOutCubic(arrive);
  worker1.position.x = lerp(-9, -1.6, walkE1);
  worker2.position.x = lerp(-9, -0.9, walkE1);
  worker1.position.z = lerp(1.2, 1.1, walkE1);
  worker2.position.z = lerp(-1.0, -0.6, walkE1);

  const inspect = seg(p, 0.18, 0.30);
  if(inspect > 0 && inspect < 1){
    worker1.position.x = lerp(-1.6, -0.4, inspect);
    worker2.position.x = lerp(-0.9, 0.5, inspect);
    worker1.userData.armPivotR.rotation.z = -0.6 - Math.sin(inspect*Math.PI)*0.5;
    worker2.userData.armPivotL.rotation.z = 0.4 + Math.sin(inspect*Math.PI*1.3)*0.4;
  }
  const plan = seg(p, 0.34, 0.44);
  if(plan>0){
    worker1.position.set(lerp(-0.4,-1.6,plan), 0, lerp(1.1,2.4,plan));
    worker2.position.set(lerp(0.5,1.6,plan), 0, lerp(-0.6,-2.2,plan));
  }
  const build = seg(p, 0.46, 0.86);
  if(build>0){
    worker1.position.set(lerp(-1.6,1.2,Math.min(build*1.3,1)), 0, lerp(2.4,-2.6,Math.min(build*1.1,1)));
    worker2.position.set(lerp(1.6,-2.4,Math.min(build*1.2,1)), 0, lerp(-2.2,2.2,Math.min(build*1.1,1)));
  }
  const stepBack = seg(p, 0.865, 0.94);
  if(stepBack>0){
    worker1.position.x = lerp(worker1.position.x, -8.5, stepBack);
    worker2.position.x = lerp(worker2.position.x, -8.5, stepBack);
    worker1.position.z = lerp(worker1.position.z, 3.6, stepBack);
    worker2.position.z = lerp(worker2.position.z, -3.6, stepBack);
  }
  // idle bob
  const t = (performance.now()-clockStart)/1000;
  worker1.position.y = Math.abs(Math.sin(t*2.4))*0.012;
  worker2.position.y = Math.abs(Math.sin(t*2.4+1))*0.012;

  /* ---- measurement + blueprint ---- */
  setGroupOpacity(gMeasure, seg(p,0.19,0.24) - seg(p,0.30,0.33) > 0
    ? Math.min(seg(p,0.19,0.24), 1-seg(p,0.30,0.33)) : Math.max(0, Math.min(seg(p,0.19,0.24), 1-seg(p,0.30,0.33))));
  const blueprintOpacity = Math.min(seg(p,0.335,0.37), 1-seg(p,0.43,0.465));
  setGroupOpacity(gBlueprint, Math.max(0, blueprintOpacity));

  /* ---- flooring ---- */
  setGroupOpacity(gFlooring, seg(p,0.445,0.50));

  /* ---- pergola (posts -> beams -> roof) ---- */
  const pergOverall = seg(p, 0.50, 0.585);
  setGroupOpacity(gPergola, pergOverall > 0 ? 1 : 0);
  const postsT = easeOutCubic(seg(p,0.50,0.545));
  pergolaPosts.forEach(post=>{
    post.scale.y = Math.max(0.001, postsT);
    post.position.y = post.userData.fullY * postsT;
    post.material.transparent = true; post.material.opacity = 1;
  });
  pergolaBeams.visible = seg(p,0.545,0.565) > 0.01;
  pergolaRoof.visible = seg(p,0.565,0.585) > 0.4;

  /* ---- seating ---- */
  const seatT = easeOutCubic(seg(p,0.585,0.63));
  setGroupOpacity(gSeating, seatT);
  gSeating.children.forEach(c=>{ c.scale.setScalar(lerp(0.85,1,seatT)); c.position.y = -0.3*(1-seatT); });

  /* ---- dining ---- */
  const dineT = easeOutCubic(seg(p,0.63,0.685));
  setGroupOpacity(gDining, dineT);
  gDining.children.forEach(c=>{ c.scale.setScalar(lerp(0.85,1,dineT)); });

  /* ---- planters / greenery (staggered) ---- */
  const greenBand = seg(p, 0.685, 0.755);
  plantersList.forEach((pl,i)=>{
    const local = clamp01(greenBand*plantersList.length - i*0.7);
    const e = easeOutCubic(local);
    setGroupOpacity(pl, e);
    pl.scale.setScalar(Math.max(0.001, e));
    pl.rotation.y = Math.sin(t*0.6 + pl.userData.sway)*0.04*e;
  });

  /* ---- privacy screen ---- */
  setGroupOpacity(gPrivacy, seg(p,0.755,0.80));

  /* ---- lighting fixtures progressive turn-on + golden hour tail ---- */
  const lightBand = seg(p, 0.80, 0.865);
  const eveningGlow = seg(p, 0.80, 1.0);
  lightRigs.forEach((rig,i)=>{
    const local = clamp01(lightBand*lightRigs.length - i*0.8);
    const inten = Math.max(local, eveningGlow*0.85);
    rig.bulbMat.emissiveIntensity = inten * 1.4;
    if(rig.glow) rig.glow.material.opacity = inten * 0.85;
    if(rig.pl) rig.pl.intensity = inten * 1.1;
  });

  /* ---- decor ---- */
  setGroupOpacity(gDecor, seg(p,0.855,0.90));
  if(gDecor.userData.lanternBulb){
    gDecor.userData.lanternBulb.material.emissiveIntensity = seg(p,0.86,0.92)*1.4;
  }

  /* ---- people (life) ---- */
  const lifeT = seg(p, 0.885, 0.94);
  lifeFigures.forEach((f,i)=>{
    const local = clamp01(lifeT*lifeFigures.length - i*0.6);
    const e = easeOutCubic(local);
    f.visible = e > 0.01;
    f.scale.setScalar(Math.max(0.001, 0.92*e) * (f.userData.seatedScale || 1));
  });

  /* ---- global fade for measurement text sprites re-check ---- */

  updateText(p);
}

/* ============================================================
   SCROLLTRIGGER WIRING
=============================================================*/


/* ============================================================
   RENDER LOOP
=============================================================*/


/* ============================================================
   BOOT
=============================================================*/

/* ---- BOOT + CLEANUP ---- */
let rafId = 0;
function tick(){
  applyProgress(progress);
  renderer.render(scene, camera);
  rafId = requestAnimationFrame(tick);
}
gsap.registerPlugin(ScrollTrigger);
const st = ScrollTrigger.create({
  trigger: root.querySelector('#scroll-spacer'),
  start: 'top top',
  end: 'bottom bottom',
  scrub: 0.35,
  onUpdate(self){ progress = self.progress; }
});
applyProgress(0);
const loadingEl = root.querySelector('#loading');
if(loadingEl){
  loadingEl.style.opacity = '0';
  setTimeout(()=>{ loadingEl.style.display = 'none'; }, 850);
}
tick();

return () => {
  cancelAnimationFrame(rafId);
  st.kill();
  window.removeEventListener('resize', onResize);
  renderer.dispose();
};
}
