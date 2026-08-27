import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const stored=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(stored?{tokens:stored}:{})}),modules:{functions}});
const FN='resDocumentosDisponibles';
const $=id=>document.getElementById(id);
let residentDocs=[];

const css=document.createElement('link');css.rel='stylesheet';css.href='resident-documents.css';document.head.appendChild(css);

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtDate(v){if(!v)return'';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(v)}
function getFn(n){return client.functions.get(n).then(r=>r.json())}

function inject(){
  if($('residentDocumentsView'))return;
  const app=$('appView');
  if(!app)return;
  app.insertAdjacentHTML('afterend',`<section id="residentDocumentsView" hidden><div class="view-head"><button class="back-btn" id="residentDocsBack">‹</button><div><span class="view-kicker">SERVICIOS</span><h1>Documentación</h1></div></div><div class="resident-docs-summary"><span>Documentos disponibles</span><strong id="residentDocsCount">0</strong></div><div id="residentDocsList" class="resident-docs-list"></div></section>`);
  $('residentDocsBack').onclick=closeResidentDocs;
  const btn=document.querySelector('[data-module="documentacion"]');
  if(btn){
    btn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      openResidentDocs();
    },true);
  }
  const footer=document.querySelector('.app-footer span');
  if(footer)footer.textContent='v0.29';
}

function closeResidentDocs(){
  $('residentDocumentsView').hidden=true;
  $('appView').hidden=false;
}

function renderDocs(){
  $('residentDocsCount').textContent=String(residentDocs.length);
  const box=$('residentDocsList');
  if(!residentDocs.length){
    box.innerHTML='<div class="empty-state"><strong>Sin documentos disponibles</strong><span>No tienes documentos asignados en este momento.</span></div>';
    return;
  }
  box.innerHTML=residentDocs.map(d=>{
    const meta=[d.categoria||'Sin categoría',fmtDate(d.fechaDocumento)].filter(Boolean).join(' · ');
    return `<article class="resident-doc-card"><div class="resident-doc-main"><span class="resident-doc-icon">📄</span><div class="resident-doc-copy"><strong>${esc(d.titulo||'Documento')}</strong><small>${esc(meta)}</small>${d.descripcion?`<p>${esc(d.descripcion)}</p>`:''}</div></div><div class="resident-doc-actions"><button type="button" data-rdoc-view="${esc(d.documentoId)}">Ver PDF</button>${d.descargable?`<button type="button" data-rdoc-download="${esc(d.documentoId)}">Descargar</button>`:''}</div></article>`;
  }).join('');
  box.querySelectorAll('[data-rdoc-view]').forEach(b=>b.onclick=()=>openPdf(b.dataset.rdocView,false));
  box.querySelectorAll('[data-rdoc-download]').forEach(b=>b.onclick=()=>openPdf(b.dataset.rdocDownload,true));
}

function openPdf(id,download){
  const d=residentDocs.find(x=>x.documentoId===id);
  const url=String(d?.archivoUrl||'').trim();
  if(!/^https?:\/\//i.test(url)){
    alert('El archivo no tiene una dirección válida.');
    return;
  }
  if(download){
    const a=document.createElement('a');
    a.href=url;
    a.download=d.nombreArchivo||'documento.pdf';
    a.target='_blank';
    a.rel='noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }else{
    window.open(url,'_blank','noopener');
  }
}

async function openResidentDocs(){
  $('appView').hidden=true;
  $('residentDocumentsView').hidden=false;
  $('residentDocsList').innerHTML='<div class="empty-state"><strong>Cargando documentos…</strong><span>Consultando tus permisos.</span></div>';
  $('residentDocsCount').textContent='…';
  try{
    const data=await getFn(FN);
    if(!data?.ok)throw Error(data?.reason||'DOCUMENTOS_ERROR');
    residentDocs=Array.isArray(data.documentos)?data.documentos:[];
    renderDocs();
  }catch(e){
    console.error('SCaD Residencial documentos:',e);
    residentDocs=[];
    $('residentDocsCount').textContent='0';
    $('residentDocsList').innerHTML='<div class="empty-state"><strong>No fue posible cargar Documentación</strong><span>Verifica la función publicada en Wix.</span></div>';
  }
}

inject();
import('./programming.js');
