import * as THREE from 'three';
import { bakeParts, damp, hash } from './util.js';

/* Nhân vật nam / nữ – mỗi khớp là 1 mesh màu đỉnh, dùng chung vật liệu → ~11 draw call / người */
const BODY = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
const G = {
  sph: new THREE.SphereGeometry(1, 16, 12),
  sphLo: new THREE.SphereGeometry(1, 9, 7),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cylLo: new THREE.CylinderGeometry(1, 1, 1, 9),
  cone: new THREE.CylinderGeometry(0.85, 1, 1, 12),
  box: new THREE.BoxGeometry(1, 1, 1),
  cap: new THREE.CapsuleGeometry(1, 1, 4, 8),
  tor: new THREE.TorusGeometry(1, 0.28, 6, 18),
  hat: new THREE.ConeGeometry(1, 1, 18),
  halfTop: new THREE.SphereGeometry(1, 16, 9, 0, Math.PI * 2, 0, Math.PI * 0.56),
  halfBack: new THREE.SphereGeometry(1, 14, 6, Math.PI * 0.62, Math.PI * 1.76, Math.PI * 0.3, Math.PI * 0.32)
};
const lathe = pts => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 18);
const TORSO = {
  nam: lathe([[0, -0.02], [0.168, -0.02], [0.162, 0.14], [0.176, 0.32], [0.17, 0.42], [0.125, 0.49], [0.055, 0.53], [0, 0.535]]),
  nu: lathe([[0, -0.02], [0.165, -0.02], [0.136, 0.15], [0.146, 0.3], [0.143, 0.41], [0.1, 0.48], [0.045, 0.515], [0, 0.52]])
};
const SKINS = ['#e9b48f', '#dca47e', '#f1c6a5', '#c98d68', '#f4d0b5'];
const PANTS = ['#2b2f3a', '#3b4a63', '#5a4a3a', '#1f2a24', '#6b6f78', '#20232b', '#4a5d7a'];
const SANDALS = ['#2a62c9', '#d23a2a', '#1d1d1d', '#e0e0e0', '#8a5a3a'];

const cache = new Map();
const bake = (key, parts) => { if (!cache.has(key)) cache.set(key, bakeParts(parts)); return cache.get(key); };

export function makeChar(o = {}) {
  const seed = o.seed ?? Math.floor(Math.random() * 1e6);
  const g = o.gender === 'nu' ? 'nu' : 'nam', F = g === 'nu';
  const skin = o.skin || SKINS[Math.floor(hash(seed, 1) * SKINS.length)];
  const shirt = o.shirt || '#e8432f';
  const pants = o.pants || PANTS[Math.floor(hash(seed, 2) * PANTS.length)];
  const sandal = o.sandal || SANDALS[Math.floor(hash(seed, 3) * SANDALS.length)];
  const shorts = o.shorts ?? (F ? hash(seed, 4) < 0.35 : hash(seed, 4) < 0.6);
  const hair = o.hair || (F ? 'dai' : 'ngan');
  const belly = F ? 0 : (o.belly ?? (hash(seed, 5) < 0.3 ? 1 : 0));
  const apron = o.apron || null;
  const hairCol = o.hairColor || (hash(seed, 6) < (F ? 0.3 : 0.12) ? '#4a2c1a' : '#15100c');
  const c = new THREE.Color(shirt), l = c.getHSL({}).l;
  const accent = c.clone().offsetHSL(0, 0, l > 0.6 ? -0.25 : 0.18).getStyle();
  const SW = F ? 0.172 : 0.2;   // nửa bề rộng vai
  const HW = F ? 0.172 : 0.165; // nửa bề rộng hông
  const key = [g, skin, shirt, pants, sandal, shorts, hair, belly, apron, hairCol].join('|');

  const root = new THREE.Group();
  const mk = (geo, mat = BODY) => { const m = new THREE.Mesh(geo, mat); m.castShadow = false; return m; };

  const pelvis = new THREE.Group(); pelvis.position.y = 0.98; root.add(pelvis);
  pelvis.add(mk(bake('hip' + key, [
    [G.cyl, pants, 0, -0.03, 0, 0, 0, 0, HW + belly * 0.02, 0.2, 0.125 + belly * 0.02],
    [G.sph, pants, 0, -0.11, 0, 0, 0, 0, HW + belly * 0.02, 0.075, 0.13],
    [G.box, '#3a2a1e', 0, 0.06, 0, 0, 0, 0, HW * 2 + 0.01, 0.03, 0.255] // thắt lưng
  ])));

  const legs = [1, -1].map(side => {
    const th = new THREE.Group(); th.position.set(side * (HW * 0.53), -0.06, 0); pelvis.add(th);
    th.add(mk(bake('thigh' + key, shorts ? [
      [G.cone, pants, 0, -0.13, 0, Math.PI, 0, 0, 0.088, 0.27, 0.088],
      [G.cylLo, skin, 0, -0.34, 0, 0, 0, 0, 0.064, 0.2, 0.064]
    ] : [[G.cone, pants, 0, -0.22, 0, Math.PI, 0, 0, 0.082, 0.45, 0.082]])));
    const sh = new THREE.Group(); sh.position.y = -0.44; th.add(sh);
    const leg = shorts ? skin : pants;
    sh.add(mk(bake('shin' + key, [
      [G.sphLo, leg, 0, 0, 0, 0, 0, 0, 0.066, 0.066, 0.066],
      [G.cone, leg, 0, -0.21, 0, Math.PI, 0, 0, 0.058, 0.42, 0.058],
      [G.sph, skin, 0, -0.442, 0.05, 0, 0, 0, 0.042, 0.032, 0.105],
      [G.box, sandal, 0, -0.474, 0.048, 0, 0, 0, 0.092, 0.022, 0.25],
      [G.box, sandal, 0, -0.446, 0.075, 0, 0, 0, 0.094, 0.02, 0.04],
      [G.box, F ? '#e8e2d6' : sandal, 0, -0.45, -0.02, 0, 0, 0, 0.094, 0.016, 0.025]
    ])));
    return { th, sh };
  });

  /* Thân + áo */
  const spine = new THREE.Group(); spine.position.y = 0.02; pelvis.add(spine);
  const tp = [
    [TORSO[g], shirt, 0, 0, 0, 0, 0, 0, F ? 1 : 1.08, 1, 0.72],
    [G.cylLo, skin, 0, 0.565, 0.005, 0, 0, 0, F ? 0.04 : 0.047, 0.11, F ? 0.04 : 0.047],
    [G.tor, accent, 0, 0.515, 0.0, Math.PI / 2, 0, 0, 0.075, 0.075, 0.09],                 // cổ áo
    [G.box, accent, 0, 0.42, 0.112, 0, 0, 0, 0.022, 0.12, 0.012],                          // nẹp nút
    [G.sphLo, '#f4f4f0', 0, 0.45, 0.12, 0, 0, 0, 0.007, 0.007, 0.005],
    [G.sphLo, '#f4f4f0', 0, 0.4, 0.12, 0, 0, 0, 0.007, 0.007, 0.005],
    [G.box, accent, F ? 0.07 : 0.08, 0.32, 0.12, 0, 0, 0, 0.05, 0.05, 0.01]               // logo / túi áo
  ];
  if (F) tp.push([G.sph, shirt, 0.058, 0.32, 0.075, 0, 0, 0, 0.062, 0.058, 0.055], [G.sph, shirt, -0.058, 0.32, 0.075, 0, 0, 0, 0.062, 0.058, 0.055]);
  if (belly) tp.push([G.sph, shirt, 0, 0.12, 0.05, 0, 0, 0, 0.165, 0.15, 0.125]);
  if (apron) tp.push([G.box, apron, 0, 0.1, 0.13 + belly * 0.03, -0.05, 0, 0, 0.27, 0.44, 0.012], [G.box, apron, 0, 0.36, 0.115, 0, 0, 0, 0.18, 0.12, 0.01], [G.box, '#c4161c', 0, 0.05, 0.14, -0.05, 0, 0, 0.12, 0.08, 0.004]);
  spine.add(mk(bake('torso' + key, tp)));

  /* Đầu – vật liệu riêng để đỏ mặt khi phê */
  const headMat = BODY.clone();
  const head = new THREE.Group(); head.position.set(0, 0.6, 0.008); spine.add(head);
  head.add(mk(bake('head' + key, headParts(skin, hair, hairCol, F)), headMat));

  /* Tay */
  const arms = [1, -1].map(side => {
    const shp = new THREE.Group(); shp.position.set(side * SW, 0.45, 0); spine.add(shp);
    shp.add(mk(bake('uarm' + key + side, [
      [G.sphLo, shirt, 0, 0, 0, 0, 0, 0, F ? 0.062 : 0.072, F ? 0.062 : 0.072, F ? 0.062 : 0.072],
      [G.cone, shirt, 0, -0.08, 0, Math.PI, 0, 0, F ? 0.064 : 0.072, 0.16, F ? 0.064 : 0.072],
      [G.cylLo, skin, 0, -0.2, 0, 0, 0, 0, F ? 0.036 : 0.044, 0.2, F ? 0.036 : 0.044]
    ])));
    const el = new THREE.Group(); el.position.y = -0.29; shp.add(el);
    const hs = F ? 0.88 : 1;
    const hand = [
      [G.sphLo, skin, 0, 0, 0, 0, 0, 0, 0.042 * hs, 0.042 * hs, 0.042 * hs],
      [G.cone, skin, 0, -0.12, 0, Math.PI, 0, 0, 0.036 * hs, 0.24, 0.036 * hs],
      [G.box, skin, 0, -0.275, 0.004, 0, 0, 0, 0.026 * hs, 0.07 * hs, 0.07 * hs],                 // lòng bàn tay
      [G.box, skin, 0, -0.335, 0.012, 0.25, 0, 0, 0.022 * hs, 0.06 * hs, 0.062 * hs],            // ngón
      [G.cap, skin, side * -0.006, -0.27, 0.045 * hs, 0.7, 0, 0, 0.011 * hs, 0.024 * hs, 0.011 * hs] // ngón cái
    ];
    if (F && side < 0) hand.push([G.tor, '#d8b04a', 0, -0.24, 0, Math.PI / 2, 0, 0, 0.04, 0.04, 0.05]); // vòng tay
    el.add(mk(bake('farm' + key + side, hand)));
    const handG = new THREE.Group(); handG.position.set(0, -0.3, 0.03); el.add(handG);
    return { shp, el, hand: handG };
  });

  const P = basePose(), T = basePose();
  const ch = {
    root, pelvis, spine, head, headMat, legs, arms, handL: arms[0].hand, handR: arms[1].hand, P, T, seed, gender: g,
    glass: null, drunk: -1,
    setGlass(kind) { if (ch.glass) ch.handR.remove(ch.glass); ch.glass = kind ? makeGlass(kind) : null; if (ch.glass) ch.handR.add(ch.glass); },
    setDrunk(d) { if (Math.abs(d - ch.drunk) < 0.01) return; ch.drunk = d; headMat.color.setRGB(1, 1 - d * 0.24, 1 - d * 0.3); },
    update(dt, k = 12) {
      for (const n in P) P[n] = damp(P[n], T[n], k, dt);
      pelvis.position.y = P.py;
      legs[0].th.rotation.set(P.thL, 0, P.legSpread); legs[1].th.rotation.set(P.thR, 0, -P.legSpread);
      legs[0].sh.rotation.x = P.shnL; legs[1].sh.rotation.x = P.shnR;
      spine.rotation.set(P.sp, P.spy, P.spz);
      head.rotation.set(P.hx, P.hy, P.hz);
      arms[0].shp.rotation.set(P.shLx, P.shLy, P.shLz); arms[1].shp.rotation.set(P.shRx, P.shRy, P.shRz);
      arms[0].el.rotation.x = P.elL; arms[1].el.rotation.x = P.elR;
      if (ch.glass) ch.glass.rotation.x = -(P.sp + P.shRx + P.elR) + P.gl;
    }
  };
  ch.setDrunk(0);
  return ch;
}

function headParts(skin, hair, hc, F) {
  const eyeW = '#f7f3ee', iris = '#2a1a12', brow = hc === '#15100c' ? '#1b1410' : '#3a2416', lip = F ? '#c4485a' : '#a8645a';
  const s = F ? 0.95 : 1;
  const p = [
    [G.sph, skin, 0, 0.1, 0, 0, 0, 0, 0.094 * s, 0.118 * s, 0.103 * s],
    [G.sph, skin, 0, 0.05, 0.022, 0, 0, 0, (F ? 0.07 : 0.078), 0.072, 0.08],              // hàm
    [G.sphLo, skin, 0, 0.012, 0.06, 0, 0, 0, 0.03, 0.022, 0.025],                          // cằm
    [G.sphLo, skin, 0.093 * s, 0.093, -0.004, 0, 0, 0, 0.013, 0.03, 0.022],                // tai
    [G.sphLo, skin, -0.093 * s, 0.093, -0.004, 0, 0, 0, 0.013, 0.03, 0.022],
    [G.sphLo, eyeW, 0.034, 0.11, 0.084, 0, 0, 0, 0.017, 0.012, 0.008],
    [G.sphLo, eyeW, -0.034, 0.11, 0.084, 0, 0, 0, 0.017, 0.012, 0.008],
    [G.sphLo, iris, 0.034, 0.11, 0.09, 0, 0, 0, 0.0088, 0.0095, 0.005],
    [G.sphLo, iris, -0.034, 0.11, 0.09, 0, 0, 0, 0.0088, 0.0095, 0.005],
    [G.sphLo, '#ffffff', 0.031, 0.114, 0.0945, 0, 0, 0, 0.0026, 0.0026, 0.002],
    [G.sphLo, '#ffffff', -0.037, 0.114, 0.0945, 0, 0, 0, 0.0026, 0.0026, 0.002],
    [G.box, skin, 0.034, 0.12, 0.087, -0.3, 0, 0, 0.036, 0.006, 0.012],                    // mí trên
    [G.box, skin, -0.034, 0.12, 0.087, -0.3, 0, 0, 0.036, 0.006, 0.012],
    [G.box, brow, 0.036, 0.138, 0.09, 0, 0, -0.1, F ? 0.032 : 0.036, F ? 0.0045 : 0.0075, 0.01],
    [G.box, brow, -0.036, 0.138, 0.09, 0, 0, 0.1, F ? 0.032 : 0.036, F ? 0.0045 : 0.0075, 0.01],
    [G.cap, skin, 0, 0.088, 0.099, -0.25, 0, 0, 0.011, 0.016, 0.011],                      // sống mũi
    [G.sphLo, skin, 0, 0.074, 0.106, 0, 0, 0, 0.015, 0.011, 0.012],                        // đầu mũi
    [G.box, lip, 0, 0.049, 0.094, 0, 0, 0, 0.032, 0.007, 0.01],
    [G.box, lip, 0, 0.041, 0.091, 0, 0, 0, 0.026, 0.007, 0.01]
  ];
  if (F) p.push([G.box, '#111', 0.036, 0.117, 0.091, 0, 0, -0.15, 0.036, 0.004, 0.004], [G.box, '#111', -0.036, 0.117, 0.091, 0, 0, 0.15, 0.036, 0.004, 0.004],
    [G.sphLo, '#e8c050', 0.096, 0.07, 0.0, 0, 0, 0, 0.007, 0.007, 0.007], [G.sphLo, '#e8c050', -0.096, 0.07, 0.0, 0, 0, 0, 0.007, 0.007, 0.007]);
  const top = (col, sx = 1.07, sy = 1.06, y = 0.11, z = -0.008, tilt = -0.3) => p.push([G.halfTop, col, 0, y, z, tilt, 0, 0, 0.098 * sx, 0.12 * sy, 0.106 * sx]);
  switch (hair) {
    case 'ngan': top(hc); p.push([G.box, hc, 0, 0.18, 0.075, -0.6, 0, 0, 0.15, 0.03, 0.05]); break;
    case 'dinh': top(hc, 1.03, 1.0, 0.105, -0.004, -0.25); break;
    case 'vuot': top(hc); p.push([G.sph, hc, 0.02, 0.2, 0.05, 0, 0, -0.3, 0.07, 0.045, 0.07], [G.box, hc, 0.03, 0.17, 0.085, -0.5, 0, -0.2, 0.12, 0.035, 0.05]); break;
    case 'hoi': p.push([G.halfBack, hc, 0, 0.09, -0.004, 0, 0, 0, 0.1, 0.075, 0.108]); break;
    case 'mu': top('#1d3e8a', 1.12, 1.08, 0.12); p.push([G.box, '#1d3e8a', 0, 0.148, 0.12, -0.12, 0, 0, 0.17, 0.012, 0.12], [G.sphLo, '#ffffff', 0, 0.19, 0.075, 0, 0, 0, 0.03, 0.02, 0.005]); break;
    case 'nonla': top(hc); p.push([G.hat, '#e3cf8f', 0, 0.27, 0, 0, 0, 0, 0.3, 0.17, 0.3]); break;
    case 'dai':
      top(hc, 1.1, 1.08, 0.112);
      p.push([G.box, hc, 0, 0.0, -0.07, 0.08, 0, 0, 0.19, 0.3, 0.06], [G.box, hc, 0.085, 0.04, -0.02, 0, 0, 0.05, 0.03, 0.2, 0.09], [G.box, hc, -0.085, 0.04, -0.02, 0, 0, -0.05, 0.03, 0.2, 0.09],
        [G.box, hc, 0.035, 0.175, 0.08, -0.6, 0, 0.35, 0.09, 0.03, 0.05]); break;
    case 'duoi':
      top(hc, 1.08, 1.06, 0.112);
      p.push([G.sph, hc, 0, 0.15, -0.11, 0, 0, 0, 0.04, 0.04, 0.04], [G.cap, hc, 0, 0.05, -0.135, 0.25, 0, 0, 0.03, 0.12, 0.03], [G.tor, '#e8436a', 0, 0.14, -0.115, 0.3, 0, 0, 0.03, 0.03, 0.03]); break;
    case 'bui':
      top(hc, 1.08, 1.06, 0.112);
      p.push([G.sph, hc, 0, 0.21, -0.07, 0, 0, 0, 0.055, 0.05, 0.055], [G.cap, '#c8a050', 0, 0.21, -0.07, 0, 0, Math.PI / 2.3, 0.006, 0.07, 0.006]); break;
    case 'ngang':
      top(hc, 1.14, 1.08, 0.112);
      p.push([G.sph, hc, 0, 0.06, -0.025, 0, 0, 0, 0.112, 0.11, 0.105], [G.box, hc, 0, 0.17, 0.08, -0.5, 0, 0, 0.16, 0.03, 0.05]); break;
  }
  return p;
}

/* Ly bia / ly trà đá */
const GL = {
  bia: new THREE.MeshStandardMaterial({ color: 0xf0a020, emissive: 0x3a1c00, roughness: 0.15 }),
  foam: new THREE.MeshStandardMaterial({ color: 0xfff8e8, roughness: 0.9 }),
  tra: new THREE.MeshStandardMaterial({ color: 0x9c5a24, emissive: 0x2a1000, roughness: 0.15 }),
  ice: new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.85, roughness: 0.1 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xdfeef2, transparent: true, opacity: 0.35, roughness: 0.05 })
};
const glassGeo = new THREE.CylinderGeometry(0.036, 0.03, 0.11, 12);
const foamGeo = new THREE.CylinderGeometry(0.037, 0.037, 0.02, 12);
const iceGeo = new THREE.BoxGeometry(0.025, 0.025, 0.025);
export function makeGlass(kind) {
  const g = new THREE.Group();
  const liq = new THREE.Mesh(glassGeo, kind === 'bia' ? GL.bia : GL.tra); liq.position.y = 0.04; g.add(liq);
  if (kind === 'bia') { const f = new THREE.Mesh(foamGeo, GL.foam); f.position.y = 0.1; g.add(f); }
  for (let i = 0; i < (kind === 'bia' ? 1 : 2); i++) { const c = new THREE.Mesh(iceGeo, GL.ice); c.position.set(i ? 0.01 : -0.012, kind === 'bia' ? 0.11 : 0.1, 0); c.rotation.set(0.4, i, 0.3); g.add(c); }
  const rim = new THREE.Mesh(foamGeo, GL.rim); rim.scale.set(1.05, 0.6, 1.05); rim.position.y = 0.115; g.add(rim);
  g.position.set(0, -0.05, 0.035);
  return g;
}

/* ---------- Tư thế ---------- */
export function basePose() {
  return { py: 0.98, thL: 0, thR: 0, shnL: 0, shnR: 0, legSpread: 0, sp: 0, spz: 0, spy: 0, hx: 0, hy: 0, hz: 0, shLx: 0.05, shLy: 0, shLz: 0.1, shRx: 0.05, shRy: 0, shRz: -0.1, elL: -0.15, elR: -0.15, gl: 0 };
}
export function setPose(ch, st) {
  const T = ch.T, t = st.t, F = ch.gender === 'nu';
  Object.assign(T, basePose());
  const breathe = Math.sin(t * 1.7 + ch.seed) * 0.015;
  T.sp = breathe;
  if (F) { T.shLz = 0.06; T.shRz = -0.06; }
  if (st.mode === 'walk') {
    const s = Math.sin(st.ph), c = Math.cos(st.ph);
    T.thL = -s * 0.5; T.thR = s * 0.5;
    T.shnL = 0.1 + Math.max(0, c) * 0.7; T.shnR = 0.1 + Math.max(0, -c) * 0.7;
    T.shLx = s * 0.45; T.shRx = -s * 0.45; T.elL = T.elR = -0.3;
    T.py = 0.97 + Math.abs(c) * 0.025; T.sp = 0.05; T.spy = s * 0.06;
  } else if (st.mode === 'sit') {
    T.py = 0.54; T.thL = T.thR = -1.5; T.shnL = T.shnR = 1.4; T.legSpread = F ? 0.02 : 0.14;
    T.sp = 0.1 + breathe;
    T.shLx = -0.5; T.shLz = -0.12; T.elL = -0.95;
    T.shRx = -0.5; T.shRz = 0.12; T.elR = -0.95;
  }
  T.hy = st.look || 0;
  const a = st.act, k = st.k ?? 0;
  if (a === 'raise') { T.shRx = -1.75; T.shRz = 0.35; T.elR = -0.25; T.sp = 0.2; T.hx = -0.1; }
  else if (a === 'toast') { T.shRx = -1.45; T.shRz = 0.15 + (st.side || 0) * 0.5; T.shRy = (st.side || 0) * 0.6; T.elR = -0.5; T.hy = (st.side || 0) * 0.6; T.sp = 0.15; }
  else if (a === 'drink') {
    const u = Math.sin(Math.min(1, k) * Math.PI);
    T.shRx = -0.5 - 0.55 * u; T.shRz = 0.12 + 0.38 * u; T.elR = -0.95 - 1.15 * u; T.hx = -0.45 * u; T.gl = -1.1 * u;
  } else if (a === 'rps') { T.shRx = -1.1 + Math.sin(t * 14) * 0.3; T.elR = -0.7; T.shRz = 0.25; }
  else if (a === 'reveal') { T.shRx = -1.3; T.elR = -0.45; T.shRz = 0.25; }
  else if (a === 'cheer') { T.shLx = T.shRx = -2.75; T.shLz = 0.35; T.shRz = -0.35; T.elL = T.elR = -0.3; T.hx = -0.25; }
  else if (a === 'clap') { T.shLx = T.shRx = -1.15; T.shLz = -0.45 - Math.sin(t * 16) * 0.12; T.shRz = 0.45 + Math.sin(t * 16) * 0.12; T.elL = T.elR = -0.6; }
  else if (a === 'talk') { T.shLx = -0.75 + Math.sin(t * 3.1 + ch.seed) * 0.25; T.shLz = -0.05; T.elL = -1.25 + Math.sin(t * 2.3) * 0.2; T.hy = (st.look || 0) + Math.sin(t * 0.9 + ch.seed) * 0.35; }
  else if (a === 'carry') { T.shLx = T.shRx = -0.8; T.shLz = -0.12; T.shRz = 0.12; T.elL = T.elR = -0.85; }
  else if (a === 'push') { T.shLx = T.shRx = -1.15; T.elL = T.elR = -0.35; T.sp = 0.15; }
  else if (a === 'wave') { T.shRx = -2.6; T.shRz = -0.25 + Math.sin(t * 9) * 0.35; T.elR = -0.4; }
  else if (a === 'scrub') {
    T.sp = 0.38; T.hx = 0.3;
    T.shLx = -0.95 + Math.sin(t * 9) * 0.12; T.shLz = -0.25 + Math.cos(t * 9) * 0.1; T.elL = -0.9;
    T.shRx = -0.95 - Math.sin(t * 9) * 0.12; T.shRz = 0.25 - Math.cos(t * 9) * 0.1; T.elR = -0.9;
  }
  if (st.mode === 'sit' && st.slump) { T.sp += 0.15 * st.slump; T.hx += 0.25 * st.slump; }
}
