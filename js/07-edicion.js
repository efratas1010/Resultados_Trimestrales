'use strict';
/* =======================================================================
   M\u00D3DULO 7 \u00B7 SECCI\u00D3N 1: REGISTRO
   ======================================================================= */
function renderRegistro() {
  const unidades = unidadesEdicion();
  const unidad = unidadEdicionActual();
  const areas = areasEdicion();
  const areaObj = areaEdicionActual();

  /*
   * Si la unidad seleccionada dej\u00F3 de existir,
   * limpia la selecci\u00F3n.
   */
  if (
    UI.unidadId &&
    !unidades.some(item => item.id === UI.unidadId)
  ) {
    limpiarSeleccionEdicion();
  }

  /*
   * Si el \u00E1rea seleccionada dej\u00F3 de existir,
   * limpia \u00FAnicamente el \u00E1rea.
   */
  if (
    UI.areaId &&
    !areas.some(item => item.id === UI.areaId)
  ) {
    UI.areaId = '';
    UI.area = null;
  }

  const selector = `
    <div class="card reg-head fade-in">

      <div class="field">
        <label for="unidadEditSel">
          Unidad de negocio
          ${tip(
            'Primero selecciona la unidad de negocio que deseas editar.'
          )}
        </label>

        <select
          id="unidadEditSel"
          class="input"
          data-change="unidadEdicion"
        >
          <option value="">
            Selecciona una unidad\u2026
          </option>

          ${unidades
            .map(
              item => `
                <option
                  value="${esc(item.id)}"
                  ${
                    item.id === UI.unidadId
                      ? 'selected'
                      : ''
                  }
                >
                  ${esc(item.nombre)}
                </option>
              `
            )
            .join('')}
        </select>
      </div>


      <div class="field">
        <label for="areaEditSel">
          \u00C1rea
          ${tip(
            'Las \u00E1reas dependen de la unidad de negocio seleccionada.'
          )}
        </label>

        <select
          id="areaEditSel"
          class="input"
          data-change="areaEdicion"
          ${unidad ? '' : 'disabled'}
        >
          <option value="">
            ${
              unidad
                ? 'Selecciona un \u00E1rea\u2026'
                : 'Primero selecciona una unidad'
            }
          </option>

          ${areas
            .map(
              item => `
                <option
                  value="${esc(item.id)}"
                  ${
                    item.id === UI.areaId
                      ? 'selected'
                      : ''
                  }
                >
                  ${esc(item.nombre)}
                </option>
              `
            )
            .join('')}
        </select>
      </div>


      ${
        areaObj
          ? `
            <div class="reg-prog">
              ${ring(
                Calc.avanceArea(
                  areaObj.nombre,
                  UI.unidadId,
                  UI.areaId
                ),
                62
              )}

              <div>
                <b>
                  ${esc(unidad.nombre)}
                  \u2192
                  ${esc(areaObj.nombre)}
                </b>

                <div class="small muted">
                  Unidad y \u00E1rea seleccionadas
                </div>
              </div>
            </div>
          `
          : ''
      }

    </div>
  `;

  /*
   * No existen unidades configuradas.
   */
  if (!unidades.length) {
    $('#view-registro').innerHTML = `
      ${selector}

      <div class="card empty">
        <div class="em-ic">
          ${icon('layers', 32)}
        </div>

        <h4>
          No hay unidades de negocio disponibles
        </h4>

        <p>
          Entra a Administraci\u00F3n \u2192 Configuraci\u00F3n
          y crea al menos una unidad con sus \u00E1reas.
        </p>
      </div>
    `;

    return;
  }

  /*
   * Todav\u00EDa no se ha seleccionado unidad.
   */
  if (!unidad) {
    $('#view-registro').innerHTML = `
      ${selector}

      <div class="card empty">
        <div class="em-ic">
          ${icon('layers', 32)}
        </div>

        <h4>
          Selecciona una unidad de negocio
        </h4>

        <p>
          Despu\u00E9s podr\u00E1s seleccionar una de las \u00E1reas
          configuradas dentro de esa unidad.
        </p>
      </div>
    `;

    return;
  }

  /*
   * La unidad no tiene \u00E1reas.
   */
  if (!areas.length) {
    $('#view-registro').innerHTML = `
      ${selector}

      <div class="card empty">
        <div class="em-ic">
          ${icon('info', 32)}
        </div>

        <h4>
          ${esc(unidad.nombre)} no tiene \u00E1reas
        </h4>

        <p>
          Agrega las \u00E1reas desde
          Administraci\u00F3n \u2192 Configuraci\u00F3n.
        </p>
      </div>
    `;

    return;
  }

  /*
   * Todav\u00EDa no se ha seleccionado \u00E1rea.
   */
  if (!areaObj) {
    $('#view-registro').innerHTML = `
      ${selector}

      <div class="card empty">
        <div class="em-ic">
          ${icon('grid', 32)}
        </div>

        <h4>
          Selecciona el \u00E1rea que deseas editar
        </h4>

        <p>
          Solo aparecen las \u00E1reas pertenecientes a
          ${esc(unidad.nombre)}.
        </p>
      </div>
    `;

    return;
  }

  UI.area = areaObj.nombre;

  const hojasCompletas = SHEETS.filter(
    hoja =>
      Calc.avanceHoja(
        areaObj.nombre,
        hoja.key,
        UI.unidadId,
        UI.areaId
      ) >= 1
  ).length;

  $('#view-registro').innerHTML = `
    ${sampleBanner()}

    ${selector}

    <div class="edit-context">
      <span class="pill azul">
        <i></i>
        ${esc(unidad.nombre)}
      </span>

      <span class="edit-arrow">
        ${icon('chevR', 14)}
      </span>

      <span class="pill">
        <i></i>
        ${esc(areaObj.nombre)}
      </span>

      <span class="small muted">
        ${hojasCompletas} de
        ${SHEETS.length} hojas completas
      </span>
    </div>

    <div
      class="tabs"
      role="tablist"
      aria-label="Hojas de captura"
    >
      ${SHEETS
        .map(hoja => {
          const avance = Calc.avanceHoja(
            areaObj.nombre,
            hoja.key,
            UI.unidadId,
            UI.areaId
          );

          return `
            <button
              type="button"
              role="tab"
              class="tab"
              aria-selected="${hoja.key === UI.sheet}"
              data-action="sheet"
              data-sheet="${hoja.key}"
            >
              ${icon(hoja.icon, 16)}
              ${esc(hoja.corto)}

              <span
                class="tab-dot ${
                  avance >= 1
                    ? 'ok'
                    : avance > 0
                      ? 'mid'
                      : ''
                }"
                aria-hidden="true"
              ></span>
            </button>
          `;
        })
        .join('')}
    </div>

    <div
      class="card fade-in"
      role="tabpanel"
    >
      ${sheetPanel(
        areaObj.nombre,
        SHEET(UI.sheet)
      )}
    </div>
  `;

  if (!SHEET(UI.sheet).form) {
    drawRegTable();
  }
}

function sheetPanel(area, sh) {
  const head = `<div class="sheet-head"><div><h2>${esc(sh.nombre)}</h2><p>${esc(sh.ayuda)}</p></div>
    ${sh.form ? '' : `<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="search">${icon('search', 16)}<input type="search" id="regSearch" data-input="regSearch" placeholder="Buscar en esta hoja\u2026" value="${esc(UI.regQ)}" aria-label="Buscar en esta hoja"></label>
      <button type="button" class="btn primary" data-action="addRow">${icon('plus', 16)}Agregar ${sh.key === 'okrs' ? 'Key Result' : 'fila'}</button></div>`}</div>`;
  if (!sh.form) return head + `<div id="regTable"></div>`;
  // Reflexi\u00F3n: formulario de texto libre estructurado
  const r = Calc.rows('reflexion', area)[0] || {};
  return head + `<div class="refl-grid">${sh.cols.filter(c => c.t !== 'area').map(c => `
    <div class="refl-card"><label for="rf_${c.k}"><b>${esc(c.l)}</b></label><span class="hint">${esc(c.help || '')}</span>
      <textarea id="rf_${c.k}" class="input" data-input="refl" data-k="${c.k}" placeholder="Escribe aqu\u00ED\u2026">${esc(r[c.k] || '')}</textarea>
      <span class="cnt" id="cnt_${c.k}">${String(r[c.k] || '').length} caracteres</span></div>`).join('')}</div>
    <p class="hint" style="margin-top:12px">${icon('check', 14)} Se guarda autom\u00E1ticamente mientras escribes.</p>`;
}

function drawRegTable() {
  const area = UI.area, sh = SHEET(UI.sheet), box = $('#regTable'); if (!box) return;
  let rows = Calc.rows(sh.key, area);
  const total = rows.length;
  if (UI.regQ) { const q = norm(UI.regQ); rows = rows.filter(r => sh.cols.some(c => norm(cellText(c, r)).includes(q))); }
  if (!total) {
    box.innerHTML = `<div class="empty"><div class="em-ic">${icon(sh.icon, 32)}</div><h4>A\u00FAn no hay registros en \u201C${esc(sh.nombre)}\u201D</h4>
      <p>${esc(sh.ayuda)}</p><button type="button" class="btn primary" data-action="addRow">${icon('plus', 16)}Agregar la primera fila</button></div>`;
    return;
  }
  const cols = sh.cols.filter(c => c.t !== 'area');
  const rowHtml = r => {
    const errs = validateRow(sh, r), nE = Object.keys(errs).length;
    return `<tr data-id="${r.id}" class="${nE ? 'row-inc' : ''}">${cols.map(c => `<td class="cell ${c.t === 'textarea' || c.full ? 'cell-wide' : ''}" ${errs[c.k] ? `data-err="1" title="${esc(errs[c.k])}"` : ''}>${cellInput(c, r)}</td>`).join('')}
      <td class="actions">${nE ? '<span class="tag danger" title="Faltan campos obligatorios">Incompleta</span> ' : ''}<button type="button" class="icon-btn" data-action="editRow" data-id="${r.id}" aria-label="Abrir en ventana" data-tip="Abrir en ventana">${icon('edit', 16)}</button><button type="button" class="icon-btn" data-action="dupRow" data-id="${r.id}" aria-label="Duplicar" data-tip="Duplicar">${icon('copy', 16)}</button><button type="button" class="icon-btn del" data-action="delRow" data-id="${r.id}" aria-label="Eliminar" data-tip="Eliminar">${icon('trash', 16)}</button></td></tr>`;
  };
  box.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th class="static ${c.num || ['number', 'currency'].includes(c.t) ? 'num' : ''}" scope="col">${esc(c.l)}${c.req ? ' <span style="color:var(--rojo)">*</span>' : ''}</th>`).join('')}<th class="static" scope="col"><span style="position:absolute;left:-9999px">Acciones</span></th></tr></thead>
    <tbody>${rows.map(rowHtml).join('') || `<tr><td colspan="${cols.length + 1}"><div class="empty-sm">Sin coincidencias para \u201C${esc(UI.regQ)}\u201D.</div></td></tr>`}</tbody></table></div>
    <p class="hint" style="margin-top:8px">${rows.length} de ${total} registros \u00B7 Escribe directo en cada celda; se guarda al salir de ella. <span style="color:var(--rojo)">*</span> obligatorio.</p>`;
  box.onchange = e => onCellChange(e.target);
}

/* Celda editable seg\u00FAn el tipo de columna */
function cellInput(c, r) {
  const v = r[c.k] ?? '', base = `class="cell-in" data-id="${r.id}" data-k="${c.k}" aria-label="${esc(c.l)}"`;
  if (c.t === 'calc') { const x = c.fn(r); return `<span class="cell-calc">${esc(c.fmt ? c.fmt(x) : (x ?? '\u2014'))}</span>`; }
  if (c.t === 'semaforo') return `<div class="cell-sem">${semPill(Calc.semaforo(r))}<select ${base}>${['Autom\u00E1tico', ...CONFIG.LISTAS.semaforo].map(o => `<option ${o === (v || 'Autom\u00E1tico') ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
  if (c.t === 'select') {
    const dis = c.k === 'trimPer' && r.tipoPer !== 'Trimestral' ? 'disabled' : '';
    return `<select ${base} ${dis}><option value="">\u2014</option>${getOpts(c).map(o => `<option ${String(o) === String(v) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  }
  if (c.t === 'date') return `<input type="date" ${base} value="${esc(v)}">`;
  if (['number', 'currency', 'percent'].includes(c.t)) return `<input type="text" inputmode="decimal" ${base} value="${esc(v)}" style="text-align:right" placeholder="${c.t === 'percent' ? '0\u2013100' : '0'}">`;
  if (c.t === 'textarea') return `<textarea ${base} rows="2">${esc(v)}</textarea>`;
  return `<input type="text" ${base} value="${esc(v)}">`;
}

/* Guarda la celda editada y recalcula la tabla sin perder la posici\u00F3n */
function onCellChange(el) {
  if (!el.matches || !el.matches('.cell-in')) return;
  const sh = SHEET(UI.sheet), r = S().data[sh.key].find(x => x.id === el.dataset.id); if (!r) return;
  const c = sh.cols.find(x => x.k === el.dataset.k); if (!c) return;
  let v = el.value.trim();
  if (['number', 'currency', 'percent'].includes(c.t) && v !== '') {
    const n = toNum(v);
    if (n == null) { toast(`\u201C${c.l}\u201D debe ser un n\u00FAmero.`, 'error'); el.value = r[c.k] ?? ''; return; }
    if (c.t === 'percent' && (n < 0 || n > 100)) { toast(`\u201C${c.l}\u201D debe estar entre 0 y 100.`, 'error'); el.value = r[c.k] ?? ''; return; }
    v = n;
  }
  r[c.k] = v;
  if (c.k === 'tipoPer' && v !== 'Trimestral') r.trimPer = '';
  Store.save();
  setTimeout(() => {
    const a = document.activeElement, fid = a?.dataset?.id, fk = a?.dataset?.k;
    drawRegTable();
    $$('.tab-dot', $('#view-registro')).forEach((d, i) => { const p = Calc.avanceHoja(UI.area, SHEETS[i].key); d.className = 'tab-dot ' + (p >= 1 ? 'ok' : p > 0 ? 'mid' : ''); });
    if (fid && fk) $(`#regTable .cell-in[data-id="${fid}"][data-k="${fk}"]`)?.focus();
  }, 0);
}

/* Agrega una fila vac\u00EDa directamente en la tabla */
function addInlineRow(preset = {}) {
  const sh = SHEET(UI.sheet); if (!sh || sh.form) return;
const unidad = unidadEdicionActual();
const areaObj = areaEdicionActual();

if (!unidad || !areaObj) {
  return toast(
    'Selecciona primero la unidad de negocio y el \u00E1rea.',
    'error'
  );
}

const r = {
  id: uid(),

  unidadNegocioId: unidad.id,
  unidadNegocio: unidad.nombre,

  areaId: areaObj.id,
  area: areaObj.nombre,

  ...defaults(sh),
  ...preset
};
  S().data[sh.key].push(r); UI.regQ = '';
  Auth.log('Registro agregado', `${sh.nombre} \u00B7 ${UI.area}`);
  Store.save(); renderRegistro();
  const first = $(`#regTable tr[data-id="${r.id}"] .cell-in`);
  if (first) { first.scrollIntoView({ block: 'nearest', inline: 'start' }); first.focus(); }
}

/* Formato de celdas seg\u00FAn tipo de columna */
function cellText(c, r) {
  if (c.t === 'calc') { const v = c.fn(r); return c.fmt ? c.fmt(v) : (v ?? ''); }
  if (c.t === 'semaforo') return Calc.semaforo(r);
  return r[c.k] ?? '';
}
function fmtCell(c, r, key) {
  const v = r[c.k];
  switch (c.t) {
    case 'number': return fmtNum(v);
    case 'currency': return fmtCur(v);
    case 'percent': return progBar(v);
    case 'date': return `<span style="white-space:nowrap">${fmtDate(v)}</span>${key === 'qqc' && Calc.vencida(r) ? ' <span class="tag danger">Vencida</span>' : ''}`;
    case 'semaforo': return semPill(Calc.semaforo(r)) + (v && v !== 'Autom\u00E1tico' ? ' <span class="tag" data-tip="Sem\u00E1foro forzado manualmente">Manual</span>' : '');
    case 'calc': { const x = c.fn(r); if (key === 'cierre' && c.k === 'cumplimiento') return `<b>${fmtPct(x)}</b>`; return esc(c.fmt ? c.fmt(x) : x); }
    case 'select':
      if (c.k === 'estatus') return estatusPill(v);
      if (c.k === 'semaforo') return semPill(v);
      return esc(v || '\u2014');
    case 'textarea': return v ? `<span class="clip" title="${esc(v)}">${esc(v)}</span>` : '<span class="muted">\u2014</span>';
    default: return v ? esc(v) : '<span class="muted">\u2014</span>';
  }
}

/* ----- Formulario modal (agregar / editar) con validaciones ----- */
const getOpts = c => typeof c.opts === 'function' ? c.opts() : Array.isArray(c.opts) ? c.opts : (CONFIG.LISTAS[c.opts] || []);
function defaults(sh) { const o = {}; sh.cols.forEach(c => { if (c.def !== undefined) o[c.k] = c.def; }); return o; }

function validateRow(sh, r) {
  const e = {};
  sh.cols.forEach(c => {
    if (c.t === 'area' || c.t === 'calc') return;
    const v = r[c.k], empty = v === '' || v == null;
    if (c.req && empty) { e[c.k] = 'Campo obligatorio'; return; }
    if (empty) return;
    if (['number', 'currency', 'percent'].includes(c.t) && toNum(v) == null) e[c.k] = 'Debe ser un n\u00FAmero';
    if (c.t === 'percent' && toNum(v) != null && (toNum(v) < 0 || toNum(v) > 100)) e[c.k] = 'Debe estar entre 0 y 100';
    if (c.t === 'currency' && toNum(v) != null && toNum(v) < 0) e[c.k] = 'No puede ser negativo';
    if (c.t === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v + 'T00:00:00')))) e[c.k] = 'Fecha no v\u00E1lida';
       if (c.t === 'select' && !getOpts(c).includes(v)) e[c.k] = 'Elige una opci\u00F3n de la lista';
  });
  if (sh.cols.some(c => c.k === 'tipoPer') && r.tipoPer === 'Trimestral' && !r.trimPer) e.trimPer = 'Elige el trimestre';
  return e;
}

function fieldHtml(c, v, area, key) {
  const id = 'f_' + c.k, req = c.req ? ' <span class="req" aria-hidden="true">*</span>' : '';
  const lab = `<label for="${id}">${esc(c.l)}${req}${c.help ? ' ' + tip(c.help) : ''}</label>`;
  const common = `id="${id}" name="${c.k}" class="input" ${c.req ? 'aria-required="true"' : ''} aria-describedby="e_${c.k}"`;
  let input;
  if (c.t === 'textarea') input = `<textarea ${common} rows="3">${esc(v ?? '')}</textarea>`;
  else if (c.t === 'select' || c.t === 'semaforo') {
    const opts = c.t === 'semaforo' ? ['Autom\u00E1tico', ...CONFIG.LISTAS.semaforo] : getOpts(c);
    input = `<select ${common}>${c.t === 'select' ? '<option value="">Selecciona\u2026</option>' : ''}${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  } else if (c.t === 'date') input = `<input type="date" ${common} value="${esc(v ?? '')}">`;
  else if (['number', 'currency', 'percent'].includes(c.t)) input = `<input type="text" inputmode="decimal" ${common} value="${esc(v ?? '')}" placeholder="${c.t === 'percent' ? '0 \u2013 100' : c.t === 'currency' ? '$0' : '0'}">`;
  else {
    let dl = '';
    if (c.list) { const vals = [...new Set(S().data[key].filter(r => c.k === 'responsable' || r.area === area).map(r => r[c.k]).filter(Boolean))]; if (c.k === 'responsable') SHEETS.forEach(s => S().data[s.key].forEach(r => r.responsable && vals.push(r.responsable))); dl = `<datalist id="dl_${c.k}">${[...new Set(vals)].map(x => `<option value="${esc(x)}">`).join('')}</datalist>`; }
    input = `<input type="text" ${common} value="${esc(v ?? '')}" ${c.list ? `list="dl_${c.k}"` : ''} autocomplete="off">${dl}`;
  }
  return `<div class="field ${c.full || c.t === 'textarea' ? 'full' : ''}">${lab}${input}<span class="err" id="e_${c.k}"></span></div>`;
}

let lastFocus = null;
function openForm(key, id, preset = {}) {
  const sh = SHEET(key), area = UI.area, row = id ? S().data[key].find(r => r.id === id) : null;
  const vals = { ...defaults(sh), ...preset, ...(row || {}) };
  const fields = sh.cols.filter(c => c.t !== 'area' && c.t !== 'calc');
  lastFocus = document.activeElement;
  $('#modalRoot').innerHTML = `<div class="modal-bg" data-action="modalBg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">
    <form id="mForm" novalidate>
      <header><div><h2 id="mTitle">${row ? 'Editar' : 'Agregar'} \u00B7 ${esc(sh.nombre)}</h2><span class="small muted">${esc(area)}</span></div>
        <button type="button" class="icon-btn" data-action="closeModal" aria-label="Cerrar" style="margin-left:auto">${icon('x')}</button></header>
      <div class="body">${key === 'cierre' ? '<div class="preview" id="mPreview"></div>' : ''}${fields.map(c => fieldHtml(c, vals[c.k], area, key)).join('')}</div>
      <footer><span class="hint" style="margin-right:auto">Los campos con <span style="color:var(--rojo)">*</span> son obligatorios</span>
        <button type="button" class="btn" data-action="closeModal">Cancelar</button><button type="submit" class="btn primary">${icon('check', 16)}Guardar</button></footer>
    </form></div></div>`;
  const form = $('#mForm');
  const read = () => { const o = {}; fields.forEach(c => { const el = form.elements[c.k]; o[c.k] = el ? el.value.trim() : ''; }); return o; };
  const preview = () => { const p = $('#mPreview'); if (!p) return; const o = read(); const c = Calc.cumplimiento(o); const s = o.semaforo && o.semaforo !== 'Autom\u00E1tico' ? o.semaforo : Calc.semaforoAuto(c);
    p.innerHTML = `${icon('chart', 18)}<span>Cumplimiento calculado: <b>${fmtPct(c)}</b></span>${semPill(s)}<span class="hint">Umbrales: verde \u2265 ${S().umbrales.verde}% \u00B7 amarillo \u2265 ${S().umbrales.amarillo}%</span>`; };
  preview();
    form.addEventListener('input', preview);
  // Periodo: muestra "Trimestre" solo si es Trimestral y cambia Meta/Real a anual o trimestral
  const syncPer = () => {
    const t = form.elements.tipoPer?.value || '';
    const tw = form.elements.trimPer?.closest('.field'); if (tw) tw.hidden = t !== 'Trimestral';
    fields.filter(c => c.per).forEach(c => { const l = form.querySelector(`label[for="f_${c.k}"]`); if (l?.firstChild) l.firstChild.textContent = c.l + (t === 'Anual' ? ' anual' : t === 'Trimestral' ? ' trimestral' : ''); });
  };
  syncPer(); form.addEventListener('change', syncPer);
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const o = read();
    fields.forEach(c => { if (['number', 'currency', 'percent'].includes(c.t) && o[c.k] !== '' && toNum(o[c.k]) != null) o[c.k] = toNum(o[c.k]); });
       if (o.tipoPer === 'Anual') o.trimPer = '';
    const errs = validateRow(sh, o);
    fields.forEach(c => { const el = form.elements[c.k]; if (!el) return; el.setAttribute('aria-invalid', errs[c.k] ? 'true' : 'false'); $('#e_' + c.k).textContent = errs[c.k] || ''; });
    if (Object.keys(errs).length) { form.elements[Object.keys(errs)[0]]?.focus(); toast('Revisa los campos marcados.', 'error'); return; }
   if (row) {
  Object.assign(row, o, {
    unidadNegocioId: UI.unidadId,
    unidadNegocio: unidadEdicionActual()?.nombre || '',

    areaId: UI.areaId,
    area: areaEdicionActual()?.nombre || area
  });
} else {
  S().data[key].push({
    id: uid(),

    unidadNegocioId: UI.unidadId,
    unidadNegocio: unidadEdicionActual()?.nombre || '',

    areaId: UI.areaId,
    area: areaEdicionActual()?.nombre || area,

    ...o
  });
}
    Auth.log(row ? 'Registro editado' : 'Registro agregado', `${sh.nombre} \u00B7 ${area}`);
    Store.save(); closeModal(); renderSidebar(); renderRegistro();
    toast(row ? 'Cambios guardados' : 'Registro agregado', 'ok');
  });
  setTimeout(() => form.querySelector('.input')?.focus(), 30);
}
function closeModal() { $('#modalRoot').innerHTML = ''; lastFocus?.focus?.(); }

function dupRow(id) {
  const arr = S().data[UI.sheet], i = arr.findIndex(r => r.id === id); if (i < 0) return;
  arr.splice(i + 1, 0, { ...arr[i], id: uid() }); Store.save(); renderSidebar(); renderRegistro(); toast('Fila duplicada', 'ok');
}
function delRow(id) {
  if (!confirm('\u00BFEliminar este registro? Esta acci\u00F3n no se puede deshacer.')) return;
  S().data[UI.sheet] = S().data[UI.sheet].filter(r => r.id !== id); Auth.log('Registro eliminado', `${SHEET(UI.sheet).nombre} \u00B7 ${UI.area}`); Store.save(); renderSidebar(); renderRegistro(); toast('Registro eliminado');
}
const saveRefl = debounce(() => { Store.save(); renderSidebar(); $$('.tab-dot', $('#view-registro')).forEach((d, i) => { const p = Calc.avanceHoja(UI.area, SHEETS[i].key); d.className = 'tab-dot ' + (p >= 1 ? 'ok' : p > 0 ? 'mid' : ''); }); }, 300);
function onReflInput(el) {
  let r = Calc.rows('reflexion', UI.area)[0];
  if (!r) { r = {
  id: uid(),

  unidadNegocioId: UI.unidadId,
  unidadNegocio: unidadEdicionActual()?.nombre || '',

  areaId: UI.areaId,
  area: areaEdicionActual()?.nombre || UI.area
}; S().data.reflexion.push(r); }
  r[el.dataset.k] = el.value; $('#cnt_' + el.dataset.k).textContent = el.value.length + ' caracteres';
  setSaveStatus('saving'); saveRefl();
}
