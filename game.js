// Logic game phía server
import {
  TABLES, seatPos, MENU, CART_ITEMS, ALL_ITEMS, KITCHEN, waiterPath, staffPath, pathLen, WAITER_SPEED,
  CARTS, cartState, CART_BUY_DIST, DRUNK_PER_BEER, drunkNow, DZO_HIT, DZO_WINDOW, CARDS, RPS, rpsBeats,
  START_MONEY, STAFF, STAFF_PRICE, STAFF_MIN, STAFF_HOME, SINK, SINK_R, WASH_PAY, WASH_NEED, WASH_CAP_5M, WASH_CAP_1H, DISHES, fmtVND
} from './public/js/shared.js';

const now = () => Date.now() / 1000;
const clean = (v, max) => String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n) || 0));
const pick = a => a[Math.floor(Math.random() * a.length)];
const SHIRTS = ['#e8432f', '#2f6fe8', '#f2c230', '#2fae66', '#ffffff', '#1d1d24', '#ff7a2f', '#9b5de5', '#f28ab2', '#7fc8f8'];
const HAIRS = { nam: ['ngan', 'dinh', 'vuot', 'hoi', 'mu'], nu: ['dai', 'duoi', 'bui', 'ngang'] };
const room = t => 't' + t;
const isStaff = id => typeof id === 'string' && id.startsWith('staff:');

export function attachGame(io) {
  const players = new Map();
  const wallets = new Map();            // token → { money, wash: [times], spent, last }
  const ipGrants = new Map();           // ip → [times]  (chống tạo ví mới liên tục)
  const tables = TABLES.map(t => ({
    id: t.id, npc: !!t.npc, seats: new Array(t.n).fill(null), items: [], lines: {}, payers: {}, total: 0,
    love: 0, dzo: null, rps: null, spin: null, dice: null, cool: {}
  }));
  const waiters = KITCHEN.map(() => ({ freeAt: 0 }));
  const staff = STAFF.map((s, i) => ({ i, busy: null }));
  let jobs = [], jobSeq = 1, itemSeq = 1;

  const pub = p => ({ id: p.id, name: p.name, gender: p.gender, shirt: p.shirt, hair: p.hair, x: p.x, z: p.z, ry: p.ry, moving: p.moving, seat: p.seat, glass: p.glass, drunk: p.drunk, drunkAt: p.drunkAt, score: p.score, washing: p.washing });
  const tablePub = T => ({ id: T.id, items: T.items, love: T.love, spin: T.spin });
  const staffPub = () => staff.map(s => s.busy);
  const members = T => T.seats.filter(id => id && !isStaff(id) && players.has(id));
  const sys = (text, to) => (to ? io.to(to) : io).emit('system', text);

  /* ---------- Ví ---------- */
  setInterval(() => { const t = now(); for (const [k, w] of wallets) if (t - w.last > 86400 && !w.online) wallets.delete(k); for (const [ip, a] of ipGrants) { const b = a.filter(x => t - x < 43200); if (b.length) ipGrants.set(ip, b); else ipGrants.delete(ip); } }, 600000).unref?.();
  function walletFor(token, ip) {
    let w = token && wallets.get(token);
    if (w) return { w, fresh: false };
    const grants = (ipGrants.get(ip) || []).filter(x => now() - x < 43200);
    const allowed = grants.length < 20;
    if (allowed) { grants.push(now()); ipGrants.set(ip, grants); }
    w = { money: allowed ? START_MONEY : 0, wash: [], spent: 0, last: now(), online: 0, dish: null };
    if (token) wallets.set(token, w);
    return { w, fresh: true, noGrant: !allowed };
  }
  const sendMoney = (p, delta, why) => io.to(p.id).emit('money', { money: p.w.money, delta, why });
  function charge(p, amount, why) {
    if (p.w.money < amount) { io.to(p.id).emit('toast', `💸 Không đủ tiền! Còn ${fmtVND(p.w.money)} – vô rửa chén kiếm thêm nha.`); return false; }
    p.w.money -= amount; p.w.spent += amount; sendMoney(p, -amount, why); pushBoard(); return true;
  }

  let boardTimer = null;
  const pushBoard = () => {
    if (boardTimer) return;
    boardTimer = setTimeout(() => {
      boardTimer = null;
      const list = [...players.values()].sort((a, b) => b.score - a.score || b.w.spent - a.w.spent).slice(0, 6).map(p => ({ id: p.id, name: p.name, score: p.score, spent: p.w.spent }));
      io.emit('board', list);
    }, 1000);
  };
  const addScore = (p, n) => { if (p) { p.score += n; pushBoard(); } };
  function addDrunk(p, amount) { const t = now(); p.drunk = Math.min(1.05, drunkNow(p.drunk, p.drunkAt, t) + amount); p.drunkAt = t; }

  /* ---------- Bưng món ---------- */
  function schedule(table, keys, npc = false) {
    const t = now();
    const prep = Math.max(...keys.map(k => ALL_ITEMS[k]?.prep || 1));
    let wi = 0; waiters.forEach((w, i) => { if (w.freeAt < waiters[wi].freeAt) wi = i; });
    const W = waiters[wi];
    const d = pathLen(waiterPath(wi, table)) / WAITER_SPEED;
    const start = Math.max(t + prep, W.freeAt + 0.5);
    const arrive = start + d, leave = arrive + 1.6, back = leave + d;
    W.freeAt = back;
    const job = { id: jobSeq++, w: wi, table, start, arrive, leave, back, keys: keys.slice(0, 6), npc };
    jobs = jobs.filter(j => j.back > t - 1); jobs.push(job);
    return job;
  }
  setInterval(() => {
    const t = now();
    waiters.forEach(w => {
      if (t - w.freeAt > 16 && Math.random() < 0.5) {
        const job = schedule(pick(TABLES.filter(x => x.npc)).id, [pick(['bia', 'bia', 'bia', 'tra_da', 'dau_phong', 'oc_len', 'khan'])], true);
        io.emit('order', { job, adds: [] });
      }
    });
  }, 5000).unref?.();

  function addItems(T, keys, at, payer, cost) {
    const adds = keys.map(k => ({ id: itemSeq++, k, at }));
    for (const a of adds) { T.items.push(a); T.lines[a.k] = (T.lines[a.k] || 0) + 1; }
    T.total += cost; if (payer) T.payers[payer] = (T.payers[payer] || 0) + cost;
    while (T.items.length > 44) T.items.shift();
    return adds;
  }

  /* ---------- Phục vụ ngồi cùng ---------- */
  function staffFree(si) {
    const S = staff[si], B = S.busy; if (!B) return;
    const T = tables[B.t];
    if (T.seats[B.s] === 'staff:' + si) T.seats[B.s] = null;
    S.busy = null;
    io.emit('staff', staffPub());
  }

  /* ---------- Cụng ly ---------- */
  function endDzo(T) {
    const D = T.dzo; if (!D) return;
    T.dzo = null;
    const mem = members(T), hits = [];
    for (const [id, diff] of D.hits) {
      const p = players.get(id); if (!p || !mem.includes(id)) continue;
      const perfect = Math.abs(diff) < 0.18;
      if (p.glass === 'bia') addDrunk(p, DRUNK_PER_BEER * 0.8);
      addScore(p, perfect ? 2 : 1);
      hits.push({ id, perfect, drunk: p.drunk, at: p.drunkAt });
    }
    const staffHits = staff.filter(s => s.busy && s.busy.t === T.id && now() > s.busy.arrive).map(s => s.i);
    const all = mem.length >= 2 && hits.length === mem.length;
    if (all) hits.forEach(h => addScore(players.get(h.id), 2));
    T.love += hits.length + staffHits.length + (all ? 3 : 0);
    io.emit('dzoEnd', { t: T.id, hits, staff: staffHits, all, love: T.love, n: mem.length });
  }

  /* ---------- Oẳn tù tì ---------- */
  function rpsSet(T, R) { T.rps = R; io.emit('rps', { t: T.id, a: R?.a, b: R?.b, phase: R?.phase, until: R?.until }); }
  function rpsTimer(T, R) {
    clearTimeout(R.timer);
    R.timer = setTimeout(() => {
      if (T.rps !== R) return;
      if (R.phase === 'invite') { R.b = 'bot'; R.phase = 'pick'; R.until = now() + 6; rpsSet(T, R); rpsTimer(T, R); }
      else rpsResolve(T, R);
    }, Math.max(0, (R.until - now()) * 1000));
  }
  function rpsResolve(T, R) {
    clearTimeout(R.timer); if (T.rps !== R) return;
    const keys = Object.keys(RPS);
    const pa = R.picks[R.a] || pick(keys), pb = R.b === 'bot' ? pick(keys) : (R.picks[R.b] || pick(keys));
    let win = null;
    if (rpsBeats(pa, pb)) win = R.a; else if (rpsBeats(pb, pa)) win = R.b;
    if (win && win !== 'bot') addScore(players.get(win), 2);
    T.rps = null;
    io.emit('rpsEnd', { t: T.id, a: R.a, b: R.b, pa, pb, win, at: now() });
  }
  function rpsCancel(id) {
    for (const T of tables) { const R = T.rps; if (R && (R.a === id || R.b === id)) { clearTimeout(R.timer); T.rps = null; io.emit('rpsEnd', { t: T.id, cancel: true }); } }
  }

  /* ---------- Xúc xắc (chỉ tính điểm ⭐, không dùng tiền) ---------- */
  function diceRoll(T) {
    const D = T.dice; if (!D) return;
    const vals = [1, 2, 3].map(() => 1 + Math.floor(Math.random() * 6));
    const sum = vals[0] + vals[1] + vals[2], res = sum >= 11 ? 'tai' : 'xiu';
    const results = [];
    for (const [id, side] of Object.entries(D.bets)) {
      const p = players.get(id); if (!p) continue;
      const win = side === res; if (win) addScore(p, 1);
      results.push({ id, name: p.name, side, win });
    }
    T.dice = null;
    io.emit('diceEnd', { t: T.id, vals, sum, res, results, at: now() });
  }

  /* ---------- Rời ghế ---------- */
  function stand(socket, p, silent) {
    if (!p.seat) return;
    const T = tables[p.seat.t];
    if (T.seats[p.seat.s] === p.id) T.seats[p.seat.s] = null;
    socket.leave(room(p.seat.t));
    const sp = seatPos(p.seat.t, p.seat.s);
    p.x = sp.x - sp.fx * 0.62; p.z = sp.z - sp.fz * 0.62;
    p.seat = null;
    rpsCancel(p.id);
    if (!silent) io.emit('seat', { id: p.id, seat: null, x: p.x, z: p.z });
  }

  /* ---------- Rửa chén ---------- */
  const nearSink = p => !p.seat && Math.hypot(p.x - SINK.x, p.z - SINK.z) <= SINK_R;
  function washCaps(w) {
    const t = now(); w.wash = w.wash.filter(x => t - x < 3600);
    const n5 = w.wash.filter(x => t - x < 300).length, n1 = w.wash.length;
    if (n5 >= WASH_CAP_5M) return { ok: false, wait: Math.ceil((300 - (t - w.wash.filter(x => t - x < 300)[0])) / 60), n5, n1 };
    if (n1 >= WASH_CAP_1H) return { ok: false, wait: Math.ceil((3600 - (t - w.wash[0])) / 60), n5, n1 };
    return { ok: true, n5, n1 };
  }
  function nextDish(socket, p) {
    const c = washCaps(p.w);
    if (!c.ok) {
      p.w.dish = null; setWashing(p, false);
      socket.emit('washEnd', { msg: `Chủ quán: "Nghỉ tay xíu đi con, ${c.wait} phút nữa quay lại rửa tiếp nha!"` });
      return;
    }
    const need = WASH_NEED[0] + Math.random() * (WASH_NEED[1] - WASH_NEED[0]);
    p.w.dish = { token: Math.random().toString(36).slice(2, 10), at: now(), need, kind: pick(DISHES).k, sock: socket.id };
    socket.emit('dish', { token: p.w.dish.token, kind: p.w.dish.kind, need, n5: c.n5, cap5: WASH_CAP_5M });
  }
  function setWashing(p, on) { if (p.washing === on) return; p.washing = on; io.emit('washing', { id: p.id, on }); }

  io.on('connection', socket => {
    const rl = {};
    const limit = (k, s) => { const t = now(); if (rl[k] && t - rl[k] < s) return false; rl[k] = t; return true; };
    const me = () => players.get(socket.id);
    const myTable = () => { const p = me(); return p?.seat ? tables[p.seat.t] : null; };
    const toast = m => socket.emit('toast', m);
    const ip = String(socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '').split(',')[0].trim();

    socket.emit('hello', { now: now(), count: players.size, staff: staffPub() });

    socket.on('join', d => {
      if (players.has(socket.id)) return;
      const token = /^[a-z0-9-]{8,64}$/i.test(d?.token || '') ? d.token : null;
      const { w, fresh, noGrant } = walletFor(token, ip);
      w.online++; w.last = now();
      const gender = d?.gender === 'nu' ? 'nu' : 'nam';
      const p = {
        id: socket.id, w, name: clean(d?.name, 18) || 'Lai rai ' + socket.id.slice(0, 3), gender,
        shirt: SHIRTS.includes(d?.shirt) ? d.shirt : SHIRTS[0], hair: HAIRS[gender].includes(d?.hair) ? d.hair : HAIRS[gender][0],
        x: (Math.random() - 0.5) * 1.2, z: -4.5, ry: 0, moving: false, seat: null, glass: 'bia',
        drunk: 0, drunkAt: now(), score: 0, washing: false
      };
      players.set(socket.id, p);
      socket.join(socket.id);
      socket.emit('init', { selfId: p.id, now: now(), money: w.money, fresh, players: [...players.values()].map(pub), tables: tables.map(tablePub), jobs, staff: staffPub() });
      if (noGrant) toast('Mạng này đã nhận đủ lượt tiền khởi nghiệp hôm nay – vô rửa chén kiếm tiền nhậu nha!');
      socket.broadcast.emit('joined', pub(p));
      io.emit('count', players.size);
      sys(`${p.name} vừa tấp vô ${'quán Anh Ken'} 🛵`);
      pushBoard();
    });

    socket.on('move', d => {
      const p = me(); if (!p || p.seat) return;
      p.x = clamp(d?.x, -40, 40); p.z = clamp(d?.z, -14, 10.4); p.ry = clamp(d?.ry, -10, 10); p.moving = !!d?.moving;
      socket.broadcast.volatile.emit('moved', { id: p.id, x: p.x, z: p.z, ry: p.ry, moving: p.moving });
      if (p.washing && !nearSink(p)) { p.w.dish = null; setWashing(p, false); socket.emit('washEnd', {}); }
    });

    socket.on('sit', d => {
      const p = me(); if (!p) return;
      const t = Math.floor(d?.t), s = Math.floor(d?.s);
      const T = tables[t]; if (!T || T.npc || !(s >= 0 && s < TABLES[t].n)) return;
      if (T.seats[s] && T.seats[s] !== p.id) return toast('Ghế này có người ngồi rồi!');
      const sp = seatPos(t, s);
      if (!p.seat && Math.hypot(p.x - sp.x, p.z - sp.z) > 2.6) return;
      if (p.washing) { p.w.dish = null; setWashing(p, false); }
      if (p.seat) stand(socket, p, true);
      T.seats[s] = p.id; p.seat = { t, s }; p.x = sp.x; p.z = sp.z; p.ry = sp.ry; p.moving = false;
      socket.join(room(t));
      io.emit('seat', { id: p.id, seat: p.seat });
      const others = members(T).filter(id => id !== p.id).map(id => players.get(id)?.name).filter(Boolean);
      socket.emit('system', others.length ? `Bạn ngồi ${TABLES[t].name} cùng ${others.join(', ')} 🍻` : `Bạn ngồi ${TABLES[t].name}. Gọi món rồi rủ bạn bè vô nha!`);
      if (others.length) socket.to(room(t)).emit('system', `${p.name} vừa ngồi vào bàn 🙌`);
    });
    socket.on('stand', () => { const p = me(); if (p) stand(socket, p); });

    socket.on('glass', k => { const p = me(); if (!p || !['bia', 'tra'].includes(k)) return; p.glass = k; io.emit('glass', { id: p.id, glass: k }); });

    socket.on('drink', () => {
      const p = me(); if (!p?.seat || !limit('drink', 1.4)) return;
      if (p.glass === 'bia') {
        if (drunkNow(p.drunk, p.drunkAt, now()) >= 1) return toast('🤢 Say quá rồi! Đổi qua trà đá đi bạn ơi.');
        addDrunk(p, DRUNK_PER_BEER);
      }
      io.emit('act', { id: p.id, type: 'drink', drunk: p.drunk, at: p.drunkAt });
    });

    socket.on('order', d => {
      const p = me(), T = myTable(); if (!p || !T) return;
      if (!limit('order', 2)) return toast('Từ từ, quán đang làm món nè!');
      const keys = [];
      for (const [k, q] of Object.entries(d || {})) { if (!MENU[k]) continue; for (let i = 0; i < clamp(Math.floor(q), 0, 10); i++) keys.push(k); }
      if (!keys.length) return;
      keys.length = Math.min(keys.length, 16);
      const cost = keys.reduce((s, k) => s + MENU[k].price, 0);
      if (!charge(p, cost, 'Gọi món')) return;
      const job = schedule(T.id, keys);
      const adds = addItems(T, keys, job.arrive + 0.8, p.name, cost);
      io.emit('order', { job, adds });
      io.to(room(T.id)).emit('system', `${p.name} gọi ${keys.length} món (${fmtVND(cost)}). ${['Bé Na', 'Anh Tèo'][job.w]} bưng ra liền!`);
    });

    socket.on('buy', d => {
      const p = me(), T = myTable(); if (!p || !T) return toast('Ngồi vào bàn rồi mới mua được nha!');
      const c = CARTS[d?.cart]; if (!c || !c.items.includes(d?.k)) return;
      const st = cartState(c, now()), TB = TABLES[T.id];
      if (!st.visible || Math.hypot(st.x - TB.x, st.z - TB.z) > CART_BUY_DIST) return toast('Xe đi xa rồi, kêu không kịp!');
      if (!limit('buy', 2)) return;
      const price = CART_ITEMS[d.k].price;
      if (!charge(p, price, 'Mua xe đẩy')) return;
      const adds = addItems(T, [d.k], now() + 1.2, p.name, price);
      io.emit('items', { t: T.id, adds });
      io.emit('cartSale', { cart: c.id, by: p.name, k: d.k, t: T.id });
      io.to(room(T.id)).emit('system', `${p.name} mua ${CART_ITEMS[d.k].name} (${fmtVND(price)})`);
    });

    socket.on('staff:order', si => {
      const p = me(), T = myTable(); if (!p || !T) return;
      const S = staff[si]; if (!S) return;
      if (S.busy) return toast(`${STAFF[si].name} đang ngồi bàn khác rồi, chọn người khác nha!`);
      if (!limit('staff', 2)) return;
      // tìm ghế trống gần người gọi nhất
      const mine = seatPos(T.id, p.seat.s);
      let best = -1, bd = 1e9;
      T.seats.forEach((id, s) => { if (id) return; const sp = seatPos(T.id, s), d = Math.hypot(sp.x - mine.x, sp.z - mine.z); if (d < bd) { bd = d; best = s; } });
      if (best < 0) return toast('Bàn hết ghế trống rồi, không ai ngồi thêm được!');
      if (!charge(p, STAFF_PRICE, 'Phục vụ ngồi cùng')) return;
      T.seats[best] = 'staff:' + si;
      const t = now(), path = staffPath(STAFF_HOME[si], T.id, best), d = pathLen(path) / WAITER_SPEED;
      S.busy = { i: si, t: T.id, s: best, by: p.id, byName: p.name, start: t, arrive: t + d, until: t + d + STAFF_MIN * 60 };
      T.total += STAFF_PRICE; T.payers[p.name] = (T.payers[p.name] || 0) + STAFF_PRICE; T.lines.__staff = (T.lines.__staff || 0) + 1;
      io.emit('staff', staffPub());
      io.to(room(T.id)).emit('system', `${p.name} mời ${STAFF[si].name} ra ngồi nâng ly cùng bàn (${STAFF_MIN} phút) 🥂`);
      clearTimeout(S.timer);
      S.timer = setTimeout(() => staffFree(si), (S.busy.until - t) * 1000);
    });

    socket.on('dzo:start', () => {
      const p = me(), T = myTable(); if (!T || T.dzo) return;
      if (T.cool.dzo && now() < T.cool.dzo) return;
      const t0 = now() + 0.5;
      T.dzo = { t0, hits: new Map(), by: p.id }; T.cool.dzo = t0 + DZO_HIT + 3;
      io.emit('dzo', { t: T.id, t0, by: p.name });
      setTimeout(() => endDzo(T), (DZO_HIT + 1.6) * 1000);
    });
    socket.on('dzo:hit', () => {
      const p = me(), T = myTable(); if (!T?.dzo || T.dzo.hits.has(p.id)) return;
      const diff = now() - 0.06 - (T.dzo.t0 + DZO_HIT);
      if (diff >= DZO_WINDOW[0] && diff <= DZO_WINDOW[1]) T.dzo.hits.set(p.id, diff);
      else socket.emit('dzoMiss', { early: diff < 0 });
    });

    socket.on('rps:start', () => {
      const p = me(), T = myTable(); if (!T || T.rps) return;
      const others = members(T).filter(id => id !== p.id);
      const R = { a: p.id, b: others.length ? null : 'bot', phase: others.length ? 'invite' : 'pick', until: now() + (others.length ? 8 : 6), picks: {} };
      rpsSet(T, R); rpsTimer(T, R);
    });
    socket.on('rps:join', () => {
      const p = me(), T = myTable(), R = T?.rps;
      if (!R || R.phase !== 'invite' || R.a === p.id) return;
      R.b = p.id; R.phase = 'pick'; R.until = now() + 6; rpsSet(T, R); rpsTimer(T, R);
    });
    socket.on('rps:pick', k => {
      const p = me(), T = myTable(), R = T?.rps;
      if (!R || R.phase !== 'pick' || !RPS[k] || (R.a !== p.id && R.b !== p.id)) return;
      R.picks[p.id] = k;
      if (R.picks[R.a] && (R.b === 'bot' || R.picks[R.b])) rpsResolve(T, R);
    });

    socket.on('spin:start', () => {
      const p = me(), T = myTable(); if (!T) return;
      if (T.spin && now() < T.spin.t0 + T.spin.dur + 1) return;
      const occ = T.seats.map((id, i) => (id ? i : -1)).filter(i => i >= 0);
      const seat = occ.length >= 2 ? pick(occ) : Math.floor(Math.random() * TABLES[T.id].n);
      const tgt = T.seats[seat];
      T.spin = { t0: now() + 0.2, dur: 4.2, seat, turns: 3 + Math.floor(Math.random() * 3), card: Math.floor(Math.random() * CARDS.length), by: p.name, target: tgt && !isStaff(tgt) ? tgt : null, staff: isStaff(tgt) ? +tgt.slice(6) : null };
      io.emit('spin', { t: T.id, ...T.spin });
    });

    socket.on('dice:start', () => {
      const p = me(), T = myTable(); if (!T || T.dice) return;
      T.dice = { t0: now(), betUntil: now() + 7, bets: {} };
      io.emit('dice', { t: T.id, t0: T.dice.t0, betUntil: T.dice.betUntil, by: p.name });
      setTimeout(() => diceRoll(T), 7000);
    });
    socket.on('dice:bet', side => {
      const p = me(), T = myTable(); if (!T?.dice || !['tai', 'xiu'].includes(side)) return;
      T.dice.bets[p.id] = side;
      io.to(room(T.id)).emit('diceBet', { id: p.id, name: p.name, side });
    });

    socket.on('bill:open', () => {
      const T = myTable(); if (!T) return;
      const lines = Object.entries(T.lines).map(([k, n]) => ({ k, n, price: k === '__staff' ? STAFF_PRICE : ALL_ITEMS[k].price }));
      socket.emit('bill', { t: T.id, lines, total: T.total, payers: T.payers, n: members(T).length });
    });
    socket.on('table:clear', () => {
      const T = myTable(); if (!T || !limit('clear', 5)) return;
      T.items = []; io.emit('cleared', { t: T.id });
    });

    /* Rửa chén */
    socket.on('wash:start', () => {
      const p = me(); if (!p || p.seat) return;
      if (!nearSink(p)) return toast('Lại gần bồn rửa chén trong quán đã!');
      if (p.w.dish && p.w.dish.sock === socket.id) return;
      setWashing(p, true); nextDish(socket, p);
    });
    socket.on('wash:done', d => {
      const p = me(), D = p?.w.dish; if (!D || D.sock !== socket.id || d?.token !== D.token) return;
      if (!nearSink(p)) { p.w.dish = null; setWashing(p, false); return socket.emit('washEnd', {}); }
      if (now() - D.at < D.need - 0.15) { return socket.emit('dishFail', { msg: 'Chưa sạch đâu, kỳ kỹ thêm chút!', token: D.token }); }
      p.w.dish = null;
      if (!washCaps(p.w).ok) return nextDish(socket, p);
      p.w.wash.push(now()); p.w.money += WASH_PAY; sendMoney(p, WASH_PAY, 'Rửa chén');
      nextDish(socket, p);
    });
    socket.on('wash:stop', () => { const p = me(); if (!p) return; p.w.dish = null; setWashing(p, false); });

    socket.on('chat', d => {
      const p = me(); if (!p || !limit('chat', 0.5)) return;
      const text = clean(d?.text, 140); if (!text) return;
      const msg = { id: p.id, name: p.name, color: p.shirt, text };
      if (d?.scope === 'ban' && p.seat) { io.to(room(p.seat.t)).emit('chat', { ...msg, scope: 'ban' }); io.except(room(p.seat.t)).emit('chatHint', { id: p.id }); }
      else io.emit('chat', { ...msg, scope: 'quan' });
    });

    socket.on('disconnect', () => {
      const p = me(); if (!p) return;
      stand(socket, p, true);
      if (p.w.dish?.sock === socket.id) p.w.dish = null;
      p.w.online = Math.max(0, p.w.online - 1); p.w.last = now();
      players.delete(socket.id);
      io.emit('left', socket.id);
      io.emit('count', players.size);
      sys(`${p.name} đã về. Nhớ gọi xe nha 🚕`);
      pushBoard();
    });
  });

  return { players, tables, wallets, staff, get jobs() { return jobs; } };
}
