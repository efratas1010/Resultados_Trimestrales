
  'use strict';
/* =======================================================================
   M\u00D3DULO 1 \u00B7 CONFIGURACI\u00D3N  \u2190 Edita aqu\u00ED \u00E1reas, umbrales, listas y columnas
   ======================================================================= */
const CONFIG = {
  APP_NOMBRE: 'Portafolio Estrat\u00E9gico',
  EMPRESA: 'Frutas Chanitos',            // Se puede cambiar tambi\u00E9n desde la pantalla Configuraci\u00F3n
  ANIO_CIERRE: 2025,
  ANIO_PLAN: 2026,
  STORAGE_KEY: 'portafolio_estrategico_v1',
  THEME_KEY: 'portafolio_estrategico_tema',
  USERS_KEY: 'portafolio_estrategico_usuarios_v1',
  SESSION_KEY: 'portafolio_estrategico_sesion',

  // Roles de la plataforma
  ROLES: {
    admin: { nombre: 'Administrador', desc: 'Planeaci\u00F3n Estrat\u00E9gica: acceso total, dashboard y administraci\u00F3n' },
    direccion: { nombre: 'Direcci\u00F3n', desc: 'Captura y edita solo la informaci\u00F3n de sus \u00E1reas' }
  },
  // Portada de inicio de sesi\u00F3n (im\u00E1genes en la carpeta assets/)
  LOGIN: {
    FONDO: 'assets/fondo-login.jpg',
    LOGO: 'assets/logo-chanitos.png',
    EMPRESAS: 'Frutas Chanitos - La Santanera - G\u00E9nesis',
    TITULO: 'Junta Anual de Resultados',
    // Lema de la portada: la palabra entre *asteriscos* se muestra en dorado y cursiva
    LEMA: 'Del resultado del a\u00F1o a la *estrategia* del siguiente.'
  },
  CLAVE_INICIAL: 'Chanitos2026',
  // Usuarios que se crean la primera vez (contrase\u00F1a inicial = CLAVE_INICIAL; se pide cambiarla al entrar)
  USUARIOS_INICIALES: [
    { nombre: 'Efra\u00EDn Galv\u00E1n', usuario: 'admin', rol: 'admin', areas: [], puesto: 'Coordinador de Planeaci\u00F3n Estrat\u00E9gica' },
    { nombre: 'Direcci\u00F3n Comercial', usuario: 'comercial', rol: 'direccion', areas: ['Comercial'] },
    { nombre: 'Direcci\u00F3n de Log\u00EDstica', usuario: 'logistica', rol: 'direccion', areas: ['Log\u00EDstica'] },
    { nombre: 'Direcci\u00F3n de Operaciones', usuario: 'operaciones', rol: 'direccion', areas: ['Almac\u00E9n', 'Compra de Fruta'] }
  ],

  // \u00C1reas / direcciones (lista inicial; editable en la pantalla Configuraci\u00F3n)
  AREAS: ['Comercial', 'Compras', 'Almac\u00E9n', 'Compra de Fruta', 'Log\u00EDstica', 'Finanzas', 'Gesti\u00F3n de Talento', 'Productoras'],
  // ======================================================================
// UNIDADES DE NEGOCIO
// Estructura nueva. Por ahora trabaja en paralelo con AREAS para no
// afectar la captura, Dashboard, usuarios ni registros existentes.
// ======================================================================
UNIDADES_NEGOCIO: [
  {
    id: 'comercializadora',
    nombre: 'Comercializadora',
    areas: []
  },
  {
    id: 'productora',
    nombre: 'Productora',
    areas: []
  }
],

  // Sem\u00E1foro autom\u00E1tico: % cumplimiento \u2265 verde \u2192 Verde; \u2265 amarillo \u2192 Amarillo; menor \u2192 Rojo
  UMBRALES: { verde: 95, amarillo: 85 },

  // Objetivos estrat\u00E9gicos de la empresa (para alinear OKRs)
  OBJETIVOS_ESTRATEGICOS: ['Crecimiento rentable', 'Excelencia operativa', 'Calidad y satisfacci\u00F3n del cliente', 'Desarrollo del talento', 'Transformaci\u00F3n digital', 'Sostenibilidad'],

  // Listas desplegables
  LISTAS: {
    anios: ['2024', '2025', '2026', '2027', '2028', '2029', '2030'],
    tipoPer: ['Anual', 'Trimestral'],
    semaforo: ['Verde', 'Amarillo', 'Rojo'],
    semaforoOrigen: ['Rojo', 'Amarillo'],
    estatus: ['No iniciada', 'En proceso', 'Completada', 'Retrasada', 'Cancelada'],
    frecuencia: ['Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'],
    trimestre: ['T1', 'T2', 'T3', 'T4'],
    sentido: ['Mayor es mejor', 'Menor es mejor']
  },
  ESTATUS_COMPLETADO: 'Completada',
  ESTATUS_EXCLUIDOS_VENCIDA: ['Completada', 'Cancelada']
};

const AC = CONFIG.ANIO_CIERRE, AP = CONFIG.ANIO_PLAN;
   const SHEETS = [
  { key: 'cierre', hoja: 'Cierre', nombre: 'Cierre de resultados', corto: 'Cierre', icon: 'chart',
    ayuda: 'Resultados por indicador del periodo elegido. El % de cumplimiento y el sem\u00E1foro se calculan solos a partir de la meta, el real y el sentido del indicador.',
    cols: [
      { k: 'area', l: '\u00C1rea', t: 'area' }, { k: 'anio', l: 'A\u00F1o', t: 'select', opts: 'anios', req: 1 }, { k: 'tipoPer', l: 'Tipo de periodo', t: 'select', opts: 'tipoPer', req: 1 }, { k: 'trimPer', l: 'Trimestre del periodo', t: 'select', opts: 'trimestre' },
      { k: 'indicador', l: 'Indicador', t: 'text', req: 1, full: 1, w: 34 },
      { k: 'unidad', l: 'Unidad', t: 'text', w: 12, help: 'Ej. %, cajas, MDP, d\u00EDas' },
      { k: 'sentido', l: 'Sentido', t: 'select', opts: 'sentido', req: 1, def: 'Mayor es mejor', help: '\u00BFUn valor m\u00E1s alto es mejor (ventas) o m\u00E1s bajo es mejor (mermas, costos)?' },
      { k: 'meta', l: 'Meta', per: 1, t: 'number', req: 1 },
      { k: 'real', l: 'Real', per: 1, t: 'number', req: 1 },
      { k: 'cumplimiento', l: '% Cumplimiento', t: 'calc', fn: r => Calc.cumplimiento(r), fmt: v => fmtPct(v), num: 1 },
      { k: 'semaforo', l: 'Sem\u00E1foro', t: 'semaforo', def: 'Autom\u00E1tico', help: 'D\u00E9jalo en Autom\u00E1tico para calcularlo con los umbrales; elige un color solo si necesitas forzarlo.' },
      { k: 'comentarios', l: 'Comentarios', t: 'textarea', full: 1, w: 45 }
    ] },
  { key: 'qqc', hoja: 'Quién-Qué-Cuándo', nombre: 'PLAN DE ACCIONES CRÍTICAS | METODOLOGÍA QUIÉN - QUÉ - CUÁNDO', corto: 'Quién–Qué–Cuándo', icon: 'target',
    ayuda: 'La tabla se alimenta del Cierre de resultados. Incluye todos los rojos y los amarillos cuyo cumplimiento está en la mitad inferior de la banda amarilla: desde el umbral amarillo, inclusive, hasta el punto medio con el umbral verde, exclusivo. Es un criterio de priorización adoptado; no modifica el semáforo ni implica una tendencia.',
    source: 'cierre',
    cols: [
      { k: 'semaforo', l: 'Prioridad', t: 'calc', fn: r => r.semaforo || '', fmt: v => v || '—', w: 12 },
      { k: 'indicador', l: 'Indicador', t: 'calc', fn: r => r.indicador || '', fmt: v => v || '—', w: 30 },
      { k: 'meta', l: 'Meta', t: 'calc', fn: r => toNum(r.meta), fmt: v => fmtNum(v), num: 1, w: 13 },
      { k: 'real', l: 'Real', t: 'calc', fn: r => toNum(r.real), fmt: v => fmtNum(v), num: 1, w: 13 },
      { k: 'variacionCierre', l: 'Variación', t: 'calc', fn: r => Calc.variacionCierre(r), fmt: (v, r) => Calc.formatearVariacionCierre(r), num: 1, w: 14 },
      { k: 'cumplimiento', l: 'Cumplimiento', t: 'calc', fn: r => Calc.cumplimiento(r), fmt: v => fmtPct(v), num: 1, w: 15 },
      { k: 'responsable', l: 'QUIÉN', t: 'text', w: 24, list: 1 },
      { k: 'accion', l: 'QUÉ debe hacer', t: 'textarea', full: 1, w: 42 },
      { k: 'cuando', l: 'CUÁNDO', t: 'text', w: 22, help: 'Texto libre. Ejemplos como “Máximo 7 días” o “Máximo 15 días” no se asignan automáticamente.' },
      { k: 'resultado', l: 'Resultado esperado', t: 'textarea', full: 1, w: 38 },
      { k: 'estatus', l: 'Estatus', t: 'select', opts: 'estatus', w: 18 },
      { k: 'observaciones', l: 'Observaciones', t: 'textarea', full: 1, w: 36 }
    ] },
  { key: 'kpis', hoja: 'S\u00E1bana de KPIs', nombre: 'S\u00E1bana de KPIs', corto: 'KPIs', icon: 'grid',
    ayuda: 'Indicadores con los que el \u00E1rea se medir\u00E1 en el periodo elegido: l\u00EDnea base, meta y metas trimestrales.',
    cols: [
      { k: 'area', l: '\u00C1rea', t: 'area' }, { k: 'anio', l: 'A\u00F1o', t: 'select', opts: 'anios', req: 1 }, { k: 'tipoPer', l: 'Tipo de periodo', t: 'select', opts: 'tipoPer', req: 1 }, { k: 'trimPer', l: 'Trimestre del periodo', t: 'select', opts: 'trimestre' },
      { k: 'kpi', l: 'KPI', t: 'text', req: 1, full: 1, w: 32 },
      { k: 'unidad', l: 'Unidad', t: 'text', w: 12 },
      { k: 'base', l: 'L\u00EDnea base', t: 'number' },
      { k: 'meta', l: 'Meta', per: 1, t: 'number', req: 1 },
      { k: 'frecuencia', l: 'Frecuencia', t: 'select', opts: 'frecuencia', req: 1, def: 'Mensual' },
      { k: 'formula', l: 'F\u00F3rmula / fuente', t: 'text', full: 1, w: 36 },
      { k: 'responsable', l: 'Responsable', t: 'text', req: 1, w: 22, list: 1 },
      { k: 't1', l: 'Meta T1', t: 'number' },
      { k: 't2', l: 'Meta T2', t: 'number' },
      { k: 't3', l: 'Meta T3', t: 'number' },
      { k: 't4', l: 'Meta T4', t: 'number' },
      { k: 'variacion', l: 'Variaci\u00F3n vs base', t: 'calc', fn: r => Calc.variacion(r), fmt: v => v == null ? '\u2014' : (v > 0 ? '+' : '') + fmtPct(v), num: 1 }
    ] },
  { key: 'reflexion', hoja: 'Reflexi\u00F3n', nombre: 'Reflexi\u00F3n del \u00E1rea', corto: 'Reflexi\u00F3n', icon: 'feather', form: 1,
    ayuda: 'Reflexi\u00F3n cualitativa del a\u00F1o. Escribe con frases cortas; puedes usar una l\u00EDnea por idea.',
    cols: [
      { k: 'area', l: '\u00C1rea', t: 'area' },
      { k: 'logros', l: 'Logros', t: 'textarea', w: 50, help: '\u00BFQu\u00E9 resultados nos hacen sentir orgullosos?' },
      { k: 'aprendizajes', l: 'Aprendizajes', t: 'textarea', w: 50, help: '\u00BFQu\u00E9 aprendimos como equipo?' },
      { k: 'obstaculos', l: 'Obst\u00E1culos', t: 'textarea', w: 50, help: '\u00BFQu\u00E9 nos fren\u00F3?' },
      { k: 'distinto', l: 'Lo que har\u00EDamos distinto', t: 'textarea', w: 50, help: 'Si empez\u00E1ramos de nuevo el a\u00F1o\u2026' },
      { k: 'apoyos', l: 'Apoyos que se necesitan', t: 'textarea', w: 50, help: 'Recursos, decisiones o apoyos de otras \u00E1reas' }
    ] },
  { key: 'okrs', hoja: 'Propuesta de OKRs', nombre: 'Propuesta de OKRs', corto: 'OKRs', icon: 'flag',
    ayuda: 'Cada fila es un Key Result. Las filas con el mismo Objetivo se agrupan; se recomiendan de 2 a 5 KRs medibles por objetivo.',
    cols: [
      { k: 'area', l: '\u00C1rea', t: 'area' }, { k: 'anio', l: 'A\u00F1o', t: 'select', opts: 'anios', req: 1 }, { k: 'tipoPer', l: 'Tipo de periodo', t: 'select', opts: 'tipoPer', req: 1 }, { k: 'trimPer', l: 'Trimestre del periodo', t: 'select', opts: 'trimestre' },
      { k: 'objetivo', l: 'Objetivo', t: 'text', req: 1, full: 1, w: 40, list: 1 },
      { k: 'alineacion', l: 'Alineaci\u00F3n estrat\u00E9gica', t: 'select', opts: () => S().objetivos, req: 1, w: 26 },
      { k: 'kr', l: 'Key Result', t: 'text', req: 1, full: 1, w: 45 },
      { k: 'base', l: 'L\u00EDnea base', t: 'number' },
      { k: 'meta', l: 'Meta', per: 1, t: 'number', req: 1 },
      { k: 'unidad', l: 'Unidad', t: 'text', w: 10 },
      { k: 'responsable', l: 'Responsable', t: 'text', req: 1, w: 22, list: 1 }
    ] }
];
const SHEET = k => SHEETS.find(s => s.key === k);
