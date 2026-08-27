const $=id=>document.getElementById(id);
let deferredInstallPrompt=null;

function isStandalone(){
  return window.matchMedia?.('(display-mode: standalone)')?.matches===true || window.navigator.standalone===true;
}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent||'')}
function isAndroid(){return /android/i.test(navigator.userAgent||'')}

function ensureInstallUI(){
  if($('installAppBtn'))return;
  const topbar=document.querySelector('.topbar');
  if(topbar){
    topbar.insertAdjacentHTML('beforeend','<button class="install-app-btn" id="installAppBtn" type="button" aria-label="Instalar SCaD Residencial"><span class="install-app-icon">⇩</span><span>Instalar app</span></button>');
  }
  document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="installAppSheet"><div class="sheet-panel install-app-panel"><button class="sheet-close" id="installAppClose" type="button">×</button><p class="eyebrow">SCaD RESIDENCIAL</p><h2 id="installAppTitle">Instalar app</h2><div id="installAppContent"></div><div class="install-app-actions"><button class="primary-btn" id="installAppAction" type="button" hidden>Instalar</button></div></div></div>`);
  $('installAppBtn')?.addEventListener('click',openInstall);
  $('installAppClose')?.addEventListener('click',closeInstall);
  $('installAppSheet')?.addEventListener('click',e=>{if(e.target===$('installAppSheet'))closeInstall()});
  updateVisibility();
}

function updateVisibility(){
  const btn=$('installAppBtn');
  if(btn)btn.hidden=isStandalone();
}
function closeInstall(){$('installAppSheet')?.classList.remove('open')}

function renderIOS(){
  $('installAppTitle').textContent='Instalar en iPhone o iPad';
  $('installAppContent').innerHTML=`<div class="install-steps"><div><span>1</span><p>Abre esta página en <strong>Safari</strong>.</p></div><div><span>2</span><p>Toca el botón <strong>Compartir</strong> <b class="share-glyph">□↑</b>.</p></div><div><span>3</span><p>Selecciona <strong>Agregar a pantalla de inicio</strong>.</p></div><div><span>4</span><p>Confirma con <strong>Agregar</strong>.</p></div></div>`;
  $('installAppAction').hidden=true;
}
function renderAndroid(){
  $('installAppTitle').textContent='Instalar en Android';
  if(deferredInstallPrompt){
    $('installAppContent').innerHTML='<p class="install-intro">Instala SCaD Residencial para abrirla como app desde tu pantalla de inicio.</p>';
    const action=$('installAppAction');action.hidden=false;action.textContent='⇩ Instalar';
    action.onclick=promptInstall;
  }else{
    $('installAppContent').innerHTML=`<div class="install-steps"><div><span>1</span><p>Abre esta página en <strong>Chrome</strong>.</p></div><div><span>2</span><p>Toca el menú <strong>⋮</strong>.</p></div><div><span>3</span><p>Selecciona <strong>Instalar app</strong> o <strong>Agregar a pantalla principal</strong>.</p></div></div>`;
    $('installAppAction').hidden=true;
  }
}
function renderGeneric(){
  $('installAppTitle').textContent='Instalar SCaD Residencial';
  if(deferredInstallPrompt){
    $('installAppContent').innerHTML='<p class="install-intro">Puedes instalar esta aplicación en este dispositivo.</p>';
    const action=$('installAppAction');action.hidden=false;action.textContent='⇩ Instalar';action.onclick=promptInstall;
  }else{
    $('installAppContent').innerHTML='<p class="install-intro">Usa las opciones de tu navegador para instalar o agregar SCaD Residencial a la pantalla de inicio.</p>';
    $('installAppAction').hidden=true;
  }
}
function openInstall(){
  if(isStandalone())return;
  if(isIOS())renderIOS();else if(isAndroid())renderAndroid();else renderGeneric();
  $('installAppSheet')?.classList.add('open');
}
async function promptInstall(){
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();
  try{await deferredInstallPrompt.userChoice}catch{}
  deferredInstallPrompt=null;
  closeInstall();
  updateVisibility();
}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;updateVisibility()});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;closeInstall();updateVisibility()});
window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change',updateVisibility);

ensureInstallUI();