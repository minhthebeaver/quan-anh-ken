import * as THREE from 'three';
import { TABLES, TABLE_H, ALL_ITEMS, seatPos, UNIT } from './shared.js';
import { bakeParts, canvasTex, softDot, rng } from './util.js';
import { VC, VCG } from './world.js';

/* Đồ ăn thức uống trên bàn: mỗi món = 1 mesh màu đỉnh (gộp sẵn) → rất nhẹ */
const GE = {
  box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 10), cone: new THREE.ConeGeometry(1, 1, 7),
  sph: new THREE.SphereGeometry(1, 8, 6), half: new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2)
};
const Y = TABLE_H + 0.005;
const cache = {};
function model(key) {
  if (cache[key]) return cache[key];
  const r = rng(key.length * 97 + key.charCodeAt(0));
  const plate = (rad = 0.12) => [[GE.cyl, '#f4f2ec', 0, 0.008, 0, 0, 0, 0, rad, 0.016, rad], [GE.cyl, '#d8d4c8', 0, 0.002, 0, 0, 0, 0, rad * 0.7, 0.006, rad * 0.7]];
  const scatter = (n, fn) => { const out = []; for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 0.075; out.push(fn(Math.cos(a) * d, Math.sin(a) * d, i)); } return out; };
  let p;
  switch (key) {
    case 'bottle': p = [[GE.cyl, '#2f6b2a', 0, 0.1, 0, 0, 0, 0, 0.032, 0.2, 0.032], [GE.cone, '#2f6b2a', 0, 0.23, 0, 0, 0, 0, 0.032, 0.07, 0.032], [GE.cyl, '#2f6b2a', 0, 0.28, 0, 0, 0, 0, 0.012, 0.04, 0.012], [GE.cyl, '#e8c040', 0, 0.302, 0, 0, 0, 0, 0.014, 0.01, 0.014], [GE.cyl, '#f2f0e0', 0, 0.12, 0, 0, 0, 0, 0.0335, 0.07, 0.0335]]; break;
    case 'tea': p = [[GE.cyl, '#9c5a24', 0, 0.055, 0, 0, 0, 0, 0.035, 0.11, 0.035], [GE.box, '#eaf6ff', 0.01, 0.11, 0, 0.4, 0.5, 0.2, 0.025, 0.025, 0.025], [GE.box, '#eaf6ff', -0.012, 0.105, 0.01, 0.2, 1, 0.4, 0.024, 0.024, 0.024]]; break;
    case 'can': p = [[GE.cyl, '#d01e24', 0, 0.06, 0, 0, 0, 0, 0.033, 0.12, 0.033], [GE.cyl, '#c8c8c8', 0, 0.123, 0, 0, 0, 0, 0.03, 0.006, 0.03], [GE.cyl, '#ffffff', 0, 0.07, 0, 0, 0, 0, 0.0335, 0.03, 0.0335]]; break;
    case 'peanut': p = [[GE.half, '#f4f2ec', 0, 0.06, 0, Math.PI, 0, 0, 0.08, 0.06, 0.08], ...scatter(14, (x, z) => [GE.sph, '#b07a3a', x * 0.8, 0.055, z * 0.8, 0, r() * 3, 0, 0.018, 0.012, 0.012])]; break;
    case 'tofu': p = [...plate(), ...scatter(7, (x, z) => [GE.box, '#e8b23a', x, 0.03, z, 0, r() * 3, 0, 0.04, 0.035, 0.04]), [GE.cyl, '#7a3a14', 0.08, 0.02, 0.06, 0, 0, 0, 0.025, 0.02, 0.025]]; break;
    case 'snail': p = [...plate(0.13), ...scatter(14, (x, z) => [GE.cone, '#4a3424', x, 0.035, z, r() - 0.5, 0, r() - 0.5, 0.018, 0.045, 0.018]), ...scatter(6, (x, z) => [GE.sph, '#f0e0b0', x, 0.025, z, 0, 0, 0, 0.03, 0.01, 0.03])]; break;
    case 'clam': p = [[GE.half, '#e8e4dc', 0, 0.07, 0, Math.PI, 0, 0, 0.12, 0.07, 0.12], ...scatter(12, (x, z) => [GE.half, '#f6efe0', x, 0.065, z, r() * 0.6, r() * 3, 0, 0.03, 0.015, 0.024]), ...scatter(5, (x, z) => [GE.box, '#4a9a3a', x, 0.075, z, 0, r() * 3, 0, 0.05, 0.004, 0.008])]; break;
    case 'wing': p = [...plate(), ...scatter(6, (x, z) => [GE.sph, '#9a4a18', x, 0.035, z, 0, r() * 3, 0, 0.05, 0.025, 0.025]), ...scatter(4, (x, z) => [GE.box, '#3a8a2a', x, 0.05, z, 0, r() * 3, 0, 0.04, 0.004, 0.01])]; break;
    case 'salad': p = [...plate(0.13), [GE.sph, '#cfe08a', 0, 0.03, 0, 0, 0, 0, 0.09, 0.035, 0.09], ...scatter(18, (x, z) => [GE.box, r() < 0.5 ? '#e87a2a' : '#4a9a3a', x, 0.06, z, 0, r() * 3, 0, 0.05, 0.005, 0.008])]; break;
    case 'squid': p = [...plate(), ...scatter(10, (x, z) => [GE.box, '#e8cf9a', x, 0.025, z, 0, r() * 3, 0, 0.09, 0.008, 0.02]), [GE.cyl, '#d8401a', 0.09, 0.02, -0.07, 0, 0, 0, 0.025, 0.02, 0.025]]; break;
    case 'banhtrang': p = [[GE.sph, '#d86a2a', 0, 0.045, 0, 0, 0, 0, 0.08, 0.05, 0.07], ...scatter(8, (x, z) => [GE.box, '#4a8a2a', x, 0.08, z, 0, r() * 3, 0, 0.03, 0.004, 0.008]), [GE.box, '#fff6c8', 0, 0.09, 0, 0, 0.3, 0, 0.03, 0.01, 0.02]]; break;
    case 'towel': p = [[GE.box, '#f8f8f8', 0, 0.012, 0, 0, r() * 3, 0, 0.09, 0.024, 0.06], [GE.box, '#2f6fe8', 0, 0.025, 0, 0, 0, 0, 0.06, 0.002, 0.03]]; break;
    case 'candy': p = [[GE.box, '#e8d8a8', 0, 0.006, 0, 0, 0, 0, 0.16, 0.012, 0.1], ...scatter(5, (x, z) => [GE.cyl, '#fff8ee', x, 0.02, z, 0, r() * 3, Math.PI / 2, 0.012, 0.11, 0.012])]; break;
    case 'hotpot': p = [[GE.cyl, '#2a2a2a', 0, 0.035, 0, 0, 0, 0, 0.13, 0.07, 0.13], [GE.cyl, '#4aa8ff', 0, 0.075, 0, 0, 0, 0, 0.09, 0.01, 0.09], [GE.cyl, '#b8bec4', 0, 0.13, 0, 0, 0, 0, 0.17, 0.1, 0.17], [GE.cyl, '#d8401a', 0, 0.175, 0, 0, 0, 0, 0.16, 0.01, 0.16], ...scatter(8, (x, z) => [GE.sph, r() < 0.5 ? '#f0a080' : '#5aa04a', x * 1.6, 0.185, z * 1.6, 0, 0, 0, 0.025, 0.012, 0.025])]; break;
    default: p = plate();
  }
  return (cache[key] = bakeParts(p));
}

// Vị trí đặt đồ: nước uống gần từng ghế, đồ ăn xếp giữa bàn
function slotsFor(T) {
  const L = T.L, drinks = [], foods = [];
  for (let s = 0; s < T.n; s++) {
    const sp = seatPos(T.id, s), ox = sp.ox, oz = sp.oz;
    if (Math.abs(oz) > 0.1) drinks.push([ox + 0.1, Math.sign(oz) * 0.32], [ox - 0.12, Math.sign(oz) * 0.3]);
    else drinks.push([Math.sign(ox) * (L / 2 - 0.08), 0.2], [Math.sign(ox) * (L / 2 - 0.08), -0.2]);
  }
  // xen kẽ: mỗi ghế 1 ly trước, rồi tới ly thứ 2
  const d2 = [...drinks.filter((_, i) => i % 2 === 0), ...drinks.filter((_, i) => i % 2 === 1)];
  const n = Math.max(2, Math.round((L - 0.5) / 0.3) + 1);
  for (let i = 0; i < n; i++) for (const z of [-0.1, 0.1]) foods.push([-L / 2 + 0.25 + (L - 0.5) * (n === 1 ? 0.5 : i / (n - 1)), z + (i % 2 ? 0.02 : -0.02)]);
  // ưu tiên chỗ giữa bàn
  foods.sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]));
  return { drinks: d2, foods };
}

export function createProps(scene) {
  const P = { tables: TABLES.map(t => ({ group: new THREE.Group(), list: [], shown: -1, hot: [], slots: slotsFor(t) })), steam: [] };
  P.tables.forEach((T, i) => { T.group.position.set(TABLES[i].x, Y, TABLES[i].z); scene.add(T.group); });

  function rebuild(i, st) {
    const T = P.tables[i];
    const vis = T.list.filter(it => it.at <= st);
    if (vis.length === T.shown) return;
    T.shown = vis.length;
    while (T.group.children.length) T.group.remove(T.group.children[0]);
    let d = 0, f = 0; T.hot = [];
    const used = [];
    for (const it of vis) {
      const md = ALL_ITEMS[it.k]?.model; if (!md) continue;
      const drink = md === 'bottle' || md === 'tea' || md === 'can' || md === 'towel';
      let slot = drink ? T.slots.drinks[d++] : T.slots.foods[f++];
      if (md === 'hotpot' && slot) { f++; }
      if (!slot) continue;
      const m = new THREE.Mesh(model(md), drink && md !== 'towel' ? VCG : VC);
      m.position.set(slot[0], 0, slot[1]); m.rotation.y = (it.id * 1.37) % 6.28;
      T.group.add(m);
      if (md === 'hotpot') T.hot.push([slot[0], slot[1]]);
    }
    void used;
  }
  P.setItems = (i, list) => { P.tables[i].list = list.slice(-44); P.tables[i].shown = -1; };
  P.addItems = (i, adds) => { P.tables[i].list.push(...adds); P.tables[i].list = P.tables[i].list.slice(-44); P.tables[i].shown = -1; };
  P.clear = i => { P.tables[i].list = []; P.tables[i].shown = -1; };

  /* ---------- Xoay chai ---------- */
  const bottleLying = model('bottle').clone(); bottleLying.translate(0, -0.15, 0); bottleLying.rotateX(Math.PI / 2);
  const spins = new Map();
  P.startSpin = (t, s) => {
    let m = spins.get(t)?.m;
    if (!m) { m = new THREE.Mesh(bottleLying, VC); m.position.set(TABLES[t].x, Y + 0.24, TABLES[t].z); scene.add(m); }
    const sp = seatPos(t, s.seat);
    spins.set(t, { m, ...s, final: Math.atan2(sp.ox, sp.oz) });
  };

  /* ---------- Xúc xắc ---------- */
  const faceTex = [1, 2, 3, 4, 5, 6].map(v => canvasTex(64, 64, g => {
    g.fillStyle = '#fbfbf6'; g.fillRect(0, 0, 64, 64);
    const pip = (x, y) => { g.beginPath(); g.arc(x, y, v === 1 ? 9 : 6.5, 0, 7); g.fill(); };
    g.fillStyle = v === 1 || v === 4 ? '#d01818' : '#1a1a1a';
    const L = 16, M = 32, H = 48;
    ({ 1: [[M, M]], 2: [[L, L], [H, H]], 3: [[L, L], [M, M], [H, H]], 4: [[L, L], [H, L], [L, H], [H, H]], 5: [[L, L], [H, L], [M, M], [L, H], [H, H]], 6: [[L, L], [H, L], [L, M], [H, M], [L, H], [H, H]] })[v].forEach(p => pip(...p));
  }));
  const dieMats = [3, 4, 1, 6, 2, 5].map(v => new THREE.MeshLambertMaterial({ map: faceTex[v - 1] }));
  const dieGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  const FACE_ROT = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] };
  const bowlGeo = new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const bowlMat = new THREE.MeshLambertMaterial({ color: 0x7a3a1a, side: THREE.DoubleSide });
  const dPlateGeo = new THREE.CylinderGeometry(0.16, 0.15, 0.015, 20);
  const dices = new Map();
  function diceSet(t) {
    let D = dices.get(t);
    if (D) return D;
    const g = new THREE.Group(); g.position.set(TABLES[t].x + TABLES[t].L / 2 - 0.22, Y + 0.05, TABLES[t].z); scene.add(g);
    const plate = new THREE.Mesh(dPlateGeo, new THREE.MeshLambertMaterial({ color: 0xf4f2ec })); plate.position.y = 0.01; g.add(plate);
    const dice = [0, 1, 2].map(i => { const m = new THREE.Mesh(dieGeo, dieMats); m.position.set(-0.055 + i * 0.055, 0.033, (i % 2) * 0.04 - 0.02); plate.add(m); return m; });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat); bowl.position.y = 0.008; plate.add(bowl);
    D = { g, plate, dice, bowl, phase: 'off' }; dices.set(t, D);
    return D;
  }
  const qy = new THREE.Quaternion(), qf = new THREE.Quaternion(), eu = new THREE.Euler(), up = new THREE.Vector3(0, 1, 0);
  P.startDice = (t, d) => { const D = diceSet(t); Object.assign(D, { phase: 'shake', t0: d.t0, until: d.betUntil }); D.g.visible = true; };
  P.endDice = (t, d) => {
    const D = diceSet(t); D.phase = 'reveal'; D.t1 = d.at; D.g.visible = true;
    d.vals.forEach((v, i) => { qf.setFromEuler(eu.set(...FACE_ROT[v])); qy.setFromAxisAngle(up, Math.random() * 6.28); D.dice[i].quaternion.copy(qy).multiply(qf); });
  };

  /* ---------- Khói lẩu & bếp ---------- */
  const steamMat = new THREE.SpriteMaterial({ map: softDot('rgba(240,240,240,.5)'), transparent: true, depthWrite: false, opacity: 0 });
  const steam = Array.from({ length: 30 }, (_, i) => { const s = new THREE.Sprite(steamMat.clone()); s.userData.life = Math.random() * 3; s.userData.e = null; scene.add(s); return s; });
  P.kitchenSteam = [];

  P.update = (dt, st, t) => {
    P.tables.forEach((T, i) => rebuild(i, st));
    for (const [tid, S] of spins) {
      const u = (st - S.t0) / S.dur;
      if (u > 1 + 6 / S.dur) { scene.remove(S.m); spins.delete(tid); continue; }
      const e = u < 0 ? 0 : u > 1 ? 1 : 1 - Math.pow(1 - u, 3);
      S.m.rotation.y = S.final - (1 - e) * S.turns * Math.PI * 2;
      S.m.position.y = Y + 0.24 + (u > 0 && u < 1 ? Math.sin(u * 40) * 0.003 : 0);
    }
    for (const [, D] of dices) {
      if (D.phase === 'shake') {
        const sh = st < D.until;
        D.plate.position.set(sh ? Math.sin(t * 31) * 0.03 : 0, 0.01 + (sh ? Math.abs(Math.sin(t * 17)) * 0.14 : 0), sh ? Math.cos(t * 27) * 0.02 : 0);
        D.plate.rotation.z = sh ? Math.sin(t * 23) * 0.2 : 0;
        D.bowl.position.set(0, 0.008, 0); D.bowl.rotation.set(0, 0, 0);
        D.dice.forEach(d => d.visible = false);
      } else if (D.phase === 'reveal') {
        const u = Math.min(1, (st - D.t1 - 0.6) / 0.6);
        D.plate.position.set(0, 0.01, 0); D.plate.rotation.z = 0;
        D.dice.forEach(d => d.visible = true);
        D.bowl.position.set(0.16 * Math.max(0, u), 0.008 + 0.18 * Math.max(0, u), 0);
        D.bowl.rotation.z = -1.2 * Math.max(0, u);
        if (st - D.t1 > 9) { D.phase = 'off'; D.g.visible = false; }
      }
    }
    // khói
    const emitters = [...P.kitchenSteam];
    P.tables.forEach((T, i) => T.hot.forEach(h => emitters.push(new THREE.Vector3(TABLES[i].x + h[0], Y + 0.25, TABLES[i].z + h[1]))));
    steam.forEach((s, i) => {
      s.userData.life += dt;
      if (s.userData.life > 3) {
        s.userData.life = 0;
        const e = emitters.length ? emitters[i % emitters.length] : null; s.userData.e = e;
        if (e) s.position.set(e.x + (Math.random() - 0.5) * 0.15, e.y, e.z + (Math.random() - 0.5) * 0.15);
      }
      const L = s.userData.life / 3;
      s.visible = !!s.userData.e;
      s.position.y += dt * 0.35; s.position.x += Math.sin(t + i) * dt * 0.05;
      s.scale.setScalar(0.15 + L * 0.55); s.material.opacity = Math.sin(L * Math.PI) * 0.35;
    });
  };
  return P;
}
