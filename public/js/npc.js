import * as THREE from 'three';
import { TABLES, seatPos, KITCHEN, WAITER_NAMES, WAITER_SPEED, waiterPath, staffPath, pointAt, pathLen, CARTS, cartState, DZO_HIT, ALL_ITEMS, STAFF, STAFF_HOME } from './shared.js';
import { makeChar, setPose } from './human.js';
import { hash, textSprite, canvasTex, softDot, lerpAngle, bakeParts } from './util.js';
import { VC, VCM } from './world.js';

/* ---------- Các bàn khách quen ---------- */
const GROUPS = {
  chutu: {
    seats: [0, 1, 3, 5, 6], drunk: 0.75, slump: 2,
    people: [{ shirt: '#f2f2f2', hair: 'hoi', belly: 1 }, { shirt: '#8a8f99', hair: 'ngan', belly: 1 }, { shirt: '#3b6fa8', hair: 'hoi' }, { shirt: '#f2e6c8', hair: 'dinh', belly: 1 }, { shirt: '#6a4a8a', hair: 'ngan' }],
    lines: ['Hồi đó tao với mày…', 'Uống đi, nghĩ ngợi chi!', 'Nay tao bao, đứa nào giành tao giận!', 'Quán Anh Ken mồi bén ghê', 'Đời mà, vui là chính!', 'Một ly nữa thôi rồi về…', 'Thằng Út dạo này sao rồi?'],
    items: ['bia', 'bia', 'bia', 'bia', 'bia', 'bia', 'kho_muc', 'dau_phong', 'oc_len', 'khan']
  },
  vanphong: {
    seats: [0, 1, 2, 3, 4, 6, 8, 9, 10], drunk: 0.35,
    people: [{ shirt: '#ffffff', hair: 'vuot', shorts: false }, { gender: 'nu', shirt: '#bcd6f2', hair: 'dai', shorts: false }, { gender: 'nu', shirt: '#f2d0d8', hair: 'bui', shorts: false }, { shirt: '#ffffff', hair: 'ngan', shorts: false, belly: 1 },
      { shirt: '#dfe8f0', hair: 'dinh', shorts: false }, { gender: 'nu', shirt: '#ffffff', hair: 'ngang', shorts: false }, { shirt: '#a8c8e8', hair: 'ngan', shorts: false }, { gender: 'nu', shirt: '#f2e0a8', hair: 'duoi', shorts: false }, { shirt: '#2a3a5a', hair: 'vuot', shorts: false }],
    lines: ['Sếp mới khó tính dữ thần', 'Deadline thứ Hai đó nha', 'Thôi nay quên KPI đi!', 'Ủa ai chưa nộp báo cáo?', 'Team building mà, cạn đi!', 'Lương về là nhậu liền', 'Mai xin WFH nha mấy ông', 'Chị bao bàn này nha!'],
    items: ['bia', 'bia', 'bia', 'bia', 'nuoc_ngot', 'tra_da', 'tra_da', 'lau_thai', 'goi_xoai', 'canh_ga', 'dau_hu', 'khan', 'khan']
  },
  congtrinh: {
    seats: [0, 1, 2, 3, 4], drunk: 0.55,
    people: [{ shirt: '#f28a2a', hair: 'mu' }, { shirt: '#2a5aa8', hair: 'ngan' }, { shirt: '#3a6a3a', hair: 'mu' }, { shirt: '#9a7a5a', hair: 'dinh', belly: 1 }, { shirt: '#e8c040', hair: 'ngan' }],
    lines: ['Công trình xong rồi, xả hơi thôi!', 'Ông thầu chưa trả tiền nữa', 'Mai đổ bê tông 5 giờ sáng đó', 'Một hai ba, dô!', 'Ốc ở đây ngon số dách', 'Nhậu xong ai chở ai về?'],
    items: ['bia', 'bia', 'bia', 'bia', 'bia', 'nghieu', 'dau_hu', 'oc_len']
  }
};
const STAFF_LINES = ['Dzô anh chị ơi! 🍻', 'Chúc cả bàn làm ăn phát đạt!', 'Một hai ba… dzô!', 'Uống từ từ thôi nha!', 'Mồi ngon không anh chị?', 'Hôm nay vui ghê á!', 'Cạn ly nè!', 'Nhớ ghé Anh Ken hoài nha!'];

const bubbleCache = new Map();
function bubble(text, o) { const k = text + (o?.bg || ''); if (!bubbleCache.has(k)) bubbleCache.set(k, textSprite(text, { bg: 'rgba(255,248,232,.95)', color: '#3a1604', size: 30, scale: 0.34, ...o })); return bubbleCache.get(k); }

export function createNpcs(scene, props, sfx) {
  const N = { tables: [], waiters: [], carts: [], staff: [], jobs: [], staffState: STAFF.map(() => null) };
  const sayTo = (ch, text, o) => {
    if (ch.sayText === text) return;
    if (ch.say) ch.root.remove(ch.say);
    ch.sayText = text; ch.say = null;
    if (text) { const s = bubble(text, o).clone(); s.position.y = ch.sayY || 1.62; ch.root.add(s); ch.say = s; }
  };

  TABLES.filter(t => t.npc).forEach(T => {
    const G = GROUPS[T.npc];
    const chars = G.seats.map((s, i) => {
      const o = G.people[i % G.people.length];
      const ch = makeChar({ seed: T.id * 31 + i * 7 + 3, ...o });
      const sp = seatPos(T.id, s);
      ch.root.position.set(sp.x, 0, sp.z); ch.root.rotation.y = sp.ry; ch.baseRy = sp.ry; ch.seat = s;
      ch.setGlass(o.gender === 'nu' && i % 2 ? 'tra' : 'bia'); ch.setDrunk(G.drunk * (0.6 + hash(T.id, i) * 0.6));
      ch.sayY = 1.55; scene.add(ch.root); return ch;
    });
    props.setItems(T.id, G.items.map((k, i) => ({ id: 9000 + T.id * 50 + i, k, at: 0 })));
    const lbl = textSprite(T.name, { size: 24, scale: 0.24, bg: 'rgba(30,20,10,.6)' }); lbl.position.set(T.x, 2.25, T.z); scene.add(lbl);
    N.tables.push({ T, G, chars, lastClink: -1 });
  });

  /* ---------- Nhân viên bưng món ---------- */
  const trayGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.015, 18);
  const trayMat = new THREE.MeshStandardMaterial({ color: 0xc0c6cc, metalness: 0.8, roughness: 0.3 });
  const onTray = {
    bottle: bakeParts([[new THREE.CylinderGeometry(1, 1, 1, 8), '#2f6b2a', 0, 0.1, 0, 0, 0, 0, 0.03, 0.2, 0.03], [new THREE.CylinderGeometry(1, 1, 1, 6), '#2f6b2a', 0, 0.23, 0, 0, 0, 0, 0.012, 0.07, 0.012]]),
    plate: bakeParts([[new THREE.CylinderGeometry(1, 1, 1, 12), '#f4f2ec', 0, 0.01, 0, 0, 0, 0, 0.1, 0.02, 0.1], [new THREE.SphereGeometry(1, 8, 6), '#c8743a', 0, 0.03, 0, 0, 0, 0, 0.07, 0.03, 0.07]])
  };
  KITCHEN.forEach((K, w) => {
    const ch = makeChar({ seed: 501 + w, gender: w ? 'nam' : 'nu', shirt: w ? '#2a2a2a' : '#c4161c', hair: w ? 'ngan' : 'duoi', shorts: false, apron: '#f2e8d0' });
    ch.root.position.set(K.x, 0, K.z); ch.root.rotation.y = Math.PI;
    const lbl = textSprite(WAITER_NAMES[w], { size: 26, scale: 0.26, bg: 'rgba(196,22,28,.85)', color: '#fff' }); lbl.position.y = 1.98; ch.root.add(lbl);
    const tray = new THREE.Group(); tray.position.set(0, 1.08, 0.42); ch.root.add(tray);
    tray.add(new THREE.Mesh(trayGeo, trayMat)); tray.visible = false;
    ch.sayY = 2.28; scene.add(ch.root);
    const W = { ch, tray, items: new THREE.Group(), jobId: -1, walk: 0 }; tray.add(W.items);
    N.waiters.push(W);
  });

  /* ---------- Phục vụ ngồi cùng nâng ly ---------- */
  STAFF.forEach((S, i) => {
    const ch = makeChar({ seed: 800 + i, gender: S.gender, shirt: S.shirt, hair: S.hair, shorts: false, sandal: '#1d1d1d' });
    const H = STAFF_HOME[i]; ch.root.position.set(H.x, 0, H.z); ch.root.rotation.y = Math.PI;
    const lbl = textSprite(S.name + ' 🥂', { size: 26, scale: 0.26, bg: 'rgba(232,67,106,.85)', color: '#fff' }); lbl.position.y = 1.98; ch.root.add(lbl);
    ch.setGlass('bia'); ch.sayY = 2.28; scene.add(ch.root);
    N.staff.push({ ch, walk: 0, ret: null, last: null });
  });
  N.setStaff = (arr, st) => {
    arr.forEach((b, i) => {
      const S = N.staff[i], prev = N.staffState[i];
      if (prev && !b) S.ret = { path: staffPath(STAFF_HOME[i], prev.t, prev.s).reverse(), start: Math.max(st, Math.min(prev.until, st)) };
      if (b) S.ret = null;
      N.staffState[i] = b;
    });
  };

  /* ---------- Xe đẩy ---------- */
  CARTS.forEach(c => {
    const g = new THREE.Group(); scene.add(g);
    const steel = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.8, roughness: 0.3 });
    const bx = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
    bx(0.7, 0.55, 1.15, steel, 0, 0.62, 0);
    bx(0.66, 0.45, 1.1, new THREE.MeshStandardMaterial({ color: 0xcfe8f2, transparent: true, opacity: 0.3, roughness: 0.05 }), 0, 1.13, 0);
    const wheel = new THREE.TorusGeometry(0.17, 0.05, 6, 14), wm = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    for (const [x, z] of [[0.36, 0.38], [-0.36, 0.38], [0.36, -0.38], [-0.36, -0.38]]) { const w = new THREE.Mesh(wheel, wm); w.position.set(x, 0.2, z); w.rotation.y = Math.PI / 2; g.add(w); }
    const signT = canvasTex(512, 128, gg => { gg.fillStyle = c.id ? '#ffd23a' : '#c4161c'; gg.fillRect(0, 0, 512, 128); gg.fillStyle = c.id ? '#a8160c' : '#fff3c0'; gg.font = '900 70px "Be Vietnam Pro", sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(c.sign, 256, 68); });
    const sm = new THREE.MeshBasicMaterial({ map: signT });
    for (const sx of [1, -1]) { const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.29), sm); sign.position.set(sx * 0.356, 1.55, 0); sign.rotation.y = sx * Math.PI / 2; g.add(sign); }
    bx(0.04, 0.5, 0.04, steel, 0, 1.6, 0.5); bx(0.04, 0.5, 0.04, steel, 0, 1.6, -0.5);
    bx(0.72, 0.03, 1.2, new THREE.MeshStandardMaterial({ color: c.id ? 0x2f6fe8 : 0xc4161c }), 0, 1.86, 0);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0b0 })); lamp.position.set(0, 1.78, 0); g.add(lamp);
    if (c.id === 0) {
      const ember = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.3), new THREE.MeshBasicMaterial({ color: 0xff5a14 })); ember.position.set(0, 0.92, 0.33); g.add(ember);
      for (let i = 0; i < 6; i++) bx(0.12, 0.005, 0.25, new THREE.MeshStandardMaterial({ color: 0xe8cf9a }), -0.25 + i * 0.1, 1.0, -0.2);
    } else for (let i = 0; i < 8; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0xfff8ee })); st.position.set(-0.2 + (i % 4) * 0.13, 1.05, -0.2 + Math.floor(i / 4) * 0.3); st.rotation.z = Math.PI / 2; g.add(st); }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: softDot('rgba(255,210,140,.45)', 64), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; g.add(glow);
    const seller = makeChar({ seed: 700 + c.id, gender: c.id ? 'nam' : 'nu', shirt: c.id ? '#5a7ab8' : '#b8546a', hair: c.id ? 'mu' : 'nonla', shorts: false });
    seller.sayY = 2.05; scene.add(seller.root);
    const lbl = textSprite(c.name, { size: 24, scale: 0.24, bg: 'rgba(30,20,10,.75)' }); lbl.position.y = 2.25; g.add(lbl);
    N.carts.push({ c, g, seller, lastStop: -2, walk: 0 });
  });

  /* ---------- Cập nhật ---------- */
  N.update = (dt, st, t, listener, dzoActive) => {
    const near = (x, z, r) => listener ? Math.max(0, 1 - Math.hypot(listener.x - x, listener.z - z) / r) : 0;

    for (const NT of N.tables) {
      const id = NT.T.id, k = id / 4, G = NT.G;
      const P = 24 + k * 5, ph = ((st + k * 9) % P + P) % P, round = Math.floor((st + k * 9) / P);
      const dz = ph < 4.8;
      if (dz && ph >= DZO_HIT && NT.lastClink !== round) { NT.lastClink = round; sfx.clink(near(NT.T.x, NT.T.z, 18) * 0.7); sfx.cheer(near(NT.T.x, NT.T.z, 22) * 0.5); }
      const speakSlot = Math.floor(st / 5 + id), speaker = Math.floor(hash(id, speakSlot) * NT.chars.length), speaks = hash(id + 7, speakSlot) < 0.65;
      const spk = NT.chars[speaker].root.position;
      NT.chars.forEach((ch, i) => {
        let act = null, kk = 0, text = null;
        if (dz) {
          if (ph > 0.4 && ph < 3.3) act = 'raise';
          else if (ph >= 3.3) { act = 'drink'; kk = (ph - 3.3) / 1.4; }
          if (i === 0 && ph < 2.25) text = 'Một… hai… ba…';
          if (ph >= 2.25 && ph < 3.6 && i % 3 === 0) text = i % 2 ? 'DZÔ!!!' : 'Dô dô!';
        } else {
          const slot = Math.floor((st + i * 2.3) / 7), dk = (st + i * 2.3) / 7 - slot;
          if (hash(id * 4 + i, slot) < 0.3 && dk < 0.23) { act = 'drink'; kk = dk / 0.23; }
          else if (i === speaker && speaks) { act = 'talk'; text = (st / 5 + id) % 1 > 0.75 ? null : G.lines[Math.floor(hash(id, speakSlot + 99) * G.lines.length)]; }
        }
        const p = ch.root.position;
        const look = i === speaker ? 0 : Math.max(-0.9, Math.min(0.9, lerpAngle(0, Math.atan2(spk.x - p.x, spk.z - p.z) - ch.baseRy, 1)));
        setPose(ch, { mode: 'sit', act, k: kk, t, look, slump: G.slump === i ? 0.6 : 0 });
        ch.root.rotation.z = Math.sin(t * 0.8 + i) * 0.03 * ch.drunk;
        ch.update(dt);
        sayTo(ch, text);
      });
    }

    // nhân viên bưng món
    N.jobs = N.jobs.filter(j => j.back > st - 0.5);
    N.waiters.forEach((W, w) => {
      const ch = W.ch, K = KITCHEN[w];
      const job = N.jobs.filter(j => j.w === w && j.start <= st && st < j.back).sort((a, b) => a.start - b.start)[0];
      let mode = 'stand', act = null, text = null;
      if (job) {
        const path = waiterPath(w, job.table), L = pathLen(path);
        if (W.jobId !== job.id) {
          W.jobId = job.id; W.items.clear();
          job.keys.slice(0, 5).forEach((key, i) => { const m = new THREE.Mesh(ALL_ITEMS[key]?.model === 'bottle' ? onTray.bottle : onTray.plate, VC); const a = i / 5 * 6.28; m.position.set(Math.cos(a) * 0.1, 0.008, Math.sin(a) * 0.1); W.items.add(m); });
        }
        if (st < job.arrive) { const p = pointAt(path, (st - job.start) * WAITER_SPEED); ch.root.position.set(p.x, 0, p.z); ch.root.rotation.y = lerpAngle(ch.root.rotation.y, p.ry, Math.min(1, dt * 10)); mode = 'walk'; act = 'carry'; W.tray.visible = W.items.visible = true; }
        else if (st < job.leave) { const p = path[path.length - 1]; ch.root.position.set(p.x, 0, p.z); const T = TABLES[job.table]; ch.root.rotation.y = lerpAngle(ch.root.rotation.y, Math.atan2(T.x - p.x, T.z - p.z), Math.min(1, dt * 8)); act = 'carry'; W.tray.visible = true; W.items.visible = st < job.arrive + 0.8; if (!job.npc) text = 'Món ra rồi nè!'; }
        else { const p = pointAt(path, Math.max(0, L - (st - job.leave) * WAITER_SPEED)); ch.root.position.set(p.x, 0, p.z); ch.root.rotation.y = lerpAngle(ch.root.rotation.y, p.ry + Math.PI, Math.min(1, dt * 10)); mode = 'walk'; W.tray.visible = false; }
      } else { ch.root.position.set(K.x, 0, K.z); ch.root.rotation.y = lerpAngle(ch.root.rotation.y, Math.PI, Math.min(1, dt * 5)); W.tray.visible = false; if (Math.floor(st / 9 + w) % 4 === 0) act = 'wave'; }
      W.walk += mode === 'walk' ? dt * 9 : 0;
      setPose(ch, { mode, act, ph: W.walk, t }); ch.update(dt); sayTo(ch, text);
    });

    // phục vụ ngồi cùng
    N.staff.forEach((S, i) => {
      const ch = S.ch, B = N.staffState[i], H = STAFF_HOME[i];
      let mode = 'stand', act = null, text = null, look = 0;
      if (B) {
        const path = staffPath(H, B.t, B.s);
        if (st < B.arrive) { const p = pointAt(path, (st - B.start) * WAITER_SPEED); ch.root.position.set(p.x, 0, p.z); ch.root.rotation.y = lerpAngle(ch.root.rotation.y, p.ry, Math.min(1, dt * 10)); mode = 'walk'; }
        else {
          const sp = seatPos(B.t, B.s); ch.root.position.set(sp.x, 0, sp.z); ch.root.rotation.y = sp.ry; mode = 'sit';
          const by = N.findPlayer?.(B.by);
          let side = 0;
          if (by) { const d = Math.atan2(by.x - sp.x, by.z - sp.z); look = Math.max(-1, Math.min(1, lerpAngle(0, d - sp.ry, 1))); side = Math.sign(look); }
          const e = st - B.arrive, cyc = e % 14;
          if (dzoActive?.(B.t)) act = 'raise';
          else if (e < 3) { text = 'Chào anh chị, em ngồi chung nha! 😊'; act = 'wave'; }
          else if (cyc < 2.2) { act = 'toast'; text = STAFF_LINES[Math.floor(e / 14 + i) % STAFF_LINES.length]; if (cyc < dt * 1.5 && listener) sfx.clink(near(sp.x, sp.z, 10) * 0.6); }
          else if (cyc < 3.6) { act = 'drink'; return finish((cyc - 2.2) / 1.4); }
          else if (cyc > 9 && cyc < 11) act = 'talk';
        }
      } else if (S.ret && st - S.ret.start < pathLen(S.ret.path) / WAITER_SPEED) {
        const p = pointAt(S.ret.path, (st - S.ret.start) * WAITER_SPEED); ch.root.position.set(p.x, 0, p.z); ch.root.rotation.y = lerpAngle(ch.root.rotation.y, p.ry, Math.min(1, dt * 10)); mode = 'walk';
      } else { S.ret = null; ch.root.position.set(H.x, 0, H.z); ch.root.rotation.y = lerpAngle(ch.root.rotation.y, Math.PI, Math.min(1, dt * 5)); }
      function finish(kk) { S.walk += 0; setPose(ch, { mode, act, k: kk, t, look }); ch.update(dt); sayTo(ch, null); }
      S.walk += mode === 'walk' ? dt * 9 : 0;
      setPose(ch, { mode, act, ph: S.walk, t, look, side: look > 0 ? 1 : -1 }); ch.update(dt); sayTo(ch, text, { bg: 'rgba(255,226,236,.96)' });
    });

    // xe đẩy
    N.carts.forEach(C => {
      const s = cartState(C.c, st);
      C.g.visible = C.seller.root.visible = s.visible;
      if (!s.visible) return;
      C.g.position.set(s.x, 0, s.z); C.g.rotation.y = s.ry;
      const fx = Math.sin(s.ry), fz = Math.cos(s.ry);
      C.seller.root.position.set(s.x - fx * 1.05, 0, s.z - fz * 1.05);
      let text = null, act = 'push', mode = s.moving ? 'walk' : 'stand';
      if (!s.moving) {
        C.seller.root.rotation.y = lerpAngle(C.seller.root.rotation.y, 0, Math.min(1, dt * 4));
        act = s.stopT < 5 ? 'wave' : 'talk';
        if (s.stopT < 6) text = C.c.calls[s.stop % C.c.calls.length];
        if (C.lastStop !== s.stop) { C.lastStop = s.stop; if (C.c.id === 1) sfx.bell(near(s.x, s.z, 24)); else sfx.call(near(s.x, s.z, 24)); }
      } else { C.seller.root.rotation.y = s.ry; C.lastStop = -2; }
      C.walk += s.moving ? dt * 7 : 0;
      setPose(C.seller, { mode, act, ph: C.walk, t }); C.seller.update(dt); sayTo(C.seller, text, { bg: 'rgba(255,236,170,.96)' });
    });
  };
  N.cartPos = (i, st) => cartState(CARTS[i], st);
  return N;
}
