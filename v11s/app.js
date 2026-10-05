import { session, rank, page, copyTracked, signOut, auth, startSecuritySession, db, doc, getDoc } from "./lib.js";
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
export function modalUI(title, body, buttons = [{ text: "إغلاق", value: false }]) {
  return new Promise((resolve) => { const shade = h("div", "ui-shade"), box = h("div", "ui-modal"), actions = h("div", "row"); box.append(h("h2", "", title)); if (typeof body === "string") box.append(h("p", "mut", body)); else box.append(body); buttons.forEach((b) => { const x = h("button", "btn " + (b.kind || ""), b.text); x.onclick = () => { shade.remove(); resolve(b.value); }; actions.appendChild(x); }); box.appendChild(actions); shade.appendChild(box); document.body.appendChild(shade); });
}
export const confirmUI = (title, text, danger = false) => modalUI(title, text, [{ text: "إلغاء", value: false }, { text: "تأكيد", value: true, kind: danger ? "red" : "gold" }]);
export const inputUI = (title, label, value = "", type = "text") => { const wrap = h("div"), lab = h("label", "l", label), input = h("input"); input.type = type; input.value = value; wrap.append(lab, input); return modalUI(title, wrap, [{ text: "إلغاء", value: null }, { text: "حفظ", value: "__value__", kind: "gold" }]).then((v) => v === "__value__" ? input.value.trim() : null); };
export function fail(e) {
  console.error(e);
  const m = e && e.code === "permission-denied" ? "لا توجد صلاحية على البيانات. انشر ملف firestore.rules المحدّث (Firebase Console ← Firestore ← Rules ← Publish) وتأكد من دور حسابك. التفاصيل: " + (e.message || "") : "حدث خطأ: " + ((e && (e.code || e.message)) || e);
  const box = h("div", "err", m); (document.querySelector("main") || document.body).prepend(box);
}
const NAV = [["index.html", "🏠", "الرئيسية", 1], ["family_tree.html", "🌳", "الشجرة", 1], ["members.html", "👨‍👩‍👧", "الأفراد", 1], ["relationship.html", "🧬", "القرابة", 1], ["events.html", "📅", "الأحداث", 1]];
const MORE = [["relations.html", "👪", "ربط الأعضاء", 2], ["perspective.html", "🧭", "شجرة منظور شخص", 1], ["meetings.html", "🗓️", "الاجتماعات", 1], ["votes.html", "🗳️", "التصويت", 1], ["funds.html", "💰", "صندوق العائلة", 1], ["docs.html", "📁", "الوثائق", 1], ["suggestions.html", "💡", "اقتراح تصحيح", 1], ["notifications.html", "🔔", "التنبيهات", 1], ["merge.html", "🧩", "دمج المكررين", 3], ["health.html", "🩺", "صحة النظام", 3], ["backup.html", "💾", "النسخ الاحتياطي", 3], ["report.html", "📈", "التقرير الشهري", 3], ["history.html", "📜", "تاريخ العائلة", 1], ["museum.html", "🏛️", "متحف العائلة", 1], ["archive.html", "🖼️", "الأرشيف", 1], ["branches.html", "🌿", "الفروع", 1], ["places.html", "🗺️", "الأماكن", 1], ["birthdays.html", "🎂", "المناسبات", 1], ["data_quality.html", "🛠️", "جودة البيانات", 1], ["contributors.html", "🤝", "المساهمون", 1], ["account.html", "⚙️", "حسابي", 0], ["profile.html", "👤", "ملفي", 1], ["mukhtars.html", "⭐", "المخاتير", 1], ["statistics.html", "📊", "الإحصائيات", 1], ["export_data.html", "📤", "تصدير البيانات", 2], ["links.html", "🔗", "روابط المشاركة", 3], ["admin.html", "👥", "إدارة المستخدمين", 3], ["activity.html", "🧾", "سجل النشاط", 3]];
export const PAGE_LIST = [...NAV, ...MORE].filter((n) => n[3] <= 1 && n[0] !== "account.html").map((n) => [n[0], n[2]]);
const okNav = (S, f) => !S.navPages || S.navPages.has(f);
const LBL = { pending: "بانتظار الموافقة", viewer: "مشاهد", editor: "محرر", admin: "مدير" };
async function copyLink(S) { try { const u = new URL(location.href); u.searchParams.delete("s"); await copyTracked(S, page(), u.searchParams.toString()); toast("نُسخ رابط متتبَّع صالح 7 أيام"); } catch (e) { toast("تعذّر النسخ"); } }
async function out() { await signOut(auth); sessionStorage.clear(); location.replace("login.html"); }
function drawer(S) {
  const bd = h("div", "bd"), d = h("div", "drawer"), head = h("div", "mobile-menu-head"), close = () => { bd.remove(); d.remove(); head.remove(); }; bd.onclick = close; head.innerHTML = `<b>☰ المزيد</b>`; d.appendChild(head);
  MORE.filter((n) => rank[S.role] >= n[3] && okNav(S, n[0])).forEach((n) => { const a = h("a", "", n[1] + "  " + n[2]); a.href = n[0]; d.appendChild(a); });
  if (!S.user.isAnonymous) { const b = h("button", "item", "🔗  نسخ رابط هذه الصفحة (متتبَّع)"); b.onclick = () => { close(); copyLink(S); }; d.appendChild(b); }
  const o = h("button", "item", "🚪  تسجيل الخروج"); o.onclick = out; d.appendChild(o); document.body.append(bd, d);
}
function shell(S) {
  const role = rank[S.role], cur = page(), anon = S.user.isAnonymous, top = h("div", "topbar"), br = h("a", "brand", "🌳 شجرة العائلة"); br.href = "index.html"; top.appendChild(br);
  const nav = h("nav"); [...NAV, ...MORE].filter((n) => role >= n[3] && okNav(S, n[0])).forEach((n) => { const a = h("a", n[0] === cur ? "on" : "", n[2]); a.href = n[0]; nav.appendChild(a); }); top.appendChild(nav);
  const who = h("div", "who"); who.appendChild(h("span", "", (anon ? "ضيف" : S.user.email.split("@")[0]) + " · " + (S.pending ? LBL.pending : LBL[S.role])));
  if (!anon) { const c = h("button", "btn", "🔗 نسخ رابط"); c.onclick = () => copyLink(S); who.appendChild(c); }
  const o = h("button", "btn", "خروج"); o.onclick = out; who.appendChild(o); top.appendChild(who); document.body.prepend(top);
  const bn = h("div", "bnav"); NAV.filter((n) => role >= n[3] && okNav(S, n[0])).forEach((n) => { const a = h("a", n[0] === cur ? "on" : ""); a.href = n[0]; a.append(h("span", "ic", n[1]), h("span", "", n[2])); bn.appendChild(a); });
  const mb = h("button"); mb.append(h("span", "ic", "☰"), h("span", "", "المزيد")); mb.onclick = () => drawer(S); bn.appendChild(mb); document.body.appendChild(bn);
}
export async function boot() {
  document.body.classList.add("shell");
  const need = rank[document.body.dataset.require || (page() === "account.html" ? "none" : "viewer")], main = document.querySelector("main") || document.body, S = await session();
  if (!S.user) { location.replace("login.html?next=" + encodeURIComponent(page() + location.search)); return new Promise(() => {}); }
  let acc = {};
  if (!S.user.isAnonymous) { try { acc = (await getDoc(doc(db, "settings", "access"))).data() || {}; } catch (e) {} }
  S.access = acc;
  const names = Object.fromEntries([...NAV, ...MORE].map((n) => [n[0], n[2]])), perms = S.permissions || [], approved = acc.approvedPages || [];
  if (S.role === "pending" && !S.user.isAnonymous) {
    const pp = (acc.pendingPages || []).filter((f) => names[f] && f !== "account.html");
    S.pendingPages = pp; S.navPages = new Set([...pp, "account.html"]);
    if (pp.includes(page())) { S.role = "viewer"; S.pending = true; }
  } else if (rank[S.role] < 3 && !S.user.isAnonymous && perms.length) S.navPages = new Set([...perms, "index.html", "account.html"]);
  else if (S.role === "viewer" && !S.user.isAnonymous && approved.length) S.navPages = new Set([...approved, "index.html", "account.html"]);
  shell(S);
  if (!S.user.isAnonymous) startSecuritySession(S.user);
  const stop = (t) => { main.replaceChildren(h("div", "err", t)); return new Promise(() => {}); };
  const stopPending = () => {
    const box = h("div", "err"); box.append(h("p", "", "طلبك قيد المراجعة. سيظهر لك باقي المحتوى بعد موافقة المدير."));
    if ((S.pendingPages || []).length) { box.append(h("p", "", "الصفحات المتاحة لك الآن:")); S.pendingPages.forEach((f) => { const a = h("a", "btn", names[f]); a.href = f; a.style.margin = "4px"; box.append(a); }); }
    const a = h("a", "btn gold", "⚙️ حسابي"); a.href = "account.html"; a.style.margin = "4px"; box.append(a);
    main.replaceChildren(box); return new Promise(() => {});
  };
  if (S.err) return stop("تعذّر الاتصال: " + (S.err.code || S.err.message) + " — تأكد من تفعيل Email/Password وAnonymous ونشر firestore.rules.");
  if (S.bad) return stop("هذا الرابط غير صالح أو منتهي أو موقوف أو تجاوز الحد المسموح.");
  if (S.disabled) return stop("تم إيقاف حسابك مؤقتًا. تواصل مع مدير العائلة لمعرفة السبب.");
  if (rank[S.role] < 1 && page() !== "account.html") return stopPending();
  const free = ["index.html", "account.html"].includes(page());
  if (rank[S.role] < 3 && !S.user.isAnonymous && perms.length && !perms.includes(page()) && !free) return stop("ليس لديك إذن للوصول إلى هذه الصفحة.");
  if (S.role === "viewer" && !S.pending && !S.user.isAnonymous && !perms.length && approved.length && !approved.includes(page()) && !free) return stop("ليس لديك إذن للوصول إلى هذه الصفحة.");
  if (rank[S.role] < need) return stop(S.link ? "هذا الرابط لا يمنح صلاحية هذه الصفحة." : "ليست لديك صلاحية لهذه الصفحة.");
  document.querySelectorAll("[data-min-role]").forEach((el) => { if (rank[S.role] < rank[el.dataset.minRole]) el.style.display = "none"; });
  if (S.role === "admin" && !S.user.isAnonymous && page() !== "backup.html" && !sessionStorage.getItem("bk-check")) {
    sessionStorage.setItem("bk-check", "1");
    getDoc(doc(db, "settings", "backup")).then(async (s) => {
      const b = s.exists() ? s.data() : {}, last = b.lastAt && b.lastAt.toMillis ? b.lastAt.toMillis() : 0;
      if (Date.now() - last < 7 * 864e5) return;
      if (b.autoWeekly) { try { const fx = await import("./fx.js"); await fx.runBackup(S); toast("تم أخذ نسخة احتياطية أسبوعية تلقائيًا ✓"); } catch (e) { console.warn(e); } return; }
      const bar = h("div", "err", "💾 مرّ أكثر من أسبوع على آخر نسخة احتياطية. "), a = h("a", "btn gold", "خذ نسخة الآن"); a.href = "backup.html"; bar.append(a); main.prepend(bar);
    }).catch(() => {});
  }
  return S;
}
