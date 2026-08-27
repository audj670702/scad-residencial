import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk@1.21.16';

const moduleInfo = {
  mensajeria: { title: 'Mensajería', text: 'Canal de comunicación y avisos para residentes.' },
  orientacion: { title: 'Orientación', text: 'Guías prácticas para el uso de servicios, instalaciones y convivencia residencial.' },
  documentacion: { title: 'Documentación', text: 'Consulta de reglamentos, formatos y documentos relevantes del residencial.' },
  programacion: { title: 'Programación', text: 'Agenda de eventos, actividades, trabajos y fechas relevantes.' },
  reportes: { title: 'Reportes', text: 'Registro y seguimiento de fallas o situaciones que requieren atención.' },
  visitantes: { title: 'Visitantes', text: 'Preautorización de entrada de visitantes gestionada por el residente.' }
};

const AUTH = {
  clientId: '2a7eb7cd-240a-422b-9fe2-10f5dec36b5e',
  redirectUri: 'https://residencial.scad.mx',
  authorizationEndpoint: ''
};

const STORAGE = {
  oauthData: 'scad_residencial_wix_oauth_data',
  tokens: 'scad_residencial_wix_tokens'
};

const storedTokens = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.tokens) || 'null');
  } catch {
    return null;
  }
})();

const wixClient = createClient({
  auth: OAuthStrategy({
    clientId: AUTH.clientId,
    ...(storedTokens ? { tokens: storedTokens } : {})
  })
});

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
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  residentAvatar.textContent = initials || 'R';
}

function setLoggedOut(message = '') {
  appView.hidden = true;
  authView.hidden = false;
  if (message) authNote.textContent = message;
}

function clearAuthCallbackFromUrl() {
  if (window.location.href !== AUTH.redirectUri) {
    window.history.replaceState({}, document.title, AUTH.redirectUri);
  }
}

async function startWixLogin() {
  try {
    loginBtn.disabled = true;
    registerBtn.disabled = true;
    authNote.textContent = 'Conectando con Wix Members…';

    const oauthData = await wixClient.auth.generateOAuthData(
      AUTH.redirectUri,
      window.location.href
    );

    sessionStorage.setItem(STORAGE.oauthData, JSON.stringify(oauthData));

    const result = await wixClient.auth.getAuthUrl(oauthData, {
      responseMode: 'query'
    });

    const authUrl = typeof result === 'string' ? result : result?.authUrl;
    if (!authUrl) throw new Error('WIX_AUTH_URL_NOT_AVAILABLE');

    window.location.assign(authUrl);
  } catch (error) {
    console.error('SCaD Residencial OAuth start:', error);
    loginBtn.disabled = false;
    registerBtn.disabled = false;
    setLoggedOut('No fue posible iniciar la autenticación con Wix.');
  }
}

async function completeOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code') && !params.has('error')) return false;

  try {
    const parsed = await wixClient.auth.parseFromUrl();
    if (parsed?.error) {
      throw new Error(parsed.errorDescription || parsed.error);
    }

    const saved = sessionStorage.getItem(STORAGE.oauthData);
    if (!saved) throw new Error('OAUTH_DATA_NOT_FOUND');

    const oauthData = JSON.parse(saved);
    const tokens = await wixClient.auth.getMemberTokens(
      parsed.code,
      parsed.state,
      oauthData
    );

    wixClient.auth.setTokens(tokens);
    localStorage.setItem(STORAGE.tokens, JSON.stringify(tokens));
    sessionStorage.removeItem(STORAGE.oauthData);
    clearAuthCallbackFromUrl();
    return true;
  } catch (error) {
    console.error('SCaD Residencial OAuth callback:', error);
    sessionStorage.removeItem(STORAGE.oauthData);
    clearAuthCallbackFromUrl();
    setLoggedOut('Wix devolvió la autenticación, pero no fue posible completar la sesión.');
    return true;
  }
}

async function validateAuthorizedUser() {
  const loggedIn = await wixClient.auth.loggedIn();

  if (!loggedIn) {
    setLoggedOut('Inicia sesión para habilitar los módulos de SCaD Residencial.');
    return;
  }

  if (!AUTH.authorizationEndpoint) {
    setLoggedOut('Sesión Wix iniciada correctamente. Falta conectar la validación del memberId contra RES_Usuarios antes de habilitar los módulos.');
    return;
  }

  try {
    const headers = await wixClient.auth.getAuthHeaders();
    const response = await fetch(AUTH.authorizationEndpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...headers
      }
    });

    if (!response.ok) throw new Error('NO_AUTH');
    const data = await response.json();
    if (!data?.authorized) throw new Error('NO_AUTH');
    setAuthenticated(data.user || {});
  } catch (error) {
    console.error('SCaD Residencial authorization:', error);
    setLoggedOut('La cuenta está autenticada en Wix, pero no está autorizada para SCaD Residencial.');
  }
}

async function bootstrapAuth() {
  await completeOAuthCallback();
  await validateAuthorizedUser();
}

loginBtn.addEventListener('click', startWixLogin);
registerBtn.addEventListener('click', startWixLogin);

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

bootstrapAuth();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
