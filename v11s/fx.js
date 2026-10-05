import { db, rank, doc, getDocs, setDoc, collection, serverTimestamp, increment, Timestamp, writeBatch } from "./lib.js";
import { h, norm, toD, isF, nm } from "./app.js";

/* ---------- الحالة الاجتماعية حسب الجنس ---------- */
export const MS_KEYS = ["Single", "Married", "Divorced", "Widowed"];
const MS_M = { Single: "أعزب", Married: "متزوج", Divorced: "مطلق", Widowed: "أرمل" };
const MS_F = { Single: "عزباء", Married: "متزوجة", Divorced: "مطلقة", Widowed: "أرملة" };
export const statusLabelBy = (female, k) => (female ? MS_F : MS_M)[k] || k || "";
export const statusLabel = (m) => statusLabelBy(isF(m), m.maritalStatus || "Single");
export const GENDER = (m) => (isF(m) ? "أنثى" : "ذكر");

export function ageOf(m) {
  const b = toD(m.birthDate); if (!b || isNaN(b)) return null;
  const e = m.isAlive === false ? toD(m.deathDate) : new Date(); if (!e || isNaN(e)) return null;
  let a = e.getFullYear() - b.getFullYear(); const md = e.getMonth() - b.getMonth();
  if (md < 0 || (md === 0 && e.getDate() < b.getDate())) a--; return Math.max(0, a);
}

/* ---------- البيانات الخاصة (جوال/هوية) ---------- */
export async function loadPrivate(S) {
  if (S.role !== "admin") return new Map();
  try { const s = await getDocs(collection(db, "familyPrivate")); return new Map(s.docs.map((d) => [d.id, d.data()])); } catch (e) { console.warn(e); return new Map(); }
}
export function mergePrivate(all, pm) {
  all.forEach((m) => { const p = pm.get(m.id); if (p) { if (p.phoneNumber !== undefined) m.phoneNumber = p.phoneNumber; if (p.idNumber !== undefined) m.idNumber = p.idNumber; } });
  return all;
}

/* ---------- صلاحية الفرع ---------- */
export function canEditPerson(S, m) {
  if (rank[S.role] < 2) return false; if (S.role === "admin") return true;
  const b = S.branchPermissions || []; if (!b.length) return true;
  return (m.allTags || m.tags || []).some((t) => b.includes(t));
}

/* ---------- المساهمون ---------- */
export async function bump(S, field, n = 1) {
  try { await setDoc(doc(db, "contribStats", S.user.uid), { name: (S.user.displayName || S.user.email || "عضو").split("@")[0], [field]: increment(n), updatedAt: serverTimestamp() }, { merge: true }); } catch (e) { console.warn(e); }
}

/* ---------- الفلاتر المتقدمة (بحث + تصدير) ---------- */
export const FILTER_KEY = "family-adv-filters";
export const emptyFilters = () => ({ q: "", gender: "", ageMin: "", ageMax: "", marital: [], life: "", tag: "", displaced: "", place: "", camp: "", phone: "", orphan: false, outside: false, kids: "", idsOnly: false });
export function loadFilters() { try { return { ...emptyFilters(), ...JSON.parse(localStorage.getItem(FILTER_KEY) || "{}"), idsOnly: false }; } catch (e) { return emptyFilters(); } }
export function saveFilters(s) { try { localStorage.setItem(FILTER_KEY, JSON.stringify(s)); } catch (e) {} }
export function filtersActive(s) { const e = emptyFilters(); return Object.keys(e).some((k) => k !== "idsOnly" && JSON.stringify(s[k]) !== JSON.stringify(e[k])); }
export function applyFilters(list, s, all = list, ids = null) {
  const by = new Map(all.map((m) => [m.id, m])), kc = new Map();
  all.forEach((m) => [m.fatherId, m.motherId].forEach((p) => p && kc.set(p, (kc.get(p) || 0) + 1)));
  const q = norm(s.q || ""), amin = s.ageMin === "" ? null : +s.ageMin, amax = s.ageMax === "" ? null : +s.ageMax;
  return list.filter((m) => {
    if (ids && s.idsOnly && !ids.has(m.id)) return false;
    if (q && !norm([m.fullName, m.fatherName, m.motherName, m.displacedPlace, m.campName, (m.allTags || []).join(" ")].join(" ")).includes(q)) return false;
    if (s.gender && (s.gender === "f") !== isF(m)) return false;
    const a = ageOf(m);
    if (amin !== null && (a === null || a < amin)) return false;
    if (amax !== null && (a === null || a > amax)) return false;
    if (s.marital.length && !s.marital.includes(m.maritalStatus || "Single")) return false;
    if (s.life && (s.life === "dead") !== (m.isAlive === false)) return false;
    if (s.tag && !(m.allTags || m.tags || []).includes(s.tag)) return false;
    if (s.displaced && (s.displaced === "yes") !== (m.displaced === true)) return false;
    if (s.place && norm(m.displacedPlace || "") !== norm(s.place)) return false;
    if (s.camp && norm(m.campName || "") !== norm(s.camp)) return false;
    if (s.phone && (s.phone === "yes") !== !!m.phoneNumber) return false;
    if (s.orphan) { const f = by.get(m.fatherId); if (!(a !== null && a < 18 && f && f.isAlive === false && m.isAlive !== false)) return false; }
    if (s.outside && !m.marriedOutside) return false;
    if (s.kids && (s.kids === "yes") !== ((kc.get(m.id) || 0) > 0)) return false;
    return true;
  });
}
const PRESETS = [["👶 الأطفال (أقل من 18)", { ageMax: "17" }], ["🍼 أقل من 5 سنوات", { ageMax: "4" }], ["🧑 الشباب 18–35", { ageMin: "18", ageMax: "35" }], ["👴 كبار السن 60+", { ageMin: "60" }], ["👨 الرجال", { gender: "m", ageMin: "18" }], ["👩 النساء", { gender: "f", ageMin: "18" }], ["الأرامل والمطلقات", { gender: "f", marital: ["Widowed", "Divorced"] }], ["👩‍🦳 الأرامل فقط", { marital: ["Widowed"] }], ["💍 المتزوجون", { marital: ["Married"] }], ["🏕 النازحون", { displaced: "yes" }], ["🕊 الأيتام", { orphan: true }]];
export function renderFilters(box, all, s, onChange, extra = null) {
  box.replaceChildren();
  const emit = () => { saveFilters(s); onChange(s); };
  const redraw = () => { renderFilters(box, all, s, onChange, extra); emit(); };
  const uniq = (f) => [...new Set(all.map(f).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "ar"));
  const tags = [...new Set(all.flatMap((m) => m.allTags || m.tags || []))].sort(), places = uniq((m) => m.displacedPlace), camps = uniq((m) => m.campName);
  const wrap = (label, el) => { const w = h("div"); w.append(h("label", "l", label), el); return w; };
  const sel = (key, opts) => { const e = h("select"); opts.forEach(([v, t]) => e.add(new Option(t, v))); e.value = s[key]; e.onchange = () => { s[key] = e.value; emit(); if (key === "gender") redraw(); }; return e; };
  const inp = (key, type, ph) => { const e = h("input"); e.type = type; e.placeholder = ph || ""; e.value = s[key]; e.oninput = () => { s[key] = e.value; emit(); }; return e; };
  const pre = h("div", "rels"); pre.style.marginBottom = "10px";
  PRESETS.forEach(([t, o]) => { const b = h("button", "btn", t); b.type = "button"; b.onclick = () => { Object.assign(s, o); redraw(); }; pre.append(b, " "); });
  const clr = h("button", "btn red", "✖ مسح كل الفلاتر"); clr.type = "button"; clr.onclick = () => { Object.assign(s, emptyFilters()); redraw(); }; pre.append(clr);
  box.append(pre);
  const g = h("div", "g");
  g.append(wrap("بحث (اسم/مكان/مخيم)", inp("q", "search", "اكتب للبحث…")),
    wrap("الجنس", sel("gender", [["", "الكل"], ["m", "رجال / ذكور"], ["f", "نساء / إناث"]])),
    wrap("العمر من", inp("ageMin", "number", "0")), wrap("العمر إلى", inp("ageMax", "number", "120")),
    wrap("الحياة", sel("life", [["", "الكل"], ["alive", "أحياء"], ["dead", "متوفون"]])),
    wrap("الفرع / الفئة", sel("tag", [["", "الكل"], ...tags.map((t) => [t, t])])),
    wrap("النزوح", sel("displaced", [["", "الكل"], ["yes", "نازحون"], ["no", "غير نازحين"]])),
    wrap("مكان النزوح", sel("place", [["", "الكل"], ...places.map((t) => [t, t])])),
    wrap("المخيم", sel("camp", [["", "الكل"], ...camps.map((t) => [t, t])])),
    wrap("لديه أبناء", sel("kids", [["", "الكل"], ["yes", "نعم"], ["no", "لا"]])));
  if (rank.editor !== undefined) g.append(wrap("رقم جوال مسجّل", sel("phone", [["", "الكل"], ["yes", "نعم"], ["no", "لا"]])));
  box.append(g);
  const ms = h("div", "row"); ms.style.marginTop = "10px"; ms.append(h("b", "", "الحالة الاجتماعية (اختيار أكثر من حالة): "));
  MS_KEYS.forEach((k) => {
    const lb = h("label", "chk"), c = document.createElement("input"); c.type = "checkbox"; c.checked = s.marital.includes(k);
    c.onchange = () => { s.marital = c.checked ? [...new Set([...s.marital, k])] : s.marital.filter((x) => x !== k); emit(); };
    const txt = s.gender === "f" ? MS_F[k] : s.gender === "m" ? MS_M[k] : MS_M[k] + " / " + MS_F[k]; lb.append(c, txt); ms.append(lb);
  });
  box.append(ms);
  const fl = h("div", "row"); fl.style.marginTop = "8px";
  [["orphan", "🕊 الأيتام فقط (أقل من 18 ووالدهم متوفى)"], ["outside", "💍 المتزوجون من خارج العائلة"]].forEach(([k, t]) => { const lb = h("label", "chk"), c = document.createElement("input"); c.type = "checkbox"; c.checked = !!s[k]; c.onchange = () => { s[k] = c.checked; emit(); }; lb.append(c, t); fl.append(lb); });
  if (extra) fl.append(extra);
  box.append(fl);
}

/* ---------- تنبيهات ---------- */
export function nextBirthdays(all, days = 7) {
  const n = new Date(), t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return all.filter((m) => m.isAlive !== false && toD(m.birthDate)).map((m) => {
    const b = toD(m.birthDate); let d = new Date(t0.getFullYear(), b.getMonth(), b.getDate()); if (d < t0) d.setFullYear(d.getFullYear() + 1);
    return { m, d, left: Math.round((d - t0) / 864e5), turns: d.getFullYear() - b.getFullYear() };
  }).filter((x) => x.left <= days).sort((a, b) => a.left - b.left);
}
export function browserNotify(title, body, key) {
  try {
    const k = "notif-" + key + "-" + new Date().toISOString().slice(0, 10); if (localStorage.getItem(k)) return false;
    if (!("Notification" in window) || Notification.permission !== "granted") return false;
    new Notification(title, { body, icon: "icon-192.png" }); localStorage.setItem(k, "1"); return true;
  } catch (e) { return false; }
}
export const GREET_KEY = "family-greet-tpl";
export const DEFAULT_GREET = "كل عام وأنت بخير يا {name} 🎂\nبمناسبة بلوغك {age} عامًا نسأل الله لك العمر المديد والصحة والسعادة. عائلتك تحبك ❤️";
export const greetText = (x) => (localStorage.getItem(GREET_KEY) || DEFAULT_GREET).replaceAll("{name}", x.m.firstName || nm(x.m)).replaceAll("{full}", nm(x.m)).replaceAll("{age}", String(x.turns));

/* ---------- النسخ الاحتياطي ---------- */
export const BK = ["familyMembers", "familyPrivate", "events", "familyMedia", "familyStories", "mukhtars", "familyDocs", "polls", "meetings", "funds", "exportTemplates", "contribStats", "contributions", "settings"];
const RESTORE = ["familyMembers", "familyPrivate", "events", "familyMedia", "familyStories", "mukhtars", "familyDocs", "polls", "meetings", "funds", "exportTemplates"];
const ser = (v) => { if (v && typeof v.toMillis === "function" && v.seconds !== undefined) return { __ts: v.toMillis() }; if (Array.isArray(v)) return v.map(ser); if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ser(x)])); return v; };
const deser = (v) => { if (v && typeof v === "object") { if (!Array.isArray(v) && Object.keys(v).length === 1 && "__ts" in v) return Timestamp.fromMillis(v.__ts); if (Array.isArray(v)) return v.map(deser); return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deser(x)])); } return v; };
export async function buildBackup() {
  const out = { app: "family-site", version: 1, at: new Date().toISOString(), data: {} };
  for (const c of BK) { try { const s = await getDocs(collection(db, c)); out.data[c] = Object.fromEntries(s.docs.map((d) => [d.id, ser(d.data())])); } catch (e) { out.data[c] = { __error: e.code || String(e) }; } }
  return out;
}
export function downloadFile(content, name, type = "application/json") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
export async function runBackup(S) {
  const b = await buildBackup(); downloadFile(JSON.stringify(b), "family-backup-" + new Date().toISOString().slice(0, 10) + ".json");
  await setDoc(doc(db, "settings", "backup"), { lastAt: serverTimestamp(), lastBy: S.user.uid }, { merge: true }); return b;
}
export async function restoreBackup(obj, onProgress = () => {}) {
  if (!obj || !obj.data) throw Error("ملف النسخة غير صالح");
  let ok = 0, bad = 0;
  for (const c of RESTORE) {
    const d = obj.data[c]; if (!d || d.__error) continue;
    const ids = Object.keys(d);
    for (let i = 0; i < ids.length; i += 400) {
      const b = writeBatch(db); ids.slice(i, i + 400).forEach((id) => b.set(doc(db, c, id), deser(d[id])));
      try { await b.commit(); ok += Math.min(400, ids.length - i); } catch (e) { console.warn(c, e); bad += Math.min(400, ids.length - i); }
      onProgress(c, ok, bad);
    }
  }
  return { ok, bad };
}

/* ---------- حاسبة القرابة ---------- */
export function relationLabel(all, a, b) {
  const by = new Map(all.map((m) => [m.id, m]));
  if (a.id === b.id) return "نفس الشخص";
  if ((a.spouseIds || []).includes(b.id) || (b.spouseIds || []).includes(a.id)) return isF(b) ? "زوجة" : "زوج";
  const anc = (id) => { const res = new Map([[id, [id]]]); let fr = [id]; while (fr.length) { const nx = []; for (const x of fr) { const m = by.get(x); if (!m) continue; for (const p of [m.fatherId, m.motherId]) if (p && by.has(p) && !res.has(p)) { res.set(p, [...res.get(x), p]); nx.push(p); } } fr = nx; } return res; };
  const A = anc(a.id), B = anc(b.id); let best = null;
  for (const [id, pa] of A) { const pb = B.get(id); if (pb) { const s = pa.length + pb.length; if (!best || s < best.s) best = { s, pa, pb }; } }
  if (!best) return null;
  const da = best.pa.length - 1, db2 = best.pb.length - 1, fb = isF(b), P = by.get(best.pa[1]), X = by.get(best.pb[1]);
  if (da === 0) return db2 === 1 ? (fb ? "ابنة" : "ابن") : db2 === 2 ? (fb ? "حفيدة" : "حفيد") : (fb ? "من الحفيدات" : "من الأحفاد") + ` (الجيل ${db2})`;
  if (db2 === 0) { const side = da >= 2 && P ? (isF(P) ? " من جهة الأم" : " من جهة الأب") : ""; return da === 1 ? (fb ? "أم" : "أب") : da === 2 ? (fb ? "جدة" : "جد") + side : (fb ? "جدة" : "جد") + ` (الجيل ${da})` + side; }
  if (da === 1 && db2 === 1) { const fa = a.fatherId && a.fatherId === b.fatherId, mo = a.motherId && a.motherId === b.motherId; if (fa && mo) return fb ? "شقيقة" : "شقيق"; if (fa) return fb ? "أخت لأب" : "أخ لأب"; return fb ? "أخت لأم" : "أخ لأم"; }
  if (da === 1) return db2 === 2 && X ? (isF(X) ? (fb ? "ابنة أخت" : "ابن أخت") : (fb ? "ابنة أخ" : "ابن أخ")) : `من نسل أخ/أخت (الجيل ${db2})`;
  if (db2 === 1) return da === 2 && P ? (!isF(P) ? (fb ? "عمة" : "عم") : (fb ? "خالة" : "خال")) : `${fb ? "أخت" : "أخ"} لأحد أجدادك (الجيل ${da - 1})`;
  if (da === 2 && db2 === 2 && P && X) { if (!isF(P)) return isF(X) ? (fb ? "بنت عمة" : "ابن عمة") : (fb ? "بنت عم" : "ابن عم"); return isF(X) ? (fb ? "بنت خالة" : "ابن خالة") : (fb ? "بنت خال" : "ابن خال"); }
  const ca = by.get(best.pa[best.pa.length - 1]);
  return `قرابة بعيدة (يلتقيان عند ${ca ? nm(ca) : "جد مشترك"} — ${da} و${db2} أجيال)`;
}
