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

function cierreSlideHTML(area, pagina = 0, porPagina = 3) {
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

  const encabezado = `
    <div class="cx-head">
      <div>
        <span class="cx-eyebrow">${esc(area)}</span>
        <h2>Cierre de resultados</h2>
      </div>

      <div class="cx-meta">
        <b>Comit\u00E9 Directivo</b>
        <span>${esc(periodos.join(' \u00B7 ') || 'Periodo sin definir')}</span>
        <span>Parte ${pagina + 1} de ${Math.max(1, Math.ceil(rows.length / porPagina))} \u00B7 ${rows.length} indicadores en total</span>
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
      <div class="cx">
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
          ${data.slice(pagina * porPagina, (pagina + 1) * porPagina)
            .map(item => {
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
    <div class="cx">
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


/* Prueba reversible: ajuste visual exclusivo de las p\u00E1ginas de Cierre. */
function ajustarCierrePrueba() {
  const stage = document.querySelector('#slides .slide-stage');
  const slide = stage?.querySelector('.slide');
  const contenido = slide?.querySelector('.cx');
  if (!stage || !slide || !contenido) return;
  const estilo = getComputedStyle(stage);
  const ancho = Math.max(1, stage.clientWidth - parseFloat(estilo.paddingLeft || 0) - parseFloat(estilo.paddingRight || 0));
  const alto = Math.max(1, stage.clientHeight - parseFloat(estilo.paddingTop || 0) - parseFloat(estilo.paddingBottom || 0));
  slide.style.animation = 'none';
  slide.style.transform = 'none';
  const rect = slide.getBoundingClientRect();
  const escala = Math.min(1, ancho / Math.max(1, rect.width), alto / Math.max(1, slide.scrollHeight, rect.height));
  slide.style.transformOrigin = 'top center';
  slide.style.transform = `scale(${escala})`;
  stage.style.overflow = 'hidden';
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
                `${global.venc} vencidas`
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
          const cantidad = F.get('cierre').filter(r => r.area === area).length;
          const partes = Math.max(1, Math.ceil(cantidad / 3));
          for (let pagina = 0; pagina < partes; pagina++) {
            lista.push({ area, sec: `${titulo} \u00B7 ${pagina + 1} de ${partes}`,
              html: cierreSlideHTML(area, pagina, 3), after: ajustarCierrePrueba });
          }
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