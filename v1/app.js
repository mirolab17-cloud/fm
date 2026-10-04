import { session, rank, page, copyTracked, signOut, auth } from "./lib.js";
export * from "./lib.js";
export const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
export const $ = (s, r = document) => r.querySelector(s);
export const norm = (s) => (s || "").replace(/[\u064B-\u065F\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").toLowerCase();
export const isF = (m) => /^(f|أ)/i.test(m.gender || "");
export const toD = (v) => (v ? (v.toDate ? v.toDate() : new Date(v)) : null);
export const yr = (v) => { const d = toD(v); return d && !isNaN(d) ? d.getFullYear() : null; };
export const fmtD = (v) => { const d = toD(v); return d && !isNaN(d) ? d.toLocaleDateString("ar-EG") : ""; };
export const iso = (v) => { const d = toD(v); return d && !isNaN(d) ? d.toISOString().slice(0, 10) : ""; };
export const nm = (m) => m.fullName || m.firstName || "—";
export const life = (m) => { const b = yr(m.birthDate), d = yr(m.deathDate); return m.isAlive === false ? `${b || "؟"} – ${d || "؟"}` : b ? `مواليد ${b}` : ""; };
export function avatar(m, cls = "") {
  const d = h("div", "av " + cls + (isF(m) ? " f" : "")), u = m.photoUrl || m.photoURL;
  if (u) { const i = h("img"); i.src = u; i.alt = ""; i.loading = "lazy"; d.appendChild(i); } else d.textContent = (m.firstName || m.fullName || "؟").trim().charAt(0);
  return d;
}
export function pcard(m) {
  const a = h("a", "pc" + (m.isAlive === false ? " dead" : "")); a.href = "profile.html?id=" + m.id; a.appendChild(avatar(m));
  const b = h("div", "pb"); b.append(h("div", "pn", nm(m)), h("div", "mut", [life(m), isF(m) ? "أنثى" : "ذكر"].filter(Boolean).join(" · ")));
  const t = (m.allTags || m.tags || []).slice(0, 2); if (t.length) { const r = h("div"); t.forEach((x) => r.append(h("span", "chip", x), " ")); b.appendChild(r); }
  a.appendChild(b); return a;
}
export function picker(people) {
  const map = new Map(), lab = (m) => `${nm(m)} · ${yr(m.birthDate) || "؟"} · ${m.id.slice(0, 4)}`;
  people.forEach((m) => map.set(lab(m), m));
  const dl = h("datalist"); dl.id = "dl" + Math.random().toString(36).slice(2, 7);
  [...map.keys()].forEach((k) => { const o = h("option"); o.value = k; dl.appendChild(o); });
  return { dl, lab, get: (v) => map.get(v) };
}
export function toast(m) { let t = $("#toast"); if (!t) { t = h("div"); t.id = "toast"; document.body.appendChild(t); } t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2800); }
export function fail(e) {
  console.error(e);
  const m = e && e.code === "permission-denied" ? "لا توجد صلاحية على البيانات. انشر ملف firestore.rules الجديد من Firebase Console، وتأكد أن حسابك مدير أو محرر." : "حدث خطأ: " + ((e && (e.code || e.message)) || e);
  const box = h("div", "err", m); (document.querySelector("main") || document.body).prepend(box);
}
const NAV = [["index.html", "🏠", "الرئيسية", 1], ["family_tree.html", "🌳", "الشجرة", 1], ["add_edit_person.html", "➕", "إضافة", 2], ["events.html", "📅", "الأحداث", 1]];
const MORE = [["profile.html", "👤", "ملفي", 1], ["mukhtars.html", "⭐", "المخاتير", 1], ["statistics.html", "📊", "الإحصائيات", 1], ["export_data.html", "📤", "تصدير البيانات", 2], ["links.html", "🔗", "روابط المشاركة", 3], ["admin.html", "👥", "إدارة المستخدمين", 3], ["activity.html", "🧾", "سجل النشاط", 3]];
const LBL = { pending: "بانتظار الموافقة", viewer: "مشاهد", editor: "محرر", admin: "مدير" };
async function copyLink(S) { try { const u = new URL(location.href); u.searchParams.delete("s"); await copyTracked(S, page(), u.searchParams.toString()); toast("نُسخ رابط متتبَّع صالح 7 أيام"); } catch (e) { toast("تعذّر النسخ"); } }
async function out() { await signOut(auth); sessionStorage.clear(); location.replace("login.html"); }
function drawer(S) {
  const bd = h("div", "bd"), d = h("div", "drawer"), close = () => { bd.remove(); d.remove(); }; bd.onclick = close;
  MORE.filter((n) => rank[S.role] >= n[3]).forEach((n) => { const a = h("a", "", n[1] + "  " + n[2]); a.href = n[0]; d.appendChild(a); });
  if (!S.user.isAnonymous) { const b = h("button", "item", "🔗  نسخ رابط هذه الصفحة (متتبَّع)"); b.onclick = () => { close(); copyLink(S); }; d.appendChild(b); }
  const o = h("button", "item", "🚪  تسجيل الخروج"); o.onclick = out; d.appendChild(o); document.body.append(bd, d);
}
function shell(S) {
  const role = rank[S.role], cur = page(), anon = S.user.isAnonymous, top = h("div", "topbar"), br = h("a", "brand", "🌳 شجرة العائلة"); br.href = "index.html"; top.appendChild(br);
  const nav = h("nav"); [...NAV, ...MORE].filter((n) => role >= n[3]).forEach((n) => { const a = h("a", n[0] === cur ? "on" : "", n[2]); a.href = n[0]; nav.appendChild(a); }); top.appendChild(nav);
  const who = h("div", "who"); who.appendChild(h("span", "", (anon ? "ضيف" : S.user.email.split("@")[0]) + " · " + LBL[S.role]));
  if (!anon) { const c = h("button", "btn", "🔗 نسخ رابط"); c.onclick = () => copyLink(S); who.appendChild(c); }
  const o = h("button", "btn", "خروج"); o.onclick = out; who.appendChild(o); top.appendChild(who); document.body.prepend(top);
  const bn = h("div", "bnav"); NAV.filter((n) => role >= n[3]).forEach((n) => { const a = h("a", n[0] === cur ? "on" : ""); a.href = n[0]; a.append(h("span", "ic", n[1]), h("span", "", n[2])); bn.appendChild(a); });
  const mb = h("button"); mb.append(h("span", "ic", "☰"), h("span", "", "المزيد")); mb.onclick = () => drawer(S); bn.appendChild(mb); document.body.appendChild(bn);
}
export async function boot() {
  document.body.classList.add("shell");
  const need = rank[document.body.dataset.require || "viewer"], main = document.querySelector("main") || document.body, S = await session();
  if (!S.user) { location.replace("login.html?next=" + encodeURIComponent(page() + location.search)); return new Promise(() => {}); }
  shell(S);
  const stop = (t) => { main.replaceChildren(h("div", "err", t)); return new Promise(() => {}); };
  if (S.err) return stop("تعذّر الاتصال: " + (S.err.code || S.err.message) + " — تأكد من تفعيل Email/Password وAnonymous ونشر firestore.rules.");
  if (S.bad) return stop("هذا الرابط غير صالح أو منتهي أو موقوف أو تجاوز الحد المسموح.");
  if (rank[S.role] < 1) return stop("حسابك بانتظار موافقة مدير العائلة.");
  if (rank[S.role] < need) return stop(S.link ? "هذا الرابط لا يمنح صلاحية هذه الصفحة." : "ليست لديك صلاحية لهذه الصفحة.");
  document.querySelectorAll("[data-min-role]").forEach((el) => { if (rank[S.role] < rank[el.dataset.minRole]) el.style.display = "none"; });
  return S;
}
