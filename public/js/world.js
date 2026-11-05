import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TABLES, STOOL_H, TABLE_H, MENU, SHOP_NAME, SHOP_PHONE, seatPos, SINK, WASH_PAY, UNIT } from './shared.js';
import { canvasTex, liveTex, fitText, softDot, bakeParts, mergeStatic, rng, hash } from './util.js';

/* Bố cục: z dương = trong quán (mặt tiền z=6), z âm = ra đường (lề z=-5, đường tới -15) */
const R = rng(2026);
export const VC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0 });
export const VCM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.85 });
export const VCG = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05 });
const S_ = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const B_ = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });

const blocks = [], circles = [];
export const addBlock = (x1, x2, z1, z2) => blocks.push({ x1, x2, z1, z2 });
export const addCircle = (x, z, r) => circles.push({ x, z, r });
export function blocked(x, z) {
  if (x < -36 || x > 36 || z < -14 || z > 10.3) return true;
  if (z > 5.9 && Math.abs(x) > 11.85) return true;
  for (const b of blocks) if (x > b.x1 - 0.28 && x < b.x2 + 0.28 && z > b.z1 - 0.28 && z < b.z2 + 0.28) return true;
  for (const c of circles) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.28) ** 2) return true;
  return false;
}

/* ---------------- Texture ---------------- */
const tileTex = (base, var_, grout, n = 4, dirt = 0.12) => canvasTex(256, 256, g => {
  g.fillStyle = grout; g.fillRect(0, 0, 256, 256);
  const s = 256 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = (R() - 0.5) * var_; const c = new THREE.Color(base).offsetHSL(0, 0, v);
    g.fillStyle = c.getStyle(); g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(i * s + 3, j * s + 3, s - 8, 3);
  }
  for (let k = 0; k < 26; k++) { g.fillStyle = `rgba(30,20,10,${R() * dirt})`; g.beginPath(); g.ellipse(R() * 256, R() * 256, 4 + R() * 22, 3 + R() * 12, R() * 3, 0, 7); g.fill(); }
  for (let k = 0; k < 600; k++) { g.fillStyle = `rgba(0,0,0,${R() * 0.08})`; g.fillRect(R() * 256, R() * 256, 1.5, 1.5); }
});
function roadTex() {
  return canvasTex(512, 512, g => {
    g.fillStyle = '#2a2b2f'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 14000; i++) { const v = 28 + R() * 46 | 0; g.fillStyle = `rgba(${v},${v},${v + 4},.55)`; g.fillRect(R() * 512, R() * 512, 2, 2); }
    for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(0,0,0,${0.1 + R() * 0.15})`; g.beginPath(); g.ellipse(R() * 512, R() * 512, 30 + R() * 60, 8 + R() * 20, R() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(15,15,15,.6)'; g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); let x = R() * 512, y = R() * 512; g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (R() - 0.5) * 60; y += (R() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
  });
}
function signTex() {
  return liveTex(2048, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#d0141c'); gr.addColorStop(0.5, '#b00d14'); gr.addColorStop(1, '#6e080c');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffd34a'; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28);
    for (let i = 0; i < 70; i++) { g.fillStyle = i % 2 ? '#fff6cf' : '#ffb02e'; for (const y of [7, H - 7]) { g.beginPath(); g.arc(12 + i * (W - 24) / 69, y, 4.5, 0, 7); g.fill(); } }
    // khối logo bên trái
    g.fillStyle = '#ffd34a'; g.beginPath(); g.arc(150, H / 2, 92, 0, 7); g.fill();
    g.fillStyle = '#b00d14'; g.beginPath(); g.arc(150, H / 2, 80, 0, 7); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe8a0';
    fitText(g, '🍻', 150, H / 2 + 6, 120, 100, 400);
    // chữ chính – luôn vừa khung
    const left = 270, right = W - 50, cx = (left + right) / 2, maxW = right - left;
    g.shadowColor = '#ffcf3a'; g.shadowBlur = 16; g.fillStyle = '#fff3b8';
    fitText(g, SHOP_NAME, cx, 92, maxW, 132, 900);
    g.shadowBlur = 0; g.fillStyle = '#ffe58a';
    fitText(g, `BIA LẠNH • ỐC • LẨU • NƯỚNG   ☎ ${SHOP_PHONE}`, cx, 192, maxW, 54, 700);
  });
}
function menuTex() {
  return liveTex(512, 720, (g, W, H) => {
    g.fillStyle = '#16231b'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c9a25a'; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, H - 12);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe9a8';
    fitText(g, 'THỰC ĐƠN', W / 2, 52, W - 60, 46, 800);
    g.fillStyle = '#c9a25a'; fitText(g, SHOP_NAME, W / 2, 92, W - 60, 22, 600);
    Object.values(MENU).forEach((m, i) => {
      const y = 140 + i * 47;
      g.textAlign = 'left'; g.fillStyle = '#f4f0e6'; fitText(g, m.name, 30, y, 340, 26, 500);
      g.textAlign = 'right'; g.fillStyle = '#ffd36b'; fitText(g, (m.price / 1000) + 'k', W - 30, y, 110, 26, 700);
    });
  });
}
function washSignTex() {
  return liveTex(512, 200, (g, W, H) => {
    g.fillStyle = '#fff6d8'; g.fillRect(0, 0, W, H); g.strokeStyle = '#1e6ab8'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#1e6ab8'; fitText(g, 'CẦN NGƯỜI RỬA CHÉN', W / 2, 62, W - 50, 48, 900);
    g.fillStyle = '#c4161c'; fitText(g, `${WASH_PAY / 1000}.000đ / cái – nhận tiền liền`, W / 2, 140, W - 50, 36, 700);
  });
}
function facadeTex(seed, shop, floors = 3) {
  const r = rng(seed);
  const walls = ['#d9c7a1', '#c8d6c4', '#e2b9a2', '#b9c3d6', '#e8d27c', '#cfa3a3', '#a9b8a0', '#e4e0d4', '#f0e6c8'];
  return liveTex(256, 512, g => {
    g.fillStyle = walls[Math.floor(r() * walls.length)]; g.fillRect(0, 0, 256, 512);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 500; i++) g.fillRect(r() * 256, r() * 512, 1, 2 + r() * 4);
    g.fillStyle = 'rgba(40,30,20,.18)'; for (let i = 0; i < 6; i++) g.fillRect(r() * 256, 0, 2 + r() * 4, 512);
    const fh = 384 / floors;
    for (let f = 0; f < floors; f++) {
      const y = 18 + f * fh, lit = r() < 0.6;
      g.fillStyle = lit ? (r() < 0.6 ? '#ffd88a' : '#cfe6ff') : '#262a36'; g.fillRect(36, y, 184, fh * 0.6);
      if (lit) { g.fillStyle = 'rgba(90,50,20,.35)'; g.fillRect(36, y, 184, 16); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(60, y + 30, 30, fh * 0.6 - 30); }
      g.strokeStyle = '#3a3a3a'; g.lineWidth = 4; g.strokeRect(36, y, 184, fh * 0.6);
      g.beginPath(); g.moveTo(128, y); g.lineTo(128, y + fh * 0.6); g.stroke();
      g.fillStyle = '#4a4a4a'; for (let k = 0; k < 12; k++) g.fillRect(28 + k * 17, y + fh * 0.66, 3, fh * 0.2); g.fillRect(24, y + fh * 0.64, 208, 5); g.fillRect(24, y + fh * 0.86, 208, 5);
      if (r() < 0.5) { g.fillStyle = ['#e84a5f', '#2f9e44', '#f08c00', '#e0e0e0'][Math.floor(r() * 4)]; for (let k = 0; k < 4; k++) g.fillRect(44 + k * 32, y + fh * 0.68, 20, 14 + r() * 10); }
    }
    if (shop) {
      g.fillStyle = '#fff7da'; g.fillRect(0, 404, 256, 108);
      g.fillStyle = shop.c; g.fillRect(0, 376, 256, 36);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitText(g, shop.t, 128, 395, 236, 26, 800);
      g.fillStyle = 'rgba(60,40,20,.45)'; for (let k = 0; k < 5; k++) g.fillRect(14 + k * 48, 428 + (k % 2) * 12, 34, 70);
    } else {
      g.fillStyle = '#7a7d82'; g.fillRect(0, 392, 256, 120);
      g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 396; y < 512; y += 7) g.fillRect(0, y, 256, 2);
      g.fillStyle = '#c4161c'; g.fillRect(0, 380, 256, 14);
    }
  });
}

/* ---------------- Mô hình gộp ---------------- */
const GE = {
  box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 14), cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6), sph: new THREE.SphereGeometry(1, 12, 8), tor: new THREE.TorusGeometry(1, 0.32, 6, 16),
  ico: new THREE.IcosahedronGeometry(1, 1), cone: new THREE.ConeGeometry(1, 1, 10), bowl: new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
};
function stoolGeo() {
  const w = '#ffffff', p = [[GE.cyl, w, 0, STOOL_H - 0.018, 0, 0, 0, 0, 0.165, 0.036, 0.165], [GE.cyl, w, 0, STOOL_H - 0.055, 0, 0, 0, 0, 0.152, 0.045, 0.152]];
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; p.push([GE.box, w, Math.cos(a) * 0.125, STOOL_H / 2 - 0.03, Math.sin(a) * 0.125, Math.sin(a) * 0.14, -a, -Math.cos(a) * 0.14, 0.05, STOOL_H - 0.04, 0.02]); }
  p.push([GE.tor, w, 0, 0.12, 0, Math.PI / 2, 0, 0, 0.13, 0.13, 0.05]);
  return bakeParts(p);
}
function crateGeo() {
  const w = '#ffffff', p = [[GE.box, w, 0, 0.14, 0, 0, 0, 0, 0.42, 0.28, 0.3], [GE.box, '#000000', 0, 0.2, 0.151, 0, 0, 0, 0.12, 0.05, 0.004], [GE.box, '#000000', 0, 0.2, -0.151, 0, 0, 0, 0.12, 0.05, 0.004]];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) p.push([GE.cyl6, '#c8b88a', -0.15 + i * 0.1, 0.31, -0.09 + j * 0.09, 0, 0, 0, 0.018, 0.05, 0.018]);
  return bakeParts(p);
}
export function bikeGeo(col, rider, rr = R) {
  const k = '#151515', s = '#9aa0a8', p = [
    [GE.tor, k, 0, 0.27, 0.58, 0, Math.PI / 2, 0, 0.23, 0.23, 0.23], [GE.tor, k, 0, 0.27, -0.6, 0, Math.PI / 2, 0, 0.23, 0.23, 0.23],
    [GE.cyl8, s, 0, 0.27, 0.58, 0, 0, Math.PI / 2, 0.08, 0.06, 0.08], [GE.cyl8, s, 0, 0.27, -0.6, 0, 0, Math.PI / 2, 0.08, 0.06, 0.08],
    [GE.box, col, 0, 0.5, -0.25, 0, 0, 0, 0.32, 0.36, 0.75], [GE.box, k, 0, 0.72, -0.25, 0, 0, 0, 0.3, 0.08, 0.62],
    [GE.box, col, 0, 0.42, 0.25, 0, 0, 0, 0.22, 0.12, 0.45], [GE.box, col, 0, 0.75, 0.55, -0.35, 0, 0, 0.26, 0.6, 0.12],
    [GE.cyl6, s, 0, 1.05, 0.5, 0, 0, Math.PI / 2, 0.02, 0.62, 0.02], [GE.box, '#fff7d0', 0, 0.95, 0.63, 0, 0, 0, 0.14, 0.08, 0.04],
    [GE.box, s, 0.2, 1.12, 0.48, 0, 0, 0.3, 0.02, 0.12, 0.02], [GE.box, s, -0.2, 1.12, 0.48, 0, 0, -0.3, 0.02, 0.12, 0.02],
    [GE.box, '#c00', 0, 0.62, -0.64, 0, 0, 0, 0.12, 0.05, 0.03], [GE.box, '#eee', 0, 0.52, -0.66, 0, 0, 0, 0.14, 0.07, 0.01]
  ];
  if (rider) {
    const sh = ['#2f6fe8', '#e8e8e8', '#e8432f', '#2fae66', '#444', '#f2c230'][Math.floor(rr() * 6)], hel = ['#ffcc00', '#e8432f', '#ffffff', '#1d1d1d', '#2f6fe8'][Math.floor(rr() * 5)];
    p.push([GE.box, '#2b2f3a', 0, 0.86, -0.15, 0, 0, 0, 0.3, 0.18, 0.4], [GE.box, sh, 0, 1.18, -0.1, -0.2, 0, 0, 0.36, 0.5, 0.24],
      [GE.sph, '#e9b48f', 0, 1.52, -0.06, 0, 0, 0, 0.1, 0.12, 0.11], [GE.sph, hel, 0, 1.58, -0.08, 0, 0, 0, 0.14, 0.12, 0.15], [GE.box, '#222', 0, 1.53, 0.05, 0, 0, 0, 0.16, 0.05, 0.02],
      [GE.box, sh, 0.18, 1.18, 0.22, -1.1, 0, 0, 0.08, 0.36, 0.08], [GE.box, sh, -0.18, 1.18, 0.22, -1.1, 0, 0, 0.08, 0.36, 0.08],
      [GE.box, '#2b2f3a', 0.13, 0.62, 0.12, 0.4, 0, 0, 0.1, 0.4, 0.12], [GE.box, '#2b2f3a', -0.13, 0.62, 0.12, 0.4, 0, 0, 0.1, 0.4, 0.12]);
  }
  return bakeParts(p);
}

/* Bàn: nhựa đỏ (4), nhựa xanh ghép (6–8), inox dài (12–16) + đồ lặt vặt trên bàn */
function tableParts(T) {
  const L = T.L, W = 0.86, top = TABLE_H, plast = [], metal = [], glossy = [];
  if (T.style === 'inox') {
    metal.push([GE.box, '#d8dde2', 0, top - 0.012, 0, 0, 0, 0, L + 0.06, 0.025, W], [GE.box, '#aab0b8', 0, top - 0.06, 0, 0, 0, 0, L - 0.02, 0.07, W - 0.06]);
    for (let i = 1; i < T.u; i++) metal.push([GE.box, '#8a9098', -L / 2 + i * UNIT, top + 0.001, 0, 0, 0, 0, 0.006, 0.002, W]);
    for (let i = 0; i <= T.u; i += Math.max(1, Math.ceil(T.u / 3))) {
      const x = Math.min(L / 2 - 0.05, -L / 2 + 0.05 + i * UNIT);
      for (const z of [-W / 2 + 0.06, W / 2 - 0.06]) metal.push([GE.cyl8, '#b8bec6', x, (top - 0.08) / 2, z, 0, 0, 0, 0.018, top - 0.08, 0.018]);
      metal.push([GE.box, '#b8bec6', x, 0.12, 0, 0, 0, 0, 0.025, 0.025, W - 0.1]);
    }
    for (const sx of [-1, 1]) metal.push([GE.cyl8, '#b8bec6', sx * (L / 2 - 0.05), (top - 0.08) / 2, W / 2 - 0.06, 0, 0, 0, 0.018, top - 0.08, 0.018], [GE.cyl8, '#b8bec6', sx * (L / 2 - 0.05), (top - 0.08) / 2, -W / 2 + 0.06, 0, 0, 0, 0.018, top - 0.08, 0.018]);
  } else {
    const c = T.style === 'red' ? '#c81e1e' : '#1e5fc0', d = T.style === 'red' ? '#981414' : '#164a96';
    for (let i = 0; i < T.u; i++) {
      const x = -L / 2 + UNIT / 2 + i * UNIT;
      glossy.push([GE.box, c, x, top - 0.015, 0, 0, 0, 0, UNIT - 0.012, 0.03, W], [GE.box, d, x, top - 0.055, 0, 0, 0, 0, UNIT - 0.06, 0.05, W - 0.05]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) glossy.push([GE.box, d, x + sx * (UNIT / 2 - 0.07), (top - 0.07) / 2, sz * (W / 2 - 0.07), sz * 0.05, 0, -sx * 0.05, 0.05, top - 0.07, 0.05]);
      glossy.push([GE.box, d, x, 0.13, 0, 0, Math.PI / 4, 0, 0.8, 0.02, 0.035], [GE.box, d, x, 0.13, 0, 0, -Math.PI / 4, 0, 0.8, 0.02, 0.035]);
    }
  }
  // đồ trên bàn: hộp giấy, ống đũa, chai tương ớt/xì dầu, bình trà đá
  const decoX = T.u === 1 ? [0] : T.u <= 3 ? [-L / 2 + 0.2, L / 2 - 0.2] : [-L / 2 + 0.2, 0, L / 2 - 0.2];
  decoX.forEach((x, i) => {
    const y = top;
    plast.push([GE.box, '#f4f0e8', x - 0.04, y + 0.035, 0, 0, 0.2, 0, 0.12, 0.07, 0.07], [GE.box, '#ffffff', x - 0.04, y + 0.08, 0, 0.2, 0.2, 0, 0.05, 0.03, 0.03]);
    plast.push([GE.cyl8, '#d6a85a', x + 0.06, y + 0.07, 0.03, 0, 0, 0, 0.032, 0.14, 0.032]);
    for (let k = 0; k < 5; k++) plast.push([GE.cyl6, '#e8d8b0', x + 0.06 + (k - 2) * 0.008, y + 0.17, 0.03 + (k % 2) * 0.01, 0, 0, 0, 0.004, 0.12, 0.004]);
    glossy.push([GE.cyl8, '#d8301a', x + 0.02, y + 0.06, -0.06, 0, 0, 0, 0.022, 0.12, 0.022], [GE.cone, '#2fae66', x + 0.02, y + 0.14, -0.06, 0, 0, 0, 0.012, 0.04, 0.012]);
    glossy.push([GE.cyl8, '#3a1a0a', x + 0.08, y + 0.06, -0.07, 0, 0, 0, 0.02, 0.12, 0.02], [GE.cyl8, '#e8c040', x + 0.08, y + 0.13, -0.07, 0, 0, 0, 0.012, 0.02, 0.012]);
    if (i === 0) glossy.push([GE.cyl, '#cfe6f0', x - 0.12, y + 0.1, 0.07, 0, 0, 0, 0.06, 0.2, 0.06], [GE.cyl, '#a8642a', x - 0.12, y + 0.07, 0.07, 0, 0, 0, 0.055, 0.13, 0.055], [GE.tor, '#cfe6f0', x - 0.05, y + 0.12, 0.07, 0, 0, Math.PI / 2, 0.035, 0.04, 0.035]);
  });
  // thùng đá xốp cạnh bàn
  const ex = L / 2 + 0.75;
  plast.push([GE.box, '#f2f4f6', ex, 0.18, -0.55, 0, 0.3, 0, 0.5, 0.36, 0.36], [GE.box, '#e2e6ea', ex, 0.37, -0.55, 0, 0.3, 0, 0.52, 0.03, 0.38]);
  return { plast, metal, glossy };
}

/* ======================================================================= */
export function buildWorld(scene, renderer) {
  const W = { lights: [], extraLights: [], dyn: {}, bikes: [], pools: [] };
  const S = new THREE.Group(); scene.add(S);

  /* Môi trường phản chiếu nhẹ */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.16;

  /* Bầu trời đêm */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h=vP.y; vec3 c=mix(vec3(.22,.12,.16), vec3(.06,.07,.16), smoothstep(-.02,.22,h)); c=mix(c, vec3(.01,.015,.05), smoothstep(.22,.85,h)); gl_FragColor=vec4(c,1.); }'
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), skyMat); sky.userData.dynamic = true; scene.add(sky); W.sky = sky;
  const sp = []; for (let i = 0; i < 1100; i++) { const u = R() * 6.28, v = Math.acos(0.12 + R() * 0.86); sp.push(Math.sin(v) * Math.cos(u) * 280, Math.cos(v) * 280, Math.sin(v) * Math.sin(u) * 280); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('rgba(255,250,230,1)', 128), fog: false, depthWrite: false }));
  moon.scale.setScalar(24); moon.position.set(-60, 110, -200); scene.add(moon);

  /* Ánh sáng (giữ ít đèn để nhẹ máy) */
  scene.add(new THREE.HemisphereLight(0x6a78b0, 0x3a2418, 1.0));
  const moonL = new THREE.DirectionalLight(0x9fb0e0, 0.5); moonL.position.set(-30, 50, -40); scene.add(moonL);
  const pl = (c, i, d, x, y, z, extra) => { const l = new THREE.PointLight(c, i, d, 1.5); l.position.set(x, y, z); scene.add(l); (extra ? W.extraLights : W.lights).push(l); return l; };
  pl(0xffb468, 9, 13, -7, 3.3, 0.6); pl(0xffb468, 9, 13, 0, 3.3, 0.6); pl(0xffb468, 9, 13, 7, 3.3, 0.6);
  pl(0xeef6ff, 10, 12, 0, 3.2, 8.4);
  pl(0xff9a3a, 16, 24, -20, 6.2, -6.2, true); pl(0xff9a3a, 16, 24, 22, 6.2, -14.2, true);

  /* Mặt đất */
  const walkT = tileTex('#a39686', 0.1, '#5e544a', 4, 0.18); walkT.wrapS = walkT.wrapT = THREE.RepeatWrapping; walkT.repeat.set(52, 7.5);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(104, 11), S_(0xffffff, { map: walkT, roughness: 0.62 })); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0, 0.5); S.add(walk);
  const inT = tileTex('#e8e4dc', 0.05, '#b8b0a4', 4, 0.06); inT.wrapS = inT.wrapT = THREE.RepeatWrapping; inT.repeat.set(12, 2.4);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(24, 4.7), S_(0xffffff, { map: inT, roughness: 0.4 })); inner.rotation.x = -Math.PI / 2; inner.position.set(0, 0.006, 8.35); S.add(inner);
  const rt = roadTex(); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(18, 2);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(220, 10), S_(0xffffff, { map: rt, roughness: 0.85 })); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.12, -10); S.add(road);
  const oppT = walkT.clone(); oppT.repeat.set(90, 2.5); oppT.needsUpdate = true;
  const opp = new THREE.Mesh(new THREE.PlaneGeometry(220, 5), S_(0xffffff, { map: oppT })); opp.rotation.x = -Math.PI / 2; opp.position.set(0, 0, -17.5); S.add(opp);
  const curb = S_(0xb4ada2), curbP = S_(0xd8cf3a);
  for (const z of [-5, -15]) { const c = new THREE.Mesh(GE.box, curb); c.scale.set(220, 0.16, 0.3); c.position.set(0, -0.04, z); S.add(c); }
  for (let x = -40; x < 40; x += 2) { const c = new THREE.Mesh(GE.box, x % 4 === 0 ? curbP : S_(0x222222)); c.scale.set(1, 0.162, 0.302); c.position.set(x + 1, -0.04, -5); S.add(c); }
  const dash = B_(0xd8d2b0);
  for (let x = -100; x < 100; x += 6) { const d = new THREE.Mesh(GE.box, dash); d.scale.set(2.6, 0.01, 0.14); d.position.set(x, -0.11, -10); S.add(d); }
  const man = new THREE.Mesh(GE.cyl, S_(0x3a3a3a, { metalness: 0.6, roughness: 0.5 })); man.scale.set(0.35, 0.01, 0.35); man.position.set(6, -0.11, -8); S.add(man);

  /* ===== Quán Anh Ken ===== */
  const wallM = S_(0xf0ead8), tileWall = (() => { const t = tileTex('#f4f4f0', 0.04, '#cfcac0', 8, 0.05); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 2); return S_(0xffffff, { map: t, roughness: 0.3 }); })();
  const darkM = S_(0x2a1e18), steel = S_(0xc0c8d0, { metalness: 0.8, roughness: 0.3 }), redM = S_(0xb8161c, { roughness: 0.5 });
  const bx = (w, h, d, m, x, y, z, ry = 0, par = S) => { const o = new THREE.Mesh(GE.box, m); o.scale.set(w, h, d); o.position.set(x, y, z); o.rotation.y = ry; par.add(o); return o; };
  bx(24.4, 3.6, 0.3, tileWall, 0, 1.8, 10.6);
  for (const x of [-12.1, 12.1]) bx(0.3, 3.6, 4.8, wallM, x, 1.8, 8.3);
  bx(24.6, 0.3, 4.9, S_(0x8a7f74), 0, 3.65, 8.25);
  for (const x of [-12, -6, 6, 12]) { bx(0.5, 3.8, 0.5, S_(0xe8dcc0), x, 1.9, 6.0); addBlock(x - 0.25, x + 0.25, 5.75, 6.25); }
  bx(24.6, 0.32, 0.36, steel, 0, 3.85, 6.0);  // hộp cuốn cửa
  // tầng trên + ban công
  const upT = facadeTex(11, null, 3); upT.wrapS = THREE.RepeatWrapping; upT.repeat.x = 5;
  const up = new THREE.Mesh(new THREE.PlaneGeometry(24.4, 7), S_(0xffffff, { map: upT })); up.position.set(0, 7.55, 6.04); up.rotation.y = Math.PI; S.add(up);
  bx(24.4, 7, 4.4, S_(0xd6c49c), 0, 7.55, 8.3);
  for (const y of [6.3, 8.6]) {
    bx(24, 0.12, 0.8, S_(0xcfc6b4), 0, y, 5.65);
    for (let x = -11.8; x <= 11.8; x += 0.25) bx(0.03, 0.9, 0.03, darkM, x, y + 0.5, 5.28);
    bx(24, 0.05, 0.05, darkM, 0, y + 0.95, 5.28);
  }
  const potM = S_(0x9a4a2a), plantM = S_(0x2f6a2a, { flatShading: true }), flowerM = S_(0xe84a6a, { emissive: 0x200008 });
  for (let i = 0; i < 14; i++) { const x = -11 + i * 1.7 + R() * 0.4, y = R() < 0.5 ? 6.36 : 8.66; const pot = new THREE.Mesh(GE.cyl, potM); pot.scale.set(0.14, 0.2, 0.14); pot.position.set(x, y + 0.1, 5.55); S.add(pot); const pl2 = new THREE.Mesh(GE.ico, R() < 0.3 ? flowerM : plantM); pl2.scale.setScalar(0.22 + R() * 0.1); pl2.position.set(x, y + 0.36, 5.55); S.add(pl2); }
  for (const [x, y] of [[-8, 7.6], [4, 9.9], [9, 7.6]]) { bx(0.8, 0.5, 0.35, S_(0xeeeeee), x, y, 5.7); }
  // phơi đồ
  for (let i = 0; i < 6; i++) bx(0.35, 0.45, 0.02, S_([0xe84a5f, 0x2f6fe8, 0xf2c230, 0xffffff, 0x2fae66, 0x9b5de5][i]), -5 + i * 0.45, 9.1, 5.32);

  // Bảng hiệu – chữ luôn nằm gọn trong bảng
  bx(16.2, 2.4, 0.2, darkM, 0, 4.85, 6.12);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.0), new THREE.MeshBasicMaterial({ map: signTex() }));
  sign.position.set(0, 4.85, 6.0); sign.rotation.y = Math.PI; S.add(sign);
  // bảng đứng nhỏ trước quán
  const stand = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), new THREE.MeshBasicMaterial({ map: liveTex(256, 360, (g, w, h) => { g.fillStyle = '#c4161c'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff3b0'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitText(g, 'ANH KEN', w / 2, 60, w - 30, 54, 900); g.fillStyle = '#ffffff'; ['BIA LẠNH', 'ỐC • LẨU', 'NƯỚNG'].forEach((t, i) => fitText(g, t, w / 2, 150 + i * 56, w - 30, 40, 800)); g.fillStyle = '#ffe58a'; fitText(g, SHOP_PHONE, w / 2, 324, w - 24, 34, 800); }) }));
  stand.position.set(13.4, 0.85, 5.3); stand.rotation.y = Math.PI + 0.3; S.add(stand); addCircle(13.4, 5.3, 0.4);

  // Bếp
  bx(9, 1, 0.8, steel, 0, 0.5, 9.4); bx(9.2, 0.05, 0.95, S_(0xdfe5ea, { metalness: 0.7, roughness: 0.25 }), 0, 1.02, 9.4);
  addBlock(-4.6, 4.6, 9.0, 9.8);
  const potS = S_(0x9aa0a8, { metalness: 0.8, roughness: 0.35 }), fireM = B_(0x4aa8ff);
  W.dyn.steam = [];
  for (const x of [-3.2, -1.2, 1.2, 3.2]) {
    const pot = new THREE.Mesh(GE.cyl, potS); pot.scale.set(0.28, 0.35, 0.28); pot.position.set(x, 1.22, 9.45); S.add(pot);
    const f = new THREE.Mesh(GE.cyl, fireM); f.scale.set(0.2, 0.02, 0.2); f.position.set(x, 1.05, 9.45); S.add(f);
    W.dyn.steam.push(new THREE.Vector3(x, 1.5, 9.45));
  }
  bx(4, 0.04, 0.4, steel, 0, 2.2, 10.35); for (let i = 0; i < 8; i++) { const h = new THREE.Mesh(GE.cyl, potS); h.scale.set(0.1, 0.03, 0.1); h.position.set(-1.6 + i * 0.45, 2.0, 10.35); S.add(h); }
  // bình gas
  for (const x of [-4.2, 4.2]) { const g2 = new THREE.Mesh(GE.cyl, S_(0x2a62c9, { metalness: 0.3, roughness: 0.4 })); g2.scale.set(0.16, 0.5, 0.16); g2.position.set(x, 0.25, 10.2); S.add(g2); }
  // Tủ bia
  const fridgeTex = canvasTex(128, 256, g => {
    g.fillStyle = '#cfe8ff'; g.fillRect(0, 0, 128, 256);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { g.fillStyle = ['#1f7a3a', '#c9a227', '#b01e1e'][(r + c) % 3]; g.fillRect(8 + c * 19, 14 + r * 48, 12, 36); g.fillStyle = '#fff'; g.fillRect(10 + c * 19, 26 + r * 48, 8, 8); }
    g.fillStyle = '#c4161c'; g.fillRect(0, 0, 128, 12); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(90, 0, 10, 256);
  });
  for (const x of [5.9, 7.2]) {
    bx(1.2, 2, 0.8, redM, x, 1, 10.05);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.75), new THREE.MeshBasicMaterial({ map: fridgeTex })); door.position.set(x, 1.05, 9.64); door.rotation.y = Math.PI; S.add(door);
  }
  addBlock(5.2, 7.9, 9.55, 10.5);
  // Bồn rửa chén
  bx(1.8, 0.85, 0.75, steel, SINK.x, 0.425, 10.1);
  bx(1.5, 0.08, 0.55, S_(0x7a8088, { metalness: 0.9, roughness: 0.2 }), SINK.x, 0.82, 10.1);
  const fau = new THREE.Mesh(GE.cyl8, steel); fau.scale.set(0.03, 0.4, 0.03); fau.position.set(SINK.x, 1.05, 10.4); S.add(fau);
  const fau2 = new THREE.Mesh(GE.cyl8, steel); fau2.scale.set(0.025, 0.25, 0.025); fau2.rotation.x = Math.PI / 2; fau2.position.set(SINK.x, 1.24, 10.28); S.add(fau2);
  const rack = S_(0xd0d6dc, { metalness: 0.6, roughness: 0.4 }); bx(0.6, 0.35, 0.35, rack, SINK.x + 1.2, 1.05, 10.3);
  const plateW = S_(0xf4f2ec, { roughness: 0.3 });
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(GE.cyl, plateW); p.scale.set(0.12, 0.01, 0.12); p.rotation.x = Math.PI / 2 - 0.2; p.position.set(SINK.x + 1.0 + i * 0.07, 1.12, 10.3); S.add(p); }
  // thau chén dơ
  for (const [x, z] of [[SINK.x - 1.25, 9.9], [SINK.x - 1.2, 9.2]]) {
    const tub = new THREE.Mesh(GE.cyl, S_(0xd0302a, { roughness: 0.4 })); tub.scale.set(0.35, 0.22, 0.35); tub.position.set(x, 0.11, z); S.add(tub);
    for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(GE.cyl, plateW); p.scale.set(0.1, 0.012, 0.1); p.rotation.set(R() * 0.6, 0, R() * 0.6); p.position.set(x + (R() - 0.5) * 0.3, 0.2 + i * 0.02, z + (R() - 0.5) * 0.3); S.add(p); }
    addCircle(x, z, 0.35);
  }
  addBlock(SINK.x - 0.95, SINK.x + 1.55, 9.7, 10.5);
  const wsign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshBasicMaterial({ map: washSignTex() })); wsign.position.set(SINK.x, 1.95, 10.43); wsign.rotation.y = Math.PI; S.add(wsign);
  W.sinkGlow = (() => { const r = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 32), new THREE.MeshBasicMaterial({ color: 0x5ab0ff, transparent: true, opacity: 0.5, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.set(SINK.x, 0.02, SINK.z); r.userData.dynamic = true; scene.add(r); return r; })();

  // Thực đơn, TV, bàn thờ ông Địa
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.5), S_(0xffffff, { map: menuTex(), emissive: 0x333333, roughness: 0.6 })); menu.position.set(-9.4, 1.9, 10.44); menu.rotation.y = Math.PI; S.add(menu);
  bx(1.2, 0.8, 0.6, redM, -11.4, 0.4, 10.1); addBlock(-12, -10.8, 9.7, 10.5);
  const gold = S_(0xe8b830, { emissive: 0x402800, metalness: 0.7, roughness: 0.3 });
  const god = new THREE.Mesh(GE.sph, gold); god.scale.set(0.16, 0.2, 0.14); god.position.set(-11.2, 0.95, 10.15); S.add(god);
  for (const x of [-11.7, -11.0]) { const c = new THREE.Mesh(GE.sph, B_(0xff2a2a)); c.scale.set(0.05, 0.08, 0.05); c.position.set(x, 0.92, 9.95); S.add(c); }
  const tvTex = canvasTex(256, 144, g => { g.fillStyle = '#2f8a3a'; g.fillRect(0, 0, 256, 144); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(10, 10, 236, 124); g.beginPath(); g.moveTo(128, 10); g.lineTo(128, 134); g.stroke(); g.beginPath(); g.arc(128, 72, 22, 0, 7); g.stroke(); g.fillStyle = '#000a'; g.fillRect(0, 0, 130, 22); g.fillStyle = '#fff'; g.font = 'bold 16px sans-serif'; g.fillText("VN 2 - 1 THA  78'", 6, 16); });
  bx(2.1, 1.25, 0.12, darkM, -6.3, 2.75, 10.38);
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.07), new THREE.MeshBasicMaterial({ map: tvTex })); tv.position.set(-6.3, 2.75, 10.31); tv.rotation.y = Math.PI; S.add(tv);
  for (const x of [-8, -3, 3, 8]) { bx(1.3, 0.05, 0.08, B_(0xf2fbff), x, 3.45, 7.2); bx(1.3, 0.05, 0.08, B_(0xf2fbff), x, 3.45, 9.4); }
  // két bia
  const crates = new THREE.InstancedMesh(crateGeo(), VCG, 80); let ci = 0;
  const cm = new THREE.Matrix4(), cc = new THREE.Color();
  const crate = (x, y, z, ry, col) => { if (ci >= 80) return; cm.makeRotationY(ry); cm.setPosition(x, y, z); crates.setMatrixAt(ci, cm); crates.setColorAt(ci, cc.set(col)); ci++; };
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) crate(-8.6 + i * 0.44, j * 0.3, 10.25, 0, j % 2 ? '#2a7a3a' : '#c4161c');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) crate(-8.6 + i * 0.44, j * 0.3, 9.85, 0, '#d8a020');
  addBlock(-8.9, -6.9, 9.6, 10.5);
  TABLES.forEach((T, i) => { if (T.npc || hash(i, 9) < 0.5) { crate(T.x - T.L / 2 - 0.75, 0, T.z + 0.5, 0.4, '#2a7a3a'); if (T.npc) crate(T.x - T.L / 2 - 0.75, 0.3, T.z + 0.5, 0.5, '#c4161c'); } });
  crates.count = ci; scene.add(crates);
  // quạt
  W.dyn.fans = [];
  for (const x of [-3.5, 3.5]) {
    const fan = new THREE.Group(); fan.position.set(x, 3.0, 10.3); fan.rotation.y = Math.PI; scene.add(fan);
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(GE.box, S_(0x6ab0e8)); b.scale.set(0.12, 0.42, 0.02); b.position.y = 0.2; const p = new THREE.Group(); p.rotation.z = i * 2.09; p.add(b); fan.add(p); }
    fan.add(new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.015, 4, 24), S_(0xdddddd)));
    W.dyn.fans.push(fan);
  }

  /* Dây đèn trang trí (không mái che) */
  const postM = S_(0x2a2a2a, { metalness: 0.6, roughness: 0.4 });
  const postXs = [-14, -7, 0, 7, 14];
  for (const x of postXs) { const p = new THREE.Mesh(GE.cyl8, postM); p.scale.set(0.045, 3.6, 0.045); p.position.set(x, 1.8, -4.9); S.add(p); addCircle(x, -4.9, 0.08); }
  const bulbs = [], wires = [];
  const strand = (a, b, sag, n) => { let prev = null; for (let i = 0; i <= n; i++) { const k = i / n, p = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * sag, a[2] + (b[2] - a[2]) * k]; if (i && i < n || n < 3) bulbs.push(p); if (prev) wires.push(...prev, ...p); prev = p; } };
  for (const x of postXs) strand([x, 3.6, -4.9], [x, 3.75, 5.95], 0.55, 20);
  for (let i = 1; i < postXs.length; i++) { strand([postXs[i - 1], 3.6, -4.9], [postXs[i], 3.6, -4.9], 0.35, 10); strand([postXs[i - 1], 3.6, -4.9], [postXs[i], 3.75, 5.95], 0.7, 22); strand([postXs[i], 3.6, -4.9], [postXs[i - 1], 3.75, 5.95], 0.7, 22); }
  strand([-24, 3.6, -5.2], [-14, 3.6, -4.9], 0.4, 12); strand([14, 3.6, -4.9], [24, 3.6, -5.2], 0.4, 12);
  const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), B_(0xffd59a), bulbs.length);
  const bm = new THREE.Matrix4(), bcol = new THREE.Color();
  bulbs.forEach((b, i) => { bm.makeTranslation(b[0], b[1] - 0.04, b[2]); bulbMesh.setMatrixAt(i, bm); bulbMesh.setColorAt(i, bcol.set(i % 7 === 0 ? '#ff8a6a' : i % 5 === 0 ? '#fff2d0' : '#ffd08a')); });
  scene.add(bulbMesh); W.bulbs = bulbMesh;
  const wireM = new THREE.LineBasicMaterial({ color: 0x111111 });
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3)); scene.add(new THREE.LineSegments(wg, wireM));
  // lồng đèn đỏ treo mặt tiền
  const lanternM = S_(0xd8301c, { emissive: 0xff3010, emissiveIntensity: 1.1 });
  for (const x of [-10, -3, 3, 10]) { const l = new THREE.Mesh(GE.sph, lanternM); l.scale.set(0.3, 0.36, 0.3); l.position.set(x, 3.2, 5.7); S.add(l); bx(0.02, 0.3, 0.02, darkM, x, 3.6, 5.7); }

  // vũng sáng giả dưới đèn
  const poolM = new THREE.MeshBasicMaterial({ map: softDot('rgba(255,175,90,0.5)', 128), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pool = (x, z, rx, rz, m = poolM) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), m); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.015, z); p.userData.dynamic = true; scene.add(p); W.pools.push(p); };
  TABLES.forEach(T => pool(T.x, T.z, T.L / 2 + 1.6, 1.8));
  const sodium = new THREE.MeshBasicMaterial({ map: softDot('rgba(255,140,40,0.55)', 128), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  pool(-20, -6.5, 7, 7, sodium); pool(22, -13.8, 7, 7, sodium);
  const inPool = new THREE.MeshBasicMaterial({ map: softDot('rgba(230,240,255,0.35)', 128), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  pool(0, 8.2, 12, 3, inPool);

  /* Bàn & ghế */
  const stoolMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 });
  const nSeats = TABLES.reduce((s, T) => s + T.n, 0);
  const stools = new THREE.InstancedMesh(stoolGeo(), stoolMat, nSeats);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  const stoolCols = { red: ['#2f6fe8', '#e8432f', '#2f6fe8', '#e8432f'], blue: ['#e8432f', '#f2c230', '#2f6fe8', '#e8432f'], inox: ['#2f6fe8', '#2f6fe8', '#e8432f', '#2f6fe8'] };
  let si = 0;
  TABLES.forEach((T, i) => {
    const parts = tableParts(T);
    for (const [arr, mt] of [[parts.plast, VC], [parts.metal, VCM], [parts.glossy, VCG]]) {
      if (!arr.length) continue;
      const m = new THREE.Mesh(bakeParts(arr), mt); m.position.set(T.x, 0, T.z); S.add(m);
    }
    addBlock(T.x - T.L / 2 - 0.05, T.x + T.L / 2 + 0.05, T.z - 0.45, T.z + 0.45);
    addBlock(T.x + T.L / 2 + 0.5, T.x + T.L / 2 + 1.0, T.z - 0.75, T.z - 0.35);
    for (let s = 0; s < T.n; s++) {
      const sp = seatPos(i, s);
      m4.makeRotationY(hash(i, s) * 3); m4.setPosition(sp.x + (hash(s, i) - 0.5) * 0.05, 0, sp.z + (hash(i + 3, s) - 0.5) * 0.05);
      stools.setMatrixAt(si, m4); stools.setColorAt(si, col.set(stoolCols[T.style][(i + s) % 4])); si++;
      addCircle(sp.x, sp.z, 0.12);
    }
  });
  scene.add(stools);

  /* Rác dưới chân bàn – vỏ đậu, giấy, nắp chai */
  const litN = 520, lit = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), VC, litN);
  const lcol = ['#8a5a2a', '#a8743a', '#f4f2ec', '#f8f8f8', '#d8b030', '#b8bec4'];
  for (let i = 0; i < litN; i++) {
    const T = TABLES[i % TABLES.length], k = i % 6;
    const x = T.x + (R() - 0.5) * (T.L + 2.2), z = T.z + (R() - 0.5) * 2.4;
    const s = k >= 2 && k <= 3 ? 0.035 + R() * 0.03 : k === 4 ? 0.016 : 0.012;
    m4.compose(new THREE.Vector3(x, s * 0.4, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)), new THREE.Vector3(s, k === 4 ? s * 0.3 : s * 0.7, s));
    lit.setMatrixAt(i, m4); lit.setColorAt(i, col.set(lcol[k]));
  }
  scene.add(lit);

  /* Nhà phố hai bên & đối diện */
  const shops = [{ t: 'TẠP HÓA 24H', c: '#1e8a3a' }, null, { t: 'PHỞ BÒ', c: '#c4161c' }, null, { t: 'NHÀ THUỐC', c: '#1e6ab8' }, { t: 'TIỆM VÀNG', c: '#b8860b' }, null, { t: 'CƠM TẤM', c: '#e8722a' }];
  const fronts = []; let x = -12.2, k = 0;
  while (x > -48) { const w = 4 + R() * 1.6; fronts.push([x - w / 2, w, 8 + R() * 7, 6, k++]); x -= w; }
  x = 12.2; while (x < 48) { const w = 4 + R() * 1.6; fronts.push([x + w / 2, w, 8 + R() * 7, 6, k++]); x += w; }
  x = -48; while (x < 48) { const w = 4 + R() * 1.8; fronts.push([x + w / 2, w, 8 + R() * 9, -19.8, k++, true]); x += w; }
  for (const [cx, w, h, z, i, flip] of fronts) {
    const shop = shops[i % shops.length];
    const tex = facadeTex(100 + i, shop, Math.max(2, Math.round(h / 3.3)));
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), S_(0xffffff, { map: tex, emissive: shop ? 0x2a1e10 : 0x000000, roughness: 0.9 }));
    f.position.set(cx, h / 2, flip ? z + 0.01 : z - 0.01); if (!flip) f.rotation.y = Math.PI; S.add(f);
    const back = new THREE.Mesh(GE.box, S_(0xbfb6a6)); back.scale.set(w, h, 8); back.position.set(cx, h / 2, flip ? z - 4.01 : z + 4.01); S.add(back);
    const dz = flip ? 1 : -1;
    for (let fy = 3.3; fy < h - 1; fy += h / Math.max(2, Math.round(h / 3.3))) { const s = new THREE.Mesh(GE.box, S_(0xcfc6b4)); s.scale.set(w - 0.3, 0.1, 0.7); s.position.set(cx, fy, z + dz * 0.35); S.add(s); }
    if (R() < 0.7) { const ac = new THREE.Mesh(GE.box, S_(0xeeeeee)); ac.scale.set(0.8, 0.5, 0.35); ac.position.set(cx + w * 0.25, h * 0.55, z + dz * 0.2); S.add(ac); }
    if (shop && R() < 0.8) { const lb = new THREE.Mesh(GE.box, B_(new THREE.Color(shop.c).offsetHSL(0, 0, 0.1))); lb.scale.set(w * 0.8, 0.5, 0.12); lb.position.set(cx, 3.1, z + dz * 0.1); S.add(lb); }
    if (!flip) addBlock(cx - w / 2, cx + w / 2, 6, 14);
  }

  /* Cột điện + dây rối */
  const concrete = S_(0x9a968e), tops = [-29, -15.5, 15.5, 29];
  for (const px of tops) {
    const p = new THREE.Mesh(GE.cyl6, concrete); p.scale.set(0.13, 9, 0.13); p.position.set(px, 4.5, -5.3); S.add(p); addCircle(px, -5.3, 0.15);
    const cross = new THREE.Mesh(GE.box, concrete); cross.scale.set(1.4, 0.1, 0.1); cross.position.set(px, 8.2, -5.3); S.add(cross);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 14), S_(0x1a1a1a)); coil.position.set(px + 0.3, 6.5, -5.15); coil.rotation.y = 0.5; S.add(coil);
    const box2 = new THREE.Mesh(GE.box, S_(0x5a6066)); box2.scale.set(0.4, 0.5, 0.25); box2.position.set(px, 5.5, -5.1); S.add(box2);
  }
  const cab = [];
  for (let i = 1; i < tops.length; i++) for (let c = 0; c < 8; c++) {
    const x1 = tops[i - 1], x2 = tops[i], y1 = 7 + c * 0.2 + R() * 0.3, y2 = 7 + c * 0.2 + R() * 0.3, zz = -5.3 + (R() - 0.5) * 0.5, sag = 0.6 + R() * 1.0;
    for (let s = 0; s < 14; s++) { const a = s / 14, b = (s + 1) / 14; cab.push(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a - Math.sin(a * Math.PI) * sag, zz, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b - Math.sin(b * Math.PI) * sag, zz); }
  }
  for (let c = 0; c < 8; c++) { const px = tops[c % 4]; const y1 = 7 + R(), y2 = 6 + R() * 2; for (let s = 0; s < 10; s++) { const a = s / 10, b = (s + 1) / 10; cab.push(px, y1 + (y2 - y1) * a - Math.sin(a * Math.PI) * 1.2, -5.3 + (-14.2) * a, px, y1 + (y2 - y1) * b - Math.sin(b * Math.PI) * 1.2, -5.3 + (-14.2) * b); } }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cab, 3)); scene.add(new THREE.LineSegments(cg, wireM));

  /* Đèn đường */
  for (const [lx, lz, dir] of [[-20, -5.3, -1], [22, -15.2, 1]]) {
    const p = new THREE.Mesh(GE.cyl6, S_(0x5a6066, { metalness: 0.5 })); p.scale.set(0.09, 6.4, 0.09); p.position.set(lx, 3.2, lz); S.add(p);
    const arm = new THREE.Mesh(GE.box, S_(0x5a6066)); arm.scale.set(0.08, 0.08, 1.2); arm.position.set(lx, 6.3, lz + dir * 0.55); S.add(arm);
    const head = new THREE.Mesh(GE.box, B_(0xffc070)); head.scale.set(0.3, 0.1, 0.5); head.position.set(lx, 6.2, lz + dir * 1.1); S.add(head);
  }

  /* Cây xanh */
  const trunkM = S_(0x4a3424), leafMs = [S_(0x2c4a26, { flatShading: true }), S_(0x35582c, { flatShading: true }), S_(0x24401f, { flatShading: true })];
  for (const [tx, tz, s] of [[-24, -4.7, 1.2], [24, -4.7, 1.1], [-34, -4.7, 1.0], [34, -4.7, 1.2], [-8, -18, 1.3], [6, -18.2, 1.2], [20, -18, 1], [-22, -18.1, 1.1]]) {
    const t = new THREE.Mesh(GE.cyl6, trunkM); t.scale.set(0.16 * s, 4 * s, 0.16 * s); t.position.set(tx, 2 * s, tz); S.add(t);
    const box2 = new THREE.Mesh(GE.box, S_(0x8a8070)); box2.scale.set(1, 0.15, 1); box2.position.set(tx, 0.07, tz); S.add(box2);
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(GE.ico, leafMs[i % 3]); l.scale.setScalar((1.0 + R() * 0.6) * s); l.position.set(tx + (R() - 0.5) * 1.8 * s, (4 + R() * 1.4) * s, tz + (R() - 0.5) * 1.8 * s); S.add(l); }
    addCircle(tx, tz, 0.5);
  }

  /* Xe máy đậu */
  const parkCols = ['#c4161c', '#1e1e1e', '#e8e8e8', '#2f6fe8', '#7a7a7a', '#3a7a3a'];
  const parkGeos = parkCols.map(c => bikeGeo(c, false));
  const parkSpots = [[-17.2, -3.8], [-18.1, -3.8], [-19, -3.8], [-19.9, -3.8], [-20.8, -3.8], [17.2, -3.8], [18.1, -3.8], [19, -3.8], [19.9, -3.8], [20.8, -3.8], [-16.4, 2.5], [-17.3, 2.5], [16.8, 2.2]];
  parkSpots.forEach(([px, pz], i) => {
    const b = new THREE.Mesh(parkGeos[i % parkGeos.length], VCG); b.position.set(px, 0, pz); b.rotation.y = (pz < 0 ? 0 : Math.PI) + (R() - 0.5) * 0.3; S.add(b);
    addBlock(px - 0.25, px + 0.25, pz - 0.75, pz + 0.75);
  });

  /* Xe máy chạy ngoài đường */
  const headSpr = new THREE.SpriteMaterial({ map: softDot('rgba(255,245,210,1)', 64), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const tailSpr = new THREE.SpriteMaterial({ map: softDot('rgba(255,40,30,1)', 32), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.MeshBasicMaterial({ map: softDot('rgba(255,230,170,0.45)', 64), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 12; i++) {
    const dir = i % 2 ? -1 : 1, g = new THREE.Group(); scene.add(g);
    g.add(new THREE.Mesh(bikeGeo(parkCols[i % parkCols.length], true), VCG));
    const hl = new THREE.Sprite(headSpr); hl.scale.setScalar(1.1); hl.position.set(0, 0.95, 0.7); g.add(hl);
    const tl = new THREE.Sprite(tailSpr); tl.scale.setScalar(0.35); tl.position.set(0, 0.62, -0.68); g.add(tl);
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5), beam); bp.rotation.x = -Math.PI / 2; bp.position.set(0, -0.1, 3); g.add(bp);
    g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    W.bikes.push({ g, dir, z: dir > 0 ? -12.6 - (i % 3) * 0.5 : -8.2 + (i % 3) * 0.4, speed: 6 + (i * 1.7) % 5, off: i * 19.3 });
  }

  W.staticCount = mergeStatic(S, scene);
  scene.remove(S);

  W.update = (dt, t) => {
    W.dyn.fans.forEach(f => (f.rotation.z -= dt * 12));
    for (const b of W.bikes) { const span = 120, xx = ((t * b.speed + b.off) % span) - span / 2; b.g.position.set(b.dir * xx, -0.1, b.z); }
    W.sinkGlow.material.opacity = 0.3 + Math.sin(t * 3) * 0.2;
  };
  return W;
}
