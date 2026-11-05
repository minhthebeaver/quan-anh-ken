import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const hash = (a, b = 0) => {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be59b, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};
export function rng(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const lerpAngle = (a, b, t) => { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
export const fmt = n => n.toLocaleString('vi-VN') + 'đ';

export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function softDot(color, size = 64) {
  return canvasTex(size, size, (g) => {
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
  });
}

const FONT = '"Be Vietnam Pro", system-ui, sans-serif';
export function textSprite(text, o = {}) {
  const fs = o.size || 34, pad = 26;
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const font = `${o.weight || 600} ${fs}px ${FONT}`;
  g.font = font;
  const w = Math.min(1000, Math.ceil(g.measureText(text).width) + pad * 2), h = fs + 36;
  c.width = w; c.height = h; g.font = font;
  g.fillStyle = o.bg || 'rgba(20,10,8,.72)';
  g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, h / 2); g.fill();
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = 3; g.stroke(); }
  g.fillStyle = o.color || '#ffe3a8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  const sc = (o.scale || 0.38) / h * 1.0;
  s.scale.set(w * sc, h * sc, 1); s.renderOrder = 10;
  return s;
}
export function emojiSprite(emo, scale = 0.45) {
  const t = canvasTex(128, 128, g => { g.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emo, 64, 72); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  s.scale.setScalar(scale); s.renderOrder = 11; return s;
}

/* Gộp toàn bộ mesh tĩnh trong một group theo vật liệu → giảm draw call */
export function mergeStatic(root, scene) {
  root.updateMatrixWorld(true);
  const byMat = new Map(), remove = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.dynamic || Array.isArray(o.material)) return;
    const key = o.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { mat: o.material, geos: [] });
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(o.matrixWorld);
    byMat.get(key).geos.push(g);
    remove.push(o);
  });
  remove.forEach(o => o.parent.remove(o));
  let n = 0;
  for (const { mat, geos } of byMat.values()) {
    const needColor = geos.some(g => g.attributes.color);
    if (needColor) geos.forEach(g => { if (!g.attributes.color) { const a = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3)); } });
    else geos.forEach(g => g.deleteAttribute('color'));
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat); m.matrixAutoUpdate = false;
    scene.add(m); n++;
  }
  return n;
}

/* Gộp nhiều khối thành 1 geometry có màu đỉnh (dùng cho nhân vật, xe máy...) */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
export function bakeParts(parts) {
  const geos = parts.map(([geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    const n = g.attributes.position.count, col = new Float32Array(n * 3); _c.set(color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  return mergeGeometries(geos, false);
}

/* Vẽ chữ luôn nằm gọn trong khung (tự thu nhỏ cỡ chữ) */
export const FONT_FAMILY = '"Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
export function fitText(g, text, x, y, maxW, maxSize, weight = 800, minSize = 8) {
  let size = maxSize;
  g.font = `${weight} ${size}px ${FONT_FAMILY}`;
  const w = g.measureText(text).width;
  if (w > maxW) size = Math.max(minSize, Math.floor(size * maxW / w));
  g.font = `${weight} ${size}px ${FONT_FAMILY}`;
  while (g.measureText(text).width > maxW && size > minSize) { size--; g.font = `${weight} ${size}px ${FONT_FAMILY}`; }
  g.fillText(text, x, y);
  return size;
}
/* Texture vẽ lại khi font web tải xong để chữ đẹp & vẫn vừa khung */
export function liveTex(w, h, draw) {
  const t = canvasTex(w, h, draw);
  const c = t.image;
  document.fonts?.ready?.then(() => { const g = c.getContext('2d'); g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; });
  return t;
}
