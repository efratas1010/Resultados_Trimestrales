'use strict';

/* =======================================================================
   MÓDULO 13 · CONFIGURACIÓN
   Empresa · Unidades de negocio · Áreas · Semáforo · Objetivos · Datos
   ======================================================================= */

function renderConfig() {
  const st = S();

  if (!Array.isArray(st.unidadesNegocio)) {
    st.unidadesNegocio = [];
  }

  const contarRegistrosLegacy = area => {
    return SHEETS.reduce(
      (total, hoja) =>
        total +
        st.data[hoja.key].filter(
          registro => registro.area === area
        ).length,
      0
    );
  };

  const unidadHTML = unidad => {
    const areas = Array.isArray(unidad.areas)
      ? unidad.areas
      : [];

    return `
      <div class="card und-card">

        <div
          style="
            display:flex;
            justify-content:space-between;
            gap:14px;
            align-items:center;
            margin-bottom:16px;
          "
        >
          <div style="flex:1">
            <span
              class="small muted"
              style="
                text-transform:uppercase;
                letter-spacing:.08em;
                font-weight:700;
              "
            >
              Unidad de negocio
            </span>

            <input
              class="input"
              style="
                margin-top:5px;
                font-size:1.08rem;
                font-weight:700;
              "
              data-change="unidadRename"
              data-id="${esc(unidad.id)}"
              value="${esc(unidad.nombre)}"
              aria-label="Nombre de la unidad ${esc(unidad.nombre)}"
            >
          </div>

          <div style="text-align:right">
            <span class="pill azul">
              <i></i>
              ${areas.length}
              ${areas.length === 1 ? 'área' : 'áreas'}
            </span>

            <button
              type="button"
              class="icon-btn del"
              data-action="delUnidad"
              data-id="${esc(unidad.id)}"
              aria-label="Eliminar unidad ${esc(unidad.nombre)}"
              title="Eliminar unidad"
            >
              ${icon('trash', 16)}
            </button>
          </div>
        </div>

        <div
          style="
            border-top:1px solid var(--border);
            padding-top:14px;
          "
        >
          <div
            class="small muted"
            style="margin-bottom:8px"
          >
            Áreas de ${esc(unidad.nombre)}
          </div>

          ${
            areas.length
              ? `
                <div
                  style="
                    display:flex;
                    flex-direction:column;
                    gap:8px;
                  "
                >
                  ${areas
                    .map(
                      area => `
                        <div
                          style="
                            display:flex;
                            align-items:center;
                            gap:8px;
                          "
                        >
                          <input
                            class="input"
                            data-change="unidadAreaRename"
                            data-unidad="${esc(unidad.id)}"
                            data-area="${esc(area.id)}"
                            value="${esc(area.nombre)}"
                            aria-label="Nombre del área ${esc(area.nombre)}"
                          >

                          <button
                            type="button"
                            class="icon-btn del"
                            data-action="delUnidadArea"
                            data-unidad="${esc(unidad.id)}"
                            data-area="${esc(area.id)}"
                            aria-label="Eliminar área ${esc(area.nombre)}"
                            title="Eliminar área"
                          >
                            ${icon('trash', 16)}
                          </button>
                        </div>
                      `
                    )
                    .join('')}
                </div>
              `
              : `
                <div
                  class="empty-sm"
                  style="
                    border:1px dashed var(--border);
                    border-radius:12px;
                  "
                >
                  Esta unidad todavía no tiene áreas.
                </div>
              `
          }

          <form
            data-form="addUnidadArea"
            data-unidad="${esc(unidad.id)}"
            style="
              display:flex;
              gap:8px;
              margin-top:12px;
            "
          >
            <input
              class="input"
              name="nueva"
              placeholder="Nueva área…"
              aria-label="Nueva área para ${esc(unidad.nombre)}"
              autocomplete="off"
            >

            <button
              class="btn"
              type="submit"
            >
              ${icon('plus', 16)}
              Agregar área
            </button>
          </form>
        </div>

      </div>
    `;
  };

  /* Registros anteriores todavía sin Unidad de negocio / Área ID */
  const legacyRows = SHEETS.flatMap(hoja =>
    (st.data[hoja.key] || [])
      .filter(registro => !registro.unidadNegocioId || !registro.areaId)
      .map(registro => ({ hoja: hoja.key, area: registro.area || '', registro }))
  );
  const legacyAreas = [...new Set(legacyRows.map(x => x.area).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
  const pendientesPorHoja = SHEETS.map(hoja => ({
    nombre: hoja.corto || hoja.nombre,
    n: legacyRows.filter(x => x.hoja === hoja.key).length
  })).filter(x => x.n);

  const migracionHTML = legacyRows.length ? `
    <div class="card" id="migrationCard">
      <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px">
        <div><h3>Migración de información existente</h3><p class="small muted" style="margin:4px 0 0;max-width:760px">Asigna cada área anterior a su Unidad de negocio y Área destino. Solo se muestran registros que todavía no tienen los identificadores nuevos.</p></div>
        <span class="pill amarillo"><i></i>${legacyRows.length} registros pendientes</span>
      </div>
      <div class="chips" style="margin-bottom:14px">${pendientesPorHoja.map(x => `<span class="tag">${esc(x.nombre)} · ${x.n}</span>`).join('')}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="static">Área actual</th><th class="static num">Pendientes</th><th class="static">Unidad destino</th><th class="static">Área destino</th><th class="static">Acción</th></tr></thead><tbody>
        ${legacyAreas.map((area, i) => `<tr><td><b>${esc(area)}</b></td><td class="num">${legacyRows.filter(x => x.area === area).length}</td><td><select class="input" id="migUnidad_${i}" data-change="migrationUnidad" data-row="${i}"><option value="">Selecciona unidad…</option>${st.unidadesNegocio.map(unidad => `<option value="${esc(unidad.id)}">${esc(unidad.nombre)}</option>`).join('')}</select></td><td><select class="input" id="migArea_${i}" disabled><option value="">Primero selecciona unidad</option></select></td><td><button type="button" class="btn sm primary" data-action="migrateLegacyArea" data-row="${i}" data-legacy-area="${esc(area)}">Aplicar migración</button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="banner" style="margin:14px 0 0">${icon('info', 16)}<span><b>No se eliminan ni duplican registros.</b> La migración únicamente agrega los identificadores de Unidad de negocio y Área destino.</span></div>
    </div>` : `<div class="card"><h3>Migración de información existente</h3><div class="empty-sm">${icon('check', 18)} No hay registros pendientes de migración.</div></div>`;

  $('#view-config').innerHTML = `
    <div class="grid fade-in">

      <!-- ===============================================================
           EMPRESA + SEMÁFORO
           =============================================================== -->

      <div
        class="grid"
        style="
          grid-template-columns:
            repeat(auto-fit,minmax(340px,1fr));
        "
      >

        <div class="card">
          <h3>Empresa</h3>

          <p class="small muted">
            Aparece en portadas, encabezados e impresión.
          </p>

          <div class="field">
            <label for="cfgEmp">
              Nombre
            </label>

            <input
              id="cfgEmp"
              class="input"
              data-change="empresa"
              value="${esc(st.empresa || '')}"
            >
          </div>
        </div>

        <div class="card">
          <h3>Umbrales del semáforo</h3>

          <p class="small muted">
            Se aplican al % de cumplimiento del cierre.
          </p>

          <div
            class="grid"
            style="grid-template-columns:1fr 1fr"
          >

            <div class="field">
              <label for="uV">
                ${semPill('Verde')} desde (%)
              </label>

              <input
                id="uV"
                class="input"
                type="number"
                step="0.1"
                data-change="umbral"
                data-k="verde"
                value="${st.umbrales.verde}"
              >
            </div>

            <div class="field">
              <label for="uA">
                ${semPill('Amarillo')} desde (%)
              </label>

              <input
                id="uA"
                class="input"
                type="number"
                step="0.1"
                data-change="umbral"
                data-k="amarillo"
                value="${st.umbrales.amarillo}"
              >
            </div>

          </div>

          <p class="hint">
            Por debajo del umbral amarillo el indicador
            queda en ${semPill('Rojo')}
          </p>
        </div>

      </div>


      <!-- ===============================================================
           UNIDADES DE NEGOCIO
           =============================================================== -->

      <div class="card">
        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:16px;
            flex-wrap:wrap;
            margin-bottom:18px;
          "
        >
          <div>
            <h3>Unidades de negocio</h3>

            <p
              class="small muted"
              style="
                margin:4px 0 0;
                max-width:720px;
              "
            >
              Define primero la unidad de negocio y después
              sus áreas. Una misma área puede existir en
              diferentes unidades sin conflicto.
            </p>
          </div>

          <span class="pill azul">
            <i></i>
            ${st.unidadesNegocio.length}
            ${
              st.unidadesNegocio.length === 1
                ? 'unidad'
                : 'unidades'
            }
          </span>
        </div>

        <div
          class="grid"
          style="
            grid-template-columns:
              repeat(auto-fit,minmax(340px,1fr));
          "
        >
          ${
            st.unidadesNegocio.length
              ? st.unidadesNegocio
                  .map(unidadHTML)
                  .join('')
              : `
                <div class="empty-sm">
                  Aún no existen unidades de negocio.
                </div>
              `
          }
        </div>

        <form
          data-form="addUnidad"
          style="
            display:flex;
            gap:8px;
            margin-top:16px;
            padding-top:16px;
            border-top:1px solid var(--border);
          "
        >
          <input
            class="input"
            name="nueva"
            placeholder="Nueva unidad de negocio…"
            aria-label="Nueva unidad de negocio"
            autocomplete="off"
          >

          <button
            class="btn primary"
            type="submit"
          >
            ${icon('plus', 16)}
            Agregar unidad
          </button>
        </form>

        <div
          class="banner"
          style="margin:18px 0 0"
        >
          ${icon('info', 16)}

          <span>
            <b>Etapa de configuración.</b>
            Estas unidades todavía no cambian tus registros
            existentes, Dashboard, Edición o Presentación.
            Primero estamos construyendo la estructura.
          </span>
        </div>
      </div>


      <!-- ===============================================================
           ÁREAS ACTUALES / COMPATIBILIDAD
           =============================================================== -->

      <div class="card">
        <h3>Áreas actuales de la plataforma</h3>

        <p class="small muted">
          Esta lista se conserva temporalmente para mantener
          funcionando Edición, Dashboard, Presentación y los
          registros existentes.
        </p>

        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(auto-fit,minmax(220px,1fr));
            gap:8px;
          "
        >
          ${st.areas
            .map(
              area => `
                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:8px;
                    padding:10px 12px;
                    border:1px solid var(--border);
                    border-radius:10px;
                    background:var(--surface-2);
                  "
                >
                  <span>
                    ${esc(area)}
                  </span>

                  <span class="small muted">
                    ${contarRegistrosLegacy(area)} reg.
                  </span>
                </div>
              `
            )
            .join('')}
        </div>

        <p
          class="hint"
          style="margin-top:12px"
        >
          No edites esta lista durante esta etapa.
          Posteriormente migraremos cada área a su unidad
          correspondiente.
        </p>
      </div>


      ${migracionHTML}

      <!-- ===============================================================
           OBJETIVOS
           =============================================================== -->

      <div class="card">
        <h3>Objetivos estratégicos</h3>

        <p class="small muted">
          Lista para alinear los OKRs.
          Uno por línea.
        </p>

        <div class="field">
          <label for="cfgObj">
            Objetivos
          </label>

          <textarea
            id="cfgObj"
            class="input"
            rows="7"
            data-change="objetivos"
          >${esc(st.objetivos.join('\n'))}</textarea>
        </div>
      </div>


      <!-- ===============================================================
           DATOS
           =============================================================== -->

      <div class="card">
        <h3>Datos</h3>

        <p class="small muted">
          La información se guarda en este navegador.
          Exporta a Excel para respaldarla o compartirla.
        </p>

        <div
          style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
          "
        >
          <button
            type="button"
            class="btn"
            data-action="loadSample"
          >
            ${icon('layers', 16)}
            Cargar datos de ejemplo
          </button>

          <button
            type="button"
            class="btn danger"
            data-action="clearAll"
          >
            ${icon('trash', 16)}
            Borrar toda la información
          </button>
        </div>
      </div>


      <div class="card">
        <h3>Arquitectura</h3>

        <p
          class="small muted"
          style="margin:0"
        >
          Nueva jerarquía:
          <b>
            Unidad de negocio → Área → Año →
            Periodo → Información
          </b>.
          Las columnas y listas continúan configurándose
          desde <b>js/01-config.js</b>.
        </p>
      </div>

    </div>
  `;
}