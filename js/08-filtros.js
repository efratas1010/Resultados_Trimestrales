'use strict';

/* =======================================================================
   MÃ“DULO 8 Â· FILTROS
   Unidad de negocio â†’ Ãrea + filtros combinables
   ======================================================================= */

function unidadFiltroActual() {
  return (S().unidadesNegocio || []).find(
    unidad => unidad.id === UI.filters.unidadId
  ) || null;
}

function areasDeUnidadFiltrada() {
  const unidad = unidadFiltroActual();

  if (!unidad) return [];

  return unidad.areas || [];
}

const F = {

  unidad(r) {
    return (
      !UI.filters.unidadId ||
      r.unidadNegocioId === UI.filters.unidadId
    );
  },

  a(r) {
    return (
      this.unidad(r) &&
      (
        !UI.filters.areaId ||
        r.areaId === UI.filters.areaId
      )
    );
  },

  resp(r) {
    return (
      !UI.filters.responsable ||
      r.responsable === UI.filters.responsable
    );
  },

  cierre() {
    const f = UI.filters;

    return S().data.cierre.filter(r =>
      this.a(r) &&
      (
        !f.semaforo ||
        Calc.semaforo(r) === f.semaforo
      )
    );
  },

  qqc() {
    const f = UI.filters;

    return S().data.qqc.filter(r =>
      this.a(r) &&
      this.resp(r) &&
      (
        !f.semaforo ||
        r.semaforo === f.semaforo
      ) &&
      (
        !f.estatus ||
        r.estatus === f.estatus
      ) &&
      (
        !f.trimestre ||
        trimestreDe(r.fecha) === f.trimestre
      )
    );
  },

  kpis() {
    return S().data.kpis.filter(r =>
      this.a(r) &&
      this.resp(r)
    );
  },

  reflexion() {
    return S().data.reflexion.filter(r =>
      this.a(r)
    );
  },

  okrs() {
    return S().data.okrs.filter(r =>
      this.a(r) &&
      this.resp(r)
    );
  },

  get(key) {
    return this[key]();
  }
};


/* =======================================================================
   ÃREAS DISPONIBLES EN DASHBOARD Y PRESENTACIÃ“N
   ======================================================================= */

const areasFiltradas = () => {
  const unidad = unidadFiltroActual();

  if (!unidad) return [];

  if (UI.filters.areaId) {
    const area = (unidad.areas || []).find(
      a => a.id === UI.filters.areaId
    );

    return area
      ? [area.nombre]
      : [];
  }

  return (unidad.areas || []).map(
    area => area.nombre
  );
};


/* =======================================================================
   CONTADOR DE FILTROS ACTIVOS
   ======================================================================= */

const activeFilters = () =>
  Object.values(UI.filters)
    .filter(Boolean)
    .length;