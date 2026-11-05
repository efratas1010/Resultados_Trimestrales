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

  const periodos = [
    ...new Set(
      rows
        .map(r => {
          if (!r.anio) return '';

          if (r.tipoPer === 'Trimestral') {
            return `${r.trimPer || ''} ${r.anio}`.trim();
          }

          return `Anual ${r.anio}`;
        })
        .filter(Boolean)
    )
  ];

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
         fijan tamaños pequeños. Las métricas se calculan con el alto y ancho
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
        <h2>Cierre de resultados</h2>
      </div>

      <div class="cx-meta">
        <b>Comit\u00E9 Directivo</b>
        <span>${esc(periodos.join(' \u00B7 ') || 'Periodo sin definir')}</span>
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
        <span class="ax-eyebrow">Direcci\u00F3n / \u00E1rea</span>
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
          <h2>Cumplimiento \u00B7 Cierre de resultados</h2>
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
                `${global.conCuando} con CUÁNDO`
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

      SECTIONS.forEach(([clave, titulo]) => {
        if (clave === 'cierre') {
          lista.push({
            area,
            sec: titulo,
            html: cierreSlideHTML(area),
            after: ajustarCierreCompleto
          });
        } else {
          lista.push({ area, sec: titulo, html: sectionHTML(clave, area, true) });
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