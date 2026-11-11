'use strict';
/* =======================================================================
   M\u00D3DULO 4 \u00B7 C\u00C1LCULOS
   ======================================================================= */
const Calc = {
  periodoAnalisis(seccion = 'cierre') {
    const clave = SHEET(seccion) ? seccion : 'cierre';
    const base = CONFIG.PERIODOS_ANALISIS?.[clave] || CONFIG.PERIODO_ANALISIS || {};
    const legacy = S().periodoAnalisis || {};
    const actual = S().periodosAnalisis?.[clave] || legacy;
    const tipoPer = actual.tipoPer === 'Trimestral' ? 'Trimestral' : 'Anual';
    return {
      anio: String(actual.anio || legacy.anio || base.anio || ''),
      tipoPer,
      trimPer: tipoPer === 'Trimestral' ? String(actual.trimPer || '') : '',
      etiqueta: String(actual.etiqueta || '').trim()
    };
  },
  camposPeriodoAnalisis(seccion = 'cierre') {
    const p = this.periodoAnalisis(seccion);
    return { anio: p.anio, tipoPer: p.tipoPer, trimPer: p.trimPer };
  },
  coincidePeriodoAnalisis(r, seccion = 'cierre') {
    const p = this.periodoAnalisis(seccion);
    return String(r.anio || '') === p.anio &&
      String(r.tipoPer || '') === p.tipoPer &&
      String(r.trimPer || '') === p.trimPer;
  },
  textoPeriodoAnalisis(seccion = 'cierre', incluirEtiqueta = true) {
    const p = this.periodoAnalisis(seccion);
    const estructurado = p.tipoPer === 'Trimestral'
      ? `${p.trimPer || 'Trimestre sin definir'} ${p.anio}`.trim()
      : `Anual ${p.anio}`.trim();
    return incluirEtiqueta && p.etiqueta ? `${estructurado} \u00B7 ${p.etiqueta}` : estructurado;
  },
  tituloPeriodoAnalisis(titulo, seccion = 'cierre') {
    return `${titulo} \u00B7 ${this.textoPeriodoAnalisis(seccion, true)}`;
  },
  resumenPeriodosAnalisis() {
    return SHEETS.map(sh => `${sh.corto}: ${this.textoPeriodoAnalisis(sh.key, true)}`).join(' \u00B7 ');
  },
  cumplimiento(r) {
    const m = toNum(r.meta), x = toNum(r.real);
    if (m == null || x == null) return null;
    if ((r.sentido || 'Mayor es mejor') === 'Menor es mejor') { if (x <= 0) return m >= 0 ? 150 : 0; return (m / x) * 100; }
    if (m === 0) return x >= 0 ? 100 : 0;
    return (x / m) * 100;
  },
  semaforoAuto(p) { if (p == null) return ''; const u = S().umbrales; return p >= u.verde ? 'Verde' : p >= u.amarillo ? 'Amarillo' : 'Rojo'; },
  semaforo(r) { return this.semaforoAuto(this.cumplimiento(r)); },
  variacion(r) { const b = toNum(r.base), m = toNum(r.meta); if (b == null || m == null || b === 0) return null; return (m - b) / Math.abs(b) * 100; },
  variacionCierre(r) {
    const meta = toNum(r.meta), real = toNum(r.real);
    if (meta == null || real == null) return null;
    const unidad = norm(r.unidad || '');
    const enPuntos = ['%', 'pts', 'pt', 'puntos'].includes(unidad);
    if (!enPuntos && meta === 0) return null;
    return enPuntos ? real - meta : (real - meta) / Math.abs(meta) * 100;
  },
  formatearVariacionCierre(r) {
    const valor = this.variacionCierre(r);
    if (valor == null) return '\u2014';
    const signo = valor > 0 ? '+' : valor < 0 ? '\u2212' : '';
    const sufijo = ['%', 'pts', 'pt', 'puntos'].includes(norm(r.unidad || '')) ? ' pts' : '%';
    return signo + nf.format(Math.abs(Math.round(valor * 10) / 10)) + sufijo;
  },
  variacionCierreFavorable(r) {
    const meta = toNum(r.meta), real = toNum(r.real);
    if (meta == null || real == null) return null;
    return (r.sentido || 'Mayor es mejor') === 'Menor es mejor' ? real <= meta : real >= meta;
  },
  puntoMedioBandaAmarilla() {
    const u = S().umbrales;
    return (Number(u.amarillo) + Number(u.verde)) / 2;
  },
  infoSemaforo(r) {
    const cumplimiento = this.cumplimiento(r);
    const automatico = this.semaforoAuto(cumplimiento);
    const manual = false; // No aplicar colores manuales guardados.
    const vigente = this.semaforo(r);
    return { cumplimiento, automatico, vigente, manual, discrepancia: manual && automatico && automatico !== vigente };
  },
  esPrioritarioQQC(r) {
    const info = this.infoSemaforo(r);
    if (info.vigente === 'Rojo') return true;
    if (info.vigente !== 'Amarillo' || info.cumplimiento == null) return false;
    const u = S().umbrales, medio = this.puntoMedioBandaAmarilla();
    return info.cumplimiento >= Number(u.amarillo) && info.cumplimiento < medio;
  },
  mismoPeriodo(a, b) {
    return String(a.anio || '') === String(b.anio || '') &&
      String(a.tipoPer || '') === String(b.tipoPer || '') &&
      String(a.trimPer || '') === String(b.trimPer || '');
  },
  qqcRows(area = null, unidadId = '', areaId = '') {
    const coincideContexto = r => {
      if (!this.coincidePeriodoAnalisis(r, 'qqc')) return false;
      if (unidadId && r.unidadNegocioId !== unidadId) return false;
      if (areaId && r.areaId !== areaId) return false;
      if (!unidadId && !areaId && area && r.area !== area) return false;
      return true;
    };
    const acciones = (S().data.qqc || []).filter(coincideContexto);
    const usadas = new Set();
    return (S().data.cierre || [])
      .filter(r => {
        if (!this.coincidePeriodoAnalisis(r, 'cierre')) return false;
        if (unidadId && r.unidadNegocioId !== unidadId) return false;
        if (areaId && r.areaId !== areaId) return false;
        if (!unidadId && !areaId && area && r.area !== area) return false;
        return true;
      })
      .filter(cierre => this.esPrioritarioQQC(cierre))
      .map(cierre => {
        const infoSemaforo = this.infoSemaforo(cierre);
        let accion = acciones.find(q => q.cierreId && q.cierreId === cierre.id);
        if (!accion) {
          accion = acciones.find(q => !usadas.has(q.id) && !q.cierreId &&
            (q.areaId ? q.areaId === cierre.areaId : q.area === cierre.area) &&
            this.mismoPeriodo(q, cierre) && norm(q.indicador || '') === norm(cierre.indicador || ''));
        }
        if (accion) usadas.add(accion.id);
        const variacionCierre = this.variacionCierre(cierre);
        return {
          ...(accion || {}),
          id: accion?.id || `qqc:${cierre.id}`,
          cierreId: cierre.id,
          unidadNegocioId: cierre.unidadNegocioId,
          unidadNegocio: cierre.unidadNegocio,
          areaId: cierre.areaId,
          area: cierre.area,
          anio: cierre.anio,
          tipoPer: cierre.tipoPer,
          trimPer: cierre.trimPer,
          semaforo: infoSemaforo.vigente,
          semaforoAuto: infoSemaforo.automatico,
          semaforoManual: infoSemaforo.manual,
          discrepanciaSemaforo: infoSemaforo.discrepancia,
          indicador: cierre.indicador,
          unidad: cierre.unidad,
          sentido: cierre.sentido,
          meta: cierre.meta,
          real: cierre.real,
          variacionCierre,
          cumplimiento: this.cumplimiento(cierre),
          cuando: accion?.cuando || accion?.fecha || '',
          resultado: accion?.resultado || '',
          observaciones: accion?.observaciones || '',
          _virtual: !accion,
          _cierre: cierre
        };
      });
  },
  vencida(r) { return !!r.fecha && !CONFIG.ESTATUS_EXCLUIDOS_VENCIDA.includes(r.estatus) && r.fecha < hoyISO(); },
  avgCumpl(rows) { return avg(rows.map(r => this.cumplimiento(r)).filter(v => v != null).map(v => Math.min(v, 150))); },
  rows(
  key,
  area = UI.area,
  unidadId = UI.unidadId,
  areaId = UI.areaId,
  seccionPeriodo = key
) {
  if (key === 'qqc') return this.qqcRows(area, unidadId, areaId);
  return S().data[key].filter(registro => {
    if (!this.coincidePeriodoAnalisis(registro, seccionPeriodo)) return false;
    /*
     * Nueva estructura:
     * Unidad de negocio + \u00C1rea
     */
    if (unidadId && areaId) {
      return (
        registro.unidadNegocioId === unidadId &&
        registro.areaId === areaId
      );
    }

    /*
     * Compatibilidad temporal con registros anteriores,
     * que todav\u00EDa solo tienen el nombre del \u00E1rea.
     */
    return registro.area === area;
  });
},
  /* Avance por hoja (0 a 1) para una \u00E1rea */
 avanceHoja(
  area,
  key,
  unidadId = UI.unidadId,
  areaId = UI.areaId
) {

const rows = this.rows(
  key,
  area,
  unidadId,
  areaId
);
    if (key === 'reflexionPersonal') {
      const r = rows[0];
      if (!r) return 0;
      const campos = RP_SECCION_PERSONAL.cols.filter(c => c.t !== 'area').map(c => c.k);
      return campos.length ? campos.filter(k => String(r[k] ?? '').trim()).length / campos.length : 0;
    }
    if (key === 'reflexion') { const r = rows[0]; if (!r) return 0; const f = ['logros', 'aprendizajes', 'obstaculos', 'distinto', 'apoyos']; return f.filter(k => String(r[k] || '').trim()).length / f.length; }
    if (key === 'qqc') {
      if (!rows.length) return 1;
      const campos = ['responsable', 'accion', 'cuando', 'resultado', 'estatus'];
      return rows.filter(r => campos.every(k => String(r[k] || '').trim())).length / rows.length;
    }
    if (key === 'okrs') { if (!rows.length) return 0; const g = groupBy(rows, 'objetivo'); return Object.values(g).some(a => a.length >= 2) ? 1 : .5; }
    return rows.length ? 1 : 0;
  },
 avanceArea(
  area,
  unidadId = UI.unidadId,
  areaId = UI.areaId
) {
  const hojas = [...SHEETS, RP_SECCION_PERSONAL];
  return hojas.reduce(
    (total, hoja) =>
      total +
      this.avanceHoja(
        area,
        hoja.key,
        unidadId,
        areaId
      ),
    0
  ) / hojas.length * 100;
}
};
function groupBy(rows, k) { return rows.reduce((g, r) => { const key = String(r[k] || '(Sin objetivo)').trim(); (g[key] ||= []).push(r); return g; }, {}); }
