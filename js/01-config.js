
  'use strict';
/* =======================================================================
   MÓDULO 1 · CONFIGURACIÓN  ← Edita aquí áreas, umbrales, listas y columnas
   ======================================================================= */
const CONFIG = {
  APP_NOMBRE: 'Portafolio Estratégico',
  EMPRESA: 'Frutas Chanitos',            // Se puede cambiar también desde la pantalla Configuración
  ANIO_CIERRE: 2025,
  ANIO_PLAN: 2026,
  STORAGE_KEY: 'portafolio_estrategico_v1',
  THEME_KEY: 'portafolio_estrategico_tema',
  USERS_KEY: 'portafolio_estrategico_usuarios_v1',
  SESSION_KEY: 'portafolio_estrategico_sesion',

  // Roles de la plataforma
  ROLES: {
    admin: { nombre: 'Administrador', desc: 'Planeación Estratégica: acceso total, dashboard y administración' },
    direccion: { nombre: 'Dirección', desc: 'Captura y edita solo la información de sus áreas' }
  },
  // Portada de inicio de sesión (imágenes en la carpeta assets/)
  LOGIN: {
    FONDO: 'assets/fondo-login.jpg',
    LOGO: 'assets/logo-chanitos.png',
    EMPRESAS: 'Frutas Chanitos - La Santanera - Génesis',
    TITULO: 'Junta Anual de Resultados',
    // Lema de la portada: la palabra entre *asteriscos* se muestra en dorado y cursiva
    LEMA: 'Del resultado del año a la *estrategia* del siguiente.'
  },
  CLAVE_INICIAL: 'Chanitos2026',
  // Usuarios que se crean la primera vez (contraseña inicial = CLAVE_INICIAL; se pide cambiarla al entrar)
  USUARIOS_INICIALES: [
    { nombre: 'Efraín Galván', usuario: 'admin', rol: 'admin', areas: [], puesto: 'Coordinador de Planeación Estratégica' },
    { nombre: 'Dirección Comercial', usuario: 'comercial', rol: 'direccion', areas: ['Comercial'] },
    { nombre: 'Dirección de Logística', usuario: 'logistica', rol: 'direccion', areas: ['Logística'] },
    { nombre: 'Dirección de Operaciones', usuario: 'operaciones', rol: 'direccion', areas: ['Almacén', 'Compra de Fruta'] }
  ],

  // Áreas / direcciones (lista inicial; editable en la pantalla Configuración)
  AREAS: ['Comercial', 'Compras', 'Almacén', 'Compra de Fruta', 'Logística', 'Finanzas', 'Gestión de Talento', 'Productoras'],
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

  // Semáforo automático: % cumplimiento ≥ verde → Verde; ≥ amarillo → Amarillo; menor → Rojo
  UMBRALES: { verde: 95, amarillo: 85 },

  // Objetivos estratégicos de la empresa (para alinear OKRs)
  OBJETIVOS_ESTRATEGICOS: ['Crecimiento rentable', 'Excelencia operativa', 'Calidad y satisfacción del cliente', 'Desarrollo del talento', 'Transformación digital', 'Sostenibilidad'],

  // Listas desplegables
  LISTAS: {
    anios: ['2024', '2025', '2026', '2027', '2028', '2029', '2030'],
    tipoPer: ['Anual', 'Trimestral'],
    semaforo: ['Verde', 'Amarillo', 'Rojo'],
    semaforoOrigen: ['Rojo', 'Amarillo'],
    estatus: ['No iniciada', 'En proceso', 'Completada', 'Retrasada', 'Cancelada'],
    prioridad: ['Alta', 'Media', 'Baja'],
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
    ayuda: 'Resultados por indicador del periodo elegido. El % de cumplimiento y el semáforo se calculan solos a partir de la meta, el real y el sentido del indicador.',
    cols: [
      { k: 'area', l: 'Área', t: 'area' }, { k: 'anio', l: 'Año', t: 'select', opts: 'anios', req: 1 }, { k: 'tipoPer', l: 'Tipo de periodo', t: 'select', opts: 'tipoPer', req: 1 }, { k: 'trimPer', l: 'Trimestre del periodo', t: 'select', opts: 'trimestre' },
      { k: 'indicador', l: 'Indicador', t: 'text', req: 1, full: 1, w: 34 },
      { k: 'unidad', l: 'Unidad', t: 'text', w: 12, help: 'Ej. %, cajas, MDP, días' },
      { k: 'sentido', l: 'Sentido', t: 'select', opts: 'sentido', req: 1, def: 'Mayor es mejor', help: '¿Un valor más alto es mejor (ventas) o más bajo es mejor (mermas, costos)?' },
      { k: 'meta', l: 'Meta', per: 1, t: 'number', req: 1 },
      { k: 'real', l: 'Real', per: 1, t: 'number', req: 1 },
      { k: 'cumplimiento', l: '% Cumplimiento', t: 'calc', fn: r => Calc.cumplimiento(r), fmt: v => fmtPct(v), num: 1 },
      { k: 'semaforo', l: 'Semáforo', t: 'semaforo', def: 'Automático', help: 'Déjalo en Automático para calcularlo con los umbrales; elige un color solo si necesitas forzarlo.' },
      { k: 'comentarios', l: 'Comentarios', t: 'textarea', full: 1, w: 45 }
    ] },
  { key: 'qqc', hoja: 'Quién-Qué-Cuándo', nombre: 'Quién – Qué – Cuándo', corto: 'Quién–Qué–Cuándo', icon: 'target',
    ayuda: 'Plan de acción para los indicadores en rojo y amarillo críticos: causa raíz, acción, responsable y fecha compromiso.',
    cols: [
      { k: 'area', l: 'Área', t: 'area' }, { k: 'anio', l: 'Año', t: 'select', opts: 'anios', req: 1 }, { k: 'tipoPer', l: 'Tipo de periodo', t: 'select', opts: 'tipoPer', req: 1 }, { k: 'trimPer', l: 'Trimestre del periodo', t: 'select', opts: 'trimestre' },
      { k: 'semaforo', l: 'Semáforo origen', t: 'select', opts: 'semaforoOrigen', req: 1, def: 'Rojo', help: 'Color del indicador que origina la acción' },
      { k: 'indicador', l: 'Indicador / problema', t: 'text', req: 1, w: 30, list: 1 },
      { k: 'causa', l: 'Causa raíz', t: 'textarea', req: 1, full: 1, w: 40 },
      { k: 'accion', l: 'Acción', t: 'textarea', req: 1, full: 1, w: 45 },
      { k: 'responsable', l: 'Responsable', t: 'text', req: 1, w: 22, list: 1 },
      { k: 'fecha', l: 'Fecha compromiso', t: 'date', req: 1, w: 14 },
      { k: 'estatus', l: 'Estatus', t: 'select', opts: 'estatus', req: 1, def: 'No iniciada' },
      { k: 'avance', l: '% Avance', t: 'percent', def: 0, help: '0 a 100' },
      { k: 'trimestre', l: 'Trimestre', t: 'calc', fn: r => trimestreDe(r.fecha), fmt: v => v || '—' }
    ] },
  { key: 'propuestas', hoja: 'Propuestas', nombre: 'Propuestas', corto: 'Propuestas', icon: 'bulb',
    ayuda: 'Iniciativas, proyectos o mejoras que el área propone para el periodo elegido.',
    cols: [
      { k: 'area', l: 'Área', t: 'area' }, { k: 'anio', l: 'Año', t: 'select', opts: 'anios', req: 1 }, { k: 'tipoPer', l: 'Tipo de periodo', t: 'select', opts: 'tipoPer', req: 1 }, { k: 'trimPer', l: 'Trimestre del periodo', t: 'select', opts: 'trimestre' },
      { k: 'nombre', l: 'Nombre de la iniciativa', t: 'text', req: 1, full: 1, w: 32 },
      { k: 'descripcion', l: 'Descripción', t: 'textarea', req: 1, full: 1, w: 45 },
      { k: 'beneficio', l: 'Beneficio esperado', t: 'textarea', req: 1, full: 1, w: 40 },
      { k: 'prioridad', l: 'Prioridad', t: 'select', opts: 'prioridad', req: 1, def: 'Media' },
      { k: 'responsable', l: 'Responsable', t: 'text', req: 1, w: 22, list: 1 },
      { k: 'trimestre', l: 'Trimestre de arranque', t: 'select', opts: 'trimestre' }
    ] },
  { key: 'kpis', hoja: 'Sábana de KPIs', nombre: 'Sábana de KPIs', corto: 'KPIs', icon: 'grid',
    ayuda: 'Indicadores con los que el área se medirá en el periodo elegido: línea base, meta y metas trimestrales.',
    cols: [
      { k: 'area', l: 'Área', t: 'area' }, { k: 'anio', l: 'Año', t: 'select', opts: 'anios', req: 1 }, { k: 'tipoPer', l: 'Tipo de periodo', t: 'select', opts: 'tipoPer', req: 1 }, { k: 'trimPer', l: 'Trimestre del periodo', t: 'select', opts: 'trimestre' },
      { k: 'kpi', l: 'KPI', t: 'text', req: 1, full: 1, w: 32 },
      { k: 'unidad', l: 'Unidad', t: 'text', w: 12 },
      { k: 'base', l: 'Línea base', t: 'number' },
      { k: 'meta', l: 'Meta', per: 1, t: 'number', req: 1 },
      { k: 'frecuencia', l: 'Frecuencia', t: 'select', opts: 'frecuencia', req: 1, def: 'Mensual' },
      { k: 'formula', l: 'Fórmula / fuente', t: 'text', full: 1, w: 36 },
      { k: 'responsable', l: 'Responsable', t: 'text', req: 1, w: 22, list: 1 },
      { k: 't1', l: 'Meta T1', t: 'number' },
      { k: 't2', l: 'Meta T2', t: 'number' },
      { k: 't3', l: 'Meta T3', t: 'number' },
      { k: 't4', l: 'Meta T4', t: 'number' },
      { k: 'variacion', l: 'Variación vs base', t: 'calc', fn: r => Calc.variacion(r), fmt: v => v == null ? '—' : (v > 0 ? '+' : '') + fmtPct(v), num: 1 }
    ] },
  { key: 'reflexion', hoja: 'Reflexión', nombre: 'Reflexión del área', corto: 'Reflexión', icon: 'feather', form: 1,
    ayuda: 'Reflexión cualitativa del año. Escribe con frases cortas; puedes usar una línea por idea.',
    cols: [
      { k: 'area', l: 'Área', t: 'area' },
      { k: 'logros', l: 'Logros', t: 'textarea', w: 50, help: '¿Qué resultados nos hacen sentir orgullosos?' },
      { k: 'aprendizajes', l: 'Aprendizajes', t: 'textarea', w: 50, help: '¿Qué aprendimos como equipo?' },
      { k: 'obstaculos', l: 'Obstáculos', t: 'textarea', w: 50, help: '¿Qué nos frenó?' },
      { k: 'distinto', l: 'Lo que haríamos distinto', t: 'textarea', w: 50, help: 'Si empezáramos de nuevo el año…' },
      { k: 'apoyos', l: 'Apoyos que se necesitan', t: 'textarea', w: 50, help: 'Recursos, decisiones o apoyos de otras áreas' }
    ] },
  { key: 'okrs', hoja: 'Propuesta de OKRs', nombre: 'Propuesta de OKRs', corto: 'OKRs', icon: 'flag',
    ayuda: 'Cada fila es un Key Result. Las filas con el mismo Objetivo se agrupan; se recomiendan de 2 a 5 KRs medibles por objetivo.',
    cols: [
      { k: 'area', l: 'Área', t: 'area' }, { k: 'anio', l: 'Año', t: 'select', opts: 'anios', req: 1 }, { k: 'tipoPer', l: 'Tipo de periodo', t: 'select', opts: 'tipoPer', req: 1 }, { k: 'trimPer', l: 'Trimestre del periodo', t: 'select', opts: 'trimestre' },
      { k: 'objetivo', l: 'Objetivo', t: 'text', req: 1, full: 1, w: 40, list: 1 },
      { k: 'alineacion', l: 'Alineación estratégica', t: 'select', opts: () => S().objetivos, req: 1, w: 26 },
      { k: 'kr', l: 'Key Result', t: 'text', req: 1, full: 1, w: 45 },
      { k: 'base', l: 'Línea base', t: 'number' },
      { k: 'meta', l: 'Meta', per: 1, t: 'number', req: 1 },
      { k: 'unidad', l: 'Unidad', t: 'text', w: 10 },
      { k: 'responsable', l: 'Responsable', t: 'text', req: 1, w: 22, list: 1 }
    ] }
];
const SHEET = k => SHEETS.find(s => s.key === k);
