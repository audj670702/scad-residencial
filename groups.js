import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const storedTokens=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(storedTokens?{tokens:storedTokens}:{})}),modules:{functions}});
const FN={list:'resAdminGrupos',save:'resAdminGrupoGuardar',state:'resAdminGrupoEstado',members:'resAdminGrupoIntegrantes',users:'resAdminGrupoUsuarios',member:'resAdminGrupoMiembro'};
const $=id=>document.getElementById(id);
let groups=[],activeGroup=null,allUsers=[],members=[];

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function showOnly(view){['authView','appView','adminView','usersView','groupsView'].forEach(id=>{const el=$(id);if(el)el.hidden=el!==view})}
async function getFn(name){const r=await client.functions.get(name);return r.json()}
async function postFn(name,payload){const r=await client.functions.post(name,{headers:{'Content-Type':'application/json'},params:new URLSearchParams(),body:JSON.stringify(payload)});return r.json()}
function message(text){$('groupStatusMsg').textContent=text||''}

function renderGroups(){
 const active=groups.filter(g=>g.activo===true).length;
 $('groupsQuota').textContent=`${active} / 5`;
 $('newGroupBtn').disabled=active>=5;
 if(!groups.length){$('groupsList').innerHTML='<div class="empty-state"><strong>Sin grupos</strong><span>Crea el primer grupo para utilizarlo como audiencia.</span></div>';return}
 $('groupsList').innerHTML=groups.map(g=>`<article class="group-card"><button class="group-open" type="button" data-open-group="${esc(g.grupoId)}"><span class="group-card-icon">👥</span><span class="group-card-copy"><strong>${esc(g.nombre)}</strong><small>${esc(g.descripcion||'Sin descripción')}</small><em>${Number(g.integrantes||0)} integrante${Number(g.integrantes||0)===1?'':'s'}</em></span><span class="group-state ${g.activo?'on':''}">${g.activo?'Activo':'Inactivo'}</span></button><button class="group-toggle" type="button" data-toggle-group="${esc(g.grupoId)}" data-active="${g.activo?'1':'0'}">${g.activo?'Desactivar':'Activar'}</button></article>`).join('');
 document.querySelectorAll('[data-open-group]').forEach(b=>b.onclick=()=>openGroup(b.dataset.openGroup));
 document.querySelectorAll('[data-toggle-group]').forEach(b=>b.onclick=()=>toggleGroup(b.dataset.toggleGroup,b.dataset.active!=='1'));
}

async function loadGroups(){
 showOnly($('groupsView'));$('groupsList').innerHTML='<div class="empty-state"><strong>Cargando grupos…</strong><span>Consultando RES_Grupos.</span></div>';
 try{const d=await getFn(FN.list);if(!d?.ok)throw Error(d?.reason||'ERROR');groups=Array.isArray(d.grupos)?d.grupos:[];renderGroups()}catch(e){console.error(e);$('groupsList').innerHTML='<div class="empty-state"><strong>No fue posible cargar Grupos</strong><span>Verifica que las funciones de Grupos estén publicadas en Wix.</span></div>'}
}

function newGroup(){
 activeGroup=null;members=[];allUsers=[];$('groupId').value='';$('groupName').value='';$('groupDescription').value='';$('groupSheetTitle').textContent='Nuevo grupo';$('groupMembersBlock').hidden=true;message('');$('groupSheet').classList.add('open');
}

async function openGroup(grupoId){
 activeGroup=groups.find(g=>g.grupoId===grupoId)||null;if(!activeGroup)return;
 $('groupId').value=activeGroup.grupoId;$('groupName').value=activeGroup.nombre||'';$('groupDescription').value=activeGroup.descripcion||'';$('groupSheetTitle').textContent=activeGroup.nombre;$('groupMembersBlock').hidden=false;$('groupUserSearch').value='';$('groupUserResults').innerHTML='';message('Cargando integrantes…');$('groupSheet').classList.add('open');
 try{const [m,u]=await Promise.all([postFn(FN.members,{grupoId}),getFn(FN.users)]);if(!m?.ok||!u?.ok)throw Error('LOAD');members=m.integrantes||[];allUsers=u.usuarios||[];renderMembers();message('')}catch(e){console.error(e);message('No fue posible cargar los integrantes.')}
}

function person(u,action){const meta=[u.vivienda,u.email,u.rolResidencial].filter(Boolean).map(esc).join(' · ');return `<div class="group-person"><span><strong>${esc(u.nombreCompleto||'Usuario')}</strong><small>${meta}</small></span><button type="button" data-member-action="${action}" data-member-id="${esc(u.memberId)}">${action==='add'?'+ Agregar':'Quitar'}</button></div>`}
function renderMembers(){
 $('groupMemberCount').textContent=String(members.length);
 $('groupMembers').innerHTML=members.length?members.map(u=>person(u,'remove')).join(''):'<div class="empty-state compact"><span>Sin integrantes.</span></div>';
 bindMemberButtons($('groupMembers'));
 renderUserResults();
}
function renderUserResults(){
 const q=$('groupUserSearch').value.trim().toLowerCase();if(q.length<2){$('groupUserResults').innerHTML='';return}
 const ids=new Set(members.map(x=>x.memberId));const result=allUsers.filter(u=>!ids.has(u.memberId)&&[u.nombreCompleto,u.email,u.vivienda].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,12);
 $('groupUserResults').innerHTML=result.length?result.map(u=>person(u,'add')).join(''):'<div class="empty-state compact"><span>Sin coincidencias.</span></div>';bindMemberButtons($('groupUserResults'));
}
function bindMemberButtons(root){root.querySelectorAll('[data-member-action]').forEach(b=>b.onclick=()=>changeMember(b.dataset.memberId,b.dataset.memberAction))}

async function changeMember(memberId,action){
 if(!activeGroup)return;message(action==='add'?'Agregando usuario…':'Quitando usuario…');
 try{const d=await postFn(FN.member,{grupoId:activeGroup.grupoId,memberId,accion:action});if(!d?.ok)throw Error(d?.reason||'ERROR');const m=await postFn(FN.members,{grupoId:activeGroup.grupoId});members=m.integrantes||[];renderMembers();message(action==='add'?'Usuario agregado.':'Usuario retirado.');await refreshGroups()}catch(e){console.error(e);message('No fue posible actualizar el grupo.')}
}

async function refreshGroups(){try{const d=await getFn(FN.list);if(d?.ok){groups=d.grupos||[];renderGroups();if(activeGroup)activeGroup=groups.find(g=>g.grupoId===activeGroup.grupoId)||activeGroup}}catch(e){console.warn(e)}}
async function toggleGroup(grupoId,activo){
 try{const d=await postFn(FN.state,{grupoId,activo});if(!d?.ok)throw Error(d?.reason||'ERROR');await refreshGroups()}catch(e){alert(String(e?.message||'No fue posible cambiar el estado del grupo.').includes('LIMITE')?'Ya existen 5 grupos activos. Desactiva uno para liberar un cupo.':'No fue posible cambiar el estado del grupo.')}
}

$('groupForm').addEventListener('submit',async e=>{e.preventDefault();const payload={grupoId:$('groupId').value.trim(),nombre:$('groupName').value.trim(),descripcion:$('groupDescription').value.trim()};if(!payload.nombre)return;message('Guardando…');$('groupSaveBtn').disabled=true;try{const d=await postFn(FN.save,payload);if(!d?.ok)throw Error(d?.reason||'ERROR');message('Grupo guardado.');await refreshGroups();if(!payload.grupoId&&d.grupo?.grupoId){$('groupSheet').classList.remove('open');await openGroup(d.grupo.grupoId)}}catch(e){console.error(e);message(String(e?.message||'').includes('LIMITE')?'Ya existen 5 grupos activos.':'No fue posible guardar el grupo.')}finally{$('groupSaveBtn').disabled=false}});
$('groupUserSearch').addEventListener('input',renderUserResults);
$('openGroupsBtn').addEventListener('click',loadGroups);
$('groupsBack').addEventListener('click',()=>showOnly($('adminView')));
$('newGroupBtn').addEventListener('click',newGroup);
$('groupClose').addEventListener('click',()=>$('groupSheet').classList.remove('open'));
