import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const stored=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(stored?{tokens:stored}:{})}),modules:{functions}});
const FN={list:'resReportesPropios',save:'resReporteCrear'};
const $=id=>document.getElementById(id);
let items=[];

const css=document.createElement('link');css.rel='stylesheet';css.href='reports.css';document.head.appendChild(css);

const esc=v=>String(v||'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
async function getFn(n){const r=await client.functions.get(n);return r.json()}
async function postFn(n,p){const r=await client.functions.post(n,{headers:{'Content-Type':'application/json'},params:new URLSearchParams(),body:JSON.stringify(p)});return r.json()}
function fmt(v){if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(d)}
function stateClass(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,'-').replace(/[ó]/g,'o')}

function inject(){
 if($('residentReportsView'))return;
 $('appView').insertAdjacentHTML('afterend',`<section id="residentReportsView" hidden><div class="view-head"><button class="back-btn" id="residentReportsBack">‹</button><div><span class="view-kicker">SERVICIOS</span><h1>Reportes</h1></div></div><div class="rrep-top"><div class="rrep-summary"><span>Mis reportes</span><strong id="residentReportsCount">0</strong></div><button class="primary-btn" id="residentReportsNew" type="button">+ Nuevo reporte</button></div><div id="residentReportsList" class="rrep-list"></div></section>`);
 document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="residentReportSheet"><div class="sheet-panel rrep-form-panel"><button class="sheet-close" id="residentReportClose" type="button">×</button><p class="eyebrow">REPORTES</p><h2>Nuevo reporte</h2><form id="residentReportForm" class="access-form"><label>Categoría<select id="residentReportCategory" required><option value="">Seleccionar</option><option>Mantenimiento</option><option>Servicios</option><option>Seguridad</option><option>Convivencia</option><option>Administración</option><option>Otros</option></select></label><label>Asunto<input id="residentReportSubject" maxlength="120" required/></label><label>Descripción<textarea id="residentReportDescription" maxlength="1000" required></textarea></label><label>Evidencia <span class="rrep-optional">(opcional)</span><input id="residentReportEvidence" type="file" accept="image/*"/></label><p class="rrep-note" id="residentReportEvidenceNote">La evidencia fotográfica se integra como apoyo al reporte.</p><button class="primary-btn" id="residentReportSave" type="submit">Enviar reporte</button></form><p class="access-status" id="residentReportStatus"></p></div></div>`);
 $('residentReportsBack').onclick=close;$('residentReportsNew').onclick=openForm;$('residentReportClose').onclick=()=> $('residentReportSheet').classList.remove('open');$('residentReportForm').onsubmit=save;
 const btn=document.querySelector('[data-module="reportes"]');if(btn)btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},true);
}
function close(){$('residentReportsView').hidden=true;$('appView').hidden=false}
function openForm(){$('residentReportForm').reset();$('residentReportStatus').textContent='';$('residentReportSheet').classList.add('open')}
async function open(){$('appView').hidden=true;$('residentReportsView').hidden=false;await load()}
function render(){$('residentReportsCount').textContent=String(items.length);const box=$('residentReportsList');if(!items.length){box.innerHTML='<div class="rrep-empty"><strong>Sin reportes</strong><span>No tienes reportes registrados.</span></div>';return}box.innerHTML=items.map(r=>`<article class="rrep-card"><div class="rrep-card-head"><div><span class="rrep-category">${esc(r.categoria||'Otros')}</span><h3>${esc(r.asunto||'Reporte')}</h3></div><span class="rrep-state ${stateClass(r.estatus)}">${esc(r.estatus||'Reportado')}</span></div><p class="rrep-description">${esc(r.descripcion||'')}</p><div class="rrep-meta"><span><strong>Folio:</strong> ${esc(r.reporteId||'—')}</span><span><strong>Fecha:</strong> ${esc(fmt(r.fechaReporte))}</span></div>${r.evidencia?`<div class="rrep-evidence"><img src="${esc(r.evidencia)}" alt="Evidencia del reporte"/></div>`:''}${r.estatus==='Cerrado'?`<div class="rrep-closed">Cerrado${r.fechaCierre?` · ${esc(fmt(r.fechaCierre))}`:''}</div>`:''}</article>`).join('')}
async function load(){$('residentReportsList').innerHTML='<div class="rrep-empty"><strong>Cargando reportes…</strong></div>';try{const d=await getFn(FN.list);if(!d?.ok)throw Error(d?.reason||'REPORTES_ERROR');items=Array.isArray(d.reportes)?d.reportes:[];render()}catch(e){console.error('SCaD Residencial reportes:',e);items=[];$('residentReportsCount').textContent='0';$('residentReportsList').innerHTML='<div class="rrep-empty"><strong>No fue posible cargar Reportes</strong><span>Verifica las funciones publicadas en Wix.</span></div>'}}
async function save(e){e.preventDefault();const file=$('residentReportEvidence').files?.[0]||null;if(file){$('residentReportStatus').textContent='La evidencia se habilitará en el siguiente ajuste. Envía este reporte sin fotografía por ahora.';return}const payload={categoria:$('residentReportCategory').value.trim(),asunto:$('residentReportSubject').value.trim(),descripcion:$('residentReportDescription').value.trim()};$('residentReportSave').disabled=true;$('residentReportStatus').textContent='Enviando reporte…';try{const d=await postFn(FN.save,payload);if(!d?.ok)throw Error(d?.reason||'REPORTE_GUARDAR_ERROR');$('residentReportSheet').classList.remove('open');await load()}catch(err){console.error(err);$('residentReportStatus').textContent='No fue posible registrar el reporte.'}finally{$('residentReportSave').disabled=false}}
inject();
