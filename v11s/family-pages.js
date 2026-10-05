import { boot, members, h, $, nm, yr, fmtD, isF, avatar, pcard, toast, fail, rank, db, collection, getDocs, query, orderBy, limit } from "./app.js";
export { boot, members, h, $, nm, yr, fmtD, isF, avatar, pcard, toast, fail, rank, db, collection, getDocs, query, orderBy, limit };
export function age(m){const d=m.birthDate?.toDate?.()||null;if(!d)return null;return Math.max(0,Math.floor((Date.now()-d.getTime())/31557600000));}
export function branch(m){return (m.allTags||m.tags||[]).join("، ")||"بدون فرع";}
export function childrenOf(all,id){return all.filter(x=>x.fatherId===id||x.motherId===id);}
export function parentsOf(all,m){return [all.find(x=>x.id===m.fatherId),all.find(x=>x.id===m.motherId)].filter(Boolean);}
export function siblingsOf(all,m){return all.filter(x=>x.id!==m.id&&((m.fatherId&&x.fatherId===m.fatherId)||(m.motherId&&x.motherId===m.motherId)));}
export function stats(all){const alive=all.filter(m=>m.isAlive!==false),dead=all.filter(m=>m.isAlive===false),female=all.filter(isF);return {total:all.length,alive:alive.length,dead:dead.length,male:all.length-female.length,female:female.length,branches:[...new Set(all.flatMap(m=>m.allTags||m.tags||[]))].sort()};}
export function shellTitle(title,subtitle=''){return `<div class="hero-title"><div><span class="eyebrow">🌳 سجل العائلة الرقمي</span><h1>${title}</h1>${subtitle?`<p class="mut">${subtitle}</p>`:''}</div></div>`}
export function metric(icon,label,value,href=''){const a=h(href?'a':'div','metric');if(href)a.href=href;a.innerHTML=`<span class="metric-icon">${icon}</span><strong>${value}</strong><small>${label}</small>`;return a;}
export function cardLink(icon,title,text,href){const a=h('a','feature-card');a.href=href;a.innerHTML=`<span class="feature-icon">${icon}</span><div><h3>${title}</h3><p>${text}</p></div><span class="arrow">←</span>`;return a;}
export function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
