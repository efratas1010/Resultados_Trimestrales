'use strict';

/* =======================================================================
   M\u00D3DULO 10 \u00B7 MODO PRESENTACI\u00D3N
   Teclas:
   \u2190 \u2192  Cambiar secci\u00F3n
   \u2191 \u2193  Cambiar \u00E1rea
   Inicio / Fin
   Esc  Salir
   ======================================================================= */

/* =======================================================================
   1. DIAPOSITIVA EJECUTIVA DE CIERRE
   ======================================================================= */

function cierreSlideHTML(area) {
  const rows = F.get('cierre').filter(r => r.area === area);

  const periodo = Calc.textoPeriodoAnalisis('cierre', true);

  const claseDensidad =
    rows.length > 12
      ? 'cx-maxima'
      : rows.length > 8
        ? 'cx-densa'
        : rows.length > 5
          ? 'cx-compacta'
          : 'cx-normal';

  /*
     Los estilos quedan encapsulados en este modulo para que el ajuste sea
     autocontenido y no obligue a sustituir archivos CSS de la plataforma.
     El tamano de filas, fuentes y espacios se calcula con la cantidad de
     indicadores y con el rectangulo real disponible, sin desplazamiento.
  */
  const estilosCierre = `
    <style>
      #slides .cx.cx-unificada {
        --cx-gap: 12px;
        --cx-fuente-tabla: 16px;
        --cx-fuente-comentario: 12px;
        --cx-fuente-meta: 11px;
        --cx-fuente-label: 10px;
        --cx-fuente-conteo: 13px;
        --cx-fuente-encabezado-tabla: 10px;
        --cx-fuente-unidad: 12px;
        --cx-fuente-pill: 11px;
        --cx-fuente-pie: 10px;
        --cx-tamano-punto: 6px;
        --cx-alto-encabezado-tabla: 28px;
        --cx-padding-cabecera: 6px;
        --cx-padding-banda-x: 14px;
        --cx-margen-label: 3px;
        --cx-padding-th-y: 4px;
        --cx-padding-pill-y: 2px;
        --cx-padding-pill-x: 7px;
        --cx-padding-pie: 6px;
        --cx-py: 6px;
        --cx-px: 9px;
        --cx-fuente-titulo: 30px;
        --cx-fuente-kpi: 30px;
        --cx-padding-banda-y: 10px;
        display: flex;
        flex-direction: column;
        gap: var(--cx-gap);
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        box-sizing: border-box;
      }

      #slides .cx.cx-unificada * {
        box-sizing: border-box;
      }

      #slides .cx.cx-unificada .cx-head {
        flex: 0 0 auto;
        align-items: center;
        padding-bottom: var(--cx-padding-cabecera);
      }

      #slides .cx.cx-unificada .cx-head h2 {
        font-size: var(--cx-fuente-titulo);
        line-height: 1.04;
      }

      #slides .cx.cx-unificada .cx-eyebrow,
      #slides .cx.cx-unificada .cx-meta {
        font-size: var(--cx-fuente-meta);
        line-height: 1.25;
      }

      #slides .cx.cx-unificada .cx-band {
        flex: 0 0 auto;
        grid-template-columns: 1.2fr 1fr 1fr 1fr;
      }

      #slides .cx.cx-unificada .cx-band .cx-kpi,
      #slides .cx.cx-unificada .cx-cell {
        padding: var(--cx-padding-banda-y) var(--cx-padding-banda-x);
      }

      #slides .cx.cx-unificada .cx-band .cx-kpi b {
        font-size: var(--cx-fuente-kpi);
      }

      #slides .cx.cx-unificada .cx-band .cx-kpi span,
      #slides .cx.cx-unificada .cx-cell span {
        font-size: var(--cx-fuente-label);
        margin-bottom: var(--cx-margen-label);
      }

      #slides .cx.cx-unificada .cx-cell b {
        font-size: var(--cx-fuente-conteo);
      }

      #slides .cx.cx-unificada .cx-tbl {
        flex: 1 1 auto;
        display: flex;
        width: 100%;
        min-width: 0;
        min-height: 0;
        overflow: visible;
      }

      #slides .cx.cx-unificada .cx-tbl table {
        width: 100%;
        height: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        font-size: var(--cx-fuente-tabla);
      }

      #slides .cx.cx-unificada .cx-tbl thead {
        height: var(--cx-alto-encabezado-tabla);
      }

      #slides .cx.cx-unificada .cx-tbl tbody tr {
        height: calc(100% / var(--cx-filas, 1));
      }

      #slides .cx.cx-unificada .cx-tbl th {
        padding: var(--cx-padding-th-y) var(--cx-px);
        font-size: var(--cx-fuente-encabezado-tabla);
        line-height: 1.05;
      }

      #slides .cx.cx-unificada .cx-tbl td {
        padding: var(--cx-py) var(--cx-px);
        line-height: 1.16;
        overflow-wrap: anywhere;
      }

      #slides .cx.cx-unificada .cx-tbl td small {
        display: block;
        margin-top: 1px;
        font-size: var(--cx-fuente-comentario);
        line-height: 1.12;
      }

      #slides .cx.cx-unificada .cx-tbl td em {
        font-size: var(--cx-fuente-unidad);
      }

      #slides .cx.cx-unificada .cx-tbl .pill {
        gap: 4px;
        padding: var(--cx-padding-pill-y) var(--cx-padding-pill-x);
        font-size: var(--cx-fuente-pill);
      }

      #slides .cx.cx-unificada .cx-tbl .pill i {
        width: var(--cx-tamano-punto);
        height: var(--cx-tamano-punto);
      }

      #slides .cx.cx-unificada .cx-foot {
        flex: 0 0 auto;
        padding-top: var(--cx-padding-pie);
        font-size: var(--cx-fuente-pie);
      }

      /*
         Las clases de densidad se conservan por compatibilidad, pero ya no
         fijan tama\u00F1os peque\u00F1os. Las m\u00E9tricas se calculan con el alto y ancho
         reales de la diapositiva y con la cantidad efectiva de filas.
      */
      #slides .cx.cx-unificada.cx-normal,
      #slides .cx.cx-unificada.cx-compacta,
      #slides .cx.cx-unificada.cx-densa,
      #slides .cx.cx-unificada.cx-maxima {
        min-height: 0;
      }

      @media (max-width: 900px) {
        #slides .cx.cx-unificada .cx-head {
          flex-direction: row;
          align-items: center;
        }

        #slides .cx.cx-unificada .cx-meta {
          text-align: right;
        }

        #slides .cx.cx-unificada .cx-band {
          grid-template-columns: 1.2fr 1fr 1fr 1fr;
        }

        #slides .cx.cx-unificada .cx-cell:nth-child(3) {
          border-left: 1px solid var(--border);
        }
      }
    </style>
  `;

  const encabezado = `
    <div class="cx-head">
      <div>
        <span class="cx-eyebrow">${esc(area)}</span>
        <h2>${esc(Calc.tituloPeriodoAnalisis('Cierre de resultados', 'cierre'))}</h2>
      </div>

      <div class="cx-meta">
        <b>Comit\u00E9 Directivo</b>
        <span>${esc(periodo)}</span>
        <span>${rows.length} indicador${rows.length === 1 ? '' : 'es'} \u00B7 vista consolidada</span>
      </div>
    </div>
  `;

  const pie = `
    <div class="cx-foot">
      <span>${esc(area)} \u2022 Documento de Trabajo Interno</span>
      <span>Fuente: Datos consolidados al cierre del periodo</span>
    </div>
  `;

  if (!rows.length) {
    return `
      ${estilosCierre}
      <div class="cx cx-unificada ${claseDensidad}" style="--cx-filas:${Math.max(1, rows.length)}">
        ${encabezado}
        ${emptyBlock('Sin indicadores de cierre con los filtros actuales.')}
        ${pie}
      </div>
    `;
  }

  const esPuntos = unidad => {
    return ['%', 'pts', 'pt', 'puntos'].includes(norm(unidad));
  };

  const formatearValor = (valor, unidad) => {
    const numero = toNum(valor);

    if (numero == null) return '\u2014';

    return nf.format(numero) + (norm(unidad) === '%' ? '%' : '');
  };

  const calcularVariacion = registro => {
    const meta = toNum(registro.meta);
    const real = toNum(registro.real);

    if (meta == null || real == null) return null;

    const diferencia = real - meta;
    const resultadoEnPuntos = esPuntos(registro.unidad);

    if (!resultadoEnPuntos && meta === 0) return null;

    const variacion = resultadoEnPuntos
      ? diferencia
      : diferencia / Math.abs(meta) * 100;

    const favorable =
      (registro.sentido || 'Mayor es mejor') === 'Menor es mejor'
        ? diferencia <= 0
        : diferencia >= 0;

    return {
      texto:
        (variacion > 0 ? '+' : variacion < 0 ? '\u2212' : '') +
        nf.format(Math.abs(Math.round(variacion * 10) / 10)) +
        (resultadoEnPuntos ? ' pts' : '%'),
      favorable
    };
  };

  const data = rows.map(registro => ({
    registro,
    cumplimiento: Calc.cumplimiento(registro),
    semaforo: Calc.semaforo(registro),
    variacion: calcularVariacion(registro)
  }));

  const contarSemaforo = color => {
    return data.filter(item => item.semaforo === color).length;
  };

  const textoIndicadores = cantidad => {
    return `${cantidad} indicador${cantidad === 1 ? '' : 'es'}`;
  };

  const cumplimientoPromedio = Calc.avgCumpl(rows);

  const banda = `
    <div class="cx-band">
      <div class="cx-kpi ${semClass(Calc.semaforoAuto(cumplimientoPromedio))}">
        <span>Cumplimiento promedio</span>
        <b>${fmtPct(cumplimientoPromedio)}</b>
      </div>

      <div class="cx-cell">
        <span>Verdes (en meta)</span>
        <b class="verde">
          <i></i>
          ${textoIndicadores(contarSemaforo('Verde'))}
        </b>
      </div>

      <div class="cx-cell">
        <span>Amarillos (en riesgo)</span>
        <b class="amarillo">
          <i></i>
          ${textoIndicadores(contarSemaforo('Amarillo'))}
        </b>
      </div>

      <div class="cx-cell">
        <span>Rojos (cr\u00EDticos)</span>
        <b class="rojo">
          <i></i>
          ${textoIndicadores(contarSemaforo('Rojo'))}
        </b>
      </div>
    </div>
  `;

  const tabla = `
    <div class="cx-tbl">
      <table>
        <colgroup>
          <col style="width:42%">
          <col style="width:10%">
          <col style="width:10%">
          <col style="width:12%">
          <col style="width:12%">
          <col style="width:14%">
        </colgroup>

        <thead>
          <tr>
            <th>Indicador</th>
            <th class="num">Meta</th>
            <th class="num">Real</th>
            <th class="num">Var %</th>
            <th class="num">Cumpl.</th>
            <th class="ctr">Sem\u00E1foro</th>
          </tr>
        </thead>

        <tbody>
          ${data.map(item => {
              const registro = item.registro;

              const claseVariacion = item.variacion
                ? item.variacion.favorable
                  ? 'v-ok'
                  : 'v-bad'
                : '';

              return `
                <tr>
                  <td>
                    <b>${esc(registro.indicador)}</b>

                    ${
                      registro.unidad
                        ? `<em>(${esc(registro.unidad)})</em>`
                        : ''
                    }

                    ${
                      registro.comentarios
                        ? `<small>${esc(registro.comentarios)}</small>`
                        : ''
                    }
                  </td>

                  <td class="num">
                    ${formatearValor(registro.meta, registro.unidad)}
                  </td>

                  <td class="num">
                    ${formatearValor(registro.real, registro.unidad)}
                  </td>

                  <td class="num ${claseVariacion}">
                    ${item.variacion ? item.variacion.texto : '\u2014'}
                  </td>

                  <td class="num">
                    <b>${fmtPct(item.cumplimiento)}</b>
                  </td>

                  <td class="ctr">
                    ${semPill(item.semaforo)}
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;

  return `
    ${estilosCierre}
    <div class="cx cx-unificada ${claseDensidad}" style="--cx-filas:${Math.max(1, rows.length)}">
      ${encabezado}
      ${banda}
      ${tabla}
      ${pie}
    </div>
  `;
}


/* =======================================================================
   2. PORTADA DE CADA \u00C1REA
   Cumplimiento + resultados + plan de acci\u00F3n + KPIs + OKRs
   ======================================================================= */

function areaSlideHTML(area) {
  const estadisticas = areaStats(area);

  const elementos = [
    [
      estadisticas.nInd,
      'Resultados',
      'Indicadores de cierre'
    ],
    [
      estadisticas.nAcc,
      'Plan de acci\u00F3n',
      'Acciones'
    ],
    [
      estadisticas.nKpi,
      'KPIs',
      'Indicadores del periodo'
    ],
    [
      estadisticas.nObj,
      'OKRs',
      'Objetivos'
    ]
  ];

  const claseSemaforo = semClass(
    Calc.semaforoAuto(estadisticas.cumpl)
  );

  return `
    <div class="ax">
      <div class="ax-head">
        <span class="ax-eyebrow">Direcci\u00F3n / \u00E1rea \u00B7 periodos independientes por secci\u00F3n</span>
        <h2 class="ax-name">${esc(area)}</h2>
      </div>

      <div class="ax-grid">
        <div class="ax-card ax-cumpl ${claseSemaforo}">
          <b>${fmtPct(estadisticas.cumpl)}</b>
          <span>Cumplimiento</span>
          <small>Promedio del cierre</small>
        </div>

        ${elementos
          .map(
            ([numero, titulo, descripcion], indice) => `
              <div
                class="ax-card"
                style="animation-delay:${(indice + 1) * 80}ms"
              >
                <b>${numero}</b>
                <span>${titulo}</span>
                <small>${descripcion}</small>
              </div>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}


/* =======================================================================
   3. COMPARATIVO DE CUMPLIMIENTO ENTRE \u00C1REAS
   Filtro propio de la presentaci\u00F3n
   ======================================================================= */

const perLbl = registro => {
  if (!registro.anio) return 'Sin periodo';

  if (registro.tipoPer === 'Trimestral') {
    return `${registro.trimPer || ''} ${registro.anio}`.trim();
  }

  return `Anual ${registro.anio}`;
};


function cmpSlideHTML() {
  return `
    <div class="cp">
      <div class="cp-top">
        <div>
          <span class="cx-eyebrow">Comparativo entre \u00E1reas</span>
          <h2>${esc(Calc.tituloPeriodoAnalisis('Cumplimiento \u00B7 Cierre de resultados', 'cierre'))}</h2>
        </div>

        <div class="cp-tools">
          <details class="cp-dd">
            <summary id="cpSum">\u00C1reas</summary>

            <div class="cp-menu">
              <div class="cp-mbtn">
                <button type="button" id="cpAll">Todas</button>
                <button type="button" id="cpNone">Ninguna</button>
              </div>

              <div id="cpChecks"></div>
            </div>
          </details>

          <select
            id="cpPer"
            class="cp-sel"
            aria-label="Periodo"
          ></select>
        </div>
      </div>

      <div id="cpBody"></div>

      <div class="cx-foot">
        <span>
          Promedio del % de cumplimiento de los indicadores de cierre de cada \u00E1rea
        </span>

        <span>
          Verde \u2265 ${S().umbrales.verde}% \u00B7
          Amarillo \u2265 ${S().umbrales.amarillo}%
        </span>
      </div>
    </div>
  `;
}


function mountCmpSlide() {
  const estado = Slides.cmp;
  const unidadSel = unidadFiltroActual();
  const todasLasAreas = unidadSel
    ? (unidadSel.areas || []).map(area => area.nombre)
    : [];

  const obtenerRegistros = area => {
    return S().data.cierre.filter(registro => {
        const perteneceUnidad =
        registro.unidadNegocioId === UI.filters.unidadId;
      const perteneceAlArea = registro.area === area;
      const coincidePeriodo =
        !estado.per || perLbl(registro) === estado.per;

      return perteneceUnidad && perteneceAlArea && coincidePeriodo;
    });
  };

  const periodos = [
    ...new Set(
      S().data.cierre
        .map(perLbl)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  const selectorPeriodo = $('#cpPer');
  const contenedorCasillas = $('#cpChecks');
  const resumenAreas = $('#cpSum');
  const cuerpo = $('#cpBody');
  const botonTodas = $('#cpAll');
  const botonNinguna = $('#cpNone');

  if (
    !selectorPeriodo ||
    !contenedorCasillas ||
    !resumenAreas ||
    !cuerpo ||
    !botonTodas ||
    !botonNinguna
  ) {
    return;
  }

  selectorPeriodo.innerHTML =
    '<option value="">Todos los periodos</option>' +
    periodos
      .map(
        periodo => `
          <option
            value="${esc(periodo)}"
            ${periodo === estado.per ? 'selected' : ''}
          >
            ${esc(periodo)}
          </option>
        `
      )
      .join('');

  contenedorCasillas.innerHTML = todasLasAreas
    .map(
      area => `
        <label>
          <input
            type="checkbox"
            value="${esc(area)}"
            ${estado.sel.has(area) ? 'checked' : ''}
          >
          ${esc(area)}
        </label>
      `
    )
    .join('');

  const dibujar = () => {
    const seleccionadas = [...estado.sel].filter(area =>
      todasLasAreas.includes(area)
    );

    resumenAreas.textContent =
      `\u00C1reas \u00B7 ${seleccionadas.length} de ${todasLasAreas.length}`;

    const datos = seleccionadas
      .map(area => {
        const registros = obtenerRegistros(area);

        const semaforos = registros.map(registro =>
          Calc.semaforo(registro)
        );

        return {
          area,
          total: registros.length,
          cumplimiento: Calc.avgCumpl(registros),
          verdes: semaforos.filter(color => color === 'Verde').length,
          amarillos: semaforos.filter(color => color === 'Amarillo').length,
          rojos: semaforos.filter(color => color === 'Rojo').length
        };
      })
      .sort((a, b) => {
        return (b.cumplimiento ?? -1) - (a.cumplimiento ?? -1);
      });

    if (!datos.length) {
      cuerpo.innerHTML = emptyBlock(
        'Selecciona al menos un \u00E1rea en el filtro \u201C\u00C1reas\u201D.'
      );

      return;
    }

    const datosConCumplimiento = datos.filter(
      dato => dato.cumplimiento != null
    );

    const umbrales = S().umbrales;

    const maximo = Math.max(
      120,
      ...datosConCumplimiento.map(dato =>
        Math.min(dato.cumplimiento, 150)
      )
    );

    const posicion = valor => {
      return `${(valor / maximo * 100).toFixed(2)}%`;
    };

    const cumplimientoPromedio = avg(
      datosConCumplimiento.map(dato =>
        Math.min(dato.cumplimiento, 150)
      )
    );

    const mayor = datosConCumplimiento[0] || null;

    const menor = datosConCumplimiento.length
      ? datosConCumplimiento[datosConCumplimiento.length - 1]
      : null;

    cuerpo.innerHTML = `
      <div class="cp-sum">
        <div
          class="cx-kpi ${semClass(
            Calc.semaforoAuto(cumplimientoPromedio)
          )}"
        >
          <span>Promedio seleccionado</span>
          <b>${fmtPct(cumplimientoPromedio)}</b>
        </div>

        <div class="cx-cell">
          <span>Mayor cumplimiento</span>
          <b>
            ${
              mayor
                ? `${esc(mayor.area)} \u00B7 ${fmtPct(mayor.cumplimiento)}`
                : '\u2014'
            }
          </b>
        </div>

        <div class="cx-cell">
          <span>Menor cumplimiento</span>
          <b>
            ${
              menor
                ? `${esc(menor.area)} \u00B7 ${fmtPct(menor.cumplimiento)}`
                : '\u2014'
            }
          </b>
        </div>

        <div class="cx-cell">
          <span>\u00C1reas comparadas</span>
          <b>${datos.length}</b>
        </div>
      </div>

      <div class="cp-list">
        ${datos
          .map((dato, indice) => {
            const claseSemaforo = semClass(
              Calc.semaforoAuto(dato.cumplimiento)
            );

            const anchoBarra =
              dato.cumplimiento == null
                ? 0
                : posicion(
                    Math.min(dato.cumplimiento, 150)
                  );

            return `
              <div class="cp-row">
                <span class="cp-pos">
                  ${dato.cumplimiento == null ? '\u2014' : indice + 1}
                </span>

                <div class="cp-name">
                  <b>${esc(dato.area)}</b>

                  <small>
                    ${dato.total} ind. \u00B7
                    <i class="verde"></i>${dato.verdes}
                    <i class="amarillo"></i>${dato.amarillos}
                    <i class="rojo"></i>${dato.rojos}
                  </small>
                </div>

                <div class="cp-track">
                  <i
                    class="cp-bar ${claseSemaforo}"
                    style="width:${anchoBarra}"
                  ></i>

                  <span
                    class="cp-mark verde"
                    style="left:${posicion(umbrales.verde)}"
                  ></span>

                  <span
                    class="cp-mark amarillo"
                    style="left:${posicion(umbrales.amarillo)}"
                  ></span>
                </div>

                <b class="cp-pct">
                  ${
                    dato.cumplimiento == null
                      ? 'Sin datos'
                      : fmtPct(dato.cumplimiento)
                  }
                </b>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  };

  contenedorCasillas.addEventListener('change', evento => {
    const casilla = evento.target;

    if (!casilla.matches('input[type="checkbox"]')) return;

    const area = casilla.value;

    if (casilla.checked) {
      estado.sel.add(area);
    } else {
      estado.sel.delete(area);
    }

    dibujar();
  });

  botonTodas.addEventListener('click', evento => {
    evento.preventDefault();
    estado.sel = new Set(todasLasAreas);

    $$('#cpChecks input').forEach(casilla => {
      casilla.checked = true;
    });

    dibujar();
  });

  botonNinguna.addEventListener('click', evento => {
    evento.preventDefault();
    estado.sel = new Set();

    $$('#cpChecks input').forEach(casilla => {
      casilla.checked = false;
    });

    dibujar();
  });

  selectorPeriodo.addEventListener('change', evento => {
    estado.per = evento.target.value;
    dibujar();
  });

  dibujar();
}


/* =======================================================================
   4. CONTROL GENERAL DE LA PRESENTACI\u00D3N
   ======================================================================= */


/*
   Ajuste exclusivo del Cierre.
   Conserva el flujo y el orden original del contenido; solo escala la
   diapositiva completa de forma proporcional a sus indicadores y al espacio
   disponible para mantener todos los registros juntos, sin desplazamiento.
*/
function ajustarCierreCompleto() {
  const limitar = (valor, minimo, maximo) => {
    return Math.min(maximo, Math.max(minimo, valor));
  };

  const aplicarAjuste = () => {
    const stage = document.querySelector('#slides .slide-stage');
    const slide = stage?.querySelector('.slide');
    const contenido = slide?.querySelector('.cx-unificada');

    if (!stage || !slide || !contenido) return;

    const tabla = contenido.querySelector('.cx-tbl');
    const filas = contenido.querySelectorAll('.cx-tbl tbody tr').length;
    const cantidad = Math.max(1, filas);

    /*
       El Cierre ocupa el rectangulo disponible completo. No se usa un lienzo
       fijo de 1240 px ni una escala global: las filas, fuentes y separaciones
       crecen o disminuyen con el numero de indicadores y con la pantalla.
    */
    stage.style.boxSizing = 'border-box';
    stage.style.display = 'flex';
    stage.style.alignItems = 'stretch';
    stage.style.justifyContent = 'center';
    stage.style.overflow = 'hidden';
    stage.style.padding = 'clamp(8px, 1.6vh, 18px) clamp(12px, 2.4vw, 36px)';

    const estiloStage = getComputedStyle(stage);
    const anchoDisponible = Math.max(
      1,
      stage.clientWidth -
        parseFloat(estiloStage.paddingLeft || 0) -
        parseFloat(estiloStage.paddingRight || 0)
    );
    const altoDisponible = Math.max(
      1,
      stage.clientHeight -
        parseFloat(estiloStage.paddingTop || 0) -
        parseFloat(estiloStage.paddingBottom || 0)
    );

    slide.style.animation = 'none';
    slide.style.boxSizing = 'border-box';
    slide.style.flex = '0 0 auto';
    slide.style.width = `${anchoDisponible}px`;
    slide.style.maxWidth = 'none';
    slide.style.height = `${altoDisponible}px`;
    slide.style.maxHeight = 'none';
    slide.style.margin = '0';
    slide.style.zoom = '1';
    slide.style.transform = 'none';
    slide.style.transformOrigin = 'top center';
    slide.style.overflow = 'hidden';

    contenido.style.width = '100%';
    contenido.style.maxWidth = 'none';
    contenido.style.height = '100%';
    contenido.style.maxHeight = 'none';
    contenido.style.setProperty('--cx-filas', String(cantidad));

    const altoPorFila = altoDisponible / cantidad;
    const anchoPorColumna = anchoDisponible / 6;
    const fuenteInicial = limitar(
      Math.min(
        21,
        10.5 + altoPorFila * 0.115,
        10.5 + anchoPorColumna * 0.038
      ),
      8,
      21
    );

    const aplicarMetricas = fuente => {
      const factorCantidad = limitar(10 / cantidad, 0.72, 1.25);
      const gap = limitar(fuente * 0.7 * factorCantidad, 3, 15);
      const py = limitar(fuente * 0.34 * factorCantidad, 2, 10);
      const px = limitar(fuente * 0.58, 5, 12);
      const bandaY = limitar(fuente * 0.64 * factorCantidad, 5, 14);

      contenido.style.setProperty('--cx-gap', `${gap}px`);
      contenido.style.setProperty('--cx-fuente-tabla', `${fuente}px`);
      contenido.style.setProperty(
        '--cx-fuente-comentario',
        `${limitar(fuente * 0.76, 7, 15)}px`
      );
      contenido.style.setProperty(
        '--cx-fuente-meta',
        `${limitar(fuente * 0.72, 9, 15)}px`
      );
      contenido.style.setProperty(
        '--cx-fuente-label',
        `${limitar(fuente * 0.64, 8, 14)}px`
      );
      contenido.style.setProperty(
        '--cx-fuente-conteo',
        `${limitar(fuente * 0.84, 9, 17)}px`
      );
      contenido.style.setProperty(
        '--cx-fuente-encabezado-tabla',
        `${limitar(fuente * 0.66, 8, 14)}px`
      );
      contenido.style.setProperty(
        '--cx-fuente-unidad',
        `${limitar(fuente * 0.74, 8, 15)}px`
      );
      contenido.style.setProperty(
        '--cx-fuente-pill',
        `${limitar(fuente * 0.7, 8, 14)}px`
      );
      contenido.style.setProperty(
        '--cx-fuente-pie',
        `${limitar(fuente * 0.65, 8, 13)}px`
      );
      contenido.style.setProperty(
        '--cx-tamano-punto',
        `${limitar(fuente * 0.38, 5, 9)}px`
      );
      contenido.style.setProperty(
        '--cx-alto-encabezado-tabla',
        `${limitar(fuente * 1.75, 20, 38)}px`
      );
      contenido.style.setProperty(
        '--cx-padding-cabecera',
        `${limitar(gap * 0.55, 4, 9)}px`
      );
      contenido.style.setProperty(
        '--cx-padding-banda-x',
        `${limitar(fuente * 0.9, 8, 18)}px`
      );
      contenido.style.setProperty(
        '--cx-margen-label',
        `${limitar(gap * 0.25, 2, 5)}px`
      );
      contenido.style.setProperty(
        '--cx-padding-th-y',
        `${limitar(py * 0.72, 2, 7)}px`
      );
      contenido.style.setProperty(
        '--cx-padding-pill-y',
        `${limitar(py * 0.45, 2, 5)}px`
      );
      contenido.style.setProperty(
        '--cx-padding-pill-x',
        `${limitar(px * 0.8, 5, 10)}px`
      );
      contenido.style.setProperty(
        '--cx-padding-pie',
        `${limitar(gap * 0.5, 3, 8)}px`
      );
      contenido.style.setProperty('--cx-py', `${py}px`);
      contenido.style.setProperty('--cx-px', `${px}px`);
      contenido.style.setProperty(
        '--cx-fuente-titulo',
        `${limitar(fuente * 1.75, 20, 38)}px`
      );
      contenido.style.setProperty(
        '--cx-fuente-kpi',
        `${limitar(fuente * 1.82, 20, 40)}px`
      );
      contenido.style.setProperty('--cx-padding-banda-y', `${bandaY}px`);
    };

    const cabe = () => {
      const tolerancia = 1;
      const contenidoCabe =
        contenido.scrollHeight <= contenido.clientHeight + tolerancia &&
        contenido.scrollWidth <= contenido.clientWidth + tolerancia;
      const tablaCabe = !tabla || (
        tabla.scrollHeight <= tabla.clientHeight + tolerancia &&
        tabla.scrollWidth <= tabla.clientWidth + tolerancia
      );

      return contenidoCabe && tablaCabe;
    };

    /*
       Busca el mayor tamano que cabe, en vez de imponer una clase pequena al
       superar 8 o 12 indicadores. Asi la misma diapositiva aprovecha el alto
       libre cuando tiene pocas filas y se compacta solo cuando es necesario.
    */
    let minimo = 8;
    let maximo = Math.max(minimo, fuenteInicial);
    let mejor = minimo;

    aplicarMetricas(minimo);

    for (let intento = 0; intento < 9; intento++) {
      const candidato = (minimo + maximo) / 2;
      aplicarMetricas(candidato);

      if (cabe()) {
        mejor = candidato;
        minimo = candidato;
      } else {
        maximo = candidato;
      }
    }

    aplicarMetricas(mejor);
  };

  aplicarAjuste();
  requestAnimationFrame(() => {
    aplicarAjuste();
    requestAnimationFrame(aplicarAjuste);
  });
  setTimeout(aplicarAjuste, 180);
  setTimeout(aplicarAjuste, 500);

  if (!ajustarCierreCompleto._escuchaResize) {
    ajustarCierreCompleto._escuchaResize = true;

    window.addEventListener('resize', () => {
      if (document.querySelector('#slides .cx-unificada')) {
        aplicarAjuste();
      }
    });
  }
}

/* =======================================================================
   5. SABANA DE KPIS EN PRESENTACION
   Ajuste visual exclusivo: ocupa proporcionalmente el rectangulo util con
   filas, tipografia y espaciado adaptativos, sin alterar datos ni columnas.
   ======================================================================= */

function kpisOrdenadosPresentacion(rows) {
  return rows
    .map((registro, indice) => ({ registro, indice }))
    .sort((a, b) => {
      const pa = Number(a.registro.posicion), pb = Number(b.registro.posicion);
      const va = Number.isInteger(pa) && pa > 0;
      const vb = Number.isInteger(pb) && pb > 0;
      if (va && vb && pa !== pb) return pa - pb;
      if (va !== vb) return va ? -1 : 1;
      return a.indice - b.indice;
    })
    .map(({ registro }) => registro);
}

function kpisSlideHTML(area) {
  /*
     Edicion dibuja esta hoja con Calc.rows(...). Presentacion consume esa
     misma secuencia, con la misma Unidad + Area + Periodo, y solo aplica el
     filtro opcional de responsable sin alterar la posicion relativa.
  */
  const unidad = unidadFiltroActual();
  const areaActual = (unidad?.areas || []).find(
    registroArea => registroArea.nombre === area
  );

  const rowsEdicion = kpisOrdenadosPresentacion(
    Calc.rows(
      'kpis',
      area,
      unidad?.id || '',
      areaActual?.id || '',
      'kpis'
    )
  );

  const rows = rowsEdicion.filter(registro => F.resp(registro));

  const [, titulo, icono] = SECTIONS.find(
    seccion => seccion[0] === 'kpis'
  );

  const tabla = rows.length
    ? `
      <div class="tbl-wrap">
        <table class="tbl compact" style="table-layout:fixed">
          <thead>
            <tr>
              <th class="static" style="width:30%">KPI</th>
              <th class="static" style="width:10%">Unidad</th>
              <th class="static num" style="width:14%;background:#dcfce7;color:#166534;border-color:#86efac">Meta Verde</th>
              <th class="static num" style="width:14%;background:#fef9c3;color:#854d0e;border-color:#fde047">Meta Amarilla</th>
              <th class="static num" style="width:14%;background:#fee2e2;color:#991b1b;border-color:#fca5a5">Meta Roja</th>
              <th class="static" style="width:18%">Responsable</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(registro => `
                <tr>
                  <td><b>${esc(registro.kpi)}</b></td>
                  <td>${registro.unidad ? esc(registro.unidad) : '<span class="muted">—</span>'}</td>
                  <td class="num" style="background:#f0fdf4;color:#166534"><b>${fmtNum(registro.metaVerde)}</b></td>
                  <td class="num" style="background:#fefce8;color:#854d0e"><b>${fmtNum(registro.metaAmarilla)}</b></td>
                  <td class="num" style="background:#fef2f2;color:#991b1b"><b>${fmtNum(registro.metaRoja)}</b></td>
                  <td>${registro.responsable ? esc(registro.responsable) : '<span class="muted">—</span>'}</td>
                </tr>
              `)
              .join('')}
          </tbody>
        </table>
      </div>
    `
    : emptyBlock('Sin KPIs con los filtros actuales.');

  const htmlIdentificado = `
    <div class="sec kpis-slide">
      ${secTitle('kpis', titulo, icono, area)}
      ${tabla}
    </div>
  `;

  return `
    <style>
      #slides .kpis-slide {
        --kps-gap: 12px;
        --kps-font: 18px;
        --kps-header-font: 12px;
        --kps-title-font: 34px;
        --kps-area-font: 12px;
        --kps-pad-y: 8px;
        --kps-pad-x: 10px;
        --kps-header-height: 40px;
        --kps-row-height: 48px;
        display: flex;
        flex-direction: column;
        gap: var(--kps-gap);
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        box-sizing: border-box;
      }

      #slides .kpis-slide,
      #slides .kpis-slide * {
        box-sizing: border-box;
      }

      #slides .kpis-slide .sec-title {
        flex: 0 0 auto;
        margin: 0;
        padding: 0;
      }

      #slides .kpis-slide .sec-title h3 {
        margin: 0;
        font-size: var(--kps-title-font);
        line-height: 1.04;
        letter-spacing: -.025em;
      }

      #slides .kpis-slide .sec-title .small {
        font-size: var(--kps-area-font);
        line-height: 1.2;
      }

      #slides .kpis-slide > .tbl-wrap {
        flex: 1 1 auto;
        display: flex;
        width: 100%;
        min-width: 0;
        min-height: 0;
        margin: 0;
        overflow: hidden;
      }

      #slides .kpis-slide table.tbl.compact {
        width: 100% !important;
        min-width: 0 !important;
        height: 100%;
        margin: 0;
        table-layout: fixed !important;
        border-collapse: separate;
        border-spacing: 0;
        font-size: var(--kps-font);
      }

      #slides .kpis-slide table.tbl.compact thead {
        height: var(--kps-header-height);
      }

      #slides .kpis-slide table.tbl.compact tbody tr {
        height: var(--kps-row-height);
      }

      #slides .kpis-slide table.tbl.compact th.static {
        padding: calc(var(--kps-pad-y) * .78) var(--kps-pad-x) !important;
        font-size: var(--kps-header-font) !important;
        line-height: 1.08;
        vertical-align: middle;
        white-space: normal;
        overflow-wrap: anywhere;
      }

      #slides .kpis-slide table.tbl.compact td {
        padding: var(--kps-pad-y) var(--kps-pad-x) !important;
        font-size: var(--kps-font);
        line-height: 1.16;
        vertical-align: middle;
        white-space: normal;
        overflow-wrap: anywhere;
      }

      #slides .kpis-slide table.tbl.compact td b {
        font-size: inherit;
        line-height: inherit;
      }

      /*
         Las seis columnas conservan el orden y las proporciones de origen:
         KPI, Unidad, Meta Verde, Meta Amarilla, Meta Roja y Responsable.
         Solo se refuerza el semaforo en las tres columnas de metas.
      */
      #slides .kpis-slide table.tbl.compact th:nth-child(3) {
        background: linear-gradient(135deg, #bbf7d0 0%, #dcfce7 52%, #86efac 100%) !important;
        color: #0b5f31 !important;
        border-color: #4ade80 !important;
        animation: kpsPulsoVerde 6.4s ease-in-out infinite;
      }

      #slides .kpis-slide table.tbl.compact td:nth-child(3) {
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
        color: #0b5f31 !important;
        border-color: #86efac !important;
        box-shadow: inset 0 0 18px rgba(34, 197, 94, .1);
      }

      #slides .kpis-slide table.tbl.compact th:nth-child(4) {
        background: linear-gradient(135deg, #fef08a 0%, #fef9c3 52%, #fde047 100%) !important;
        color: #713f12 !important;
        border-color: #facc15 !important;
        animation: kpsPulsoAmarillo 6.4s ease-in-out -2.15s infinite;
      }

      #slides .kpis-slide table.tbl.compact td:nth-child(4) {
        background: linear-gradient(135deg, #fffceb 0%, #fef3c7 100%) !important;
        color: #713f12 !important;
        border-color: #fde047 !important;
        box-shadow: inset 0 0 18px rgba(234, 179, 8, .1);
      }

      #slides .kpis-slide table.tbl.compact th:nth-child(5) {
        background: linear-gradient(135deg, #fecaca 0%, #fee2e2 52%, #fca5a5 100%) !important;
        color: #8f1d1d !important;
        border-color: #f87171 !important;
        animation: kpsPulsoRojo 6.4s ease-in-out -4.25s infinite;
      }

      #slides .kpis-slide table.tbl.compact td:nth-child(5) {
        background: linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%) !important;
        color: #8f1d1d !important;
        border-color: #fca5a5 !important;
        box-shadow: inset 0 0 18px rgba(239, 68, 68, .1);
      }

      #slides .kpis-slide table.tbl.compact th:nth-child(n + 3):nth-child(-n + 5) {
        will-change: filter, box-shadow;
      }

      @keyframes kpsPulsoVerde {
        0%, 100% {
          filter: brightness(1) saturate(1);
          box-shadow: inset 0 0 0 1px rgba(34, 197, 94, .16), inset 0 0 0 rgba(34, 197, 94, 0);
        }
        50% {
          filter: brightness(1.045) saturate(1.08);
          box-shadow: inset 0 0 0 1px rgba(34, 197, 94, .28), inset 0 0 24px rgba(34, 197, 94, .16);
        }
      }

      @keyframes kpsPulsoAmarillo {
        0%, 100% {
          filter: brightness(1) saturate(1);
          box-shadow: inset 0 0 0 1px rgba(234, 179, 8, .16), inset 0 0 0 rgba(234, 179, 8, 0);
        }
        50% {
          filter: brightness(1.05) saturate(1.1);
          box-shadow: inset 0 0 0 1px rgba(234, 179, 8, .3), inset 0 0 24px rgba(250, 204, 21, .18);
        }
      }

      @keyframes kpsPulsoRojo {
        0%, 100% {
          filter: brightness(1) saturate(1);
          box-shadow: inset 0 0 0 1px rgba(239, 68, 68, .16), inset 0 0 0 rgba(239, 68, 68, 0);
        }
        50% {
          filter: brightness(1.045) saturate(1.08);
          box-shadow: inset 0 0 0 1px rgba(239, 68, 68, .28), inset 0 0 24px rgba(239, 68, 68, .16);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #slides .kpis-slide table.tbl.compact th:nth-child(n + 3):nth-child(-n + 5),
        #slides .kpis-slide table.tbl.compact td:nth-child(n + 3):nth-child(-n + 5) {
          animation: none !important;
          filter: none !important;
          transition: none !important;
        }
      }

      @media (max-width: 900px) {
        #slides .kpis-slide .sec-title {
          flex-direction: row;
          align-items: center;
        }
      }
    </style>
    ${htmlIdentificado}
  `;
}

function ajustarKpisSlide() {
  const limitar = (valor, minimo, maximo) => {
    return Math.min(maximo, Math.max(minimo, valor));
  };

  const aplicarAjuste = () => {
    const stage = document.querySelector('#slides .slide-stage');
    const slide = stage?.querySelector('.slide');
    const contenido = slide?.querySelector('.kpis-slide');

    if (!stage || !slide || !contenido) return;

    const envolturaTabla = contenido.querySelector(':scope > .tbl-wrap');
    const tabla = envolturaTabla?.querySelector('table.tbl.compact');
    const filas = tabla?.querySelectorAll('tbody tr').length || 0;
    const cantidad = Math.max(1, filas);

    stage.style.boxSizing = 'border-box';
    stage.style.display = 'flex';
    stage.style.alignItems = 'stretch';
    stage.style.justifyContent = 'center';
    stage.style.overflow = 'hidden';
    stage.style.padding = 'clamp(8px, 1.35vh, 16px) clamp(12px, 2vw, 32px)';

    const estiloStage = getComputedStyle(stage);
    const anchoDisponible = Math.max(
      1,
      stage.clientWidth -
        parseFloat(estiloStage.paddingLeft || 0) -
        parseFloat(estiloStage.paddingRight || 0)
    );
    const altoDisponible = Math.max(
      1,
      stage.clientHeight -
        parseFloat(estiloStage.paddingTop || 0) -
        parseFloat(estiloStage.paddingBottom || 0)
    );

    slide.style.animation = 'none';
    slide.style.boxSizing = 'border-box';
    slide.style.flex = '0 0 auto';
    slide.style.width = `${anchoDisponible}px`;
    slide.style.maxWidth = 'none';
    slide.style.height = `${altoDisponible}px`;
    slide.style.maxHeight = 'none';
    slide.style.margin = '0';
    slide.style.zoom = '1';
    slide.style.transform = 'none';
    slide.style.transformOrigin = 'top center';
    slide.style.overflow = 'hidden';

    contenido.style.width = '100%';
    contenido.style.maxWidth = 'none';
    contenido.style.height = '100%';
    contenido.style.maxHeight = 'none';

    if (!envolturaTabla || !tabla || !filas) return;

    tabla.style.transform = 'none';
    tabla.style.transformOrigin = 'top left';

    const altoEstimadoPorFila = Math.max(1, (altoDisponible - 84) / cantidad);
    const anchoReferencia = anchoDisponible / 6;
    const fuenteMaxima = limitar(
      Math.min(
        26,
        8 + altoEstimadoPorFila * .22,
        8 + anchoReferencia * .085
      ),
      7,
      26
    );

    const aplicarMetricas = fuente => {
      const factorFilas = limitar(9 / cantidad, .56, 1.28);
      const padY = limitar(fuente * .42 * factorFilas, 2.2, 12);
      const padX = limitar(fuente * .58, 5, 16);
      const gap = limitar(fuente * .68 * factorFilas, 4, 16);
      const fuenteCabecera = limitar(fuente * .7, 7.4, 16);
      const altoCabecera = limitar(
        fuenteCabecera * 2.35 + padY * 1.2,
        24,
        58
      );

      contenido.style.setProperty('--kps-font', `${fuente}px`);
      contenido.style.setProperty(
        '--kps-header-font',
        `${fuenteCabecera}px`
      );
      contenido.style.setProperty(
        '--kps-title-font',
        `${limitar(fuente * 1.62, 23, 42)}px`
      );
      contenido.style.setProperty(
        '--kps-area-font',
        `${limitar(fuente * .66, 9, 15)}px`
      );
      contenido.style.setProperty('--kps-pad-y', `${padY}px`);
      contenido.style.setProperty('--kps-pad-x', `${padX}px`);
      contenido.style.setProperty('--kps-gap', `${gap}px`);
      contenido.style.setProperty(
        '--kps-header-height',
        `${altoCabecera}px`
      );

      const altoTabla = Math.max(1, envolturaTabla.clientHeight);
      const altoFila = Math.max(
        14,
        (altoTabla - altoCabecera - 2) / cantidad
      );

      contenido.style.setProperty('--kps-row-height', `${altoFila}px`);
    };

    const cabe = () => {
      const tolerancia = 1;
      const elementos = [
        contenido,
        envolturaTabla,
        tabla,
        ...tabla.querySelectorAll('th, td')
      ];

      return elementos.every(elemento => {
        return (
          elemento.scrollHeight <= elemento.clientHeight + tolerancia &&
          elemento.scrollWidth <= elemento.clientWidth + tolerancia
        );
      });
    };

    let minimo = 5.5;
    let maximo = Math.max(minimo, fuenteMaxima);
    let mejor = minimo;

    aplicarMetricas(minimo);

    for (let intento = 0; intento < 11; intento++) {
      const candidato = (minimo + maximo) / 2;
      aplicarMetricas(candidato);

      if (cabe()) {
        mejor = candidato;
        minimo = candidato;
      } else {
        maximo = candidato;
      }
    }

    aplicarMetricas(mejor);
  };

  aplicarAjuste();
  requestAnimationFrame(() => {
    aplicarAjuste();
    requestAnimationFrame(aplicarAjuste);
  });
  setTimeout(aplicarAjuste, 180);
  setTimeout(aplicarAjuste, 500);

  if (!ajustarKpisSlide._escuchaResize) {
    ajustarKpisSlide._escuchaResize = true;

    window.addEventListener('resize', () => {
      if (document.querySelector('#slides .kpis-slide')) {
        ajustarKpisSlide();
      }
    });
  }
}

/* =======================================================================
   5. PLAN DE ACCIONES CRITICAS EN PRESENTACION
   Ajuste visual exclusivo: elimina el criterio explicativo y aprovecha el
   rectangulo completo con tabla, filas y tipografia adaptativas.
   ======================================================================= */

function planAccionesCriticasSlideHTML(area) {
  const htmlBase = sectionHTML('qqc', area, true);

  const htmlSinCriterio = htmlBase.replace(
    /<p class="small muted" style="margin:0 0 10px"><b>Criterio de priorizaci\u00F3n adoptado:<\/b>[\s\S]*?<\/p>/i,
    ''
  );

  const htmlIdentificado = htmlSinCriterio.replace(
    '<div class="sec">',
    '<div class="sec qqc-slide">'
  );

  return `
    <style>
      #slides .qqc-slide {
        --qqc-gap: 9px;
        --qqc-font: 13px;
        --qqc-header-font: 9px;
        --qqc-context-font: 11px;
        --qqc-pad-y: 5px;
        --qqc-pad-x: 7px;
        --qqc-pill-font: 10px;
        display: flex;
        flex-direction: column;
        gap: var(--qqc-gap);
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        box-sizing: border-box;
      }

      #slides .qqc-slide,
      #slides .qqc-slide * {
        box-sizing: border-box;
      }

      #slides .qqc-slide .sec-title {
        flex: 0 0 auto;
        margin: 0;
        padding-bottom: clamp(5px, .8vh, 10px);
      }

      #slides .qqc-slide .sec-title h3 {
        margin: 0;
        font-size: clamp(22px, 2.25vw, 36px);
        line-height: 1.05;
        letter-spacing: -.025em;
      }

      #slides .qqc-slide .sec-title .small {
        font-size: clamp(10px, .92vw, 14px);
        line-height: 1.2;
      }

      #slides .qqc-slide .qqc-presentacion {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: var(--qqc-gap);
        width: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
      }

      #slides .qqc-slide .qqc-presentacion > section {
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        width: 100%;
        min-width: 0;
        min-height: 0;
        margin: 0 !important;
        overflow: hidden;
      }

      #slides .qqc-slide .qqc-presentacion > section > .small {
        flex: 0 0 auto;
        margin: 0 0 clamp(4px, .55vh, 7px) !important;
        font-size: var(--qqc-context-font) !important;
        line-height: 1.2;
      }

      #slides .qqc-slide .qqc-presentacion .tbl-wrap {
        flex: 1 1 auto;
        display: flex;
        width: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
      }

      #slides .qqc-slide .qqc-presentacion table.tbl.compact {
        width: 100% !important;
        min-width: 0 !important;
        height: 100%;
        margin: 0;
        table-layout: fixed;
        border-collapse: collapse;
        font-size: var(--qqc-font) !important;
      }

      #slides .qqc-slide .qqc-presentacion table.tbl.compact thead {
        height: calc(var(--qqc-header-font) * 2.65);
      }

      #slides .qqc-slide .qqc-presentacion table.tbl.compact tbody tr {
        height: calc(100% / var(--qqc-row-count, 1));
      }

      #slides .qqc-slide .qqc-presentacion table.tbl.compact th.static {
        padding: calc(var(--qqc-pad-y) * .78) var(--qqc-pad-x) !important;
        font-size: var(--qqc-header-font) !important;
        line-height: 1.08;
        white-space: normal;
        overflow-wrap: anywhere;
      }

      #slides .qqc-slide .qqc-presentacion table.tbl.compact td {
        padding: var(--qqc-pad-y) var(--qqc-pad-x) !important;
        font-size: var(--qqc-font);
        line-height: 1.16;
        vertical-align: middle;
        white-space: normal;
        overflow-wrap: anywhere;
      }

      #slides .qqc-slide .qqc-presentacion table.tbl.compact td .muted,
      #slides .qqc-slide .qqc-presentacion table.tbl.compact td .small {
        font-size: .86em;
        line-height: 1.1;
      }

      #slides .qqc-slide .qqc-presentacion table.tbl.compact .pill,
      #slides .qqc-slide .qqc-presentacion table.tbl.compact .tag {
        max-width: 100%;
        padding: calc(var(--qqc-pad-y) * .42) calc(var(--qqc-pad-x) * .82);
        font-size: var(--qqc-pill-font);
        line-height: 1.05;
        white-space: normal;
      }

      #slides .qqc-slide .qqc-presentacion table.tbl.compact .pill i {
        flex: 0 0 auto;
        width: clamp(5px, .48em, 8px);
        height: clamp(5px, .48em, 8px);
      }

      @media (max-width: 900px) {
        #slides .qqc-slide .sec-title {
          flex-direction: row;
          align-items: center;
        }
      }
    </style>
    ${htmlIdentificado}
  `;
}

function ajustarPlanAccionesCriticas() {
  const limitar = (valor, minimo, maximo) => {
    return Math.min(maximo, Math.max(minimo, valor));
  };

  const aplicarAjuste = () => {
    const stage = document.querySelector('#slides .slide-stage');
    const slide = stage?.querySelector('.slide');
    const contenido = slide?.querySelector('.qqc-slide');

    if (!stage || !slide || !contenido) return;

    stage.style.boxSizing = 'border-box';
    stage.style.display = 'flex';
    stage.style.alignItems = 'stretch';
    stage.style.justifyContent = 'center';
    stage.style.overflow = 'hidden';
    stage.style.padding = 'clamp(6px, 1.05vh, 12px) clamp(10px, 1.65vw, 26px)';

    const estiloStage = getComputedStyle(stage);
    const anchoDisponible = Math.max(
      1,
      stage.clientWidth -
        parseFloat(estiloStage.paddingLeft || 0) -
        parseFloat(estiloStage.paddingRight || 0)
    );
    const altoDisponible = Math.max(
      1,
      stage.clientHeight -
        parseFloat(estiloStage.paddingTop || 0) -
        parseFloat(estiloStage.paddingBottom || 0)
    );

    slide.style.animation = 'none';
    slide.style.boxSizing = 'border-box';
    slide.style.flex = '0 0 auto';
    slide.style.width = `${anchoDisponible}px`;
    slide.style.maxWidth = 'none';
    slide.style.height = `${altoDisponible}px`;
    slide.style.maxHeight = 'none';
    slide.style.margin = '0';
    slide.style.zoom = '1';
    slide.style.transform = 'none';
    slide.style.transformOrigin = 'top center';
    slide.style.overflow = 'hidden';

    contenido.style.width = '100%';
    contenido.style.maxWidth = 'none';
    contenido.style.height = '100%';
    contenido.style.maxHeight = 'none';

    const secciones = [
      ...contenido.querySelectorAll('.qqc-presentacion > section')
    ];

    let totalFilas = 0;

    secciones.forEach(seccion => {
      const cantidad = Math.max(
        1,
        seccion.querySelectorAll('tbody tr').length
      );

      totalFilas += cantidad;
      seccion.style.setProperty('--qqc-row-count', String(cantidad));
      seccion.style.flex = `${cantidad + 0.72} 1 0`;
    });

    totalFilas = Math.max(1, totalFilas);

    const altoPorFila = altoDisponible /
      (totalFilas + secciones.length * 1.55 + 2.8);
    const anchoReferencia = anchoDisponible / 8;
    const fuenteMaxima = limitar(
      Math.min(
        18,
        7.8 + altoPorFila * 0.125,
        8.4 + anchoReferencia * 0.055
      ),
      8,
      18
    );

    const aplicarMetricas = fuente => {
      const factorFilas = limitar(7 / totalFilas, 0.62, 1.18);
      const padY = limitar(fuente * 0.39 * factorFilas, 2.2, 8.5);
      const padX = limitar(fuente * 0.56, 4.5, 11);
      const gap = limitar(fuente * 0.62 * factorFilas, 3.5, 12);

      contenido.style.setProperty('--qqc-font', `${fuente}px`);
      contenido.style.setProperty(
        '--qqc-header-font',
        `${limitar(fuente * 0.72, 7.2, 12.5)}px`
      );
      contenido.style.setProperty(
        '--qqc-context-font',
        `${limitar(fuente * 0.86, 8.5, 15)}px`
      );
      contenido.style.setProperty(
        '--qqc-pill-font',
        `${limitar(fuente * 0.74, 7.4, 12.5)}px`
      );
      contenido.style.setProperty('--qqc-pad-y', `${padY}px`);
      contenido.style.setProperty('--qqc-pad-x', `${padX}px`);
      contenido.style.setProperty('--qqc-gap', `${gap}px`);
    };

    const cabe = () => {
      const tolerancia = 1;
      const contenedores = [
        contenido,
        ...contenido.querySelectorAll(
          '.qqc-presentacion, .qqc-presentacion > section, .tbl-wrap, table, th, td'
        )
      ];

      return contenedores.every(elemento => {
        return (
          elemento.scrollHeight <= elemento.clientHeight + tolerancia &&
          elemento.scrollWidth <= elemento.clientWidth + tolerancia
        );
      });
    };

    let minimo = 6.8;
    let maximo = Math.max(minimo, fuenteMaxima);
    let mejor = minimo;

    aplicarMetricas(minimo);

    for (let intento = 0; intento < 10; intento++) {
      const candidato = (minimo + maximo) / 2;
      aplicarMetricas(candidato);

      if (cabe()) {
        mejor = candidato;
        minimo = candidato;
      } else {
        maximo = candidato;
      }
    }

    aplicarMetricas(mejor);
  };

  aplicarAjuste();
  requestAnimationFrame(() => {
    aplicarAjuste();
    requestAnimationFrame(aplicarAjuste);
  });
  setTimeout(aplicarAjuste, 180);
  setTimeout(aplicarAjuste, 500);

  if (!ajustarPlanAccionesCriticas._escuchaResize) {
    ajustarPlanAccionesCriticas._escuchaResize = true;

    window.addEventListener('resize', () => {
      if (document.querySelector('#slides .qqc-slide')) {
        aplicarAjuste();
      }
    });
  }
}

/* =======================================================================
   5. REFLEXION DEL AREA EN CINCO DIAPOSITIVAS EJECUTIVAS
   Una diapositiva por campo, sin modificar la captura ni los datos.
   ======================================================================= */

function rpAnteportadaHTML(area, titulo) {
 return `<div class="slide-cover" style="width:100%;height:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:clamp(20px,4vw,56px)"><span class="eyebrow">${esc(area)}</span><h1 style="font-size:clamp(32px,5vw,72px);line-height:1.08;overflow-wrap:anywhere">${esc(titulo)}</h1><div style="width:120px;height:6px;background:var(--primary);border-radius:999px;margin-top:24px"></div></div>`;
}
function camposReflexionPresentacion() {
  const hoja = SHEET('reflexion');
  const columnas = (hoja?.cols || []).filter(columna => columna.t !== 'area');
  const porClave = new Map(columnas.map(columna => [columna.k, columna]));

  return [
    'logros',
    'aprendizajes',
    'obstaculos',
    'distinto',
    'apoyos'
  ]
    .map(clave => porClave.get(clave))
    .filter(Boolean);
}

function reflexionSlideHTML(area, campo, indice, total, etiqueta = 'Reflexi\u00F3n de \u00C1rea') {
  const claveDatos = etiqueta === 'Reflexión Personal' ? 'reflexionPersonal' : 'reflexion';
  const esReflexionPersonal = claveDatos === 'reflexionPersonal';
  const registro = F.get(claveDatos).find(fila => fila.area === area);
  const valor = String(registro?.[campo.k] ?? '');
  const tieneValor = valor.trim().length > 0;
  const unidad = unidadFiltroActual()?.nombre || registro?.unidadNegocio || '';
  const periodo = Calc.textoPeriodoAnalisis(claveDatos, true);
  const numero = String(indice + 1).padStart(2, '0');
  const cantidad = String(total).padStart(2, '0');

  return `
    <style>
      #slides .rx {
        --rx-accent: var(--primary);
        --rx-gap: 18px;
        --rx-pad: 28px;
        --rx-copy-size: 28px;
        --rx-copy-leading: 1.42;
        --rx-title-size: 38px;
        --rx-subtitle-size: 17px;
        --rx-prompt-size: 15px;
        --rx-meta-label-size: 10px;
        --rx-meta-value-size: 14px;
        --rx-card-pad-y: 30px;
        --rx-card-pad-x: 38px;
        display: flex;
        flex-direction: column;
        gap: var(--rx-gap);
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        box-sizing: border-box;
      }

      #slides .rx,
      #slides .rx * {
        box-sizing: border-box;
      }

      #slides .rx-head {
        flex: 0 0 auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 24px;
        align-items: end;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--border);
      }

      #slides .rx-heading {
        min-width: 0;
      }

      #slides .rx-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        margin-bottom: 8px;
        color: var(--rx-accent);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .12em;
        line-height: 1.2;
        text-transform: uppercase;
      }

      #slides .rx-eyebrow::before {
        content: '';
        width: 28px;
        height: 3px;
        border-radius: 999px;
        background: var(--rx-accent);
      }

      #slides .rx-title {
        margin: 0;
        color: var(--text);
        font-size: var(--rx-title-size);
        line-height: 1.03;
        letter-spacing: -.035em;
      }

      #slides .rx-subtitle {
        margin: 7px 0 0;
        color: var(--muted);
        font-size: var(--rx-subtitle-size);
        font-weight: 700;
        line-height: 1.25;
      }

      #slides .rx-prompt {
        margin: 8px 0 0;
        color: var(--muted);
        font-size: var(--rx-prompt-size);
        line-height: 1.3;
      }

      #slides .rx-index {
        display: flex;
        align-items: baseline;
        gap: 5px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
      }

      #slides .rx-index b {
        color: var(--rx-accent);
        font-size: 34px;
        line-height: 1;
      }

      #slides .rx-context {
        flex: 0 0 auto;
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.25fr);
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--surface);
        box-shadow: 0 8px 24px rgba(15, 23, 42, .06);
      }

      #slides .rx-context-item {
        min-width: 0;
        padding: 11px 16px;
      }

      #slides .rx-context-item + .rx-context-item {
        border-left: 1px solid var(--border);
      }

      #slides .rx-context-label {
        display: block;
        margin-bottom: 3px;
        color: var(--muted);
        font-size: var(--rx-meta-label-size);
        font-weight: 800;
        letter-spacing: .08em;
        line-height: 1.2;
        text-transform: uppercase;
      }

      #slides .rx-context-value {
        display: block;
        overflow-wrap: anywhere;
        color: var(--text);
        font-size: var(--rx-meta-value-size);
        font-weight: 700;
        line-height: 1.25;
      }

      #slides .rx-main {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
      }

      #slides .rx-card {
        position: relative;
        display: grid;
        grid-template-columns: 7px minmax(0, 1fr);
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--rx-accent) 22%, var(--border));
        border-radius: 20px;
        background:
          linear-gradient(135deg, color-mix(in srgb, var(--rx-accent) 7%, var(--surface)) 0%, var(--surface) 42%),
          var(--surface);
        box-shadow: 0 18px 42px rgba(15, 23, 42, .09);
      }

      #slides .rx-accent {
        background: var(--rx-accent);
      }

      #slides .rx-copy-wrap {
        display: flex;
        align-items: center;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        padding: var(--rx-card-pad-y) var(--rx-card-pad-x);
      }

      #slides .rx-copy {
        width: 100%;
        margin: 0;
        color: var(--text);
        font-size: var(--rx-copy-size);
        font-weight: 520;
        line-height: var(--rx-copy-leading);
        letter-spacing: -.012em;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
        transform-origin: top left;
      }

      #slides .rx-copy.rx-empty {
        color: var(--muted);
        font-style: italic;
        font-weight: 500;
      }

      #slides .rx-foot {
        flex: 0 0 auto;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        color: var(--muted);
        font-size: 10px;
        line-height: 1.25;
      }

      @media (max-width: 900px) {
        #slides .rx-head {
          grid-template-columns: minmax(0, 1fr) auto;
        }

        #slides .rx-context {
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.25fr);
        }
      }
    </style>

    <div class="rx" data-reflexion-campo="${esc(campo.k)}">
      <header class="rx-head">
        <div class="rx-heading">
          <span class="rx-eyebrow">${esc(etiqueta)}</span>
          <h2 class="rx-title">${esc(esReflexionPersonal && campo.badge ? campo.badge : campo.l)}</h2>
          ${esReflexionPersonal ? `<p class="rx-subtitle">${esc(campo.l)}</p>` : ''}
          ${campo.help ? `<p class="rx-prompt">${esc(campo.help)}</p>` : ''}
        </div>

        <div class="rx-index" aria-label="Campo ${indice + 1} de ${total}">
          <b>${numero}</b><span>/ ${cantidad}</span>
        </div>
      </header>

      <div class="rx-context" aria-label="Contexto de la reflexi\u00F3n">
        <div class="rx-context-item">
          <span class="rx-context-label">Unidad de negocio</span>
          <span class="rx-context-value">${esc(unidad || '\u2014')}</span>
        </div>

        <div class="rx-context-item">
          <span class="rx-context-label">\u00C1rea</span>
          <span class="rx-context-value">${esc(area || '\u2014')}</span>
        </div>

        <div class="rx-context-item">
          <span class="rx-context-label">Periodo</span>
          <span class="rx-context-value">${esc(periodo || '\u2014')}</span>
        </div>
      </div>

      <main class="rx-main">
        <article class="rx-card">
          <span class="rx-accent" aria-hidden="true"></span>
          <div class="rx-copy-wrap">
            <p class="rx-copy ${tieneValor ? '' : 'rx-empty'}">${tieneValor ? esc(valor) : 'Sin capturar'}</p>
          </div>
        </article>
      </main>

      <footer class="rx-foot">
        <span>${esc(area)} \u00B7 Documento de Trabajo Interno</span>
        <span>Contenido capturado sin modificaciones</span>
      </footer>
    </div>
  `;
}

function ajustarReflexionCompleta() {
  const stage = document.querySelector('#slides .slide-stage');
  const slide = document.querySelector('#slides .slide');
  const contenido = slide?.querySelector('.rx');
  const envoltura = contenido?.querySelector('.rx-copy-wrap');
  const texto = contenido?.querySelector('.rx-copy');

  if (!stage || !slide || !contenido || !envoltura || !texto) return;

  const limitar = (valor, minimo, maximo) => {
    return Math.min(maximo, Math.max(minimo, valor));
  };

  const aplicarAjuste = () => {
    if (!document.body.contains(contenido)) return;

    const estiloStage = getComputedStyle(stage);
    const anchoDisponible = Math.max(
      1,
      stage.clientWidth -
        parseFloat(estiloStage.paddingLeft || 0) -
        parseFloat(estiloStage.paddingRight || 0)
    );
    const altoDisponible = Math.max(
      1,
      stage.clientHeight -
        parseFloat(estiloStage.paddingTop || 0) -
        parseFloat(estiloStage.paddingBottom || 0)
    );

    slide.style.animation = 'none';
    slide.style.boxSizing = 'border-box';
    slide.style.flex = '0 0 auto';
    slide.style.width = `${anchoDisponible}px`;
    slide.style.maxWidth = 'none';
    slide.style.height = `${altoDisponible}px`;
    slide.style.maxHeight = 'none';
    slide.style.margin = '0';
    slide.style.zoom = '1';
    slide.style.transform = 'none';
    slide.style.transformOrigin = 'top center';
    slide.style.overflow = 'hidden';

    contenido.style.width = '100%';
    contenido.style.maxWidth = 'none';
    contenido.style.height = '100%';
    contenido.style.maxHeight = 'none';

    texto.style.transform = 'none';
    texto.style.width = '100%';
    envoltura.style.alignItems = 'center';

    const longitud = String(texto.textContent || '').length;
    const saltos = (String(texto.textContent || '').match(/\n/g) || []).length;
    const base = limitar(
      Math.min(
        34,
        30 - Math.max(0, longitud - 280) / 58 - saltos * .42,
        18 + anchoDisponible / 105
      ),
      9,
      34
    );

    const aplicarMetricas = fuente => {
      const factor = limitar(fuente / 28, .55, 1.16);
      contenido.style.setProperty('--rx-copy-size', `${fuente}px`);
      contenido.style.setProperty(
        '--rx-copy-leading',
        String(limitar(1.34 + (28 - fuente) * .006, 1.34, 1.48))
      );
      contenido.style.setProperty('--rx-gap', `${limitar(18 * factor, 8, 21)}px`);
      contenido.style.setProperty('--rx-title-size', `${limitar(fuente * 1.35, 24, 42)}px`);
      contenido.style.setProperty('--rx-prompt-size', `${limitar(fuente * .54, 10, 17)}px`);
      contenido.style.setProperty('--rx-meta-label-size', `${limitar(fuente * .36, 8, 11)}px`);
      contenido.style.setProperty('--rx-meta-value-size', `${limitar(fuente * .5, 10, 16)}px`);
      contenido.style.setProperty('--rx-card-pad-y', `${limitar(fuente * 1.05, 10, 34)}px`);
      contenido.style.setProperty('--rx-card-pad-x', `${limitar(fuente * 1.35, 14, 44)}px`);
    };

    const cabe = () => {
      const tolerancia = 1;
      return texto.scrollHeight <= envoltura.clientHeight + tolerancia &&
        texto.scrollWidth <= envoltura.clientWidth + tolerancia &&
        contenido.scrollHeight <= contenido.clientHeight + tolerancia &&
        contenido.scrollWidth <= contenido.clientWidth + tolerancia;
    };

    let minimo = 7;
    let maximo = Math.max(minimo, base);
    let mejor = minimo;

    aplicarMetricas(minimo);

    for (let intento = 0; intento < 10; intento++) {
      const candidato = (minimo + maximo) / 2;
      aplicarMetricas(candidato);

      if (cabe()) {
        mejor = candidato;
        minimo = candidato;
      } else {
        maximo = candidato;
      }
    }

    aplicarMetricas(mejor);

    /*
       Respaldo para textos excepcionalmente extensos: se conserva el contenido
       completo dentro del rectangulo, sin barras ni recorte visual.
    */
    if (!cabe()) {
      aplicarMetricas(7);
      envoltura.style.alignItems = 'flex-start';

      const escala = limitar(
        Math.min(
          envoltura.clientHeight / Math.max(1, texto.scrollHeight),
          envoltura.clientWidth / Math.max(1, texto.scrollWidth)
        ),
        .05,
        1
      );

      texto.style.transform = `scale(${escala})`;
    }
  };

  aplicarAjuste();
  requestAnimationFrame(() => {
    aplicarAjuste();
    requestAnimationFrame(aplicarAjuste);
  });
  setTimeout(aplicarAjuste, 180);
  setTimeout(aplicarAjuste, 500);

  if (!ajustarReflexionCompleta._escuchaResize) {
    ajustarReflexionCompleta._escuchaResize = true;

    window.addEventListener('resize', () => {
      if (document.querySelector('#slides .rx')) {
        ajustarReflexionCompleta();
      }
    });
  }
}

const ORDEN_SECCIONES_PRESENTACION = ['reflexion', 'reflexionPersonal', 'cierre', 'qqc', 'kpis', 'okrs'];
const seccionesPresentacionOrdenadas = () => ORDEN_SECCIONES_PRESENTACION
  .map(clave => clave === 'reflexionPersonal' ? ['reflexionPersonal', RP_SECCION_PERSONAL.nombre, RP_SECCION_PERSONAL.icon] : SECTIONS.find(seccion => seccion[0] === clave))
  .filter(Boolean);

const Slides = {
  list: [],
  i: 0,
  dir: 1,

  cmp: {
    sel: new Set(),
    per: ''
  },

  build(onlyArea) {
    const global = globales();

    const areas = onlyArea
      ? [onlyArea]
      : areasFiltradas();

    const lista = [];

    /* Portada general */
    if (!onlyArea) {
      lista.push({
        area: '',
        sec: 'Portada',
        html: `
          <div class="slide-cover">
            <img
              src="${esc(CONFIG.LOGIN.LOGO)}"
              alt="Logo"
              class="slide-logo"
            >

            <span class="eyebrow">
              ${esc(S().empresa || '')} \u00B7 ${esc(unidadFiltroActual()?.nombre || '')} \u00B7 Portafolio estrat\u00E9gico
            </span>

            <h1>${esc(CONFIG.LOGIN.TITULO)}</h1>

            <p><b>Periodos independientes por secci\u00F3n</b></p><p class="small">${esc(Calc.resumenPeriodosAnalisis())}</p>

            <p>
              ${areas.length}
              ${areas.length === 1 ? '\u00E1rea' : '\u00E1reas'} \u00B7
              ${global.nInd} indicadores de cierre \u00B7
              ${global.nAcc} acciones \u00B7
              ${global.nKpi} KPIs
              ${activeFilters() ? ' \u00B7 con filtros aplicados' : ''}
            </p>

            <div class="kpi-grid" style="max-width:980px">
              ${kpiCard(
                'Cumplimiento promedio',
                global.cumpl,
                'pct',
                'Global',
                semClass(Calc.semaforoAuto(global.cumpl))
              )}

              ${kpiCard(
                'Verde / Amarillo / Rojo',
                global.nInd,
                'int',
                `${global.verde} \u00B7 ${global.amarillo} \u00B7 ${global.rojo}`
              )}

              ${kpiCard(
                'Acciones completadas',
                global.comp,
                'pct',
                `${global.conCuando} con CU\u00C1NDO`
              )}

            </div>
          </div>
        `
      });

      /* El comparativo queda como diapositiva 2 */
      lista.push({
        area: '',
        sec: 'Comparativo de cumplimiento',
        html: cmpSlideHTML(),
        after: mountCmpSlide
      });
    }

    /* Diapositivas de cada \u00E1rea */
    areas.forEach(area => {
      lista.push({
        area,
        sec: 'Portada del \u00E1rea',
        html: `
          <div class="slide-cover">
            ${areaSlideHTML(area)}
          </div>
        `
      });

      seccionesPresentacionOrdenadas().forEach(([clave, titulo]) => {
        if (clave === 'cierre') {
          lista.push({
            area,
            sec: Calc.tituloPeriodoAnalisis(titulo, clave),
            html: cierreSlideHTML(area),
            after: ajustarCierreCompleto
          });
        } else if (clave === 'qqc') {
          lista.push({
            area,
            sec: Calc.tituloPeriodoAnalisis(titulo, clave),
            html: planAccionesCriticasSlideHTML(area),
            after: ajustarPlanAccionesCriticas
          });
        } else if (clave === 'kpis') {
          lista.push({
            area,
            sec: Calc.tituloPeriodoAnalisis(titulo, clave),
            html: kpisSlideHTML(area),
            after: ajustarKpisSlide
          });
        } else if (clave === 'reflexionPersonal') {
          lista.push({area, sec: 'Reflexión Personal', html: rpAnteportadaHTML(area, 'Reflexión Personal')});
          const campos = RP_SECCION_PERSONAL.cols.filter(c => c.t !== 'area');
          campos.forEach((campo, indice) => lista.push({area, sec: 'Reflexión Personal · ' + campo.l, html: reflexionSlideHTML(area, campo, indice, campos.length, 'Reflexión Personal'), after: ajustarReflexionCompleta}));
        } else if (clave === 'reflexion') {
          lista.push({area, sec: 'Reflexión de Área', html: rpAnteportadaHTML(area, 'Reflexión de Área')});
          const campos = camposReflexionPresentacion();

          campos.forEach((campo, indice) => {
            lista.push({
              area,
              sec: `${Calc.tituloPeriodoAnalisis(titulo, clave)} \u00B7 ${campo.l}`,
              html: reflexionSlideHTML(area, campo, indice, campos.length),
              after: ajustarReflexionCompleta
            });
          });
        } else {
          lista.push({ area, sec: Calc.tituloPeriodoAnalisis(titulo, clave), html: sectionHTML(clave, area, true) });
        }
      });
    });

    this.list = lista;
  },

  open(onlyArea) {
    if (!UI.filters.unidadId) {
      toast('Selecciona primero una unidad de negocio en el Dashboard.', 'error');
      return;
    }

    this.cmp = {      sel: new Set(areasFiltradas()),
      per: ''
    };

    this.build(onlyArea);

    this.i = 0;
    this.dir = 1;
    lastFocus = document.activeElement;

    const contenedor = $('#slides');

    contenedor.hidden = false;
    document.body.style.overflow = 'hidden';

    try {
      contenedor.requestFullscreen?.().catch(() => {});
    } catch (error) {
      /* La presentaci\u00F3n sigue funcionando sin pantalla completa */
    }

    this.render();

    $('#slides .slide-top button')?.focus();
  },

  close() {
    $('#slides').hidden = true;
    document.body.style.overflow = '';

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    } catch (error) {
      /* Sin acci\u00F3n */
    }

    lastFocus?.focus?.();
  },

  go(indice) {
    if (
      indice < 0 ||
      indice >= this.list.length ||
      indice === this.i
    ) {
      return;
    }

    this.dir = indice > this.i ? 1 : -1;
    this.i = indice;
    this.render();
  },

  jumpArea(direccion) {
    const areaActual = this.list[this.i].area;

    const indice =
      direccion > 0
        ? this.list.findIndex((slide, posicion) => {
            return (
              posicion > this.i &&
              slide.area &&
              slide.area !== areaActual
            );
          })
        : (() => {
            let objetivo = -1;
            let areaEncontrada = null;

            for (let posicion = this.i - 1; posicion >= 0; posicion--) {
              const area = this.list[posicion].area;

              if (!area) continue;

              if (
                area !== areaActual &&
                areaEncontrada === null
              ) {
                areaEncontrada = area;
              }

              if (
                areaEncontrada &&
                area === areaEncontrada
              ) {
                objetivo = posicion;
              }
            }

            return objetivo;
          })();

    if (indice >= 0) {
      this.go(indice);
    }
  },

  render() {
    const slideActual = this.list[this.i];

    if (!slideActual) return;

    const areas = [
      ...new Set(
        this.list
          .map(slide => slide.area)
          .filter(Boolean)
      )
    ];

    $('#slides').innerHTML = `
      <div class="slide-top">
        <button
          type="button"
          class="icon-btn"
          data-action="slideClose"
          aria-label="Salir de la presentaci\u00F3n"
        >
          ${icon('x')}
        </button>

        <div class="crumb">
          ${esc(
            slideActual.area ||
            S().empresa ||
            'Portafolio'
          )}

          <span>
            \u00B7 ${esc(slideActual.sec)}
          </span>
        </div>

        <div
          style="
            margin-left:auto;
            display:flex;
            gap:8px;
            align-items:center
          "
        >
          <label
            for="slideArea"
            class="small muted"
          >
            Ir a
          </label>

          <select
            id="slideArea"
            class="input"
            data-change="slideArea"
          >
            <option value="">\u2014</option>

            ${areas
              .map(
                area => `
                  <option
                    ${area === slideActual.area ? 'selected' : ''}
                  >
                    ${esc(area)}
                  </option>
                `
              )
              .join('')}
          </select>
        </div>
      </div>

      <div
        class="slide-stage"
        tabindex="-1"
      >
        <div
          class="slide ${this.dir > 0 ? 'nx' : 'pv'}"
          aria-live="polite"
        >
          ${slideActual.html}
        </div>
      </div>

      <div class="slide-bottom">
        <button
          type="button"
          class="btn sm"
          data-action="slidePrev"
          ${this.i === 0 ? 'disabled' : ''}
          aria-label="Anterior"
        >
          ${icon('chevL', 16)}
        </button>

        <span
          class="small"
          style="
            min-width:70px;
            text-align:center
          "
        >
          <b>${this.i + 1}</b>
          /
          ${this.list.length}
        </span>

        <button
          type="button"
          class="btn sm"
          data-action="slideNext"
          ${this.i === this.list.length - 1 ? 'disabled' : ''}
          aria-label="Siguiente"
        >
          ${icon('chevR', 16)}
        </button>

        <div class="slide-prog">
          <i
            style="
              width:${(this.i + 1) / this.list.length * 100}%
            "
          ></i>
        </div>

        <span class="kbd">
          <kbd>\u2190</kbd><kbd>\u2192</kbd> secci\u00F3n \u00B7
          <kbd>\u2191</kbd><kbd>\u2193</kbd> \u00E1rea \u00B7
          <kbd>Esc</kbd> salir
        </span>
      </div>
    `;

    animateCounts($('#slides'));

    if (typeof slideActual.after === 'function') {
      slideActual.after();
    }
  }
};