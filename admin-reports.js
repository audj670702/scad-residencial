import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const stored=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(stored?{tokens:stored}:{})}),modules:{functions}});
const FN={list:'resAdminReportes',status:'resAdminReporteEstatus'};
const $=id=>document.getElementById(id);
let items=[],filter='Reportado',selected=null;

const style=document.createElement('style');
style.textContent=`.arep-card{background:#fff;border:1px solid #dfe6ee;border-radius:16px;padding:15px;cursor:pointer;text-align:left;width:100%;font:inherit}.arep-card:hover{border-color:#b9c8d6}.arep-head{display:flex;justify-content:space-between;gap:10px}.arep-head strong{color:#17324d}.arep-head span,.arep-meta{font-size:12px;color:#6c7b8b}.arep-meta{margin-top:7px}.arep-detail-img{display:block;width:100%;max-height:330px;object-fit:cover;border-radius:14px;margin-top:14px}.arep-desc{color:#4e6071;line-height:1.5;white-space:pre-wrap}.arep-actions{display:grid;gap:10px;margin-top:18px}.arep-status{display:inline-flex;padding:6px 9px;border-radius:999px;font-size:12px;font-weight:800;background:#edf4fa;color:#17496d}.arep-status.en-atencion{background:#fff3df;color:#86510a}.arep-status.cerrado{background:#e8f7ee;color:#19643b}`;
document.head.appendChild(style);

const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cls=v=>String(v||'').toLowerCase().replace(/\s+/g,'-').replace('ó','o');
const fmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(d)};
const wixImage=v=>{const s=String(v||'');if(/^https?:/i.test(s))return s;const m=s.match(/^wix:image:\/\/v1\/([^/]+)/);return m?`https://static.wixstatic.com/media/${m[1]}`:''};
async function getFn(n){const r=await client.functions.get(n);return r.json()}
async function postFn(n,p){const r=await client.functions.post(n,{headers:{'Content-Type':'application/json'},params:new URLSearchParams(),body:JSON.stringify(p)});return r.json()}

function inject(){
 const menu=document.querySelector('#adminView .admin-menu');
 if(menu&&!$('openAdminReportsBtn'))menu.insertAdjacentHTML('beforeend','<button class="admin-card" id="openAdminReportsBtn"><span class="admin-card-icon">🛠️</span><span><strong>Reportes</strong><small>Recepción, atención y cierre</small></span><span class="module-arrow">›</span></button>');
 if(!$('adminReportsView'))document.querySelector('.app-shell').insertAdjacentHTML('beforeend',`<section id="adminReportsView" hidden><div class="view-head"><button class="back-btn" id="adminReportsBack">‹</button><div><span class="view-kicker">ADMINISTRACIÓN</span><h1>Reportes</h1></div></div><div class="status-tabs"><button class="status-tab active" data-report-status="Reportado">Reportados <b id="arepCountReportado">0</b></button><button class="status-tab" data-report-status="En atención">En atención <b id="arepCountAtencion">0</b></button><button class="status-tab" data-report-status="Cerrado">Cerrados <b id="arepCountCerrado">0</b></button></div><div id="adminReportsList" class="users-list"></div></section>`);
 if(!$('adminReportSheet'))document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="adminReportSheet"><div class="sheet-panel"><button class="sheet-close" id="adminReportClose">×</button><p class="eyebrow">REPORTE</p><h2 id="arepTitle"></h2><div id="arepDetail"></div><div class="arep-actions" id="arepActions"></div><p class="access-status" id="arepMsg"></p></div></div>`);
 $('openAdminReportsBtn')?.addEventListener('click',open);
 $('adminReportsBack').onclick=close;
 $('adminReportClose').onclick=()=> $('adminReportSheet').classList.remove('open');
 document.querySelectorAll('[data-report-status]').forEach(b=>b.onclick=()=>{filter=b.dataset.reportStatus;document.querySelectorAll('[data-report-status]').forEach(x=>x.classList.toggle('active',x===b));render()});
}
function open(){document.querySelectorAll('.app-shell>section').forEach(s=>s.hidden=true);$('adminReportsView').hidden=false;load()}
function close(){$('adminReportsView').hidden=true;$('adminView').hidden=false}
function counts(){ $('arepCountReportado').textContent=items.filter(x=>x.estatus==='Reportado').length;$('arepCountAtencion').textContent=items.filter(x=>x.estatus==='En atención').length;$('arepCountCerrado').textContent=items.filter(x=>x.estatus==='Cerrado').length }
function render(){counts();const list=items.filter(x=>x.estatus===filter);$('adminReportsList').innerHTML=list.length?list.map((r,i)=>`<button class="arep-card" data-rid="${esc(r.reporteId)}"><div class="arep-head"><div><span>${esc(r.categoria)}</span><strong>${esc(r.asunto)}</strong></div><span class="arep-status ${cls(r.estatus)}">${esc(r.estatus)}</span></div><div class="arep-meta">${esc(r.nombreUsuario||'Usuario')} · ${esc(r.viviendaId||'Sin vivienda')} · ${esc(fmt(r.fechaReporte))}</div></button>`).join(''):'<div class="empty-state"><strong>Sin reportes</strong><span>No hay registros en este estatus.</span></div>';document.querySelectorAll('[data-rid]').forEach(b=>b.onclick=()=>detail(items.find(x=>x.reporteId===b.dataset.rid)))}
async function load(){ $('adminReportsList').innerHTML='<div class="empty-state"><strong>Cargando reportes…</strong></div>';try{const d=await getFn(FN.list);if(!d?.ok)throw Error(d?.reason||'ADMIN_REPORTES_ERROR');items=Array.isArray(d.reportes)?d.reportes:[];render()}catch(e){console.error(e);$('adminReportsList').innerHTML='<div class="empty-state"><strong>No fue posible cargar Reportes</strong></div>'}}
function detail(r){selected=r;const img=wixImage(r.evidencia);$('arepTitle').textContent=r.asunto||'Reporte';$('arepDetail').innerHTML=`<span class="arep-status ${cls(r.estatus)}">${esc(r.estatus)}</span><p class="arep-desc">${esc(r.descripcion)}</p><div class="detail-grid"><div><span>Categoría</span><strong>${esc(r.categoria)}</strong></div><div><span>Folio</span><strong>${esc(r.reporteId)}</strong></div><div><span>Reporta</span><strong>${esc(r.nombreUsuario||'—')}</strong></div><div><span>Vivienda</span><strong>${esc(r.viviendaId||'—')}</strong></div><div><span>Fecha reporte</span><strong>${esc(fmt(r.fechaReporte))}</strong></div><div><span>Fecha cierre</span><strong>${esc(fmt(r.fechaCierre))}</strong></div></div>${img?`<img class="arep-detail-img" src="${esc(img)}" alt="Evidencia">`:''}`;$('arepActions').innerHTML=r.estatus==='Reportado'?'<button class="primary-btn" data-next="En atención">Marcar En atención</button>':r.estatus==='En atención'?'<button class="primary-btn" data-next="Cerrado">Cerrar reporte</button>':'';$('arepMsg').textContent='';$('arepActions').querySelector('[data-next]')?.addEventListener('click',e=>confirmChange(e.currentTarget.dataset.next));$('adminReportSheet').classList.add('open')}
function confirmChange(next){const label=next==='En atención'?'pasar este reporte a En atención':'cerrar este reporte';if(!confirm(`¿Confirmas ${label}?`))return;change(next)}
async function change(next){$('arepMsg').textContent='Actualizando reporte…';try{const d=await postFn(FN.status,{reporteId:selected.reporteId,estatusNuevo:next});if(!d?.ok)throw Error(d?.reason||'ADMIN_REPORTE_UPDATE_ERROR');$('adminReportSheet').classList.remove('open');await load()}catch(e){console.error(e);$('arepMsg').textContent='No fue posible actualizar el reporte.'}}
inject();
