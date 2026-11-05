// Dữ liệu & hàm dùng chung cho server (Node) và trình duyệt.

export const SHOP_NAME = 'QUÁN ANH KEN';
export const SHOP_PHONE = '098 864 9841';

export const TABLE_H = 0.62;
export const STOOL_H = 0.42;
export const UNIT = 0.8;          // mỗi "khúc" bàn dài 0.8m, mỗi bên 1 ghế
export const SIDE = 0.82;         // khoảng cách ghế dọc tới tâm bàn
export const END = 0.42;          // ghế đầu bàn cách mép bàn

/* ---------- Loại bàn: 4 – 6 – 8 – 12 – 16 người ---------- */
export const KINDS = {
  1: { label: 'Bàn tâm sự', style: 'red' },
  2: { label: 'Bàn nhóm bạn', style: 'blue' },
  3: { label: 'Bàn gia đình', style: 'blue' },
  5: { label: 'Bàn công ty', style: 'inox' },
  7: { label: 'Bàn tiệc lớn', style: 'inox' }
};
const RAW = [
  // hàng A (sát đường)
  { x: -4.3, z: -2.9, u: 7 }, { x: -9.9, z: -2.9, u: 1 }, { x: 3.5, z: -2.9, u: 5 }, { x: 8.8, z: -2.9, u: 2 },
  // hàng B (giữa)
  { x: -3.5, z: 0.6, u: 5, npc: 'vanphong', name: 'Bàn hội văn phòng' }, { x: -8.8, z: 0.6, u: 2 }, { x: -12.3, z: 0.6, u: 1 },
  { x: 2.7, z: 0.6, u: 3 }, { x: 7.1, z: 0.6, u: 2, npc: 'congtrinh', name: 'Bàn anh em công trình' }, { x: 10.7, z: 0.6, u: 1 },
  // hàng C (sát quán)
  { x: -2.7, z: 4.1, u: 3, npc: 'chutu', name: 'Bàn chú Tư' }, { x: -7.1, z: 4.1, u: 2 }, { x: -10.7, z: 4.1, u: 1 },
  { x: 1.9, z: 4.1, u: 1 }, { x: 5.9, z: 4.1, u: 3 }, { x: 10.3, z: 4.1, u: 2 }
];
let num = 0;
export const TABLES = RAW.map((t, id) => {
  const n = 2 * t.u + 2, L = t.u * UNIT;
  const name = t.name || `Bàn ${++num} · ${KINDS[t.u].label} (${n})`;
  return { ...t, id, n, L, name, style: KINDS[t.u].style, row: t.z < -1 ? 0 : t.z < 2.5 ? 1 : 2 };
});

// Ghế xếp vòng quanh bàn → ghế có số liền nhau thì ngồi kế nhau
export function seatOffsets(u) {
  const L = u * UNIT, out = [];
  for (let i = 0; i < u; i++) out.push({ x: -L / 2 + UNIT / 2 + i * UNIT, z: SIDE, fx: 0, fz: -1 });
  out.push({ x: L / 2 + END, z: 0, fx: -1, fz: 0 });
  for (let i = u - 1; i >= 0; i--) out.push({ x: -L / 2 + UNIT / 2 + i * UNIT, z: -SIDE, fx: 0, fz: 1 });
  out.push({ x: -L / 2 - END, z: 0, fx: 1, fz: 0 });
  return out;
}
const OFFS = {}; for (const k of [1, 2, 3, 5, 7]) OFFS[k] = seatOffsets(k);
export function seatPos(t, s) {
  const T = TABLES[t], o = OFFS[T.u][s];
  return { x: T.x + o.x, z: T.z + o.z, ry: Math.atan2(o.fx, o.fz), fx: o.fx, fz: o.fz, ox: o.x, oz: o.z };
}
export const seatCount = t => TABLES[t].n;

/* ---------- Thực đơn – giá quán vỉa hè ---------- */
export const MENU = {
  bia:       { name: 'Bia chai',             emo: '🍺', price: 25000,  prep: 1.5, model: 'bottle' },
  tra_da:    { name: 'Trà đá',               emo: '🧊', price: 5000,   prep: 1,   model: 'tea' },
  nuoc_ngot: { name: 'Nước ngọt',            emo: '🥤', price: 15000,  prep: 1,   model: 'can' },
  khan:      { name: 'Khăn lạnh',            emo: '🧻', price: 2000,   prep: 1,   model: 'towel' },
  dau_phong: { name: 'Đậu phộng rang',       emo: '🥜', price: 25000,  prep: 2,   model: 'peanut' },
  dau_hu:    { name: 'Đậu hũ chiên giòn',    emo: '🟨', price: 45000,  prep: 4,   model: 'tofu' },
  goi_xoai:  { name: 'Gỏi xoài khô cá',      emo: '🥗', price: 65000,  prep: 4,   model: 'salad' },
  nghieu:    { name: 'Nghêu hấp sả',         emo: '🦪', price: 75000,  prep: 5,   model: 'clam' },
  oc_len:    { name: 'Ốc len xào dừa',       emo: '🐚', price: 85000,  prep: 6,   model: 'snail' },
  canh_ga:   { name: 'Cánh gà chiên mắm',    emo: '🍗', price: 95000,  prep: 6,   model: 'wing' },
  kho_muc:   { name: 'Khô mực nướng',        emo: '🦑', price: 120000, prep: 5,   model: 'squid' },
  lau_thai:  { name: 'Lẩu Thái hải sản',     emo: '🍲', price: 250000, prep: 8,   model: 'hotpot' }
};
export const CART_ITEMS = {
  kho_muc_xe: { name: 'Khô mực (xe đẩy)',  emo: '🦑', price: 80000, model: 'squid' },
  banh_trang: { name: 'Bánh tráng trộn',   emo: '🥡', price: 25000, model: 'banhtrang' },
  keo_keo:    { name: 'Kẹo kéo',           emo: '🍬', price: 10000, model: 'candy' }
};
export const ALL_ITEMS = { ...MENU, ...CART_ITEMS };

/* ---------- Ví ---------- */
export const START_MONEY = 500000;

/* ---------- Phục vụ ngồi cùng nâng ly ---------- */
export const STAFF = [
  { name: 'Em Vy', gender: 'nu', shirt: '#e8436a', hair: 'duoi' },
  { name: 'Em Thảo', gender: 'nu', shirt: '#2f9e8f', hair: 'dai' },
  { name: 'Anh Long', gender: 'nam', shirt: '#1d1d24', hair: 'vuot' }
];
export const STAFF_PRICE = 50000;
export const STAFF_MIN = 5; // phút

/* ---------- Rửa chén kiếm tiền ---------- */
export const SINK = { x: 10.6, z: 9.0, ry: 0 };
export const SINK_R = 1.5;
export const WASH_PAY = 5000;
export const WASH_NEED = [2.6, 3.4];          // giây kỳ cọ tối thiểu mỗi cái
export const WASH_CAP_5M = 12;               // tối đa 12 cái / 5 phút  (= 60.000đ ≈ 2 chai)
export const WASH_CAP_1H = 36;               // tối đa 36 cái / giờ     (= 180.000đ)
export const DISHES = [
  { k: 'chen', name: 'Chén' }, { k: 'dia', name: 'Dĩa' }, { k: 'ly', name: 'Ly' }, { k: 'to', name: 'Tô lẩu' }
];

/* ---------- Đường đi của nhân viên ---------- */
export const KITCHEN = [{ x: -1.6, z: 8.3 }, { x: 1.6, z: 8.3 }];
export const WAITER_NAMES = ['Bé Na', 'Anh Tèo'];
export const WAITER_SPEED = 2.4;
const NORTH = [-1.15, 2.35, 5.55], SOUTH = [-4.4, -1.15, 2.35];
const FRONT = 5.55;
export function waiterPath(w, t) {
  const K = KITCHEN[w], T = TABLES[t], a = NORTH[T.row];
  return [{ x: K.x, z: K.z }, { x: K.x, z: FRONT }, { x: 0, z: FRONT }, { x: 0, z: a }, { x: T.x, z: a }];
}
export function staffPath(from, t, s) {
  const T = TABLES[t], sp = seatPos(t, s);
  const a = sp.oz < -0.1 ? SOUTH[T.row] : NORTH[T.row];
  return [{ x: from.x, z: from.z }, { x: from.x, z: FRONT }, { x: 0, z: FRONT }, { x: 0, z: a }, { x: sp.x, z: a }, { x: sp.x, z: sp.z }];
}
export const STAFF_HOME = [{ x: -3.2, z: 7.4 }, { x: -2.4, z: 7.4 }, { x: 3.2, z: 7.4 }];
export function pathLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z); return L; }
export function pointAt(p, d) {
  for (let i = 1; i < p.length; i++) {
    const L = Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z);
    if (d <= L || i === p.length - 1) {
      const k = L ? Math.max(0, Math.min(1, d / L)) : 1;
      return { x: p[i - 1].x + (p[i].x - p[i - 1].x) * k, z: p[i - 1].z + (p[i].z - p[i - 1].z) * k, ry: Math.atan2(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z) };
    }
    d -= L;
  }
  return { ...p[p.length - 1], ry: 0 };
}

/* ---------- Xe đẩy bán dạo ---------- */
export const CARTS = [
  { id: 0, name: 'Xe khô mực cô Sáu', sign: 'KHÔ MỰC', items: ['kho_muc_xe', 'banh_trang'], dir: 1, offset: 0, z: -5.7,
    calls: ['Khô mực nướng đây!', 'Mực ngon nè, ủng hộ cô đi con!', 'Bánh tráng trộn hông mấy đứa?'] },
  { id: 1, name: 'Xe kẹo kéo chú Bảy', sign: 'KẸO KÉO', items: ['keo_keo', 'banh_trang'], dir: -1, offset: 65, z: -6.6,
    calls: ['Kẹo kéo đây, kẹo kéo!', 'Ting ting… kẹo kéo nè!', 'Mua kẹo cho đỡ đắng miệng nè!'] }
];
export const CART_PERIOD = 130, CART_SPEED = 1.1, CART_STOP_T = 12;
const CART_STOPS = [-10, -3.5, 3.5, 10];
export function cartState(c, t) {
  let p = ((t + c.offset) % CART_PERIOD + CART_PERIOD) % CART_PERIOD;
  const xs = c.dir > 0 ? [-40, ...CART_STOPS, 40] : [40, ...CART_STOPS.slice().reverse(), -40];
  const ry = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  for (let i = 1; i < xs.length; i++) {
    const seg = Math.abs(xs[i] - xs[i - 1]) / CART_SPEED;
    if (p < seg) return { x: xs[i - 1] + Math.sign(xs[i] - xs[i - 1]) * p * CART_SPEED, z: c.z, ry, moving: true, visible: true, stop: -1 };
    p -= seg;
    if (i < xs.length - 1) {
      if (p < CART_STOP_T) return { x: xs[i], z: c.z, ry, moving: false, visible: true, stop: i, stopT: p };
      p -= CART_STOP_T;
    }
  }
  return { x: xs[xs.length - 1], z: c.z, ry, moving: false, visible: false, stop: -1 };
}
export const CART_BUY_DIST = 13;

/* ---------- Độ phê ---------- */
export const DRUNK_PER_BEER = 0.11;
export const DRUNK_DECAY = 0.0045;
export const drunkNow = (d0, at, now) => Math.max(0, d0 - DRUNK_DECAY * Math.max(0, now - at));

/* ---------- Cụng ly ---------- */
export const DZO_BEATS = [0, 0.75, 1.5, 2.25];
export const DZO_HIT = 2.25;
export const DZO_WINDOW = [-0.55, 0.6];

/* ---------- Thật hay thách ---------- */
export const CARDS = [
  ['Thật', 'Kể kỷ niệm quê nhất của bạn hồi đi học.'],
  ['Thật', 'Ai trong bàn bạn muốn đi du lịch cùng nhất?'],
  ['Thật', 'Lần gần nhất bạn khóc là vì chuyện gì?'],
  ['Thật', 'Món ăn bạn ghét nhất mà vẫn phải giả vờ thích?'],
  ['Thật', 'Bạn từng lỡ lời nói xấu ai mà bị nghe thấy chưa?'],
  ['Thật', 'Nếu trúng số 1 tỷ, việc đầu tiên bạn làm là gì?'],
  ['Thật', 'Crush đầu đời của bạn tên gì?'],
  ['Thách', 'Hát một câu bài hát bất kỳ vào chat.'],
  ['Thách', 'Khen từng người trong bàn một câu thật lòng.'],
  ['Thách', 'Nói giọng miền khác trong 3 câu chat tiếp theo.'],
  ['Thách', 'Gõ "Tui là vua bao" vào chat cả quán.'],
  ['Thách', 'Mời cả bàn một ly trà đá (gọi món đi!).'],
  ['Thách', 'Kể một câu chuyện cười, không ai cười thì uống.'],
  ['Thách', 'Đứng dậy đi một vòng quanh quán rồi quay lại.'],
  ['Thách', 'Cụng ly "Dzô" với cả bàn ngay bây giờ.']
];

export const RPS = { bua: '✊', bao: '✋', keo: '✌️' };
export const rpsBeats = (a, b) => (a === 'bua' && b === 'keo') || (a === 'keo' && b === 'bao') || (a === 'bao' && b === 'bua');
export const fmtVND = n => Math.round(n).toLocaleString('vi-VN') + 'đ';
