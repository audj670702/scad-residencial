import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const MUTE_KEY='scad_residencial_mensajeria_mute';
const storedTokens=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(storedTokens?{tokens:storedTokens}:{})}),modules:{functions}});
const FN={inbox:'resMensajeriaBandeja',pending:'resMensajeriaPendientes',users:'resMensajeriaUsuarios',conversation:'resMensajeriaConversacion',messages:'resMensajeriaMensajes',send:'resMensajeriaEnviar',read:'resMensajeriaLeidos'};
const $=id=>document.getElementById(id);

let inbox=[];
let activeConversation=null;
let currentMemberId='';
let allUsers=[];
let pendingSnapshot=null;
let pollTimer=null;
let muted=localStorage.getItem(MUTE_KEY)==='1';
let adminMode=false;
let returnView='appView';

const sounds={
  sent:new Audio('./assets/mensaje-enviado.mp3'),
  pending:new Audio('./assets/mensaje-pendiente.mp3')
};
Object.values(sounds).forEach(a=>{a.preload='auto';a.volume=.8});

function esc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtDate(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';const now=new Date();const same=now.toDateString()===d.toDateString();return same?d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}
function play(name){if(muted)return;const a=sounds[name];if(!a)return;try{a.currentTime=0;a.play().catch(()=>{})}catch{}}
async function getFn(name){const r=await client.functions.get(name);return r.json()}
async function postFn(name,payload){const r=await client.functions.post(name,{headers:{'Content-Type':'application/json'},params:new URLSearchParams(),body:JSON.stringify(payload)});return r.json()}
function getFnQuery(name,params){return client.functions.get(name,{params:new URLSearchParams(params)}).then(r=>r.json())}

function ensureCss(){if(document.querySelector('link[data-res-messaging]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='./messaging.css';l.dataset.resMessaging='1';document.head.appendChild(l)}

function ensureUi(){
  if($('messagingView'))return;
  const shell=document.querySelector('.app-shell');
  if(!shell)return;
  const view=document.createElement('section');
  view.id='messagingView';
  view.hidden=true;
  view.innerHTML=`
    <div class="view-head messaging-head">
      <button class="back-btn" id="messagingBack" type="button">‹</button>
      <div class="messaging-head-copy"><span class="view-kicker" id="messagingKicker">COMUNICACIÓN</span><h1 id="messagingTitle">Mensajería</h1></div>
      <button class="messaging-mute" id="messagingMute" type="button" aria-label="Silenciar sonidos"></button>
    </div>
    <div id="messagingInboxPanel">
      <div class="messaging-toolbar">
        <input id="messagingSearch" type="search" placeholder="Buscar conversación"/>
        <button id="messagingNew" type="button">+ Nuevo</button>
      </div>
      <button class="messaging-admin-shortcut" id="messagingAdminShortcut" type="button">
        <span class="messaging-avatar admin">A</span>
        <span><strong>Administración</strong><small>Canal institucional general</small></span>
        <span class="module-arrow">›</span>
      </button>
      <div id="messagingInbox" class="messaging-inbox"></div>
    </div>
    <div id="messagingThreadPanel" hidden>
      <div class="messaging-thread-head">
        <button id="messagingThreadBack" type="button">‹</button>
        <div><strong id="messagingThreadName">Conversación</strong><small id="messagingThreadMeta"></small></div>
      </div>
      <div id="messagingThread" class="messaging-thread"></div>
      <form id="messagingCompose" class="messaging-compose">
        <textarea id="messagingText" rows="1" maxlength="1500" placeholder="Escribe un mensaje"></textarea>
        <button id="messagingSend" type="submit" aria-label="Enviar">➤</button>
      </form>
    </div>
  `;
  const footer=shell.querySelector('.app-footer');
  if(footer)shell.insertBefore(view,footer);else shell.appendChild(view);

  const sheet=document.createElement('div');
  sheet.className='sheet';sheet.id='messagingNewSheet';
  sheet.innerHTML=`<div class="sheet-panel messaging-new-panel"><button class="sheet-close" id="messagingNewClose" type="button">×</button><p class="eyebrow">MENSAJERÍA</p><h2>Nueva conversación</h2><input id="messagingUserSearch" class="messaging-user-search" type="search" placeholder="Buscar usuario, rol o vivienda"/><div id="messagingUserResults" class="messaging-user-results"></div><p class="access-status" id="messagingNewStatus"></p></div>`;
  document.body.appendChild(sheet);

  $('messagingBack').onclick=closeMessaging;
  $('messagingThreadBack').onclick=showInboxPanel;
  $('messagingNew').onclick=openNewConversation;
  $('messagingNewClose').onclick=()=>sheet.classList.remove('open');
  $('messagingSearch').addEventListener('input',renderInbox);
  $('messagingUserSearch').addEventListener('input',renderUsers);
  $('messagingCompose').addEventListener('submit',sendActiveMessage);
  $('messagingMute').onclick=toggleMute;
  $('messagingAdminShortcut').onclick=openAdministration;
  updateMuteButton();
}

function topViews(){return [...document.querySelectorAll('.app-shell > section[id]')]}
function showMessaging(fromAdmin=false){adminMode=fromAdmin;returnView=fromAdmin?'adminView':'appView';topViews().forEach(v=>v.hidden=v.id!=='messagingView');$('messagingView').hidden=false;updateModeUi()}
function closeMessaging(){showInboxPanel(false);$('messagingView').hidden=true;const target=$(returnView)||$('appView');if(target)target.hidden=false}
function showInboxPanel(reload=true){activeConversation=null;$('messagingThreadPanel').hidden=true;$('messagingInboxPanel').hidden=false;if(reload)loadInbox()}
function showThreadPanel(){$('messagingInboxPanel').hidden=true;$('messagingThreadPanel').hidden=false}
function updateModeUi(){
  $('messagingKicker').textContent=adminMode?'ADMINISTRACIÓN':'COMUNICACIÓN';
  $('messagingTitle').textContent=adminMode?'Mensajería institucional':'Mensajería';
  $('messagingNew').hidden=adminMode;
  $('messagingAdminShortcut').hidden=adminMode;
}

function badge(){
  const button=document.querySelector('[data-module="mensajeria"]');
  if(!button)return null;
  let b=button.querySelector('.messaging-entry-badge');
  if(!b){b=document.createElement('span');b.className='messaging-entry-badge';b.hidden=true;button.appendChild(b)}
  return b;
}
function setBadge(n){const b=badge();if(!b)return;const total=Number(n||0);b.textContent=total>99?'99+':String(total);b.hidden=total<1}
function setAdminBadge(n){const b=$('adminMessagingBadge');if(!b)return;const total=Number(n||0);b.textContent=total>99?'99+':String(total);b.hidden=total<1}

function adminPanelAvailable(){const section=$('adminSection');return !!section&&!section.hidden}
function syncAdminEntry(){
  const menu=document.querySelector('#adminView .admin-menu');
  if(!menu)return;
  let card=$('openAdminMessagingBtn');
  if(!adminPanelAvailable()){if(card)card.remove();return}
  if(card)return;
  card=document.createElement('button');
  card.className='admin-card admin-messaging-card';
  card.id='openAdminMessagingBtn';
  card.type='button';
  card.innerHTML='<span class="admin-card-icon">💬</span><span><strong>Mensajería</strong><small>Bandeja institucional de Administración</small></span><b class="admin-messaging-badge" id="adminMessagingBadge" hidden>0</b><span class="module-arrow">›</span>';
  card.addEventListener('click',()=>openMessaging(true));
  menu.appendChild(card);
}

function updateMuteButton(){const b=$('messagingMute');if(!b)return;b.textContent=muted?'🔇':'🔊';b.title=muted?'Activar sonidos':'Silenciar sonidos';b.setAttribute('aria-label',b.title)}
function toggleMute(){muted=!muted;localStorage.setItem(MUTE_KEY,muted?'1':'0');updateMuteButton()}

function conversationTitle(c){
  if(String(c.origenTipo||'').toUpperCase()==='ADMINISTRACION'&&String(c.memberIdCreador||'')===currentMemberId)return'Administración';
  return c.interlocutor?.nombreCompleto||c.asunto||'Conversación';
}
function conversationMeta(c){
  if(String(c.origenTipo||'').toUpperCase()==='ADMINISTRACION')return adminMode?'Mensaje a Administración':'Canal institucional';
  const p=c.interlocutor||{};return[p.rolResidencial,p.viviendaId].filter(Boolean).join(' · ')
}
function initials(name){return String(name||'U').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'U'}

function visibleInbox(){return adminMode?inbox.filter(c=>String(c.origenTipo||'').toUpperCase()==='ADMINISTRACION'):inbox}
function renderInbox(){
  const root=$('messagingInbox');if(!root)return;
  const q=String($('messagingSearch')?.value||'').trim().toLowerCase();
  const list=visibleInbox().filter(c=>!q||[conversationTitle(c),conversationMeta(c),c.ultimoMensaje?.mensaje].some(v=>String(v||'').toLowerCase().includes(q)));
  if(!list.length){root.innerHTML=adminMode?'<div class="empty-state"><strong>Sin mensajes para Administración</strong><span>No hay conversaciones institucionales en esta bandeja.</span></div>':'<div class="empty-state"><strong>Sin conversaciones</strong><span>Inicia una conversación con otro usuario o con Administración.</span></div>';return}
  root.innerHTML=list.map(c=>{const title=conversationTitle(c),last=c.ultimoMensaje?.mensaje||'Sin mensajes todavía',n=Number(c.pendientes||0);return `<button class="messaging-conversation" type="button" data-conversation="${esc(c.conversacionId)}"><span class="messaging-avatar">${esc(initials(title))}</span><span class="messaging-conversation-copy"><strong>${esc(title)}</strong><small>${esc(last)}</small><em>${esc(conversationMeta(c))}</em></span><span class="messaging-conversation-tail"><time>${esc(fmtDate(c.fechaUltimoMensaje||c.ultimoMensaje?.fechaEnvio))}</time>${n?`<b>${n>99?'99+':n}</b>`:''}</span></button>`}).join('');
  root.querySelectorAll('[data-conversation]').forEach(b=>b.onclick=()=>openConversation(b.dataset.conversation));
}

async function loadInbox(){
  syncAdminEntry();
  const root=$('messagingInbox');if(root)root.innerHTML='<div class="empty-state"><strong>Cargando mensajes…</strong><span>Consultando tu bandeja.</span></div>';
  try{const d=await getFn(FN.inbox);if(!d?.ok)throw Error(d?.reason||'MENSAJERIA_ERROR');currentMemberId=d.memberId||currentMemberId;inbox=Array.isArray(d.conversaciones)?d.conversaciones:[];setBadge(d.pendientesTotal||0);setAdminBadge(d.pendientesAdministracion||0);renderInbox()}catch(e){console.error('Mensajería bandeja:',e);if(root)root.innerHTML='<div class="empty-state"><strong>No fue posible cargar Mensajería</strong><span>Verifica la conexión e intenta nuevamente.</span></div>'}
}

async function openMessaging(fromAdmin=false){ensureUi();syncAdminEntry();showMessaging(fromAdmin);showInboxPanel()}

async function openConversation(id){
  const c=inbox.find(x=>String(x.conversacionId)===String(id));
  activeConversation=c||{conversacionId:id};
  showThreadPanel();
  $('messagingThreadName').textContent=c?conversationTitle(c):'Conversación';
  $('messagingThreadMeta').textContent=c?conversationMeta(c):'';
  $('messagingThread').innerHTML='<div class="empty-state"><strong>Cargando conversación…</strong></div>';
  try{
    const d=await getFnQuery(FN.messages,{conversacionId:id});
    if(!d?.ok)throw Error(d?.reason||'MENSAJES_ERROR');
    activeConversation={...(c||{}),...(d.conversacion||{}),conversacionId:id};
    renderThread(d.mensajes||[]);
    await postFn(FN.read,{conversacionId:id}).catch(()=>null);
    await loadInbox();
    showThreadPanel();
    refreshPending(false);
  }catch(e){console.error('Mensajería conversación:',e);$('messagingThread').innerHTML='<div class="empty-state"><strong>No fue posible abrir la conversación</strong></div>'}
}

function renderThread(messages){
  const root=$('messagingThread');
  if(!messages.length){root.innerHTML='<div class="empty-state compact"><span>No hay mensajes todavía.</span></div>';return}
  root.innerHTML=messages.map(m=>{const own=String(m.memberIdAutor)===String(currentMemberId);return `<div class="messaging-bubble-row ${own?'own':''}"><div class="messaging-bubble"><p>${esc(m.mensaje)}</p><time>${esc(fmtDate(m.fechaEnvio))}${own&&m.leido?' · Leído':''}</time></div></div>`}).join('');
  root.scrollTop=root.scrollHeight;
}

async function sendActiveMessage(e){
  e.preventDefault();
  if(!activeConversation?.conversacionId)return;
  const input=$('messagingText');const text=String(input.value||'').trim();if(!text)return;
  const btn=$('messagingSend');btn.disabled=true;
  try{const d=await postFn(FN.send,{conversacionId:activeConversation.conversacionId,mensaje:text});if(!d?.ok)throw Error(d?.reason||'SEND_ERROR');input.value='';play('sent');await openConversation(activeConversation.conversacionId)}catch(err){console.error('Mensajería enviar:',err);alert('No fue posible enviar el mensaje.')}finally{btn.disabled=false;input.focus()}
}

async function openNewConversation(){
  const sheet=$('messagingNewSheet');sheet.classList.add('open');$('messagingUserSearch').value='';$('messagingUserResults').innerHTML='<div class="empty-state compact"><span>Cargando usuarios…</span></div>';$('messagingNewStatus').textContent='';
  try{const d=await getFn(FN.users);if(!d?.ok)throw Error(d?.reason||'USERS_ERROR');allUsers=Array.isArray(d.usuarios)?d.usuarios:[];renderUsers()}catch(e){console.error(e);$('messagingUserResults').innerHTML='<div class="empty-state compact"><span>No fue posible cargar usuarios.</span></div>'}
}
function renderUsers(){
  const root=$('messagingUserResults');if(!root)return;const q=String($('messagingUserSearch')?.value||'').trim().toLowerCase();const list=allUsers.filter(u=>!q||[u.nombreCompleto,u.rolResidencial,u.viviendaId].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,40);
  root.innerHTML=list.length?list.map(u=>`<button class="messaging-user" type="button" data-message-user="${esc(u.memberId)}"><span class="messaging-avatar">${esc(initials(u.nombreCompleto))}</span><span><strong>${esc(u.nombreCompleto||'Usuario')}</strong><small>${esc([u.rolResidencial,u.viviendaId].filter(Boolean).join(' · '))}</small></span><span class="module-arrow">›</span></button>`).join(''):'<div class="empty-state compact"><span>Sin coincidencias.</span></div>';
  root.querySelectorAll('[data-message-user]').forEach(b=>b.onclick=()=>startDirect(b.dataset.messageUser));
}
async function startDirect(memberId){
  const status=$('messagingNewStatus');status.textContent='Abriendo conversación…';
  try{const d=await postFn(FN.conversation,{memberIdDestino:memberId,origenTipo:'DIRECTO'});if(!d?.ok)throw Error(d?.reason||'CREATE_ERROR');$('messagingNewSheet').classList.remove('open');await loadInbox();await openConversation(d.conversacionId)}catch(e){console.error(e);status.textContent='No fue posible iniciar la conversación.'}
}
async function openAdministration(){
  const existing=inbox.find(c=>String(c.origenTipo||'').toUpperCase()==='ADMINISTRACION'&&String(c.memberIdCreador||'')===String(currentMemberId));
  if(existing){await openConversation(existing.conversacionId);return}
  try{const d=await postFn(FN.conversation,{origenTipo:'ADMINISTRACION',asunto:'Administración'});if(!d?.ok)throw Error(d?.reason||'CREATE_ADMIN_ERROR');await loadInbox();await openConversation(d.conversacionId)}catch(e){console.error('Mensajería Administración:',e);alert('No fue posible abrir el canal con Administración.')}
}

async function refreshPending(sound=true){
  try{
    syncAdminEntry();
    if(!(await client.auth.loggedIn()))return;
    const d=await getFn(FN.pending);if(!d?.ok)return;
    const n=Number(d.pendientesTotal||0);setBadge(n);setAdminBadge(d.pendientesAdministracion||0);
    if(pendingSnapshot===null){pendingSnapshot=n;return}
    if(sound&&n>pendingSnapshot)play('pending');
    pendingSnapshot=n;
  }catch{}
}
function startPolling(){if(pollTimer)return;refreshPending(false);pollTimer=setInterval(()=>refreshPending(true),30000)}

ensureCss();
ensureUi();
badge();
syncAdminEntry();
const adminSection=$('adminSection');
if(adminSection)new MutationObserver(syncAdminEntry).observe(adminSection,{attributes:true,attributeFilter:['hidden']});
document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-module="mensajeria"]');
  if(!b)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openMessaging(false);
},true);

setTimeout(startPolling,1200);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPending(true)});