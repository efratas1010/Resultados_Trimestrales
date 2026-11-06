'use strict';
/* =======================================================================
   MÓDULO 12 · EXCEL (importar / exportar / plantilla) con SheetJS
   ======================================================================= */
function excelOk() { if (typeof XLSX === 'undefined') { toast('No se pudo cargar la librería de Excel. Revisa tu conexión a internet.', 'error'); return false; } return true; }
function exportVal(c, r) {
  if (c.t === 'calc') { const v = c.fn(r); return typeof v === 'number' ? Math.round(v * 10) / 10 : (v ?? ''); }
  if (c.t === 'semaforo') return Calc.semaforo(r);
  if (['number', 'currency', 'percent'].includes(c.t)) { const n = toNum(r[c.k]); return n == null ? '' : n; }
  return r[c.k] ?? '';
}
function exportExcel(vacia = false) {
  if (!excelOk()) return;
  try {
    const wb = XLSX.utils.book_new(), ord = a => { const i = S().areas.indexOf(a); return i < 0 ? 999 : i; };
    if (vacia) {
      const ins = [['Instrucciones de llenado'], [''], ['1. Captura una fila por registro en cada hoja. La columna "Área" debe coincidir con la lista de áreas.'], ['2. No repitas Año, Tipo de periodo ni Trimestre: cada hoja usa el periodo configurado para su sección.'], [`3. Periodos vigentes: ${Calc.resumenPeriodosAnalisis()}`], ['4. Columnas calculadas (% Cumplimiento, Trimestre, Variación) se recalculan al importar.'], ['5. Semáforo del cierre: escribe Automático, Verde, Amarillo o Rojo.'], [`6. Listas válidas → Estatus: ${CONFIG.LISTAS.estatus.join(', ')} | Frecuencia: ${CONFIG.LISTAS.frecuencia.join(', ')}`], ['7. OKRs: una fila por Key Result; repite el mismo Objetivo para agruparlos (2 a 5 KRs).']];
      const ws = XLSX.utils.aoa_to_sheet(ins); ws['!cols'] = [{ wch: 120 }]; XLSX.utils.book_append_sheet(wb, ws, 'Instrucciones');
    }
    SHEETS.forEach(sh => {
      const cols = vacia ? sh.cols.filter(c => !['anio', 'tipoPer', 'trimPer'].includes(c.k)) : sh.cols;
      const aoa = [cols.map(c => c.l)];
      if (!vacia) [...S().data[sh.key]].filter(r => Auth.canArea(r.area)).sort((a, b) => ord(a.area) - ord(b.area)).forEach(r => aoa.push(cols.map(c => exportVal(c, r))));
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = cols.map(c => ({ wch: c.w || (c.t === 'textarea' ? 40 : 16) }));
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(aoa.length - 1, 1), c: cols.length - 1 } }) };
      XLSX.utils.book_append_sheet(wb, ws, sh.hoja.slice(0, 31));
    });
    const cfg = [['Parámetro', 'Valor'], ['Empresa', S().empresa || ''], ['Umbral verde', S().umbrales.verde], ['Umbral amarillo', S().umbrales.amarillo], ...S().areas.map(a => ['Área', a]), ...S().objetivos.map(o => ['Objetivo estratégico', o])];
    if (Auth.isAdmin()) { const wc = XLSX.utils.aoa_to_sheet(cfg); wc['!cols'] = [{ wch: 22 }, { wch: 40 }]; XLSX.utils.book_append_sheet(wb, wc, 'Configuración'); }
    const suf = Auth.isAdmin() ? '' : '_' + Auth.areas().join('-').replace(/[^\wÁÉÍÓÚáéíóúÑñ-]+/g, '');
    XLSX.writeFile(wb, vacia ? `Plantilla_Portafolio.xlsx` : `Portafolio${suf}_${hoyISO()}.xlsx`);
    if (!vacia) Auth.log('Exportación a Excel', Auth.isAdmin() ? 'Todas las áreas' : Auth.areas().join(', '));
    toast(vacia ? 'Plantilla descargada' : 'Excel exportado', 'ok');
  } catch (e) { console.error(e); toast('Error al exportar: ' + e.message, 'error'); }
}
function matchSheet(name) {
  const n = norm(name);
  const exact = SHEETS.find(s => norm(s.hoja) === n || norm(s.nombre) === n); if (exact) return exact;
  const kw = [['okrs', ['okr']], ['kpis', ['kpi', 'sabana']], ['qqc', ['quien', 'qqc']], ['cierre', ['cierre']], ['reflexion', ['reflexion']]];
  const hit = kw.find(([, ws]) => ws.some(w => n.includes(w))); return hit ? SHEET(hit[0]) : null;
}
function cleanVal(c, v) {
  if (v == null) return '';
  if (c.t === 'date') {
    if (v instanceof Date) return isNaN(v) ? '' : isoLocal(v);
    if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : ''; }
    const s = String(v).trim(), m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s.slice(0, 10);
  }
  if (['number', 'currency', 'percent'].includes(c.t)) { let n = toNum(v); if (n == null) return ''; if (c.t === 'percent' && typeof v === 'number' && n > 0 && n <= 1) n = Math.round(n * 1000) / 10; return n; }
  if (c.t === 'select' || c.t === 'semaforo') { const opts = c.t === 'semaforo' ? ['Automático', ...CONFIG.LISTAS.semaforo] : getOpts(c); return opts.find(o => norm(o) === norm(v)) || String(v).trim(); }
  return String(v).trim();
}
async function importExcel(file) {
  if (!file || !excelOk()) return;
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const found = {}; wb.SheetNames.forEach(n => { const sh = matchSheet(n); if (sh && !found[sh.key]) found[sh.key] = n; });
    if (!Object.keys(found).length) throw new Error('no se encontraron hojas reconocibles (Cierre, Quién-Qué-Cuándo, KPIs, Reflexión, OKRs).');
    const admin = Auth.isAdmin();
    const reemplazar = confirm(`Se encontraron ${Object.keys(found).length} hojas.\n\nAceptar = ACTUALIZAR: reemplaza la información de las áreas que vienen en el archivo (ideal para consolidar lo que envía cada dirección).\nCancelar = AGREGAR: suma los registros a los existentes.`);
    // Configuración opcional (solo administrador)
    const cfgName = admin && wb.SheetNames.find(n => norm(n).startsWith('configuracion'));
    if (cfgName) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[cfgName], { header: 1, defval: '' });
      const areas = rows.filter(r => norm(r[0]) === 'area').map(r => String(r[1]).trim()).filter(Boolean);
      const objs = rows.filter(r => norm(r[0]) === 'objetivo estrategico').map(r => String(r[1]).trim()).filter(Boolean);
      areas.forEach(a => { if (!S().areas.includes(a)) S().areas.push(a); });
      objs.forEach(o => { if (!S().objetivos.includes(o)) S().objetivos.push(o); });
      rows.forEach(r => { const k = norm(r[0]), n = toNum(r[1]); if (k === 'umbral verde' && n != null) S().umbrales.verde = n; if (k === 'umbral amarillo' && n != null) S().umbrales.amarillo = n; if (k === 'empresa' && r[1]) S().empresa = String(r[1]); });
    }
    let total = 0, incompletas = 0, omitidas = 0; const parsed = {}, areasArchivo = new Set();
    SHEETS.forEach(sh => {
      const n = found[sh.key]; if (!n) return;
      const json = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '', raw: true });
      const colOf = h => sh.cols.find(c => norm(c.l) === norm(h) || norm(c.k) === norm(h));
      let rows = json.map(obj => { const r = { id: uid() }; Object.entries(obj).forEach(([h, v]) => { const c = colOf(h); if (c && c.t !== 'calc') r[c.k] = cleanVal(c, v); }); return r; })
        .filter(r => sh.cols.some(c => !['area', 'calc'].includes(c.t) && r[c.k] !== '' && r[c.k] != null));
      rows.forEach(r => {
        const configurado = Calc.camposPeriodoAnalisis(sh.key);
        if (!r.anio || !CONFIG.LISTAS.tipoPer.includes(r.tipoPer) || (r.tipoPer === 'Trimestral' && !CONFIG.LISTAS.trimestre.includes(r.trimPer))) {
          Object.assign(r, configurado);
        }
        if (r.tipoPer === 'Anual') r.trimPer = '';
      });
      rows.forEach(r => { r.area = r.area || UI.area; const m = S().areas.find(a => norm(a) === norm(r.area)); if (m) r.area = m; });
      rows = rows.filter(r => { const ok = admin || Auth.canArea(r.area); if (!ok) omitidas++; return ok; });
      rows.forEach(r => {
        if (!S().areas.includes(r.area)) S().areas.push(r.area);
        areasArchivo.add(r.area);
        if (sh.key === 'cierre') { const auto = Calc.semaforoAuto(Calc.cumplimiento(r)); if (!r.semaforo || r.semaforo === auto) r.semaforo = 'Automático'; }
        if (Object.keys(validateRow(sh, r)).length) incompletas++;
      });
      if (sh.key === 'reflexion') { const m = {}; rows.forEach(r => m[r.area] = r); rows = Object.values(m); }
      parsed[sh.key] = rows; total += rows.length;
    });
    Object.entries(parsed).forEach(([key, rows]) => {
      if (reemplazar) S().data[key] = S().data[key].filter(r => !areasArchivo.has(r.area)).concat(rows);
      else if (key === 'reflexion') { const as = new Set(rows.map(r => r.area)); S().data.reflexion = S().data.reflexion.filter(x => !as.has(x.area)).concat(rows); }
      else S().data[key].push(...rows);
    });
    Auth.log('Importación de Excel', `${total} registros · ${[...areasArchivo].join(', ')}${omitidas ? ` · ${omitidas} omitidos sin permiso` : ''}`);
    if (omitidas) toast(`${omitidas} registros se omitieron porque pertenecen a áreas sin permiso.`, 'error');
    if (admin) S().sample = false; if (!Auth.areas().includes(UI.area)) UI.area = Auth.areas()[0];
    Store.save(); renderAll();
    toast(`Importación completa: ${total} registros${incompletas ? ` (${incompletas} con campos por completar)` : ''}.`, 'ok');
  } catch (e) { console.error(e); toast('Error al importar: ' + e.message, 'error'); }
}
