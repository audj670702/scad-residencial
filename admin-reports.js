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
style.textContent=`.arep-card{background:#fff;border:1px solid #dfe6ee;border-radius:16px;padding:15px;cursor:pointer;text-align:left;width:100%;font:inherit}.arep-card:hover{border-color:#b9c8d6}.arep-head{display:flex;justify-content:space-between;gap:10px}.arep-head strong{display:block;color:#17324d;margin-top:4px}.arep-head span,.arep-meta{font-size:12px;color:#6c7b8b}.arep-meta{margin-top:7px}.arep-detail-img{display:block;width:100%;max-height:330px;object-fit:cover;border-radius:14px;margin-top:14px}.arep-desc{color:#4e6071;line-height:1.5;white-space:pre-wrap}.arep-actions{display:grid;gap:10px;margin-top:18px}.arep-status{display:inline-flex;padding:6px 9px;border-radius:999px;font-size:12px;font-weight:800;background:#edf4fa;color:#17496d}.arep-status.en-atencion{background:#fff3df;color:#86510a}.arep-status.cerrado{background:#e8f7ee;color:#19643b}.arep-follow{margin-top:14px;padding:13px;border-radius:12px;background:#f4f7fa;border:1px solid #e0e7ee}.arep-follow strong{display:block;color:#17324d;margin-bottom:6px}.arep-follow p{margin:0;color:#4f6071;white-space:pre-wrap}.arep-track-sheet textarea{min-height:130px;resize:vertical}.arep-track-note{font-size:12px;color:#6f7d8b;margin-top:6px}`;
document.head.appendChild(style);

const esc=v=>String(v||'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
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
 if(!$('adminTrackSheet'))document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="adminTrackSheet"><div class="sheet-panel arep-track-sheet"><button class="sheet-close" id="adminTrackClose">×</button><p class="eyebrow">SEGUIMIENTO</p><h2 id="adminTrackTitle">Registrar seguimiento</h2><label>Seguimiento<textarea id="adminTrackText" maxlength="2000" placeholder="Describe la atención, acción realizada o conclusión del reporte."></textarea></label><p class="arep-track-note" id="adminTrackNote"></p><button class="primary-btn" id="adminTrackSave" type="button">Guardar</button><p class="access-status" id="adminTrackMsg"></p></div></div>`);
 $('openAdminReportsBtn')?.addEventListener('click',open);$('adminReportsBack').onclick=close;$('adminReportClose').onclick=()=> $('adminReportSheet').classList.remove('open');$('adminTrackClose').onclick=()=> $('adminTrackSheet').classList.remove('open');
 document.querySelectorAll('[data-report-status]').forEach(b=>b.onclick=()=>{filter=b.dataset.reportStatus;document.querySelectorAll('[data-report-status]').forEach(x=>x.classList.toggle('active',x===b));render()})
}
function open(){document.querySelectorAll('.app-shell>section').forEach(s=>s.hidden=true);$('adminReportsView').hidden=false;load()}
function close(){$('adminReportsView').hidden=true;$('adminView').hidden=false}
function counts(){$('arepCountReportado').textContent=items.filter(x=>x.estatus==='Reportado').length;$('arepCountAtencion').textContent=items.filter(x=>x.estatus==='En atención').length;$('arepCountCerrado').textContent=items.filter(x=>x.estatus==='Cerrado').length}
function render(){counts();const list=items.filter(x=>x.estatus===filter);$('adminReportsList').innerHTML=list.length?list.map(r=>`<button class="arep-card" data-rid="${esc(r.reporteId)}"><div class="arep-head"><div><span>${esc(r.categoria)}</span><strong>${esc(r.asunto)}</strong></div><span class="arep-status ${cls(r.estatus)}">${esc(r.estatus)}</span></div><div class="arep-meta">${esc(r.nombreUsuario||'Usuario')} · ${esc(r.viviendaId||'Sin vivienda')} · ${esc(fmt(r.fechaReporte))}</div></button>`).join(''):'<div class="empty-state"><strong>Sin reportes</strong><span>No hay registros en este estatus.</span></div>';document.querySelectorAll('[data-rid]').forEach(b=>b.onclick=()=>detail(items.find(x=>x.reporteId===b.dataset.rid)))}
async function load(){$('adminReportsList').innerHTML='<div class="empty-state"><strong>Cargando reportes…</strong></div>';try{const d=await getFn(FN.list);if(!d?.ok)throw Error(d?.reason||'ADMIN_REPORTES_ERROR');items=Array.isArray(d.reportes)?d.reportes:[];render()}catch(e){console.error(e);$('adminReportsList').innerHTML='<div class="empty-state"><strong>No fue posible cargar Reportes</strong></div>'}}

function detail(r){
 selected=r;const img=wixImage(r.evidencia);const seguimiento=String(r.seguimiento||'').trim();
 $('arepTitle').textContent=r.asunto||'Reporte';
 $('arepDetail').innerHTML=`<span class="arep-status ${cls(r.estatus)}">${esc(r.estatus)}</span><p class="arep-desc">${esc(r.descripcion)}</p><div class="detail-grid"><div><span>Categoría</span><strong>${esc(r.categoria)}</strong></div><div><span>Folio</span><strong>${esc(r.reporteId)}</strong></div><div><span>Reporta</span><strong>${esc(r.nombreUsuario||'—')}</strong></div><div><span>Vivienda</span><strong>${esc(r.viviendaId||'—')}</strong></div><div><span>Fecha reporte</span><strong>${esc(fmt(r.fechaReporte))}</strong></div><div><span>Fecha atención</span><strong>${esc(fmt(r.fechaAtencion))}</strong></div><div><span>Atiende</span><strong>${esc(r.atiendeNombre||'—')}</strong></div><div><span>Fecha cierre</span><strong>${esc(fmt(r.fechaCierre))}</strong></div></div>${img?`<img class="arep-detail-img" src="${esc(img)}" alt="Evidencia">`:''}${seguimiento?`<div class="arep-follow"><strong>${r.estatus==='Cerrado'?'Conclusión':'Seguimiento actual'}</strong><p>${esc(seguimiento)}</p></div>`:''}`;
 $('arepActions').innerHTML=r.estatus==='Reportado'?'<button class="primary-btn" data-action="start">Marcar En atención</button>':r.estatus==='En atención'?'<button class="secondary-action" data-action="update">Actualizar seguimiento</button><button class="primary-btn" data-action="close">Cerrar reporte</button>':'';
 $('arepMsg').textContent='';
 $('arepActions').querySelector('[data-action="start"]')?.addEventListener('click',()=>openTrack('start'));
 $('arepActions').querySelector('[data-action="update"]')?.addEventListener('click',()=>openTrack('update'));
 $('arepActions').querySelector('[data-action="close"]')?.addEventListener('click',()=>openTrack('close'));
 $('adminReportSheet').classList.add('open')
}

function openTrack(mode){
 const cfg={start:{title:'Iniciar atención',note:'El seguimiento inicial es obligatorio para pasar el reporte a En atención.',button:'Iniciar atención'},update:{title:'Actualizar seguimiento',note:'Actualiza el seguimiento visible para el residente.',button:'Guardar seguimiento'},close:{title:'Cerrar reporte',note:'Registra la conclusión final antes de cerrar el reporte.',button:'Cerrar reporte'}}[mode];
 $('adminTrackTitle').textContent=cfg.title;$('adminTrackNote').textContent=cfg.note;$('adminTrackSave').textContent=cfg.button;$('adminTrackText').value=mode==='start'?'':String(selected?.seguimiento||'');$('adminTrackMsg').textContent='';$('adminTrackSave').onclick=()=>saveTrack(mode);$('adminTrackSheet').classList.add('open');setTimeout(()=>$('adminTrackText').focus(),80)
}

async function saveTrack(mode){
 const seguimiento=$('adminTrackText').value.trim();
 if(!seguimiento){$('adminTrackMsg').textContent='Registra el seguimiento antes de continuar.';return}
 const estatusNuevo=mode==='close'?'Cerrado':'En atención';
 $('adminTrackSave').disabled=true;$('adminTrackMsg').textContent='Guardando…';
 try{const d=await postFn(FN.status,{reporteId:selected.reporteId,estatusNuevo,seguimiento});if(!d?.ok)throw Error(d?.reason||'ADMIN_REPORTE_UPDATE_ERROR');$('adminTrackSheet').classList.remove('open');$('adminReportSheet').classList.remove('open');await load()}catch(e){console.error(e);$('adminTrackMsg').textContent=String(e?.message||'').includes('SEGUIMIENTO_REQUERIDO')?'El seguimiento es obligatorio.':'No fue posible actualizar el reporte.'}finally{$('adminTrackSave').disabled=false}
}
inject();
