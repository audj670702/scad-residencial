import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const stored=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(stored?{tokens:stored}:{})}),modules:{functions}});
const FN={users:'resAdminUsuarios',get:'resAdminModuloPermiso',set:'resAdminModuloPermisoActualizar'};
const $=id=>document.getElementById(id);
let selectedUser=null,selectedIndex=-1;

const style=document.createElement('style');
style.textContent=`
.admin-permission-block{margin:16px 0 4px;padding:14px;border:1px solid #dfe6ed;border-radius:14px;background:#f8fafc}
.admin-permission-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.admin-permission-head strong{display:block;font-size:15px;color:#17324d}.admin-permission-head small{display:block;margin-top:3px;color:#6c7a89;font-size:12px}
.admin-permission-switch{position:relative;width:46px;height:26px;flex:0 0 auto}.admin-permission-switch input{opacity:0;width:0;height:0}.admin-permission-slider{position:absolute;inset:0;border-radius:999px;background:#c8d1da;cursor:pointer;transition:.2s}.admin-permission-slider:before{content:'';position:absolute;width:20px;height:20px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}.admin-permission-switch input:checked+.admin-permission-slider{background:#0f5f8f}.admin-permission-switch input:checked+.admin-permission-slider:before{transform:translateX(20px)}.admin-permission-switch input:disabled+.admin-permission-slider{opacity:.55;cursor:not-allowed}.admin-permission-note{margin:10px 0 0;font-size:12px;line-height:1.4;color:#607080}.admin-permission-note.inherited{color:#355f79}.admin-permission-status{margin-top:8px;font-size:12px;color:#355f79}`;
document.head.appendChild(style);

async function getFn(n){const r=await client.functions.get(n);return r.json()}
async function postFn(n,p){const r=await client.functions.post(n,{headers:{'Content-Type':'application/json'},params:new URLSearchParams(),body:JSON.stringify(p)});return r.json()}

function ensureBlock(){
 if($('adminModulePermissionBlock'))return $('adminModulePermissionBlock');
 const detailActions=$('detailActions');
 if(!detailActions)return null;
 detailActions.insertAdjacentHTML('beforebegin',`<div id="adminModulePermissionBlock" class="admin-permission-block" hidden><div class="admin-permission-head"><div><strong>Control de Accesos</strong><small>Permiso especial de módulo</small></div><label class="admin-permission-switch"><input id="adminControlAccessToggle" type="checkbox"><span class="admin-permission-slider"></span></label></div><p id="adminControlAccessNote" class="admin-permission-note"></p><div id="adminControlAccessStatus" class="admin-permission-status"></div></div>`);
 $('adminControlAccessToggle').addEventListener('change',savePermission);
 return $('adminModulePermissionBlock');
}

async function resolveSelectedUser(index){
 try{
  const d=await getFn(FN.users);
  const users=Array.isArray(d?.users)?d.users:[];
  return users[index]||null;
 }catch(e){console.error('SCaD Residencial permisos / usuarios:',e);return null}
}

async function loadPermission(){
 const block=ensureBlock();if(!block||!selectedUser)return;
 block.hidden=false;
 const toggle=$('adminControlAccessToggle'),note=$('adminControlAccessNote'),status=$('adminControlAccessStatus');
 toggle.disabled=true;status.textContent='Consultando permiso…';note.textContent='';
 try{
  const memberId=String(selectedUser.memberId||'').trim();
  const usuarioId=String(selectedUser.id||selectedUser._id||'').trim();
  const qs=new URLSearchParams({usuarioId,memberId});
  const r=await client.functions.get(`${FN.get}?${qs.toString()}`),d=await r.json();
  if(!d?.ok)throw Error(d?.reason||'PERMISO_ERROR');
  toggle.checked=d.effective===true;
  toggle.disabled=d.inherited===true || !memberId;
  if(!memberId){note.textContent='Este usuario todavía no tiene memberId disponible para asignación directa.'}
  else if(d.inherited===true){note.textContent=`Permiso heredado por rol: ${d.role||selectedUser.rolResidencial||'rol asignado'}.`;note.classList.add('inherited')}
  else{note.classList.remove('inherited');note.textContent=d.direct===true?'Permiso asignado directamente a este usuario.':'Sin permiso directo. Administración puede activarlo para este usuario.'}
  status.textContent='';
 }catch(e){console.error(e);toggle.disabled=true;status.textContent='No fue posible consultar el permiso.'}
}

async function savePermission(e){
 if(!selectedUser)return;
 const toggle=e.currentTarget,status=$('adminControlAccessStatus');
 const requested=toggle.checked;
 toggle.disabled=true;status.textContent=requested?'Activando permiso…':'Retirando permiso…';
 try{
  const memberId=String(selectedUser.memberId||'').trim();
  const usuarioId=String(selectedUser.id||selectedUser._id||'').trim();
  const d=await postFn(FN.set,{usuarioId,memberId,modulo:'CONTROL_ACCESOS',activo:requested});
  if(!d?.ok)throw Error(d?.reason||'PERMISO_UPDATE_ERROR');
  status.textContent=requested?'Permiso activado correctamente.':'Permiso retirado correctamente.';
  await loadPermission();
 }catch(e2){console.error(e2);toggle.checked=!requested;toggle.disabled=false;status.textContent='No fue posible actualizar el permiso.'}
}

document.addEventListener('click',async e=>{
 const btn=e.target.closest?.('[data-user-index]');
 if(!btn)return;
 selectedIndex=Number(btn.dataset.userIndex);
 selectedUser=await resolveSelectedUser(selectedIndex);
 setTimeout(loadPermission,0);
},true);

ensureBlock();
