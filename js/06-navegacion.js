'use strict';
/* =======================================================================
   M\u00D3DULO 6 \u00B7 ESTADO DE INTERFAZ Y NAVEGACI\u00D3N
   ======================================================================= */
const UI = {
  view: 'inicio', adminTab: 'usuarios', area: null,unidadId: '',
areaId: '', sheet: 'cierre', regQ: '',
  presTab: 'resumen', presArea: null, tablaSheet: 'cierre',
  filters: {
  unidadId: '',
  areaId: '',
  area: '',
  semaforo: '',
  estatus: '',
  responsable: ''
},
};
const VIEWS = {
  inicio: { t: 'Inicio', s: 'Tu punto de partida en la plataforma.', icon: 'home', roles: ['admin', 'direccion'] },
  registro: { t: 'Edici\u00F3n', s: 'Captura la informaci\u00F3n de cada \u00E1rea, hoja por hoja.', icon: 'pen', roles: ['admin', 'direccion'] },
  presentacion: { t: 'Dashboard', s: 'Tablero ejecutivo, vistas por \u00E1rea, comparativos y modo presentaci\u00F3n.', icon: 'chart', roles: ['admin'] },
  admin: { t: 'Administraci\u00F3n', s: 'Usuarios, roles, accesos, bit\u00E1cora y configuraci\u00F3n.', icon: 'shield', roles: ['admin'] }
};
/* =======================================================================
   UNIDADES DE NEGOCIO Y \u00C1REAS DISPONIBLES EN EDICI\u00D3N
   ======================================================================= */

function unidadesEdicion() {
  const unidades = Array.isArray(S().unidadesNegocio)
    ? S().unidadesNegocio
    : [];

  if (Auth.isAdmin()) {
    return unidades;
  }

  return unidades
    .map(unidad => ({
      ...unidad,
      areas: (unidad.areas || []).filter(area =>
        Auth.canAccess(unidad.id, area.id)
      )
    }))
    .filter(unidad => unidad.areas.length);
}

function unidadEdicionActual() {
  return unidadesEdicion().find(
    unidad => unidad.id === UI.unidadId
  ) || null;
}

function areasEdicion() {
  const unidad = unidadEdicionActual();

  return unidad
    ? unidad.areas || []
    : [];
}

function areaEdicionActual() {
  return areasEdicion().find(
    area => area.id === UI.areaId
  ) || null;
}

function limpiarSeleccionEdicion() {
  UI.unidadId = '';
  UI.areaId = '';
  UI.area = null;
}

/*
 * La navegación anterior solo inicializaba UI.area. Las pantallas nuevas de
 * Edición y Dashboard trabajan con los identificadores de unidad y área; si
 * esos identificadores quedaban vacíos, ambas vistas abrían sin información
 * seleccionada aunque Supabase ya hubiera cargado los datos.
 */
function asegurarSeleccionEdicion() {
  const unidades = unidadesEdicion();
  if (!unidades.length) {
    limpiarSeleccionEdicion();
    return;
  }

  let unidad = unidades.find(item => item.id === UI.unidadId);
  if (!unidad && UI.area) {
    unidad = unidades.find(item =>
      (item.areas || []).some(area => area.nombre === UI.area)
    );
  }
  unidad ||= unidades[0];

  const areas = unidad.areas || [];
  const area = areas.find(item => item.id === UI.areaId) ||
    areas.find(item => item.nombre === UI.area) ||
    areas[0] || null;

  UI.unidadId = unidad.id;
  UI.areaId = area?.id || '';
  UI.area = area?.nombre || null;
}

function asegurarSeleccionDashboard() {
  const unidades = Array.isArray(S().unidadesNegocio)
    ? S().unidadesNegocio
    : [];

  if (!unidades.length) {
    UI.filters.unidadId = '';
    UI.filters.areaId = '';
    UI.filters.area = '';
    UI.presArea = null;
    return;
  }

  const unidad = unidades.find(item => item.id === UI.filters.unidadId) ||
    unidades[0];
  const areas = unidad.areas || [];
  const area = areas.find(item => item.id === UI.filters.areaId) || null;

  UI.filters.unidadId = unidad.id;
  UI.filters.areaId = area?.id || '';
  UI.filters.area = area?.nombre || '';
  UI.presArea = area?.nombre || null;
}
const canView = v => !!VIEWS[v]?.roles.includes(Auth.user?.rol);
const tblState = {};
let charts = {};

function renderAll() { if (!Auth.user) return renderLogin(); if (!canView(UI.view)) UI.view = 'inicio'; if (!Auth.areas().includes(UI.area)) UI.area = Auth.areas()[0] || null; renderSidebar(); renderTopbar(); renderView(); }
function renderView() {
  $('#app').classList.toggle('is-home', UI.view === 'inicio');
  Object.keys(VIEWS).forEach(v => { $('#view-' + v).hidden = v !== UI.view; });
  const el = $('#view-' + UI.view); el.classList.remove('fade-in'); void el.offsetWidth; el.classList.add('fade-in');
  if (UI.view === 'inicio') renderInicio();
  if (UI.view === 'registro') renderRegistro();
  if (UI.view === 'presentacion') renderPresentacion();
  if (UI.view === 'admin') renderAdmin();
}
function goView(v) {
  if (!canView(v)) v = 'inicio';
  if (v === 'registro') asegurarSeleccionEdicion();
  if (v === 'presentacion') asegurarSeleccionDashboard();
  UI.view = v;
  $('#sidebar').classList.remove('open');
  renderAll();
  $('#content').focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function renderSidebar() {
  const sidebar = $('#sidebar');
  if (!sidebar) return;

  const dark = document.documentElement.dataset.theme === 'dark';
  const u = Auth.user;
  const userName = String(u?.nombre || u?.nombreCompleto || u?.displayName || u?.usuario || '').trim();
  const roleName = CONFIG.ROLES[u?.rol]?.nombre || u?.rol || '';
  const menu = Object.entries(VIEWS)
    .filter(([key]) => canView(key))
    .map(([key, view]) => `<button type="button" class="nav-item" data-action="nav" data-view="${key}" aria-current="${UI.view === key ? 'page' : 'false'}">${icon(view.icon, 18)}<span>${esc(view.t)}</span></button>`)
    .join('');

  sidebar.hidden = false;
  sidebar.classList.add('chanitos-sidebar');
  sidebar.innerHTML = `
    <div class="side-brand">
      <img class="side-logo" src="${esc(CONFIG.LOGIN.LOGO)}" alt="Logo ${esc(S().empresa || 'Chanitos')}">
      <strong>Chanitos</strong><span>Somos todos.</span>
    </div>
    <nav id="nav" class="nav" aria-label="Navegación principal">${menu}</nav>
    <div class="side-motto">Cultivamos energía...<br>Cosechamos sueños.</div>
    <div id="sideAccount" class="side-account">
      <button type="button" class="side-link" data-action="myAccount">${icon('key', 16)}<span>Perfil y contraseña</span></button>
      <button type="button" class="side-link" data-action="theme">${icon(dark ? 'sun' : 'moon', 16)}<span>${dark ? 'Modo claro' : 'Modo oscuro'}</span></button>
      <button type="button" class="side-link" data-action="logout">${icon('logout', 16)}<span>Cerrar sesión</span></button>
    </div>
    <div class="side-hidden-data" aria-hidden="true">
      <span id="areaTitle"></span><span id="globalPct"></span><div id="areaList"></div>
    </div>`;

  const brandName = $('#brandName');
  const brandSub = $('#brandSub');
  const themeBtn = $('#themeBtn');
  const menuBtn = $('#menuBtn');
  const userChip = $('#userChip');

  if (brandName) brandName.textContent = CONFIG.APP_NOMBRE;
  if (brandSub) brandSub.textContent = S().empresa || '';
  if (themeBtn) {
    themeBtn.innerHTML = icon(dark ? 'sun' : 'moon', 16);
    themeBtn.title = dark ? 'Modo claro' : 'Modo oscuro';
    themeBtn.setAttribute('aria-label', themeBtn.title);
  }
  if (menuBtn) menuBtn.innerHTML = icon('menu');
  if (userChip) userChip.innerHTML = `<span class="avatar">${initials(userName)}</span><div class="who"><b title="${esc(userName)}">${esc(userName)}</b><span class="role ${u.rol}">${esc(roleName)}</span></div>
    <button type="button" class="icon-btn" data-action="myAccount" aria-label="Cambiar contraseña" title="Cambiar contraseña">${icon('key', 16)}</button><button type="button" class="icon-btn del" data-action="logout" aria-label="Cerrar sesión" title="Cerrar sesión">${icon('logout', 16)}</button>`;
}

function renderTopbar() {
  const v = VIEWS[UI.view];
  $('#homeBtn').hidden = UI.view === 'inicio';
  $('#homeBtn').innerHTML = icon('chevL', 16) + 'Inicio';
  $('#viewTitle').textContent = v.t;
  const baseSub = UI.view === 'registro' && !Auth.isAdmin() ? 'Captura la informaci\u00F3n de tu \u00E1rea, hoja por hoja.' : v.s;
  $('#viewSub').textContent = UI.view === 'registro'
    ? `${baseSub} Periodo de ${SHEET(UI.sheet)?.corto || 'la secci\u00F3n'}: ${Calc.textoPeriodoAnalisis(UI.sheet, true)}.`
    : UI.view === 'presentacion'
      ? `${baseSub} Cada secci\u00F3n usa el periodo asignado por el Administrador.`
      : baseSub;
  if (!['registro', 'presentacion'].includes(UI.view)) { $('#topActions').innerHTML = ''; return; }
  if (!Auth.isAdmin()) { $('#topActions').innerHTML = `
    <button type="button" class="btn" data-action="import" data-tip="Importa un .xlsx; solo se cargan tus \u00E1reas">${icon('upload', 16)}<span class="lbl">Importar Excel</span></button>
    <button type="button" class="btn" data-action="export" data-tip="Exporta la informaci\u00F3n de tus \u00E1reas para enviarla a Planeaci\u00F3n">${icon('download', 16)}<span class="lbl">Exportar mi informaci\u00F3n</span></button>
    <button type="button" class="btn" data-action="template">${icon('file', 16)}<span class="lbl">Plantilla</span></button>`; return; }
  $('#topActions').innerHTML = `
    <button type="button" class="btn" data-action="import" data-tip="Importa un .xlsx con las mismas hojas">${icon('upload', 16)}<span class="lbl">Importar Excel</span></button>
    <button type="button" class="btn" data-action="export">${icon('download', 16)}<span class="lbl">Exportar Excel</span></button>
    <button type="button" class="btn" data-action="template" data-tip="Descarga la plantilla vac\u00EDa con todas las hojas">${icon('file', 16)}<span class="lbl">Plantilla</span></button>
    <button type="button" class="btn" data-action="print" data-tip="Genera un reporte limpio; elige \u201CGuardar como PDF\u201D">${icon('print', 16)}<span class="lbl">PDF / Imprimir</span></button>
    <button type="button" class="btn primary" data-action="present">${icon('play', 16)}<span class="lbl">Presentar</span></button>`;
}
const sampleBanner = () => S().sample ? `<div class="banner fade-in" role="note">${icon('info')}<span><b>Est\u00E1s viendo datos de ejemplo.</b> Son consultivos y puedes editarlos libremente, o limpiarlos para empezar a capturar.</span><button type="button" class="btn sm" data-action="clearSample">${icon('trash', 14)}${Auth.isAdmin() ? 'Limpiar datos de ejemplo' : 'Limpiar ejemplo de mis \u00E1reas'}</button></div>` : '';
