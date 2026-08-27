import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const stored=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(stored?{tokens:stored}:{})}),modules:{functions}});
const FN='resScadResidencial';
const $=id=>document.getElementById(id);
let items=[];

const css=document.createElement('link');css.rel='stylesheet';css.href='reports.css';document.head.appendChild(css);

const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function dispatch(payload){const r=await client.functions.post(FN,{headers:{'Content-Type':'application/json'},params:new URLSearchParams(),body:JSON.stringify(payload)});return r.json()}
function fmt(v){if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(d)}
function stateClass(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,'-').replace(/[ó]/g,'o')}

function wixImageToHttp(value){
  const raw=String(value||'').trim();
  if(!raw)return '';
  if(/^https?:\/\//i.test(raw))return raw;
  const m=raw.match(/^wix:image:\/\/v1\/([^/]+)\//i);
  return m?`https://static.wixstatic.com/media/${m[1]}`:'';
}

function readEvidence(file){
  return new Promise((resolve,reject)=>{
    if(!file){resolve(null);return}
    const allowed=['image/jpeg','image/png','image/webp'];
    if(!allowed.includes(String(file.type||'').toLowerCase())){reject(new Error('EVIDENCIA_FORMATO_INVALIDO'));return}
    if(file.size>5*1024*1024){reject(new Error('EVIDENCIA_TAMANO_INVALIDO'));return}
    const reader=new FileReader();
    reader.onload=()=>resolve({base64:String(reader.result||''),mimeType:String(file.type||'').toLowerCase(),fileName:String(file.name||'evidencia')});
    reader.onerror=()=>reject(new Error('EVIDENCIA_LECTURA_ERROR'));
    reader.readAsDataURL(file);
  });
}

function inject(){
 if($('residentReportsView'))return;
 $('appView').insertAdjacentHTML('afterend',`<section id="residentReportsView" hidden><div class="view-head"><button class="back-btn" id="residentReportsBack">‹</button><div><span class="view-kicker">SERVICIOS</span><h1>Reportes</h1></div></div><div class="rrep-top"><div class="rrep-summary"><span>Mis reportes</span><strong id="residentReportsCount">0</strong></div><button class="primary-btn" id="residentReportsNew" type="button">+ Nuevo reporte</button></div><div id="residentReportsList" class="rrep-list"></div></section>`);
 document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="residentReportSheet"><div class="sheet-panel rrep-form-panel"><button class="sheet-close" id="residentReportClose" type="button">×</button><p class="eyebrow">REPORTES</p><h2>Nuevo reporte</h2><form id="residentReportForm" class="access-form"><label>Categoría<select id="residentReportCategory" required><option value="">Seleccionar</option><option>Mantenimiento</option><option>Servicios</option><option>Seguridad</option><option>Convivencia</option><option>Administración</option><option>Otros</option></select></label><label>Asunto<input id="residentReportSubject" maxlength="120" required/></label><label>Descripción<textarea id="residentReportDescription" maxlength="1000" required></textarea></label><label>Evidencia <span class="rrep-optional">(opcional)</span><input id="residentReportEvidence" type="file" accept="image/jpeg,image/png,image/webp"/></label><p class="rrep-note" id="residentReportEvidenceNote">JPG, PNG o WEBP · máximo 5 MB.</p><button class="primary-btn" id="residentReportSave" type="submit">Enviar reporte</button></form><p class="access-status" id="residentReportStatus"></p></div></div>`);
 $('residentReportsBack').onclick=close;$('residentReportsNew').onclick=openForm;$('residentReportClose').onclick=()=> $('residentReportSheet').classList.remove('open');$('residentReportForm').onsubmit=save;
 const btn=document.querySelector('[data-module="reportes"]');if(btn)btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},true);
}
function close(){$('residentReportsView').hidden=true;$('appView').hidden=false}
function openForm(){$('residentReportForm').reset();$('residentReportStatus').textContent='';$('residentReportSheet').classList.add('open')}
async function open(){$('appView').hidden=true;$('residentReportsView').hidden=false;await load()}
function render(){$('residentReportsCount').textContent=String(items.length);const box=$('residentReportsList');if(!items.length){box.innerHTML='<div class="rrep-empty"><strong>Sin reportes</strong><span>No tienes reportes registrados.</span></div>';return}box.innerHTML=items.map(r=>{const evidenceUrl=wixImageToHttp(r.evidencia);return `<article class="rrep-card"><div class="rrep-card-head"><div><span class="rrep-category">${esc(r.categoria||'Otros')}</span><h3>${esc(r.asunto||'Reporte')}</h3></div><span class="rrep-state ${stateClass(r.estatus)}">${esc(r.estatus||'Reportado')}</span></div><p class="rrep-description">${esc(r.descripcion||'')}</p><div class="rrep-meta"><span><strong>Folio:</strong> ${esc(r.reporteId||'—')}</span><span><strong>Fecha:</strong> ${esc(fmt(r.fechaReporte))}</span></div>${evidenceUrl?`<div class="rrep-evidence"><img src="${esc(evidenceUrl)}" alt="Evidencia del reporte"/></div>`:''}${r.estatus==='Cerrado'?`<div class="rrep-closed">Cerrado${r.fechaCierre?` · ${esc(fmt(r.fechaCierre))}`:''}</div>`:''}</article>`}).join('')}
async function load(){$('residentReportsList').innerHTML='<div class="rrep-empty"><strong>Cargando reportes…</strong></div>';try{const d=await dispatch({action:'REPORTES_PROPIOS_LISTAR'});if(!d?.ok)throw Error(d?.reason||'REPORTES_ERROR');items=Array.isArray(d.reportes)?d.reportes:[];render()}catch(e){console.error('SCaD Residencial reportes:',e);items=[];$('residentReportsCount').textContent='0';$('residentReportsList').innerHTML='<div class="rrep-empty"><strong>No fue posible cargar Reportes</strong><span>Verifica el gateway de SCaD Residencial en Wix.</span></div>'}}
async function save(e){e.preventDefault();const file=$('residentReportEvidence').files?.[0]||null;$('residentReportSave').disabled=true;$('residentReportStatus').textContent=file?'Preparando evidencia…':'Enviando reporte…';try{const evidencia=await readEvidence(file);const payload={action:'REPORTE_CREAR',categoria:$('residentReportCategory').value.trim(),asunto:$('residentReportSubject').value.trim(),descripcion:$('residentReportDescription').value.trim(),...(evidencia?{evidencia}:{})};if(evidencia)$('residentReportStatus').textContent='Cargando evidencia y enviando reporte…';const d=await dispatch(payload);if(!d?.ok)throw Error(d?.reason||'REPORTE_GUARDAR_ERROR');$('residentReportSheet').classList.remove('open');await load()}catch(err){console.error(err);const reason=String(err?.message||err||'');if(reason.includes('EVIDENCIA_FORMATO_INVALIDO'))$('residentReportStatus').textContent='La evidencia debe ser JPG, PNG o WEBP.';else if(reason.includes('EVIDENCIA_TAMANO_INVALIDO'))$('residentReportStatus').textContent='La evidencia debe pesar máximo 5 MB.';else $('residentReportStatus').textContent='No fue posible registrar el reporte.'}finally{$('residentReportSave').disabled=false}}
inject();
