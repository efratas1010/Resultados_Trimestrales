'use strict';
/* =======================================================================
   M\u00D3DULO 2 \u00B7 UTILIDADES
   ======================================================================= */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const uid = () => crypto.randomUUID();
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
const cf = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const toNum = v => { if (v === '' || v == null) return null; if (typeof v === 'number') return Number.isFinite(v) ? v : null; const raw = String(v).trim().replace(/[$%\s]/g, ''); const normalized = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw) ? raw.replace(/,/g, '') : raw; if (!/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null; const n = Number(normalized); return Number.isFinite(n) ? n : null; };
const fmtNum = v => { const n = toNum(v); return n == null ? '\u2014' : nf.format(n); };
const fmtPct = v => v == null || isNaN(v) ? '\u2014' : nf.format(Math.round(v * 10) / 10) + '%';
const fmtCur = v => { const n = toNum(v); return n == null ? '\u2014' : cf.format(n); };
const isoLocal = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoyISO = () => isoLocal(new Date());
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return isoLocal(d); };
const fmtDate = s => { if (!s) return '\u2014'; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? esc(s) : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); };
const trimestreDe = iso => { if (!iso || !/^\d{4}-\d{2}/.test(iso)) return ''; return 'T' + Math.ceil(parseInt(iso.slice(5, 7), 10) / 3); };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const semClass = s => ({ Verde: 'verde', Amarillo: 'amarillo', Rojo: 'rojo' }[s] || '');

/* \u00CDconos SVG (trazos estilo l\u00EDnea) */
const ICONS = {
  plus: 'M12 5v14M5 12h14', x: 'M18 6 6 18M6 6l12 12', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  copy: 'M9 9h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6', upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z', play: 'M7 4l13 8-13 8z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', pen: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  chart: 'M3 3v18h18M7 16v-5M12 16V8M17 16v-9', sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3', chevL: 'M15 18l-6-6 6-6', chevR: 'M9 18l6-6-6-6', menu: 'M3 6h18M3 12h18M3 18h18',
  check: 'M20 6 9 17l-5-5', info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  feather: 'M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5zM16 8 2 22M17.5 15H9', flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', table: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', key: 'M15.5 7.5 19 4M21 2l-2 2M12.4 11.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zM15.5 7.5l3 3L22 7l-3-3',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', arrowR: 'M5 12h14M13 6l6 6-6 6',
  max: 'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3', compare: 'M18 20V10M12 20V4M6 20v-6'
};
const icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`;
const tip = t => `<span class="tip-ic" tabindex="0" role="img" aria-label="${esc(t)}" data-tip="${esc(t)}">${icon('info', 15)}</span>`;

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = icon(type === 'error' ? 'alert' : 'check', 16) + `<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = 0; setTimeout(() => el.remove(), 300); }, 3400);
}

function ring(pct, size = 54, stroke = 6) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
  return `<div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label="${Math.round(p)}% de avance">
    <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}" style="transition:stroke-dashoffset .8s var(--ease)"/></svg>
    <b>${Math.round(p)}%</b></div>`;
}
const progBar = v => { const n = Math.max(0, Math.min(100, toNum(v) || 0)); return `<div class="prog"><div class="bar"><i style="width:${n}%"></i></div><span>${Math.round(n)}%</span></div>`; };
const semPill = s => `<span class="pill ${semClass(s)}"><i></i>${esc(s || 'Sin dato')}</span>`;
const estatusPill = s => { const m = { 'Completada': 'verde', 'En proceso': 'azul', 'Retrasada': 'rojo', 'No iniciada': '', 'Cancelada': '' }; return `<span class="pill ${m[s] ?? ''}"><i></i>${esc(s || '\u2014')}</span>`; };
