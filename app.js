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
  me: null, settings: {}, soldiers: {}, priv: {}, reveal: {}, health: {}, heat: {}, dorm: {}, punish: {}, users: {}, hAll: {}, cases: {},
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
function squads() { return [...new Set(soldierList().map(s => s.squad).filter(v => v !== '' && v != null))].sort((a, b) => (+a) - (+b)); }

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
    <div class="seg" role="tablist">${rds.map(r => `<button data-act="round" data-r="${r}" class="${r === rd ? 'on' : ''}">${rl(r)} น.</button>`).join('')}</div></div>
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

/* ════════════════ หน้า: ทะเบียนทหารใหม่ ════════════════ */
function viewSoldiers() {
  const list = soldierList(); const q = S.q.trim().toLowerCase();
  const shown = list.filter(s => (S.squad === 'all' || String(s.squad) === String(S.squad)) && (!q || (fullName(s) + ' ' + s.no).toLowerCase().includes(q)));
  const admin = can('admin');
  return `
  <div class="page-h"><div><h1>ทหารใหม่</h1><div class="muted small">${list.length} นาย · ${squads().length} หมู่ฝึก</div></div>
    ${admin ? `<div class="row"><button class="btn" data-act="tpl">${ic('dl')}แบบฟอร์ม Excel</button>
      <label class="btn primary">${ic('ul')}นำเข้าข้อมูลแรกรับ (กองพล)<input type="file" accept=".csv,.xlsx,.xls" data-act="intake" hidden></label>
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
    ${Object.keys(p).length ? `<dl class="kv">${row('เลขบัตรประชาชน', mask(p.cid))}${row('เบอร์โทร', mask(p.phone))}${row('ที่อยู่', show ? esc(p.addr || '-') : (p.addr ? '••••' : '-'))}${row('โรคประจำตัว', esc(p.disease || '-'))}${row('สารเสพติด', show ? esc([p.drug, p.urine && 'ผลปัสสาวะ: ' + p.urine].filter(Boolean).join(' · ') || '-') : '••••')}${row('สุขภาพจิต', show ? esc([p.psych, p.dep].filter(Boolean).join(' · ') || '-') : '••••')}</dl>` : '<div class="small muted">ยังไม่มีข้อมูล นำเข้าจากระบบกองพลเพื่อเติม</div>'}
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
  else if (s.risk === 'green') { sc += 1; why.push('กลุ่มเสี่ยงแรกรับสีเขียว'); }
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
    S.modal = null; S.ce = null; toast('บันทึกเคสแล้ว');
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
  11: ['ดัชนีมวลกาย', 'BMI'], 13: ['โรคประจำตัว'], 19: ['จิตเวช'], 20: ['ซึมเศร้า'], 27: ['แอลกอฮอล์'], 28: ['สารเสพติด'], 29: ['ปัสสาวะ'],
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
  if (bmi != null && bmi < 30 && (bmi >= 28 || bmi < 18)) { up('green'); why.push(`BMI ${bmi}`); store.push(`BMI ${bmi}`); }
  const alc = String(get(27) || ''), drug = String(get(28) || ''), urine = String(get(29) || '');
  const beh = [];
  if (alc.includes('ประจำ')) beh.push('ดื่มแอลกอฮอล์ประจำ');
  if (!drug.trim().startsWith('ไม่เคย') && /เคยใช้|ยังคงใช้|ยังใช้/.test(drug)) beh.push('ประวัติใช้สารเสพติด');
  if (urine.trim() === 'ตรวจพบ') beh.push('ปัสสาวะพบสารเสพติด');
  if (beh.length) { up('green'); why.push(beh.join(', ')); store.push('ปัจจัยพฤติกรรม (ดูแฟ้มต้นฉบับ)'); }
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
      disease: tx(13), drug: tx(28), urine: tx(29), psych: tx(19), dep: tx(20) };
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
      <div class="card stat ok"><div class="k">เขียว</div><div class="v num">${cnt('green')}</div><div class="s">เฝ้าระวังพิเศษ</div></div>
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
    <p class="tiny muted" style="margin:12px 0 0">ข้อมูลทั่วไป (ทุกบทบาทเห็น): ยศ ชื่อ สกุล ชื่อเล่น อายุ ส่วนสูง น้ำหนัก สีกลุ่มเสี่ยง เหตุผลแบบทั่วไป · ข้อมูลส่วนบุคคล (เฉพาะผู้ฝึก ผบ.หน่วยฝึก เสนารักษ์): เลขบัตร เบอร์โทร ที่อยู่ ชื่อโรค ประวัติสารเสพติด ข้อมูลจิตเวช · นำเข้าซ้ำได้ ระบบจับคู่ตาม ID ของกองพล</p>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-act="close">ยกเลิก</button><button class="btn primary" data-act="inConfirm" ${sel.length ? '' : 'disabled'}>นำเข้า ${sel.length} นาย</button></div>
  </div></div>`;
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
    const pu = {}; recs.forEach(r => { const o = {}; Object.keys(r.p || {}).forEach(f => { if (r.p[f]) o[f] = r.p[f]; }); o.at = Date.now(); pu[r.id] = o; });
    await Store.update('private', pu);
  }
  S.modal = null; S.intake = null; toast(`นำเข้า ${recs.length} นายแล้ว`);
}


/* ════════════════ แจ้งเตือน: สรุปเช้านี้ + ธงความร้อนเปลี่ยน ════════════════ */
const LV_COLOR = [
  { k: 'none', n: 'ไม่มีสี', d: 'ฝึกปกติ' },
  { k: 'green', n: 'เขียว', d: 'ฝึกปกติ เฝ้าระวังพิเศษ' },
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
  return `<div class="popalert alert ${tone}" role="alert"><i class="fl fl-${a.flag.k}" style="width:34px;height:24px;flex:0 0 34px;border-radius:4px;border:1px solid rgba(0,0,0,.3)"></i><div style="flex:1;min-width:0"><b>ธงความร้อนเปลี่ยน${a.prev ? ` จาก${a.prev.n}` : ''} เป็น${a.flag.n}</b>ดัชนี ${a.hi} (${hm(a.slot)} น.) · ดื่มน้ำ ${a.flag.water} · ${a.flag.wr}${a.flag.note ? ' · <b style="display:inline">' + a.flag.note + '</b>' : ''}</div><button class="btn sm" data-act="heatOk">รับทราบ</button></div>`;
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
  copyWeek: async () => { const t = weekText(); try { await navigator.clipboard.writeText(t); toast('คัดลอกแล้ว'); } catch (e) { toast('คัดลอกไม่ได้'); } },
  caseNew: el => caseModal(null, el.dataset.sid || ''),
  caseEdit: el => caseModal(el.dataset.id),
  ceSent: el => { S.ce.sent = S.ce.sent === el.dataset.v ? '' : el.dataset.v; scheduleRender(); },
  ceStatus: el => { S.ce.status = el.dataset.v; scheduleRender(); },
  caseSave: () => caseSave(),
  caseDel: el => { const id = el.dataset.id; askConfirm('ลบเคสผู้ป่วยนี้?', 'ลบ', async () => { try { await Store.set('cases/' + id, null); S.ce = null; toast('ลบเคสแล้ว'); } catch (e) { toast('ลบไม่ได้: ' + (e.code || e.message)); } }); },
  reveal: el => { const id = el.dataset.id; S.reveal[id] = !S.reveal[id]; soldierModal(id); },
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
  xlsReport: exportReport,
  theme: el => { localSet('carenst_theme', el.dataset.t === 'auto' ? '' : el.dataset.t); applyTheme(); scheduleRender(); },
  wipeAll: () => askConfirm('ล้างข้อมูลทั้งหมด? รายชื่อ สุขภาพ ความร้อน บันทึกลงโทษ และสิทธิ์ผู้ใช้อื่นจะถูกลบถาวร เหลือบัญชีคุณคนเดียว', 'ล้างข้อมูลทั้งหมด', async () => {
    try {
      for (const k of ['private', 'cases', 'soldiers', 'health', 'heat', 'dorm', 'punish']) await Store.set(k, null);
      const others = Object.keys(S.users || {}).filter(uid => uid !== S.me.uid && S.users[uid].role);
      for (const uid of others) await Store.set(`users/${uid}/role`, null);
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
  inSet: el => { const f = el.dataset.f; S.intake[f] = el.type === 'checkbox' ? el.checked : el.value; scheduleRender(); },
  inRisk: el => { S.intake.over[el.dataset.k] = el.value; scheduleRender(); },
  pSet: el => { S.P[el.dataset.f] = el.value; scheduleRender(); },
  pChk: el => { S.P[el.dataset.f] = el.checked; scheduleRender(); },
  peSet: el => { S.pe[el.dataset.f] = el.value; },
  ceSet: el => { S.ce[el.dataset.f] = el.value; if (el.tagName === 'SELECT') scheduleRender(); },
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
    await Store.update('settings', { unit: String(fd.get('unit') || '').trim(), cohort: String(fd.get('cohort') || '').trim(), start: fd.get('start') || null, rounds: rds });
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
  setInterval(() => { const t = todayStr(); if (S._lastToday !== t && S.date === S._lastToday) { S.date = t; subscribeDate(); } S._lastToday = t; if (S.view === 'punish' || S.view === 'dash') scheduleRender(); if (nowHM() >= '08:00') maybeBrief(false); }, 60000);
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
      S.me = { uid: user.uid, email: user.email, name: u.name || user.email, role: u.role || null };
      if (S.me.role !== prevRole) { baseSubs.forEach(x => x()); baseSubs = []; if (ROLES[S.me.role]) subscribeBase(); }
      scheduleRender();
    };
    ref.on('value', h); meUnsub = () => ref.off('value', h);
  });
}

// สำหรับทดสอบอัตโนมัติ
window.__CARE = { heatIndexC, flagOf, statusOf, S, Store, parseDivision, analyzeIntake };
boot();
})();
