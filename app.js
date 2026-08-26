const moduleInfo = {
  mensajeria: {
    title: 'Mensajería',
    text: 'Canal de comunicación y avisos para residentes.'
  },
  orientacion: {
    title: 'Orientación',
    text: 'Guías prácticas para el uso de servicios, instalaciones y convivencia residencial.'
  },
  documentacion: {
    title: 'Documentación',
    text: 'Consulta de reglamentos, formatos y documentos relevantes del residencial.'
  },
  programacion: {
    title: 'Programación',
    text: 'Agenda de eventos, actividades, trabajos y fechas relevantes.'
  },
  reportes: {
    title: 'Reportes',
    text: 'Registro y seguimiento de fallas o situaciones que requieren atención.'
  },
  visitantes: {
    title: 'Visitantes',
    text: 'Preautorización de entrada de visitantes gestionada por el residente.'
  }
};

const sheet = document.getElementById('moduleSheet');
const sheetTitle = document.getElementById('sheetTitle');
const sheetText = document.getElementById('sheetText');
const closeSheet = () => {
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
};

document.querySelectorAll('[data-module]').forEach((button) => {
  button.addEventListener('click', () => {
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
