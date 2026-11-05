import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TABLES, seatPos, MENU, CART_ITEMS, CARTS, CART_BUY_DIST, drunkNow, DZO_BEATS, DZO_HIT, DZO_WINDOW, CARDS, RPS, STAFF, STAFF_PRICE, STAFF_MIN, SINK, SINK_R, WASH_PAY, fmtVND } from './shared.js';
import { buildWorld, blocked } from './world.js';
import { createProps } from './props.js';
import { createNpcs } from './npc.js';
import { makeChar, setPose } from './human.js';
import { sfx } from './audio.js';
import { textSprite, emojiSprite, lerpAngle, fmt } from './util.js';

const $ = s => document.querySelector(s);
const isTouch = matchMedia('(pointer:coarse)').matches;

/* ====================== RENDER ====================== */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x120c16, 22, 85);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.08, 700);

let quality = isTouch ? 'low' : 'high', composer = null, bloom = null;
function applyQuality() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.75 : 1));
  renderer.setSize(innerWidth, innerHeight);
  if (quality === 'high' && !composer) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.7, 0.45, 0.72);
    composer.addPass(bloom); composer.addPass(new OutputPass());
  }
  composer?.setSize(innerWidth, innerHeight);
  W.extraLights.forEach(l => (l.visible = quality === 'high'));
  $('#qualBtn').textContent = quality === 'high' ? 'HD' : 'SD';
}

/* ====================== THẾ GIỚI ====================== */
const W = buildWorld(scene, renderer);
const props = createProps(scene);
props.kitchenSteam = W.dyn.steam;
const N = createNpcs(scene, props, sfx);
applyQuality();

/* ====================== NGƯỜI CHƠI ====================== */
const players = new Map();
let me = null, selfId = null, joined = false, offset = 0;
const sNow = () => Date.now() / 1000 + offset;
const tableState = TABLES.map(() => ({ dzo: null, rps: null, spin: null, dice: null }));
let money = 0, staffState = STAFF.map(() => null);
N.findPlayer = id => players.get(id)?.ch.root.position;

function createPlayer(p) {
  if (players.has(p.id)) return players.get(p.id);
  const ch = makeChar({ seed: [...p.name].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7), gender: p.gender, shirt: p.shirt, hair: p.hair });
  ch.root.position.set(p.x, 0, p.z); ch.root.rotation.y = p.ry;
  const label = textSprite(p.name, { border: 'rgba(255,192,74,.7)' }); label.position.y = 1.98; ch.root.add(label);
  scene.add(ch.root);
  const o = { ...p, ch, label, target: new THREE.Vector3(p.x, 0, p.z), targetRy: p.ry, walk: 0, act: null, bubble: null, emo: null, d0: p.drunk || 0, dAt: p.drunkAt || 0 };
  ch.setGlass(p.glass);
  players.set(p.id, o);
  if (p.seat) placeSeat(o);
  return o;
}
function removePlayer(id) { const o = players.get(id); if (o) { scene.remove(o.ch.root); players.delete(id); } }
function placeSeat(o) { const sp = seatPos(o.seat.t, o.seat.s); o.ch.root.position.set(sp.x, 0, sp.z); o.ch.root.rotation.y = sp.ry; o.target.set(sp.x, 0, sp.z); o.targetRy = sp.ry; }
function setAct(o, type, dur) { o.act = { type, start: sNow(), dur }; }
function showEmo(o, e, dur = 3) { if (o.emo) o.ch.root.remove(o.emo.s); const s = emojiSprite(e, 0.5); s.position.y = 2.42; o.ch.root.add(s); o.emo = { s, until: sNow() + dur }; }
function showBubble(o, text, dur = 6) {
  if (o.bubble) o.ch.root.remove(o.bubble.s);
  const s = textSprite(text.length > 44 ? text.slice(0, 42) + '…' : text, { bg: 'rgba(255,248,232,.96)', color: '#3a1604', size: 30, scale: 0.34 });
  s.position.y = 2.32; o.ch.root.add(s); o.bubble = { s, until: sNow() + dur };
}
const mySeat = () => me?.seat || null;
const myTable = () => me?.seat ? me.seat.t : -1;
const seatedAt = t => [...players.values()].filter(p => p.seat?.t === t);
const nameOf = id => id === 'bot' ? 'Chú Bot' : (players.get(id)?.name || '???');

/* ====================== UI CƠ BẢN ====================== */
const SHIRTS = ['#e8432f', '#2f6fe8', '#f2c230', '#2fae66', '#ffffff', '#1d1d24', '#ff7a2f', '#9b5de5', '#f28ab2', '#7fc8f8'];
const HAIRS = { nam: [['ngan', 'Tóc ngắn'], ['dinh', 'Đầu đinh'], ['vuot', 'Vuốt keo'], ['hoi', 'Hói nhẹ'], ['mu', 'Mũ lưỡi trai']], nu: [['dai', 'Tóc dài'], ['duoi', 'Đuôi ngựa'], ['bui', 'Búi tóc'], ['ngang', 'Ngang vai']] };
let shirt = SHIRTS[0], gender = 'nam', hair = 'ngan';
SHIRTS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sw' + (i ? '' : ' on'); b.style.background = c; b.onclick = () => { shirt = c; document.querySelectorAll('.sw').forEach(x => x.classList.remove('on')); b.classList.add('on'); }; $('#shirts').appendChild(b); });
function renderHairs() {
  $('#hairs').innerHTML = '';
  HAIRS[gender].forEach(([k, n], i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chipb' + (i ? '' : ' on'); b.textContent = n; b.onclick = () => { hair = k; $('#hairs').querySelectorAll('.chipb').forEach(x => x.classList.remove('on')); b.classList.add('on'); }; $('#hairs').appendChild(b); });
  hair = HAIRS[gender][0][0];
}
document.querySelectorAll('.gbtn').forEach(b => b.onclick = () => { gender = b.dataset.g; document.querySelectorAll('.gbtn').forEach(x => x.classList.toggle('on', x === b)); renderHairs(); });
renderHairs();
let token = null;
try { token = localStorage.getItem('nhau-token'); if (!token) { token = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)); localStorage.setItem('nhau-token', token); } } catch { }
try { $('#name').value = localStorage.getItem('nhau-name') || ''; } catch { }

function toast(html) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3400);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function addMsg(m) {
  const d = document.createElement('div');
  if (m.sys) { d.className = 'msg sys'; d.textContent = m.sys; }
  else {
    d.className = 'msg';
    if (m.scope === 'ban') { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'BÀN'; d.append(t); }
    const b = document.createElement('b'); b.textContent = m.name; b.style.color = ['#ffffff', '#1d1d24'].includes(m.color) ? '#ffd99a' : m.color; d.append(b, m.text);
  }
  $('#messages').appendChild(d); $('#messages').scrollTop = 1e6;
  while ($('#messages').children.length > 60) $('#messages').firstChild.remove();
}
const panels = ['#menuPanel', '#buyPanel', '#billPanel', '#staffPanel'];
const closePanels = () => panels.forEach(p => ($(p).hidden = true));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => (b.closest('.panel').hidden = true)));

/* Thực đơn */
const cart = {};
function renderMenu() {
  const L = $('#menuList'); L.innerHTML = '';
  let total = 0;
  for (const [k, m] of Object.entries(MENU)) {
    const q = cart[k] || 0; total += q * m.price;
    const row = document.createElement('div'); row.className = 'mi';
    row.innerHTML = `<span class="e">${m.emo}</span><span class="n">${esc(m.name)}<small>${fmt(m.price)}</small></span><span class="qty"><button type="button" data-d="-1">−</button><b>${q}</b><button type="button" data-d="1">+</button></span>`;
    row.querySelectorAll('button').forEach(b => b.onclick = () => { cart[k] = Math.max(0, Math.min(6, (cart[k] || 0) + +b.dataset.d)); sfx.pop(); renderMenu(); });
    L.appendChild(row);
  }
  $('#menuTotal').innerHTML = `${fmt(total)} <small>· ví ${fmt(money)}</small>`;
  $('#menuTotal').style.color = total > money ? '#ff6a5a' : '';
}
$('#orderBtn').onclick = () => {
  if (!Object.values(cart).some(Boolean)) return toast('Chọn món trước đã!');
  const tot = Object.entries(cart).reduce((t, [k, q]) => t + MENU[k].price * q, 0);
  if (tot > money) return toast('💸 Không đủ tiền! Bớt món hoặc vô rửa chén kiếm thêm.');
  socket.emit('order', cart); for (const k in cart) delete cart[k]; $('#menuPanel').hidden = true;
};
$('#clearBtn').onclick = () => { socket.emit('table:clear'); $('#billPanel').hidden = true; };
function setMoney(m, delta) {
  money = m; $('#money').textContent = fmtVND(m);
  if (delta) { const c = $('.moneychip'); c.classList.remove('up', 'down'); void c.offsetWidth; c.classList.add(delta > 0 ? 'up' : 'down'); }
  if (!$('#menuPanel').hidden) renderMenu();
}
function renderStaff() {
  const L = $('#staffList'); L.innerHTML = '';
  STAFF.forEach((S, i) => {
    const B = staffState[i], row = document.createElement('div'); row.className = 'mi';
    const busy = B ? (B.by === selfId ? 'Đang ngồi bàn bạn' : 'Đang ngồi bàn khác') : 'Đang rảnh';
    row.innerHTML = `<span class="e">${S.gender === 'nu' ? '👩' : '👨'}</span><span class="n">${esc(S.name)}<small>${busy}</small></span><button type="button" class="primary sm" ${B ? 'disabled' : ''}>Mời</button>`;
    row.querySelector('button').onclick = () => { socket.emit('staff:order', i); $('#staffPanel').hidden = true; };
    L.appendChild(row);
  });
}

let scope = 'quan';
$('#scopeBtn').onclick = () => { if (!mySeat()) return toast('Ngồi vào bàn mới chat riêng bàn được'); scope = scope === 'ban' ? 'quan' : 'ban'; updScope(); };
function updScope() { if (!mySeat()) scope = 'quan'; $('#scopeBtn').textContent = scope === 'ban' ? 'Bàn' : 'Quán'; $('#scopeBtn').classList.toggle('ban', scope === 'ban'); }
$('#chatForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#chatInput').value.trim(); if (v) socket.emit('chat', { text: v, scope }); $('#chatInput').value = ''; $('#chatInput').blur(); });

$('#soundBtn').onclick = () => { $('#soundBtn').textContent = sfx.toggle() ? '🔊' : '🔇'; };
$('#qualBtn').onclick = () => { quality = quality === 'high' ? 'low' : 'high'; autoQ.locked = true; applyQuality(); toast('Đồ hoạ: <b>' + (quality === 'high' ? 'Cao' : 'Tiết kiệm') + '</b>'); };
$('#boardBtn').onclick = () => ($('#board').hidden = !$('#board').hidden);

/* ====================== MẠNG ====================== */
const socket = io();
socket.on('hello', d => { offset = d.now - Date.now() / 1000; });
$('#joinForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#name').value.trim(); if (!name) return;
  try { localStorage.setItem('nhau-name', name); } catch { }
  sfx.init(); sfx.clink(0.8);
  socket.emit('join', { name, shirt, hair, gender, token });
  $('#join').classList.add('leaving'); setTimeout(() => $('#join').remove(), 800);
  $('#hud').hidden = false;
});
socket.on('init', d => {
  offset = d.now - Date.now() / 1000;
  selfId = d.selfId;
  d.players.forEach(createPlayer); me = players.get(selfId);
  d.tables.forEach(T => { if (!TABLES[T.id].npc) props.setItems(T.id, T.items); if (T.spin) props.startSpin(T.id, T.spin); });
  N.jobs = d.jobs.slice();
  $('#count').textContent = d.players.length;
  joined = true; camYaw = Math.PI; updGlassBtn(); setMoney(d.money); staffState = d.staff; N.setStaff(d.staff, sNow());
  if (d.fresh && d.money) setTimeout(() => toast(`💰 Quán tặng <b>${fmtVND(d.money)}</b> tiền nhậu. Hết tiền thì vô rửa chén!`), 3500);
  addMsg({ sys: 'Chào mừng tới Quán Nhậu Online 🍻 Đi tới ghế trống, bấm E để ngồi.' });
  setTimeout(() => toast('Bàn có người ngồi sẵn là <b>khách quen</b> – kiếm bàn trống mà ngồi nha!'), 1500);
});
socket.on('joined', createPlayer);
socket.on('left', removePlayer);
socket.on('count', n => ($('#count').textContent = n));
socket.on('system', t => addMsg({ sys: t }));
socket.on('toast', t => toast(esc(t)));
socket.on('moved', d => { const o = players.get(d.id); if (o && !o.seat) { o.target.set(d.x, 0, d.z); o.targetRy = d.ry; o.moving = d.moving; } });
socket.on('seat', d => {
  const o = players.get(d.id); if (!o) return;
  o.seat = d.seat; o.moving = false;
  if (d.seat) placeSeat(o);
  else { o.ch.root.position.set(d.x, 0, d.z); o.target.set(d.x, 0, d.z); }
  if (o === me) {
    $('#seatBar').hidden = !d.seat; closePanels(); updScope();
    if (d.seat) { camYaw = seatPos(d.seat.t, d.seat.s).ry + Math.PI; camPitch = 0.38; camDist = 3.2; sfx.pop(); }
    else { camDist = 6; }
  }
});
socket.on('glass', d => { const o = players.get(d.id); if (o) { o.glass = d.glass; o.ch.setGlass(d.glass); if (o === me) updGlassBtn(); } });
socket.on('act', d => {
  const o = players.get(d.id); if (!o) return;
  if (d.type === 'drink') { setAct(o, 'drink', 1.6); o.d0 = d.drunk; o.dAt = d.at; sfx.gulp(volAt(o.ch.root.position, 10)); }
});
socket.on('order', d => {
  N.jobs.push(d.job);
  if (d.adds.length) props.addItems(d.job.table, d.adds);
});
socket.on('items', d => props.addItems(d.t, d.adds));
socket.on('cleared', d => props.clear(d.t));
socket.on('money', d => { setMoney(d.money, d.delta); if (d.delta > 0 && d.why === 'Rửa chén') { sfx.coin(); } });
socket.on('staff', arr => { N.setStaff(arr, sNow()); staffState = arr; if (!$('#staffPanel').hidden) renderStaff(); });
socket.on('washing', d => { const o = players.get(d.id); if (o) o.washing = d.on; });
socket.on('dish', d => startDish(d));
socket.on('dishFail', d => { toast(esc(d.msg)); dish && (dish.sent = false); });
socket.on('washEnd', d => { stopDishUI(); if (d.msg) toast(esc(d.msg)); });
socket.on('cartSale', d => { const C = N.carts[d.cart]; if (C) C.sale = sNow(); });
socket.on('chat', m => {
  addMsg(m);
  const o = players.get(m.id); if (o) showBubble(o, m.text);
});
socket.on('chatHint', d => { const o = players.get(d.id); if (o) showEmo(o, '💬', 2.5); });
socket.on('board', list => {
  $('#boardList').innerHTML = list.length ? list.map(p => `<li>${esc(p.name)} — <b>${p.score}</b>⭐${p.spent ? ` <small>· chi ${fmt(p.spent)}</small>` : ''}</li>`).join('') : '<li>Chưa có ai…</li>';
  const mine = list.find(p => p.id === selfId); if (mine) $('#score').textContent = mine.score;
});
socket.on('bill', d => {
  $('#billList').innerHTML = d.lines.length ? d.lines.map(l => { const it = l.k === '__staff' ? { emo: '🥂', name: `Phục vụ ngồi cùng (${STAFF_MIN} phút)` } : (MENU[l.k] || CART_ITEMS[l.k]); return `<div><span>${it.emo} ${esc(it.name)} × ${l.n}</span><span>${fmt(l.n * l.price)}</span></div>`; }).join('') : '<p style="text-align:center;color:#c9a987">Chưa gọi gì hết trơn!</p>';
  const pay = Object.entries(d.payers || {}).sort((a, b) => b[1] - a[1]);
  $('#billTotal').innerHTML = d.total ? `Tổng bàn đã chi: <b>${fmt(d.total)}</b>${pay.length ? '<div class="payers">' + pay.map(([n, v], i) => `<span>${i === 0 ? '👑 ' : ''}${esc(n)}: ${fmt(v)}</span>`).join('') + '</div>' : ''}<small>Gọi món là trả tiền liền từ ví người gọi</small>` : '';
  closePanels(); $('#billPanel').hidden = false;
});

/* --- Dzô --- */
let myDzoHit = false;
socket.on('dzo', d => {
  tableState[d.t].dzo = { t0: d.t0, beat: -1 };
  if (d.t === myTable()) { myDzoHit = false; addMsg({ sys: `${d.by} hô: Một, hai, ba… chuẩn bị DZÔ!` }); }
});
socket.on('dzoMiss', d => toast(d.early ? '😅 Sớm quá! Đợi chữ <b>DZÔ</b>' : '🐢 Trễ rồi, ly người ta cạn rồi!'));
socket.on('dzoEnd', d => {
  tableState[d.t].dzo = null;
  const T = TABLES[d.t], v = me ? Math.max(0, 1 - Math.hypot(me.ch.root.position.x - T.x, me.ch.root.position.z - T.z) / 25) : 0.3;
  if (d.hits.length) { sfx.clink(Math.min(1, v * (0.6 + d.hits.length * 0.15))); sfx.cheer(v * 0.6); }
  d.hits.forEach(h => { const o = players.get(h.id); if (!o) return; o.d0 = h.drunk; o.dAt = h.at; setAct(o, d.all ? 'drinkCheer' : 'drink', d.all ? 2.6 : 1.6); if (h.perfect) showEmo(o, '💯', 2.5); });
  if (d.t === myTable()) {
    const mine = d.hits.find(h => h.id === selfId);
    if (d.all) toast(`🍻 <b>Cả bàn đồng lòng!</b> Tình anh em +${d.hits.length + 3} 💛`);
    else if (mine) toast(mine.perfect ? '💯 Cụng chuẩn từng mili giây! <b>+2⭐</b>' : '🍺 Cụng ly! <b>+1⭐</b>');
    else toast('😶 Bạn lỡ nhịp rồi, lần sau nha!');
  }
});

/* --- Oẳn tù tì --- */
socket.on('rps', d => { tableState[d.t].rps = d; if (d.t === myTable()) renderRps(); });
socket.on('rpsEnd', d => {
  tableState[d.t].rps = null;
  if (d.cancel) { if (d.t === myTable()) $('#rpsPanel').hidden = true; return; }
  const A = players.get(d.a), Bp = players.get(d.b);
  if (A) { showEmo(A, RPS[d.pa], 3.5); setAct(A, 'reveal', 1.6); }
  if (Bp) { showEmo(Bp, RPS[d.pb], 3.5); setAct(Bp, 'reveal', 1.6); }
  if (d.win && players.get(d.win)) setTimeout(() => { const w = players.get(d.win); if (w) setAct(w, 'cheer', 1.5); }, 1600);
  if (d.t === myTable()) {
    const txt = `${esc(nameOf(d.a))} ${RPS[d.pa]} vs ${RPS[d.pb]} ${esc(nameOf(d.b))}`;
    const res = !d.win ? '🤝 Hoà! Chơi lại đi!' : d.win === selfId ? '🎉 Bạn thắng! +2⭐' : (d.a === selfId || d.b === selfId) ? '😵 Thua rồi – phạt một ly (trà đá cũng được)!' : `🏆 ${esc(nameOf(d.win))} thắng!`;
    $('#rpsPanel').innerHTML = `<h3>Oẳn tù tì!</h3><p style="font-size:18px">${txt}</p><p><b>${res}</b></p>`;
    $('#rpsPanel').hidden = false;
    if (d.win === selfId) sfx.win(); else if (d.a === selfId || d.b === selfId) sfx.lose();
    setTimeout(() => { if (!tableState[d.t].rps) $('#rpsPanel').hidden = true; }, 3800);
  }
});
function renderRps() {
  const R = tableState[myTable()]?.rps, P = $('#rpsPanel');
  if (!R || !R.phase) { P.hidden = true; return; }
  const left = Math.max(0, R.until - sNow());
  if (R.phase === 'invite') {
    if (R.a === selfId) P.innerHTML = `<h3>✊ Oẳn tù tì</h3><p>Đang chờ người trong bàn nhận lời… (không ai chơi thì đấu với Chú Bot)</p>`;
    else { P.innerHTML = `<h3>✊ ${esc(nameOf(R.a))} rủ oẳn tù tì!</h3><p>Ai thua phải uống nha 😏</p><button type="button" class="primary sm" id="rpsJoin">Chơi luôn!</button>`; $('#rpsJoin').onclick = () => socket.emit('rps:join'); }
  } else if (R.phase === 'pick') {
    if (R.a === selfId || R.b === selfId) {
      const opp = R.a === selfId ? R.b : R.a;
      P.innerHTML = `<h3>Ra gì nè? <small style="font-weight:500">vs ${esc(nameOf(opp))}</small></h3><div class="big3">${Object.entries(RPS).map(([k, e]) => `<button type="button" data-k="${k}">${e}<small>${{ bua: 'Búa', bao: 'Bao', keo: 'Kéo' }[k]}</small></button>`).join('')}</div><div class="timer"><i id="rpsT" style="width:${left / 6 * 100}%"></i></div>`;
      P.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { socket.emit('rps:pick', b.dataset.k); P.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x === b)); sfx.pop(); });
    } else P.innerHTML = `<h3>✊ ${esc(nameOf(R.a))} vs ${esc(nameOf(R.b))}</h3><p>Hai người đang ra tay… 👀</p>`;
  }
  P.hidden = false;
}

/* --- Xoay chai --- */
socket.on('spin', d => {
  tableState[d.t].spin = d; props.startSpin(d.t, d);
  const T = TABLES[d.t];
  if (me) sfx.spin(d.dur, Math.max(0, 1 - Math.hypot(me.ch.root.position.x - T.x, me.ch.root.position.z - T.z) / 12));
  if (d.t === myTable()) {
    $('#cardPanel').innerHTML = `<h3>🍾 ${esc(d.by)} xoay chai…</h3><p>Chai dừng chỗ ai, người đó chịu "Thật hay Thách"!</p>`; $('#cardPanel').hidden = false;
    setTimeout(() => {
      const [k, text] = CARDS[d.card];
      const who = d.target ? nameOf(d.target) : d.staff != null ? STAFF[d.staff].name : null;
      $('#cardPanel').innerHTML = `<h3>🍾 Chai chỉ vào: ${who ? esc(who) : 'ghế trống 😂'}</h3>${who ? `<div class="card"><div class="k">${k.toUpperCase()}</div>${esc(text)}</div>` : '<p>Không ai ngồi đó – xoay lại đi!</p>'}<button type="button" class="ghost sm" id="cardOk">Đã xong</button>`;
      $('#cardOk').onclick = () => ($('#cardPanel').hidden = true);
      if (d.target === selfId) { sfx.win(); toast('👉 Chai chỉ vào <b>bạn</b>!'); }
      setTimeout(() => ($('#cardPanel').hidden = true), 12000);
    }, Math.max(0, (d.t0 + d.dur - sNow()) * 1000));
  }
  setTimeout(() => { const o = d.target && players.get(d.target); if (o) showEmo(o, '👉', 3); }, Math.max(0, (d.t0 + d.dur - sNow()) * 1000));
});

/* --- Xúc xắc --- */
const diceBets = {};
socket.on('dice', d => {
  tableState[d.t].dice = d; props.startDice(d.t, d);
  const T = TABLES[d.t];
  if (me) sfx.dice(6.5, Math.max(0, 1 - Math.hypot(me.ch.root.position.x - T.x, me.ch.root.position.z - T.z) / 12) * 0.8);
  if (d.t === myTable()) { for (const k in diceBets) delete diceBets[k]; renderDice(); }
});
socket.on('diceBet', b => { diceBets[b.id] = b; if (tableState[myTable()]?.dice) renderDice(); });
socket.on('diceEnd', d => {
  tableState[d.t].dice = null; props.endDice(d.t, d);
  const T = TABLES[d.t];
  if (me) setTimeout(() => sfx.thunk(Math.max(0, 1 - Math.hypot(me.ch.root.position.x - T.x, me.ch.root.position.z - T.z) / 12)), 600);
  if (d.t === myTable()) {
    setTimeout(() => {
      const mine = d.results.find(r => r.id === selfId);
      $('#dicePanel').innerHTML = `<h3>🎲 ${d.vals.join(' + ')} = ${d.sum}</h3><p style="font-size:24px;font-weight:900;color:${d.res === 'tai' ? '#ff6a3a' : '#5ab0ff'}">${d.res === 'tai' ? 'TÀI' : 'XỈU'}</p>
        <p>${d.results.length ? d.results.map(r => `${r.win ? '✅' : '❌'} ${esc(r.name)}`).join(' · ') : 'Không ai đặt cửa'}</p>${mine ? `<p><b>${mine.win ? 'Bạn thắng! +1⭐' : 'Bạn thua – phạt nửa ly!'}</b></p>` : ''}`;
      $('#dicePanel').hidden = false;
      if (mine) mine.win ? sfx.win() : sfx.lose();
      setTimeout(() => ($('#dicePanel').hidden = true), 5000);
    }, 1200);
  }
});
function renderDice() {
  const D = tableState[myTable()]?.dice, P = $('#dicePanel'); if (!D) return;
  const mine = diceBets[selfId]?.side;
  P.innerHTML = `<h3>🎲 Lắc xúc xắc – Tài hay Xỉu?</h3><p>Đặt cửa trước khi mở bát (tính điểm ảo)</p>
    <div class="big3"><button type="button" data-s="tai" class="${mine === 'tai' ? 'on' : ''}">🔴<small>TÀI 11–17</small></button><button type="button" data-s="xiu" class="${mine === 'xiu' ? 'on' : ''}">🔵<small>XỈU 4–10</small></button></div>
    <div class="timer"><i id="diceT"></i></div><p style="font-size:12px">${Object.values(diceBets).map(b => `${esc(b.name)}: ${b.side === 'tai' ? 'Tài' : 'Xỉu'}`).join(' · ') || 'Chưa ai đặt'}</p>`;
  P.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { socket.emit('dice:bet', b.dataset.s); sfx.pop(); });
  P.hidden = false;
}

/* ====================== HÀNH ĐỘNG ====================== */
function updGlassBtn() { $('#glassIco').textContent = me.glass === 'bia' ? '🍺' : '🧊'; $('#glassLbl').textContent = me.glass === 'bia' ? 'Ly bia' : 'Trà đá'; }
function doAct(a) {
  if (!mySeat()) return;
  sfx.init();
  if (a === 'dzo') {
    const D = tableState[myTable()].dzo;
    if (D) { if (!myDzoHit) { myDzoHit = true; socket.emit('dzo:hit'); } }
    else socket.emit('dzo:start');
  }
  else if (a === 'drink') socket.emit('drink');
  else if (a === 'glass') socket.emit('glass', me.glass === 'bia' ? 'tra' : 'bia');
  else if (a === 'menu') { const v = $('#menuPanel').hidden; closePanels(); if (v) { renderMenu(); $('#menuPanel').hidden = false; } }
  else if (a === 'rps') socket.emit('rps:start');
  else if (a === 'spin') socket.emit('spin:start');
  else if (a === 'dice') socket.emit('dice:start');
  else if (a === 'staff') { const v = $('#staffPanel').hidden; closePanels(); if (v) { renderStaff(); $('#staffPanel').hidden = false; } }
  else if (a === 'bill') { if ($('#billPanel').hidden) socket.emit('bill:open'); else $('#billPanel').hidden = true; }
  else if (a === 'stand') socket.emit('stand');
}
document.querySelectorAll('.act').forEach(b => b.addEventListener('click', () => doAct(b.dataset.a)));

let nearSeat = null, nearCart = null, nearSink = false;
function interact() {
  sfx.init();
  if (mySeat()) return socket.emit('stand');
  if (dish) return;
  if (nearSink) return socket.emit('wash:start');
  if (nearSeat) socket.emit('sit', nearSeat);
  else toast('Đi lại gần một ghế trống rồi bấm E');
}
function openBuy() {
  if (nearCart == null) return;
  const C = CARTS[nearCart];
  $('#buyTitle').textContent = '🛒 ' + C.name;
  $('#buyList').innerHTML = '';
  C.items.forEach(k => {
    const it = CART_ITEMS[k], row = document.createElement('div'); row.className = 'mi';
    row.innerHTML = `<span class="e">${it.emo}</span><span class="n">${esc(it.name)}<small>${fmt(it.price)}</small></span><button type="button" class="primary sm">Mua</button>`;
    row.querySelector('button').onclick = () => { socket.emit('buy', { cart: C.id, k }); $('#buyPanel').hidden = true; };
    $('#buyList').appendChild(row);
  });
  closePanels(); $('#buyPanel').hidden = false;
}
$('#cartPrompt').addEventListener('click', openBuy);

const keys = {};
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') e.target.blur(); return; }
  if (!joined) return;
  const k = e.key.toLowerCase();
  if (e.key === 'Enter') { e.preventDefault(); $('#chatInput').focus(); return; }
  if (e.key === 'Escape') { closePanels(); return; }
  if (e.code === 'Space') e.preventDefault();
  if (dish && e.code === 'Space') { scrubAt(150 + (Math.random() - 0.5) * dish.look.r * 1.4, 150 + (Math.random() - 0.5) * dish.look.r * 1.4, 0.45); return; }
  keys[k] = true;
  if (e.repeat) return;
  if (k === 'e') interact();
  if (k === 'h') document.body.classList.toggle('photo');
  if (k === 'f') openBuy();
  if (mySeat()) {
    const map = { ' ': 'dzo', r: 'drink', g: 'glass', m: 'menu', 1: 'rps', 2: 'spin', 3: 'dice', b: 'bill', n: 'staff' };
    if (map[k]) doAct(map[k]);
  }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

let camYaw = Math.PI, camPitch = 0.32, camDist = 6, drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  camYaw -= (e.clientX - drag.x) * 0.006; camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - drag.y) * 0.004, 0.02, 1.2);
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', () => (drag = null)); canvas.addEventListener('pointercancel', () => (drag = null));
canvas.addEventListener('wheel', e => { camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.006, 1.6, 14); }, { passive: true });
const stick = $('#stick'), knob = stick.querySelector('.knob'), joy = { x: 0, y: 0, id: null };
stick.addEventListener('pointerdown', e => { joy.id = e.pointerId; stick.setPointerCapture(e.pointerId); moveJoy(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === joy.id) moveJoy(e); });
const endJoy = () => { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
stick.addEventListener('pointerup', endJoy); stick.addEventListener('pointercancel', endJoy);
function moveJoy(e) { const r = stick.getBoundingClientRect(); let dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2; const l = Math.hypot(dx, dy), m = 40; if (l > m) { dx *= m / l; dy *= m / l; } joy.x = dx / m; joy.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; }

/* ====================== RỬA CHÉN ====================== */
let dish = null;
const DISH_LOOK = { chen: { r: 92, rim: '#f4f2ec', in: '#e8e4dc', name: 'Chén' }, dia: { r: 124, rim: '#ffffff', in: '#f2efe8', name: 'Dĩa' }, ly: { r: 70, rim: '#dfeef2', in: '#cfe2ea', name: 'Ly' }, to: { r: 132, rim: '#f0ede4', in: '#e2ddd0', name: 'Tô lẩu' } };
const washCv = $('#washCanvas'), wg = washCv.getContext('2d');
function startDish(d) {
  const look = DISH_LOOK[d.kind] || DISH_LOOK.dia;
  const stains = [];
  for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * look.r * 0.85; stains.push({ x: 150 + Math.cos(a) * r, y: 150 + Math.sin(a) * r, s: 8 + Math.random() * 16, a: 1, c: ['#8a5a2a', '#a8742a', '#6a3a1a', '#c8a050', '#d84a1a'][i % 5] }); }
  dish = { ...d, look, stains, t0: performance.now() / 1000, sent: false, bubbles: [], last: null };
  if (me) { me.ch.root.position.set(SINK.x, 0, SINK.z); me.targetRy = 0; me.ch.root.rotation.y = 0; camYaw = Math.PI; camPitch = 0.45; camDist = 3.2; }
  $('#washTitle').textContent = `🧽 Rửa ${look.name} – ${fmtVND(WASH_PAY)}`;
  $('#washCount').textContent = `Đã rửa ${d.n5}/${d.cap5} cái trong 5 phút`;
  closePanels(); $('#washPanel').hidden = false;
  drawDish();
}
function stopDishUI() { dish = null; $('#washPanel').hidden = true; }
function dishProgress() {
  const clean = 1 - dish.stains.reduce((s, x) => s + x.a, 0) / dish.stains.length;
  const timeK = (performance.now() / 1000 - dish.t0) / dish.need;
  return { clean, shown: Math.min(clean, timeK), timeK };
}
function drawDish() {
  if (!dish) return;
  const g = wg, L = dish.look;
  g.clearRect(0, 0, 300, 300);
  g.fillStyle = '#5a6a78'; g.fillRect(0, 0, 300, 300);
  g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 12; i++) g.fillRect(0, i * 26, 300, 2);
  g.fillStyle = L.rim; g.beginPath(); g.arc(150, 150, L.r + 14, 0, 7); g.fill();
  const gr = g.createRadialGradient(140, 140, 10, 150, 150, L.r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, L.in);
  g.fillStyle = gr; g.beginPath(); g.arc(150, 150, L.r, 0, 7); g.fill();
  g.strokeStyle = '#2f6fe8'; g.lineWidth = 3; g.beginPath(); g.arc(150, 150, L.r + 7, 0, 7); g.stroke();
  for (const st of dish.stains) if (st.a > 0.02) { g.globalAlpha = st.a * 0.85; g.fillStyle = st.c; g.beginPath(); g.ellipse(st.x, st.y, st.s, st.s * 0.7, st.x, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  for (const b of dish.bubbles) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.fillStyle = 'rgba(220,240,255,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.stroke(); }
  const pr = dishProgress();
  $('#washBar').style.width = Math.min(100, pr.shown * 100) + '%';
  if (pr.clean >= 0.999 && pr.timeK < 1) $('#washHint').textContent = 'Sạch rồi, tráng nước thêm xíu…';
  else $('#washHint').textContent = 'Kéo chuột / vuốt lên vết dơ để kỳ (hoặc bấm Space liên tục)';
}
function scrubAt(x, y, amt) {
  if (!dish || dish.sent) return;
  for (const st of dish.stains) { const d = Math.hypot(st.x - x, st.y - y); if (d < st.s + 22) st.a = Math.max(0, st.a - amt * (1 - d / (st.s + 22))); }
  if (dish.bubbles.length < 40 && Math.random() < 0.6) dish.bubbles.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20, r: 3 + Math.random() * 7, life: 1 });
  if (Math.random() < 0.15) sfx.scrub?.();
}
washCv.addEventListener('pointerdown', e => { washCv.setPointerCapture(e.pointerId); const r = washCv.getBoundingClientRect(); dish && (dish.last = [(e.clientX - r.left) * 300 / r.width, (e.clientY - r.top) * 300 / r.height]); });
washCv.addEventListener('pointermove', e => {
  if (!dish || !dish.last) return;
  const r = washCv.getBoundingClientRect(), x = (e.clientX - r.left) * 300 / r.width, y = (e.clientY - r.top) * 300 / r.height;
  const d = Math.hypot(x - dish.last[0], y - dish.last[1]); dish.last = [x, y];
  scrubAt(x, y, Math.min(0.5, d * 0.018));
});
const endScrub = () => dish && (dish.last = null);
washCv.addEventListener('pointerup', endScrub); washCv.addEventListener('pointercancel', endScrub);
$('#washStop').onclick = () => { socket.emit('wash:stop'); stopDishUI(); };
function updateDish(dt) {
  if (!dish) return;
  dish.bubbles.forEach(b => (b.life -= dt * 0.8)); dish.bubbles = dish.bubbles.filter(b => b.life > 0);
  const pr = dishProgress();
  if (!dish.sent && pr.clean >= 0.999 && pr.timeK >= 1.02) {
    dish.sent = true; socket.emit('wash:done', { token: dish.token });
    $('#washHint').textContent = '✨ Sạch bóng!';
  }
  drawDish();
}

/* ====================== VÒNG LẶP ====================== */
const clock = new THREE.Clock();
const dzoBtn = document.querySelector('.act[data-a="dzo"]');
const tmp = new THREE.Vector3(), look = new THREE.Vector3();
const volAt = (p, r) => (me ? Math.max(0, 1 - me.ch.root.position.distanceTo(p) / r) : 0.3);
let lastSend = 0, wasMoving = false, warned = 0;
const autoQ = { t: 0, frames: 0, locked: false, checks: 0 };
const bikeSide = new Map();

function update(dt, t) {
  const st = sNow();
  updateDish(dt);

  /* --- Bản thân --- */
  if (joined && me) {
    const d = drunkNow(me.d0, me.dAt, st);
    if (!mySeat()) {
      let f = 0, r = 0;
      if (keys.w || keys.arrowup) f++; if (keys.s || keys.arrowdown) f--;
      if (keys.d || keys.arrowright) r++; if (keys.a || keys.arrowleft) r--;
      if (joy.id !== null) { f -= joy.y; r += joy.x; }
      const mag = Math.min(1, Math.hypot(f, r)), moving = mag > 0.1;
      const p = me.ch.root.position;
      if (moving && dish) { socket.emit('wash:stop'); stopDishUI(); }
      if (moving) {
        const wob = Math.sin(t * 1.7) * 0.7 * d;
        const yaw = camYaw + wob;
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        let mx = fx * f + rx * r, mz = fz * f + rz * r; const l = Math.hypot(mx, mz); mx /= l; mz /= l;
        const sp = (keys.shift ? 5.5 : 3.2) * mag * dt * (1 - d * 0.25);
        if (!blocked(p.x + mx * sp, p.z)) p.x += mx * sp;
        if (!blocked(p.x, p.z + mz * sp)) p.z += mz * sp;
        me.targetRy = Math.atan2(mx, mz);
      }
      me.ch.root.rotation.y = lerpAngle(me.ch.root.rotation.y, me.targetRy, Math.min(1, dt * 12));
      me.moving = moving;
      if ((moving || wasMoving) && t - lastSend > 0.06) { socket.emit('move', { x: p.x, z: p.z, ry: me.ch.root.rotation.y, moving }); lastSend = t; wasMoving = moving; }

      // ghế trống gần nhất
      const occ = new Set([...players.values()].filter(o => o.seat).map(o => o.seat.t + ':' + o.seat.s));
      staffState.forEach(b => b && occ.add(b.t + ':' + b.s));
      let best = null, bd = 1.2;
      TABLES.forEach(T => { if (T.npc || Math.abs(p.x - T.x) > T.L / 2 + 2 || Math.abs(p.z - T.z) > 2.2) return; for (let s = 0; s < T.n; s++) { if (occ.has(T.id + ':' + s)) continue; const sp = seatPos(T.id, s), dd = Math.hypot(p.x - sp.x, p.z - sp.z); if (dd < bd) { bd = dd; best = { t: T.id, s }; } } });
      nearSeat = best;
      nearSink = Math.hypot(p.x - SINK.x, p.z - SINK.z) < SINK_R - 0.15;
      const pr = $('#prompt');
      if (dish) pr.classList.remove('show');
      else if (nearSink) { pr.innerHTML = `<kbd>E</kbd> Rửa chén kiếm tiền (${fmtVND(WASH_PAY)}/cái)`; pr.classList.add('show'); }
      else if (best) { const T = TABLES[best.t], c = seatedAt(T.id).length; pr.innerHTML = `<kbd>E</kbd> Ngồi ${T.name} <small>· ${c}/${T.n} người</small>`; pr.classList.add('show'); } else pr.classList.remove('show');
      const zone = dish ? ['Bồn rửa chén', 'Kỳ cho sạch nha con!'] : p.z > 6 ? ['Trong quán Anh Ken', 'Bồn rửa chén ở góc phải – kiếm tiền nhậu!'] : p.z < -5 ? ['Giữa đường', 'Coi chừng xe máy nha!'] : ['Vỉa hè', 'Kiếm bàn trống ngồi đi!'];
      setZone(...zone);
    } else {
      $('#prompt').classList.remove('show'); nearSeat = null;
      const T = TABLES[myTable()];
      setZone(T.name, `${seatedAt(T.id).length} người · Space để DZÔ!`);
    }

    // xe đẩy ghé gần
    nearCart = null;
    if (mySeat()) {
      const T = TABLES[myTable()];
      CARTS.forEach((c, i) => { const s = N.cartPos(i, st); if (s.visible && Math.hypot(s.x - T.x, s.z - T.z) < CART_BUY_DIST) nearCart = i; });
    }
    const cp = $('#cartPrompt');
    if (nearCart != null) { cp.innerHTML = `🛒 ${CARTS[nearCart].name} ghé ngang – <kbd>F</kbd> mua`; cp.classList.add('show'); } else { cp.classList.remove('show'); if (!$('#buyPanel').hidden) $('#buyPanel').hidden = true; }

    // độ phê
    $('#pheBar').style.width = Math.min(100, d * 100) + '%';
    $('#drunkFx').style.opacity = Math.max(0, d - 0.2) * 0.9;
    if (d > 0.7 && st - warned > 60) { warned = st; toast('🥴 Bạn hơi phê rồi – đổi qua <b>trà đá</b> cho tỉnh nha!'); }

    // camera
    const p = me.ch.root.position;
    const headY = mySeat() ? 1.25 : 1.55;
    look.set(p.x, headY, p.z);
    tmp.set(p.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, headY + Math.sin(camPitch) * camDist, p.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist);
    if (tmp.z >= 5.6 && tmp.z < 10.6 && Math.abs(tmp.x) < 12) { tmp.y = Math.min(tmp.y, 3.3); tmp.z = Math.min(tmp.z, 10.3); }
    tmp.y = Math.max(tmp.y, 0.4);
    camera.position.lerp(tmp, 1 - Math.exp(-dt * 8));
    camera.lookAt(look);
    if (d > 0.02) {
      camera.rotateZ(Math.sin(t * 0.9) * 0.07 * d);
      camera.fov = 58 + Math.sin(t * 0.63) * 5 * d; camera.updateProjectionMatrix();
    } else if (camera.fov !== 58) { camera.fov = 58; camera.updateProjectionMatrix(); }
  } else {
    const a = t * 0.05;
    camera.position.set(Math.sin(a) * 6 - 2, 2.6 + Math.sin(t * 0.2) * 0.3, -7 + Math.cos(a) * 2);
    camera.lookAt(0, 1.2, 2);
  }

  /* --- Dzô của bàn mình --- */
  const myT = myTable();
  const D = myT >= 0 ? tableState[myT].dzo : null;
  if (D) {
    const e = st - D.t0;
    const beat = DZO_BEATS.filter(b => e >= b).length - 1;
    if (beat !== D.beat && beat >= 0) {
      D.beat = beat; sfx.beat(beat);
      const big = $('#dzoBig');
      big.innerHTML = ['MỘT', 'HAI', 'BA', 'DZÔ!!!'][beat] + (beat === 3 && !myDzoHit ? '<small>bấm SPACE / 🥂 ngay!</small>' : '');
      big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop');
    }
    const inWin = e - DZO_HIT >= DZO_WINDOW[0] && e - DZO_HIT <= DZO_WINDOW[1];
    dzoBtn?.classList.toggle('hot', inWin && !myDzoHit);
  } else dzoBtn?.classList.remove('hot');

  // thanh thời gian trò chơi
  if (myT >= 0) {
    const R = tableState[myT].rps; const ti = $('#rpsT'); if (R && ti) ti.style.width = Math.max(0, (R.until - st) / 6 * 100) + '%';
    const DC = tableState[myT].dice; const di = $('#diceT'); if (DC && di) di.style.width = Math.max(0, (DC.betUntil - st) / 7 * 100) + '%';
  }

  /* --- Tất cả người chơi --- */
  for (const o of players.values()) {
    const ch = o.ch;
    if (o !== me && !o.seat) {
      ch.root.position.x += (o.target.x - ch.root.position.x) * Math.min(1, dt * 10);
      ch.root.position.z += (o.target.z - ch.root.position.z) * Math.min(1, dt * 10);
      ch.root.rotation.y = lerpAngle(ch.root.rotation.y, o.targetRy, Math.min(1, dt * 10));
    }
    const d = drunkNow(o.d0, o.dAt, st);
    if (Math.abs(d - ch.drunk) > 0.01) ch.setDrunk(d);
    let act = null, k = 0;
    if (o.act) {
      const e = (st - o.act.start) / o.act.dur;
      if (e >= 1) o.act = null;
      else if (o.act.type === 'drinkCheer') { if (e < 0.55) { act = 'drink'; k = e / 0.55; } else act = 'cheer'; }
      else { act = o.act.type; k = e; }
    }
    if (!act && o.seat) {
      const TS = tableState[o.seat.t];
      if (TS.dzo && st > TS.dzo.t0 + 0.2) act = 'raise';
      else if (TS.rps && TS.rps.phase === 'pick' && (TS.rps.a === o.id || TS.rps.b === o.id)) act = 'rps';
      else if (TS.dice) act = 'clap';
    }
    o.walk = o.moving && !o.seat ? o.walk + dt * (o === me && keys.shift ? 11 : 8) : 0;
    let lookA = 0;
    if (o.seat && o.bubble == null) {
      const talkers = seatedAt(o.seat.t).filter(x => x !== o && x.bubble);
      if (talkers[0]) { const sp = seatPos(o.seat.t, o.seat.s), q = talkers[0].ch.root.position; lookA = Math.max(-0.9, Math.min(0.9, lerpAngle(0, Math.atan2(q.x - sp.x, q.z - sp.z) - sp.ry, 1))); }
    }
    if (!act && o.bubble) act = 'talk';
    if (o.washing && !o.seat && !o.moving) { act = 'scrub'; if (o !== me) { o.target.set(SINK.x, 0, SINK.z); o.targetRy = 0; } }
    setPose(ch, { mode: o.seat ? 'sit' : (o.moving ? 'walk' : 'stand'), act, k, ph: o.walk, t, look: lookA });
    ch.root.rotation.z = Math.sin(t * 1.1 + ch.seed) * 0.05 * d;
    ch.update(dt);
    if (o.bubble && st > o.bubble.until) { ch.root.remove(o.bubble.s); o.bubble = null; }
    if (o.emo && st > o.emo.until) { ch.root.remove(o.emo.s); o.emo = null; }
    if (!o.emo && d > 0.6) showEmo(o, '🥴', 4);
    o.label.visible = !(o === me && mySeat());
  }

  /* --- Thế giới --- */
  N.update(dt, st, t, me ? me.ch.root.position : null, tt => { const D = tableState[tt].dzo; return D && st > D.t0 + 0.2; });
  props.update(dt, st, t);
  W.update(dt, t);
  if (me) {
    W.bikes.forEach((b, i) => {
      const side = Math.sign(b.g.position.x - me.ch.root.position.x);
      if (bikeSide.has(i) && bikeSide.get(i) !== side) sfx.moto(Math.max(0, 1 - Math.abs(b.z - me.ch.root.position.z) / 18) * 0.8, b.dir > 0);
      bikeSide.set(i, side);
    });
    sfx.crowd(Math.max(0, 1 - Math.hypot(me.ch.root.position.x, me.ch.root.position.z - 1) / 25));
  }
}
let zoneCache = '';
function setZone(a, b) { const k = a + b; if (k === zoneCache) return; zoneCache = k; $('#zone').textContent = a; $('#zoneSub').textContent = b; }

let frames = 0;
function loop() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  update(dt, t);
  if (quality === 'high' && composer) composer.render(); else renderer.render(scene, camera);
  if (++frames === 3) $('#loading').classList.add('done');
  // tự hạ đồ hoạ nếu máy yếu
  if (joined && !autoQ.locked && quality === 'high') {
    autoQ.t += dt; autoQ.frames++;
    if (autoQ.t > 4) {
      const fps = autoQ.frames / autoQ.t; autoQ.t = 0; autoQ.frames = 0;
      if (fps < 40 && ++autoQ.checks >= 2) { quality = 'low'; applyQuality(); toast('Máy hơi đuối – đã chuyển sang <b>đồ hoạ tiết kiệm</b> (bấm HD để bật lại)'); }
    }
  }
  requestAnimationFrame(loop);
}
loop();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight); });
