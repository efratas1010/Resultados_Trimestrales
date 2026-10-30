'use strict';
/* =======================================================================
   MÓDULO 4 · CÁLCULOS
   ======================================================================= */
const Calc = {
  cumplimiento(r) {
    const m = toNum(r.meta), x = toNum(r.real);
    if (m == null || x == null) return null;
    if ((r.sentido || 'Mayor es mejor') === 'Menor es mejor') { if (x <= 0) return m >= 0 ? 150 : 0; return (m / x) * 100; }
    if (m === 0) return x >= 0 ? 100 : 0;
    return (x / m) * 100;
  },
  semaforoAuto(p) { if (p == null) return ''; const u = S().umbrales; return p >= u.verde ? 'Verde' : p >= u.amarillo ? 'Amarillo' : 'Rojo'; },
  semaforo(r) { return r.semaforo && r.semaforo !== 'Automático' ? r.semaforo : this.semaforoAuto(this.cumplimiento(r)); },
  variacion(r) { const b = toNum(r.base), m = toNum(r.meta); if (b == null || m == null || b === 0) return null; return (m - b) / Math.abs(b) * 100; },
  vencida(r) { return !!r.fecha && !CONFIG.ESTATUS_EXCLUIDOS_VENCIDA.includes(r.estatus) && r.fecha < hoyISO(); },
  avgCumpl(rows) { return avg(rows.map(r => this.cumplimiento(r)).filter(v => v != null).map(v => Math.min(v, 150))); },
  rows(
  key,
  area = UI.area,
  unidadId = UI.unidadId,
  areaId = UI.areaId
) {
  return S().data[key].filter(registro => {
    /*
     * Nueva estructura:
     * Unidad de negocio + Área
     */
    if (unidadId && areaId) {
      return (
        registro.unidadNegocioId === unidadId &&
        registro.areaId === areaId
      );
    }

    /*
     * Compatibilidad temporal con registros anteriores,
     * que todavía solo tienen el nombre del área.
     */
    return registro.area === area;
  });
},
  /* Avance por hoja (0 a 1) para una área */
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
    if (key === 'reflexion') { const r = rows[0]; if (!r) return 0; const f = ['logros', 'aprendizajes', 'obstaculos', 'distinto', 'apoyos']; return f.filter(k => String(r[k] || '').trim()).length / f.length; }
    if (key === 'qqc') { if (rows.length) return 1; const c = this.rows(
  'cierre',
  area,
  unidadId,
  areaId
); return c.length && !c.some(r => ['Rojo', 'Amarillo'].includes(this.semaforo(r))) ? 1 : 0; }
    if (key === 'okrs') { if (!rows.length) return 0; const g = groupBy(rows, 'objetivo'); return Object.values(g).some(a => a.length >= 2) ? 1 : .5; }
    return rows.length ? 1 : 0;
  },
 avanceArea(
  area,
  unidadId = UI.unidadId,
  areaId = UI.areaId
) {
  return SHEETS.reduce(
    (total, hoja) =>
      total +
      this.avanceHoja(
        area,
        hoja.key,
        unidadId,
        areaId
      ),
    0
  ) / SHEETS.length * 100;
}
};
function groupBy(rows, k) { return rows.reduce((g, r) => { const key = String(r[k] || '(Sin objetivo)').trim(); (g[key] ||= []).push(r); return g; }, {}); }
