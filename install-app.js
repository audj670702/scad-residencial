const $=id=>document.getElementById(id);
let deferredInstallPrompt=null;
const INSTALLED_KEY='scad_residencial_app_installed';

function ensureHead(){
  if(!document.querySelector('link[href="install-app.css"]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='install-app.css';document.head.appendChild(css);
  }
  if(!document.querySelector('link[rel="apple-touch-icon"]')){
    const icon=document.createElement('link');icon.rel='apple-touch-icon';icon.href='assets/icon-192.png';document.head.appendChild(icon);
  }
  const metas=[
    ['apple-mobile-web-app-capable','yes'],
    ['apple-mobile-web-app-status-bar-style','default'],
    ['apple-mobile-web-app-title','SCaD Residencial']
  ];
  metas.forEach(([name,content])=>{if(!document.querySelector(`meta[name="${name}"]`)){const m=document.createElement('meta');m.name=name;m.content=content;document.head.appendChild(m)}});
}

function isStandalone(){return window.matchMedia?.('(display-mode: standalone)')?.matches===true||window.navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent||'')}
function isAndroid(){return /android/i.test(navigator.userAgent||'')}
function wasInstalled(){try{return localStorage.getItem(INSTALLED_KEY)==='1'}catch{return false}}
function markInstalled(){try{localStorage.setItem(INSTALLED_KEY,'1')}catch{}}

function ensureInstallUI(){
  if($('installAppBtn'))return;
  const topbar=document.querySelector('.topbar');
  if(topbar)topbar.insertAdjacentHTML('beforeend','<button class="install-app-btn" id="installAppBtn" type="button" aria-label="Instalar SCaD Residencial"><span class="install-app-icon">⇩</span><span class="install-app-label">Instalar app</span></button>');
  document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="installAppSheet"><div class="sheet-panel install-app-panel"><button class="sheet-close" id="installAppClose" type="button">×</button><p class="eyebrow">SCaD RESIDENCIAL</p><h2 id="installAppTitle">Instalar app</h2><div id="installAppContent"></div></div></div>`);
  $('installAppBtn')?.addEventListener('click',openInstall);
  $('installAppClose')?.addEventListener('click',closeInstall);
  $('installAppSheet')?.addEventListener('click',e=>{if(e.target===$('installAppSheet'))closeInstall()});
  updateVisibility();
}

function setInstalledState(){
  const btn=$('installAppBtn');
  if(!btn)return;
  btn.hidden=false;
  btn.disabled=true;
  btn.classList.add('installed');
  const icon=btn.querySelector('.install-app-icon');
  const label=btn.querySelector('.install-app-label');
  if(icon)icon.textContent='✓';
  if(label)label.textContent='App instalada';
  btn.setAttribute('aria-label','SCaD Residencial instalada');
}

function setInstallState(){
  const btn=$('installAppBtn');
  if(!btn)return;
  btn.disabled=false;
  btn.classList.remove('installed');
  const icon=btn.querySelector('.install-app-icon');
  const label=btn.querySelector('.install-app-label');
  if(icon)icon.textContent='⇩';
  if(label)label.textContent='Instalar app';
  btn.setAttribute('aria-label','Instalar SCaD Residencial');
}

function updateVisibility(){
  const btn=$('installAppBtn');
  if(!btn)return;
  if(isStandalone()||wasInstalled()){
    markInstalled();
    setInstalledState();
    return;
  }
  setInstallState();
  // iOS necesita instrucciones manuales. En el resto sólo mostramos el botón
  // cuando el navegador confirma que la PWA es instalable.
  btn.hidden=!(isIOS()||!!deferredInstallPrompt);
}

function closeInstall(){$('installAppSheet')?.classList.remove('open')}

function renderIOS(){
  $('installAppTitle').textContent='Instalar en iPhone o iPad';
  $('installAppContent').innerHTML=`<div class="install-steps"><div><span>1</span><p>Abre SCaD Residencial en <strong>Safari</strong>.</p></div><div><span>2</span><p>Toca <strong>Compartir</strong> <b class="share-glyph">□↑</b>.</p></div><div><span>3</span><p>Selecciona <strong>Agregar a pantalla de inicio</strong>.</p></div><div><span>4</span><p>Confirma con <strong>Agregar</strong>.</p></div></div>`;
}

function renderAndroidManual(){
  $('installAppTitle').textContent='Instalar en Android';
  $('installAppContent').innerHTML=`<div class="install-steps"><div><span>1</span><p>Abre SCaD Residencial en <strong>Chrome</strong>.</p></div><div><span>2</span><p>Toca el menú <strong>⋮</strong>.</p></div><div><span>3</span><p>Selecciona <strong>Instalar app</strong> o <strong>Agregar a pantalla principal</strong>.</p></div></div>`;
}

async function openInstall(){
  if(isStandalone()||wasInstalled())return;
  if(deferredInstallPrompt){await promptInstall();return}
  if(isIOS()){
    renderIOS();
    $('installAppSheet')?.classList.add('open');
    return;
  }
  if(isAndroid()){
    renderAndroidManual();
    $('installAppSheet')?.classList.add('open');
  }
}

async function promptInstall(){
  if(!deferredInstallPrompt)return;
  const prompt=deferredInstallPrompt;
  deferredInstallPrompt=null;
  prompt.prompt();
  try{
    const choice=await prompt.userChoice;
    if(choice?.outcome==='accepted')markInstalled();
  }catch{}
  closeInstall();
  updateVisibility();
}

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  updateVisibility();
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  markInstalled();
  closeInstall();
  updateVisibility();
});
window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change',updateVisibility);

ensureHead();
ensureInstallUI();