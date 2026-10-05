import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, getDocs, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, increment, Timestamp, query, orderBy, limit, startAfter, collectionGroup, arrayUnion, arrayRemove, deleteField, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
export { deleteField, where, collectionGroup, arrayUnion, arrayRemove, increment, collection, getDocs, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp, query, orderBy, limit, startAfter, signOut };
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
      if (s.exists()) role = s.data().role || "pending";
      else {
        try {
          await setDoc(r, { email: u.email || "", displayName: u.displayName || "", role: "pending", createdAt: serverTimestamp() });
          role = "pending";
        } catch (e) {
          console.warn("profile create", e);
          role = "pending";
        }
      }
    }
    const profile = !u.isAnonymous ? (await getDoc(doc(db, "users", u.uid))).data() || {} : {};
    const out = { user: u, role, link: null, bad: false, disabled: profile.disabled === true, permissions: profile.permissions || [], branchPermissions: profile.branchPermissions || [], rejectionReason: profile.rejectionReason || "" };
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
export async function membersPage(pageSize = 60, cursor = null) { const q = cursor ? query(collection(db, "familyMembers"), orderBy("fullName", "asc"), startAfter(cursor), limit(pageSize)) : query(collection(db, "familyMembers"), orderBy("fullName", "asc"), limit(pageSize)); const snap = await getDocs(q); return { docs: snap.docs.map((d) => ({ id: d.id, ...d.data() })), cursor: snap.docs.at(-1) || cursor, hasMore: snap.docs.length === pageSize }; }
export function watchMembersPage(pageSize, next) { const q = query(collection(db, "familyMembers"), orderBy("fullName", "asc"), limit(pageSize)); return onSnapshot(q, (snap) => next({ docs: snap.docs.map((d) => ({ id: d.id, ...d.data() })), cursor: snap.docs.at(-1) || null, hasMore: snap.docs.length === pageSize })); }
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

export const DEVICE_KEY = "family_device_id_v2";
export function getDeviceId(){
  let id=localStorage.getItem(DEVICE_KEY);
  if(!id){ id=newToken(); localStorage.setItem(DEVICE_KEY,id); }
  return id;
}
export function deviceInfo(){
  const ua=navigator.userAgent||"";
  const mobile=/Mobi|Android|iPhone|iPad/i.test(ua);
  const tablet=/iPad|Tablet/i.test(ua);
  let type=tablet?"tablet":mobile?"mobile":"desktop";
  let browser=/Edg\//.test(ua)?"Edge":/Chrome\//.test(ua)?"Chrome":/Firefox\//.test(ua)?"Firefox":/Safari\//.test(ua)?"Safari":"متصفح";
  let platform=/Android/i.test(ua)?"Android":/iPhone|iPad/i.test(ua)?"iOS":/Windows/i.test(ua)?"Windows":/Mac OS/i.test(ua)?"macOS":/Linux/i.test(ua)?"Linux":"جهاز";
  return {type,browser,platform,deviceName:`${platform} · ${browser}`,ua:ua.slice(0,180)};
}
let securityStarted=false;
export async function startSecuritySession(user){
  if(!user || user.isAnonymous || securityStarted) return ()=>{};
  securityStarted=true;
  const uid=user.uid, deviceId=getDeviceId(), info=deviceInfo();
  const userRef=doc(db,"users",uid), deviceRef=doc(db,"users",uid,"devices",deviceId);
  let baseline=null;
  try {
    const us=await getDoc(userRef), d=us.data()||{};
    baseline=Number(d.sessionVersion||0);
    const ds=await getDoc(deviceRef);
    await setDoc(deviceRef,{uid,email:user.email||"",...info,deviceId,createdAt:ds.exists()?ds.data().createdAt:serverTimestamp(),lastSeenAt:serverTimestamp(),revoked:false,active:true},{merge:true});
    await setDoc(userRef,{lastSeenAt:serverTimestamp(),activeDeviceId:deviceId},{merge:true});
  } catch(e){ console.warn("security init",e); }
  let busy=false;
  const heartbeat=async()=>{if(busy||auth.currentUser?.uid!==uid)return;busy=true;try{await setDoc(deviceRef,{uid,email:user.email||"",...info,lastSeenAt:serverTimestamp(),active:true},{merge:true});}catch(e){}finally{busy=false}};
  const timer=setInterval(heartbeat,45000);
  const visibility=()=>{if(document.visibilityState==="visible")heartbeat();};
  document.addEventListener("visibilitychange",visibility);
  const stopUser=onSnapshot(userRef,async snap=>{
    const d=snap.data()||{};
    if(d.disabled===true || Number(d.sessionVersion||0)>baseline){
      clearInterval(timer);document.removeEventListener("visibilitychange",visibility);
      try{await signOut(auth);}finally{sessionStorage.clear();location.replace("login.html?forced=1");}
    }
  },()=>{});
  const stopDevice=onSnapshot(deviceRef,async snap=>{
    const d=snap.data()||{};
    if(d.revoked===true){
      clearInterval(timer);document.removeEventListener("visibilitychange",visibility);stopUser();
      try{await signOut(auth);}finally{sessionStorage.clear();location.replace("login.html?device=revoked");}
    }
  },()=>{});
  window.addEventListener("beforeunload",()=>{try{setDoc(deviceRef,{active:false,lastSeenAt:serverTimestamp()},{merge:true})}catch(e){}});
  return ()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visibility);stopUser();stopDevice();};
}
export async function adminLogoutUser(uid){
  await updateDoc(doc(db,"users",uid),{sessionVersion:increment(1),logoutRequestedAt:serverTimestamp()});
}
export async function revokeDevice(uid,deviceId){
  await updateDoc(doc(db,"users",uid,"devices",deviceId),{revoked:true,active:false,revokedAt:serverTimestamp()});
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

export async function sendReset(email) {
  auth.languageCode = "ar";
  try { await sendPasswordResetEmail(auth, email, { url: baseUrl() + "login.html", handleCodeInApp: false }); }
  catch (e) {
    if (["auth/unauthorized-continue-uri", "auth/invalid-continue-uri", "auth/missing-continue-uri"].includes(e.code)) await sendPasswordResetEmail(auth, email);
    else throw e;
  }
}
