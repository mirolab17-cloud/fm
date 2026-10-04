import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, increment, Timestamp, query, orderBy, limit, collectionGroup, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
export { collectionGroup, arrayUnion, arrayRemove, increment, collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp, query, orderBy, limit, signOut };
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app), db = getFirestore(app);
export const rank = { none: 0, pending: 0, viewer: 1, editor: 2, admin: 3 };
export const page = () => location.pathname.split("/").pop() || "index.html";
export const token = () => { const t = new URLSearchParams(location.search).get("s"); if (t) sessionStorage.setItem("s", t); return t || sessionStorage.getItem("s"); };
export const newToken = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
export const baseUrl = () => location.origin + location.pathname.replace(/[^/]*$/, "");

let P;
export const session = () => P || (P = (async () => {
  const t = token();
  let u = await new Promise((r) => { const un = onAuthStateChanged(auth, (x) => { un(); r(x); }); });
  try {
    if (!u && t) u = (await signInAnonymously(auth)).user;
    if (!u) return { user: null, role: "none" };
    let role = "none";
    if (!u.isAnonymous) {
      const r = doc(db, "users", u.uid), s = await getDoc(r);
      const mk = (ro) => setDoc(r, { email: u.email, displayName: u.displayName || "", role: ro, createdAt: serverTimestamp() });
      const bs = doc(db, "settings", "bootstrap"), claim = () => setDoc(bs, { uid: u.uid, createdAt: serverTimestamp() });
      if (s.exists()) role = s.data().role || "pending";
      else { try { await claim(); await mk("admin"); role = "admin"; } catch (e) { await mk("pending"); role = "pending"; } }
      if (role === "pending") { try { if (!(await getDoc(bs)).exists()) { await claim(); await updateDoc(r, { role: "admin" }); role = "admin"; } } catch (e) {} }
      if (role === "admin") { try { if (!(await getDoc(bs)).exists()) await claim(); } catch (e) {} }
    }
    const profile = !u.isAnonymous ? (await getDoc(doc(db, "users", u.uid))).data() || {} : {};
    const out = { user: u, role, link: null, bad: false, disabled: profile.disabled === true, permissions: profile.permissions || [], rejectionReason: profile.rejectionReason || "" };
    if (t) {
      let l = null, fresh = false;
      try { const ls = await getDoc(doc(db, "shareLinks", t)); l = ls.exists() ? ls.data() : null; } catch (e) {}
      const ok = !!l && l.active === true && l.expiresAt.toMillis() > Date.now() && (l.page === "*" || l.page === page());
      if (rank[role] < 1) {
        if (ok) {
          const sr = doc(db, "linkSessions", u.uid);
          const old = await getDoc(sr);
          if (!old.exists() || old.data().token !== t) {
            if (old.exists()) await deleteDoc(sr);
            if (l.maxUses && l.openCount >= l.maxUses) out.bad = true;
            else { await setDoc(sr, { token: t, createdAt: serverTimestamp() }); fresh = true; }
          }
          if (!out.bad) { out.role = l.role; out.link = l; }
        } else out.bad = true;
      }
      if (!sessionStorage.getItem("o_" + t)) {
        sessionStorage.setItem("o_" + t, "1");
        try {
          if (l) await updateDoc(doc(db, "shareLinks", t), fresh ? { openCount: increment(1), lastOpenAt: serverTimestamp() } : { lastOpenAt: serverTimestamp() });
          await addDoc(collection(db, "linkEvents"), { token: t, type: out.bad || !ok ? "denied" : "open", uid: u.uid, anon: u.isAnonymous, email: u.email || null, page: page(), ua: navigator.userAgent.slice(0, 180), ts: serverTimestamp() });
        } catch (e) { console.warn(e); }
      }
    }
    return out;
  } catch (e) { console.error(e); return { user: auth.currentUser, role: "none", err: e }; }
})());

export async function copyTracked(sess, file = page(), qs = "") {
  const t = newToken();
  await setDoc(doc(db, "shareLinks", t), { page: file, role: "viewer", active: true, expiresAt: Timestamp.fromMillis(Date.now() + 7 * 864e5), maxUses: 0, openCount: 0, createdBy: sess.user.uid, copiedBy: sess.user.email, label: "نسخة من " + sess.user.email, parentToken: token() || null, kind: "copy", query: qs, createdAt: serverTimestamp() });
  await addDoc(collection(db, "linkEvents"), { token: t, type: "copy", uid: sess.user.uid, anon: false, email: sess.user.email, page: file, ts: serverTimestamp() });
  const url = baseUrl() + file + "?" + (qs ? qs + "&" : "") + "s=" + t;
  try { await navigator.clipboard.writeText(url); } catch (e) { const box = document.createElement("textarea"); box.value = url; box.style.position = "fixed"; box.style.opacity = "0"; document.body.appendChild(box); box.select(); document.execCommand("copy"); box.remove(); }
  return url;
}

export async function members() { return (await getDocs(collection(db, "familyMembers"))).docs.map((d) => ({ id: d.id, ...d.data() })); }
export function kidsOf(all) {
  const byId = new Map(all.map((m) => [m.id, m])), kids = new Map(all.map((m) => [m.id, new Set()]));
  for (const m of all) {
    if (m.fatherId && byId.has(m.fatherId)) kids.get(m.fatherId).add(m.id);
    else if (m.motherId && byId.has(m.motherId)) kids.get(m.motherId).add(m.id);
  }
  for (const m of all) for (const c of m.childrenIds || []) {
    const ch = byId.get(c);
    if (ch && !(ch.fatherId && byId.has(ch.fatherId)) && !(ch.motherId && byId.has(ch.motherId))) kids.get(m.id).add(c);
  }
  return { byId, kids };
}
export async function propagateTags(all) {
  const { byId, kids } = kidsOf(all), has = new Set();
  kids.forEach((s) => s.forEach((c) => has.add(c)));
  const eff = new Map(), seen = new Set();
  const walk = (id, inh) => {
    if (seen.has(id)) return; seen.add(id);
    const set = new Set([...inh, ...(byId.get(id).tags || [])]); eff.set(id, set);
    kids.get(id).forEach((c) => walk(c, set));
  };
  all.filter((m) => !has.has(m.id)).forEach((m) => walk(m.id, new Set()));
  const key = (a) => [...(a || [])].sort().join("|");
  const ch = all.filter((m) => eff.has(m.id) && key(eff.get(m.id)) !== key(m.allTags));
  for (let i = 0; i < ch.length; i += 400) {
    const b = writeBatch(db);
    ch.slice(i, i + 400).forEach((m) => b.update(doc(db, "familyMembers", m.id), { allTags: [...eff.get(m.id)] }));
    await b.commit();
  }
  all.forEach((m) => { if (eff.has(m.id)) m.allTags = [...eff.get(m.id)]; });
  return ch.length;
}
