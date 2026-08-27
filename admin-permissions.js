import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const stored=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(stored?{tokens:stored}:{})}),modules:{functions}});
const FN={users:'resAdminUsuarios',status:'resAdminUsuarioEstatus'};
const $=id=>document.getElementById(id);
let users=[];

const style=document.createElement('style');
style.textContent=`
.special-permissions-entry{display:flex;justify-content:flex-end;margin:0 0 12px}.special-permissions-btn{border:0;background:transparent;color:#667789;font-size:13px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:5px 2px}.special-permissions-btn:hover{color:#17324d}
.special-permissions-sheet{position:fixed;inset:0;z-index:10020;background:rgba(12,25,39,.46);display:none;align-items:center;justify-content:center;padding:18px}.special-permissions-sheet.open{display:flex}.special-permissions-panel{width:min(620px,100%);max-height:min(760px,92vh);overflow:auto;background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 70px rgba(10,25,40,.24);position:relative}.special-permissions-close{position:absolute;right:18px;top:16px;border:0;background:#f0f4f7;width:42px;height:42px;border-radius:50%;font-size:28px;cursor:pointer}.special-permissions-kicker{margin:0 0 6px;color:#48ad2f;font-weight:800;letter-spacing:.18em;font-size:12px}.special-permissions-panel h2{margin:0;color:#17324d;font-size:27px}.special-permissions-intro{color:#68798a;font-size:14px;line-height:1.45;margin:8px 48px 18px 0}.special-permissions-list{display:grid;gap:9px}.special-user-row{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #e0e7ed;border-radius:14px;padding:12px 14px;background:#fff}.special-user-copy{min-width:0}.special-user-copy strong{display:block;color:#17324d;font-size:14px}.special-user-copy span{display:block;color:#718090;font-size:12px;margin-top:2px}.special-permission-switch{position:relative;width:44px;height:25px;flex:0 0 auto}.special-permission-switch input{opacity:0;width:0;height:0}.special-permission-slider{position:absolute;inset:0;border-radius:999px;background:#c8d1da;cursor:pointer;transition:.2s}.special-permission-slider:before{content:'';position:absolute;width:19px;height:19px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}.special-permission-switch input:checked+.special-permission-slider{background:#0f5f8f}.special-permission-switch input:checked+.special-permission-slider:before{transform:translateX(19px)}.special-permission-switch input:disabled+.special-permission-slider{opacity:.48;cursor:not-allowed}.special-permissions-status{min-height:18px;margin:12px 0 0;color:#667789;font-size:12px}
.permission-confirm{position:fixed;inset:0;z-index:10030;background:rgba(12,25,39,.56);display:flex;align-items:center;justify-content:center;padding:18px}.permission-confirm-card{width:min(440px,100%);background:#fff;border-radius:22px;padding:24px;text-align:center;box-shadow:0 0 0 rgba(179,34,45,0);animation:criticalZoom .52s ease-out}.permission-confirm-icon{width:58px;height:58px;margin:0 auto 13px;border-radius:50%;display:grid;place-items:center;background:#fff1f2;color:#b32635;font-size:27px;font-weight:900}.permission-confirm-card h3{margin:0;color:#17324d;font-size:22px}.permission-confirm-card p{color:#68798a;font-size:14px;line-height:1.5;margin:10px 0 20px}.permission-confirm-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.permission-confirm-actions button{min-height:46px;border-radius:12px;font-weight:750;cursor:pointer}.permission-cancel{background:#fff;border:1px solid #ccd7e0;color:#17324d}.permission-critical{background:#b32635;border:1px solid #b32635;color:#fff}@keyframes criticalZoom{0%{transform:scale(.88);box-shadow:0 0 0 rgba(179,34,45,0)}45%{transform:scale(1.025);box-shadow:0 0 34px rgba(179,34,45,.42)}100%{transform:scale(1);box-shadow:0 0 12px rgba(179,34,45,.16)}}
@media(max-width:600px){.special-permissions-panel{padding:20px 16px;border-radius:20px}.special-user-row{padding:11px}.permission-confirm-actions{grid-template-columns:1fr}}
`;
document.head.appendChild(style);

async function getUsers(){const r=await client.functions.get(FN.users);return r.json()}
async function postStatus(payload){const r=await client.functions.post(FN.status,{headers:{'Content-Type':'application/json'},params:new URLSearchParams(),body:JSON.stringify(payload)});return r.json()}

function ensureUI(){
 if(!$('specialPermissionsEntry')){
  const toolbar=document.querySelector('#usersView .users-toolbar');
  if(toolbar)toolbar.insertAdjacentHTML('afterend','<div class="special-permissions-entry" id="specialPermissionsEntry"><button class="special-permissions-btn" id="openSpecialPermissions" type="button">Permisos especiales</button></div>');
 }
 if(!$('specialPermissionsSheet'))document.body.insertAdjacentHTML('beforeend',`<div class="special-permissions-sheet" id="specialPermissionsSheet"><div class="special-permissions-panel"><button class="special-permissions-close" id="closeSpecialPermissions" type="button">×</button><p class="special-permissions-kicker">ADMINISTRACIÓN</p><h2>Permisos especiales</h2><p class="special-permissions-intro">Habilitaciones excepcionales para funciones sensibles de operación.</p><div class="special-permissions-list" id="specialPermissionsList"></div><p class="special-permissions-status" id="specialPermissionsStatus"></p></div></div>`);
 $('openSpecialPermissions')?.addEventListener('click',openPermissions);
 $('closeSpecialPermissions')?.addEventListener('click',closePermissions);
 $('specialPermissionsSheet')?.addEventListener('click',e=>{if(e.target===$('specialPermissionsSheet'))closePermissions()});
}

function closePermissions(){$('specialPermissionsSheet')?.classList.remove('open')}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function openPermissions(){
 ensureUI();$('specialPermissionsSheet').classList.add('open');$('specialPermissionsList').innerHTML='<div class="special-user-row"><div class="special-user-copy"><strong>Cargando usuarios…</strong></div></div>';$('specialPermissionsStatus').textContent='';
 try{const d=await getUsers();if(!d?.ok)throw Error(d?.reason||'USERS_ERROR');users=Array.isArray(d.users)?d.users:[];renderUsers()}catch(e){console.error(e);$('specialPermissionsList').innerHTML='<div class="special-user-row"><div class="special-user-copy"><strong>No fue posible cargar los permisos.</strong></div></div>'}
}

function renderUsers(){
 const active=users.filter(u=>String(u.estatus||'').trim().toLowerCase()==='activo');
 if(!active.length){$('specialPermissionsList').innerHTML='<div class="special-user-row"><div class="special-user-copy"><strong>Sin usuarios activos</strong></div></div>';return}
 $('specialPermissionsList').innerHTML=active.map((u,i)=>{const originalIndex=users.indexOf(u),inherited=u.controlAccesosHeredado===true,noMember=!String(u.memberId||'').trim();const detail=inherited?`Incluido por rol: ${esc(u.rolResidencial||'')}`:(u.controlAccesosDirecto===true?'Asignación directa activa':'Control de Accesos');return `<div class="special-user-row"><div class="special-user-copy"><strong>${esc(u.nombreCompleto||u.nombre||'Usuario')}</strong><span>${detail}</span></div><label class="special-permission-switch"><input type="checkbox" data-special-user="${originalIndex}" ${u.controlAccesos===true?'checked':''} ${(inherited||noMember)?'disabled':''}><span class="special-permission-slider"></span></label></div>`}).join('');
 document.querySelectorAll('[data-special-user]').forEach(input=>input.addEventListener('change',requestChange));
}

function requestChange(e){
 const input=e.currentTarget,index=Number(input.dataset.specialUser),user=users[index],requested=input.checked;input.checked=!requested;
 const name=user?.nombreCompleto||user?.nombre||'este usuario';
 const verb=requested?'activar':'retirar';
 const text=requested?`Vas a habilitar a ${name} para operar Control de Accesos, incluyendo validación de entradas y registro de salidas.`:`Vas a retirar a ${name} el permiso para operar Control de Accesos.`;
 const overlay=document.createElement('div');overlay.className='permission-confirm';overlay.innerHTML=`<div class="permission-confirm-card"><div class="permission-confirm-icon">!</div><h3>Confirmar permiso crítico</h3><p>${esc(text)}</p><div class="permission-confirm-actions"><button class="permission-cancel" type="button">Cancelar</button><button class="permission-critical" type="button">${requested?'Activar permiso':'Retirar permiso'}</button></div></div>`;document.body.appendChild(overlay);
 overlay.querySelector('.permission-cancel').onclick=()=>overlay.remove();overlay.addEventListener('click',ev=>{if(ev.target===overlay)overlay.remove()});overlay.querySelector('.permission-critical').onclick=async()=>{overlay.remove();await savePermission(user,requested)};
}

async function savePermission(user,requested){
 const status=$('specialPermissionsStatus');status.textContent=requested?'Activando permiso…':'Retirando permiso…';
 try{const d=await postStatus({usuarioId:user.id||user._id||'',permisoControlAccesos:requested});if(!d?.ok)throw Error(d?.reason||'PERMISO_UPDATE_ERROR');user.controlAccesos=requested;user.controlAccesosDirecto=requested;user.controlAccesosHeredado=false;status.textContent=requested?'Permiso activado correctamente.':'Permiso retirado correctamente.';renderUsers()}catch(err){console.error(err);status.textContent='No fue posible actualizar el permiso.'}
}

ensureUI();
