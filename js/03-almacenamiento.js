'use strict';

/* =======================================================================
   MÓDULO 3 · ALMACENAMIENTO
   localStorage + unidades de negocio + indicador de guardado
   ======================================================================= */

const Store = {
  state: null,

  /* Copia limpia de las unidades iniciales */
  unidadesIniciales() {
    return (CONFIG.UNIDADES_NEGOCIO || []).map(unidad => ({
      id: unidad.id,
      nombre: unidad.nombre,
      areas: (unidad.areas || []).map(area => ({
        id: area.id,
        nombre: area.nombre
      }))
    }));
  },

  empty() {
    return {
      version: 2,
      sample: false,

      empresa: CONFIG.EMPRESA,

      /* ===============================================================
         ESTRUCTURA LEGACY
         Se conserva temporalmente para no romper la plataforma actual.
         =============================================================== */
      areas: [...CONFIG.AREAS],

      /* ===============================================================
         NUEVA ESTRUCTURA
         Unidad de negocio → Áreas
         =============================================================== */
      unidadesNegocio: this.unidadesIniciales(),

      umbrales: {
        ...CONFIG.UMBRALES
      },

      objetivos: [
        ...CONFIG.OBJETIVOS_ESTRATEGICOS
      ],

      data: Object.fromEntries(
        SHEETS.map(sheet => [sheet.key, []])
      )
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);

      if (raw) {
        const guardado = JSON.parse(raw);
        const base = this.empty();

        this.state = {
          ...base,
          ...guardado,

          umbrales: {
            ...base.umbrales,
            ...(guardado.umbrales || {})
          },

          data: {
            ...base.data,
            ...(guardado.data || {})
          },

          /*
           * Compatibilidad:
           * si el almacenamiento anterior todavía no tenía unidades,
           * se crean desde CONFIG.UNIDADES_NEGOCIO.
           */
          unidadesNegocio:
            Array.isArray(guardado.unidadesNegocio)
              ? guardado.unidadesNegocio
              : base.unidadesNegocio
        };

        return true;
      }
    } catch (error) {
      console.warn(
        'No se pudo leer el almacenamiento local',
        error
      );
    }

    return false;
  },

  _write: debounce(() => {
    try {
      localStorage.setItem(
        CONFIG.STORAGE_KEY,
        JSON.stringify(Store.state)
      );

      setSaveStatus('ok');
    } catch (error) {
      console.error(error);

      setSaveStatus('error');

      toast(
        'No se pudo guardar en el navegador. Exporta a Excel para respaldar.',
        'error'
      );
    }
  }, 400),

  save() {
    setSaveStatus('saving');
    this._write();
  }
};

const S = () => Store.state;

function setSaveStatus(status) {
  const elemento = $('#saveStatus');

  if (!elemento) return;

  elemento.className =
    'save-status ' +
    (status === 'ok' ? '' : status);

  const hora = new Date().toLocaleTimeString(
    'es-MX',
    {
      hour: '2-digit',
      minute: '2-digit'
    }
  );

  $('.txt', elemento).textContent =
    status === 'saving'
      ? 'Guardando…'
      : status === 'error'
        ? 'Error al guardar'
        : `Guardado · ${hora}`;
}