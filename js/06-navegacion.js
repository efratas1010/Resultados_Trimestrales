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

  const areasPermitidas = Auth.areas();

  return unidades
    .map(unidad => ({
      ...unidad,
      areas: (unidad.areas || []).filter(area =>
        areasPermitidas.includes(area.nombre)
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
const canView = v => !!VIEWS[v]?.roles.includes(Auth.user?.rol);
const tblState = {};
let charts = {};

function renderAll() { if (!Auth.user) return renderLogin(); if (!canView(UI.view)) UI.view = 'inicio'; if (!Auth.areas().includes(UI.area)) UI.area = Auth.areas()[0] || null; renderSidebar(); renderTopbar(); renderView(); }
function renderView() {
  Object.keys(VIEWS).forEach(v => { $('#view-' + v).hidden = v !== UI.view; });
  const el = $('#view-' + UI.view); el.classList.remove('fade-in'); void el.offsetWidth; el.classList.add('fade-in');
  if (UI.view === 'inicio') renderInicio();
  if (UI.view === 'registro') renderRegistro();
  if (UI.view === 'presentacion') renderPresentacion();
  if (UI.view === 'admin') renderAdmin();
}
function goView(v) { if (!canView(v)) v = 'inicio'; UI.view = v; $('#sidebar').classList.remove('open'); renderAll(); $('#content').focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }

function renderSidebar() {
  $('#brandName').textContent = CONFIG.APP_NOMBRE;
  $('#brandSub').textContent = S().empresa || '';
  $('#nav').innerHTML = '';
  const myAreas = Auth.areas(), av = myAreas.map(a => Calc.avanceArea(a));
  $('#areaTitle').textContent = Auth.isAdmin() ? 'Avance de captura' : 'Mis \u00E1reas';
  $('#globalPct').textContent = av.length ? Math.round(avg(av)) + '%' : '';
  $('#areaList').innerHTML = myAreas.map((a, i) => `<button type="button" class="area-item ${a === UI.area && UI.view === 'registro' ? 'active' : ''}" data-action="goArea" data-area="${esc(a)}" aria-label="${esc(a)}: ${Math.round(av[i])}% capturado">
    <div class="row"><span>${esc(a)}</span><b>${Math.round(av[i])}%</b></div><div class="bar"><i style="width:${av[i]}%"></i></div></button>`).join('');
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#themeBtn').innerHTML = icon(dark ? 'sun' : 'moon', 16); $('#themeBtn').title = dark ? 'Modo claro' : 'Modo oscuro'; $('#themeBtn').setAttribute('aria-label', $('#themeBtn').title);
  $('#menuBtn').innerHTML = icon('menu');
  const u = Auth.user;
  $('#userChip').innerHTML = `<span class="avatar">${initials(u.nombre)}</span><div class="who"><b title="${esc(u.nombre)}">${esc(u.nombre)}</b><span class="role ${u.rol}">${CONFIG.ROLES[u.rol].nombre}</span></div>
    <button type="button" class="icon-btn" data-action="myAccount" aria-label="Cambiar contrase\u00F1a" title="Cambiar contrase\u00F1a">${icon('key', 16)}</button><button type="button" class="icon-btn del" data-action="logout" aria-label="Cerrar sesi\u00F3n" title="Cerrar sesi\u00F3n">${icon('logout', 16)}</button>`;
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
