'use strict';
/* =======================================================================
   MÓDULO 11 · IMPRESIÓN / PDF
   ======================================================================= */
function imprimir() {
  const g = globales(), areas = areasFiltradas(), fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const head = a => `<div class="p-head"><span>${esc(S().empresa || '')} · Portafolio estratégico · ${esc(CONFIG.LOGIN.TITULO)}</span><span>${esc(a || '')} · ${fecha}</span></div>`;
  let imgs = '';
  try { imgs = Object.values(charts).map(c => `<img src="${c.toBase64Image()}" alt="Gráfica">`).join(''); } catch (e) {}
  const cmp = compareRows();
  $('#printArea').innerHTML = `<div class="p-page">${head('Resumen')}<h1 style="font-size:26px;margin-bottom:4px">${esc(CONFIG.LOGIN.TITULO)}</h1><p class="muted">${areas.length} áreas${activeFilters() ? ' · con filtros aplicados' : ''}</p>
      <div class="kpi-grid">${kpiCard('Cumplimiento promedio', null, '', fmtPct(g.cumpl))}${kpiCard('Verde / Amarillo / Rojo', null, '', `${g.verde} / ${g.amarillo} / ${g.rojo}`)}${kpiCard('Acciones completadas', null, '', `${fmtPct(g.comp)} · ${g.venc} vencidas`)}${kpiCard('Inversión propuesta', null, '', fmtCur(g.inv))}</div>
      ${imgs ? `<div class="p-charts">${imgs}</div>` : ''}
      <h3 style="margin:14px 0 8px">Comparativa entre áreas</h3><div class="tbl-wrap"><table class="tbl compact"><thead><tr>${COMPARE_COLS.map(c => `<th class="static ${c.num ? 'num' : ''}">${esc(c.l)}</th>`).join('')}</tr></thead><tbody>${cmp.map(r => `<tr>${COMPARE_COLS.map(c => `<td class="${c.num ? 'num' : ''}">${c.html ? c.html(r) : esc(c.val(r))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
    ${areas.map(a => `<div class="p-page">${head(a)}${areaHero(a)}${SECTIONS.map(([k]) => sectionHTML(k, a)).join('')}</div>`).join('')}`;
  $$('#printArea .val').forEach(v => { v.textContent = v.parentElement.querySelector('.sub').textContent; v.parentElement.querySelector('.sub').textContent = ''; });
  setTimeout(() => window.print(), 150);
}
