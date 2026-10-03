import { session, rank, page, copyTracked, signOut, auth } from "./lib.js";
const need = rank[document.body.dataset.require || "viewer"];
const label = { pending: "بانتظار الموافقة", viewer: "مشاهد", editor: "محرر", admin: "مدير" };
document.documentElement.style.visibility = "hidden";
const S = await session();
const show = (msg) => { document.body.innerHTML = '<div style="font:18px Tajawal,sans-serif;text-align:center;margin:20vh 16px 0;color:#222" dir="rtl"></div>'; document.body.firstChild.textContent = msg; document.documentElement.style.visibility = "visible"; };
if (!S.user) location.replace("login.html?next=" + encodeURIComponent(page() + location.search));
else if (S.bad) show("هذا الرابط غير صالح أو منتهي أو موقوف أو تجاوز الحد المسموح.");
else if (rank[S.role] < 1) show("حسابك بانتظار موافقة مدير العائلة.");
else if (rank[S.role] < need) { if (S.link) show("هذا الرابط لا يمنح صلاحية هذه الصفحة."); else location.replace("index.html"); }
else {
  const anon = S.user.isAnonymous, bar = document.createElement("div");
  bar.className = "gbar";
  bar.style.cssText = "position:fixed;bottom:calc(10px + env(safe-area-inset-bottom,0px));left:10px;z-index:9999;background:#111827ee;color:#fff;padding:7px 12px;border-radius:999px;font:13px Tajawal,sans-serif;display:flex;gap:10px;align-items:center;max-width:92vw;flex-wrap:wrap";
  const add = (t, fn, href) => { const a = document.createElement("a"); a.textContent = t; a.href = href || "#"; a.style.cssText = "color:#93c5fd;cursor:pointer"; if (fn) a.onclick = (e) => { e.preventDefault(); fn(a); }; bar.appendChild(a); return a; };
  const who = document.createElement("span"); who.textContent = (anon ? "ضيف (رابط)" : S.user.email) + " · " + label[S.role]; bar.appendChild(who);
  add("المخاتير", null, "mukhtars.html");
  if (!anon) add("🔗 نسخ رابط", async (a) => { try { const u = new URL(location.href); u.searchParams.delete("s"); await copyTracked(S, page(), u.searchParams.toString()); a.textContent = "✓ نُسخ (رابط متتبَّع)"; } catch (e) { a.textContent = "تعذّر النسخ"; } setTimeout(() => (a.textContent = "🔗 نسخ رابط"), 2500); });
  if (S.role === "admin") { add("الروابط", null, "links.html"); add("المستخدمون", null, "admin.html"); }
  add("خروج", async () => { await signOut(auth); sessionStorage.clear(); location.replace("login.html"); }).style.color = "#fca5a5";
  document.body.appendChild(bar);
  document.querySelectorAll("[data-min-role]").forEach((el) => { if (rank[S.role] < rank[el.dataset.minRole]) el.style.display = "none"; });
  document.documentElement.style.visibility = "visible";
}
