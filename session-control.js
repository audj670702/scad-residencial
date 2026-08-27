import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const INSTANCE_KEY='scad_residencial_session_id';
const stored=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(stored?{tokens:stored}:{})}),modules:{functions}});
const $=id=>document.getElementById(id);
let validated=false,validating=false,logoutBypass=false;

function getSessionId(){
  let id=localStorage.getItem(INSTANCE_KEY);
  if(id)return id;
  id=(crypto?.randomUUID?.()||`SES-${Date.now()}-${Math.random().toString(36).slice(2,12)}`).toUpperCase();
  localStorage.setItem(INSTANCE_KEY,id);
  return id;
}

async function postFn(name,payload){
  const r=await client.functions.post(name,{headers:{'Content-Type':'application/json'},params:new URLSearchParams(),body:JSON.stringify(payload)});
  return r.json();
}

function ensureGate(){
  if($('sessionGate'))return $('sessionGate');
  const app=$('appView');
  if(!app)return null;
  app.insertAdjacentHTML('afterend',`<section id="sessionGate" hidden><div class="auth-view"><div class="auth-copy"><h1 id="sessionGateTitle">Validando sesión</h1><p id="sessionGateText">Comprobando que esta cuenta no esté siendo utilizada en otra instancia.</p></div></div></section>`);
  return $('sessionGate');
}

function showGate(title,text){
  const gate=ensureGate();
  if(!gate)return;
  ['appView','adminView','usersView','groupsView','documentsAdminView','programmingAdminView','residentDocumentsView','residentProgrammingView'].forEach(id=>{const e=$(id);if(e)e.hidden=true});
  gate.hidden=false;
  $('sessionGateTitle').textContent=title;
  $('sessionGateText').textContent=text;
}

function allowApp(){
  const gate=ensureGate();if(gate)gate.hidden=true;
  validated=true;
  const app=$('appView');if(app)app.hidden=false;
  const footer=document.querySelector('.app-footer span');if(footer)footer.textContent='v0.31';
}

async function claimSession(){
  if(validated||validating)return;
  validating=true;
  showGate('Validando sesión','Comprobando que esta cuenta no esté siendo utilizada en otra instancia.');
  try{
    if(!(await client.auth.loggedIn())){validating=false;return}
    const data=await postFn('resSesionAbrir',{sesionId:getSessionId()});
    if(data?.ok){allowApp();return}
    if(data?.reason==='SESION_ACTIVA_EN_OTRA_INSTANCIA'){
      showGate('Sesión activa en otra instancia','Esta cuenta ya está siendo utilizada en otra instancia de SCaD Residencial. Cierra la sesión activa antes de continuar aquí.');
      return;
    }
    showGate('No fue posible validar la sesión','SCaD Residencial no pudo completar el control de sesión.');
  }catch(e){
    console.error('SCaD Residencial sesión:',e);
    showGate('No fue posible validar la sesión','Verifica la conexión y que las funciones de sesión estén publicadas en Wix.');
  }finally{validating=false}
}

async function releaseSession(){
  try{
    if(await client.auth.loggedIn())await postFn('resSesionCerrar',{sesionId:getSessionId()});
  }catch(e){console.warn('SCaD Residencial liberar sesión:',e)}
}

function watchApp(){
  const app=$('appView');if(!app)return;
  const obs=new MutationObserver(()=>{
    if(!validated&&!app.hidden)claimSession();
  });
  obs.observe(app,{attributes:true,attributeFilter:['hidden']});
  if(!app.hidden)claimSession();
}

function hookLogout(){
  const btn=$('logoutBtn');if(!btn)return;
  btn.addEventListener('click',async e=>{
    if(logoutBypass)return;
    e.preventDefault();e.stopImmediatePropagation();
    btn.disabled=true;
    await releaseSession();
    logoutBypass=true;
    btn.disabled=false;
    btn.click();
  },true);
}

ensureGate();
watchApp();
hookLogout();