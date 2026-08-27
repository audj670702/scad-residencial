import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const stored=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(stored?{tokens:stored}:{})}),modules:{functions}});
const FN='resProgramacionDisponible';
const CATS=['Actividades','Servicios','Mantenimiento','Afectaciones','Otros'];
const $=id=>document.getElementById(id);
let items=[],currentMonth=new Date();currentMonth.setDate(1);

const css=document.createElement('link');css.rel='stylesheet';css.href='resident-programming.css';document.head.appendChild(css);
const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getFn=async()=>{const r=await client.functions.get(FN);return r.json()};
function fmt(v,all=false){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('es-MX',all?{dateStyle:'long'}:{dateStyle:'long',timeStyle:'short'}).format(d)}

function inject(){
 if($('residentProgrammingView'))return;
 $('appView').insertAdjacentHTML('afterend',`<section id="residentProgrammingView" hidden><div class="view-head"><button class="back-btn" id="residentProgBack">‹</button><div><span class="view-kicker">SERVICIOS</span><h1>Programación</h1></div></div><div class="rprog-toolbar"><select id="residentProgFilter"><option value="">Todas las categorías</option>${CATS.map(c=>`<option>${c}</option>`).join('')}</select></div><div class="rprog-calendar"><div class="rprog-head"><button id="residentProgPrev" type="button">‹</button><strong id="residentProgMonth"></strong><button id="residentProgNext" type="button">›</button></div><div class="rprog-week"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div><div class="rprog-grid" id="residentProgGrid"></div></div></section>`);
 document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="residentProgSheet"><div class="sheet-panel rprog-detail"><button class="sheet-close" id="residentProgClose">×</button><p class="eyebrow" id="residentProgCategory"></p><h2 id="residentProgTitle"></h2><div class="rprog-detail-grid"><div><span>Inicio</span><strong id="residentProgStart"></strong></div><div id="residentProgEndBox"><span>Término</span><strong id="residentProgEnd"></strong></div><div id="residentProgLocationBox"><span>Ubicación</span><strong id="residentProgLocation"></strong></div></div><p id="residentProgDescription" class="rprog-description"></p></div></div>`);
 $('residentProgBack').onclick=close;$('residentProgPrev').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()-1);render()};$('residentProgNext').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()+1);render()};$('residentProgFilter').onchange=render;$('residentProgClose').onclick=()=>$('residentProgSheet').classList.remove('open');
 const btn=document.querySelector('[data-module="programacion"]');if(btn)btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},true);
 const foot=document.querySelector('.app-footer span');if(foot)foot.textContent='v0.30';
}
function close(){$('residentProgrammingView').hidden=true;$('appView').hidden=false}
function filtered(){const c=$('residentProgFilter')?.value||'';return items.filter(x=>!c||x.categoria===c)}
function render(){
 $('residentProgMonth').textContent=new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(currentMonth);
 const y=currentMonth.getFullYear(),m=currentMonth.getMonth(),first=new Date(y,m,1),start=new Date(first),off=(first.getDay()+6)%7;start.setDate(first.getDate()-off);const today=new Date();today.setHours(0,0,0,0);let html='';
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const ds=new Date(d);ds.setHours(0,0,0,0);const de=new Date(d);de.setHours(23,59,59,999);const ev=filtered().filter(p=>{const s=new Date(p.fechaInicio),e=p.fechaFin?new Date(p.fechaFin):s;return s<=de&&e>=ds});html+=`<div class="rprog-day ${d.getMonth()!==m?'out':''} ${ds.getTime()===today.getTime()?'today':''}"><span>${d.getDate()}</span>${ev.slice(0,3).map(p=>`<button type="button" data-rprog="${esc(p.programacionId)}" class="rprog-event">${esc(p.titulo)}</button>`).join('')}${ev.length>3?`<small>+${ev.length-3}</small>`:''}</div>`}
 $('residentProgGrid').innerHTML=html;$('residentProgGrid').querySelectorAll('[data-rprog]').forEach(b=>b.onclick=()=>detail(b.dataset.rprog));
}
function detail(id){const p=items.find(x=>x.programacionId===id);if(!p)return;$('residentProgCategory').textContent=p.categoria||'PROGRAMACIÓN';$('residentProgTitle').textContent=p.titulo||'Programación';$('residentProgStart').textContent=fmt(p.fechaInicio,p.todoElDia);$('residentProgEndBox').hidden=!p.fechaFin;$('residentProgEnd').textContent=p.fechaFin?fmt(p.fechaFin,p.todoElDia):'';$('residentProgLocationBox').hidden=!p.ubicacion;$('residentProgLocation').textContent=p.ubicacion||'';$('residentProgDescription').textContent=p.descripcion||'';$('residentProgDescription').hidden=!p.descripcion;$('residentProgSheet').classList.add('open')}
async function open(){$('appView').hidden=true;$('residentProgrammingView').hidden=false;$('residentProgGrid').innerHTML='<div class="rprog-loading">Cargando programación…</div>';try{const d=await getFn();if(!d?.ok)throw Error(d?.reason||'PROGRAMACION_ERROR');items=Array.isArray(d.programaciones)?d.programaciones:[];render()}catch(e){console.error('SCaD Residencial programación:',e);items=[];$('residentProgGrid').innerHTML='<div class="rprog-loading">No fue posible cargar Programación.</div>'}}
inject();