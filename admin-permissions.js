import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const stored=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(stored?{tokens:stored}:{})}),modules:{functions}});
const FN={users:'resAdminUsuarios',status:'resAdminUsuarioEstatus'};
const $=id=>document.getElementById(id);
let users=[];
let selectedUserIndex=-1;
let isGeneralAdmin=false;

const MODULES=[
  {key:'ADMIN_USUARIOS',label:'Usuarios',description:'Operación del módulo de Usuarios.'},
  {key:'ADMIN_GRUPOS',label:'Grupos',description:'Operación del módulo de Grupos.'},
  {key:'ADMIN_DOCUMENTACION',label:'Documentación',description:'Operación del módulo de Documentación.'},
  {key:'ADMIN_PROGRAMACION',label:'Programación',description:'Operación del módulo de Programación.'},
  {key:'ADMIN_REPORTES',label:'Reportes',description:'Operación del módulo de Reportes.'},
  {key:'CONTROL_ACCESOS',label:'Control de Accesos',description:'Operación del módulo de Control de Accesos.'}
];

const style=document.createElement('style');
style.textContent=`
.special-permissions-entry{display:flex;justify-content:flex-end;margin:0 0 12px}.special-permissions-btn{border:0;background:transparent;color:#667789;font-size:12px;line-height:1.15;text-align:right;cursor:pointer;padding:4px 2px}.special-permissions-btn span{display:block}.special-permissions-btn:hover{color:#17324d;text-decoration:underline;text-underline-offset:3px}
.special-permissions-sheet{position:fixed;inset:0;z-index:10020;background:rgba(12,25,39,.46);display:none;align-items:center;justify-content:center;padding:18px}.special-permissions-sheet.open{display:flex}.special-permissions-panel{width:min(700px,100%);max-height:min(800px,92vh);overflow:auto;background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 70px rgba(10,25,40,.24);position:relative}.special-permissions-close{position:absolute;right:18px;top:16px;border:0;background:#f0f4f7;width:42px;height:42px;border-radius:50%;font-size:28px;cursor:pointer}.special-permissions-kicker{margin:0 0 6px;color:#48ad2f;font-weight:800;letter-spacing:.18em;font-size:12px}.special-permissions-panel h2{margin:0;color:#17324d;font-size:27px}.special-permissions-intro{color:#68798a;font-size:14px;line-height:1.45;margin:8px 48px 18px 0}
.special-user-selector{margin:0 0 18px}.special-user-selector label{display:block;color:#17324d;font-size:12px;font-weight:800;margin:0 0 6px}.special-user-selector select{width:100%;min-height:46px;border:1px solid #d6e0e7;border-radius:12px;background:#fff;color:#17324d;font-size:14px;padding:0 12px}
.special-selected-user{border:1px solid #e0e7ed;border-radius:14px;padding:12px 14px;margin:0 0 12px;background:#f8fafb}.special-selected-user strong{display:block;color:#17324d;font-size:14px}.special-selected-user span{display:block;color:#718090;font-size:12px;margin-top:2px}
.special-permissions-list{display:grid;gap:9px}.special-module-row{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #e0e7ed;border-radius:14px;padding:12px 14px;background:#fff}.special-module-copy{min-width:0}.special-module-copy strong{display:block;color:#17324d;font-size:14px}.special-module-copy span{display:block;color:#718090;font-size:12px;margin-top:2px}
.special-permission-switch{position:relative;width:44px;height:25px;flex:0 0 auto}.special-permission-switch input{opacity:0;width:0;height:0}.special-permission-slider{position:absolute;inset:0;border-radius:999px;background:#c8d1da;cursor:pointer;transition:.2s}.special-permission-slider:before{content:'';position:absolute;width:19px;height:19px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}.special-permission-switch input:checked+.special-permission-slider{background:#0f5f8f}.special-permission-switch input:checked+.special-permission-slider:before{transform:translateX(19px)}.special-permission-switch input:disabled+.special-permission-slider{opacity:.48;cursor:not-allowed}.special-permissions-status{min-height:18px;margin:12px 0 0;color:#667789;font-size:12px}
.permission-confirm{position:fixed;inset:0;z-index:10030;background:rgba(12,25,39,.56);display:flex;align-items:center;justify-content:center;padding:18px}.permission-confirm-card{width:min(440px,100%);background:#fff;border-radius:22px;padding:24px;text-align:center;box-shadow:0 0 0 rgba(179,34,45,0);animation:criticalZoom .52s ease-out}.permission-confirm-icon{width:58px;height:58px;margin:0 auto 13px;border-radius:50%;display:grid;place-items:center;background:#fff1f2;color:#b32635;font-size:27px;font-weight:900}.permission-confirm-card h3{margin:0;color:#17324d;font-size:22px}.permission-confirm-card p{color:#68798a;font-size:14px;line-height:1.5;margin:10px 0 20px}.permission-confirm-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.permission-confirm-actions button{min-height:46px;border-radius:12px;font-weight:750;cursor:pointer}.permission-cancel{background:#fff;border:1px solid #ccd7e0;color:#17324d}.permission-critical{background:#b32635;border:1px solid #b32635;color:#fff}@keyframes criticalZoom{0%{transform:scale(.88);box-shadow:0 0 0 rgba(179,34,45,0)}45%{transform:scale(1.025);box-shadow:0 0 34px rgba(179,34,45,.42)}100%{transform:scale(1);box-shadow:0 0 12px rgba(179,34,45,.16)}}
@media(max-width:600px){.special-permissions-panel{padding:20px 16px;border-radius:20px}.special-module-row{padding:11px}.permission-confirm-actions{grid-template-columns:1fr}}
`;
document.head.appendChild(style);

async function getUsers(){const r=await client.functions.get(FN.users);return r.json()}
async function postStatus(payload){const r=await client.functions.post(FN.status,{headers:{'Content-Type':'application/json'},params:new URLSearchParams(),body:JSON.stringify(payload)});return r.json()}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function ensureUI(){
 if(!$('specialPermissionsEntry')){
  const toolbar=document.querySelector('#usersView .users-toolbar');
  if(toolbar)toolbar.insertAdjacentHTML('afterend','<div class="special-permissions-entry" id="specialPermissionsEntry" style="display:none"><button class="special-permissions-btn" id="openSpecialPermissions" type="button"><span>Permisos</span><span>Especiales</span></button></div>');
 }
 if(!$('specialPermissionsSheet'))document.body.insertAdjacentHTML('beforeend',`<div class="special-permissions-sheet" id="specialPermissionsSheet"><div class="special-permissions-panel"><button class="special-permissions-close" id="closeSpecialPermissions" type="button">×</button><p class="special-permissions-kicker">ADMINISTRACIÓN</p><h2>Permisos Especiales</h2><p class="special-permissions-intro">Asigna responsabilidades administrativas específicas sin otorgar administración general del residencial.</p><div class="special-user-selector"><label for="specialPermissionsUser">Usuario</label><select id="specialPermissionsUser"><option value="">Selecciona un usuario</option></select></div><div id="specialSelectedUser"></div><div class="special-permissions-list" id="specialPermissionsList"></div><p class="special-permissions-status" id="specialPermissionsStatus"></p></div></div>`);
 $('openSpecialPermissions')?.addEventListener('click',openPermissions);
 $('closeSpecialPermissions')?.addEventListener('click',closePermissions);
 $('specialPermissionsSheet')?.addEventListener('click',e=>{if(e.target===$('specialPermissionsSheet'))closePermissions()});
 $('specialPermissionsUser')?.addEventListener('change',e=>{selectedUserIndex=Number(e.target.value);renderSelectedUser()});
}

function closePermissions(){$('specialPermissionsSheet')?.classList.remove('open')}

async function refreshAccess(){
 ensureUI();
 try{
  const d=await getUsers();
  isGeneralAdmin=d?.ok===true&&d?.administradorGeneral===true;
  users=Array.isArray(d?.users)?d.users:[];
 }catch(e){
  console.error(e);
  isGeneralAdmin=false;
  users=[];
 }
 const entry=$('specialPermissionsEntry');
 if(entry)entry.style.display=isGeneralAdmin?'flex':'none';
 return isGeneralAdmin;
}

async function openPermissions(){
 ensureUI();
 const allowed=await refreshAccess();
 if(!allowed)return;
 $('specialPermissionsSheet').classList.add('open');
 $('specialPermissionsStatus').textContent='';
 selectedUserIndex=-1;
 renderUserSelector();
 renderSelectedUser();
}

function renderUserSelector(){
 const select=$('specialPermissionsUser');
 if(!select)return;
 const active=users
  .map((u,index)=>({u,index}))
  .filter(x=>String(x.u.estatus||'').trim().toLowerCase()==='activo');
 select.innerHTML='<option value="-1">Selecciona un usuario</option>'+active.map(({u,index})=>{
  const admin=u.administradorGeneral===true||String(u.rolResidencial||'').trim().toLowerCase()==='administrador';
  const label=`${u.nombreCompleto||u.nombre||'Usuario'}${admin?' — Administrador General':''}`;
  return `<option value="${index}">${esc(label)}</option>`;
 }).join('');
 select.value='-1';
}

function renderSelectedUser(){
 const box=$('specialSelectedUser');
 const list=$('specialPermissionsList');
 if(!box||!list)return;
 const user=users[selectedUserIndex];
 if(!user){
  box.innerHTML='';
  list.innerHTML='<div class="special-module-row"><div class="special-module-copy"><strong>Selecciona un usuario</strong><span>Se mostrarán aquí los módulos que pueden asignarse.</span></div></div>';
  return;
 }
 const admin=user.administradorGeneral===true||String(user.rolResidencial||'').trim().toLowerCase()==='administrador';
 box.innerHTML=`<div class="special-selected-user"><strong>${esc(user.nombreCompleto||user.nombre||'Usuario')}</strong><span>${admin?'Administrador General · acceso total no delegable':esc(user.rolResidencial||'Usuario')}</span></div>`;
 const permissions=user.permisosEspeciales||{};
 list.innerHTML=MODULES.map(m=>{
  const checked=admin||permissions[m.key]===true||(m.key==='CONTROL_ACCESOS'&&user.controlAccesos===true);
  return `<div class="special-module-row"><div class="special-module-copy"><strong>${esc(m.label)}</strong><span>${admin?'Incluido por Administración General':esc(m.description)}</span></div><label class="special-permission-switch"><input type="checkbox" data-special-module="${esc(m.key)}" ${checked?'checked':''} ${admin?'disabled':''}><span class="special-permission-slider"></span></label></div>`;
 }).join('');
 document.querySelectorAll('[data-special-module]').forEach(input=>input.addEventListener('change',requestChange));
}

function requestChange(e){
 const input=e.currentTarget;
 const user=users[selectedUserIndex];
 const moduleKey=input.dataset.specialModule;
 const module=MODULES.find(m=>m.key===moduleKey);
 const requested=input.checked;
 input.checked=!requested;
 if(!user||!module)return;
 const name=user.nombreCompleto||user.nombre||'este usuario';
 const text=requested
  ?`Vas a autorizar a ${name} la operación del módulo ${module.label}. Este permiso no lo convierte en Administrador General.`
  :`Vas a retirar a ${name} la operación del módulo ${module.label}.`;
 const overlay=document.createElement('div');
 overlay.className='permission-confirm';
 overlay.innerHTML=`<div class="permission-confirm-card"><div class="permission-confirm-icon">!</div><h3>${requested?'Autorizar permiso':'Retirar permiso'}</h3><p>${esc(text)}</p><div class="permission-confirm-actions"><button class="permission-cancel" type="button">Cancelar</button><button class="permission-critical" type="button">${requested?'Autorizar':'Retirar'}</button></div></div>`;
 document.body.appendChild(overlay);
 overlay.querySelector('.permission-cancel').onclick=()=>overlay.remove();
 overlay.addEventListener('click',ev=>{if(ev.target===overlay)overlay.remove()});
 overlay.querySelector('.permission-critical').onclick=async()=>{overlay.remove();await savePermission(user,module,requested)};
}

async function savePermission(user,module,requested){
 const status=$('specialPermissionsStatus');
 status.textContent=requested?'Asignando permiso…':'Retirando permiso…';
 try{
  const d=await postStatus({
   usuarioId:user.id||user._id||'',
   memberId:user.memberId||'',
   permisoModulo:{modulo:module.key,activo:requested}
  });
  if(!d?.ok)throw Error(d?.reason||'PERMISO_UPDATE_ERROR');
  if(!user.permisosEspeciales)user.permisosEspeciales={};
  user.permisosEspeciales[module.key]=requested;
  if(module.key==='CONTROL_ACCESOS'){
   user.controlAccesos=requested;
   user.controlAccesosDirecto=requested;
   user.controlAccesosHeredado=false;
  }
  status.textContent=requested?`Permiso de ${module.label} autorizado.`:`Permiso de ${module.label} retirado.`;
  renderSelectedUser();
 }catch(err){
  console.error(err);
  status.textContent='No fue posible actualizar el permiso.';
  renderSelectedUser();
 }
}

ensureUI();
refreshAccess();
