'use strict';
/* =======================================================================
   M\u00D3DULO 9 \u00B7 SECCI\u00D3N 2: DASHBOARD (modo direcci\u00F3n)
   Unidad de negocio -> \u00C1rea
   ======================================================================= */

const PRES_TABS = [
  ['resumen', 'Resumen ejecutivo', 'chart'],
  ['area', 'Vista por \u00E1rea', 'layers'],
  ['comparativa', 'Comparativa', 'compare'],
  ['tablas', 'Tablas', 'table']
];

function renderPresentacion() {
  const f = UI.filters;
  const unidades = Array.isArray(S().unidadesNegocio) ? S().unidadesNegocio : [];
  const unidadActual = unidades.find(unidad => unidad.id === f.unidadId) || null;
  const areas = unidadActual ? (unidadActual.areas || []) : [];

  const resp = [...new Set(
    SHEETS.flatMap(sheet =>
      S().data[sheet.key]
        .filter(r => F.a(r) && F.periodo(r, sheet.key))
        .map(r => r.responsable)
    ).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'es'));

  const sel = (k, label, opts, all, help) => `
    <div class="field">
      <label for="flt_${k}">${label}${help ? ' ' + tip(help) : ''}</label>
      <select id="flt_${k}" class="input" data-change="filter" data-k="${k}">
        <option value="">${all}</option>
        ${opts.map(o => `<option value="${esc(o)}" ${o === f[k] ? 'selected' : ''}>${esc(o)}</option>`).join('')}
      </select>
    </div>`;

  const unidadSelector = `
    <div class="field">
      <label for="flt_unidad">Unidad de negocio</label>
      <select id="flt_unidad" class="input" data-change="dashboardUnidad">
        <option value="">Selecciona unidad\u2026</option>
        ${unidades.map(unidad => `<option value="${esc(unidad.id)}" ${unidad.id === f.unidadId ? 'selected' : ''}>${esc(unidad.nombre)}</option>`).join('')}
      </select>
    </div>`;

  const areaSelector = `
    <div class="field">
      <label for="flt_areaUnidad">\u00C1rea</label>
      <select id="flt_areaUnidad" class="input" data-change="dashboardArea" ${unidadActual ? '' : 'disabled'}>
        <option value="">${unidadActual ? 'Todas las \u00E1reas' : 'Primero selecciona unidad'}</option>
        ${areas.map(area => `<option value="${esc(area.id)}" ${area.id === f.areaId ? 'selected' : ''}>${esc(area.nombre)}</option>`).join('')}
      </select>
    </div>`;

  $('#view-presentacion').innerHTML = `
    ${sampleBanner()}
    <div class="edit-context" style="margin-bottom:14px">
      <span class="pill azul"><i></i>Periodos por secci\u00F3n</span>
      <span class="small muted">${esc(Calc.resumenPeriodosAnalisis())}</span>
    </div>
    <div class="card filters fade-in" role="search" aria-label="Filtros del tablero">
      ${unidadSelector}
      ${areaSelector}
      ${sel('semaforo', 'Sem\u00E1foro', CONFIG.LISTAS.semaforo, 'Todos', 'Aplica al cierre y al sem\u00E1foro de origen de las acciones')}
      ${sel('estatus', 'Estatus', CONFIG.LISTAS.estatus, 'Todos', 'Aplica al plan de acci\u00F3n')}
      ${sel('responsable', 'Responsable', resp, 'Todos', 'Aplica a acciones, KPIs y OKRs')}
      <button type="button" class="btn ghost" data-action="clearFilters" ${activeFilters() ? '' : 'disabled'}>${icon('x', 16)}Limpiar</button>
    </div>
    ${unidadActual ? `<div class="edit-context" style="margin-bottom:14px">
      <span class="pill azul"><i></i>${esc(unidadActual.nombre)}</span>
      ${f.areaId ? `<span class="edit-arrow">${icon('chevR', 14)}</span><span class="pill"><i></i>${esc(areas.find(a => a.id === f.areaId)?.nombre || '')}</span>` : '<span class="small muted">Todas las \u00E1reas de la unidad</span>'}
    </div>` : ''}
    <div class="tabs" role="tablist" aria-label="Vistas de presentaci\u00F3n">
      ${PRES_TABS.map(([k, l, i]) => `<button type="button" role="tab" class="tab" aria-selected="${UI.presTab === k}" data-action="presTab" data-tab="${k}">${icon(i, 16)}${l}</button>`).join('')}
    </div>
    <div id="presBody" class="fade-in" role="tabpanel"></div>`;

  if (!unidadActual) {
    $('#presBody').innerHTML = `<div class="card empty"><div class="em-ic">${icon('layers', 32)}</div><h4>Selecciona una unidad de negocio</h4><p>El Dashboard mostrar\u00E1 \u00FAnicamente las \u00E1reas pertenecientes a la unidad seleccionada.</p></div>`;
    return;
  }
  renderPresBody();
}

function renderPresBody() {
  const b = $('#presBody'); if (!b) return;
  Object.values(charts).forEach(c => c.destroy()); charts = {};
  if (UI.presTab === 'resumen') { b.innerHTML = resumenHTML(); animateCounts(b); drawCharts(); }
  if (UI.presTab === 'area') renderAreaView(b);
  if (UI.presTab === 'comparativa') renderComparativa(b);
  if (UI.presTab === 'tablas') renderTablas(b);
}

function globales() {
  const c = F.cierre(), q = F.qqc();
  const sems = c.map(r => Calc.semaforo(r));
  const capturados = q.filter(r => ['responsable','accion','cuando','resultado','estatus','observaciones'].some(k => String(r[k] || '').trim())).length;
  return {
    cumpl: Calc.avgCumpl(c), nInd: c.length,
    verde: sems.filter(s => s === 'Verde').length,
    amarillo: sems.filter(s => s === 'Amarillo').length,
    rojo: sems.filter(s => s === 'Rojo').length,
    nAcc: q.length,
    comp: q.length ? q.filter(r => r.estatus === CONFIG.ESTATUS_COMPLETADO).length / q.length * 100 : null,
    captura: q.length ? capturados / q.length * 100 : null,
    conCuando: q.filter(r => String(r.cuando || '').trim()).length,
    nKpi: F.kpis().length,
    nObj: Object.keys(groupBy(F.okrs(), 'objetivo')).length
  };
}

function kpiCard(lbl, val, fmt, sub, cls = '', help = '') {
  return `<div class="card kpi ${cls}"><div class="lbl">${lbl}${help ? tip(help) : ''}</div><div class="val" data-count="${val ?? ''}" data-fmt="${fmt}">${val == null ? '\u2014' : '0'}</div><div class="sub">${sub}</div></div>`;
}
function animateCounts(root) {
  $$('[data-count]', root).forEach(el => {
    const end = parseFloat(el.dataset.count), fmt = el.dataset.fmt; if (isNaN(end)) return;
    const f = v => fmt === 'pct' ? fmtPct(v) : fmt === 'cur' ? cf.format(v) : nf.format(Math.round(v));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = f(end); return; }
    const t0 = performance.now(), d = 900;
    const step = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = f(end * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

function resumenHTML() {
  const g = globales(), u = S().umbrales;
  const crit = F.qqc().filter(r => r.estatus !== CONFIG.ESTATUS_COMPLETADO && r.estatus !== 'Cancelada')
    .sort((a, b) => (a.semaforo === b.semaforo ? (a.cumplimiento ?? 999) - (b.cumplimiento ?? 999) : a.semaforo === 'Rojo' ? -1 : 1)).slice(0, 6);
  return `<div class="kpi-grid">
      ${kpiCard('Cumplimiento promedio', g.cumpl, 'pct', `${g.nInd} indicadores de cierre`, semClass(Calc.semaforoAuto(g.cumpl)), `Promedio del % de cumplimiento (tope 150%). Verde \u2265 ${u.verde}%, amarillo \u2265 ${u.amarillo}%`)}
      ${kpiCard('Indicadores en verde', g.verde, 'int', g.nInd ? fmtPct(g.verde / g.nInd * 100) + ' del total' : '\u2014', 'verde')}
      ${kpiCard('Indicadores en amarillo', g.amarillo, 'int', g.nInd ? fmtPct(g.amarillo / g.nInd * 100) + ' del total' : '\u2014', 'amarillo')}
      ${kpiCard('Indicadores en rojo', g.rojo, 'int', g.nInd ? fmtPct(g.rojo / g.nInd * 100) + ' del total' : '\u2014', 'rojo')}
      ${kpiCard('Planes capturados', g.captura, 'pct', `${g.nAcc} indicadores cr\u00EDticos`, '', 'Indicadores con al menos un campo de acci\u00F3n capturado')}
      ${kpiCard('Con CU\u00C1NDO capturado', g.conCuando, 'int', 'Texto libre; no se interpreta como fecha', g.conCuando === g.nAcc && g.nAcc ? 'verde' : '')}
      ${kpiCard('KPIs / Objetivos', g.nKpi, 'int', `${g.nObj} objetivos OKR propuestos`)}
    </div>
    <div class="charts">
      <div class="card chart-card"><h3>Cumplimiento por \u00E1rea ${tip('Promedio de cumplimiento del cierre; las l\u00EDneas marcan los umbrales')}</h3><div class="chart-box"><canvas id="chCumpl" aria-label="Gr\u00E1fica de cumplimiento por \u00E1rea" role="img"></canvas></div></div>
      <div class="card chart-card"><h3>Distribuci\u00F3n de sem\u00E1foros</h3><div class="chart-box"><canvas id="chSem" aria-label="Gr\u00E1fica de distribuci\u00F3n de sem\u00E1foros" role="img"></canvas></div></div>
      <div class="card chart-card"><h3>Avance del plan de acci\u00F3n</h3><div class="chart-box"><canvas id="chAcc" aria-label="Gr\u00E1fica de acciones por estatus y \u00E1rea" role="img"></canvas></div></div>
      <div class="card chart-card"><h3>KPIs por \u00E1rea</h3><div class="chart-box"><canvas id="chKpi" aria-label="Gr\u00E1fica de cantidad de KPIs por \u00E1rea" role="img"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:16px"><h3 style="margin-bottom:12px">Acciones cr\u00EDticas por atender</h3>${crit.length ? `<div class="ac-list">${crit.map(r => actionItem(r, true)).join('')}</div>` : emptySm('No hay acciones abiertas con los filtros actuales.')}</div>`;
}

const emptySm = t => `<div class="empty-sm">${icon('check', 18)} ${esc(t)}</div>`;
function actionItem(r, showArea) {
  return `<div class="ac-item"><div class="stripe ${semClass(r.semaforo)}"></div><div><h4>${esc(r.indicador)}${showArea ? ` <span class="tag">${esc(r.area)}</span>` : ''}</h4><p>${r.accion ? esc(r.accion) : '<span class="muted">QU\u00C9 debe hacer: sin capturar</span>'}</p>
    <div class="ac-meta"><span>${r.responsable ? esc(r.responsable) : 'QUI\u00C9N: sin capturar'}</span>\u00B7<span>${r.cuando ? esc(r.cuando) : 'CU\u00C1NDO: sin capturar'}</span>${r.estatus ? estatusPill(r.estatus) : '<span class="tag">Estatus sin capturar</span>'}</div>
    ${r.resultado ? `<div class="small muted" style="margin-top:4px"><b>Resultado esperado:</b> ${esc(r.resultado)}</div>` : ''}${r.observaciones ? `<div class="small muted" style="margin-top:4px"><b>Observaciones:</b> ${esc(r.observaciones)}</div>` : ''}</div></div>`;
}

function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function drawCharts() {
  if (typeof Chart === 'undefined') { $$('.chart-box').forEach(b => b.innerHTML = '<div class="empty-sm">No se pudo cargar la librer\u00EDa de gr\u00E1ficas (revisa tu conexi\u00F3n a internet).</div>'); return; }
  const txt = cssVar('--muted'), grid = cssVar('--border'), V = '#4fb52a', A = '#ffd500', R = '#ec4034';
  Chart.defaults.font.family = cssVar('--font'); Chart.defaults.color = txt; Chart.defaults.borderColor = grid;
  const areas = areasFiltradas(), u = S().umbrales;
  const base = { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: 'easeOutQuart' }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { backgroundColor: '#0e1726', padding: 10, cornerRadius: 8 } } };
  const c = F.cierre(), ar1 = areas.filter(a => c.some(r => r.area === a)), vals = ar1.map(a => Calc.avgCumpl(c.filter(r => r.area === a)));
  charts.c1 = new Chart($('#chCumpl'), { type: 'bar', data: { labels: ar1, datasets: [
    { type: 'bar', label: '% cumplimiento', data: vals.map(v => v == null ? null : Math.round(v * 10) / 10), backgroundColor: vals.map(v => ({ Verde: V, Amarillo: A, Rojo: R })[Calc.semaforoAuto(v)] || '#94a3b8'), borderRadius: 8, maxBarThickness: 46 },
    { type: 'line', label: `Verde \u2265 ${u.verde}%`, data: ar1.map(() => u.verde), borderColor: V, borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5 },
    { type: 'line', label: `Amarillo \u2265 ${u.amarillo}%`, data: ar1.map(() => u.amarillo), borderColor: A, borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5 }] },
    options: { ...base, scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } } } });
  const g = globales();
  const center = { id: 'center', afterDraw(ch) { const { ctx, chartArea: a } = ch; if (!a) return; ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = cssVar('--text'); ctx.font = `600 26px ${cssVar('--font')}`; ctx.fillText(g.nInd, (a.left + a.right) / 2, (a.top + a.bottom) / 2 + 4); ctx.font = `500 11px ${cssVar('--font')}`; ctx.fillStyle = txt; ctx.fillText('indicadores', (a.left + a.right) / 2, (a.top + a.bottom) / 2 + 22); ctx.restore(); } };
  charts.c2 = new Chart($('#chSem'), { type: 'doughnut', data: { labels: ['Verde', 'Amarillo', 'Rojo'], datasets: [{ data: [g.verde, g.amarillo, g.rojo], backgroundColor: [V, A, R], borderWidth: 3, borderColor: cssVar('--surface'), hoverOffset: 8 }] }, options: { ...base, cutout: '68%' }, plugins: [center] });
  const q = F.qqc(), ar3 = areas.filter(a => q.some(r => r.area === a));
  const colEst = { 'No iniciada': '#94a3b8', 'En proceso': '#0cc9f4', 'Completada': V, 'Retrasada': R, 'Cancelada': '#cbd5e1' };
  charts.c3 = new Chart($('#chAcc'), { type: 'bar', data: { labels: ar3, datasets: CONFIG.LISTAS.estatus.map(e => ({ label: e, data: ar3.map(a => q.filter(r => r.area === a && r.estatus === e).length), backgroundColor: colEst[e] || '#94a3b8', borderRadius: 4, maxBarThickness: 28 })) }, options: { ...base, indexAxis: 'y', scales: { x: { stacked: true, ticks: { precision: 0 } }, y: { stacked: true, grid: { display: false } } } } });
  const k = F.kpis(), ar4 = areas.filter(a => k.some(r => r.area === a));
  charts.c4 = new Chart($('#chKpi'), { type: 'bar', data: { labels: ar4, datasets: [{ label: 'KPIs', data: ar4.map(a => k.filter(r => r.area === a).length), backgroundColor: '#8e57e5', borderRadius: 4, maxBarThickness: 46 }] }, options: { ...base, plugins: { ...base.plugins, legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } });
}

const SECTIONS = [['cierre', 'Cierre de resultados', 'chart'], ['qqc', 'PLAN DE ACCIONES CR\u00CDTICAS | METODOLOG\u00CDA QUI\u00C9N - QU\u00C9 - CU\u00C1NDO', 'target'], ['kpis', 'S\u00E1bana de KPIs', 'grid'], ['reflexion', 'Reflexi\u00F3n de \u00C1rea', 'feather'], ['okrs', 'Propuesta de OKRs', 'flag']];
const secTitle = (key, t, i, area) => `<div class="sec-title"><div class="sic">${icon(i, 20)}</div><div><h3>${esc(Calc.tituloPeriodoAnalisis(t, key))}</h3>${area ? `<span class="small muted">${esc(area)}</span>` : ''}</div></div>`;
const emptyBlock = t => `<div class="empty" style="padding:28px"><div class="em-ic" style="width:56px;height:56px">${icon('info', 26)}</div><p style="margin:0 auto">${esc(t)}</p></div>`;


function tablaAccionesCriticasHTML(rows, cierres = []) {
  const avisoManual = avisoDiscrepanciasQQC(cierres);
  if (!rows.length) return avisoManual + emptyBlock('Sin rojos ni amarillos dentro de la mitad inferior de la banda amarilla con los filtros actuales.');
  const grupos = rows.reduce((acc, r) => {
    const periodo = r.tipoPer === 'Trimestral' ? `${r.trimPer || 'Trimestre sin definir'} ${r.anio || ''}`.trim() : `Anual ${r.anio || ''}`.trim();
    const key = [r.unidadNegocioId || r.unidadNegocio, r.areaId || r.area, r.anio, r.tipoPer, r.trimPer].join('|');
    (acc[key] ||= { label: `${r.unidadNegocio || ''} \u00B7 ${r.area || ''} \u00B7 ${periodo}`, rows: [] }).rows.push(r);
    return acc;
  }, {});
  const headers = ['Prioridad','Indicador','QUI\u00C9N','QU\u00C9 debe hacer','CU\u00C1NDO','Resultado esperado','Estatus','Observaciones'];
  const widths = ['7%','14%','9%','31%','9%','13%','7%','10%'];
  return `<div class="qqc-presentacion"><p class="small muted" style="margin:0 0 10px"><b>Criterio de priorizaci\u00F3n adoptado:</b> todos los rojos y los amarillos con cumplimiento \u2265 ${S().umbrales.amarillo}% y &lt; ${nf.format(Calc.puntoMedioBandaAmarilla())}%, la mitad inferior de la banda amarilla hasta el umbral verde de ${S().umbrales.verde}%. El cumplimiento ya respeta el sentido del indicador. No se modifican sem\u00E1foros y una medici\u00F3n aislada no prueba deterioro.</p>${avisoManual}${Object.values(grupos).map(g => `<section style="margin-bottom:14px"><div class="small" style="font-weight:700;margin-bottom:6px">${esc(g.label)}</div><div class="tbl-wrap"><table class="tbl compact" style="min-width:1180px;font-size:11px;table-layout:fixed"><colgroup>${widths.map(w => `<col style="width:${w}">`).join('')}</colgroup><thead><tr>${headers.map(h => `<th class="static" style="font-size:9px;padding:5px 6px">${h}</th>`).join('')}</tr></thead><tbody>${g.rows.map(r => `<tr><td>${prioridadQQCHTML(r)}</td><td><b>${esc(r.indicador)}</b>${r.unidad ? `<div class="muted">${esc(r.unidad)}</div>` : ''}</td><td>${r.responsable ? esc(r.responsable) : '<span class="muted">\u2014</span>'}</td><td style="white-space:normal;overflow-wrap:anywhere">${r.accion ? esc(r.accion) : '<span class="muted">\u2014</span>'}</td><td>${r.cuando ? esc(r.cuando) : '<span class="muted">\u2014</span>'}</td><td>${r.resultado ? esc(r.resultado) : '<span class="muted">\u2014</span>'}</td><td>${r.estatus ? estatusPill(r.estatus) : '<span class="muted">\u2014</span>'}</td><td>${r.observaciones ? esc(r.observaciones) : '<span class="muted">\u2014</span>'}</td></tr>`).join('')}</tbody></table></div></section>`).join('')}</div>`;
}

function sectionHTML(key, area, withArea = false) {
  const [, title, ic] = SECTIONS.find(s => s[0] === key);
  const rows = F.get(key).filter(r => r.area === area);
  let body = '';
  if (key === 'cierre') {
    if (!rows.length) body = emptyBlock('Sin indicadores de cierre con los filtros actuales.');
    else {
      const sems = rows.map(r => Calc.semaforo(r)), cu = Calc.avgCumpl(rows);
      body = `<div class="minis"><div class="mini"><b>${fmtPct(cu)}</b><span>Cumplimiento promedio</span></div><div class="mini"><b style="color:var(--verde)">${sems.filter(s => s === 'Verde').length}</b><span>Verdes</span></div><div class="mini"><b style="color:var(--amarillo)">${sems.filter(s => s === 'Amarillo').length}</b><span>Amarillos</span></div><div class="mini"><b style="color:var(--rojo)">${sems.filter(s => s === 'Rojo').length}</b><span>Rojos</span></div></div>
      <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th class="static">Indicador</th><th class="static num">Meta</th><th class="static num">Real</th><th class="static">Cumplimiento</th><th class="static">Sem\u00E1foro</th></tr></thead><tbody>
      ${rows.map(r => { const p = Calc.cumplimiento(r); return `<tr><td><b>${esc(r.indicador)}</b> <span class="muted small">${esc(r.unidad || '')}</span>${r.comentarios ? `<div class="small muted">${esc(r.comentarios)}</div>` : ''}</td><td class="num">${fmtNum(r.meta)}</td><td class="num">${fmtNum(r.real)}</td><td>${p == null ? '\u2014' : `<b>${fmtPct(p)}</b>`}</td><td>${semPill(Calc.semaforo(r))}</td></tr>`; }).join('')}</tbody></table></div>`;
    }
  }
  if (key === 'qqc') body = tablaAccionesCriticasHTML(rows, F.cierresQQC().filter(r => r.area === area));
  if (key === 'kpis') body = rows.length ? `<div class="tbl-wrap"><table class="tbl compact" style="table-layout:fixed"><thead><tr><th class="static" style="width:30%">KPI</th><th class="static" style="width:10%">Unidad</th><th class="static num" style="width:14%;background:#dcfce7;color:#166534;border-color:#86efac">Meta Verde</th><th class="static num" style="width:14%;background:#fef9c3;color:#854d0e;border-color:#fde047">Meta Amarilla</th><th class="static num" style="width:14%;background:#fee2e2;color:#991b1b;border-color:#fca5a5">Meta Roja</th><th class="static" style="width:18%">Responsable</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td><b>${esc(r.kpi)}</b></td><td>${r.unidad ? esc(r.unidad) : '<span class="muted">\u2014</span>'}</td><td class="num" style="background:#f0fdf4;color:#166534"><b>${fmtNum(r.metaVerde)}</b></td><td class="num" style="background:#fefce8;color:#854d0e"><b>${fmtNum(r.metaAmarilla)}</b></td><td class="num" style="background:#fef2f2;color:#991b1b"><b>${fmtNum(r.metaRoja)}</b></td><td>${r.responsable ? esc(r.responsable) : '<span class="muted">\u2014</span>'}</td></tr>`).join('')}</tbody></table></div>` : emptyBlock('Sin KPIs con los filtros actuales.');
  if (key === 'reflexion') { const r = rows[0]; const cols = SHEET('reflexion').cols.filter(c => c.t !== 'area'); body = r && cols.some(c => String(r[c.k] || '').trim()) ? `<div class="refl-view">${cols.map(c => `<div class="blk"><h4>${esc(c.l)}</h4><p>${r[c.k] ? esc(r[c.k]) : '<span class="muted">Sin capturar</span>'}</p></div>`).join('')}</div>` : emptyBlock('El \u00E1rea a\u00FAn no captura su reflexi\u00F3n.'); }
  if (key === 'okrs') {
    const g = groupBy(rows, 'objetivo');
    body = rows.length ? Object.entries(g).map(([obj, krs], i) => `<div class="okr-card"><div class="oh"><div><span class="tag">Objetivo ${i + 1}</span><h4 style="margin-top:6px">${esc(obj)}</h4></div><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill azul"><i></i>${esc(krs[0].alineacion || 'Sin alinear')}</span>${krs.length < 2 || krs.length > 5 ? `<span class="pill amarillo"><i></i>${krs.length} KR \u00B7 se recomiendan 2\u20135</span>` : ''}</div></div>
      ${krs.map((k, j) => `<div class="kr"><span class="n">KR${j + 1}</span><div>${esc(k.kr)}<div class="small muted">${esc(k.responsable)}</div></div><span class="bm">${fmtNum(k.base)} \u2192 <span style="color:var(--primary)">${fmtNum(k.meta)}</span> ${esc(k.unidad || '')}</span></div>`).join('')}</div>`).join('') : emptyBlock('Sin OKRs propuestos con los filtros actuales.');
  }
  return `<div class="sec">${secTitle(key, title, ic, withArea ? area : '')}${body}</div>`;
}

function areaStats(a) {
  const c = F.cierre().filter(r => r.area === a), q = F.qqc().filter(r => r.area === a);
  return { cumpl: Calc.avgCumpl(c), nInd: c.length, nAcc: q.length, conCuando: q.filter(r => String(r.cuando || '').trim()).length, nKpi: F.kpis().filter(r => r.area === a).length, nObj: Object.keys(groupBy(F.okrs().filter(r => r.area === a), 'objetivo')).length };
}
function areaHero(a) {
  const s = areaStats(a);
  return `<div class="area-hero"><div style="display:flex;gap:16px;align-items:center"><div><span class="small muted">Direcci\u00F3n / \u00E1rea \u00B7 periodos independientes por secci\u00F3n</span><h2>${esc(a)}</h2></div></div>
    <div class="stats"><div><b>${fmtPct(s.cumpl)}</b><span>Cumplimiento</span></div><div><b>${s.nInd}</b><span>Resultados</span></div><div><b>${s.nAcc}</b><span>Plan de acci\u00F3n</span></div><div><b>${s.nKpi}</b><span>KPIs</span></div><div><b>${s.nObj}</b><span>OKRs</span></div></div></div>`;
}
function renderAreaView(b) {
  const areas = areasFiltradas();
  if (!areas.length) { b.innerHTML = emptyBlock('La unidad seleccionada no tiene \u00E1reas disponibles.'); return; }
  if (!UI.presArea || !areas.includes(UI.presArea)) UI.presArea = areas[0];
  const a = UI.presArea;
  b.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px"><div class="field" style="min-width:240px"><label for="presAreaSel">\u00C1rea a revisar</label><select id="presAreaSel" class="input" data-change="presArea">${areas.map(x => `<option ${x === a ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
    <button type="button" class="btn primary" data-action="presentArea">${icon('max', 16)}Presentar esta \u00E1rea</button></div>
    ${areaHero(a)}${SECTIONS.map(([k]) => `<div class="card" style="margin-bottom:16px">${sectionHTML(k, a)}</div>`).join('')}`;
}

function compareRows() {
  return areasFiltradas().map(a => { const s = areaStats(a), c = F.cierre().filter(r => r.area === a), q = F.qqc().filter(r => r.area === a), sem = c.map(r => Calc.semaforo(r));
    return { area: a, ...s, verde: sem.filter(x => x === 'Verde').length, amarillo: sem.filter(x => x === 'Amarillo').length, rojo: sem.filter(x => x === 'Rojo').length,
      comp: q.length ? q.filter(r => r.estatus === CONFIG.ESTATUS_COMPLETADO).length / q.length * 100 : null };
  });
}
const heat = v => { const s = Calc.semaforoAuto(v); return v == null ? '\u2014' : `<span class="heat" style="background:var(--${semClass(s)}-soft);color:var(--${semClass(s)}-txt)">${fmtPct(v)}</span>`; };
const COMPARE_COLS = [
  { l: '\u00C1rea', val: r => r.area, html: r => `<b>${esc(r.area)}</b>` },
  { l: 'Cumplimiento', num: 1, val: r => r.cumpl ?? -1, html: r => heat(r.cumpl) },
  { l: 'Indicadores', num: 1, val: r => r.nInd },
  { l: 'Verdes', num: 1, val: r => r.verde, html: r => `<span style="color:var(--verde);font-weight:700">${r.verde}</span>` },
  { l: 'Amarillos', num: 1, val: r => r.amarillo, html: r => `<span style="color:var(--amarillo);font-weight:700">${r.amarillo}</span>` },
  { l: 'Rojos', num: 1, val: r => r.rojo, html: r => `<span style="color:var(--rojo);font-weight:700">${r.rojo}</span>` },
  { l: 'Acciones', num: 1, val: r => r.nAcc },
  { l: '% Completadas', num: 1, val: r => r.comp ?? -1, html: r => fmtPct(r.comp) },
  { l: 'Con CU\u00C1NDO', num: 1, val: r => r.conCuando },
  { l: 'KPIs', num: 1, val: r => r.nKpi },
  { l: 'Objetivos OKR', num: 1, val: r => r.nObj }
];
function renderComparativa(b) {
  b.innerHTML = `<div class="card"><h3 style="margin-bottom:4px">Comparativa entre \u00E1reas</h3><p class="small muted" style="margin:0 0 14px">Solo se comparan las \u00E1reas de la unidad de negocio seleccionada.</p><div id="cmpTbl"></div></div>`;
  mountTable($('#cmpTbl'), { id: 'cmp', cols: COMPARE_COLS, rows: compareRows() });
}

function sheetCols(sh) {
  return sh.cols.map(c => ({ l: c.l, num: c.num || ['number', 'currency'].includes(c.t),
    val: r => { if (c.t === 'calc') { const v = c.fn(r); return v ?? ''; } if (c.t === 'semaforo') return Calc.semaforo(r); if (['number', 'currency', 'percent'].includes(c.t)) return toNum(r[c.k]) ?? -Infinity; return r[c.k] ?? ''; },
    html: r => c.t === 'area' ? esc(r.area) : fmtCell(c, r, sh.key) }));
}
function renderTablas(b) {
  const sh = SHEET(UI.tablaSheet);
  b.innerHTML = `<div class="card"><div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px"><div class="field" style="min-width:240px"><label for="tblSheet">Hoja</label><select id="tblSheet" class="input" data-change="tablaSheet">${[...SHEETS, RP_SECCION_PERSONAL].map(s => `<option value="${s.key}" ${s.key === sh.key ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select></div><p class="small muted" style="margin:0 0 10px">Los filtros superiores de Unidad y \u00C1rea tambi\u00E9n aplican a esta tabla.</p></div><div id="dataTbl"></div></div>`;
  mountTable($('#dataTbl'), { id: 'tbl_' + sh.key, cols: sheetCols(sh), rows: F.get(sh.key) });
}
function mountTable(box, { id, cols, rows }) {
  const st = tblState[id] ||= { sort: null, dir: 1, q: '' };
  box.innerHTML = `<div class="tbl-tools"><label class="search">${icon('search', 16)}<input type="search" placeholder="Buscar\u2026" value="${esc(st.q)}" aria-label="Buscar en la tabla"></label><span class="small muted cnt"></span></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map((c, i) => `<th scope="col" class="${c.num ? 'num' : ''}"><button type="button" class="th-sort" data-i="${i}">${esc(c.l)}<span class="si" aria-hidden="true"></span></button></th>`).join('')}</tr></thead><tbody></tbody></table></div>`;
  const tbody = $('tbody', box), inp = $('input', box);
  const draw = () => {
    let r = rows;
    if (st.q) { const q = norm(st.q); r = r.filter(x => cols.some(c => norm(c.val(x) === -Infinity ? '' : c.val(x)).includes(q))); }
    if (st.sort != null) { const c = cols[st.sort]; r = [...r].sort((a, b) => { const va = c.val(a), vb = c.val(b); const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es', { numeric: true }); return d * st.dir; }); }
    tbody.innerHTML = r.length ? r.map(x => `<tr>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.html ? c.html(x) : esc(c.val(x))}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}"><div class="empty-sm">Sin resultados.</div></td></tr>`;
    $$('th', box).forEach((th, i) => { th.setAttribute('aria-sort', st.sort === i ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'); $('.si', th).textContent = st.sort === i ? (st.dir > 0 ? '\u25B2' : '\u25BC') : ''; });
    $('.cnt', box).textContent = `${r.length} de ${rows.length} registros`;
  };
  $$('.th-sort', box).forEach(btn => btn.addEventListener('click', () => { const i = +btn.dataset.i; if (st.sort === i) st.dir *= -1; else { st.sort = i; st.dir = 1; } draw(); }));
  inp.addEventListener('input', () => { st.q = inp.value; draw(); });
  draw();
}