'use strict';
/* =======================================================================
   MÓDULO 14 · EVENTOS (delegación)
   ======================================================================= */
const Actions = {
  guardarSeccion: () => rpGuardarSeccionActual(),
    /* ===============================================================
     UNIDADES DE NEGOCIO
     =============================================================== */

  delUnidad: b => {
    const id = b.dataset.id;

    const unidad = S().unidadesNegocio.find(
      u => u.id === id
    );

    if (!unidad) return;

    if (
      !confirm(
        `¿Eliminar la unidad “${unidad.nombre}”?\n\n` +
        `Esta acción únicamente elimina la configuración de la unidad. ` +
        `Los registros actuales de la plataforma no se modificarán.`
      )
    ) {
      return;
    }

    S().unidadesNegocio =
      S().unidadesNegocio.filter(
        u => u.id !== id
      );

    Auth.log(
      'Unidad de negocio eliminada',
      unidad.nombre
    );

    Store.save();
    renderConfig();

    toast(
      'Unidad de negocio eliminada',
      'ok'
    );
  },

  delUnidadArea: b => {
    const unidadId = b.dataset.unidad;
    const areaId = b.dataset.area;

    const unidad = S().unidadesNegocio.find(
      u => u.id === unidadId
    );

    if (!unidad) return;

    const area = (unidad.areas || []).find(
      a => a.id === areaId
    );

    if (!area) return;

    if (
      !confirm(
        `¿Eliminar el área “${area.nombre}” de ` +
        `“${unidad.nombre}”?\n\n` +
        `Los registros actuales no se modificarán.`
      )
    ) {
      return;
    }

    unidad.areas =
      (unidad.areas || []).filter(
        a => a.id !== areaId
      );

    Auth.log(
      'Área eliminada de unidad',
      `${unidad.nombre} · ${area.nombre}`
    );

    Store.save();
    renderConfig();

    toast(
      'Área eliminada de la unidad',
      'ok'
    );
  },
  /* ===============================================================
     MIGRACIÓN DE REGISTROS ANTERIORES
     =============================================================== */
  migrateLegacyArea: b => {
    const row = String(b.dataset.row || '');
    const legacyArea = String(b.dataset.legacyArea || '').trim();
    const unidadSel = document.getElementById(`migUnidad_${row}`);
    const areaSel = document.getElementById(`migArea_${row}`);
    const unidadId = unidadSel?.value || '';
    const unidad = (S().unidadesNegocio || []).find(u => String(u.id) === String(unidadId));

    if (!unidad) {
      return toast('Selecciona primero la Unidad destino.', 'error');
    }

    /* Si el selector de área no reaccionó, se reconstruye aquí mismo. */
    cargarAreasMigracion(unidadSel);

    let areaId = areaSel?.value || '';
    let area = (unidad.areas || []).find(a => String(a.id) === String(areaId));

    /* Respaldo: si existe un área con el mismo nombre, se usa automáticamente. */
    if (!area) {
      area = (unidad.areas || []).find(a => norm(a.nombre) === norm(legacyArea)) || null;
      if (area && areaSel) areaSel.value = area.id;
    }

    if (!area) {
      return toast('Selecciona el Área destino.', 'error');
    }

    const pendientes = [];
    SHEETS.forEach(hoja => {
      (S().data[hoja.key] || []).forEach(registro => {
        if (
          String(registro.area || '') === legacyArea &&
          (!registro.unidadNegocioId || !registro.areaId)
        ) {
          pendientes.push(registro);
        }
      });
    });

    if (!pendientes.length) {
      renderConfig();
      return toast('Ya no existen registros pendientes para esa área.', 'ok');
    }

    if (!confirm(
      `Se actualizarán ${pendientes.length} registros de “${legacyArea}” a ${unidad.nombre} → ${area.nombre}.\n\n` +
      'No se eliminarán ni duplicarán registros. ¿Continuar?'
    )) return;

    pendientes.forEach(registro => {
      registro.unidadNegocioId = unidad.id;
      registro.unidadNegocio = unidad.nombre;
      registro.areaId = area.id;
      registro.area = area.nombre;
    });

    Auth.log(
      'Migración de información',
      `${legacyArea} → ${unidad.nombre} → ${area.nombre} · ${pendientes.length} registros`
    );

    Store.save();
    renderConfig();
    toast(`${pendientes.length} registros migrados`, 'ok');
  },

  nav: b => goView(b.dataset.view),
  menu: () => $('#sidebar').classList.toggle('open'),
  goArea: b => { UI.unidadId = b.dataset.unidad || ''; UI.areaId = b.dataset.areaId || ''; UI.area = b.dataset.area || null; UI.regQ = ''; goView('registro'); },
  sheet: b => { if (!rpComprobarAccesoSeccion(b.dataset.sheet)) return; UI.sheet = b.dataset.sheet; UI.regQ = ''; renderTopbar(); renderRegistro(); $(`[data-sheet="${UI.sheet}"]`)?.focus(); },
    addRow: () => addInlineRow(),
  addKR: b => { const r = Calc.rows('okrs', UI.area).find(x => x.objetivo === b.dataset.obj); addInlineRow({ objetivo: b.dataset.obj, alineacion: r?.alineacion || '' }); },
  dupRow: b => dupRow(b.dataset.id),
  delRow: b => delRow(b.dataset.id),
  closeModal: () => closeModal(),
  modalBg: (b, e) => { if (e.target === b) closeModal(); },
  theme: () => { const d = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = d; try { localStorage.setItem(CONFIG.THEME_KEY, d); } catch (e) {} if (!Auth.user) return renderLogin(); renderSidebar(); if (UI.view === 'presentacion') renderPresBody(); },
  presTab: b => { UI.presTab = b.dataset.tab; renderPresentacion(); },
  clearFilters: () => {
  Object.keys(UI.filters).forEach(k => UI.filters[k] = '');
  UI.presArea = null;
  renderPresentacion();
},
  present: () => { if (Auth.isAdmin()) Slides.open(); },
  presentArea: () => Slides.open(UI.presArea),
  slidePrev: () => Slides.go(Slides.i - 1), slideNext: () => Slides.go(Slides.i + 1), slideClose: () => Slides.close(),
  print: () => { if (Auth.isAdmin()) imprimir(); },
  goSheet: b => { if (!rpComprobarAccesoSeccion(b.dataset.sheet)) return; UI.sheet = b.dataset.sheet; UI.regQ = ''; goView('registro'); },
  adminTab: b => { UI.adminTab = b.dataset.tab; if (UI.view !== 'admin') goView('admin'); else renderAdmin(); },
  newUser: () => openUserForm(),
  editUser: b => openUserForm(b.dataset.id),
  resetPw: b => { const u = Auth.db.users.find(x => x.id === b.dataset.id); if (!u) return; const p = prompt(`Contraseña temporal para ${u.nombre} (mínimo 8 caracteres):`, CONFIG.CLAVE_INICIAL); if (p == null) return; if (p.length < 8) return toast('Mínimo 8 caracteres.', 'error'); u.hash = pwHash(u.id, p); u.debeCambiar = true; Auth.log('Contraseña restablecida', u.nombre); renderAll(); toast('Contraseña restablecida; se pedirá cambiarla al entrar.', 'ok'); },
  delUser: b => { const u = Auth.db.users.find(x => x.id === b.dataset.id); if (!u || u.id === Auth.user.id) return; if (u.rol === 'admin' && Auth.db.users.filter(x => x.rol === 'admin' && x.activo).length <= 1 && u.activo) return toast('Debe existir al menos un administrador activo.', 'error'); if (!confirm(`¿Eliminar al usuario “${u.nombre}”? Su información capturada se conserva.`)) return; Auth.db.users = Auth.db.users.filter(x => x.id !== u.id); Auth.log('Usuario eliminado', u.nombre); renderAll(); toast('Usuario eliminado'); },
  clearLog: () => { if (!confirm('¿Limpiar toda la bitácora?')) return; Auth.db.log = []; Auth.log('Bitácora limpiada'); renderAdmin(); },
  myAccount: () => openAccount(false),
  logout: () => { if ($('#slides').hidden === false) Slides.close(); Auth.logout(); UI.view = 'inicio'; renderLogin(); toast('Sesión cerrada'); },
  togglePw: b => { const i = $('#' + b.dataset.for); i.type = i.type === 'password' ? 'text' : 'password'; },
  demoUser: b => { $('#lgU').value = b.dataset.u; $('#lgP').value = ''; $('#lgP').focus(); },
  export: () => exportExcel(false), template: () => exportExcel(true),
  import: () => { const f = $('#fileInput'); f.value = ''; f.click(); },
  clearSample: () => { if (!confirm(Auth.isAdmin() ? '¿Limpiar los datos de ejemplo de TODAS las áreas? Se conservarán las áreas, usuarios y configuración.' : '¿Limpiar los datos de ejemplo de tus áreas?')) return;
    if (Auth.isAdmin()) { SHEETS.forEach(s => S().data[s.key] = []); S().sample = false; } else SHEETS.forEach(s => S().data[s.key] = S().data[s.key].filter(r => !Auth.canArea(r.area))); Auth.log('Datos de ejemplo eliminados'); Store.save(); renderAll(); toast('Datos de ejemplo eliminados. ¡Listo para capturar!', 'ok'); },
  loadSample: () => { if (!confirm('Se reemplazará toda la información actual por los datos de ejemplo. ¿Continuar?')) return; Store.state = sampleData(); UI.area = S().areas[0]; Store.save(); renderAll(); toast('Datos de ejemplo cargados', 'ok'); },
  clearAll: () => { if (!confirm('¿Borrar TODA la información capturada? Te recomendamos exportar a Excel antes.')) return; SHEETS.forEach(s => S().data[s.key] = []); S().sample = false; Store.save(); renderAll(); toast('Información borrada'); },
  delArea: b => { const i = +b.dataset.i, a = S().areas[i]; if (S().areas.length === 1) return toast('Debe existir al menos un área.', 'error'); if (!confirm(`¿Eliminar el área “${a}” y todos sus registros?`)) return; S().areas.splice(i, 1); Auth.db.users.forEach(u => u.areas = u.areas.filter(x => x !== a)); Auth.log('Área eliminada', a); SHEETS.forEach(s => S().data[s.key] = S().data[s.key].filter(r => r.area !== a)); if (UI.area === a) UI.area = S().areas[0]; if (UI.filters.area === a) UI.filters.area = ''; Store.save(); renderAll(); }
};
function cargarAreasMigracion(el) {
  if (!el) return;
  const row = String(el.dataset.row || '');
  const areaSel = document.getElementById(`migArea_${row}`);
  if (!areaSel) return;

  const unidad = (S().unidadesNegocio || []).find(
    u => String(u.id) === String(el.value)
  );
  const areas = unidad?.areas || [];

  areaSel.disabled = !unidad;
  areaSel.innerHTML = unidad
    ? '<option value="">Selecciona área…</option>' +
      areas.map(a => `<option value="${esc(a.id)}">${esc(a.nombre)}</option>`).join('')
    : '<option value="">Primero selecciona unidad</option>';

  if (unidad) {
    const legacyArea = el.closest('tr')
      ?.querySelector('[data-legacy-area]')
      ?.dataset.legacyArea || '';
    const exacta = areas.find(a => norm(a.nombre) === norm(legacyArea));
    if (exacta) areaSel.value = exacta.id;
  }
}

const Changes = {
  homeUnidad: el => { UI.homeUnidadId = el.value; renderInicio(); },
  migrationUnidad: el => cargarAreasMigracion(el),
  periodoTipo: el => {
    const trimestral = el.value === 'Trimestral';
    const form = el.closest('form');
    const campo = form?.querySelector('[data-period-trim-field]');
    const select = form?.elements.trimPer;
    if (campo) campo.hidden = !trimestral;
    if (select) {
      select.disabled = !trimestral;
      select.required = trimestral;
      if (!trimestral) select.value = '';
    }
  },
    /* ===============================================================
     DASHBOARD · UNIDAD DE NEGOCIO → ÁREA
     =============================================================== */

  dashboardUnidad: elemento => {
    UI.filters.unidadId = elemento.value;

    // Al cambiar de unidad, se limpia el área anterior
    UI.filters.areaId = '';
    UI.filters.area = '';
    UI.presArea = null;

    renderPresentacion();
  },

  dashboardArea: elemento => {
    UI.filters.areaId = elemento.value;

    const unidad = unidadFiltroActual();

    const area = unidad?.areas?.find(
      item => item.id === UI.filters.areaId
    );

    // Compatibilidad temporal con funciones anteriores
    UI.filters.area = area?.nombre || '';
    UI.presArea = area?.nombre || null;

    renderPresBody();
  },

    /* ===============================================================
     EDICIÓN: UNIDAD DE NEGOCIO → ÁREA
     =============================================================== */

  unidadEdicion: elemento => {
    UI.unidadId = elemento.value;

    // Al cambiar de unidad se limpia el área anterior
    UI.areaId = '';
    UI.area = null;
    UI.regQ = '';

    renderRegistro();

    $('#areaEditSel')?.focus();
  },

  areaEdicion: elemento => {
    UI.areaId = elemento.value;

    const area = areaEdicionActual();

    UI.area = area
      ? area.nombre
      : null;

    UI.regQ = '';

    renderRegistro();

    $('#areaEditSel')?.focus();
  },
    /* ===============================================================
     RENOMBRAR UNIDADES Y ÁREAS DE UNIDAD
     =============================================================== */

  unidadRename: el => {
    const id = el.dataset.id;

    const unidad = S().unidadesNegocio.find(
      u => u.id === id
    );

    if (!unidad) return;

    const anterior = unidad.nombre;
    const nuevo = el.value.trim();

    if (!nuevo) {
      toast(
        'El nombre de la unidad no puede quedar vacío.',
        'error'
      );

      el.value = anterior;
      return;
    }

    if (
      S().unidadesNegocio.some(
        u =>
          u.id !== id &&
          norm(u.nombre) === norm(nuevo)
      )
    ) {
      toast(
        'Ya existe una unidad con ese nombre.',
        'error'
      );

      el.value = anterior;
      return;
    }

    unidad.nombre = nuevo;

    Auth.log(
      'Unidad de negocio actualizada',
      `${anterior} → ${nuevo}`
    );

    Store.save();
    renderConfig();

    toast(
      'Unidad de negocio actualizada',
      'ok'
    );
  },

  unidadAreaRename: el => {
    const unidadId = el.dataset.unidad;
    const areaId = el.dataset.area;

    const unidad = S().unidadesNegocio.find(
      u => u.id === unidadId
    );

    if (!unidad) return;

    const area = (unidad.areas || []).find(
      a => a.id === areaId
    );

    if (!area) return;

    const anterior = area.nombre;
    const nuevo = el.value.trim();

    if (!nuevo) {
      toast(
        'El nombre del área no puede quedar vacío.',
        'error'
      );

      el.value = anterior;
      return;
    }

    if (
      unidad.areas.some(
        a =>
          a.id !== areaId &&
          norm(a.nombre) === norm(nuevo)
      )
    ) {
      toast(
        `Ya existe el área “${nuevo}” dentro de ${unidad.nombre}.`,
        'error'
      );

      el.value = anterior;
      return;
    }

    area.nombre = nuevo;

    Auth.log(
      'Área de unidad actualizada',
      `${unidad.nombre} · ${anterior} → ${nuevo}`
    );

    Store.save();
    renderConfig();

    toast(
      'Área actualizada',
      'ok'
    );
  },
  homeArea: el => { UI.area = el.value; renderInicio(); },
  area: el => { if (!Auth.canArea(el.value)) return; UI.area = el.value; UI.regQ = ''; renderSidebar(); renderRegistro(); },
  filter: el => { UI.filters[el.dataset.k] = el.value; if (el.dataset.k === 'area' && el.value) UI.presArea = el.value; renderPresentacion(); $('#flt_' + el.dataset.k)?.focus(); },
  presArea: el => { UI.presArea = el.value; renderPresBody(); $('#presAreaSel')?.focus(); },
  tablaSheet: el => { UI.tablaSheet = el.value; renderPresBody(); $('#tblSheet')?.focus(); },
  slideArea: el => { const i = Slides.list.findIndex(s => s.area === el.value); if (i >= 0) Slides.go(i); },
  empresa: el => { S().empresa = el.value.trim(); Store.save(); renderSidebar(); },
  umbral: el => { const v = toNum(el.value), u = S().umbrales, k = el.dataset.k; if (v == null || v < 0) { toast('Ingresa un número válido.', 'error'); el.value = u[k]; return; }
    const nu = { ...u, [k]: v }; if (nu.amarillo >= nu.verde) { toast('El umbral amarillo debe ser menor que el verde.', 'error'); el.value = u[k]; return; } S().umbrales = nu; Store.save(); renderSidebar(); toast('Umbrales actualizados; semáforos recalculados', 'ok'); },
  areaRename: el => { const i = +el.dataset.i, old = S().areas[i], nv = el.value.trim(); if (!nv || (nv !== old && S().areas.includes(nv))) { toast('El nombre está vacío o ya existe.', 'error'); el.value = old; return; }
    S().areas[i] = nv; Auth.db.users.forEach(u => u.areas = u.areas.map(x => x === old ? nv : x)); Auth.persist(); SHEETS.forEach(s => S().data[s.key].forEach(r => { if (r.area === old) r.area = nv; })); if (UI.area === old) UI.area = nv; if (UI.filters.area === old) UI.filters.area = nv; Store.save(); renderSidebar(); toast('Área actualizada', 'ok'); },
  objetivos: el => { const l = [...new Set(el.value.split('\n').map(x => x.trim()).filter(Boolean))]; if (!l.length) { toast('Debe existir al menos un objetivo.', 'error'); return; } S().objetivos = l; Store.save(); toast('Objetivos actualizados', 'ok'); }
};

document.addEventListener('click', e => { const b = e.target.closest('[data-action]'); if (!b || b.disabled) return; Actions[b.dataset.action]?.(b, e); });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches?.('[data-change="migrationUnidad"]')) cargarAreasMigracion(t);
  if (t.dataset.change && t.dataset.change !== 'migrationUnidad') Changes[t.dataset.change]?.(t);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.input === 'regSearch') { UI.regQ = t.value; drawRegTable(); }
  if (t.dataset.input === 'refl') onReflInput(t);
});
document.addEventListener('submit', e => {
  const form = e.target;

  /* Login */
  if (form.id === 'loginForm') {
    e.preventDefault();
    return doLogin(form);
  }

  /* Periodo de análisis independiente por sección */
  if (form.dataset.form === 'periodoAnalisisSeccion') {
    e.preventDefault();
    const seccion = form.dataset.seccion;
    const hoja = SHEET(seccion);
    if (!hoja) {
      toast('La sección del periodo no es válida.', 'error');
      return;
    }
    const anio = String(form.elements.anio.value || '').trim();
    const tipoPer = form.elements.tipoPer.value;
    const trimPer = tipoPer === 'Trimestral'
      ? String(form.elements.trimPer.value || '').trim()
      : '';
    const etiqueta = String(form.elements.etiqueta.value || '').trim();

    if (!CONFIG.LISTAS.anios.includes(anio)) {
      toast('Selecciona un año válido.', 'error');
      return form.elements.anio.focus();
    }
    if (!CONFIG.LISTAS.tipoPer.includes(tipoPer)) {
      toast('Selecciona un tipo de periodo válido.', 'error');
      return form.elements.tipoPer.focus();
    }
    if (tipoPer === 'Trimestral' && !CONFIG.LISTAS.trimestre.includes(trimPer)) {
      toast('Selecciona el trimestre.', 'error');
      return form.elements.trimPer.focus();
    }
    if (etiqueta.length > 120) {
      toast('La etiqueta adicional no puede exceder 120 caracteres.', 'error');
      return form.elements.etiqueta.focus();
    }

    const disponible = !Cloud?.ready || !Cloud.periods?.length || Cloud.periods.some(p =>
      String(p.anio) === anio &&
      p.tipo === tipoPer &&
      String(p.trimestre || '') === trimPer
    );
    if (!disponible) {
      toast('El periodo seleccionado no existe en el catálogo de Supabase.', 'error');
      return;
    }

    S().periodosAnalisis ||= {};
    S().periodosAnalisis[seccion] = { anio, tipoPer, trimPer, etiqueta };
    // El espejo legacy conserva compatibilidad con versiones anteriores.
    if (seccion === 'cierre') S().periodoAnalisis = { anio, tipoPer, trimPer, etiqueta };
    Auth.log('Periodo de análisis actualizado', `${hoja.nombre} · ${Calc.textoPeriodoAnalisis(seccion, true)}`);
    Store.save();
    renderAll();
    toast(`Periodo de ${hoja.corto} actualizado`, 'ok');
    return;
  }


  /* ===============================================================
     NUEVA UNIDAD DE NEGOCIO
     =============================================================== */

  if (form.dataset.form === 'addUnidad') {
    e.preventDefault();

    const nombre =
      form.elements.nueva.value.trim();

    if (!nombre) {
      return toast(
        'Escribe el nombre de la unidad.',
        'error'
      );
    }

    if (
      S().unidadesNegocio.some(
        unidad =>
          norm(unidad.nombre) === norm(nombre)
      )
    ) {
      return toast(
        'Esa unidad de negocio ya existe.',
        'error'
      );
    }

    const id =
      uid();

    S().unidadesNegocio.push({
      id,
      nombre,
      areas: []
    });

    Auth.log(
      'Unidad de negocio creada',
      nombre
    );

    Store.save();
    renderConfig();

    toast(
      'Unidad de negocio agregada',
      'ok'
    );

    return;
  }


  /* ===============================================================
     NUEVA ÁREA DENTRO DE UNA UNIDAD
     =============================================================== */

  if (
    form.dataset.form ===
    'addUnidadArea'
  ) {
    e.preventDefault();

    const unidadId =
      form.dataset.unidad;

    const unidad =
      S().unidadesNegocio.find(
        u => u.id === unidadId
      );

    if (!unidad) {
      return toast(
        'No se encontró la unidad de negocio.',
        'error'
      );
    }

    const nombre =
      form.elements.nueva.value.trim();

    if (!nombre) {
      return toast(
        'Escribe el nombre del área.',
        'error'
      );
    }

    unidad.areas ||= [];

    if (
      unidad.areas.some(
        area =>
          norm(area.nombre) === norm(nombre)
      )
    ) {
      return toast(
        `El área “${nombre}” ya existe dentro de ${unidad.nombre}.`,
        'error'
      );
    }

    unidad.areas.push({
      id:
        uid(),

      nombre
    });

    Auth.log(
      'Área creada en unidad',
      `${unidad.nombre} · ${nombre}`
    );

    Store.save();
    renderConfig();

    toast(
      'Área agregada a la unidad',
      'ok'
    );

    return;
  }


  /* ===============================================================
     ÁREAS LEGACY
     Se conserva temporalmente para compatibilidad.
     =============================================================== */

  if (
    form.dataset.form ===
    'addArea'
  ) {
    e.preventDefault();

    const valor =
      form.elements.nueva.value.trim();

    if (!valor) return;

    if (S().areas.includes(valor)) {
      return toast(
        'Esa área ya existe.',
        'error'
      );
    }

    S().areas.push(valor);

    Store.save();
    renderAll();

    toast(
      'Área agregada',
      'ok'
    );

    return;
  }
});

document.addEventListener('keydown', e => {
  if (!$('#slides').hidden) {
    const k = e.key;
    if (['ArrowRight', 'PageDown', ' '].includes(k) && e.target.tagName !== 'SELECT') { e.preventDefault(); Slides.go(Slides.i + 1); }
    else if (['ArrowLeft', 'PageUp'].includes(k) && e.target.tagName !== 'SELECT') { e.preventDefault(); Slides.go(Slides.i - 1); }
    else if (k === 'ArrowDown' && e.target.tagName !== 'SELECT') { e.preventDefault(); Slides.jumpArea(1); }
    else if (k === 'ArrowUp' && e.target.tagName !== 'SELECT') { e.preventDefault(); Slides.jumpArea(-1); }
    else if (k === 'Home') Slides.go(0); else if (k === 'End') Slides.go(Slides.list.length - 1);
    else if (k === 'Escape') Slides.close();
    return;
  }
  if (e.key === 'Escape' && $('#modalRoot').innerHTML) closeModal();
  if (e.key === 'Tab' && $('#modalRoot').innerHTML) { // mantener el foco dentro del modal
    const f = $$('#modalRoot button, #modalRoot input, #modalRoot select, #modalRoot textarea, #modalRoot [tabindex="0"]').filter(x => !x.disabled);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
document.addEventListener('fullscreenchange', () => { /* si el usuario sale de pantalla completa, la presentación sigue abierta en ventana */ });
$('#fileInput').addEventListener('change', e => importExcel(e.target.files[0]));
