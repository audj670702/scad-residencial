import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';
import { functions } from 'https://esm.sh/@wix/http-functions';

const CLIENT_ID='2a7eb7cd-240a-422b-9fe2-10f5dec36b5e';
const TOKENS_KEY='scad_residencial_wix_tokens';
const INSTANCE_KEY='scad_residencial_session_id';
const stored=(()=>{try{return JSON.parse(localStorage.getItem(TOKENS_KEY)||'null')}catch{return null}})();
const client=createClient({auth:OAuthStrategy({clientId:CLIENT_ID,...(stored?{tokens:stored}:{})}),modules:{functions}});
const $=id=>document.getElementById(id);
let validated=false,validating=false,logoutBypass=false;

function syncAuthTokens(){
  try{
    const tokens=JSON.parse(localStorage.getItem(TOKENS_KEY)||'null');
    if(tokens)client.auth.setTokens(tokens);
    return !!tokens;
  }catch{return false}
}

function getSessionId(){
  let id=localStorage.getItem(INSTANCE_KEY);
  if(id)return id;
  id=(crypto?.randomUUID?.()||`SES-${Date.now()}-${Math.random().toString(36).slice(2,12)}`).toUpperCase();
  localStorage.setItem(INSTANCE_KEY,id);
  return id;
}

async function postFn(name,payload){
  syncAuthTokens();
  const r=await client.functions.post(name,{headers:{'Content-Type':'application/json'},params:new URLSearchParams(),body:JSON.stringify(payload)});
  return r.json();
}

function ensureGate(){
  if($('sessionGate'))return $('sessionGate');
  const app=$('appView');
  if(!app)return null;
  app.insertAdjacentHTML('afterend',`<section id="sessionGate" hidden><div class="auth-view"><div class="auth-copy"><h1 id="sessionGateTitle">Validando sesión</h1><p id="sessionGateText">Comprobando la sesión activa.</p><div id="sessionGateActions" class="auth-actions" hidden><button class="auth-primary" id="sessionLoginBtn" type="button">← Regresar al login</button></div></div></div></section>`);
  $('sessionLoginBtn')?.addEventListener('click',returnToLogin);
  return $('sessionGate');
}

function showGate(title,text,{actions=false}={}){
  const gate=ensureGate();
  if(!gate)return;
  ['appView','adminView','usersView','groupsView','documentsAdminView','programmingAdminView','residentDocumentsView','residentProgrammingView'].forEach(id=>{const e=$(id);if(e)e.hidden=true});
  gate.hidden=false;
  $('sessionGateTitle').textContent=title;
  $('sessionGateText').textContent=text;
  const actionBox=$('sessionGateActions');if(actionBox)actionBox.hidden=!actions;
}

function allowApp(){
  const gate=ensureGate();if(gate)gate.hidden=true;
  validated=true;
  const app=$('appView');if(app)app.hidden=false;
}

async function returnToLogin(){
  const btn=$('sessionLoginBtn');if(btn)btn.disabled=true;
  try{
    syncAuthTokens();
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(INSTANCE_KEY);
    const result=await client.auth.logout(window.location.origin+'/');
    const logoutUrl=typeof result==='string'?result:result?.logoutUrl;
    if(logoutUrl){location.assign(logoutUrl);return}
  }catch(e){
    console.error('SCaD Residencial regresar al login:',e);
  }
  localStorage.removeItem(TOKENS_KEY);
  localStorage.removeItem(INSTANCE_KEY);
  location.replace(window.location.origin+'/');
}

async function claimSession(){
  if(validated||validating)return;
  validating=true;
  showGate('Validando sesión','Comprobando la sesión activa.');
  try{
    syncAuthTokens();
    if(!(await client.auth.loggedIn())){
      showGate('No fue posible validar la sesión','La autenticación no quedó disponible para el control de sesión. Regresa al login e intenta nuevamente.',{actions:true});
      return;
    }
    const data=await postFn('resSesionAbrir',{sesionId:getSessionId()});
    if(data?.ok){allowApp();return}
    if(data?.reason==='SESION_ACTIVA_EN_OTRA_INSTANCIA'){
      showGate('Sesión activa en otro dispositivo','Esta cuenta ya está siendo utilizada en otro dispositivo. Regresa al login para intentar nuevamente o ingresar con otra cuenta.',{actions:true});
      return;
    }
    showGate('No fue posible validar la sesión',`SCaD Residencial no pudo completar el control de sesión${data?.reason?`: ${data.reason}`:'.'}`,{actions:true});
  }catch(e){
    console.error('SCaD Residencial sesión:',e);
    showGate('No fue posible validar la sesión','Verifica la conexión o regresa al login para intentar nuevamente.',{actions:true});
  }finally{validating=false}
}

async function releaseSession(){
  try{
    syncAuthTokens();
    if(await client.auth.loggedIn())await postFn('resSesionCerrar',{sesionId:getSessionId()});
  }catch(e){console.warn('SCaD Residencial liberar sesión:',e)}
}

function watchApp(){
  const app=$('appView');if(!app)return;
  const obs=new MutationObserver(()=>{if(!validated&&!app.hidden)claimSession()});
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
import('./install-app.js');