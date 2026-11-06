/* CARE-NST v2 — ระบบดูแลทหารใหม่ (ผลัด 2/69 เป็นต้นไป)
 * เกณฑ์อ้างอิง: คำแนะนำการฝึกทหารใหม่ ปีงบ 2570 (ยศ.ทบ.), ลฝ.21-2 พ.ศ.2569,
 * วิทยุ ยศ.ทบ. กห 0461/834 (11 พ.ย.68), คำสั่ง ทบ. 499/2567
 * ไม่มีข้อมูลบุคคลในไฟล์นี้ ข้อมูลทั้งหมดอยู่ในฐานข้อมูลที่ต้องล็อกอินเท่านั้น
 */
(function () {
'use strict';

/* ════════════════ ค่าคงที่ตามเกณฑ์ ════════════════ */
const ROLES = {
  trainer:    { name: 'ผู้ฝึก',              admin: true,  health: true,  punish: 12, priv: true },
  commander:  { name: 'ผบ.หน่วยฝึก',         admin: true,  health: true,  punish: 0,  priv: true },
  nco:        { name: 'ครูนายสิบ',            admin: false, health: true,  punish: 2,  priv: false },
  instructor: { name: 'ครูทหารใหม่',          admin: false, health: true,  punish: 0,  priv: false },
  medic:      { name: 'เสนารักษ์',            admin: false, health: true,  punish: 0,  priv: true },
  viewer:     { name: 'ผู้บังคับบัญชา (ดูอย่างเดียว)', admin: false, health: false, punish: 0, priv: false }
};
const RISK = {
  none:   { n: 'ไม่มีสี', lv: 0 },
  green:  { n: 'เขียว',  lv: 1 },
  yellow: { n: 'เหลือง', lv: 2 },
  red:    { n: 'แดง',    lv: 3 }
};
const LV_LABEL = ['ปกติ', 'เฝ้าระวัง', 'ลดการฝึก', 'งดฝึก'];
// รอบคัดกรองตามมาตรการ พบ. ผลัด 2/69: เช้า 05.00–08.00 · พักกลางวัน 12.00–13.00 · ก่อนนอน 18.00–19.00
const ALL_ROUNDS = ['0500', '1200', '1800'];
const ROUND_LABEL = { '0500': '05.00–08.00', '1200': '12.00–13.00', '1800': '18.00–19.00' };
const ROUND_END = { '0500': '0800', '1200': '1300', '1800': '1900' };
const HEAT_SLOTS = ['0800', '1000', '1300', '1500', '1700'];
const DORM_SLOTS = ['1900', '2100', '2200'];
const URINE = ['ใส', 'เหลืองอ่อน', 'เหลือง', 'เหลืองเข้ม', 'น้ำตาล'];
const FLAGS = [
  { k: 'white',  n: 'ธงขาว',  range: 'ต่ำกว่า 27', water: '½ ลิตร/ชม.', wr: 'ฝึก 50 / พัก 10 นาที', note: '' },
  { k: 'green',  n: 'ธงเขียว', range: '27–32',     water: '½ ลิตร/ชม.', wr: 'ฝึก 50 / พัก 10 นาที', note: '' },
  { k: 'yellow', n: 'ธงเหลือง', range: '33–39',    water: '1 ลิตร/ชม.', wr: 'ฝึก 45 / พัก 15 นาที', note: 'แต่งกายระบายความร้อน' },
  { k: 'red',    n: 'ธงแดง',  range: '40–51',     water: '1 ลิตร/ชม.', wr: 'ฝึก 30 / พัก 30 นาที', note: 'ควรงดฝึก · แต่งกายระบายความร้อน' },
  { k: 'black',  n: 'ธงดำ',   range: 'สูงกว่า 51', water: '1 ลิตร/ชม.', wr: 'ฝึก 20 / พัก 40 นาที', note: 'งดฝึก' }
];
const PUNISH_MOVES = ['ยกเข่าบิดลำตัว', 'นอนปั่นจักรยาน', 'Plank', 'Russian twist', 'Lunge', 'Side plank leg raise',
  'Jumping jack', 'Push up', 'Push up hand release', 'Spider man', 'Mountain climber', 'High knee'];
const RUN = 'วิ่งระยะสั้น';

/* ════════════════ ยูทิลิตี้ ════════════════ */
const TZ = 'Asia/Bangkok';
const $ = (s, el) => (el || document).querySelector(s);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayStr = () => new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
const nowHM = () => new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const hm = s => s ? s.slice(0, 2) + '.' + s.slice(2) : '';
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
function thaiDate(d, withDay) {
  if (!d) return '';
  const [y, m, dd] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, dd));
  return (withDay ? DAYS[dt.getUTCDay()] + ' ' : '') + dd + ' ' + MONTHS[m - 1] + ' ' + String((y + 543) % 100).padStart(2, '0');
}
function addDays(d, n) {
  const [y, m, dd] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, dd + n));
  return dt.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  const p = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(b) - p(a)) / 86400000);
}
function weekOf(date) {
  const st = S.settings.start;
  if (!st) return null;
  const d = daysBetween(st, date);
  return d < 0 ? 0 : Math.floor(d / 7) + 1;
}
function bmiOf(s) {
  const h = +s.h, w = +s.w;
  return h > 0 && w > 0 ? Math.round(w / ((h / 100) ** 2) * 10) / 10 : null;
}
const fullName = s => [s.rank, s.fname, s.lname].filter(Boolean).join(' ') + (s.nick ? ` (${s.nick})` : '');
const shortName = s => [s.fname, s.lname].filter(Boolean).join(' ') + (s.nick ? ` (${s.nick})` : '');
const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;

/* ดัชนีความร้อน (NOAA Rothfusz) รับ °C + ความชื้นสัมพัทธ์ % คืนค่า °C */
function heatIndexC(tc, rh) {
  if (tc == null || rh == null) return null;
  const T = tc * 9 / 5 + 32;
  let HI = 0.5 * (T + 61 + ((T - 68) * 1.2) + (rh * 0.094));
  if ((HI + T) / 2 >= 80) {
    HI = -42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh - 0.00683783 * T * T
      - 0.05481717 * rh * rh + 0.00122874 * T * T * rh + 0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh;
    if (rh < 13 && T >= 80 && T <= 112) HI -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    else if (rh > 85 && T >= 80 && T <= 87) HI += ((rh - 85) / 10) * ((87 - T) / 5);
  }
  return Math.round((HI - 32) * 5 / 9 * 10) / 10;
}
function flagOf(hi) {
  if (hi == null) return null;
  const v = Math.round(hi);
  if (v < 27) return FLAGS[0];
  if (v <= 32) return FLAGS[1];
  if (v <= 39) return FLAGS[2];
  if (v <= 51) return FLAGS[3];
  return FLAGS[4];
}
const slotHI = r => r ? (num(r.hiDirect) != null ? num(r.hiDirect) : heatIndexC(num(r.temp), num(r.rh))) : null;

/* ════════════════ ชั้นข้อมูล: โหมดทดลอง / Firebase ════════════════ */
// ข้อมูลแอปอยู่ใต้ app/ ใน Firebase (แยกจากข้อมูลระบบเดิมที่ระดับบนสุด) ส่วน users อยู่ระดับบนสุด
const fbPath = p => p.startsWith('users') ? p : 'app/' + p;
const Store = {
  mode: null, db: null, auth: null, tree: {}, subs: [],
  _node(path) { return path.split('/').filter(Boolean).reduce((n, k) => (n && typeof n === 'object') ? n[k] : undefined, this.tree); },
  _setNode(path, val) {
    const ks = path.split('/').filter(Boolean); let n = this.tree;
    for (let i = 0; i < ks.length - 1; i++) { if (!n[ks[i]] || typeof n[ks[i]] !== 'object') n[ks[i]] = {}; n = n[ks[i]]; }
    if (val === null || val === undefined) delete n[ks[ks.length - 1]]; else n[ks[ks.length - 1]] = JSON.parse(JSON.stringify(val));
  },
  _persist() { try { localStorage.setItem('carenst_demo', JSON.stringify(this.tree)); } catch (e) {} },
  _notify(path) {
    this.subs.forEach(s => { if (path.startsWith(s.path) || s.path.startsWith(path)) s.cb(clone(this._node(s.path))); });
  },
  on(path, cb) {
    if (this.mode === 'firebase') {
      const ref = this.db.ref(fbPath(path));
      const h = snap => cb(snap.val());
      ref.on('value', h, err => { console.warn(path, err); toast('อ่านข้อมูลไม่ได้: ' + path); });
      return () => ref.off('value', h);
    }
    const sub = { path, cb }; this.subs.push(sub);
    cb(clone(this._node(path)));
    return () => { this.subs = this.subs.filter(x => x !== sub); };
  },
  async set(path, val) {
    if (this.mode === 'firebase') return this.db.ref(fbPath(path)).set(val);
    this._setNode(path, val); this._persist(); this._notify(path);
  },
  async update(path, obj) {
    if (this.mode === 'firebase') return this.db.ref(fbPath(path)).update(obj);
    Object.keys(obj).forEach(k => this._setNode(path + '/' + k, obj[k])); this._persist(); this._notify(path);
  },
  async push(path, val) {
    if (this.mode === 'firebase') return this.db.ref(fbPath(path)).push(val);
    const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return this.set(path + '/' + id, val);
  }
};
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}

/* ════════════════ สถานะแอป ════════════════ */
const S = {
  me: null, settings: {}, soldiers: {}, priv: {}, reveal: {}, health: {}, heat: {}, dorm: {}, punish: {}, users: {}, hAll: {}, cases: {}, audit: {},
  date: todayStr(), view: 'dash', round: null, squad: 'all', q: '', loginTab: 'login',
  punishScope: 'day', drafts: {}, P: { sid: '', moves: [], minutes: '', reason: '', explained: false, individual: false, open: false }
};
let dateSubs = [], baseSubs = [];

function can(perm) { const r = ROLES[S.me && S.me.role]; return !!(r && r[perm]); }
function punishLimit() { const r = ROLES[S.me && S.me.role]; return r ? r.punish : 0; }
function rounds() { const r = (Array.isArray(S.settings.rounds) ? S.settings.rounds : []).filter(x => ALL_ROUNDS.includes(x)); return r.length ? r.slice().sort() : ALL_ROUNDS.slice(); }
const rl = r => ROUND_LABEL[r] || hm(r);
function soldierList() {
  return Object.entries(S.soldiers || {}).map(([id, s]) => Object.assign({ id }, s)).sort((a, b) => (+a.no || 0) - (+b.no || 0));
}
function squads() { return [...new Set(soldierList().map(s => s.squad).filter(v => v !== '' && v != null))].sort((a, b) => String(a).localeCompare(String(b), 'en', { numeric: true })); }

/* ── วันนี้ร้อนไหม (ใช้กับเกณฑ์ BMI ตลอด 8 สัปดาห์ของการฝึก ตามที่หน่วยกำหนด) ── */
const HOT_WEEKS = 8;
function hotInfo() {
  let maxHI = null, maxT = null, at = null;
  Object.entries(S.heat || {}).forEach(([slot, r]) => {
    const hi = slotHI(r); const t = num(r && r.temp);
    if (hi != null && (maxHI == null || hi > maxHI)) { maxHI = hi; at = slot; }
    if (t != null && (maxT == null || t > maxT)) maxT = t;
  });
  return { maxHI, maxT, at, hot: (maxHI != null && maxHI > 39) || (maxT != null && maxT > 37) };
}
function currentFlag() {
  const filled = HEAT_SLOTS.filter(k => slotHI(S.heat[k]) != null);
  if (!filled.length) return null;
  const k = filled[filled.length - 1];
  const hi = slotHI(S.heat[k]);
  return { slot: k, hi, flag: flagOf(hi) };
}

/* ── สถานะรายบุคคลของวันที่เลือก ── */
function statusOf(s) {
  let lv = (RISK[s.risk] || RISK.none).lv; const why = [];
  const rw = s.riskWhy ? ` (${s.riskWhy})` : '';
  if (s.risk === 'red') why.push('กลุ่มเสี่ยงสีแดง' + rw);
  else if (s.risk === 'yellow') why.push('กลุ่มเสี่ยงสีเหลือง' + rw);
  let away = false;
  rounds().forEach(rd => {
    const rec = S.health[rd] && S.health[rd][s.id]; if (!rec) return;
    if (rec.away) { away = true; return; }
    const t = num(rec.t), u = num(rec.u);
    if (t != null) {
      if (t > 37.2) { lv = 3; why.push(`ไข้ ${t}° (${rl(rd)}) งดฝึก นำส่ง รพ.`); }
      else if (t >= 36.8) { lv = Math.max(lv, 2); why.push(`${t}° (${rl(rd)}) ดื่มน้ำ เช็ดตัว วัดซ้ำ 30 นาที`); }
    }
    if (u != null) {
      if (u >= 4) { lv = 3; why.push(`ปัสสาวะสี 4 อันตราย (${rl(rd)}) งดฝึก พบแพทย์ทันที`); }
      else if (u === 3) { lv = 3; why.push(`ปัสสาวะสี 3 อันตราย (${rl(rd)}) งดฝึก ดื่มน้ำ แจ้งเสนารักษ์`); }
    }
  });
  const w = weekOf(S.date), b = bmiOf(s);
  if (w && w <= HOT_WEEKS && hotInfo().hot && ((b != null && b >= 30) || (+s.w >= 100))) {
    lv = 3; why.push('BMI ≥30 / น้ำหนัก ≥100 กก. ช่วงอากาศร้อน: งดฝึก งดซ่อมวินัย อาบน้ำเพิ่ม');
  }
  return { lv, why, away };
}

/* ════════════════ ไอคอน ════════════════ */
const I = {
  dash: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 9h8V3h-8z"/>',
  health: '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
  heat: '<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>',
  soldiers: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  punish: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  report: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  more: '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  ul: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  weekly: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'
};
const ic = (k, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
const NAV = [
  { k: 'dash', n: 'ภาพรวม' }, { k: 'health', n: 'สุขภาพ' }, { k: 'heat', n: 'ความร้อน' },
  { k: 'soldiers', n: 'ทหารใหม่' }, { k: 'weekly', n: 'สรุปสัปดาห์' }, { k: 'punish', n: 'บันทึกลงโทษ' }, { k: 'report', n: 'รายงาน' }, { k: 'settings', n: 'ตั้งค่า' }
];
const MOBILE_NAV = ['dash', 'health', 'heat', 'soldiers'];

/* ════════════════ การแสดงผลหลัก ════════════════ */
let renderQueued = false;
function scheduleRender() { if (renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); }); }

function render() {
  const root = $('#root');
  // เก็บตำแหน่ง focus เพื่อไม่ให้หลุดตอนข้อมูลจากเครื่องอื่นเข้ามา
  const ae = document.activeElement, fid = ae && ae.id, sel = (ae && 'selectionStart' in ae) ? [ae.selectionStart, ae.selectionEnd] : null;
  const sc = window.scrollY;
  if (!S.me) { root.innerHTML = S.authLoading ? '<div class="empty" style="padding-top:40vh">กำลังโหลด…</div>' : viewLogin(); return restore(); }
  if (!S.me.role || !ROLES[S.me.role]) { root.innerHTML = viewPending(); return restore(); }
  if (!pdpaAcked()) { root.innerHTML = viewPdpaAck(); return restore(); }

  const flag = currentFlag(); const w = weekOf(S.date);
  const alerts = soldierList().filter(s => statusOf(s).lv === 3).length;
  root.innerHTML = `
  <div class="app">
    <aside class="sidebar">
      <div class="brand"><img src="icon-192.png" alt=""><div><b>CARE-NST</b><div class="tiny muted">ระบบดูแลทหารใหม่</div></div></div>
      <nav>${NAV.map(n => `<button data-act="go" data-v="${n.k}" class="${S.view === n.k ? 'on' : ''}">${ic(n.k)}<span class="navbadge" ${n.k === 'dash' ? `data-n="${alerts}"` : ''}>${n.n}</span></button>`).join('')}</nav>
      <div class="side-foot">${esc(S.me.name || '')}<br>${esc(ROLES[S.me.role].name)}</div>
    </aside>
    <div class="main">
      ${Store.mode === 'demo' ? `<div class="demo-banner"><span class="db-t"><b>โหมดทดลอง</b> · ข้อมูลสมมติ เก็บในเครื่องนี้</span>
        <select class="input" data-act="demoRole" aria-label="ทดลองเป็นบทบาท" style="min-height:32px;padding:4px 8px;width:auto;margin-left:auto">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${S.me.role === k ? 'selected' : ''}>${r.name}</option>`).join('')}</select></div>` : ''}
      <header class="topbar">
        <div class="t-title">
          <div class="t-unit">${esc(S.settings.unit || 'หน่วยฝึกทหารใหม่')}</div>
          <div class="t-sub">ผลัด ${esc(S.settings.cohort || '-')}${w ? ' · สัปดาห์ที่ ' + w : (w === 0 ? ' · ก่อนเริ่มฝึก' : '')}</div>
        </div>
        ${flag ? `<span class="chip" title="ธงล่าสุด ${hm(flag.slot)} น."><i class="flagdot fl-${flag.flag.k}"></i>${flag.flag.n} ${flag.hi}</span>` : ''}
        <label class="chip" style="position:relative;cursor:pointer">${ic('cal', '').replace('<svg', '<svg width="14" height="14"')}${thaiDate(S.date, true)}
          <input type="date" id="topdate" data-act="date" value="${S.date}" style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-label="เลือกวันที่"></label>
      </header>
      <main class="content" id="view">${renderView()}</main>
    </div>
    <nav class="bottomnav">
      ${MOBILE_NAV.map(k => { const n = NAV.find(x => x.k === k); return `<button data-act="go" data-v="${k}" class="${S.view === k ? 'on' : ''}">${ic(k)}<span class="navbadge" ${k === 'dash' ? `data-n="${alerts}"` : ''}>${n.n}</span></button>`; }).join('')}
      <button data-act="more" class="${MOBILE_NAV.includes(S.view) ? '' : 'on'}">${ic('more')}<span>เพิ่มเติม</span></button>
    </nav>
  </div>${heatBanner()}${S.modal ? S.modal() : ''}${S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : ''}`;
  restore();

  function restore() {
    if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel && 'setSelectionRange' in el) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } } }
    window.scrollTo(0, sc);
  }
}

function renderView() {
  switch (S.view) {
    case 'health': return viewHealth();
    case 'heat': return viewHeat();
    case 'soldiers': return viewSoldiers();
    case 'punish': return viewPunish();
    case 'weekly': return viewWeekly();
    case 'report': return viewReport();
    case 'settings': return viewSettings();
    default: return viewDash();
  }
}

/* ════════════════ หน้า: ภาพรวม ════════════════ */
function viewDash() {
  const list = soldierList();
  if (!list.length) return `<div class="card empty"><h2>ยังไม่มีรายชื่อทหารใหม่</h2><p>${can('admin') ? 'เริ่มจากนำเข้ารายชื่อจาก Excel ที่หน้า "ทหารใหม่"' : 'รอผู้ฝึกนำเข้ารายชื่อ'}</p>${can('admin') ? '<button class="btn primary" data-act="go" data-v="soldiers">ไปหน้าทหารใหม่</button>' : ''}</div>`;
  const st = list.map(s => Object.assign({ s }, statusOf(s)));
  const c3 = st.filter(x => x.lv === 3), c2 = st.filter(x => x.lv === 2), away = st.filter(x => x.away);
  const rds = rounds();
  const doneBy = rd => list.filter(s => S.health[rd] && S.health[rd][s.id] && (S.health[rd][s.id].t != null || S.health[rd][s.id].away)).length;
  const flag = currentFlag(); const hot = hotInfo(); const w = weekOf(S.date);
  const pToday = Object.values(S.punish || {}).filter(p => p.date === S.date).length;
  const dormMax = Math.max(...DORM_SLOTS.map(k => slotHI(S.dorm[k])).filter(v => v != null), -Infinity);
  const nowS = nowHM().replace(':', '');
  const missing = S.date === todayStr() ? rds.filter(rd => (ROUND_END[rd] || rd) <= nowS && doneBy(rd) < list.length) : [];

  return `
  <div class="page-h"><div><h1>ภาพรวม ${thaiDate(S.date, true)}</h1><div class="muted small">${S.date === todayStr() ? 'วันนี้' : 'ดูย้อนหลัง'} · อัปเดตอัตโนมัติ</div></div><button class="btn" data-act="brief">สรุปเช้านี้</button></div>
  ${(() => { const B = briefData(); return `<div class="card" style="padding:12px 14px;margin-bottom:12px"><div class="row" style="gap:16px;flex-wrap:wrap"><span class="pill ${B.docs.length ? 'lv3' : 'lv1'}">พบแพทย์ ${B.docs.length}</span>${[3, 2, 1, 0].map(lv => `<span class="row" style="gap:6px;display:inline-flex"><i class="rdot rd-${LV_COLOR[lv].k}"></i>${LV_COLOR[lv].n} <b class="num">${B.groups[lv].length}</b></span>`).join('')}<span class="small muted">ไม่อยู่ ${B.away.length}</span></div></div>`; })()}
  ${S.date === todayStr() ? wxCard(true) : ''}
  ${can('admin') && sensitiveDue() && todayStr() >= sensitiveDue() && hasSensitive() ? `<div class="alert bad" style="margin-bottom:8px"><div><b>ครบกำหนดลบข้อมูลอ่อนไหวตาม PDPA (${thaiDate(sensitiveDue())})</b>ข้อมูลส่วนบุคคลและทะเบียนผู้ป่วยยังอยู่ในระบบ ${S.me.role === 'trainer' ? '<button class="btn sm danger" data-act="wipeSensitive" style="margin-left:6px">ลบตอนนี้</button>' : 'แจ้งผู้ฝึกให้ลบ'}</div></div>` : ''}
  ${missing.map(rd => `<div class="alert warn"><div><b>ยังกรอกสุขภาพรอบ ${rl(rd)} น. ไม่ครบ</b>กรอกแล้ว ${doneBy(rd)}/${list.length} นาย <button class="btn sm" data-act="goHealth" data-r="${rd}" style="margin-left:6px">ไปกรอก</button></div></div>`).join('')}
  ${hot.hot && w && w <= HOT_WEEKS ? `<div class="alert bad" style="margin-top:8px"><div><b>อากาศร้อนเกินเกณฑ์ (สัปดาห์ที่ ${w})</b>ดัชนีความร้อนสูงสุด ${hot.maxHI ?? '-'} / อุณหภูมิ ${hot.maxT ?? '-'}°C: ผู้ที่ BMI ≥30 หรือน้ำหนัก ≥100 กก. งดฝึก งดซ่อมวินัย อาบน้ำเพิ่มหลังอาหารกลางวันและก่อนออกกำลังกายเย็น</div></div>` : ''}
  <div class="grid g-stats" style="margin-top:12px">
    <div class="card stat"><div class="k">ยอดทหารใหม่</div><div class="v num">${list.length}</div><div class="s">${squads().length} หมู่ฝึก</div></div>
    <div class="card stat ${c3.length ? 'bad' : 'ok'}"><div class="k">งดฝึก</div><div class="v num">${c3.length}</div><div class="s">ห้ามลงโทษเด็ดขาด</div></div>
    <div class="card stat ${c2.length ? 'warn' : 'ok'}"><div class="k">ลดการฝึก/เฝ้าระวัง</div><div class="v num">${c2.length}</div><div class="s">ติดสีเหลือง</div></div>
    <div class="card stat"><div class="k">ไม่อยู่ (รพ./ลา)</div><div class="v num">${away.length}</div><div class="s">ตามที่บันทึก</div></div>
    <div class="card stat"><div class="k">ธงความร้อนล่าสุด</div><div class="v" style="font-size:20px;margin-top:8px">${flag ? `<span class="row" style="gap:8px"><i class="flagdot fl-${flag.flag.k}" style="width:18px;height:18px"></i>${flag.flag.n}</span>` : '<span class="muted">ยังไม่วัด</span>'}</div><div class="s">${flag ? `ดัชนี ${flag.hi} · ${hm(flag.slot)} น.` : ''}</div></div>
    <div class="card stat ${pToday ? 'warn' : ''}"><div class="k">บันทึกลงโทษวันนี้</div><div class="v num">${pToday}</div><div class="s">ครั้ง</div></div>
  </div>
  <div class="grid g-2" style="margin-top:12px">
    <div class="card">
      <div class="card-h"><h2>ต้องดูแลวันนี้</h2><span class="pill lv3">${c3.length} งดฝึก</span></div>
      ${c3.length + c2.length ? `<div class="alist">${c3.concat(c2).map(x => `<div class="aitem" data-act="soldier" data-id="${x.s.id}" style="cursor:pointer"><span class="pill lv${x.lv}">${LV_LABEL[x.lv]}</span><div style="min-width:0"><div><b>${esc(x.s.no)}.</b> ${esc(shortName(x.s))} <span class="muted small">หมู่ ${esc(x.s.squad)}</span></div><div class="why">${esc(x.why.join(' · '))}</div></div></div>`).join('')}</div>` : '<div class="empty">ไม่มีผู้ที่ต้องงด/ลดการฝึก</div>'}
    </div>
    <div class="card">
      <div class="card-h"><h2>ความคืบหน้าการกรอก</h2></div>
      ${rds.map(rd => { const d = doneBy(rd); return `<div style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><span>รอบ ${rl(rd)} น.</span><span class="num small muted">${d}/${list.length}</span></div><div class="progress"><i style="width:${list.length ? d / list.length * 100 : 0}%"></i></div></div>`; }).join('')}
      <hr class="sep">
      <dl class="kv">
        <dt>ดัชนีความร้อนสูงสุด</dt><dd>${hot.maxHI != null ? `${hot.maxHI} (${flagOf(hot.maxHI).n}) ${hm(hot.at)} น.` : '-'}</dd>
        <dt>โรงนอนสูงสุด</dt><dd>${isFinite(dormMax) ? `${dormMax}${dormMax > 33 ? ' <span class="pill lv3">เกิน 33</span>' : ''}` : '-'}</dd>
        <dt>กลุ่มเสี่ยงตั้งต้น</dt><dd>${['red', 'yellow', 'green'].map(k => `<span class="row" style="display:inline-flex;gap:4px;margin-right:10px"><i class="rdot rd-${k}"></i>${list.filter(s => s.risk === k).length}</span>`).join('')}</dd>
      </dl>
    </div>
  </div>`;
}

/* ════════════════ หน้า: สุขภาพประจำวัน ════════════════ */
function viewHealth() {
  const list = soldierList(); const rds = rounds();
  if (!S.round || !rds.includes(S.round)) {
    const n = nowHM().replace(':', ''); S.round = rds.filter(r => r <= n).pop() || rds[0];
  }
  const rd = S.round; const canEdit = can('health');
  const q = S.q.trim().toLowerCase();
  const shown = list.filter(s => (S.squad === 'all' || String(s.squad) === String(S.squad)) && (!q || (fullName(s) + ' ' + s.no).toLowerCase().includes(q)));
  const rec = id => (S.health[rd] && S.health[rd][id]) || {};
  const done = list.filter(s => rec(s.id).t != null || rec(s.id).away).length;
  return `
  <div class="page-h"><div><h1>สุขภาพประจำวัน</h1><div class="muted small">อุณหภูมิร่างกาย + สีปัสสาวะ · บันทึกทันทีที่กรอก</div></div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><div class="seg" role="tablist">${rds.map(r => `<button data-act="round" data-r="${r}" class="${r === rd ? 'on' : ''}">${rl(r)} น.</button>`).join('')}</div>
    ${canEdit ? `<button class="btn" data-act="omrPrintOpen">${ic('dl')}พิมพ์ใบบันทึก</button><label class="btn primary">${ic('ul')}ถ่ายรูปใบบันทึก<input type="file" accept="image/*" capture="environment" data-act="omrFile" hidden></label>` : ''}</div></div>
  <div class="card" style="padding:12px;margin-bottom:12px">
    <div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="small">กรอกแล้ว <b class="num">${done}/${list.length}</b> นาย</span><span class="tiny muted">36.8–37.2 = เหลือง วัดซ้ำใน 30 นาที · เกิน 37.2 = งดฝึก นำส่ง รพ. · ปัสสาวะ 3–4 = งดฝึก</span></div>
    <div class="progress"><i style="width:${list.length ? done / list.length * 100 : 0}%"></i></div>
    <div class="row" style="margin-top:10px">
      <div class="chips" style="flex:1">${['all'].concat(squads()).map(q => `<button class="fchip ${String(S.squad) === String(q) ? 'on' : ''}" data-act="squad" data-q="${esc(q)}">${q === 'all' ? 'ทุกหมู่' : 'หมู่ ' + esc(q)}</button>`).join('')}</div>
      <input class="input" id="hsearch" data-act="search" placeholder="ค้นหาชื่อ/ลำดับ" value="${esc(S.q)}" style="max-width:220px">
    </div>
  </div>
  ${!canEdit ? '<div class="alert info" style="margin-bottom:12px"><div>บทบาทนี้ดูได้อย่างเดียว</div></div>' : ''}
  <div class="hlist">
    ${shown.map(s => {
      const r = rec(s.id); const st = statusOf(s); const tid = `t-${s.id}`;
      const tv = S.drafts[tid] != null ? S.drafts[tid] : (r.t != null ? r.t : '');
      return `<div class="hrow ${st.lv >= 2 ? 'lv' + st.lv : ''}">
        <div class="who"><span class="no">${esc(s.no)}</span><i class="rdot rd-${esc(s.risk || 'none')}" title="กลุ่มเสี่ยง ${RISK[s.risk || 'none'].n}"></i>
          <div style="min-width:0"><div class="nm">${esc(shortName(s))}</div><div class="tiny muted">หมู่ ${esc(s.squad)}${st.why.length ? ' · ' + esc(st.why[st.why.length - 1]) : ''}</div></div></div>
        <div class="ctrls">
          ${r.away ? '<span class="pill lv0">ไม่อยู่</span>' : `<input class="input tin" id="${tid}" data-act="temp" data-id="${s.id}" inputmode="decimal" placeholder="°C" value="${esc(tv)}" ${canEdit ? '' : 'disabled'} aria-label="อุณหภูมิ ${esc(shortName(s))}">
          <div class="urine" role="group" aria-label="สีปัสสาวะ">${URINE.map((u, i) => `<button class="u${i} ${num(r.u) === i ? 'on' : ''}" data-act="urine" data-id="${s.id}" data-u="${i}" title="${u}" ${canEdit ? '' : 'disabled'}>${i}</button>`).join('')}</div>`}
        </div>
        <div class="row" style="justify-content:flex-end;gap:6px"><span class="pill lv${st.lv}">${LV_LABEL[st.lv]}</span>${canEdit ? `<button class="btn sm ${r.doc ? 'danger' : ''}" data-act="doc" data-id="${s.id}" aria-pressed="${r.doc ? 'true' : 'false'}">${r.doc ? '✓ พบแพทย์' : 'พบแพทย์'}</button><button class="btn sm" data-act="away" data-id="${s.id}">${r.away ? 'กลับมาแล้ว' : 'ไม่อยู่'}</button>` : ''}</div>
      </div>`;
    }).join('') || '<div class="card empty">ไม่พบรายชื่อ</div>'}
  </div>
  <p class="tiny muted" style="margin-top:12px">สีปัสสาวะ 0–2 ปกติ · <b>3–4 อันตราย</b> ระบบติดป้ายงดฝึกให้อัตโนมัติ (4 = พบแพทย์ทันที)</p>`;
}

/* ════════════════ หน้า: ดัชนีความร้อน ════════════════ */
function viewHeat() {
  const canEdit = can('health'); const flag = currentFlag();
  const slotCard = (kind, k) => {
    const r = (kind === 'heat' ? S.heat : S.dorm)[k] || {}; const hi = slotHI(r); const f = flagOf(hi);
    const dv = (f2) => { const id = `${kind}-${k}-${f2}`; return S.drafts[id] != null ? S.drafts[id] : (r[f2] != null ? r[f2] : ''); };
    const res = hi == null ? '<span class="muted">ยังไม่บันทึก</span>' : kind === 'heat'
      ? `<span class="row" style="gap:6px"><i class="flagdot fl-${f.k}"></i><b>${f.n}</b> ดัชนี ${hi}</span>`
      : `<b>ดัชนี ${hi}</b> ${hi > 33 ? '<span class="pill lv3">เกิน 33 ต้องระบายอากาศ</span>' : '<span class="pill lv1">ไม่เกิน 33</span>'}`;
    return `<div class="slot"><div class="sh"><span>${hm(k)} น.</span>${r.byName ? `<span class="tiny muted">${esc(r.byName)}</span>` : ''}</div>
      <div class="sv">
        <div class="field"><label for="${kind}-${k}-temp">อุณหภูมิ °C</label><input class="input num" id="${kind}-${k}-temp" data-act="heatIn" data-kind="${kind}" data-k="${k}" data-f="temp" inputmode="decimal" value="${esc(dv('temp'))}" ${canEdit ? '' : 'disabled'}></div>
        <div class="field"><label for="${kind}-${k}-rh">ความชื้น %</label><input class="input num" id="${kind}-${k}-rh" data-act="heatIn" data-kind="${kind}" data-k="${k}" data-f="rh" inputmode="decimal" value="${esc(dv('rh'))}" ${canEdit ? '' : 'disabled'}></div>
      </div>
      <div class="field" style="margin-top:8px"><label for="${kind}-${k}-hiDirect">หรือค่าดัชนีจากเครื่องวัด</label><input class="input num" id="${kind}-${k}-hiDirect" data-act="heatIn" data-kind="${kind}" data-k="${k}" data-f="hiDirect" inputmode="decimal" value="${esc(dv('hiDirect'))}" ${canEdit ? '' : 'disabled'}></div>
      <div class="res">${res}</div></div>`;
  };
  return `
  <div class="page-h"><div><h1>ดัชนีความร้อน</h1><div class="muted small">วัด 08.00 10.00 13.00 15.00 17.00 น. · คำนวณดัชนีจากอุณหภูมิ + ความชื้นให้อัตโนมัติ</div></div></div>
  ${wxCard(false)}
  ${flag ? `<div class="flagbox card" style="margin-bottom:12px"><i class="fl fl-${flag.flag.k}"></i><div><div class="small muted">ธงปัจจุบัน (${hm(flag.slot)} น.) ดัชนี ${flag.hi}</div><h2>${flag.flag.n}</h2>
    <div class="small">ดื่มน้ำ ${flag.flag.water} · ${flag.flag.wr}${flag.flag.note ? ' · <b>' + flag.flag.note + '</b>' : ''}</div></div></div>` : ''}
  <h2 style="margin:6px 0 10px">สนามฝึก</h2>
  <div class="slots">${HEAT_SLOTS.map(k => slotCard('heat', k)).join('')}</div>
  <h2 style="margin:20px 0 4px">โรงนอน</h2><p class="small muted" style="margin:0 0 10px">วัด 19.00 21.00 22.00 น. ไม่ควรเกิน 33 · นอนไม่น้อยกว่า 8 ชม.</p>
  <div class="slots">${DORM_SLOTS.map(k => slotCard('dorm', k)).join('')}</div>
  <div class="card" style="margin-top:16px"><h2 style="margin-bottom:8px">ตารางธงสี (คำแนะนำการฝึกทหารใหม่ ปีงบ 70)</h2>
    <div style="overflow-x:auto"><table class="ftable"><thead><tr><th>ธง</th><th>ดัชนีความร้อน</th><th>ดื่มน้ำ</th><th>ฝึก/พัก</th><th>หมายเหตุ</th></tr></thead>
    <tbody>${FLAGS.map(f => `<tr><td><span class="row" style="gap:6px"><i class="flagdot fl-${f.k}"></i>${f.n}</span></td><td>${f.range}</td><td>${f.water}</td><td>${f.wr}</td><td>${f.note || '-'}</td></tr>`).join('')}</tbody></table></div>
    <p class="tiny muted" style="margin:8px 0 0">ตลอด 8 สัปดาห์ของการฝึก ถ้าอุณหภูมิเกิน 37°C หรือดัชนีเกิน 39 ผู้ที่ BMI ≥30 / น้ำหนัก ≥100 กก. งดฝึก ระบบจะติดป้ายให้อัตโนมัติ</p></div>`;
}

/* ════════════════ ดัชนีความร้อนออนไลน์ (Open-Meteo · ค่าอ้างอิง ไม่ใช่ค่าวัดจริงที่สนามฝึก) ════════════════ */
const WX_DEF = { lat: 13.566, lon: 99.759, name: 'ค่ายบุรฉัตร จ.ราชบุรี' };
const FLAG_RANK = { white: 0, green: 1, yellow: 2, red: 3, black: 4 };
function wxLoc() { const st = S.settings || {}; return { lat: +st.wxLat || WX_DEF.lat, lon: +st.wxLon || WX_DEF.lon, name: st.wxName || WX_DEF.name }; }
function wxPack(t, rh) { const hi = heatIndexC(t, rh); const f = flagOf(hi); return { t, rh, hi, fk: f ? f.k : null }; }
const wxFlag = x => x && x.fk ? FLAGS.find(f => f.k === x.fk) : null;
async function fetchWx(force) {
  if (S._wxBusy) return; const L = wxLoc(); const now = Date.now();
  if (!force && S.wx && S.wx.cur && now - S.wx.at < 15 * 60000 && S.wx.lat === L.lat && S.wx.lon === L.lon) return;
  S._wxBusy = true;
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lon}&current=temperature_2m,relative_humidity_2m&hourly=temperature_2m,relative_humidity_2m&timezone=Asia%2FBangkok&forecast_days=2`;
    const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const cur = Object.assign({ time: j.current.time }, wxPack(j.current.temperature_2m, j.current.relative_humidity_2m));
    const hours = j.hourly.time.map((tm, i) => Object.assign({ time: tm }, wxPack(j.hourly.temperature_2m[i], j.hourly.relative_humidity_2m[i])));
    S.wx = { at: now, lat: L.lat, lon: L.lon, cur, hours, err: null };
    localSet('carenst_wx', JSON.stringify(S.wx));
    checkWxAlert();
  } catch (e) { S.wx = Object.assign({}, S.wx || {}, { err: String(e.message || e), errAt: now }); }
  finally { S._wxBusy = false; scheduleRender(); }
}
function wxToday() {
  const W = S.wx; if (!W || !W.hours) return null;
  const d = todayStr(); const H = W.hours.filter(h => h.time.slice(0, 10) === d && +h.time.slice(11, 13) >= 6 && +h.time.slice(11, 13) <= 18);
  if (!H.length) return null;
  const peak = H.reduce((a, b) => (b.hi > a.hi ? b : a), H[0]);
  const ranges = k => { const out = []; let st = null, prev = null; H.forEach(h => { const on = FLAG_RANK[h.fk] >= FLAG_RANK[k]; if (on && st == null) st = h; if (!on && st) { out.push([st.time.slice(11, 13), prev.time.slice(11, 13)]); st = null; } prev = h; }); if (st) out.push([st.time.slice(11, 13), prev.time.slice(11, 13)]); return out; };
  const fmt = rs => rs.map(([a, b]) => a === b ? `${+a}.00 น.` : `${+a}.00–${+b + 1}.00 น.`).join(', ');
  return { H, peak, red: fmt(ranges('red')), yellow: fmt(ranges('yellow')) };
}
function wxCard(compact) {
  const W = S.wx; const L = wxLoc();
  if (!W || !W.cur) return `<div class="card wx" style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><b>ดัชนีความร้อนออนไลน์ · ${esc(L.name)}</b><button class="btn sm" data-act="wxRefresh">${W && W.err ? 'ลองใหม่' : 'โหลด'}</button></div><div class="small muted">${W && W.err ? 'ดึงข้อมูลไม่ได้ (' + esc(W.err) + ') · ตรวจสัญญาณอินเทอร์เน็ต' : 'กำลังดึงข้อมูล…'}</div></div>`;
  const f = wxFlag(W.cur); const T = wxToday(); const m = S.date === todayStr() ? currentFlag() : null;
  const upd = new Date(W.at).toLocaleTimeString('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const nowH = nowHM().replace(':', ''); const inHours = nowH >= '0700' && nowH <= '1800';
  const stale = !m || (+nowH.slice(0, 2) * 60 + +nowH.slice(2)) - (+m.slot.slice(0, 2) * 60 + +m.slot.slice(2)) > 120;
  const higher = m && f && FLAG_RANK[f.k] > FLAG_RANK[m.flag.k];
  const warn = inHours && f && FLAG_RANK[f.k] >= 2 && (higher || stale);
  const strip = T ? `<div class="wxstrip">${T.H.map(h => { const hf = wxFlag(h); return `<div class="wxh ${h.time.slice(11, 13) === nowH.slice(0, 2) ? 'now' : ''}" title="${+h.time.slice(11, 13)}.00 น. · ${h.t}°C ${h.rh}% · ดัชนี ${h.hi}"><i class="fl-${hf ? hf.k : 'white'}"></i><span>${+h.time.slice(11, 13)}</span><b>${Math.round(h.hi)}</b></div>`; }).join('')}</div>` : '';
  return `<div class="card wx" style="margin-bottom:12px">
    <div class="row" style="justify-content:space-between;gap:8px;align-items:flex-start"><div><b>ดัชนีความร้อนออนไลน์ · ${esc(L.name)}</b><div class="tiny muted">อัปเดต ${upd} น. · Open-Meteo · ค่าอ้างอิงของพื้นที่ ไม่ใช่ค่าวัดที่สนามฝึก</div></div><button class="btn sm" data-act="wxRefresh" ${S._wxBusy ? 'disabled' : ''}>รีเฟรช</button></div>
    <div class="row" style="gap:14px;margin:10px 0 6px;flex-wrap:wrap">
      <span class="row" style="gap:8px"><i class="fl fl-${f ? f.k : 'white'}" style="width:34px;height:24px;border-radius:4px;border:1px solid rgba(0,0,0,.25)"></i><span><b style="font-size:18px">${f ? f.n : '-'}</b> <span class="muted">ดัชนี ${W.cur.hi}</span></span></span>
      <span class="small muted">${W.cur.t}°C · ความชื้น ${W.cur.rh}%</span>
      ${m ? `<span class="small">วัดจริง ${hm(m.slot)} น.: <b>${m.flag.n}</b> ${m.hi}</span>` : '<span class="small muted">วันนี้ยังไม่ได้วัดที่สนาม</span>'}
    </div>
    ${warn ? `<div class="alert ${FLAG_RANK[f.k] >= 3 ? 'bad' : 'warn'}" style="margin:6px 0"><div class="small"><b>${higher ? 'ค่าออนไลน์สูงกว่าค่าวัดล่าสุด' : 'ยังไม่มีค่าวัดในช่วง 2 ชม.'}</b>ให้ครูวัดที่สนามฝึกเพื่อยืนยันธงตอนนี้</div></div>` : ''}
    ${T ? `<div class="small" style="margin:6px 0">${T.red ? `<b style="color:var(--bad)">คาดธงแดงขึ้นไป: ${T.red}</b> · ` : ''}${T.yellow && !compact ? `ธงเหลืองขึ้นไป: ${T.yellow} · ` : ''}สูงสุดวันนี้ดัชนี ${T.peak.hi} (${+T.peak.time.slice(11, 13)}.00 น.)</div>` : ''}
    ${strip}
  </div>`;
}
function checkWxAlert() {
  if (S.date !== todayStr() || !S.wx || !S.wx.cur) return;
  const nowH = nowHM().replace(':', ''); if (nowH < '0600' || nowH > '1800') return;
  const T = wxToday(); const curF = wxFlag(S.wx.cur);
  const next = T ? T.H.filter(h => h.time.slice(11, 13) > nowH.slice(0, 2)).slice(0, 2) : [];
  const nf = next.reduce((a, h) => (FLAG_RANK[h.fk] > FLAG_RANK[a ? a.fk : 'white'] ? h : a), null);
  const key = 'carenst_wxflag_' + todayStr(); const seen = localGet(key) || 'white';
  const cand = [];
  if (curF && FLAG_RANK[curF.k] >= 2) cand.push({ f: curF, hi: S.wx.cur.hi, when: 'ตอนนี้', slot: nowH });
  if (nf && FLAG_RANK[nf.fk] >= 3) cand.push({ f: wxFlag(nf), hi: nf.hi, when: `คาด ${+nf.time.slice(11, 13)}.00 น.`, slot: nf.time.slice(11, 13) + '00' });
  const top = cand.sort((a, b) => FLAG_RANK[b.f.k] - FLAG_RANK[a.f.k])[0];
  if (!top || FLAG_RANK[top.f.k] <= FLAG_RANK[seen]) return;
  const m = currentFlag(); if (m && FLAG_RANK[m.flag.k] >= FLAG_RANK[top.f.k]) return;
  localSet(key, top.f.k);
  S.heatAlert = { flag: top.f, hi: top.hi, slot: top.slot, prev: m ? m.flag : null, online: top.when };
  notifyDevice(`ออนไลน์: ${top.f.n} (${top.when})`, `ดัชนี ${top.hi} · ให้วัดที่สนามฝึกยืนยัน · ดื่มน้ำ ${top.f.water} · ${top.f.wr}`);
  scheduleRender();
}

/* ════════════════ หน้า: ทะเบียนทหารใหม่ ════════════════ */
function viewSoldiers() {
  const list = soldierList(); const q = S.q.trim().toLowerCase();
  const shown = list.filter(s => (S.squad === 'all' || String(s.squad) === String(S.squad)) && (!q || (fullName(s) + ' ' + s.no).toLowerCase().includes(q)));
  const admin = can('admin');
  return `
  <div class="page-h"><div><h1>ทหารใหม่</h1><div class="muted small">${list.length} นาย · ${squads().length} หมู่ฝึก</div></div>
    ${admin ? `<div class="row"><button class="btn" data-act="tpl">${ic('dl')}แบบฟอร์ม Excel</button>
      <label class="btn primary">${ic('ul')}นำเข้าข้อมูลแรกรับ (กองพล)<input type="file" accept=".csv,.xlsx,.xls" data-act="intake" hidden></label>
      <label class="btn">${ic('ul')}จัดลำดับตามบัญชีหน่วย<input type="file" accept=".xlsx,.xls,.csv" data-act="ordFile" hidden></label>
      <label class="btn">${ic('ul')}นำเข้า Excel<input type="file" accept=".xlsx,.xls,.csv" data-act="import" hidden></label>
      <button class="btn" data-act="addSoldier">${ic('plus')}เพิ่ม</button></div>` : ''}</div>
  <div class="row" style="margin-bottom:12px">
    <div class="chips" style="flex:1">${['all'].concat(squads()).map(x => `<button class="fchip ${String(S.squad) === String(x) ? 'on' : ''}" data-act="squad" data-q="${esc(x)}">${x === 'all' ? 'ทุกหมู่' : 'หมู่ ' + esc(x)}</button>`).join('')}</div>
    <input class="input" id="ssearch" data-act="search" placeholder="ค้นหาชื่อ/ลำดับ" value="${esc(S.q)}" style="max-width:220px">
  </div>
  ${!list.length ? `<div class="card empty">ยังไม่มีรายชื่อ${admin ? ' — ดาวน์โหลดแบบฟอร์ม กรอก แล้วกด "นำเข้า Excel"' : ''}</div>` : `
  <div class="tbl-wrap only-d"><table class="tbl"><thead><tr><th>ลำดับ</th><th>ยศ ชื่อ สกุล</th><th>หมู่</th><th>อายุ</th><th>BMI</th><th>กลุ่มเสี่ยง</th><th>บัดดี้</th><th>วันนี้</th></tr></thead><tbody>
  ${shown.map(s => { const st = statusOf(s); const b = bmiOf(s); return `<tr class="click" data-act="soldier" data-id="${s.id}"><td class="num">${esc(s.no)}</td><td>${esc(fullName(s))}</td><td>${esc(s.squad)}</td><td class="num">${esc(s.age || '-')}</td><td class="num">${b != null ? b : '-'}${b > 30 ? ' <span class="pill lv2">>30</span>' : ''}</td><td><span class="row" style="gap:6px"><i class="rdot rd-${esc(s.risk || 'none')}"></i>${RISK[s.risk || 'none'].n}</span></td><td>${esc(s.buddy || '-')}</td><td><span class="pill lv${st.lv}">${st.away ? 'ไม่อยู่' : LV_LABEL[st.lv]}</span></td></tr>`; }).join('')}
  </tbody></table></div>
  <div class="cards-m only-m">${shown.map(s => { const st = statusOf(s); return `<div class="aitem" data-act="soldier" data-id="${s.id}" style="cursor:pointer"><span class="no num" style="font-weight:700;color:var(--muted);min-width:26px">${esc(s.no)}</span><i class="rdot rd-${esc(s.risk || 'none')}"></i><div style="flex:1;min-width:0"><div style="font-weight:600">${esc(shortName(s))}</div><div class="tiny muted">หมู่ ${esc(s.squad)} · อายุ ${esc(s.age || '-')} · BMI ${bmiOf(s) ?? '-'}</div></div><span class="pill lv${st.lv}">${st.away ? 'ไม่อยู่' : LV_LABEL[st.lv]}</span></div>`; }).join('')}</div>`}`;
}

function privBlock(id) {
  const p = S.priv[id] || {}; const show = !!S.reveal[id];
  const mask = v => !v ? '-' : (show ? esc(v) : esc(String(v).replace(/.(?=.{4})/g, '•')));
  const row = (k, v) => `<dt>${k}</dt><dd style="font-weight:500;white-space:pre-wrap">${v}</dd>`;
  return `<div class="field full"><div class="alert info" style="display:block"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>ข้อมูลส่วนบุคคล</b><span class="row tiny muted">เห็นเฉพาะผู้ฝึก ผบ.หน่วยฝึก เสนารักษ์ <button type="button" class="btn sm" data-act="reveal" data-id="${id}">${show ? 'ซ่อน' : 'แสดงทั้งหมด'}</button></span></div>
    ${Object.keys(p).length ? `<dl class="kv">${row('เลขบัตรประชาชน', mask(p.cid))}${row('เบอร์โทร', mask(p.phone))}${row('ที่อยู่', show ? esc(p.addr || '-') : (p.addr ? '••••' : '-'))}${row('โรคประจำตัว', show ? esc(p.disease || '-') : (p.disease ? '••••' : '-'))}${row('ประวัติแพ้', show ? esc(p.allergy || '-') : (p.allergy ? '••••' : '-'))}${row('สารเสพติด', show ? esc([p.drug, p.urine && 'ผลปัสสาวะ: ' + p.urine].filter(Boolean).join(' · ') || '-') : '••••')}${row('สุขภาพจิต', show ? esc([p.psych, p.dep].filter(Boolean).join(' · ') || '-') : '••••')}</dl>` : '<div class="small muted">ยังไม่มีข้อมูล นำเข้าจากระบบกองพลเพื่อเติม</div>'}
  </div></div>`;
}
function soldierModal(id) {
  const s = id ? Object.assign({ id }, S.soldiers[id]) : { no: (Math.max(0, ...soldierList().map(x => +x.no || 0)) + 1), rank: 'พลฯ', risk: 'none' };
  const admin = can('admin');
  const st = id ? statusOf(s) : null;
  S.modal = () => `<div class="ov" data-act="closeOv"><div class="sheet" role="dialog" aria-modal="true" aria-label="ข้อมูลทหารใหม่">
    <div class="sheet-h"><h2>${id ? esc(fullName(s)) : 'เพิ่มทหารใหม่'}</h2><button class="x" data-act="close" aria-label="ปิด">×</button></div>
    ${st ? `<div class="alert ${st.lv === 3 ? 'bad' : st.lv === 2 ? 'warn' : 'ok'}" style="margin-bottom:12px"><div><b>วันนี้: ${LV_LABEL[st.lv]}</b>${esc(st.why.join(' · ') || 'ไม่มีข้อสังเกต')}</div></div>
      <div class="small muted" style="margin-bottom:12px">${rounds().map(rd => { const r = (S.health[rd] || {})[id] || {}; return `${rl(rd)} น.: ${r.away ? 'ไม่อยู่' : (r.t != null ? r.t + '°' : '-') + ' / ปัสสาวะ ' + (r.u != null ? r.u : '-')}`; }).join(' · ')}</div>` : ''}
    <form data-act="saveSoldier" data-id="${id || ''}">
      <div class="form-grid cols-4">
        <div class="field"><label>ลำดับ</label><input class="input" name="no" inputmode="numeric" value="${esc(s.no)}" required ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>ยศ</label><input class="input" name="rank" value="${esc(s.rank || '')}" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>ชื่อ</label><input class="input" name="fname" value="${esc(s.fname || '')}" required ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>สกุล</label><input class="input" name="lname" value="${esc(s.lname || '')}" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>ชื่อเล่น</label><input class="input" name="nick" value="${esc(s.nick || '')}" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>หมู่ฝึก</label><input class="input" name="squad" inputmode="numeric" value="${esc(s.squad || '')}" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>อายุ</label><input class="input" name="age" inputmode="numeric" value="${esc(s.age || '')}" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>บัดดี้ (กลุ่ม)</label><input class="input" name="buddy" value="${esc(s.buddy || '')}" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>ส่วนสูง ซม.</label><input class="input" name="h" inputmode="decimal" value="${esc(s.h || '')}" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>น้ำหนัก กก.</label><input class="input" name="w" inputmode="decimal" value="${esc(s.w || '')}" ${admin ? '' : 'disabled'}></div>
        <div class="field full"><label>กลุ่มเสี่ยงจากการคัดกรองแรกรับ</label>
          <div class="seg">${Object.entries(RISK).map(([k, r]) => `<button type="button" data-act="riskPick" data-k="${k}" class="${(s.risk || 'none') === k ? 'on' : ''}" ${admin ? '' : 'disabled'}>${r.n}</button>`).join('')}</div>
          <input type="hidden" name="risk" value="${esc(s.risk || 'none')}">${s.riskWhy ? `<div class="tiny muted">เหตุผล: ${esc(s.riskWhy)}</div>` : ''}</div>
        <div class="field full"><label>หมายเหตุ</label><input class="input" name="note" value="${esc(s.note || '')}" ${admin ? '' : 'disabled'}></div>
        ${id && can('priv') ? privBlock(id) : ''}
      </div>
      ${admin ? `<div class="row" style="margin-top:16px;justify-content:space-between">${id ? `<button type="button" class="btn danger" data-act="delSoldier" data-id="${id}">ลบ</button>` : '<span></span>'}<button class="btn primary" type="submit">บันทึก</button></div>` : ''}
    </form></div></div>`;
  scheduleRender();
}

/* ════════════════ หน้า: บันทึกการลงโทษ ════════════════ */
function punishCheck() {
  const P = S.P; const lim = punishLimit(); const errs = [];
  if (!lim) errs.push(S.me.role === 'instructor' ? 'ครูทหารใหม่ไม่มีอำนาจลงโทษ' : `บทบาท ${ROLES[S.me.role].name} ไม่มีอำนาจลงโทษ (ผู้สั่งได้ = ผู้ฝึก หรือครูนายสิบที่เป็น ผบ.หมู่ฝึก)`);
  if (S.date !== todayStr()) errs.push('บันทึกได้เฉพาะวันนี้ (เปลี่ยนวันที่ด้านบนกลับเป็นวันนี้)');
  if (nowHM() >= '18:00') errs.push('ห้ามลงโทษ/ออกกำลังกายหลัง 18.00 น.');
  const s = P.sid && S.soldiers[P.sid] ? Object.assign({ id: P.sid }, S.soldiers[P.sid]) : null;
  if (!s) errs.push('เลือกทหารใหม่ (ลงโทษรายบุคคลเท่านั้น)');
  else { const st = statusOf(s); if (st.lv === 3) errs.push(`${shortName(s)} อยู่ในกลุ่มงดฝึก/สีแดง ห้ามลงโทษเด็ดขาด`); if (st.away) errs.push('ทหารนายนี้บันทึกว่าไม่อยู่'); }
  const runOnly = P.moves.length === 1 && P.moves[0] === RUN;
  if (!P.moves.length) errs.push('เลือกท่า');
  if (P.moves.includes(RUN) && P.moves.length > 1) errs.push('วิ่งระยะสั้นใช้แทนท่ากายบริหาร เลือกอย่างใดอย่างหนึ่ง');
  if (lim && !runOnly && P.moves.length > lim) errs.push(`เกินจำนวนท่าที่ ${ROLES[S.me.role].name} สั่งได้ (ไม่เกิน ${lim} ท่า)`);
  const m = num(P.minutes);
  if (m == null || m <= 0) errs.push('ระบุเวลารวม (นาที)');
  else if (lim && m > lim) errs.push(`เวลารวมเกิน ${lim} นาที`);
  if (!P.reason || P.reason.trim().length < 5) errs.push('ระบุความผิดที่ชี้แจงให้ทราบ');
  if (!P.explained) errs.push('ยืนยันว่าชี้แจงความผิดก่อนลงโทษแล้ว');
  if (!P.individual) errs.push('ยืนยันว่าไม่ลงโทษรวม ไม่แตะเนื้อต้องตัว ไม่ทำให้อับอาย');
  if (!P.open) errs.push('ยืนยันว่าสถานที่เปิดเผย/มีกล้อง CCTV และผู้สั่งอยู่ควบคุมตลอด');
  return errs;
}
function viewPunish() {
  const lim = punishLimit(); const P = S.P; const list = soldierList();
  const errs = punishCheck();
  const logs = Object.entries(S.punish || {}).map(([id, p]) => Object.assign({ id }, p))
    .filter(p => S.punishScope === 'all' || p.date === S.date).sort((a, b) => (b.at || 0) - (a.at || 0));
  const moves = lim >= 12 ? PUNISH_MOVES.concat([RUN]) : PUNISH_MOVES;
  return `
  <div class="page-h"><div><h1>บันทึกการลงโทษ</h1><div class="muted small">ตามวิทยุ ยศ.ทบ. กห 0461/834 · แก้ไข/ลบได้เฉพาะผู้ฝึก และเก็บประวัติการแก้ไขทุกครั้ง</div></div></div>
  <div class="grid g-2">
    <div class="card">
      <h2 style="margin-bottom:10px">บันทึกใหม่</h2>
      <div class="alert info" style="margin-bottom:12px"><div class="small"><b>อำนาจของคุณ: ${esc(ROLES[S.me.role].name)}</b>${lim ? `สั่งได้ไม่เกิน ${lim} ท่า รวม ${lim} นาที${lim >= 12 ? ' หรือวิ่งระยะสั้น' : ''} (ทำ 50 วินาที พัก 10 วินาที ต่อนาที)` : 'ไม่มีอำนาจลงโทษ'}</div></div>
      ${lim ? `
      <div class="field"><label for="p-sid">ทหารใหม่</label><select class="input" id="p-sid" data-act="pSet" data-f="sid"><option value="">— เลือก —</option>${list.map(s => { const st = statusOf(s); return `<option value="${s.id}" ${P.sid === s.id ? 'selected' : ''} ${st.lv === 3 ? 'disabled' : ''}>${esc(s.no)}. ${esc(shortName(s))} · หมู่ ${esc(s.squad)}${st.lv === 3 ? ' (งดฝึก ห้ามลงโทษ)' : ''}</option>`; }).join('')}</select></div>
      <div class="field" style="margin-top:12px"><label>ท่า (${P.moves.length} ท่า)</label>
        <div class="chips" style="flex-wrap:wrap">${moves.map(mv => `<button type="button" class="fchip ${P.moves.includes(mv) ? 'on' : ''}" data-act="pMove" data-m="${esc(mv)}">${esc(mv)}</button>`).join('')}</div></div>
      <div class="form-grid" style="margin-top:12px">
        <div class="field"><label for="p-min">เวลารวม (นาที)</label><input class="input" id="p-min" data-act="pSet" data-f="minutes" inputmode="decimal" value="${esc(P.minutes)}"></div>
        <div class="field"><label>เวลาบันทึก</label><input class="input" value="${nowHM()} น." disabled></div>
        <div class="field full"><label for="p-reason">ความผิดที่ชี้แจงให้ทราบ</label><input class="input" id="p-reason" data-act="pSet" data-f="reason" value="${esc(P.reason)}"></div>
      </div>
      <label class="check"><input type="checkbox" data-act="pChk" data-f="explained" ${P.explained ? 'checked' : ''}><span>ชี้แจงความผิดให้ทหารใหม่ทราบก่อนลงโทษแล้ว</span></label>
      <label class="check"><input type="checkbox" data-act="pChk" data-f="individual" ${P.individual ? 'checked' : ''}><span>ลงโทษรายบุคคล ไม่ลงโทษรวม ไม่แตะเนื้อต้องตัว ไม่ทำให้อับอาย</span></label>
      <label class="check"><input type="checkbox" data-act="pChk" data-f="open" ${P.open ? 'checked' : ''}><span>สถานที่เปิดเผย/มีกล้อง CCTV และผู้สั่งอยู่ควบคุมตลอด</span></label>
      ${errs.length ? `<div class="alert warn" style="margin-top:8px"><div class="small"><b>ยังบันทึกไม่ได้</b><ul class="rules">${errs.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div></div>` : '<div class="alert ok" style="margin-top:8px"><div class="small"><b>ผ่านเกณฑ์ทุกข้อ</b>พร้อมบันทึก</div></div>'}
      <button class="btn primary" style="width:100%;margin-top:12px" data-act="pSave" ${errs.length ? 'disabled' : ''}>บันทึกการลงโทษ</button>` : '<div class="empty">บทบาทนี้ไม่มีอำนาจลงโทษ ดูบันทึกได้อย่างเดียว</div>'}
    </div>
    <div class="card">
      <div class="card-h"><h2>บันทึก</h2><div class="seg"><button data-act="pScope" data-s="day" class="${S.punishScope === 'day' ? 'on' : ''}">${thaiDate(S.date)}</button><button data-act="pScope" data-s="all" class="${S.punishScope === 'all' ? 'on' : ''}">ทั้งหมด</button></div></div>
      ${logs.length ? `<div class="alist">${logs.map(p => `<div class="aitem" style="align-items:flex-start"><div style="min-width:0;flex:1"><div><b>${esc(p.sname)}</b> <span class="tiny muted">${thaiDate(p.date)} ${esc(p.time)} น.</span>${p.editedAt ? ' <span class="pill lv2">แก้ไขแล้ว</span>' : ''}</div>
        <div class="small">${esc((p.moves || []).join(', '))} · ${esc(p.minutes)} นาที</div><div class="tiny muted">ความผิด: ${esc(p.reason)} · ผู้สั่ง ${esc(p.byName)} (${esc((ROLES[p.role] || {}).name || p.role)})</div>${p.editedAt ? `<div class="tiny muted">แก้ไขล่าสุดโดย ${esc(p.editedByName || '-')} · ${new Date(p.editedAt).toLocaleString('th-TH', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' })}${p.hist ? ` · ประวัติ ${Object.keys(p.hist).length} ครั้ง` : ''}</div>` : ''}</div>${S.me.role === 'trainer' ? `<div class="row" style="gap:6px;flex:0 0 auto"><button class="btn sm" data-act="pEdit" data-id="${p.id}">แก้ไข</button><button class="btn sm danger" data-act="pDel" data-id="${p.id}">ลบ</button></div>` : ''}</div>`).join('')}</div>` : '<div class="empty">ไม่มีบันทึก</div>'}
    </div>
  </div>`;
}

function punishEditModal(id) {
  const p = S.punish[id]; if (!p) return;
  S.pe = { id, moves: (p.moves || []).slice(), minutes: p.minutes, reason: p.reason || '' };
  S.modal = () => { const E = S.pe; if (!E) return ''; const moves = PUNISH_MOVES.concat([RUN]); const hist = Object.values(p.hist || {}).sort((a, b) => b.at - a.at);
    return `<div class="ov" data-act="closeOv"><div class="sheet" role="dialog" aria-modal="true" aria-label="แก้ไขบันทึกลงโทษ">
    <div class="sheet-h"><div><h2>แก้ไขบันทึกลงโทษ</h2><div class="tiny muted">${esc(p.sname)} · ${thaiDate(p.date)} ${esc(p.time)} น. · ผู้สั่ง ${esc(p.byName)}</div></div><button class="x" data-act="close" aria-label="ปิด">×</button></div>
    <div class="field"><label>ท่า (${E.moves.length} ท่า)</label><div class="chips" style="flex-wrap:wrap">${moves.map(mv => `<button type="button" class="fchip ${E.moves.includes(mv) ? 'on' : ''}" data-act="peMove" data-m="${esc(mv)}">${esc(mv)}</button>`).join('')}</div></div>
    <div class="form-grid" style="margin-top:12px">
      <div class="field"><label for="pe-min">เวลารวม (นาที)</label><input class="input" id="pe-min" data-act="peSet" data-f="minutes" inputmode="decimal" value="${esc(E.minutes)}"></div>
      <div class="field full"><label for="pe-reason">ความผิด</label><input class="input" id="pe-reason" data-act="peSet" data-f="reason" value="${esc(E.reason)}"></div>
    </div>
    ${hist.length ? `<div class="small muted" style="margin-top:12px"><b>ประวัติการแก้ไข</b>${hist.map(h => `<div>${new Date(h.at).toLocaleString('th-TH', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' })} · ${esc(h.byName)} · เดิม: ${esc((h.moves || []).join(', '))} ${esc(h.minutes)} นาที · ${esc(h.reason)}</div>`).join('')}</div>` : ''}
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-act="close">ยกเลิก</button><button class="btn primary" data-act="peSave">บันทึกการแก้ไข</button></div>
  </div></div>`; };
  scheduleRender();
}
/* ════════════════ หน้า: รายงานประจำวัน ════════════════ */
function reportText() {
  const list = soldierList(); const st = list.map(s => Object.assign({ s }, statusOf(s)));
  const c3 = st.filter(x => x.lv === 3), c2 = st.filter(x => x.lv === 2), away = st.filter(x => x.away);
  let fever = 0, low = 0, u3 = 0, brown = 0;
  rounds().forEach(rd => Object.values(S.health[rd] || {}).forEach(r => { const t = num(r.t); if (t != null) { if (t > 37.2) fever++; else if (t >= 36.8) low++; } const u = num(r.u); if (u === 3) u3++; if (u >= 4) brown++; }));
  const hot = hotInfo(); const dmax = Math.max(...DORM_SLOTS.map(k => slotHI(S.dorm[k])).filter(v => v != null), -Infinity);
  const pun = Object.values(S.punish || {}).filter(p => p.date === S.date);
  const w = weekOf(S.date); const L = [];
  L.push(`รายงานประจำวัน ${thaiDate(S.date, true)}`);
  L.push(`${S.settings.unit || 'หน่วยฝึกทหารใหม่'} ผลัด ${S.settings.cohort || '-'}${w ? ' สัปดาห์ที่ ' + w : ''}`);
  L.push(`ยอดทหารใหม่ ${list.length} นาย · ไม่อยู่ ${away.length} นาย`);
  L.push(`งดฝึก ${c3.length} นาย${c3.length ? ':' : ''}`);
  c3.forEach(x => L.push(`  - ${x.s.no}. ${shortName(x.s)} หมู่ ${x.s.squad}: ${x.why.join(' / ')}`));
  L.push(`ลดการฝึก/เฝ้าระวัง ${c2.length} นาย`);
  L.push(`วัดไข้: เกิน 37.2 = ${fever} ครั้ง · 36.8–37.2 = ${low} ครั้ง · ปัสสาวะสี 3 = ${u3} ครั้ง · สี 4 = ${brown} ครั้ง`);
  L.push(`กลุ่มเสี่ยงตั้งต้น: แดง ${list.filter(s => s.risk === 'red').length} · เหลือง ${list.filter(s => s.risk === 'yellow').length} · เขียว ${list.filter(s => s.risk === 'green').length}`);
  L.push(`ดัชนีความร้อนสูงสุด: ${hot.maxHI != null ? `${hot.maxHI} (${flagOf(hot.maxHI).n}) เวลา ${hm(hot.at)} น.` : 'ไม่ได้บันทึก'}`);
  L.push(`โรงนอนสูงสุด: ${isFinite(dmax) ? dmax + (dmax > 33 ? ' (เกิน 33)' : '') : 'ไม่ได้บันทึก'}`);
  L.push(`การลงโทษ: ${pun.length} ครั้ง`);
  L.push(`การกรอกสุขภาพ: ${rounds().map(rd => `${rl(rd)} น. ${list.filter(s => S.health[rd] && S.health[rd][s.id]).length}/${list.length}`).join(' · ')}`);
  return L.join('\n');
}
function viewReport() {
  return `
  <div class="page-h"><div><h1>รายงานประจำวัน</h1><div class="muted small">สรุปตัวเลขสำหรับรายงานหน่วยเหนือ/กรอกศูนย์ CCIR (ส่งก่อน 15.00 น.)</div></div>
    <div class="row"><button class="btn" data-act="copyReport">${ic('copy')}คัดลอกข้อความ</button><button class="btn primary" data-act="xlsReport">${ic('dl')}ส่งออก Excel</button></div></div>
  <div class="card"><pre class="report">${esc(reportText())}</pre></div>
  <p class="tiny muted">หัวข้อ CCIR ของ ยศ.ทบ. มี 21 รายการ ตรวจว่าตัวเลขในรายงานนี้ครอบคลุมหัวข้อที่กองพลใช้ ถ้าต้องการให้เรียงตามฟอร์มจริง ส่งฟอร์มมาเพื่อปรับได้</p>`;
}

/* ════════════════ PDPA: ข้อตกลงผู้ใช้ · บันทึกการเข้าถึง · ระยะเก็บรักษา ════════════════ */
// อ้างอิง พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562: เก็บเท่าที่จำเป็นตามวัตถุประสงค์ จำกัดผู้เข้าถึง มีบันทึกการเข้าถึง และลบเมื่อพ้นระยะเวลาเก็บ
const PDPA_FOOT = '— ข้อมูลส่วนบุคคล ใช้ภายในสายการบังคับบัญชาเท่านั้น ห้ามส่งต่อ (PDPA)';
const PDPA_GROUPS = [
  { k: 'cid', n: 'เลขบัตรประชาชน', f: ['cid'] }, { k: 'contact', n: 'เบอร์โทร/ที่อยู่', f: ['phone', 'addr'] },
  { k: 'health', n: 'โรคประจำตัว', f: ['disease'] }, { k: 'allergy', n: 'ประวัติแพ้ยา/อาหาร/แมลง', f: ['allergy'] }, { k: 'drug', n: 'ประวัติสารเสพติด', f: ['drug', 'urine'] }, { k: 'psych', n: 'สุขภาพจิต', f: ['psych', 'dep'] }
];
function trainEnd() { const st = S.settings; return st.end || (st.start ? addDays(st.start, 55) : null); }
function retainDays() { const n = +S.settings.retain; return n > 0 ? n : 30; }
function sensitiveDue() { const e = trainEnd(); return e ? addDays(e, retainDays()) : null; }
function hasSensitive() { return Object.keys(S.priv || {}).length > 0 || Object.keys(S.cases || {}).length > 0; }
function audit(act, sid, note) {
  if (!S.me) return;
  Store.push('audit', { uid: S.me.uid, name: S.me.name || '', role: S.me.role || '', act, sid: sid || null, note: note || null, at: Date.now() }).catch(() => {});
}
function pdpaAcked() { return Store.mode === 'demo' ? !!localGet('carenst_pdpa_demo') : !!S.me.pdpaAt; }
function viewPdpaAck() {
  return `<div class="login-wrap" style="padding:0 16px"><div class="card" style="max-width:620px;margin:6vh auto">
    <h1 style="margin-bottom:6px">ข้อตกลงการใช้ข้อมูลส่วนบุคคล (PDPA)</h1>
    <p class="small muted" style="margin-top:0">อ่านและยอมรับก่อนเข้าใช้งานครั้งแรก · บทบาทของคุณ: ${esc(ROLES[S.me.role].name)}</p>
    <ol class="small" style="line-height:1.7;padding-left:20px">
      <li>ข้อมูลในระบบใช้เพื่อ<b>ดูแลสุขภาพและความปลอดภัยของทหารใหม่ระหว่างการฝึก</b>เท่านั้น ห้ามใช้เพื่อวัตถุประสงค์อื่น</li>
      <li>ห้ามถ่ายภาพหน้าจอ คัดลอก หรือส่งต่อข้อมูลรายบุคคลออกนอกสายการบังคับบัญชาและผู้ที่เกี่ยวข้องกับการรักษา</li>
      <li>ข้อมูลอ่อนไหว (โรค สารเสพติด สุขภาพจิต เลขบัตร ที่อยู่ ทะเบียนผู้ป่วย) เห็นเฉพาะผู้ฝึก ผบ.หน่วยฝึก และเสนารักษ์ และ<b>ทุกครั้งที่เปิดดูจะถูกบันทึก</b></li>
      <li>ห้ามใช้บัญชีร่วมกับผู้อื่น เมื่อพ้นหน้าที่ ผู้ฝึกจะยกเลิกสิทธิ์</li>
      <li>หากพบข้อมูลรั่วไหลหรือเข้าถึงโดยไม่ได้รับอนุญาต ให้แจ้งผู้ฝึกทันที</li>
    </ol>
    <label class="check" style="margin:10px 0"><input type="checkbox" id="pdpa-ok" data-act="pdpaTick" ${S.pdpaTick ? 'checked' : ''}><span>ข้าพเจ้าได้อ่านและยอมปฏิบัติตามข้อตกลงนี้</span></label>
    <div class="row" style="justify-content:space-between">${Store.mode === 'firebase' ? '<button class="btn" data-act="logout">ออกจากระบบ</button>' : '<span></span>'}<button class="btn primary" data-act="pdpaAccept" ${S.pdpaTick ? '' : 'disabled'}>ยอมรับและเข้าใช้งาน</button></div>
  </div></div>`;
}
function recruitNotice() {
  const due = sensitiveDue();
  return [`ประกาศการเก็บและใช้ข้อมูลส่วนบุคคลของทหารใหม่ · ${S.settings.unit || 'หน่วยฝึกทหารใหม่'} ผลัด ${S.settings.cohort || '-'}`,
    '1. วัตถุประสงค์: ดูแลสุขภาพ ป้องกันการบาดเจ็บและโรคลมร้อน และความปลอดภัยระหว่างการฝึก',
    '2. ข้อมูลที่เก็บ: ชื่อ อายุ ส่วนสูง น้ำหนัก ผลคัดกรองสุขภาพแรกรับ อุณหภูมิและสีปัสสาวะรายวัน การเจ็บป่วยและการรักษา และข้อมูลติดต่อที่จำเป็น',
    '3. ผู้เข้าถึง: ครูฝึกเห็นเฉพาะข้อมูลที่ใช้ในการฝึก ข้อมูลสุขภาพละเอียดและข้อมูลติดต่อเห็นเฉพาะผู้ฝึก ผบ.หน่วยฝึก และเสนารักษ์ และมีบันทึกการเข้าถึงทุกครั้ง',
    `4. ระยะเวลาเก็บ: ข้อมูลอ่อนไหวจะถูกลบ${due ? 'ภายใน ' + thaiDate(due) : ' ' + retainDays() + ' วันหลังจบการฝึก'} ส่วนข้อมูลสรุปที่ไม่ระบุตัวบุคคลอาจเก็บไว้เพื่อปรับปรุงการฝึก`,
    '5. ไม่เปิดเผยแก่บุคคลภายนอก เว้นแต่เพื่อการรักษาพยาบาลหรือตามที่กฎหมายกำหนด',
    `6. สิทธิของท่าน: ขอดู ขอแก้ไขข้อมูลที่ไม่ถูกต้อง หรือสอบถามได้ที่ ${S.settings.dpo || 'ผู้ฝึก/ผบ.หน่วยฝึก'}`].join('\n');
}
function pdpaCard() {
  const admin = can('admin'); const due = sensitiveDue(); const st = S.settings;
  const logs = Object.values(S.audit || {}).sort((a, b) => b.at - a.at).slice(0, 60);
  return `<div class="card" style="margin-top:12px">
    <div class="card-h"><h2>การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</h2><button class="btn sm" data-act="copyNotice">${ic('copy')}คัดลอกประกาศแจ้งทหารใหม่</button></div>
    <div class="grid g-2">
      <dl class="kv">
        <dt>วัตถุประสงค์</dt><dd>ดูแลสุขภาพและความปลอดภัยระหว่างฝึก</dd>
        <dt>ข้อมูลทั่วไป</dt><dd>ทุกบทบาทเห็น: ชื่อ หมู่ ส่วนสูง น้ำหนัก สีกลุ่มเสี่ยง อุณหภูมิ ปัสสาวะ</dd>
        <dt>ข้อมูลอ่อนไหว</dt><dd>ผู้ฝึก ผบ.หน่วยฝึก เสนารักษ์: โรค สารเสพติด สุขภาพจิต เลขบัตร ที่อยู่ ทะเบียนผู้ป่วย · ซ่อนไว้จนกดแสดง</dd>
        <dt>บันทึกการเข้าถึง</dt><dd>ทุกครั้งที่เปิดดูข้อมูลอ่อนไหว นำเข้า ส่งออก หรือลบ</dd>
        <dt>ครบกำหนดลบ</dt><dd>${due ? `${thaiDate(due)} (จบฝึก ${thaiDate(trainEnd())} + ${retainDays()} วัน)` : 'ตั้งวันเริ่มฝึกก่อน'}</dd>
        <dt>ติดต่อเรื่องข้อมูล</dt><dd>${esc(st.dpo || 'ยังไม่ระบุ')}</dd>
      </dl>
      <div>
        ${S.me.role === 'trainer' ? `<div class="alert ${due && todayStr() >= due && hasSensitive() ? 'bad' : 'info'}" style="display:block"><b>ลบข้อมูลอ่อนไหว</b><div class="small" style="margin:4px 0 8px">ลบข้อมูลส่วนบุคคล (เลขบัตร ที่อยู่ โรค สารเสพติด สุขภาพจิต) และทะเบียนผู้ป่วยทั้งหมด · รายชื่อ สุขภาพรายวัน และสถิติยังอยู่ · กู้คืนไม่ได้</div><button class="btn danger sm" data-act="wipeSensitive">ลบข้อมูลอ่อนไหวทั้งหมด</button></div>` : ''}
      </div>
    </div>
    ${admin ? `<h3 style="margin:14px 0 8px">บันทึกการเข้าถึงข้อมูลล่าสุด</h3>
    ${logs.length ? `<div class="tbl-wrap" style="max-height:320px;overflow:auto"><table class="tbl"><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th><th>ทหารใหม่</th></tr></thead><tbody>
      ${logs.map(l => `<tr><td>${new Date(l.at).toLocaleString('th-TH', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' })}</td><td>${esc(l.name)} <span class="tiny muted">${esc((ROLES[l.role] || {}).name || '')}</span></td><td>${esc(l.act)}${l.note ? ` <span class="tiny muted">${esc(l.note)}</span>` : ''}</td><td>${l.sid ? esc(sname(l.sid)) : '-'}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">ยังไม่มีบันทึก</div>'}` : ''}
  </div>`;
}

/* ════════════════ หน้า: สรุปรายสัปดาห์ + ทะเบียนผู้ป่วย ════════════════ */
// ทะเบียนผู้ป่วยเก็บที่ cases/ (เห็นเฉพาะผู้ฝึก ผบ.หน่วยฝึก เสนารักษ์) ส่วนการนับวันป่วยใช้ข้อมูลสุขภาพที่ทุกบทบาทเห็นอยู่แล้ว
const CASE_SENT = ['เสนารักษ์', 'ห้องพยาบาลหน่วย', 'รพ.ค่าย', 'รพ.อื่น'];
const CASE_ST = {
  open: { n: 'กำลังรักษา', lv: 3 }, rest: { n: 'พักฟื้น', lv: 2 }, admit: { n: 'นอน รพ.', lv: 3 }, recovered: { n: 'หายแล้ว', lv: 1 }
};
const DAY_K = {
  sick: { n: 'ป่วย/พบแพทย์', c: 'var(--f-red)' }, dehy: { n: 'ปัสสาวะ 3–4', c: '#b8892b' }, warn: { n: '36.8–37.2°', c: 'var(--f-yellow)' },
  ok: { n: 'ปกติ', c: 'var(--f-green)' }, away: { n: 'ไม่อยู่', c: 'var(--info)' }, none: { n: 'ไม่มีข้อมูล', c: 'var(--line)' }
};
function ensureAllHealth() {
  if (S._allSub) return;
  S._allSub = Store.on('health', v => { S.hAll = v || {}; scheduleRender(); });
  baseSubs.push(S._allSub);
}
function weekRange() {
  const st = S.settings.start; const wNow = weekOf(S.date);
  if (st && wNow) {
    const w = S.wk || wNow; const from = addDays(st, (w - 1) * 7);
    return { w, from, days: [0, 1, 2, 3, 4, 5, 6].map(i => addDays(from, i)), max: Math.max(wNow, weekOf(todayStr()) || 1) };
  }
  return { w: null, from: addDays(S.date, -6), days: [6, 5, 4, 3, 2, 1, 0].map(i => addDays(S.date, -i)), max: 0 };
}
function caseList() { return Object.entries(S.cases || {}).map(([id, c]) => Object.assign({ id }, c)); }
function caseOn(sid, d) {
  return caseList().find(c => c.sid === sid && c.start <= d && (c.end ? d <= c.end : d <= todayStr()) && !(c.status === 'recovered' && c.end && d > c.end));
}
function dayInfo(sid, d) {
  const day = (S.hAll || {})[d] || {}; let maxT = null, maxU = null, doc = false, away = false, any = false;
  Object.values(day).forEach(rd => {
    const r = rd && rd[sid]; if (!r) return; any = true;
    if (r.away) away = true; if (r.doc) doc = true;
    const t = num(r.t), u = num(r.u);
    if (t != null && (maxT == null || t > maxT)) maxT = t;
    if (u != null && (maxU == null || u > maxU)) maxU = u;
  });
  const cs = can('priv') ? caseOn(sid, d) : null;
  let k = 'none';
  if (any) k = 'ok';
  if (maxT != null && maxT >= 36.8) k = 'warn';
  if (maxU != null && maxU >= 3) k = 'dehy';
  if (doc || (maxT != null && maxT > 37.2)) k = 'sick';
  if (cs && cs.status !== 'recovered' && k !== 'sick') k = cs.status === 'admit' ? 'away' : 'sick';
  if (away && k !== 'sick') k = 'away';
  return { k, maxT, maxU, doc, cs };
}
// จัดลำดับความเสี่ยงสัปดาห์ถัดไปจากข้อมูลจริงของสัปดาห์นี้ (ไม่ใช่การวินิจฉัย)
function weekScore(s, days) {
  const past = days.filter(d => d <= todayStr());
  const D = past.map(d => Object.assign({ d }, dayInfo(s.id, d)));
  let sc = 0; const why = [];
  const sick = D.filter(x => x.k === 'sick').length, dehy = D.filter(x => x.k === 'dehy').length, warn = D.filter(x => x.k === 'warn').length;
  let ep = 0; D.forEach((x, i) => { if (x.k === 'sick' && (i === 0 || D[i - 1].k !== 'sick')) ep++; });
  if (sick) { sc += sick * 3; why.push(`ป่วย ${sick} วัน`); }
  if (ep >= 2) { sc += 3; why.push(`ป่วยซ้ำ ${ep} ครั้ง`); }
  if (dehy) { sc += dehy * 2; why.push(`ปัสสาวะสี 3–4 ${dehy} วัน (ขาดน้ำ)`); }
  if (warn) { sc += warn; why.push(`อุณหภูมิ 36.8–37.2° ${warn} วัน`); }
  const T = D.filter(x => x.maxT != null).map(x => x.maxT);
  if (T.length >= 4) {
    const a = T.slice(0, T.length - 3), b = T.slice(-3), avg = v => v.reduce((p, c) => p + c, 0) / v.length;
    if (avg(b) - avg(a) >= 0.3 && T[T.length - 1] >= 36.8 && T[T.length - 1] >= T[T.length - 2]) { sc += 2; why.push('อุณหภูมิมีแนวโน้มสูงขึ้น'); }
  }
  const last = D[D.length - 1];
  if (last && (last.k === 'sick' || last.k === 'dehy')) { sc += 3; why.push(last.k === 'sick' ? 'วันล่าสุดยังไม่หาย' : 'วันล่าสุดปัสสาวะยังเข้ม'); }
  else if (D.slice(-3).some(x => x.k === 'sick')) { sc += 2; why.push('เพิ่งหายไม่เกิน 3 วัน'); }
  if (s.risk === 'red') { sc += 3; why.push('กลุ่มเสี่ยงแรกรับสีแดง'); }
  else if (s.risk === 'yellow') { sc += 2; why.push('กลุ่มเสี่ยงแรกรับสีเหลือง'); }
  else if (s.risk === 'green') { sc += 1; why.push('กลุ่มสีเขียว (สารเสพติด)'); }
  const b = bmiOf(s); const nextW = (weekOf(days[6]) || 0) + 1;
  if (((b != null && b >= 30) || +s.w >= 100) && nextW <= HOT_WEEKS) { sc += 2; why.push('BMI ≥30/น้ำหนัก ≥100 กก. (เสี่ยงลมร้อน)'); }
  const level = sc >= 8 ? 3 : sc >= 4 ? 2 : sc > 0 ? 1 : 0;
  return { sc, why, level, D, sick, ep };
}
function weekData() {
  const R = weekRange(); const list = soldierList();
  const rows = list.map(s => Object.assign({ s }, weekScore(s, R.days))).sort((a, b) => b.sc - a.sc || (+a.s.no) - (+b.s.no));
  const daily = R.days.map((d, i) => {
    if (d > todayStr()) return { d, future: true };
    const sickIds = list.filter(s => dayInfo(s.id, d).k === 'sick').map(s => s.id);
    const prev = i ? R.days[i - 1] : addDays(d, -1);
    const prevIds = list.filter(s => dayInfo(s.id, prev).k === 'sick').map(s => s.id);
    return {
      d, sick: sickIds.length, neu: sickIds.filter(x => !prevIds.includes(x)), cont: sickIds.filter(x => prevIds.includes(x)),
      rec: prevIds.filter(x => !sickIds.includes(x)),
      dehy: list.filter(s => dayInfo(s.id, d).k === 'dehy').length, away: list.filter(s => dayInfo(s.id, d).k === 'away').length
    };
  });
  const inWeek = c => c.start <= R.days[6] && (!c.end || c.end >= R.days[0]);
  const cases = can('priv') ? caseList().filter(inWeek).sort((a, b) => (a.status === 'recovered') - (b.status === 'recovered') || (a.start < b.start ? 1 : -1)) : [];
  return { R, rows, daily, cases };
}
const sname = id => { const s = S.soldiers[id]; return s ? `${s.no}. ${shortName(s)}` : '-'; };
function viewWeekly() {
  ensureAllHealth();
  const list = soldierList();
  if (!list.length) return '<div class="card empty"><h2>ยังไม่มีรายชื่อทหารใหม่</h2></div>';
  const W = weekData(); const R = W.R; const priv = can('priv');
  const hi = W.rows.filter(x => x.level === 3), mid = W.rows.filter(x => x.level === 2), low = W.rows.filter(x => x.level === 1);
  const maxSick = Math.max(1, ...W.daily.map(x => x.sick || 0));
  const strip = x => `<div class="dstrip" aria-label="7 วัน">${R.days.map((d, i) => { const D = x.D[i]; const k = D ? D.k : 'none'; return `<i style="background:${DAY_K[k].c}" title="${thaiDate(d, true)}: ${DAY_K[k].n}${D && D.maxT != null ? ' · ' + D.maxT + '°' : ''}${D && D.maxU != null ? ' · ปัสสาวะ ' + D.maxU : ''}">${D && D.maxT != null && D.maxT >= 36.8 ? D.maxT.toFixed(1) : ''}</i>`; }).join('')}</div>`;
  const row = x => `<div class="aitem wrow" style="align-items:flex-start"><div style="flex:1;min-width:0" data-act="soldier" data-id="${x.s.id}" role="button" tabindex="0">
      <div class="row" style="justify-content:space-between;gap:8px"><div><b>${esc(x.s.no)}.</b> ${esc(shortName(x.s))} <span class="muted small">หมู่ ${esc(x.s.squad)}</span></div><span class="pill lv${x.level}">คะแนน ${x.sc}</span></div>
      ${strip(x)}<div class="why">${esc(x.why.join(' · ') || 'ไม่มีข้อสังเกต')}</div></div>
      ${priv && x.sick && !caseList().some(c => c.sid === x.s.id && c.status !== 'recovered') ? `<button class="btn sm" data-act="caseNew" data-sid="${x.s.id}">เปิดเคส</button>` : ''}</div>`;
  const recovered = W.cases.filter(c => c.status === 'recovered' && c.end && c.end >= R.days[0] && c.end <= R.days[6]);
  return `
  <div class="page-h"><div><h1>สรุปรายสัปดาห์</h1><div class="muted small">${R.w ? `สัปดาห์ที่ ${R.w} · ` : '7 วันล่าสุด · '}${thaiDate(R.days[0])} – ${thaiDate(R.days[6])} · ใช้จัดลำดับว่าสัปดาห์หน้าต้องดูแลใครเป็นพิเศษ</div></div>
    <div class="row"><button class="btn" data-act="copyWeek">${ic('copy')}คัดลอกส่งไลน์</button>${priv ? `<button class="btn primary" data-act="caseNew">${ic('plus')}เปิดเคสผู้ป่วย</button>` : ''}</div></div>
  ${R.max ? `<div class="chips" style="margin-bottom:12px">${Array.from({ length: Math.min(R.max, 8) }, (_, i) => i + 1).map(w => `<button class="fchip ${w === R.w ? 'on' : ''}" data-act="wk" data-w="${w}">สัปดาห์ ${w}</button>`).join('')}</div>` : '<p class="small muted">ตั้ง "วันเริ่มฝึก" ในหน้าตั้งค่า เพื่อสรุปตามสัปดาห์การฝึก</p>'}
  <div class="grid g-stats">
    <div class="card stat ${hi.length ? 'bad' : 'ok'}"><div class="k">ต้องดูแลพิเศษ</div><div class="v num">${hi.length}</div><div class="s">คะแนน 8 ขึ้นไป</div></div>
    <div class="card stat ${mid.length ? 'warn' : 'ok'}"><div class="k">เฝ้าระวัง</div><div class="v num">${mid.length}</div><div class="s">คะแนน 4–7</div></div>
    <div class="card stat"><div class="k">ป่วยสะสมในสัปดาห์</div><div class="v num">${W.rows.filter(x => x.sick).length}</div><div class="s">นาย · รวม ${W.rows.reduce((a, x) => a + x.sick, 0)} วัน-คน</div></div>
    ${priv ? `<div class="card stat"><div class="k">หายแล้วสัปดาห์นี้</div><div class="v num">${recovered.length}</div><div class="s">ตามทะเบียนผู้ป่วย</div></div>` : ''}
  </div>
  <div class="card" style="margin-top:12px">
    <div class="card-h"><h2>ยอดป่วยรายวัน · เทียบวันก่อนหน้า</h2><span class="small muted">ป่วย = ไข้เกิน 37.2° หรือส่งพบแพทย์${priv ? ' หรือมีเคสที่ยังไม่หาย' : ''}</span></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>วัน</th><th>ป่วย</th><th></th><th>รายใหม่</th><th>ป่วยต่อ</th><th>หายแล้ว</th><th>ปัสสาวะ 3–4</th><th>ไม่อยู่</th></tr></thead><tbody>
    ${W.daily.map(x => x.future ? `<tr><td>${thaiDate(x.d, true)}</td><td colspan="7" class="muted">ยังไม่ถึง</td></tr>` : `<tr><td>${thaiDate(x.d, true)}</td><td class="num"><b>${x.sick}</b></td><td style="width:30%"><div class="progress bad"><i style="width:${x.sick / maxSick * 100}%"></i></div></td>
      <td title="${esc(x.neu.map(sname).join(', '))}">${x.neu.length ? `<span class="pill lv3">+${x.neu.length}</span>` : '0'}</td><td>${x.cont.length}</td>
      <td title="${esc(x.rec.map(sname).join(', '))}">${x.rec.length ? `<span class="pill lv1">${x.rec.length}</span>` : '0'}</td><td>${x.dehy}</td><td>${x.away}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="tiny muted" style="margin:8px 0 0">แตะค้าง/ชี้ที่ตัวเลข "รายใหม่" หรือ "หายแล้ว" เพื่อดูชื่อ</p>
  </div>
  <div class="card" style="margin-top:12px">
    <div class="card-h"><h2>พยากรณ์สัปดาห์หน้า · ต้องดูแลใครเป็นพิเศษ</h2><span class="small muted">เรียงจากคะแนนมากไปน้อย</span></div>
    <div class="legend small muted">${Object.entries(DAY_K).map(([k, v]) => `<span><i style="background:${v.c}"></i>${v.n}</span>`).join('')}</div>
    ${hi.length ? `<h3 class="wh bad">ต้องดูแลพิเศษ (${hi.length})</h3><div class="alist">${hi.map(row).join('')}</div>` : ''}
    ${mid.length ? `<h3 class="wh warn">เฝ้าระวัง (${mid.length})</h3><div class="alist">${mid.map(row).join('')}</div>` : ''}
    ${!hi.length && !mid.length ? '<div class="empty">ไม่มีผู้ที่ต้องดูแลพิเศษในสัปดาห์นี้</div>' : ''}
    ${low.length ? `<details style="margin-top:10px"><summary class="small">มีข้อสังเกตเล็กน้อย (${low.length})</summary><div class="alist" style="margin-top:8px">${low.map(row).join('')}</div></details>` : ''}
    <p class="tiny muted" style="margin:12px 0 0">วิธีคิดคะแนน: ป่วย 3/วัน · ป่วยซ้ำ +3 · ปัสสาวะ 3–4 2/วัน · 36.8–37.2° 1/วัน · อุณหภูมิแนวโน้มสูงขึ้น +2 · วันล่าสุดยังไม่หาย +3 (เพิ่งหาย +2) · กลุ่มเสี่ยงแรกรับ แดง 3 เหลือง 2 เขียว 1 · BMI ≥30 ช่วง 8 สัปดาห์แรก +2 — เป็นเครื่องมือจัดลำดับการดูแล ไม่ใช่การวินิจฉัยโรค</p>
  </div>
  ${priv ? `<div class="card" style="margin-top:12px">
    <div class="card-h"><h2>ทะเบียนผู้ป่วยและการส่งต่อ</h2><span class="small muted">เห็นเฉพาะผู้ฝึก ผบ.หน่วยฝึก เสนารักษ์</span></div>
    ${W.cases.length ? `<div class="alist">${W.cases.map(c => { const st = CASE_ST[c.status] || CASE_ST.open; const days = daysBetween(c.start, c.end || todayStr()) + 1; return `<div class="aitem" style="align-items:flex-start"><span class="pill lv${st.lv}">${st.n}</span><div style="flex:1;min-width:0">
      <div><b>${esc(sname(c.sid))}</b> <span class="tiny muted">เริ่ม ${thaiDate(c.start)} · ${days} วัน</span></div>
      <div class="small">อาการ: ${esc(c.symptom)}${c.sent ? ` · ส่งต่อ ${esc(c.sent)}` : ''}</div>
      ${c.treat ? `<div class="small muted">การรักษา: ${esc(c.treat)}</div>` : ''}
      ${c.status === 'recovered' ? `<div class="small" style="color:var(--ok)">หายเพราะ: ${esc(c.cause || '-')} (${thaiDate(c.end)})</div>` : ''}
      <div class="tiny muted">บันทึกโดย ${esc(c.updatedByName || c.byName || '-')}</div></div>
      <button class="btn sm" data-act="caseEdit" data-id="${c.id}">อัปเดต</button></div>`; }).join('')}</div>` : '<div class="empty">ยังไม่มีเคสในสัปดาห์นี้ · กด "เปิดเคส" ที่รายชื่อผู้ป่วยด้านบน</div>'}
  </div>
  ${recovered.length ? `<div class="card" style="margin-top:12px"><div class="card-h"><h2>เปรียบเทียบรายคน · หายเพราะอะไร</h2></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ชื่อ</th><th>อาการ</th><th>ส่งต่อ</th><th>การรักษา</th><th>ป่วย (วัน)</th><th>หายเพราะ</th></tr></thead><tbody>
    ${recovered.map(c => `<tr><td>${esc(sname(c.sid))}</td><td>${esc(c.symptom)}</td><td>${esc(c.sent || '-')}</td><td style="white-space:normal">${esc(c.treat || '-')}</td><td class="num">${daysBetween(c.start, c.end) + 1}</td><td style="white-space:normal">${esc(c.cause || '-')}</td></tr>`).join('')}
    </tbody></table></div></div>` : ''}` : ''}`;
}
function weekText() {
  const W = weekData(); const R = W.R;
  const L = [`สรุปสุขภาพรายสัปดาห์ ${R.w ? 'สัปดาห์ที่ ' + R.w + ' ' : ''}(${thaiDate(R.days[0])} – ${thaiDate(R.days[6])}) · ${S.settings.unit || 'หน่วยฝึกทหารใหม่'}`];
  L.push('ยอดป่วยรายวัน (รายใหม่/หายแล้ว):');
  W.daily.filter(x => !x.future).forEach(x => L.push(`  ${thaiDate(x.d, true)}: ป่วย ${x.sick} (ใหม่ ${x.neu.length} / หาย ${x.rec.length}) · ปัสสาวะ 3–4 ${x.dehy}`));
  const hi = W.rows.filter(x => x.level === 3), mid = W.rows.filter(x => x.level === 2);
  L.push(`สัปดาห์หน้าต้องดูแลพิเศษ ${hi.length} นาย:`); hi.forEach(x => L.push(`  - ${x.s.no}. ${shortName(x.s)} หมู่ ${x.s.squad} (${x.why.join(', ')})`));
  L.push(`เฝ้าระวัง ${mid.length} นาย:`); mid.forEach(x => L.push(`  - ${x.s.no}. ${shortName(x.s)} หมู่ ${x.s.squad} (${x.why.join(', ')})`));
  L.push(PDPA_FOOT);
  return L.join('\n');
}
function caseModal(id, sid) {
  const c = id ? Object.assign({}, S.cases[id]) : { sid: sid || '', start: S.date > todayStr() ? todayStr() : S.date, status: 'open', sent: CASE_SENT[0] };
  S.ce = { id, sid: c.sid, start: c.start, symptom: c.symptom || '', sent: c.sent || '', treat: c.treat || '', status: c.status || 'open', cause: c.cause || '', end: c.end || todayStr() };
  S.modal = () => { const E = S.ce; if (!E) return ''; return `<div class="ov" data-act="closeOv"><div class="sheet" role="dialog" aria-modal="true" aria-label="ทะเบียนผู้ป่วย">
    <div class="sheet-h"><div><h2>${id ? 'อัปเดตเคสผู้ป่วย' : 'เปิดเคสผู้ป่วย'}</h2><div class="tiny muted">ข้อมูลสุขภาพ · เห็นเฉพาะผู้ฝึก ผบ.หน่วยฝึก เสนารักษ์</div></div><button class="x" data-act="close" aria-label="ปิด">×</button></div>
    <div class="form-grid">
      <div class="field full"><label for="ce-sid">ทหารใหม่</label><select class="input" id="ce-sid" data-act="ceSet" data-f="sid" ${id ? 'disabled' : ''}><option value="">— เลือก —</option>${soldierList().map(s => `<option value="${s.id}" ${E.sid === s.id ? 'selected' : ''}>${esc(s.no + '. ' + shortName(s))} · หมู่ ${esc(s.squad)}</option>`).join('')}</select></div>
      <div class="field"><label for="ce-start">วันที่เริ่มป่วย</label><input class="input" type="date" id="ce-start" data-act="ceSet" data-f="start" value="${esc(E.start)}"></div>
      <div class="field"><label for="ce-sym">อาการ/โรค</label><input class="input" id="ce-sym" data-act="ceSet" data-f="symptom" value="${esc(E.symptom)}" placeholder="เช่น ไข้ ไอ เจ็บคอ / ข้อเท้าแพลง"></div>
      <div class="field full"><label>ส่งต่อไป</label><div class="seg" style="flex-wrap:wrap">${CASE_SENT.map(x => `<button type="button" data-act="ceSent" data-v="${esc(x)}" class="${E.sent === x ? 'on' : ''}">${esc(x)}</button>`).join('')}</div></div>
      <div class="field full"><label for="ce-treat">การรักษา/คำสั่งแพทย์</label><input class="input" id="ce-treat" data-act="ceSet" data-f="treat" value="${esc(E.treat)}" placeholder="เช่น ยาลดไข้ พัก 2 วัน งดฝึกกลางแจ้ง"></div>
      <div class="field full"><label>สถานะ</label><div class="seg" style="flex-wrap:wrap">${Object.entries(CASE_ST).map(([k, v]) => `<button type="button" data-act="ceStatus" data-v="${k}" class="${E.status === k ? 'on' : ''}">${v.n}</button>`).join('')}</div></div>
      ${E.status === 'recovered' ? `<div class="field"><label for="ce-end">วันที่หาย</label><input class="input" type="date" id="ce-end" data-act="ceSet" data-f="end" value="${esc(E.end)}"></div>
      <div class="field"><label for="ce-cause">หายเพราะ / ผลการรักษา</label><input class="input" id="ce-cause" data-act="ceSet" data-f="cause" value="${esc(E.cause)}" placeholder="เช่น ได้ยาลดไข้ + พัก 2 วัน ไข้ลด"></div>` : ''}
    </div>
    <div class="row" style="justify-content:space-between;margin-top:14px">${id && S.me.role === 'trainer' ? `<button class="btn danger" data-act="caseDel" data-id="${id}">ลบเคส</button>` : '<span></span>'}<div class="row"><button class="btn" data-act="close">ยกเลิก</button><button class="btn primary" data-act="caseSave">บันทึก</button></div></div>
  </div></div>`; };
  scheduleRender();
}
async function caseSave() {
  const E = S.ce; if (!E) return;
  if (!E.sid) return toast('เลือกทหารใหม่');
  if (!E.start) return toast('ระบุวันที่เริ่มป่วย');
  if (!E.symptom.trim()) return toast('ระบุอาการ/โรค');
  if (E.status === 'recovered' && !E.cause.trim()) return toast('ระบุว่าหายเพราะอะไร');
  if (E.status === 'recovered' && E.end < E.start) return toast('วันที่หายต้องไม่ก่อนวันเริ่มป่วย');
  const rec = { sid: E.sid, start: E.start, symptom: E.symptom.trim().slice(0, 300), sent: E.sent || '', treat: E.treat.trim().slice(0, 300), status: E.status,
    cause: E.status === 'recovered' ? E.cause.trim().slice(0, 300) : '', end: E.status === 'recovered' ? E.end : '',
    updatedBy: S.me.uid, updatedByName: S.me.name || '', updatedAt: Date.now() };
  try {
    if (E.id) await Store.update('cases/' + E.id, rec);
    else await Store.push('cases', Object.assign(rec, { by: S.me.uid, byName: S.me.name || '', at: Date.now() }));
    audit(E.id ? 'แก้ไขเคสผู้ป่วย' : 'เปิดเคสผู้ป่วย', E.sid); S.modal = null; S.ce = null; toast('บันทึกเคสแล้ว');
  } catch (e) { toast('บันทึกไม่ได้: ' + (e.code || e.message)); }
}

/* ════════════════ หน้า: ตั้งค่า ════════════════ */
function viewSettings() {
  const admin = can('admin'); const st = S.settings; const rds = rounds();
  const users = Object.entries(S.users || {}).map(([uid, u]) => Object.assign({ uid }, u)).sort((a, b) => (a.role ? 1 : 0) - (b.role ? 1 : 0));
  return `
  <div class="page-h"><div><h1>ตั้งค่า</h1></div></div>
  <div class="grid g-2">
  <div class="card">
    <h2 style="margin-bottom:12px">หน่วยฝึก</h2>
    <form data-act="saveSettings">
      <div class="form-grid">
        <div class="field full"><label>ชื่อหน่วยฝึก</label><input class="input" name="unit" value="${esc(st.unit || '')}" placeholder="หน่วยฝึกทหารใหม่ ช.1 พัน.52" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>ผลัด</label><input class="input" name="cohort" value="${esc(st.cohort || '')}" placeholder="2/69" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>วันเริ่มฝึก</label><input class="input" type="date" name="start" value="${esc(st.start || '')}" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>วันจบการฝึก</label><input class="input" type="date" name="end" value="${esc(st.end || '')}" placeholder="" ${admin ? '' : 'disabled'}><span class="tiny muted">${st.end ? '' : (trainEnd() ? 'ถ้าเว้นว่าง ใช้ ' + thaiDate(trainEnd()) : '')}</span></div>
        <div class="field full"><label>พิกัดสนามฝึก (ดัชนีความร้อนออนไลน์)</label><div class="row" style="gap:8px"><input class="input" name="wxName" value="${esc(st.wxName || WX_DEF.name)}" ${admin ? '' : 'disabled'} style="flex:2"><input class="input num" name="wxLat" inputmode="decimal" value="${esc(st.wxLat || WX_DEF.lat)}" ${admin ? '' : 'disabled'} style="flex:1" aria-label="ละติจูด"><input class="input num" name="wxLon" inputmode="decimal" value="${esc(st.wxLon || WX_DEF.lon)}" ${admin ? '' : 'disabled'} style="flex:1" aria-label="ลองจิจูด"></div></div>
        <div class="field"><label>ลบข้อมูลอ่อนไหวหลังจบฝึก (วัน)</label><input class="input" name="retain" inputmode="numeric" value="${esc(st.retain || 30)}" ${admin ? '' : 'disabled'}></div>
        <div class="field full"><label>ผู้รับผิดชอบ/ติดต่อเรื่องข้อมูลส่วนบุคคล</label><input class="input" name="dpo" value="${esc(st.dpo || '')}" placeholder="เช่น ร.ท.… ผู้ฝึก โทร …" ${admin ? '' : 'disabled'}></div>
        <div class="field full"><label>รอบคัดกรองอุณหภูมิ/สีปัสสาวะ (มาตรการ พบ. ผลัด 2/69: 3 เวลา)</label>
          <div class="row">${ALL_ROUNDS.map(r => `<label class="check" style="padding:4px 10px 4px 0"><input type="checkbox" name="rounds" value="${r}" ${rds.includes(r) ? 'checked' : ''} ${admin ? '' : 'disabled'}><span>${rl(r)} น.</span></label>`).join('')}</div></div>
      </div>
      ${admin ? '<button class="btn primary" style="margin-top:12px">บันทึก</button>' : ''}
    </form>
  </div>
  <div class="card">
    <h2 style="margin-bottom:12px">บัญชีของฉัน</h2>
    <div class="alert ${('Notification' in window) && Notification.permission === 'granted' ? 'ok' : 'info'}" style="margin-bottom:12px"><div class="small" style="flex:1"><b>แจ้งเตือนบนเครื่องนี้</b>${('Notification' in window) && Notification.permission === 'granted' ? 'เปิดแล้ว · เด้งเมื่อธงความร้อนเปลี่ยนและสรุปเช้านี้ (ขณะเปิดแอปไว้)' : 'กดเปิดเพื่อให้เด้งแจ้งเตือนเมื่อธงความร้อนเปลี่ยนและสรุปเช้านี้'}</div>${('Notification' in window) && Notification.permission !== 'granted' ? '<button class="btn sm" data-act="notifyOn">เปิดการแจ้งเตือน</button>' : ''}</div>
    <dl class="kv"><dt>ชื่อ</dt><dd>${esc(S.me.name || '-')}</dd><dt>บทบาท</dt><dd>${esc(ROLES[S.me.role].name)}</dd><dt>ระบบ</dt><dd>${Store.mode === 'demo' ? 'โหมดทดลอง (ในเครื่อง)' : 'Firebase'}</dd></dl>
    <hr class="sep">
    <div class="field"><label>ธีม</label><div class="seg">${[['auto', 'ตามเครื่อง'], ['light', 'สว่าง'], ['dark', 'มืด']].map(([k, n]) => `<button data-act="theme" data-t="${k}" class="${(localGet('carenst_theme') || 'auto') === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <p class="small muted" style="margin:12px 0">ติดตั้งเป็นแอปในมือถือ: Android (Chrome) กด ⋮ แล้วเลือก "ติดตั้งแอป" · iPhone (Safari) กดปุ่มแชร์ แล้วเลือก "เพิ่มไปยังหน้าจอโฮม"</p>
    <div class="row">${Store.mode === 'demo' ? '<button class="btn danger" data-act="resetDemo">ล้างข้อมูลทดลอง</button>' : '<button class="btn" data-act="logout">ออกจากระบบ</button>'}</div>
    ${S.me.role === 'trainer' && Store.mode === 'firebase' ? `<hr class="sep"><div class="field"><label>ล้างข้อมูลหลังซ้อม</label><p class="small muted" style="margin:0 0 8px">ลบรายชื่อ ข้อมูลส่วนบุคคล สุขภาพ ทะเบียนผู้ป่วย ความร้อน และบันทึกลงโทษทั้งหมด และยกเลิกสิทธิ์ผู้ใช้อื่น เหลือบัญชีของคุณคนเดียว · การตั้งค่าหน่วยยังอยู่ · กู้คืนไม่ได้</p><button class="btn danger" data-act="wipeAll">ล้างข้อมูลทั้งหมด</button></div>` : ''}
  </div>
  </div>
  ${pdpaCard()}
  ${admin && Store.mode === 'firebase' ? `<div class="card" style="margin-top:12px"><div class="card-h"><h2>ผู้ใช้และสิทธิ์</h2><span class="small muted">คนใหม่สมัครเองที่หน้าเข้าสู่ระบบ แล้วกำหนดบทบาทที่นี่</span></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th></tr></thead><tbody>
    ${users.map(u => `<tr><td>${esc(u.name || '-')}${!u.role ? ' <span class="pill lv2">รออนุมัติ</span>' : ''}</td><td>${esc(u.email || '')}</td><td><select class="input" data-act="setRole" data-uid="${u.uid}" style="min-height:34px;padding:4px 8px" ${u.uid === S.me.uid ? 'disabled' : ''}><option value="">— ไม่มีสิทธิ์ —</option>${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${r.name}</option>`).join('')}</select></td></tr>`).join('')}
    </tbody></table></div></div>` : ''}`;
}

/* ════════════════ หน้าเข้าสู่ระบบ ════════════════ */
function viewLogin() {
  const reg = S.loginTab === 'reg';
  return `<div class="login"><div class="card">
    <div class="logo"><img src="icon-192.png" alt=""><div><h1>CARE-NST</h1><div class="small muted">ระบบดูแลทหารใหม่</div></div></div>
    <div class="seg" style="width:100%;margin-bottom:14px"><button style="flex:1" data-act="loginTab" data-t="login" class="${reg ? '' : 'on'}">เข้าสู่ระบบ</button><button style="flex:1" data-act="loginTab" data-t="reg" class="${reg ? 'on' : ''}">สมัครใช้งาน</button></div>
    <form data-act="${reg ? 'register' : 'login'}">
      ${reg ? '<div class="field" style="margin-bottom:10px"><label>ยศ ชื่อ สกุล / ตำแหน่ง</label><input class="input" name="name" required placeholder="ส.อ. สมชาย ใจดี ครูนายสิบ หมู่ 1"></div>' : ''}
      <div class="field" style="margin-bottom:10px"><label>อีเมล</label><input class="input" type="email" name="email" autocomplete="email" required></div>
      <div class="field" style="margin-bottom:14px"><label>รหัสผ่าน${reg ? ' (อย่างน้อย 8 ตัว)' : ''}</label><input class="input" type="password" name="password" autocomplete="${reg ? 'new-password' : 'current-password'}" minlength="${reg ? 8 : 6}" required></div>
      ${S.loginErr ? `<div class="alert bad" style="margin-bottom:12px"><div class="small">${esc(S.loginErr)}</div></div>` : ''}
      <button class="btn primary" style="width:100%">${reg ? 'สมัครและรอผู้ฝึกอนุมัติ' : 'เข้าสู่ระบบ'}</button>
    </form>
    ${!reg ? '<button class="btn sm" style="margin-top:10px;width:100%;border:0" data-act="forgot">ลืมรหัสผ่าน</button>' : ''}
  </div></div>`;
}
function viewPending() {
  return `<div class="login"><div class="card"><h2>รออนุมัติสิทธิ์</h2>
    <p>สมัครเรียบร้อยแล้ว (${esc(S.me.email || '')}) แจ้งผู้ฝึกให้กำหนดบทบาทที่หน้า "ตั้งค่า > ผู้ใช้และสิทธิ์" แล้วหน้านี้จะเปลี่ยนเอง</p>
    <button class="btn" data-act="logout">ออกจากระบบ</button></div></div>`;
}

/* ════════════════ Excel ════════════════ */
const TPL_COLS = ['ลำดับ', 'ยศ', 'ชื่อ', 'สกุล', 'ชื่อเล่น', 'หมู่', 'อายุ', 'ส่วนสูง (ซม.)', 'น้ำหนัก (กก.)', 'กลุ่มเสี่ยง (ไม่มีสี/เขียว/เหลือง/แดง)', 'บัดดี้', 'หมายเหตุ'];
function needXLSX() { if (!window.XLSX) { toast('ไลบรารี Excel ยังโหลดไม่เสร็จ ลองอีกครั้ง'); return false; } return true; }
function downloadTemplate() {
  if (!needXLSX()) return;
  const ws = XLSX.utils.aoa_to_sheet([TPL_COLS, [1, 'พลฯ', 'ชื่อ', 'สกุล', 'เล่น', 1, 21, 170, 65, 'ไม่มีสี', 'A', '']]);
  ws['!cols'] = TPL_COLS.map(c => ({ wch: Math.max(8, c.length + 2) }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อ');
  XLSX.writeFile(wb, 'แบบฟอร์มรายชื่อทหารใหม่.xlsx');
}
function importFile(file) {
  if (!file || !needXLSX()) return;
  const fr = new FileReader();
  fr.onload = async () => {
    try {
      const wb = XLSX.read(new Uint8Array(fr.result), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const pick = (r, ...keys) => { const k = Object.keys(r).find(h => keys.some(x => String(h).replace(/\s/g, '').includes(x))); return k ? String(r[k]).trim() : ''; };
      const riskMap = { 'แดง': 'red', 'เหลือง': 'yellow', 'เขียว': 'green' };
      const byNo = {}; soldierList().forEach(s => { byNo[String(s.no)] = s.id; });
      const upd = {}; let n = 0;
      rows.forEach(r => {
        const no = pick(r, 'ลำดับ', 'ที่'); const fname = pick(r, 'ชื่อ');
        if (!no || !fname || fname === 'ชื่อ') return;
        const rk = pick(r, 'กลุ่มเสี่ยง', 'สี'); const risk = Object.keys(riskMap).find(k => rk.includes(k));
        const rec = { no: +no || no, rank: pick(r, 'ยศ') || 'พลฯ', fname, lname: pick(r, 'สกุล'), nick: pick(r, 'ชื่อเล่น', 'เล่น'), squad: pick(r, 'หมู่'),
          age: pick(r, 'อายุ'), h: pick(r, 'ส่วนสูง', 'สูง'), w: pick(r, 'น้ำหนัก'), risk: risk ? riskMap[risk] : 'none', buddy: pick(r, 'บัดดี้'), note: pick(r, 'หมายเหตุ') };
        Object.keys(rec).forEach(k => { if (rec[k] === '') delete rec[k]; });
        const id = byNo[String(rec.no)] || ('n' + String(rec.no).replace(/[.#$\[\]\/]/g, '_'));
        upd[id] = Object.assign({}, S.soldiers[id] || {}, rec); n++;
      });
      if (!n) return toast('ไม่พบข้อมูล ตรวจหัวคอลัมน์ให้ตรงแบบฟอร์ม');
      await Store.update('soldiers', upd);
      toast(`นำเข้า ${n} นายแล้ว`);
    } catch (e) { console.error(e); toast('อ่านไฟล์ไม่ได้: ' + e.message); }
  };
  fr.readAsArrayBuffer(file);
}
/* ════════════════ นำเข้าข้อมูลแรกรับจากระบบกองพล (พล.พัฒนา 1) ════════════════
 * รับไฟล์ CSV ที่ดาวน์โหลดจากปุ่ม "ดาวน์โหลด CSV" ของระบบจัดการฐานข้อมูลทหารใหม่ พล.พัฒนา 1
 * (คอลัมน์แรก = ID ตามด้วย col0–col63 ของแผ่น Data)
 * วิเคราะห์กลุ่มเสี่ยงตามเกณฑ์ พบ. ในเครื่องนี้ แล้วบันทึกเฉพาะผลลัพธ์ ไม่บันทึกชื่อโรค เลขบัตร เบอร์โทร ที่อยู่ หรือข้อมูลจิตเวช */
const DIV_LABELS = { 1: ['ยศ'], 2: ['ชื่อ'], 3: ['นามสกุล', 'สกุล'], 4: ['ชื่อเล่น'], 6: ['วันเดือนปีเกิด', 'วันเกิด'], 9: ['ส่วนสูง'], 10: ['น้ำหนัก'],
  11: ['ดัชนีมวลกาย', 'BMI'], 13: ['โรคประจำตัว'], 14: ['แพ้ยา'], 15: ['แพ้อาหาร'], 16: ['แพ้แมลง'], 19: ['จิตเวช'], 20: ['ซึมเศร้า'], 27: ['แอลกอฮอล์'], 28: ['สารเสพติด'], 29: ['ปัสสาวะ'],
  50: ['ปีประจำการ', 'ปี'], 51: ['ผลัด'], 52: ['สังกัด'], 53: ['หน่วยฝึก'] };
const SEV = { red: 3, yellow: 2, green: 1, none: 0 };
const blankish = v => { const t = String(v == null ? '' : v).trim(); return !t || t === '-' || t === 'ไม่มี' || t === 'ไม่ระบุ'; };
function divColumns(head) {
  const h = head.map(x => String(x == null ? '' : x).replace(/^\uFEFF/, '').trim());
  if (h[0] === 'ID' && h.length >= 60) return { ref: 0, col: j => j + 1, mode: 'export' };
  const used = new Set(), map = {};
  Object.entries(DIV_LABELS).forEach(([j, keys]) => {
    let i = h.findIndex((x, k) => !used.has(k) && keys.some(kw => x === kw));
    if (i < 0) i = h.findIndex((x, k) => !used.has(k) && keys.some(kw => x.includes(kw)) && !(j === '2' && x.includes('เล่น')) && !(j === '2' && x.includes('ญาติ')));
    if (i >= 0) { used.add(i); map[j] = i; }
  });
  const ref = h.findIndex(x => x === 'ID');
  if (map[2] == null || map[9] == null || map[10] == null) return null;
  return { ref, col: j => (map[j] == null ? -1 : map[j]), mode: 'header' };
}
function ageFrom(dob, at) {
  const t = String(dob || '').trim(); const m = t.match(/(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{4})/) || t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  let d, mo, y; if (m[1].length === 4) { y = +m[1]; mo = +m[2]; d = +m[3]; } else { d = +m[1]; mo = +m[2]; y = +m[3]; }
  if (y > 2400) y -= 543;
  const [ay, am, ad] = at.split('-').map(Number);
  let a = ay - y; if (am < mo || (am === mo && ad < d)) a--;
  return a > 10 && a < 60 ? a : null;
}
function analyzeIntake(get) {
  const h = num(get(9)), w = num(get(10));
  let bmi = h > 0 && w > 0 ? Math.round(w / ((h / 100) ** 2) * 10) / 10 : num(get(11));
  const why = [], store = []; let risk = 'none';
  const up = r => { if (SEV[r] > SEV[risk]) risk = r; };
  if ((bmi != null && bmi >= 30) || (w != null && w >= 100)) { up('red'); const t = bmi != null && bmi >= 30 ? `BMI ${bmi}` : `น้ำหนัก ${w} กก.`; why.push(t + ' (สัปดาห์แรก)'); store.push(t + ' (ทบทวนหลังสัปดาห์แรก)'); }
  const dis = get(13); if (!blankish(dis)) { up('yellow'); why.push('โรคประจำตัว: ' + String(dis).trim()); store.push('มีโรคประจำตัว'); }
  // สีเขียว = ประวัติสารเสพติดเท่านั้น (ตามที่หน่วยกำหนด) · ปัจจัยอื่นเก็บเป็นหมายเหตุ ไม่ติดสี
  if (bmi != null && bmi < 30 && (bmi >= 28 || bmi < 18.5)) store.push(`BMI ${bmi}`);
  const alc = String(get(27) || ''), drug = String(get(28) || ''), urine = String(get(29) || '');
  // ไฟล์กองพลจริงระบุเป็นชื่อสาร (เช่น กระท่อม, ยาบ้า) ไม่ใช่คำว่า "เคยใช้"
  const drugs = [];
  if (!blankish(drug) && !drug.trim().startsWith('ไม่เคย')) drugs.push('ประวัติใช้สารเสพติด');
  if (urine.trim() === 'ตรวจพบ') drugs.push('ปัสสาวะพบสารเสพติด');
  if (drugs.length) { up('green'); why.push(drugs.join(', ')); store.push('สารเสพติด (ดูข้อมูลส่วนบุคคล)'); }
  if (alc.includes('ประจำ')) store.push('ดื่มแอลกอฮอล์ประจำ');
  const alg = [[14, 'ยา'], [16, 'แมลง']].filter(([j]) => !blankish(get(j)));
  if (alg.length) store.push('มีประวัติแพ้' + alg.map(x => x[1]).join('/') + ' (ดูข้อมูลส่วนบุคคล)');
  const p1 = String(get(19) || '').trim(), p2 = String(get(20) || '').trim();
  const mh = (p1 && !p1.startsWith('ไม่เคย')) || (p2 && !p2.startsWith('ไม่เคย'));
  return { h, w, bmi, risk, why, store, mh };
}
function parseDivision(rows, fileName) {
  const head = rows[0] || []; const C = divColumns(head);
  if (!C) return null;
  const at = S.settings.start || todayStr();
  const out = [];
  rows.slice(1).forEach((r, i) => {
    const get = j => { const k = C.col(j); return k >= 0 ? r[k] : ''; };
    const fname = String(get(2) || '').trim(); if (!fname) return;
    const a = analyzeIntake(get);
    const tx = j => { const v = String(get(j) == null ? '' : get(j)).trim(); return v && v !== '-' ? v : ''; };
    a.p = { cid: tx(5), phone: tx(39), addr: [tx(31) && 'บ้านเลขที่ ' + tx(31), tx(32) && 'หมู่ ' + tx(32), tx(33), tx(34), tx(35) && 'ต.' + tx(35), tx(36) && 'อ.' + tx(36), tx(37) && 'จ.' + tx(37), tx(38)].filter(Boolean).join(' '),
      disease: tx(13), drug: tx(28), urine: tx(29), psych: tx(19), dep: tx(20),
      allergy: [[14, 'ยา'], [15, 'อาหาร'], [16, 'แมลง']].filter(([j]) => tx(j) && !blankish(tx(j))).map(([j, n]) => n + ': ' + tx(j)).join(' · ') };
    out.push(Object.assign(a, {
      key: String(C.ref >= 0 ? r[C.ref] : '').trim() || 'row' + (i + 2),
      ref: String(C.ref >= 0 ? r[C.ref] : '').trim(),
      rank: String(get(1) || '').trim() || 'พลฯ', fname, lname: String(get(3) || '').trim(), nick: blankish(get(4)) ? '' : String(get(4)).trim(),
      age: ageFrom(get(6), at), year: String(get(50) || '').trim(), phase: String(get(51) || '').trim(),
      unit: String(get(53) || '').trim() || String(get(52) || '').trim() || '-'
    }));
  });
  const units = [...new Set(out.map(x => x.unit))].sort();
  const mine = (S.settings.unit || '') + ' ช.1 พัน.52';
  const unit = units.find(u => u !== '-' && mine.includes(u)) || (units.length === 1 ? units[0] : 'all');
  const phases = [...new Set(out.map(x => x.phase).filter(Boolean))].sort();
  return { fileName, mode: C.mode, rows: out, units, unit, phases, phase: phases.length === 1 ? phases[0] : 'all', auto: true, size: 8, over: {} };
}
function intakeSelected() {
  const I = S.intake; return I.rows.filter(x => (I.unit === 'all' || x.unit === I.unit) && (I.phase === 'all' || x.phase === I.phase));
}
const finalRisk = x => S.intake.over[x.key] || x.risk;
function intakeModal() {
  const I = S.intake; const sel = intakeSelected();
  const cnt = k => sel.filter(x => finalRisk(x) === k).length;
  const flagged = sel.filter(x => x.risk !== 'none' || S.intake.over[x.key]).sort((a, b) => SEV[finalRisk(b)] - SEV[finalRisk(a)]);
  const mh = sel.filter(x => x.mh);
  const nSq = Math.max(1, Math.ceil(sel.length / Math.max(1, +I.size || 8)));
  return `<div class="ov" data-act="closeOv"><div class="sheet" role="dialog" aria-modal="true" aria-label="นำเข้าข้อมูลแรกรับ" style="max-width:820px">
    <div class="sheet-h"><div><h2>นำเข้าข้อมูลแรกรับ</h2><div class="tiny muted">${esc(I.fileName)} · ${I.rows.length} นายในไฟล์</div></div><button class="x" data-act="close" aria-label="ปิด">×</button></div>
    <div class="form-grid">
      <div class="field"><label for="in-unit">หน่วยฝึก</label><select class="input" id="in-unit" data-act="inSet" data-f="unit"><option value="all" ${I.unit === 'all' ? 'selected' : ''}>ทุกหน่วยในไฟล์</option>${I.units.map(u => `<option value="${esc(u)}" ${I.unit === u ? 'selected' : ''}>${esc(u)} (${I.rows.filter(x => x.unit === u).length})</option>`).join('')}</select></div>
      <div class="field"><label for="in-phase">ผลัด</label><select class="input" id="in-phase" data-act="inSet" data-f="phase"><option value="all" ${I.phase === 'all' ? 'selected' : ''}>ทุกผลัด</option>${I.phases.map(p => `<option value="${esc(p)}" ${I.phase === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>
    </div>
    <div class="grid g-stats" style="margin:14px 0">
      <div class="card stat"><div class="k">จะนำเข้า</div><div class="v num">${sel.length}</div><div class="s">นาย</div></div>
      <div class="card stat bad"><div class="k">แดง</div><div class="v num">${cnt('red')}</div><div class="s">งดฝึก ห้ามลงโทษ</div></div>
      <div class="card stat warn"><div class="k">เหลือง</div><div class="v num">${cnt('yellow')}</div><div class="s">ลดการฝึก</div></div>
      <div class="card stat ok"><div class="k">เขียว</div><div class="v num">${cnt('green')}</div><div class="s">ประวัติสารเสพติด</div></div>
      <div class="card stat"><div class="k">ไม่มีสี</div><div class="v num">${cnt('none')}</div><div class="s">ฝึกปกติ</div></div>
      <div class="card stat ${mh.length ? 'warn' : ''}"><div class="k">ติดตามสุขภาพจิต</div><div class="v num">${mh.length}</div><div class="s">ส่งเสนารักษ์</div></div>
    </div>
    <h3 style="margin-bottom:8px">ระบบเสนอสีกลุ่มเสี่ยง (${flagged.length} นาย) — ตรวจและแก้ได้ก่อนนำเข้า</h3>
    ${flagged.length ? `<div class="tbl-wrap" style="max-height:320px;overflow:auto"><table class="tbl"><thead><tr><th>ชื่อ</th><th>เหตุผล (เห็นเฉพาะตอนนำเข้า)</th><th>สี</th></tr></thead><tbody>
      ${flagged.map(x => `<tr><td>${esc(x.fname)} ${esc(x.lname)}</td><td style="white-space:normal;min-width:220px">${esc(x.why.join(' · ') || 'แก้ด้วยมือ')}</td><td><select class="input" data-act="inRisk" data-k="${esc(x.key)}" style="min-height:34px;padding:4px 8px;width:auto">${Object.entries(RISK).map(([k, r]) => `<option value="${k}" ${finalRisk(x) === k ? 'selected' : ''}>${r.n}</option>`).join('')}</select></td></tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">ไม่พบปัจจัยเสี่ยงตามเกณฑ์</div>'}
    ${mh.length ? `<div class="alert warn" style="margin-top:12px"><div class="small"><b>ส่งเสนารักษ์/ประเมินใน AMED สัปดาห์ที่ 1 (${mh.length} นาย)</b>${mh.map(x => esc(x.fname + ' ' + x.lname)).join(', ')}<br><span class="muted">ตอบแบบคัดกรองว่ามีประวัติด้านสุขภาพจิต รายละเอียดดูได้ในข้อมูลส่วนบุคคลของแต่ละคน (เฉพาะผู้ฝึก ผบ. เสนารักษ์)</span></div></div>` : ''}
    <hr class="sep">
    <label class="check"><input type="checkbox" data-act="inSet" data-f="auto" ${I.auto ? 'checked' : ''}><span>จัดหมู่อัตโนมัติ ให้กลุ่มเสี่ยงกระจายเท่ากันทุกหมู่ (เฉพาะคนที่ยังไม่มีหมู่)</span></label>
    ${I.auto ? `<div class="row small"><label for="in-size">ทหารต่อหมู่</label><input class="input num" id="in-size" data-act="inSet" data-f="size" inputmode="numeric" value="${esc(I.size)}" style="width:80px"><span class="muted">→ ${nSq} หมู่</span></div>` : ''}
    ${can('priv') ? `<div class="field" style="margin-top:10px"><label>เก็บข้อมูลส่วนบุคคลเท่าที่จำเป็น (PDPA) · ติ๊กออกเพื่อไม่นำเข้า</label><div class="row" style="flex-wrap:wrap">${PDPA_GROUPS.map(g => `<label class="check" style="padding:4px 12px 4px 0"><input type="checkbox" data-act="inSet" data-f="k_${g.k}" ${I['k_' + g.k] !== false ? 'checked' : ''}><span>${g.n}</span></label>`).join('')}</div></div>` : ''}
    <p class="tiny muted" style="margin:12px 0 0">ข้อมูลทั่วไป (ทุกบทบาทเห็น): ยศ ชื่อ สกุล ชื่อเล่น อายุ ส่วนสูง น้ำหนัก สีกลุ่มเสี่ยง เหตุผลแบบทั่วไป · ข้อมูลส่วนบุคคล (เฉพาะผู้ฝึก ผบ.หน่วยฝึก เสนารักษ์): เลขบัตร เบอร์โทร ที่อยู่ ชื่อโรค ประวัติสารเสพติด ข้อมูลจิตเวช · นำเข้าซ้ำได้ ระบบจับคู่ตาม ID ของกองพล</p>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-act="close">ยกเลิก</button><button class="btn primary" data-act="inConfirm" ${sel.length ? '' : 'disabled'}>นำเข้า ${sel.length} นาย</button></div>
  </div></div>`;
}
/* ════════════════ จัดลำดับตามบัญชีรายชื่อของหน่วย (ไฟล์ Excel: ลำดับ ชื่อ สกุล เลขบัตร หมายเหตุ) ════════════════ */
const normName = v => String(v == null ? '' : v).replace(/\s+/g, '').replace(/[์]/g, '').trim();
function nameSim(a, b) {
  a = normName(a); b = normName(b); if (!a || !b) return 0; if (a === b) return 1;
  const bg = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const A = bg(a), B = bg(b); let inter = 0; A.forEach((n, k) => { inter += Math.min(n, B.get(k) || 0); });
  return (2 * inter) / Math.max(1, (a.length - 1) + (b.length - 1));
}
function parseOrderFile(rows) {
  const hi = rows.findIndex(r => r.some(c => /^ลำดับ(ใหม่)?$/.test(String(c).trim())) && r.some(c => String(c).trim() === 'ชื่อ'));
  if (hi < 0) return null;
  const H = rows[hi].map(c => String(c).trim());
  const col = (...keys) => H.findIndex(h => keys.some(k => h.includes(k)));
  const cNo = H.indexOf('ลำดับ') >= 0 ? H.indexOf('ลำดับ') : H.indexOf('ลำดับใหม่'), cF = H.indexOf('ชื่อ'), cL = col('สกุล'), cCid = col('บัตร', 'ประชาชน'), cNote = col('หมายเหตุ'), cPh = col('โทร'), cDob = col('เกิด');
  const cPlt = H.findIndex(h => /^(มว\.?|หมวด)$/.test(h)), cOld = col('ลำดับเดิม'), cSq = H.indexOf('หมู่'), cSt = col('สถานะ');
  const out = [];
  rows.slice(hi + 1).forEach(r => {
    const fname = String(r[cF] || '').trim(); const no = num(r[cNo]);
    if (!fname) return;
    const plt = cPlt >= 0 ? String(r[cPlt] || '').trim().toUpperCase().replace(/^-$/, '') : '';
    const fsq = cSq >= 0 && plt ? String(r[cSq] || '').trim().replace(/^-$/, '') : '';
    const extra = [no == null ? String(r[cNo] || '').trim() : '', cSt >= 0 ? String(r[cSt] || '').trim() : ''].filter(Boolean).join(' ');
    out.push({ no, plt, fsq: /^\d+$/.test(fsq) ? plt + fsq : fsq, old: cOld >= 0 ? num(r[cOld]) : null, fname, lname: cL >= 0 ? String(r[cL] || '').trim() : '', cid: cCid >= 0 ? String(r[cCid] || '').replace(/\D/g, '') : '',
      note: [cNote >= 0 ? String(r[cNote] || '').trim() : '', extra].filter(Boolean).join(' '), phone: cPh >= 0 ? String(r[cPh] || '').replace(/\D/g, '') : '', dob: cDob >= 0 ? String(r[cDob] || '').trim() : '' });
  });
  return out;
}
function matchOrder(F) {
  const list = soldierList(); const used = new Set();
  const cidOf = s => String(((S.priv || {})[s.id] || {}).cid || '').replace(/\D/g, '');
  const full = x => (x.fname || '') + (x.lname || '');
  F.forEach(f => { f.sid = null; f.how = null; f.sim = 0; f.absent = /ขาด|ไม่มา|ไม่รายงาน/.test(f.note); });
  // 1) เลขบัตรตรง และชื่อไม่ต่างกันมาก
  F.forEach(f => { if (f.cid.length !== 13) return; const s = list.find(x => !used.has(x.id) && cidOf(x) === f.cid); if (s && nameSim(full(f), full(s)) >= 0.5) { f.sid = s.id; f.how = 'เลขบัตร'; f.sim = nameSim(full(f), full(s)); used.add(s.id); } });
  // 2) ชื่อ-สกุลตรงกัน
  F.forEach(f => { if (f.sid) return; const s = list.find(x => !used.has(x.id) && normName(full(x)) === normName(full(f))); if (s) { f.sid = s.id; f.how = 'ชื่อตรง'; f.sim = 1; used.add(s.id); } });
  // 3) ชื่อใกล้เคียง (สะกดต่างกันเล็กน้อย)
  F.forEach(f => { if (f.sid) return; let best = null, bs = 0; list.forEach(x => { if (used.has(x.id)) return; const v = nameSim(full(f), full(x)); if (v > bs) { bs = v; best = x; } }); if (best && bs >= 0.72) { f.sid = best.id; f.how = 'ชื่อใกล้เคียง'; f.sim = bs; used.add(best.id); } });
  return { F, rest: list.filter(s => !used.has(s.id)) };
}
function orderFile(file) {
  if (!file || !needXLSX()) return;
  if (!soldierList().length) return toast('ยังไม่มีรายชื่อในระบบ นำเข้าข้อมูลกองพลก่อน');
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const wb = XLSX.read(new Uint8Array(fr.result), { type: 'array', raw: /\.csv$/i.test(file.name) });
      const sheets = wb.SheetNames.map(n => ({ n, F: parseOrderFile(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' })) })).filter(x => x.F && x.F.length);
      if (!sheets.length) return toast('ไม่พบหัวตาราง "ลำดับ" และ "ชื่อ" ในไฟล์');
      // ถ้ามีแผ่น "เรียงลำดับใหม่" (มีคอลัมน์ลำดับเดิม) ใช้แผ่นนั้น แล้วดึงหมวดจากแผ่นที่มีคอลัมน์ มว.
      const main = sheets.find(x => x.F.some(f => f.old != null)) || sheets[0];
      const F = main.F; const pSheet = sheets.find(x => x.F.some(f => f.plt));
      if (pSheet && pSheet !== main) { const byNo = {}; pSheet.F.forEach(f => { if (f.no != null) byNo[f.no] = f.plt; }); F.forEach(f => { if (!f.plt && f.old != null) f.plt = byNo[f.old] || ''; }); }
      // เลขลำดับในไฟล์ข้าม/ซ้ำ → เรียงใหม่ตามแถว (เฉพาะคนที่มา)
      const present = F.filter(f => !/ขาด|ไม่มา|ไม่รายงาน/.test(f.note)); const nos = present.map(f => f.no);
      const renum = nos.some(n => n == null) || new Set(nos).size !== nos.length || Math.max(...nos) !== nos.length;
      if (renum) { present.forEach((f, i) => { f.fileNo = f.no; f.no = i + 1; }); F.filter(f => !present.includes(f)).forEach((f, i) => { f.fileNo = f.no; f.no = present.length + i + 1; }); }
      const M = matchOrder(F);
      const hasPlt = F.some(f => f.plt);
      const fileSq = hasPlt && F.filter(f => f.plt).every(f => f.fsq);
      S.ord = { fileName: file.name, sheet: main.n, F: M.F, rest: M.rest, addNew: true, renum, hasPlt, fileSq, split: fileSq ? 'f' : hasPlt ? 3 : 0 };
      S.modal = orderModal; scheduleRender();
    } catch (e) { console.error(e); toast('อ่านไฟล์ไม่ได้: ' + e.message); }
  };
  fr.readAsArrayBuffer(file);
}
function orderModal() {
  const O = S.ord; if (!O) return '';
  const ok = O.F.filter(f => f.sid), fuzzy = ok.filter(f => f.sim < 1), miss = O.F.filter(f => !f.sid && !f.absent), absent = O.F.filter(f => !f.sid && f.absent);
  const sn = id => { const s = S.soldiers[id]; return s ? shortName(s) : '-'; };
  const lastNo = Math.max(0, ...O.F.map(f => f.no));
  return `<div class="ov" data-act="closeOv"><div class="sheet" role="dialog" aria-modal="true" aria-label="จัดลำดับตามบัญชีรายชื่อ" style="max-width:820px">
    <div class="sheet-h"><div><h2>จัดลำดับตามบัญชีรายชื่อ</h2><div class="tiny muted">${esc(O.fileName)} · แผ่น "${esc(O.sheet || '')}" · ${O.F.length} แถว${O.renum ? ' · เลขลำดับในไฟล์ข้าม/ซ้ำ จึงเรียงใหม่ตามแถว 1–' + O.F.filter(f => !f.absent).length : ''}</div></div><button class="x" data-act="close" aria-label="ปิด">×</button></div>
    <div class="grid g-stats" style="margin-bottom:12px">
      <div class="card stat ok"><div class="k">จับคู่ได้</div><div class="v num">${ok.length}</div><div class="s">จะได้ลำดับตามไฟล์</div></div>
      <div class="card stat ${miss.length ? 'warn' : ''}"><div class="k">มีในไฟล์ ไม่มีในระบบ</div><div class="v num">${miss.length}</div><div class="s">${O.addNew ? 'จะเพิ่มเป็นทหารใหม่' : 'ข้ามไป'}</div></div>
      <div class="card stat"><div class="k">หมายเหตุ "ขาด"</div><div class="v num">${absent.length}</div><div class="s">ไม่เพิ่มเข้าระบบ</div></div>
      <div class="card stat ${O.rest.length ? 'warn' : ''}"><div class="k">มีในระบบ ไม่มีในไฟล์</div><div class="v num">${O.rest.length}</div><div class="s">ต่อท้ายลำดับ ${lastNo + 1}+</div></div>
    </div>
    ${fuzzy.length ? `<h3 style="margin-bottom:6px">ชื่อสะกดต่างกัน (${fuzzy.length}) — ตรวจว่าเป็นคนเดียวกัน</h3><div class="tbl-wrap" style="max-height:260px;overflow:auto"><table class="tbl"><thead><tr><th>ลำดับ</th><th>ในไฟล์</th><th>ในระบบ (กองพล)</th><th>จับคู่โดย</th><th></th></tr></thead><tbody>
      ${fuzzy.map(f => `<tr><td class="num">${f.no}</td><td>${esc(f.fname + ' ' + f.lname)}</td><td>${esc(sn(f.sid))}</td><td class="small muted">${f.how}</td><td><button class="btn sm" data-act="ordUnlink" data-no="${f.no}">ไม่ใช่คนเดียวกัน</button></td></tr>`).join('')}
    </tbody></table></div>` : ''}
    ${miss.length ? `<h3 style="margin:12px 0 6px">มีในไฟล์ แต่ไม่มีในข้อมูลกองพล (${miss.length})</h3><div class="small">${miss.map(f => `${f.no}. ${esc(f.fname + ' ' + f.lname)}`).join(' · ')}</div>
      <label class="check" style="margin-top:6px"><input type="checkbox" data-act="ordSet" data-f="addNew" ${O.addNew ? 'checked' : ''}><span>เพิ่มเป็นทหารใหม่ (ชื่อ-ลำดับ ส่วนสูง/น้ำหนักกรอกภายหลัง)</span></label>` : ''}
    ${absent.length ? `<p class="small muted" style="margin:10px 0 0">หมายเหตุ "ขาด": ${absent.map(f => `${f.no}. ${esc(f.fname + ' ' + f.lname)}`).join(' · ')}</p>` : ''}
    ${O.rest.length ? `<div class="alert warn" style="margin-top:12px"><div class="small"><b>มีในระบบแต่ไม่อยู่ในไฟล์ (${O.rest.length})</b>${O.rest.map(s => { const c = String(((S.priv || {})[s.id] || {}).cid || ''); const d = c.length === 13 && ok.find(f => String(((S.priv || {})[f.sid] || {}).cid || '') === c); return esc(shortName(s)) + (d ? ` <b>(เลขบัตรซ้ำกับลำดับ ${d.no} — น่าจะส่งข้อมูลซ้ำ ลบได้ที่หน้าข้อมูลรายคน)</b>` : ''); }).join(' · ')} — จะได้ลำดับต่อท้าย ตรวจว่าย้ายหน่วย ส่งข้อมูลซ้ำ หรือสะกดชื่อต่างกันมาก</div></div>` : ''}
    ${O.hasPlt ? `<div class="field" style="margin-top:12px"><label>หมวดและหมู่</label><div class="small" style="margin-bottom:6px">${orderPlan().map(g => `<b>หมวด ${esc(g.plt)}</b> ${g.n} นาย → ${g.sq.map((c, i) => `หมู่ ${g.plt}${i + 1}: ${c}`).join(', ')}`).join('<br>')}</div>
      <div class="seg">${(O.fileSq ? ['f'] : []).concat([0, 2, 3, 4]).map(n => `<button type="button" data-act="ordSplit" data-n="${n}" class="${O.split === n ? 'on' : ''}">${n === 'f' ? 'หมู่ตามไฟล์' : n ? 'หมวดละ ' + n + ' หมู่' : 'ไม่แบ่งหมู่'}</button>`).join('')}</div></div>` : ''}
    <p class="tiny muted" style="margin:12px 0 0">เปลี่ยนลำดับ${O.hasPlt ? ' หมวด และหมู่' : ''} ไม่แก้ชื่อหรือสีกลุ่มเสี่ยง · จับคู่ด้วยเลขบัตรก่อน แล้วชื่อ-สกุล แล้วชื่อที่สะกดใกล้เคียง · ${O.split === 'f' ? 'หมู่ตามคอลัมน์ "หมู่" ในไฟล์' : 'แบ่งหมู่ตามลำดับในหมวด'}</p>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-act="close">ยกเลิก</button><button class="btn primary" data-act="ordConfirm">ยืนยันจัดลำดับ</button></div>
  </div></div>`;
}
function orderPlan() {
  const O = S.ord; const rows = O.F.filter(f => (f.sid || (O.addNew && !f.absent)) && f.plt).sort((a, b) => a.no - b.no);
  const plts = [...new Set(rows.map(f => f.plt))].sort();
  return plts.map(plt => { const m = rows.filter(f => f.plt === plt);
    if (O.split === 'f' && m.every(f => f.fsq)) { const g = {}; m.forEach(f => { f.sq = f.fsq; g[f.fsq] = (g[f.fsq] || 0) + 1; }); return { plt, n: m.length, sq: Object.keys(g).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map(k => g[k]) }; }
    const k = O.split || 1; const base = Math.floor(m.length / k), extra = m.length % k;
    const sq = Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0)); let i0 = 0; sq.forEach((c, i) => { m.slice(i0, i0 + c).forEach(f => { f.sq = O.split ? plt + (i + 1) : plt; }); i0 += c; });
    return { plt, n: m.length, sq: O.split ? sq : [m.length] }; });
}
async function orderConfirm() {
  const O = S.ord; if (!O) return;
  const upd = {}; const lastNo = Math.max(0, ...O.F.map(f => f.no));
  if (O.hasPlt) orderPlan();
  O.F.forEach(f => { if (f.sid) { upd[f.sid + '/no'] = f.no; if (O.hasPlt && f.plt) { upd[f.sid + '/plt'] = f.plt; upd[f.sid + '/squad'] = f.sq; } } });
  O.rest.sort((a, b) => (+a.no || 0) - (+b.no || 0)).forEach((s, i) => { upd[s.id + '/no'] = lastNo + 1 + i; });
  const adds = O.addNew ? O.F.filter(f => !f.sid && !f.absent) : [];
  const pu = {};
  adds.forEach(f => {
    let id = 'm' + f.no; while (S.soldiers[id] || upd[id]) id += '_';
    upd[id] = { no: f.no, plt: f.plt || null, squad: (O.hasPlt && f.sq) || null, rank: 'พลฯ', fname: f.fname, lname: f.lname || null, risk: 'none', age: ageFrom(f.dob, S.settings.start || todayStr()) || null, src: 'บัญชีหน่วย' };
    if (can('priv') && (f.cid || f.phone)) pu[id] = Object.assign({ at: Date.now() }, f.cid ? { cid: f.cid } : {}, f.phone ? { phone: f.phone } : {});
  });
  try {
    await Store.update('soldiers', upd);
    if (Object.keys(pu).length) await Store.update('private', pu);
    audit('จัดลำดับตามบัญชีรายชื่อ', null, `${O.F.filter(f => f.sid).length} นาย · เพิ่มใหม่ ${adds.length}${O.hasPlt ? ' · หมวด/หมู่' : ''}`);
    S.modal = null; S.ord = null; toast(`จัดลำดับแล้ว · เพิ่มใหม่ ${adds.length} นาย`);
  } catch (e) { toast('บันทึกไม่ได้: ' + (e.code || e.message)); }
}

function intakeFile(file) {
  if (!file || !needXLSX()) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const wb = XLSX.read(new Uint8Array(fr.result), { type: 'array', raw: /\.csv$/i.test(file.name) });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
      const I = parseDivision(rows, file.name);
      if (!I) return toast('ไม่ใช่ไฟล์จากระบบกองพล ใช้ปุ่ม "ดาวน์โหลด CSV" ในระบบ พล.พัฒนา 1');
      if (!I.rows.length) return toast('ไม่พบรายชื่อในไฟล์');
      S.intake = I; S.modal = intakeModal; scheduleRender();
    } catch (e) { console.error(e); toast('อ่านไฟล์ไม่ได้: ' + e.message); }
  };
  fr.readAsArrayBuffer(file);
}
async function intakeConfirm() {
  const I = S.intake; const sel = intakeSelected(); if (!sel.length) return;
  const existing = soldierList(); const byRef = {}; existing.forEach(s => { if (s.ref) byRef[s.ref] = s; });
  let nextNo = Math.max(0, ...existing.map(s => +s.no || 0));
  const recs = sel.map(x => {
    const old = x.ref && byRef[x.ref];
    const no = old ? old.no : ++nextNo;
    const id = old ? old.id : 'n' + String(no).replace(/[.#$\[\]\/]/g, '_');
    const risk = finalRisk(x);
    const rec = Object.assign({}, old ? S.soldiers[old.id] : {}, {
      no, rank: x.rank, fname: x.fname, lname: x.lname, nick: x.nick || null, age: x.age, h: x.h, w: x.w, risk,
      riskWhy: risk === x.risk ? (x.store.join(' · ') || null) : (I.over[x.key] ? 'ผู้ฝึกกำหนด' : null), ref: x.ref || null, src: 'กองพล'
    });
    return { id, rec, sev: SEV[risk], bmi: x.bmi || 0, p: x.p };
  });
  if (I.auto) {
    const k = Math.max(1, Math.ceil(recs.length / Math.max(1, +I.size || 8)));
    const free = recs.filter(r => blankish(r.rec.squad)).sort((a, b) => b.sev - a.sev || b.bmi - a.bmi);
    free.forEach((r, i) => { const lap = Math.floor(i / k), pos = i % k; r.rec.squad = (lap % 2 ? k - pos : pos + 1); });
  }
  const upd = {}; recs.forEach(r => { Object.keys(r.rec).forEach(f => { if (r.rec[f] === '' || r.rec[f] === undefined) r.rec[f] = null; }); upd[r.id] = r.rec; });
  await Store.update('soldiers', upd);
  if (can('priv')) {
    const allow = PDPA_GROUPS.filter(g => I['k_' + g.k] !== false).flatMap(g => g.f);
    const pu = {}; recs.forEach(r => { const o = {}; Object.keys(r.p || {}).forEach(f => { if (r.p[f] && allow.includes(f)) o[f] = r.p[f]; }); o.at = Date.now(); pu[r.id] = o; });
    await Store.update('private', pu);
    audit('นำเข้าข้อมูลส่วนบุคคล', null, `${recs.length} นาย · ${PDPA_GROUPS.filter(g => I['k_' + g.k] !== false).map(g => g.n).join(', ') || 'ไม่มี'}`);
  }
  S.modal = null; S.intake = null; toast(`นำเข้า ${recs.length} นายแล้ว`);
}


/* ════════════════ แจ้งเตือน: สรุปเช้านี้ + ธงความร้อนเปลี่ยน ════════════════ */
const LV_COLOR = [
  { k: 'none', n: 'ไม่มีสี', d: 'ฝึกปกติ' },
  { k: 'green', n: 'เขียว', d: 'ประวัติสารเสพติด เฝ้าระวังพิเศษ' },
  { k: 'yellow', n: 'เหลือง', d: 'ลดการฝึก แยกกลุ่มฝึก' },
  { k: 'red', n: 'แดง', d: 'งดฝึก งดออกกำลังทุกชนิด' }
];
function docNeed(s) {
  const why = [];
  rounds().forEach(rd => {
    const r = (S.health[rd] || {})[s.id]; if (!r) return;
    if (r.doc) why.push('ครูส่งพบแพทย์');
    if (num(r.t) != null && num(r.t) > 37.2) why.push(`ไข้ ${r.t}°`);
    if (num(r.u) >= 4) why.push('ปัสสาวะสี 4');
  });
  return [...new Set(why)];
}
function briefData() {
  const list = soldierList();
  const st = list.map(s => Object.assign({ s }, statusOf(s)));
  const groups = [0, 1, 2, 3].map(lv => st.filter(x => !x.away && x.lv === lv));
  const docs = list.map(s => ({ s, why: docNeed(s) })).filter(x => x.why.length);
  const morning = rounds()[0]; const doneM = list.filter(s => (S.health[morning] || {})[s.id]).length;
  return { list, groups, docs, away: st.filter(x => x.away), morning, doneM, flag: currentFlag() };
}
function briefModal() {
  const B = briefData(); const n = B.list.length;
  return `<div class="ov" data-act="closeOv"><div class="sheet" role="dialog" aria-modal="true" aria-label="สรุปเช้านี้">
    <div class="sheet-h"><div><h2>สรุปเช้านี้</h2><div class="tiny muted">${thaiDate(S.date, true)} · รอบ ${rl(B.morning)} น. กรอกแล้ว ${B.doneM}/${n} นาย</div></div><button class="x" data-act="close" aria-label="ปิด">×</button></div>
    <div class="grid" style="grid-template-columns:repeat(2,1fr);gap:10px">
      <div class="card stat ${B.docs.length ? 'bad' : 'ok'}"><div class="k">ส่งพบแพทย์</div><div class="v num">${B.docs.length}</div><div class="s">นาย</div></div>
      <div class="card stat"><div class="k">ยอดทั้งหมด</div><div class="v num">${n}</div><div class="s">ไม่อยู่ ${B.away.length} นาย</div></div>
    </div>
    ${B.docs.length ? `<div class="alist" style="margin-top:10px">${B.docs.map(x => `<div class="aitem"><span class="pill lv3">พบแพทย์</span><div style="min-width:0"><div><b>${esc(x.s.no)}.</b> ${esc(shortName(x.s))} <span class="muted small">หมู่ ${esc(x.s.squad)}</span></div><div class="why">${esc(x.why.join(' · '))}</div></div></div>`).join('')}</div>` : ''}
    <h3 style="margin:16px 0 8px">การฝึกแยกตามสี</h3>
    <div class="alist">${[3, 2, 1, 0].map(lv => { const g = B.groups[lv]; const c = LV_COLOR[lv]; return `<div class="aitem" style="align-items:flex-start"><i class="rdot rd-${c.k}" style="margin-top:6px"></i><div style="flex:1;min-width:0"><div class="row" style="justify-content:space-between"><b>${c.n} · ${c.d}</b><b class="num">${g.length} นาย</b></div>${lv >= 2 && g.length ? `<div class="why">${g.map(x => esc(x.s.no + '. ' + shortName(x.s))).join(', ')}</div>` : ''}</div></div>`; }).join('')}</div>
    ${(() => { const T = wxToday(); return T ? `<p class="small" style="margin:12px 0 0"><b>พยากรณ์วันนี้ (ออนไลน์):</b> สูงสุดดัชนี ${T.peak.hi} (${+T.peak.time.slice(11, 13)}.00 น.)${T.red ? ` · <b style="color:var(--bad)">ธงแดงขึ้นไป ${T.red}</b>` : ''}${T.yellow ? ` · ธงเหลืองขึ้นไป ${T.yellow}` : ''}</p>` : ''; })()}
    ${B.flag ? `<div class="alert ${B.flag.flag.k === 'red' || B.flag.flag.k === 'black' ? 'bad' : B.flag.flag.k === 'yellow' ? 'warn' : 'info'}" style="margin-top:12px"><div><b>${B.flag.flag.n} (ดัชนี ${B.flag.hi} · ${hm(B.flag.slot)} น.)</b>ดื่มน้ำ ${B.flag.flag.water} · ${B.flag.flag.wr}${B.flag.flag.note ? ' · ' + B.flag.flag.note : ''}</div></div>` : '<p class="small muted" style="margin-top:12px">ยังไม่ได้วัดดัชนีความร้อนวันนี้</p>'}
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-act="copyBrief">${ic('copy')}คัดลอกส่งไลน์</button><button class="btn primary" data-act="close">รับทราบ</button></div>
  </div></div>`;
}
function briefText() {
  const B = briefData(); const L = [`สรุปเช้านี้ ${thaiDate(S.date, true)} · ${S.settings.unit || 'หน่วยฝึกทหารใหม่'}`];
  L.push(`ยอด ${B.list.length} นาย · ไม่อยู่ ${B.away.length} นาย`);
  L.push(`ส่งพบแพทย์ ${B.docs.length} นาย`); B.docs.forEach(x => L.push(`  - ${x.s.no}. ${shortName(x.s)} (${x.why.join(', ')})`));
  L.push('การฝึกแยกตามสี:'); [3, 2, 1, 0].forEach(lv => L.push(`  ${LV_COLOR[lv].n} (${LV_COLOR[lv].d}) ${B.groups[lv].length} นาย`));
  if (B.flag) L.push(`ธงความร้อน: ${B.flag.flag.n} ดัชนี ${B.flag.hi} (${hm(B.flag.slot)} น.)`);
  const T = wxToday(); if (T) L.push(`พยากรณ์วันนี้ (ออนไลน์): สูงสุดดัชนี ${T.peak.hi} (${+T.peak.time.slice(11, 13)}.00 น.)${T.red ? ' · ธงแดงขึ้นไป ' + T.red : ''}${T.yellow ? ' · ธงเหลืองขึ้นไป ' + T.yellow : ''}`);
  L.push(PDPA_FOOT);
  return L.join('\n');
}
function notifyDevice(title, body) {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opt = { body, icon: 'icon-192.png', badge: 'icon-192.png', tag: title };
  if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, opt)).catch(() => { try { new Notification(title, opt); } catch (e) {} });
  else { try { new Notification(title, opt); } catch (e) {} }
}
function maybeBrief(force) {
  if (!S.me || !ROLES[S.me.role] || S.date !== todayStr() || !soldierList().length || !S._hLoaded) return;
  const t = nowHM(); if (!force && (t < '05:00' || t >= '12:00')) return;
  const key = 'carenst_brief_' + todayStr();
  if (!force && localGet(key)) return;
  if (S.modal) return;
  localSet(key, '1'); S.modal = briefModal; scheduleRender();
  const B = briefData();
  notifyDevice('สรุปเช้านี้', `พบแพทย์ ${B.docs.length} · แดง ${B.groups[3].length} · เหลือง ${B.groups[2].length} · เขียว ${B.groups[1].length} · ปกติ ${B.groups[0].length}`);
}
function checkHeatChange() {
  if (S.date !== todayStr()) return;
  const f = currentFlag(); if (!f) return;
  const key = 'carenst_flag_' + S.date; const seen = localGet(key);
  const sig = f.flag.k + '@' + f.slot;
  if (seen === sig) return;
  const prevK = seen ? seen.split('@')[0] : null;
  localSet(key, sig);
  if (!S._heatBase) { S._heatBase = true; if (!seen) return; }
  if (prevK === f.flag.k) return;
  S.heatAlert = { flag: f.flag, hi: f.hi, slot: f.slot, prev: prevK ? FLAGS.find(x => x.k === prevK) : null };
  notifyDevice(`ธงความร้อนเปลี่ยนเป็น${f.flag.n}`, `ดัชนี ${f.hi} (${hm(f.slot)} น.) · ดื่มน้ำ ${f.flag.water} · ${f.flag.wr}${f.flag.note ? ' · ' + f.flag.note : ''}`);
  scheduleRender();
}
function heatBanner() {
  const a = S.heatAlert; if (!a) return '';
  const tone = a.flag.k === 'red' || a.flag.k === 'black' ? 'bad' : a.flag.k === 'yellow' ? 'warn' : 'info';
  return `<div class="popalert alert ${tone}" role="alert"><i class="fl fl-${a.flag.k}" style="width:34px;height:24px;flex:0 0 34px;border-radius:4px;border:1px solid rgba(0,0,0,.3)"></i><div style="flex:1;min-width:0">${a.online ? `<b>ดัชนีความร้อนออนไลน์ ${a.online}: ${a.flag.n}</b>ดัชนี ${a.hi} · ให้ครูวัดที่สนามฝึกยืนยัน` : `<b>ธงความร้อนเปลี่ยน${a.prev ? ` จาก${a.prev.n}` : ''} เป็น${a.flag.n}</b>ดัชนี ${a.hi} (${hm(a.slot)} น.)`} · ดื่มน้ำ ${a.flag.water} · ${a.flag.wr}${a.flag.note ? ' · <b style="display:inline">' + a.flag.note + '</b>' : ''}</div><button class="btn sm" data-act="heatOk">รับทราบ</button></div>`;
}

function exportReport() {
  if (!needXLSX()) return;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reportText().split('\n').map(l => [l])), 'สรุป');
  const rds = rounds();
  const hrows = [['ลำดับ', 'ยศ ชื่อ สกุล', 'หมู่', 'กลุ่มเสี่ยง'].concat(...rds.map(r => [`${rl(r)} อุณหภูมิ`, `${rl(r)} ปัสสาวะ`])).concat(['สถานะ', 'ข้อสังเกต'])];
  soldierList().forEach(s => { const st = statusOf(s); hrows.push([s.no, fullName(s), s.squad, RISK[s.risk || 'none'].n].concat(...rds.map(r => { const x = (S.health[r] || {})[s.id] || {}; return x.away ? ['ไม่อยู่', ''] : [x.t ?? '', x.u ?? '']; })).concat([LV_LABEL[st.lv], st.why.join(' / ')])); });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hrows), 'สุขภาพ');
  const heat = [['ที่', 'เวลา', 'อุณหภูมิ', 'ความชื้น', 'ดัชนี', 'ธง/ผล']];
  HEAT_SLOTS.forEach(k => { const r = S.heat[k] || {}; const hi = slotHI(r); heat.push(['สนาม', hm(k), r.temp ?? '', r.rh ?? '', hi ?? '', hi != null ? flagOf(hi).n : '']); });
  DORM_SLOTS.forEach(k => { const r = S.dorm[k] || {}; const hi = slotHI(r); heat.push(['โรงนอน', hm(k), r.temp ?? '', r.rh ?? '', hi ?? '', hi != null ? (hi > 33 ? 'เกิน 33' : 'ปกติ') : '']); });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(heat), 'ความร้อน');
  const pun = [['เวลา', 'ทหารใหม่', 'ท่า', 'นาที', 'ความผิด', 'ผู้สั่ง', 'บทบาท']];
  Object.values(S.punish || {}).filter(p => p.date === S.date).forEach(p => pun.push([p.time, p.sname, (p.moves || []).join(', '), p.minutes, p.reason, p.byName, (ROLES[p.role] || {}).name || p.role]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pun), 'ลงโทษ');
  XLSX.writeFile(wb, `รายงานทหารใหม่_${S.date}.xlsx`);
}

/* ════════════════ เหตุการณ์ ════════════════ */
function askConfirm(msg, okLabel, fn) {
  S._confirmFn = fn;
  S.modal = () => `<div class="ov" data-act="closeOv"><div class="sheet" role="alertdialog" aria-modal="true" style="max-width:420px"><h2 style="margin-bottom:16px">${esc(msg)}</h2><div class="row" style="justify-content:flex-end"><button class="btn" data-act="close">ยกเลิก</button><button class="btn danger" data-act="confirmOk">${esc(okLabel)}</button></div></div></div>`;
  scheduleRender();
}
function toast(msg) { S.toast = msg; scheduleRender(); clearTimeout(toast._t); toast._t = setTimeout(() => { S.toast = null; scheduleRender(); }, 2600); }
function localGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function localSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function applyTheme() { const t = localGet('carenst_theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
const stamp = () => ({ by: S.me.uid, byName: S.me.name || '', at: Date.now() });

/* ════════════════ ใบบันทึกกระดาษแบบระบายวงกลม (พิมพ์ → ระบาย → ถ่ายรูป → อ่านในเครื่อง ไม่ส่งรูปออก) ════════════════ */
const OMR = (() => {
  const L = { fid: 8, fids: [[14, 14], [196, 14], [14, 283], [196, 283]], bitY: 14, bitX0: 40, bitStep: 5.5, nBits: 24,
    rowY0: 46, rowH: 9.2, perPage: 25, r: 2.1, rIn: 1.15, paper: [[105, 7], [205, 150], [5, 150], [100, 294]] };
  const cols = []; let x = 68;
  const group = (g, labels, step) => { labels.forEach((lb, i) => cols.push({ g, v: i, lb, x: x + i * step })); x += labels.length * step + 2.2; };
  group('T', ['35', '36', '37', '38', '39'], 5.2);
  group('D', ['.0', '.1', '.2', '.3', '.4', '.5', '.6', '.7', '.8', '.9'], 5.2);
  group('U', ['0', '1', '2', '3', '4'], 5.2);
  group('A', ['ไม่อยู่'], 6.4); group('K', ['พบแพทย์'], 6.4);
  L.cols = cols; L.x1 = x;
  return L;
})();
const OMR_EPOCH = '2026-01-01';
function omrEncode(date, round, sqIdx, page) {
  const day = daysBetween(OMR_EPOCH, date); const ri = Math.max(0, ALL_ROUNDS.indexOf(round));
  const v = [[day, 10], [ri, 2], [sqIdx, 6], [page, 2]]; const bits = [];
  v.forEach(([n, w]) => { for (let i = w - 1; i >= 0; i--) bits.push((n >> i) & 1); });
  const cs = bits.reduce((a, b) => a + b, 0) % 16; for (let i = 3; i >= 0; i--) bits.push((cs >> i) & 1);
  return bits;
}
function omrDecode(bits) {
  const take = (a, b) => bits.slice(a, b).reduce((n, x) => n * 2 + x, 0);
  const cs = bits.slice(0, 20).reduce((a, b) => a + b, 0) % 16; if (cs !== take(20, 24)) return null;
  const date = addDays(OMR_EPOCH, take(0, 10)); const round = ALL_ROUNDS[take(10, 12)]; const sqIdx = take(12, 18); const page = take(18, 20);
  return round ? { date, round, sqIdx, page } : null;
}
const omrSqKey = idx => idx === 63 ? 'all' : squads()[idx];
function omrRoster(sqKey, page) {
  const list = soldierList().filter(s => sqKey === 'all' || String(s.squad) === String(sqKey)).sort((a, b) => (+a.no || 0) - (+b.no || 0));
  return list.slice(page * OMR.perPage, (page + 1) * OMR.perPage);
}
function omrSheetsHTML(date, round, sqKeys) {
  const unit = S.settings.unit || 'หน่วยฝึกทหารใหม่'; const pages = [];
  sqKeys.forEach(sq => {
    const all = soldierList().filter(s => sq === 'all' || String(s.squad) === String(sq)); const n = Math.max(1, Math.ceil(all.length / OMR.perPage));
    for (let p = 0; p < Math.min(n, 4); p++) pages.push({ sq, p, n, rows: omrRoster(sq, p) });
  });
  const mm = v => v.toFixed(2) + 'mm';
  const page = pg => {
    const sqIdx = pg.sq === 'all' ? 63 : squads().indexOf(pg.sq); const bits = omrEncode(date, round, sqIdx, pg.p);
    let h = OMR.fids.map(([cx, cy]) => `<div class="fid" style="left:${mm(cx - OMR.fid / 2)};top:${mm(cy - OMR.fid / 2)}"></div>`).join('');
    h += bits.map((b, i) => `<div class="bit ${b ? 'on' : ''}" style="left:${mm(OMR.bitX0 + i * OMR.bitStep - 1.5)};top:${mm(OMR.bitY - 1.5)}"></div>`).join('');
    h += `<div class="ttl" style="left:20mm;top:20mm">ใบบันทึกสุขภาพประจำวัน · ${esc(unit)}</div>
      <div class="meta" style="left:20mm;top:27.5mm">วันที่ <b>${thaiDate(date, true)}</b> · รอบ <b>${rl(round)} น.</b> · ${pg.sq === 'all' ? 'ทุกหมู่' : 'หมู่ <b>' + esc(pg.sq) + '</b>'}${pg.n > 1 ? ` · แผ่น ${pg.p + 1}/${pg.n}` : ''} · ผู้บันทึก ...............................</div>
      <div class="hint" style="left:20mm;top:32.6mm">ระบายวงกลมให้เต็มด้วยปากกาสีเข้ม 1 วงต่อกลุ่ม · อุณหภูมิ = หลักหน่วย + ทศนิยม (เช่น 36 กับ .8 = 36.8) · ห้ามพับหรือเขียนทับสี่เหลี่ยมดำ</div>`;
    const gx = g => OMR.cols.filter(c => c.g === g); const gl = { T: 'อุณหภูมิ °C', D: 'ทศนิยม', U: 'สีปัสสาวะ', A: '', K: '' };
    ['T', 'D', 'U'].forEach(g => { const c = gx(g); h += `<div class="gh" style="left:${mm(c[0].x - 2.7)};width:${mm(c[c.length - 1].x - c[0].x + 5.4)};top:${mm(OMR.rowY0 - 10)}">${gl[g]}</div>`; });
    OMR.cols.forEach(c => { const sm = c.g === 'A' || c.g === 'K'; h += `<div class="ch ${sm ? 'sm' : ''}" style="left:${mm(c.x - (sm ? 4.5 : 3.2))};top:${mm(OMR.rowY0 - 4.8)}">${c.lb}</div>`; });
    for (let i = 0; i < OMR.perPage; i++) {
      const s = pg.rows[i]; const y = OMR.rowY0 + i * OMR.rowH; const cy = y + OMR.rowH / 2;
      h += `<div class="row ${i % 2 ? 'alt' : ''}" style="top:${mm(y)}"></div>`;
      if (!s) continue;
      h += `<div class="no" style="top:${mm(cy - 2.2)}">${esc(s.no)}</div><div class="nm" style="top:${mm(cy - 2.2)}">${esc(shortName(s))}</div>`;
      OMR.cols.forEach(c => { h += `<div class="bub" style="left:${mm(c.x - OMR.r)};top:${mm(cy - OMR.r)}"></div>`; });
    }
    h += `<div class="ft" style="left:20mm;top:288mm">CARE-NST · ถ่ายรูปให้เห็นสี่เหลี่ยมดำครบ 4 มุม · ข้อมูลส่วนบุคคล ใช้ภายในหน่วย (PDPA)</div>`;
    return `<section class="pg">${h}</section>`;
  };
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ใบบันทึกสุขภาพ ${date} ${rl(round)}</title>
  <style>@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff;color:#000;font-family:'IBM Plex Sans Thai','Sarabun',system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pg{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page}
  .pg>div{position:absolute}.fid{width:${OMR.fid}mm;height:${OMR.fid}mm;background:#000}.bit{width:3mm;height:3mm;border:.25mm solid #000;box-sizing:border-box}.bit.on{background:#000}
  .ttl{font-size:14pt;font-weight:700}.meta{font-size:10.5pt}.hint{font-size:8pt;color:#333}.gh{font-size:8pt;text-align:center;border-bottom:.3mm solid #000}
  .ch{width:6.4mm;text-align:center;font-size:7.5pt}.ch.sm{font-size:5.6pt;width:9mm;white-space:nowrap}.row{left:15mm;width:${(OMR.x1 - 15).toFixed(1)}mm;height:${OMR.rowH}mm;border-bottom:.2mm solid #bbb}.row.alt{background:#f2f2f2}
  .no{left:15.5mm;width:8mm;text-align:right;font-size:9pt}.nm{left:26mm;width:40mm;font-size:9pt;white-space:nowrap;overflow:hidden}
  .bub{width:${OMR.r * 2}mm;height:${OMR.r * 2}mm;border:.25mm solid #444;border-radius:50%;box-sizing:border-box;background:#fff}.ft{font-size:7pt;color:#444}
  @media screen{body{background:#888}.pg{background:#fff;margin:10px auto;box-shadow:0 2px 8px rgba(0,0,0,.4)}}</style></head>
  <body>${pages.map(page).join('')}<script>setTimeout(function(){window.print()},600)<\/script></body></html>`;
}
function omrPrint(round, sqKeys) {
  const html = omrSheetsHTML(S.date, round, sqKeys);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(url, '_blank'); if (!w) { location.href = url; }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  audit('พิมพ์ใบบันทึกสุขภาพ', null, `${S.date} ${rl(round)}`);
}
/* ── อ่านภาพ ── */
function omrSolveH(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]]; if (Math.abs(A[c][c]) < 1e-12) return null;
    for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
  const h = b.map((v, i) => v / A[i][i]); h.push(1); return h;
}
const omrMap = (H, x, y) => { const w = H[6] * x + H[7] * y + 1; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
async function omrReadImage(file) {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, 1800 / Math.max(bmp.width, bmp.height)); const W = Math.round(bmp.width * sc), Hh = Math.round(bmp.height * sc);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(bmp, 0, 0, W, Hh); if (bmp.close) bmp.close();
  const px = cx.getImageData(0, 0, W, Hh).data; const g = new Float32Array(W * Hh);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2];
  // threshold แบบปรับตามแสงในพื้นที่ (integral image)
  const I = new Float64Array((W + 1) * (Hh + 1));
  for (let y = 0; y < Hh; y++) { let row = 0; for (let x = 0; x < W; x++) { row += g[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
  const R = Math.max(8, Math.round(Math.max(W, Hh) / 30)); const bin = new Uint8Array(W * Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R), x1 = Math.min(W, x + R + 1), y1 = Math.min(Hh, y + R + 1);
    const sum = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];
    bin[y * W + x] = g[y * W + x] < (sum / ((x1 - x0) * (y1 - y0))) * 0.78 ? 1 : 0;
  }
  // หา "สี่เหลี่ยมดำ" 4 มุม
  const lab = new Int32Array(W * Hh); const comps = []; const stack = new Int32Array(W * Hh); let id = 0;
  for (let p = 0; p < bin.length; p++) {
    if (!bin[p] || lab[p]) continue; id++; let sp = 0; stack[sp++] = p; lab[p] = id;
    let n = 0, sx = 0, sy = 0, minx = W, maxx = 0, miny = Hh, maxy = 0;
    while (sp) { const q = stack[--sp]; const qx = q % W, qy = (q - qx) / W; n++; sx += qx; sy += qy;
      if (qx < minx) minx = qx; if (qx > maxx) maxx = qx; if (qy < miny) miny = qy; if (qy > maxy) maxy = qy;
      if (qx > 0 && bin[q - 1] && !lab[q - 1]) { lab[q - 1] = id; stack[sp++] = q - 1; }
      if (qx < W - 1 && bin[q + 1] && !lab[q + 1]) { lab[q + 1] = id; stack[sp++] = q + 1; }
      if (qy > 0 && bin[q - W] && !lab[q - W]) { lab[q - W] = id; stack[sp++] = q - W; }
      if (qy < Hh - 1 && bin[q + W] && !lab[q + W]) { lab[q + W] = id; stack[sp++] = q + W; } }
    const w = maxx - minx + 1, h = maxy - miny + 1;
    if (w >= 8 && h >= 8 && w / h > 0.5 && w / h < 2 && n / (w * h) > 0.5 && n < W * Hh * 0.02) comps.push({ n, x: sx / n, y: sy / n, w, h });
  }
  if (comps.length < 4) throw new Error('หาสี่เหลี่ยมดำ 4 มุมไม่เจอ ถ่ายใหม่ให้เห็นครบทั้งแผ่นและมีแสงพอ');
  comps.sort((a, b) => b.n - a.n); const big = comps.filter(c => c.n >= comps[0].n * 0.2).slice(0, 12);
  if (big.length < 4) throw new Error('หาสี่เหลี่ยมดำ 4 มุมไม่ครบ ถ่ายใหม่ให้เห็นครบทั้งแผ่น');
  // เลือก 4 จุดที่ล้อมพื้นที่ได้มากที่สุด แล้วเรียงตามเข็มนาฬิกา
  const area = q => { let A = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; A += a.x * b.y - b.x * a.y; } return Math.abs(A) / 2; };
  const order = q => { const mx = q.reduce((a, c) => a + c.x, 0) / 4, my = q.reduce((a, c) => a + c.y, 0) / 4; return q.slice().sort((a, b) => Math.atan2(a.y - my, a.x - mx) - Math.atan2(b.y - my, b.x - mx)); };
  let best = null, bestA = 0;
  for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) for (let k = j + 1; k < big.length; k++) for (let l = k + 1; l < big.length; l++) {
    const q = order([big[i], big[j], big[k], big[l]]); const ns = q.map(c => c.n); if (Math.max(...ns) > Math.min(...ns) * 4) continue;
    const A = area(q); if (A > bestA) { bestA = A; best = q; } }
  if (!best || bestA < W * Hh * 0.08) throw new Error('สี่เหลี่ยมดำเล็กเกินไป ถ่ายใกล้ขึ้นให้กระดาษเต็มภาพ');
  const sampleWith = H => (mx, my, rmm) => {
    const [cxp, cyp] = omrMap(H, mx, my); const [ex, ey] = omrMap(H, mx + rmm, my); const rp = Math.max(1.5, Math.hypot(ex - cxp, ey - cyp));
    let s = 0, n = 0; for (let dy = -rp; dy <= rp; dy += 1) for (let dx = -rp; dx <= rp; dx += 1) { if (dx * dx + dy * dy > rp * rp) continue;
      const xx = Math.round(cxp + dx), yy = Math.round(cyp + dy); if (xx < 0 || yy < 0 || xx >= W || yy >= Hh) continue; s += g[yy * W + xx]; n++; }
    return n ? 255 - s / n : 0;
  };
  const tries = [0, 1, 2, 3].map(st => { const q = [0, 1, 2, 3].map(i => best[(st + i) % 4]); // TL TR BR BL
    const H = omrSolveH(OMR.fids, [[q[0].x, q[0].y], [q[1].x, q[1].y], [q[3].x, q[3].y], [q[2].x, q[2].y]]); if (!H) return null;
    const sm = sampleWith(H); const ink = OMR.fids.map(([x, y]) => sm(x, y, 2)).sort((a, b) => a - b)[1];
    const paper = OMR.paper.map(([x, y]) => sm(x, y, 1.5)).sort((a, b) => a - b)[1]; const C = Math.max(30, ink - paper);
    const bits = Array.from({ length: OMR.nBits }, (_, i) => (sm(OMR.bitX0 + i * OMR.bitStep, OMR.bitY, 0.9) - paper) > C * 0.5 ? 1 : 0);
    const top = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y), side = Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y);
    return { q, H, sm, paper, C, bits, meta: omrDecode(bits), portrait: top < side, tl: q[0].x + q[0].y }; }).filter(Boolean);
  const T0 = tries.find(t => t.meta) || tries.filter(t => t.portrait).sort((a, b) => a.tl - b.tl)[0] || tries[0];
  if (!T0) throw new Error('คำนวณมุมกระดาษไม่ได้');
  const [TL, TR, BR, BL] = T0.q; const Hm = T0.H; const sample = T0.sm; const paper = T0.paper; const C = T0.C;
  const bits = Array.from({ length: OMR.nBits }, (_, i) => (sample(OMR.bitX0 + i * OMR.bitStep, OMR.bitY, 0.9) - paper) > C * 0.5 ? 1 : 0);
  const rows = [];
  for (let i = 0; i < OMR.perPage; i++) {
    const cy = OMR.rowY0 + i * OMR.rowH + OMR.rowH / 2;
    const d = OMR.cols.map(c => sample(c.x, cy, OMR.rIn));
    const sorted = d.slice().sort((a, b) => a - b); const base = sorted[Math.floor(sorted.length * 0.3)];
    const thr = C * 0.3;
    const pickG = gk => { const idx = OMR.cols.map((c, j) => j).filter(j => OMR.cols[j].g === gk); const v = idx.map(j => d[j] - base);
      const order = v.map((x, k) => [x, k]).sort((a, b) => b[0] - a[0]); const [top, k1] = order[0]; const sec = order[1] ? order[1][0] : -1;
      if (top < thr) return { v: null }; if (sec >= Math.max(thr, top * 0.5)) return { v: null, amb: true }; return { v: OMR.cols[idx[k1]].v }; };
    const T = pickG('T'), D = pickG('D'), U = pickG('U');
    const A = (d[OMR.cols.findIndex(c => c.g === 'A')] - base) > thr, K = (d[OMR.cols.findIndex(c => c.g === 'K')] - base) > thr;
    const t = T.v != null && D.v != null ? 35 + T.v + D.v / 10 : null;
    const amb = !!(T.amb || D.amb || U.amb || ((T.v == null) !== (D.v == null)));
    rows.push({ t: t != null ? Math.round(t * 10) / 10 : null, u: U.v, away: A, doc: K, amb, any: t != null || U.v != null || A || K || amb });
  }
  // ภาพตรวจสอบ: จุดเขียว = อ่านว่าระบาย
  cx.lineWidth = 2;
  rows.forEach((r, i) => { const cy = OMR.rowY0 + i * OMR.rowH + OMR.rowH / 2; if (!r.any) return;
    const [ax, ay] = omrMap(Hm, 15, cy); cx.strokeStyle = r.amb ? '#e0301e' : '#1aa34a'; cx.strokeRect(ax - 4, ay - 6, 8, 12); });
  [TL, TR, BL, BR].forEach(c => { cx.strokeStyle = '#1aa34a'; cx.strokeRect(c.x - c.w / 2 - 3, c.y - c.h / 2 - 3, c.w + 6, c.h + 6); });
  const sc2 = Math.min(1, 700 / Math.max(W, Hh)); const pv = document.createElement('canvas'); pv.width = Math.round(W * sc2); pv.height = Math.round(Hh * sc2);
  pv.getContext('2d').drawImage(cv, 0, 0, pv.width, pv.height);
  return { meta: omrDecode(bits), rows, preview: pv.toDataURL('image/jpeg', 0.6) };
}
async function omrFile(file) {
  if (!file) return;
  toast('กำลังอ่านใบบันทึก…');
  try {
    const R = await omrReadImage(file);
    const m = R.meta || { date: S.date, round: S.round || rounds()[0], sqIdx: S.squad === 'all' ? 63 : Math.max(0, squads().indexOf(S.squad)), page: 0 };
    S.omr = Object.assign({ metaOk: !!R.meta, rows: R.rows, preview: R.preview }, m);
    omrBuild(); S.modal = omrModal; scheduleRender();
  } catch (e) { console.error(e); toast(e.message || 'อ่านรูปไม่ได้'); }
}
function omrBuild() {
  const O = S.omr; const roster = omrRoster(omrSqKey(O.sqIdx) || 'all', O.page);
  O.items = O.rows.map((r, i) => roster[i] ? Object.assign({ sid: roster[i].id, use: r.any && !r.amb }, r, { t: r.t != null ? r.t.toFixed(1) : '' }) : null).filter(x => x && (x.any));
  O.empty = roster.length - O.items.length;
}
function omrModal() {
  const O = S.omr; if (!O) return '';
  const sqName = omrSqKey(O.sqIdx); const amb = O.items.filter(x => x.amb).length;
  return `<div class="ov" data-act="closeOv"><div class="sheet" role="dialog" aria-modal="true" aria-label="ตรวจผลอ่านใบบันทึก" style="max-width:860px">
    <div class="sheet-h"><div><h2>ตรวจผลอ่านใบบันทึก</h2><div class="tiny muted">${O.metaOk ? 'อ่านรหัสใบได้' : '<b style="color:var(--bad)">อ่านรหัสใบไม่ได้ — ตรวจวันที่ รอบ และหมู่ด้านล่าง</b>'} · รูปอ่านในเครื่องนี้ ไม่ถูกส่งออก</div></div><button class="x" data-act="close" aria-label="ปิด">×</button></div>
    <div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:10px">
      <div class="field"><label>วันที่</label><input class="input" type="date" data-act="omrSet" data-f="date" value="${esc(O.date)}"></div>
      <div class="field"><label>รอบ</label><select class="input" data-act="omrSet" data-f="round">${ALL_ROUNDS.map(r => `<option value="${r}" ${r === O.round ? 'selected' : ''}>${rl(r)} น.</option>`).join('')}</select></div>
      <div class="field"><label>หมู่</label><select class="input" data-act="omrSet" data-f="sqIdx"><option value="63" ${O.sqIdx === 63 ? 'selected' : ''}>ทุกหมู่</option>${squads().map((q, i) => `<option value="${i}" ${O.sqIdx === i ? 'selected' : ''}>หมู่ ${esc(q)}</option>`).join('')}</select></div>
      <div class="field"><label>แผ่นที่</label><select class="input" data-act="omrSet" data-f="page">${[0, 1, 2, 3].map(p => `<option value="${p}" ${O.page === p ? 'selected' : ''}>${p + 1}</option>`).join('')}</select></div>
    </div>
    <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:12px;align-items:start">
      <img src="${O.preview}" alt="ภาพที่อ่าน" style="width:100%;border-radius:8px;border:1px solid var(--line)">
      <div>
        <p class="small" style="margin:0 0 8px">อ่านได้ <b>${O.items.length}</b> นาย${amb ? ` · <b style="color:var(--bad)">ไม่ชัด ${amb} นาย</b> (ระบายเกิน 1 วงหรือจาง) กรอกเองแล้วติ๊ก "บันทึก"` : ''} · ไม่ได้ระบาย ${O.empty} นาย${sqName ? '' : ' · <b>ไม่พบหมู่นี้</b>'}</p>
        <div class="tbl-wrap" style="max-height:52vh;overflow:auto"><table class="tbl"><thead><tr><th>บันทึก</th><th>ชื่อ</th><th>อุณหภูมิ</th><th>ปัสสาวะ</th><th>ไม่อยู่</th><th>พบแพทย์</th></tr></thead><tbody>
        ${O.items.map((x, i) => { const s = S.soldiers[x.sid] || {}; return `<tr style="${x.amb ? 'background:var(--bad-bg,#fde8e6)' : ''}"><td><input type="checkbox" data-act="omrRow" data-i="${i}" data-f="use" ${x.use ? 'checked' : ''}></td>
          <td>${esc(s.no)}. ${esc(shortName(s))}${x.amb ? ' <span class="pill lv3">ไม่ชัด</span>' : ''}</td>
          <td><input class="input num" style="width:76px;min-height:34px" inputmode="decimal" data-act="omrRow" data-i="${i}" data-f="t" value="${esc(x.t)}"></td>
          <td><select class="input" style="min-height:34px;width:70px;padding:4px 8px" data-act="omrRow" data-i="${i}" data-f="u"><option value="">-</option>${[0, 1, 2, 3, 4].map(u => `<option value="${u}" ${x.u === u ? 'selected' : ''}>${u}</option>`).join('')}</select></td>
          <td><input type="checkbox" data-act="omrRow" data-i="${i}" data-f="away" ${x.away ? 'checked' : ''}></td><td><input type="checkbox" data-act="omrRow" data-i="${i}" data-f="doc" ${x.doc ? 'checked' : ''}></td></tr>`; }).join('')}
        </tbody></table></div>
      </div>
    </div>
    <div class="row" style="justify-content:space-between;margin-top:14px"><span class="tiny muted">ข้อมูลเดิมของรอบนั้นจะถูกแทนเฉพาะช่องที่มีค่า</span><div class="row"><button class="btn" data-act="close">ยกเลิก</button><button class="btn primary" data-act="omrSave">บันทึก ${O.items.filter(x => x.use).length} นาย</button></div></div>
  </div></div>`;
}
async function omrSave() {
  const O = S.omr; if (!O) return; const upd = {}; let n = 0, bad = 0;
  O.items.filter(x => x.use).forEach(x => {
    const t = x.t === '' ? null : num(String(x.t).replace(',', '.'));
    if (t != null && (t < 34 || t > 43)) { bad++; return; }
    const st = stamp(); const p = x.sid + '/';
    if (t != null) upd[p + 't'] = t; if (x.u != null && x.u !== '') upd[p + 'u'] = +x.u;
    if (x.away) upd[p + 'away'] = true; if (x.doc) upd[p + 'doc'] = true;
    upd[p + 'by'] = st.by; upd[p + 'byName'] = st.byName; upd[p + 'at'] = st.at; upd[p + 'src'] = 'ใบบันทึก'; n++;
  });
  if (bad) return toast(`อุณหภูมิไม่ถูกต้อง ${bad} แถว (34–43 °C)`);
  if (!n) return toast('ยังไม่ได้เลือกแถวที่จะบันทึก');
  try {
    await Store.update(`health/${O.date}/${O.round}`, upd);
    audit('บันทึกจากใบบันทึกกระดาษ', null, `${O.date} ${rl(O.round)} · ${n} นาย`);
    S.modal = null; S.omr = null; toast(`บันทึกจากใบบันทึกแล้ว ${n} นาย`);
  } catch (e) { toast('บันทึกไม่ได้: ' + (e.code || e.message)); }
}
function omrPrintModal() {
  const P = S.omrP; const sq = squads();
  return `<div class="ov" data-act="closeOv"><div class="sheet" role="dialog" aria-modal="true" aria-label="พิมพ์ใบบันทึก">
    <div class="sheet-h"><div><h2>พิมพ์ใบบันทึกสุขภาพ</h2><div class="tiny muted">${thaiDate(S.date, true)} · A4 ใบละไม่เกิน ${OMR.perPage} นาย</div></div><button class="x" data-act="close" aria-label="ปิด">×</button></div>
    <div class="field"><label>รอบ</label><div class="seg">${rounds().map(r => `<button type="button" data-act="omrPR" data-r="${r}" class="${P.round === r ? 'on' : ''}">${rl(r)} น.</button>`).join('')}</div></div>
    <div class="field" style="margin-top:10px"><label>หมู่ (เลือกได้หลายหมู่ · หมู่ละแผ่น)</label><div class="chips" style="flex-wrap:wrap">${['all'].concat(sq).map(q => `<button type="button" class="fchip ${P.sq.includes(q) ? 'on' : ''}" data-act="omrPS" data-q="${esc(q)}">${q === 'all' ? 'ทุกหมู่ (เรียงตามลำดับ)' : 'หมู่ ' + esc(q)}</button>`).join('')}</div></div>
    <p class="tiny muted" style="margin:10px 0 0">พิมพ์แบบ "ขนาดจริง/100%" ไม่ต้องย่อ · ระบายด้วยปากกาสีน้ำเงินเข้มหรือดำ · ถ่ายรูปตรง ๆ ให้เห็นสี่เหลี่ยมดำครบ 4 มุม</p>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-act="close">ยกเลิก</button><button class="btn primary" data-act="omrPrintGo" ${P.sq.length ? '' : 'disabled'}>พิมพ์ ${P.sq.length} ชุด</button></div>
  </div></div>`;
}

async function saveTemp(id, val) {
  const key = `t-${id}`;
  if (val === '') { delete S.drafts[key]; await Store.update(`health/${S.date}/${S.round}/${id}`, Object.assign({ t: null }, stamp())); return; }
  const t = num(String(val).replace(',', '.'));
  if (t == null || t < 34 || t > 43) { toast('อุณหภูมิไม่ถูกต้อง (34–43 °C)'); return; }
  delete S.drafts[key];
  await Store.update(`health/${S.date}/${S.round}/${id}`, Object.assign({ t }, stamp()));
  if (t > 37.2) toast(`${shortName(S.soldiers[id])} ${t}° งดฝึก ลดความร้อน นำส่ง รพ.`);
}

const actions = {
  go: el => { S.view = el.dataset.v; S.q = ''; S.modal = null; window.scrollTo(0, 0); scheduleRender(); },
  goHealth: el => { S.view = 'health'; S.round = el.dataset.r; scheduleRender(); },
  more: () => { S.modal = () => `<div class="ov" data-act="closeOv"><div class="sheet"><div class="sheet-h"><h2>เมนู</h2><button class="x" data-act="close" aria-label="ปิด">×</button></div><div class="menu-list">${NAV.filter(n => !MOBILE_NAV.includes(n.k)).map(n => `<button data-act="go" data-v="${n.k}">${ic(n.k)}${n.n}</button>`).join('')}</div></div></div>`; scheduleRender(); },
  close: () => { S.modal = null; scheduleRender(); },
  closeOv: (el, e) => { if (e.target === el) { S.modal = null; scheduleRender(); } },
  round: el => { S.round = el.dataset.r; scheduleRender(); },
  squad: el => { S.squad = el.dataset.q; scheduleRender(); },
  urine: async el => { const id = el.dataset.id, u = +el.dataset.u; const cur = ((S.health[S.round] || {})[id] || {}).u; await Store.update(`health/${S.date}/${S.round}/${id}`, Object.assign({ u: cur === u ? null : u }, stamp())); if (u === 4 && cur !== 4) toast('สี 4 อันตราย: งดฝึก พบแพทย์ทันที'); else if (u === 3 && cur !== 3) toast('สี 3 อันตราย: งดฝึก ดื่มน้ำ แจ้งเสนารักษ์'); },
  doc: async el => { const id = el.dataset.id; const cur = ((S.health[S.round] || {})[id] || {}).doc; await Store.update(`health/${S.date}/${S.round}/${id}`, Object.assign({ doc: cur ? null : true }, stamp())); if (!cur) toast(`ส่ง ${shortName(S.soldiers[id])} พบแพทย์`); },
  brief: () => maybeBrief(true),
  heatOk: () => { S.heatAlert = null; scheduleRender(); },
  copyBrief: async () => { const t = briefText(); try { await navigator.clipboard.writeText(t); toast('คัดลอกแล้ว'); } catch (e) { toast('คัดลอกไม่ได้'); } },
  notifyOn: async () => { if (!('Notification' in window)) return toast('เครื่องนี้ไม่รองรับการแจ้งเตือน'); const r = await Notification.requestPermission(); toast(r === 'granted' ? 'เปิดการแจ้งเตือนแล้ว' : 'ไม่ได้รับอนุญาต เปิดได้ที่การตั้งค่าเบราว์เซอร์'); if (r === 'granted') notifyDevice('CARE-NST', 'การแจ้งเตือนบนเครื่องนี้พร้อมใช้งาน'); scheduleRender(); },
  away: async el => { const id = el.dataset.id; const cur = ((S.health[S.round] || {})[id] || {}).away; await Store.update(`health/${S.date}/${S.round}/${id}`, Object.assign({ away: cur ? null : true }, stamp())); },
  soldier: el => soldierModal(el.dataset.id),
  wk: el => { S.wk = +el.dataset.w; scheduleRender(); },
  ordUnlink: el => { const O = S.ord; const f = O.F.find(x => String(x.no) === el.dataset.no); if (f && f.sid) { O.rest.push(Object.assign({ id: f.sid }, S.soldiers[f.sid])); f.sid = null; f.how = null; f.sim = 0; } scheduleRender(); },
  ordConfirm: () => orderConfirm(),
  omrPrintOpen: () => { S.omrP = { round: S.round || rounds()[0], sq: [S.squad === 'all' ? 'all' : S.squad] }; S.modal = omrPrintModal; scheduleRender(); },
  omrPR: el => { S.omrP.round = el.dataset.r; scheduleRender(); },
  omrPS: el => { const q = el.dataset.q; const P = S.omrP; if (q === 'all') P.sq = P.sq.includes('all') ? [] : ['all']; else { P.sq = P.sq.filter(x => x !== 'all'); P.sq = P.sq.includes(q) ? P.sq.filter(x => x !== q) : P.sq.concat([q]); } scheduleRender(); },
  omrPrintGo: () => { const P = S.omrP; if (!P.sq.length) return; omrPrint(P.round, P.sq.map(q => q === 'all' ? 'all' : (squads().find(x => String(x) === q) ?? q))); S.modal = null; scheduleRender(); },
  omrSave: () => omrSave(),
  wxRefresh: () => fetchWx(true),
  ordSplit: el => { S.ord.split = el.dataset.n === 'f' ? 'f' : +el.dataset.n; scheduleRender(); },
  pdpaAccept: async () => {
    if (!S.pdpaTick) return;
    try { if (Store.mode === 'demo') localSet('carenst_pdpa_demo', String(Date.now())); else { await Store.set(`users/${S.me.uid}/pdpaAt`, Date.now()); S.me.pdpaAt = Date.now(); } audit('ยอมรับข้อตกลง PDPA'); scheduleRender(); }
    catch (e) { toast('บันทึกไม่ได้: ' + (e.code || e.message)); }
  },
  copyNotice: async () => { try { await navigator.clipboard.writeText(recruitNotice()); toast('คัดลอกประกาศแล้ว'); } catch (e) { toast('คัดลอกไม่ได้'); } },
  wipeSensitive: () => askConfirm('ลบข้อมูลอ่อนไหวทั้งหมด? (ข้อมูลส่วนบุคคล + ทะเบียนผู้ป่วย) รายชื่อและสุขภาพรายวันยังอยู่ · กู้คืนไม่ได้', 'ลบข้อมูลอ่อนไหว', async () => {
    try { await Store.set('private', null); await Store.set('cases', null); audit('ลบข้อมูลอ่อนไหวทั้งหมด'); toast('ลบข้อมูลอ่อนไหวแล้ว'); } catch (e) { toast('ลบไม่สำเร็จ: ' + (e.code || e.message)); }
  }),
  copyWeek: async () => { audit('คัดลอกสรุปรายสัปดาห์'); const t = weekText(); try { await navigator.clipboard.writeText(t); toast('คัดลอกแล้ว'); } catch (e) { toast('คัดลอกไม่ได้'); } },
  caseNew: el => caseModal(null, el.dataset.sid || ''),
  caseEdit: el => { const c = S.cases[el.dataset.id] || {}; audit('เปิดดูเคสผู้ป่วย', c.sid); caseModal(el.dataset.id); },
  ceSent: el => { S.ce.sent = S.ce.sent === el.dataset.v ? '' : el.dataset.v; scheduleRender(); },
  ceStatus: el => { S.ce.status = el.dataset.v; scheduleRender(); },
  caseSave: () => caseSave(),
  caseDel: el => { const id = el.dataset.id; askConfirm('ลบเคสผู้ป่วยนี้?', 'ลบ', async () => { try { const sid = (S.cases[id] || {}).sid; await Store.set('cases/' + id, null); audit('ลบเคสผู้ป่วย', sid); S.ce = null; toast('ลบเคสแล้ว'); } catch (e) { toast('ลบไม่ได้: ' + (e.code || e.message)); } }); },
  reveal: el => { const id = el.dataset.id; S.reveal[id] = !S.reveal[id]; if (S.reveal[id]) audit('ดูข้อมูลส่วนบุคคล', id); soldierModal(id); },
  addSoldier: () => soldierModal(null),
  riskPick: el => { const f = el.closest('form'); f.querySelector('[name=risk]').value = el.dataset.k; f.querySelectorAll('[data-act=riskPick]').forEach(b => b.classList.toggle('on', b === el)); },
  delSoldier: el => { const id = el.dataset.id; askConfirm(`ลบ ${fullName(S.soldiers[id] || {})} ออกจากทะเบียน?`, 'ลบ', async () => { await Store.set('soldiers/' + id, null); if (can('priv')) await Store.set('private/' + id, null); toast('ลบแล้ว'); }); },
  tpl: downloadTemplate,
  inConfirm: () => intakeConfirm(),
  pMove: el => { const m = el.dataset.m; const P = S.P; P.moves = P.moves.includes(m) ? P.moves.filter(x => x !== m) : P.moves.concat([m]); scheduleRender(); },
  pEdit: el => punishEditModal(el.dataset.id),
  pDel: el => { const id = el.dataset.id; const p = S.punish[id] || {}; askConfirm(`ลบบันทึกลงโทษ ${p.sname || ''} (${thaiDate(p.date)} ${p.time || ''} น.)?`, 'ลบ', async () => { try { await Store.set('punish/' + id, null); toast('ลบบันทึกแล้ว'); } catch (e) { toast('ลบไม่ได้: ' + (e.code || e.message)); } }); },
  peMove: el => { const m = el.dataset.m; const E = S.pe; E.moves = E.moves.includes(m) ? E.moves.filter(x => x !== m) : E.moves.concat([m]); scheduleRender(); },
  peSave: async () => {
    const E = S.pe; const p = S.punish[E.id]; if (!p) return;
    const minutes = num(E.minutes);
    if (!E.moves.length) return toast('เลือกท่าอย่างน้อย 1 ท่า');
    if (minutes == null || minutes <= 0 || minutes > 12) return toast('เวลารวม 1–12 นาที');
    if (!E.reason || E.reason.trim().length < 5) return toast('ระบุความผิด');
    const hk = 'h' + Date.now().toString(36);
    const upd = { moves: E.moves, minutes, reason: E.reason.trim(), editedBy: S.me.uid, editedByName: S.me.name || '', editedAt: Date.now() };
    upd['hist/' + hk] = { moves: p.moves || [], minutes: p.minutes, reason: p.reason || '', at: Date.now(), byName: S.me.name || '' };
    try { await Store.update('punish/' + E.id, upd); S.modal = null; S.pe = null; toast('บันทึกการแก้ไขแล้ว'); } catch (e) { toast('แก้ไขไม่ได้: ' + (e.code || e.message)); }
  },
  pScope: el => { S.punishScope = el.dataset.s; scheduleRender(); },
  pSave: async () => {
    if (punishCheck().length) return;
    const P = S.P; const s = S.soldiers[P.sid];
    await Store.push('punish', Object.assign({ sid: P.sid, sname: `${s.no}. ${shortName(s)}`, date: S.date, time: nowHM(), moves: P.moves, minutes: num(P.minutes), reason: P.reason.trim(), role: S.me.role }, stamp()));
    S.P = { sid: '', moves: [], minutes: '', reason: '', explained: false, individual: false, open: false };
    toast('บันทึกแล้ว');
  },
  copyReport: async () => { const t = reportText(); try { await navigator.clipboard.writeText(t); toast('คัดลอกแล้ว วางในไลน์/ฟอร์มได้เลย'); } catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('คัดลอกแล้ว'); } catch (e2) { toast('คัดลอกไม่ได้'); } ta.remove(); } },
  xlsReport: () => { audit('ส่งออก Excel รายงานประจำวัน', null, S.date); exportReport(); },
  theme: el => { localSet('carenst_theme', el.dataset.t === 'auto' ? '' : el.dataset.t); applyTheme(); scheduleRender(); },
  wipeAll: () => askConfirm('ล้างข้อมูลทั้งหมด? รายชื่อ สุขภาพ ความร้อน บันทึกลงโทษ และสิทธิ์ผู้ใช้อื่นจะถูกลบถาวร เหลือบัญชีคุณคนเดียว', 'ล้างข้อมูลทั้งหมด', async () => {
    try {
      for (const k of ['private', 'cases', 'soldiers', 'health', 'heat', 'dorm', 'punish']) await Store.set(k, null);
      const others = Object.keys(S.users || {}).filter(uid => uid !== S.me.uid && S.users[uid].role);
      for (const uid of others) await Store.set(`users/${uid}/role`, null);
      audit('ล้างข้อมูลทั้งหมด', null, `ยกเลิกสิทธิ์ ${others.length} บัญชี`);
      toast(`ล้างข้อมูลแล้ว · ยกเลิกสิทธิ์ ${others.length} บัญชี`);
    } catch (e) { console.error(e); toast('ล้างไม่สำเร็จ: ' + (e.code || e.message)); }
  }),
  resetDemo: () => askConfirm('ล้างข้อมูลทดลองทั้งหมดแล้วเริ่มใหม่?', 'ล้างข้อมูล', () => { seedDemo(); subscribeBase(); S.modal = null; toast('เริ่มข้อมูลทดลองใหม่แล้ว'); }),
  confirmOk: async () => { const fn = S._confirmFn; S._confirmFn = null; S.modal = null; scheduleRender(); if (fn) await fn(); },
  logout: async () => { if (Store.auth) await Store.auth.signOut(); },
  loginTab: el => { S.loginTab = el.dataset.t; S.loginErr = null; scheduleRender(); },
  forgot: async el => {
    const email = (el.closest('.card').querySelector('[name=email]') || {}).value || '';
    if (!email.trim()) { S.loginErr = 'กรอกอีเมลก่อน แล้วกด "ลืมรหัสผ่าน"'; return scheduleRender(); }
    try { await Store.auth.sendPasswordResetEmail(email.trim()); toast('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว'); } catch (e) { toast(authErr(e)); }
  }
};
const changeActions = {
  date: el => { if (el.value) { S.date = el.value; subscribeDate(); scheduleRender(); } },
  temp: el => saveTemp(el.dataset.id, el.value.trim()),
  heatIn: async el => {
    const { kind, k, f } = el.dataset; const id = `${kind}-${k}-${f}`;
    const v = el.value.trim() === '' ? null : num(el.value.trim().replace(',', '.'));
    if (el.value.trim() !== '' && v == null) return toast('ตัวเลขไม่ถูกต้อง');
    delete S.drafts[id];
    await Store.update(`${kind}/${S.date}/${k}`, Object.assign({ [f]: v }, stamp()));
    const r = (kind === 'heat' ? S.heat : S.dorm)[k]; const hi = slotHI(r);
    if (kind === 'heat' && hi != null && hi >= 40) toast(`${flagOf(hi).n}: ${flagOf(hi).note}`);
    if (kind === 'dorm' && hi != null && hi > 33) toast('โรงนอนเกิน 33 เปิดพัดลม/ระบายอากาศ');
  },
  import: el => { importFile(el.files[0]); el.value = ''; },
  intake: el => { intakeFile(el.files[0]); el.value = ''; },
  ordFile: el => { orderFile(el.files[0]); el.value = ''; },
  omrFile: el => { omrFile(el.files[0]); el.value = ''; },
  omrSet: el => { const O = S.omr; const f = el.dataset.f; O[f] = f === 'sqIdx' || f === 'page' ? +el.value : el.value; omrBuild(); scheduleRender(); },
  omrRow: el => { const x = S.omr.items[+el.dataset.i]; const f = el.dataset.f; if (el.type === 'checkbox') x[f] = el.checked; else if (f === 'u') x.u = el.value === '' ? null : +el.value; else x[f] = el.value; scheduleRender(); },
  ordSet: el => { S.ord[el.dataset.f] = el.checked; scheduleRender(); },
  inSet: el => { const f = el.dataset.f; S.intake[f] = el.type === 'checkbox' ? el.checked : el.value; scheduleRender(); },
  inRisk: el => { S.intake.over[el.dataset.k] = el.value; scheduleRender(); },
  pSet: el => { S.P[el.dataset.f] = el.value; scheduleRender(); },
  pChk: el => { S.P[el.dataset.f] = el.checked; scheduleRender(); },
  peSet: el => { S.pe[el.dataset.f] = el.value; },
  ceSet: el => { S.ce[el.dataset.f] = el.value; if (el.tagName === 'SELECT') scheduleRender(); },
  pdpaTick: el => { S.pdpaTick = el.checked; scheduleRender(); },
  setRole: async el => { await Store.set(`users/${el.dataset.uid}/role`, el.value || null); toast('บันทึกสิทธิ์แล้ว'); },
  demoRole: el => { S.me.role = el.value; localSet('carenst_demo_role', el.value); scheduleRender(); }
};
const inputActions = {
  search: el => { S.q = el.value; scheduleRender(); },
  temp: el => { S.drafts[`t-${el.dataset.id}`] = el.value; },
  heatIn: el => { S.drafts[`${el.dataset.kind}-${el.dataset.k}-${el.dataset.f}`] = el.value; },
  pSet: el => { S.P[el.dataset.f] = el.value; scheduleRender(); },
  peSet: el => { S.pe[el.dataset.f] = el.value; },
  ceSet: el => { S.ce[el.dataset.f] = el.value; }
};
const submitActions = {
  saveSoldier: async f => {
    const fd = new FormData(f); const o = {}; fd.forEach((v, k) => { o[k] = String(v).trim(); });
    if (!o.no || !o.fname) return toast('กรอกลำดับและชื่อ');
    ['no', 'age', 'h', 'w'].forEach(k => { if (o[k] !== '' && !isNaN(+o[k])) o[k] = +o[k]; });
    Object.keys(o).forEach(k => { if (o[k] === '') o[k] = null; });
    const id = f.dataset.id || ('n' + String(o.no).replace(/[.#$\[\]\/]/g, '_'));
    if (!f.dataset.id && S.soldiers[id]) return toast('ลำดับนี้มีอยู่แล้ว');
    await Store.update('soldiers/' + id, o); S.modal = null; toast('บันทึกแล้ว');
  },
  saveSettings: async f => {
    const fd = new FormData(f);
    const rds = fd.getAll('rounds'); if (!rds.length) return toast('เลือกรอบตรวจอย่างน้อย 1 รอบ');
    await Store.update('settings', { unit: String(fd.get('unit') || '').trim(), cohort: String(fd.get('cohort') || '').trim(), start: fd.get('start') || null, end: fd.get('end') || null, retain: Math.max(1, Math.min(365, +fd.get('retain') || 30)), dpo: String(fd.get('dpo') || '').trim().slice(0, 160) || null, wxName: String(fd.get('wxName') || '').trim().slice(0, 80) || null, wxLat: num(fd.get('wxLat')) || null, wxLon: num(fd.get('wxLon')) || null, rounds: rds });
    fetchWx(true);
    toast('บันทึกแล้ว');
  },
  login: async f => {
    const fd = new FormData(f); S.loginErr = null;
    try { await Store.auth.signInWithEmailAndPassword(String(fd.get('email')).trim(), fd.get('password')); } catch (e) { S.loginErr = authErr(e); scheduleRender(); }
  },
  register: async f => {
    const fd = new FormData(f); S.loginErr = null;
    try {
      const cred = await Store.auth.createUserWithEmailAndPassword(String(fd.get('email')).trim(), fd.get('password'));
      await Store.db.ref('users/' + cred.user.uid).set({ name: String(fd.get('name')).trim(), email: cred.user.email, at: Date.now() });
    } catch (e) { S.loginErr = authErr(e); scheduleRender(); }
  }
};
function authErr(e) {
  const c = (e && e.code) || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (c.includes('email-already-in-use')) return 'อีเมลนี้สมัครแล้ว ใช้แท็บเข้าสู่ระบบ';
  if (c.includes('weak-password')) return 'รหัสผ่านสั้นเกินไป';
  if (c.includes('too-many-requests')) return 'ลองผิดหลายครั้ง รอสักครู่แล้วลองใหม่';
  if (c.includes('network')) return 'ไม่มีอินเทอร์เน็ต';
  return (e && e.message) || 'เกิดข้อผิดพลาด';
}

function bindEvents() {
  const root = $('#root');
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el || !root.contains(el)) return;
    const fn = actions[el.dataset.act];
    if (fn && el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && el.tagName !== 'FORM') { if (el.tagName === 'BUTTON' && el.type === 'submit' && el.form) return; fn(el, e); }
  });
  root.addEventListener('change', e => { const el = e.target; const fn = el.dataset && changeActions[el.dataset.act]; if (fn) fn(el, e); });
  root.addEventListener('input', e => { const el = e.target; const fn = el.dataset && inputActions[el.dataset.act]; if (fn) fn(el, e); });
  root.addEventListener('submit', e => { const f = e.target; const fn = submitActions[f.dataset.act]; if (fn) { e.preventDefault(); fn(f); } });
  root.addEventListener('keydown', e => {
    // Enter ในช่องอุณหภูมิ → บันทึกแล้วไปคนถัดไป
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.act === 'temp') {
      e.preventDefault(); const ins = [...root.querySelectorAll('input[data-act=temp]')]; const i = ins.indexOf(e.target);
      e.target.blur(); if (ins[i + 1]) setTimeout(() => { const nx = document.getElementById(ins[i + 1].id); if (nx) nx.focus(); }, 30);
    }
    if (e.key === 'Escape' && S.modal) { S.modal = null; scheduleRender(); }
  });
}

/* ════════════════ การสมัครรับข้อมูล ════════════════ */
function subscribeDate() {
  dateSubs.forEach(u => u()); dateSubs = [];
  S._hLoaded = false; S._heatBase = false;
  ['health', 'heat', 'dorm'].forEach(k => dateSubs.push(Store.on(`${k}/${S.date}`, v => { S[k] = v || {}; if (k === 'health') { S._hLoaded = true; setTimeout(() => maybeBrief(false), 1200); } if (k === 'heat') checkHeatChange(); scheduleRender(); })));
}
function subscribeBase() {
  baseSubs.forEach(u => u()); baseSubs = []; S._allSub = null;
  baseSubs.push(Store.on('settings', v => { S.settings = v || {}; scheduleRender(); }));
  baseSubs.push(Store.on('soldiers', v => { S.soldiers = v || {}; scheduleRender(); }));
  baseSubs.push(Store.on('punish', v => { S.punish = v || {}; scheduleRender(); }));
  if (can('priv')) baseSubs.push(Store.on('private', v => { S.priv = v || {}; scheduleRender(); }));
  if (can('priv')) baseSubs.push(Store.on('cases', v => { S.cases = v || {}; scheduleRender(); }));
  if (can('admin')) baseSubs.push(Store.on('audit', v => { S.audit = v || {}; scheduleRender(); }));
  if (S.view === 'weekly') ensureAllHealth();
  if (can('admin') && Store.mode === 'firebase') baseSubs.push(Store.on('users', v => { S.users = v || {}; scheduleRender(); }));
  subscribeDate();
}

/* ════════════════ ข้อมูลตัวอย่าง (สมมติทั้งหมด) ════════════════ */
function seedDemo() {
  const t = todayStr();
  const names = ['กิตติ', 'ชัยวัฒน์', 'ณัฐพล', 'ธนากร', 'ปิยะ', 'พงศกร', 'ภานุ', 'วีรยุทธ', 'ศุภชัย', 'สิทธิชัย', 'อนุชา', 'อภิชาต',
    'จักรพันธ์', 'ธีรวัฒน์', 'นพดล', 'ประเสริฐ', 'วรวุฒิ', 'สมพงษ์', 'สุริยา', 'อำนาจ', 'เกียรติศักดิ์', 'ชนาธิป', 'ทศพล', 'บุญมี'];
  const sol = {};
  names.forEach((n, i) => {
    const no = i + 1; const h = 160 + (i * 7) % 25; const w = i === 5 ? 104 : i === 11 ? 92 : 52 + (i * 11) % 30;
    sol['n' + no] = { no, rank: 'พลฯ', fname: n, lname: 'สมมติ', nick: '', squad: Math.floor(i / 8) + 1, age: 18 + (i % 7), h, w,
      risk: i === 3 ? 'red' : (i === 9 || i === 17) ? 'yellow' : (i % 6 === 0) ? 'green' : 'none', buddy: 'B' + (Math.floor(i / 3) + 1) };
  });
  const health = {}; health[t] = { '0500': {} };
  Object.keys(sol).forEach((id, i) => { if (i < 20) health[t]['0500'][id] = { t: i === 7 ? 37.6 : i === 14 ? 37.0 : Math.round((36.2 + (i % 5) / 10) * 10) / 10, u: i === 19 ? 4 : i === 2 ? 3 : i % 3, by: 'demo', byName: 'ตัวอย่าง', at: Date.now() }; });
  // ประวัติย้อนหลัง 9 วัน (สมมติ) ให้หน้าสรุปรายสัปดาห์มีข้อมูล
  const ill = { n8: [-3, -2, -1], n15: [-8, -7, -3], n3: [-6, -5], n11: [-1] }, dark = { n20: [-4, -2, -1], n4: [-5] }, rising = { n8: [-6, -5, -4] };
  for (let k = -9; k <= -1; k++) {
    const d = addDays(t, k); health[d] = {};
    ALL_ROUNDS.forEach((rd, ri) => { health[d][rd] = {}; Object.keys(sol).forEach((id, i) => {
      let tt = Math.round((36.1 + ((i + k + ri) % 5) / 10) * 10) / 10, u = (i + k) % 3;
      if ((rising[id] || []).includes(k)) tt = 36.8 + (k + 6) * 0.15;
      if ((ill[id] || []).includes(k)) tt = 37.6 + (ri === 1 ? 0.3 : 0);
      if ((dark[id] || []).includes(k) && ri === 1) u = 3;
      const rec = { t: Math.round(tt * 10) / 10, u, by: 'demo', byName: 'ตัวอย่าง', at: Date.now() };
      if ((ill[id] || []).includes(k) && ri === 0) rec.doc = true;
      health[d][rd][id] = rec;
    }); });
  }
  const cases = {
    c1: { sid: 'n3', start: addDays(t, -6), symptom: 'ไข้ ไอ เจ็บคอ', sent: 'ห้องพยาบาลหน่วย', treat: 'ยาลดไข้ ยาแก้ไอ พักในโรงนอน 2 วัน', status: 'recovered', cause: 'ได้ยาลดไข้ + พัก 2 วัน ดื่มน้ำ ไข้ลดเอง', end: addDays(t, -4), by: 'demo', byName: 'เสนารักษ์ (ตัวอย่าง)', at: Date.now() },
    c2: { sid: 'n15', start: addDays(t, -8), symptom: 'ท้องเสีย', sent: 'เสนารักษ์', treat: 'ผงเกลือแร่ งดฝึกกลางแจ้ง 1 วัน', status: 'recovered', cause: 'เกลือแร่ + งดฝึก 1 วัน', end: addDays(t, -6), by: 'demo', byName: 'เสนารักษ์ (ตัวอย่าง)', at: Date.now() },
    c3: { sid: 'n8', start: addDays(t, -3), symptom: 'ไข้สูง ปวดเมื่อยตัว', sent: 'รพ.ค่าย', treat: 'ตรวจเลือด ยาลดไข้ พักฟื้น 3 วัน', status: 'open', by: 'demo', byName: 'เสนารักษ์ (ตัวอย่าง)', at: Date.now() }
  };
  Store.tree = {
    settings: { unit: 'หน่วยฝึกทหารใหม่ (ตัวอย่าง)', cohort: '2/69', start: addDays(t, -10), rounds: ALL_ROUNDS.slice() },
    soldiers: sol, health, cases,
    heat: { [t]: { '0800': { temp: 30, rh: 75 }, '1000': { temp: 34, rh: 60 } } },
    dorm: {}, punish: {}
  };
  Store._persist();
}

/* ════════════════ เริ่มระบบ ════════════════ */
async function boot() {
  applyTheme(); bindEvents();
  // เปลี่ยนวันอัตโนมัติเมื่อข้ามเที่ยงคืน (ถ้ากำลังดูวันนี้) และอัปเดตเวลาที่ใช้ตรวจเกณฑ์
  S._lastToday = todayStr();
  try { S.wx = JSON.parse(localGet('carenst_wx') || 'null'); } catch (e) { S.wx = null; }
  fetchWx();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fetchWx(); });
  setInterval(() => { if (!S.wx || Date.now() - (S.wx.at || 0) > 20 * 60000) fetchWx(); checkWxAlert(); const t = todayStr(); if (S._lastToday !== t && S.date === S._lastToday) { S.date = t; subscribeDate(); } S._lastToday = t; if (S.view === 'punish' || S.view === 'dash') scheduleRender(); if (nowHM() >= '08:00') maybeBrief(false); }, 60000);
  if ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(() => {}); }
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg) {
    Store.mode = 'demo';
    let saved = null; try { saved = JSON.parse(localStorage.getItem('carenst_demo') || 'null'); } catch (e) {}
    if (saved && saved.soldiers) Store.tree = saved; else seedDemo();
    const role = localGet('carenst_demo_role');
    S.me = { uid: 'demo', name: 'ผู้ทดลองระบบ', role: ROLES[role] ? role : 'trainer' };
    subscribeBase(); render(); return;
  }
  Store.mode = 'firebase'; S.authLoading = true; render();
  const V = '10.12.5', base = `https://www.gstatic.com/firebasejs/${V}/`;
  try {
    await loadScript(base + 'firebase-app-compat.js');
    await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
  } catch (e) { $('#root').innerHTML = '<div class="empty" style="padding-top:30vh">โหลดระบบไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่</div>'; return; }
  firebase.initializeApp(cfg);
  Store.db = firebase.database(); Store.auth = firebase.auth();
  let meUnsub = null;
  Store.auth.onAuthStateChanged(user => {
    if (meUnsub) { meUnsub(); meUnsub = null; }
    baseSubs.forEach(u => u()); baseSubs = []; dateSubs.forEach(u => u()); dateSubs = [];
    S.authLoading = false;
    if (!user) { S.me = null; render(); return; }
    S.me = { uid: user.uid, email: user.email, name: '', role: null };
    const ref = Store.db.ref('users/' + user.uid);
    const h = snap => {
      const u = snap.val() || {}; const prevRole = S.me && S.me.role;
      S.me = { uid: user.uid, email: user.email, name: u.name || user.email, role: u.role || null, pdpaAt: u.pdpaAt || null };
      if (S.me.role !== prevRole) { baseSubs.forEach(x => x()); baseSubs = []; if (ROLES[S.me.role]) subscribeBase(); }
      scheduleRender();
    };
    ref.on('value', h); meUnsub = () => ref.off('value', h);
  });
}

// สำหรับทดสอบอัตโนมัติ
window.__CARE = { heatIndexC, flagOf, statusOf, S, Store, parseDivision, analyzeIntake, omrSheetsHTML, omrRoster, OMR };
boot();
})();
