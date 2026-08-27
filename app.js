const moduleInfo = {
  mensajeria: { title: 'Mensajería', text: 'Canal de comunicación y avisos para residentes.' },
  orientacion: { title: 'Orientación', text: 'Guías prácticas para el uso de servicios, instalaciones y convivencia residencial.' },
  documentacion: { title: 'Documentación', text: 'Consulta de reglamentos, formatos y documentos relevantes del residencial.' },
  programacion: { title: 'Programación', text: 'Agenda de eventos, actividades, trabajos y fechas relevantes.' },
  reportes: { title: 'Reportes', text: 'Registro y seguimiento de fallas o situaciones que requieren atención.' },
  visitantes: { title: 'Visitantes', text: 'Preautorización de entrada de visitantes gestionada por el residente.' }
};

// Integración pendiente con Wix.
// Al construir la capa de autenticación se configurarán estas tres rutas.
const AUTH = {
  loginUrl: '',
  registerUrl: '',
  sessionEndpoint: ''
};

const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const authNote = document.getElementById('authNote');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const residentName = document.getElementById('residentName');
const residentMeta = document.getElementById('residentMeta');
const residentAvatar = document.getElementById('residentAvatar');

function setAuthenticated(user) {
  authView.hidden = true;
  appView.hidden = false;
  const name = user?.nombreCompleto || user?.nombre || 'Residente';
  residentName.textContent = name;
  residentMeta.textContent = user?.vivienda || 'Usuario autorizado';
  const initials = name.split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase();
  residentAvatar.textContent = initials || 'R';
}

function setLoggedOut(message = '') {
  appView.hidden = true;
  authView.hidden = false;
  if (message) authNote.textContent = message;
}

async function checkSession() {
  if (!AUTH.sessionEndpoint) {
    setLoggedOut('La interfaz de acceso ya está preparada. Falta conectar el endpoint Wix que validará sesión, memberId y autorización en RES_Usuarios.');
    return;
  }

  try {
    const response = await fetch(AUTH.sessionEndpoint, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error('NO_AUTH');
    const data = await response.json();
    if (!data?.authorized) throw new Error('NO_AUTH');
    setAuthenticated(data.user || {});
  } catch (error) {
    setLoggedOut('Inicia sesión para habilitar los módulos de SCaD Residencial.');
  }
}

loginBtn.addEventListener('click', () => {
  if (AUTH.loginUrl) {
    window.location.href = AUTH.loginUrl;
    return;
  }
  authNote.textContent = 'Pendiente conectar la URL de inicio de sesión de Wix Members.';
});

registerBtn.addEventListener('click', () => {
  if (AUTH.registerUrl) {
    window.location.href = AUTH.registerUrl;
    return;
  }
  authNote.textContent = 'Pendiente conectar la URL de registro de Wix Members.';
});

const sheet = document.getElementById('moduleSheet');
const sheetTitle = document.getElementById('sheetTitle');
const sheetText = document.getElementById('sheetText');
const closeSheet = () => {
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
};

document.querySelectorAll('[data-module]').forEach((button) => {
  button.addEventListener('click', () => {
    if (appView.hidden) return;
    const info = moduleInfo[button.dataset.module];
    if (!info) return;
    sheetTitle.textContent = info.title;
    sheetText.textContent = info.text;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
  });
});

document.getElementById('sheetClose').addEventListener('click', closeSheet);
document.getElementById('sheetAction').addEventListener('click', closeSheet);
sheet.addEventListener('click', (event) => {
  if (event.target === sheet) closeSheet();
});

checkSession();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
