'use strict';
/* =======================================================================
   MÓDULO 13b · USUARIOS, ROLES Y SESIÓN
   Nota: sin backend, los usuarios viven en el navegador (localStorage).
   Controla accesos dentro de la herramienta, pero NO es seguridad de servidor.
   ======================================================================= */
const hash = (str, seed = 2026) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
const pwHash = (id, p) => hash(id + '|' + p) + hash(p + '|' + id, 77);
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const fmtDT = iso => iso ? new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Nunca';

const Auth = {
  db: null, user: null, fails: 0, lockUntil: 0,
  load() {
    try { const raw = localStorage.getItem(CONFIG.USERS_KEY); if (raw) this.db = JSON.parse(raw); } catch (e) { console.warn(e); }
    if (!this.db || !Array.isArray(this.db.users) || !this.db.users.length) {
      this.db = { log: [], users: CONFIG.USUARIOS_INICIALES.map(u => { const id = uid(); return { id, puesto: '', activo: true, debeCambiar: true, ultimoAcceso: '', ...u, hash: pwHash(id, CONFIG.CLAVE_INICIAL) }; }) };
      this.persist();
    }
    this.db.log ||= [];
  },
  persist() { try { localStorage.setItem(CONFIG.USERS_KEY, JSON.stringify(this.db)); } catch (e) { toast('No se pudo guardar la información de usuarios.', 'error'); } },
  log(accion, detalle = '') { this.db.log.unshift({ t: new Date().toISOString(), u: this.user?.nombre || 'Sistema', accion, detalle }); this.db.log = this.db.log.slice(0, 300); this.persist(); },
  restore() { try { const id = sessionStorage.getItem(CONFIG.SESSION_KEY); const u = this.db.users.find(x => x.id === id && x.activo); if (u) this.user = u; } catch (e) {} return !!this.user; },
  login(usuario, pass) {
    if (Date.now() < this.lockUntil) return `Demasiados intentos. Espera ${Math.ceil((this.lockUntil - Date.now()) / 1000)} s.`;
    const u = this.db.users.find(x => norm(x.usuario) === norm(usuario));
    if (!u || u.hash !== pwHash(u.id, pass)) { if (++this.fails >= 5) { this.lockUntil = Date.now() + 30000; this.fails = 0; } return 'Usuario o contraseña incorrectos.'; }
    if (!u.activo) return 'Tu usuario está desactivado. Contacta a Planeación Estratégica.';
    this.fails = 0; this.user = u; u.ultimoAcceso = new Date().toISOString();
    try { sessionStorage.setItem(CONFIG.SESSION_KEY, u.id); } catch (e) {}
    this.log('Inicio de sesión'); return '';
  },
  logout() { this.log('Cierre de sesión'); this.user = null; try { sessionStorage.removeItem(CONFIG.SESSION_KEY); } catch (e) {} },
  isAdmin() { return this.user?.rol === 'admin'; },
  /* Accesos por Unidad de negocio -> Area */
  accesos() {
    if (this.isAdmin()) {
      return (S().unidadesNegocio || []).flatMap(unidad =>
        (unidad.areas || []).map(area => ({ unidadId: unidad.id, areaId: area.id }))
      );
    }
    return Array.isArray(this.user?.accesos) ? this.user.accesos : [];
  },
  canAccess(unidadId, areaId) {
    if (this.isAdmin()) return true;
    return this.accesos().some(acceso => acceso.unidadId === unidadId && acceso.areaId === areaId);
  },
  unidades() {
    const unidades = S().unidadesNegocio || [];
    if (this.isAdmin()) return unidades;
    return unidades.filter(unidad =>
      (unidad.areas || []).some(area => this.canAccess(unidad.id, area.id))
    );
  },
  areasUnidad(unidadId) {
    const unidad = (S().unidadesNegocio || []).find(item => item.id === unidadId);
    if (!unidad) return [];
    if (this.isAdmin()) return unidad.areas || [];
    return (unidad.areas || []).filter(area => this.canAccess(unidad.id, area.id));
  },
  /* Compatibilidad temporal con pantallas antiguas */
  areas() {
    if (this.isAdmin()) return [...S().areas];
    const nombres = [];
    (S().unidadesNegocio || []).forEach(unidad => {
      (unidad.areas || []).forEach(area => {
        if (this.canAccess(unidad.id, area.id) && !nombres.includes(area.nombre)) nombres.push(area.nombre);
      });
    });
    if (!nombres.length && Array.isArray(this.user?.areas)) {
      return S().areas.filter(area => this.user.areas.includes(area));
    }
    return nombres;
  },
  canArea(area) {
    if (this.isAdmin()) return true;
    const matches = (S().unidadesNegocio || []).flatMap(unidad =>
      (unidad.areas || []).filter(item => item.nombre === area).map(item => ({ unidadId: unidad.id, areaId: item.id }))
    );
    // Los nombres duplicados no identifican un registro de forma inequívoca.
    if (matches.length > 1) return false;
    if (matches.length === 1) return this.canAccess(matches[0].unidadId, matches[0].areaId);
    return this.areas().includes(area);
  },
  defaultPw() { const a = this.db.users.find(x => x.usuario === 'admin'); return a && a.hash === pwHash(a.id, CONFIG.CLAVE_INICIAL); }
};

/* ----- Pantalla de inicio de sesión ----- */
function renderLogin(msg = '') {
  $('#app').hidden = true; $('#slides').hidden = true; closeModal();
  const L = $('#login'); L.hidden = false; L.className = 'login lg';
  const C = CONFIG.LOGIN;
  L.innerHTML = `
    <div class="lg-bg" style="background-image:url('${esc(C.FONDO)}')" aria-hidden="true"></div>
       <div class="lg-shade" aria-hidden="true"></div>
    <div class="lg-lema"><h2>${esc(C.LEMA || '').replace(/\*(.+?)\*/g, '<em>$1</em>')}</h2></div>
    <div class="lg-card" id="loginCard">
      <img src="${esc(C.LOGO)}" alt="Logo ${esc(S().empresa || '')}" class="lg-logo">
      <h1>Inicio de sesión</h1>
      <form id="loginForm" novalidate>
        <label for="lgU">Usuario</label>
        <input id="lgU" class="input" name="u" autocomplete="username" autocapitalize="none" spellcheck="false">
        <label for="lgP">Contraseña</label>
        <div class="pw"><input id="lgP" class="input" type="password" name="p" autocomplete="current-password" style="padding-right:46px"><button type="button" class="icon-btn" data-action="togglePw" data-for="lgP" aria-label="Mostrar u ocultar contraseña">${icon('eye', 16)}</button></div>
        <div class="err" id="lgErr" role="alert">${esc(msg)}</div>
        <button class="lg-btn" type="submit">Iniciar sesión</button>
      </form>
      <p class="lg-help">¿Olvidaste tu contraseña? Solicítala a Planeación Estratégica.</p>
    </div>
    <div class="lg-tag"><span>${esc(C.EMPRESAS)}</span><strong>${esc(C.TITULO)}</strong></div>`;
  setTimeout(() => $('#lgU')?.focus(), 50);
}
function doLogin(form) {
  const err = Auth.login(form.u.value.trim(), form.p.value);
  if (err) { $('#lgErr').textContent = err; const c = $('#loginCard'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); form.p.value = ''; form.p.focus(); return; }
  enterApp();
  if (Auth.user.debeCambiar) setTimeout(() => openAccount(true), 500);
}
function enterApp() {
  $('#login').hidden = true; $('#login').innerHTML = ''; $('#app').hidden = false;
  UI.view = 'inicio'; UI.area = Auth.areas()[0] || null; UI.sheet = 'cierre';
  renderAll(); setSaveStatus('ok');
  const nombreSesion = String(Auth.user?.nombre || Auth.user?.nombreCompleto || Auth.user?.displayName || Auth.user?.usuario || '').trim();
  toast(`${greet()}, ${nombreSesion.split(/\s+/)[0] || 'bienvenido'}`, 'ok');
}
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };

/* ----- Pantalla principal (Inicio) ----- */
function renderInicio() {
  const u = Auth.user, admin = Auth.isAdmin();
  const unidades = admin ? (S().unidadesNegocio || []) : Auth.unidades();
  const nombre = String(u?.nombre || u?.nombreCompleto || u?.displayName || u?.usuario || '').trim();
  const puesto = String(u?.puesto || CONFIG.ROLES[u?.rol]?.nombre || '').trim();
  const rol = CONFIG.ROLES[u?.rol]?.nombre || u?.rol || '';
  const fecha = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const capitalizar = texto => texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '';
  const claseAvance = p => p >= 85 ? 'ok' : p >= 50 ? 'mid' : 'low';

  const unidadesHTML = unidades.map((unidad, unidadIndex) => {
    const areas = admin ? (unidad.areas || []) : Auth.areasUnidad(unidad.id);
    const avances = areas.map(area => Math.max(0, Math.min(100, Math.round(Calc.avanceArea(area.nombre, unidad.id, area.id)))));
    const promedio = avances.length ? Math.round(avg(avances)) : 0;
    return `<article class="home-unit ${unidadIndex % 2 ? 'producer' : ''}" style="--unit-delay:${unidadIndex * 70}ms">
      <header class="home-unit-head">
        <span class="home-unit-icon">${icon(unidadIndex % 2 ? 'layers' : 'chart', 17)}</span>
        <div><h3>${esc(unidad.nombre)}</h3><small>${areas.length} ${areas.length === 1 ? 'área' : 'áreas'}</small></div>
        <span class="home-unit-total ${claseAvance(promedio)}" title="Avance general de ${esc(unidad.nombre)}">${promedio}%</span>
      </header>
      ${areas.length ? `<div class="home-bars" role="list" aria-label="Avance de ${esc(unidad.nombre)}">${areas.map((area, i) => {
        const p = avances[i], estado = claseAvance(p);
        return `<button type="button" class="home-bar ${estado}" data-action="goArea" data-unidad="${esc(unidad.id)}" data-area-id="${esc(area.id)}" data-area="${esc(area.nombre)}" role="listitem" aria-label="${esc(area.nombre)}: ${p}% de captura">
          <strong>${p}%</strong><span class="home-bar-track"><i style="height:${p}%"></i></span><small>${esc(area.nombre)}</small>
        </button>`;
      }).join('')}</div>` : `<div class="home-unit-empty">${icon('info', 16)} Las áreas aparecerán aquí al agregarlas.</div>`}
    </article>`;
  }).join('');

  $('#view-inicio').innerHTML = `
    <div class="chanitos-home" style="--home-bg:url('../assets/almacen-chanitos.jpeg')">
      <div class="home-shade" aria-hidden="true"></div>
      <div class="home-date">${esc(capitalizar(fecha))}</div>
      <div class="home-user-chip">
        <span class="avatar">${initials(nombre)}</span><div><b>${esc(nombre)}</b><small>${esc(rol)}</small></div>
        <button type="button" class="home-icon-btn" data-action="myAccount" aria-label="Perfil y contraseña" title="Perfil y contraseña">${icon('key', 15)}</button>
        <button type="button" class="home-icon-btn" data-action="logout" aria-label="Cerrar sesión" title="Cerrar sesión">${icon('logout', 15)}</button>
      </div>

      <section class="home-welcome" aria-labelledby="homeWelcomeTitle">
        <span class="home-kicker">Plataforma Estratégica · Frutas Chanitos</span>
        <p>${greet()}</p>
        <h1 id="homeWelcomeTitle"><span>¡Bienvenido de nuevo,</span>${esc(nombre)}!</h1>
        ${puesto ? `<strong class="home-position">${esc(puesto)}</strong>` : ''}
                <blockquote>“Cultivamos energía natural para alcanzar tus sueños,<br>ese es nuestro porqué.”</blockquote>
      </section>

      ${Auth.user.debeCambiar ? `<div class="home-password" role="note">${icon('key', 16)}<span><b>Cambia tu contraseña inicial.</b></span><button type="button" data-action="myAccount">Cambiar ahora</button></div>` : ''}

      ${admin ? `<section class="home-monitor" aria-labelledby="homeMonitorTitle">
        <header class="home-monitor-head"><div><span>Monitor compacto</span><h2 id="homeMonitorTitle">Avance por unidad de negocio</h2></div><p>Captura completada por área</p></header>
        <div class="home-units">${unidadesHTML || `<div class="home-monitor-empty">${icon('layers', 18)} Las unidades y sus áreas aparecerán automáticamente al configurarlas.</div>`}</div>
      </section>` : `<button type="button" class="home-edit-cta" data-action="nav" data-view="registro">${icon('pen', 18)}<span><b>Ir a Edición</b><small>Captura la información de tus áreas</small></span>${icon('arrowR', 18)}</button>`}

      <footer class="home-footer"><span>Cultivamos energía… cosechamos sueños.</span><b>Frutas Chanitos</b></footer>
    </div>`;
}

function logList(items) {
  if (!items.length) return '<div class="empty-sm">Sin actividad registrada.</div>';
  return `<div class="log">${items.map(l => `<div class="log-item"><span class="avatar sm">${initials(l.u)}</span><div><b>${esc(l.accion)}</b>${l.detalle ? ` <span class="muted">· ${esc(l.detalle)}</span>` : ''}<div class="small muted">${esc(l.u)}</div></div><span class="small muted" style="white-space:nowrap">${fmtDT(l.t)}</span></div>`).join('')}</div>`;
}

/* ----- Administración ----- */
const ADMIN_TABS = [['usuarios', 'Usuarios y accesos', 'users'], ['roles', 'Roles y permisos', 'shield'], ['bitacora', 'Bitácora', 'clock'], ['config', 'Configuración', 'sliders']];
function renderAdmin() {
  $('#view-admin').innerHTML = `<div class="tabs" role="tablist" aria-label="Administración" style="margin-top:0">${ADMIN_TABS.map(([k, l, i]) => `<button type="button" role="tab" class="tab" aria-selected="${UI.adminTab === k}" data-action="adminTab" data-tab="${k}">${icon(i, 16)}${l}</button>`).join('')}</div><div id="adminBody" class="fade-in" role="tabpanel"></div>`;
  const b = $('#adminBody');
  if (UI.adminTab === 'usuarios') b.innerHTML = usuariosHTML();
  if (UI.adminTab === 'roles') b.innerHTML = rolesHTML();
  if (UI.adminTab === 'bitacora') { b.innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div><h3>Bitácora de actividad</h3><p class="small muted" style="margin:2px 0 0">Últimos 300 movimientos: accesos, capturas, importaciones, exportaciones y cambios de usuarios.</p></div><button type="button" class="btn sm danger" data-action="clearLog">${icon('trash', 14)}Limpiar bitácora</button></div><div id="logTbl"></div></div>`;
    mountTable($('#logTbl'), { id: 'log', rows: Auth.db.log, cols: [{ l: 'Fecha', val: r => r.t, html: r => `<span style="white-space:nowrap">${fmtDT(r.t)}</span>` }, { l: 'Usuario', val: r => r.u, html: r => `<span style="display:flex;gap:8px;align-items:center"><span class="avatar sm">${initials(r.u)}</span>${esc(r.u)}</span>` }, { l: 'Acción', val: r => r.accion, html: r => `<b>${esc(r.accion)}</b>` }, { l: 'Detalle', val: r => r.detalle }] }); }
  if (UI.adminTab === 'config') { b.innerHTML = '<div id="view-config"></div>'; renderConfig(); }
}
function accesoNombre(acceso) {
  const unidad = (S().unidadesNegocio || []).find(u => u.id === acceso.unidadId);
  const area = unidad?.areas?.find(a => a.id === acceso.areaId);
  return unidad && area ? `${unidad.nombre} -> ${area.nombre}` : '';
}
function accesosUsuarioHTML(usuario) {
  if (usuario.rol === 'admin') return '<span class="pill azul"><i></i>Acceso total</span>';
  const nombres = (usuario.accesos || []).map(accesoNombre).filter(Boolean);
  if (!nombres.length) return '<span class="tag danger">Sin accesos</span>';
  return `<div class="chips">${nombres.map(nombre => `<span class="pill">${esc(nombre)}</span>`).join('')}</div>`;
}
function usuariosHTML() {
  const us = Auth.db.users;
  const totalAreas = (S().unidadesNegocio || []).reduce((n, u) => n + (u.areas || []).length, 0);
  const cubiertas = new Set();
  us.filter(u => u.activo && u.rol === 'direccion').forEach(u =>
    (u.accesos || []).forEach(a => cubiertas.add(`${a.unidadId}|${a.areaId}`))
  );
  const sin = Math.max(0, totalAreas - cubiertas.size);
  return `<div class="kpi-grid">${kpiCard('Usuarios', null, '', 'Registrados en la plataforma').replace('—', us.length)}${kpiCard('Administradores', null, '', 'Acceso total', 'oro').replace('—', us.filter(u => u.rol === 'admin').length)}${kpiCard('Direcciones', null, '', 'Captura por unidad y área').replace('—', us.filter(u => u.rol === 'direccion').length)}${kpiCard('Áreas sin usuario', null, '', sin ? 'Revisar asignaciones' : 'Todas tienen responsable', sin ? 'amarillo' : 'verde').replace('—', sin)}</div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px"><div><h3>Usuarios y accesos</h3><p class="small muted" style="margin:2px 0 0">Asigna permisos específicos por Unidad de negocio → Área.</p></div><button type="button" class="btn primary" data-action="newUser">${icon('plus', 16)}Nuevo usuario</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="static">Usuario</th><th class="static">Rol</th><th class="static">Unidades y áreas con acceso</th><th class="static">Estatus</th><th class="static">Último acceso</th><th class="static"><span style="position:absolute;left:-9999px">Acciones</span></th></tr></thead><tbody>
    ${us.map(u => `<tr><td><div style="display:flex;gap:10px;align-items:center"><span class="avatar">${initials(u.nombre)}</span><div><b>${esc(u.nombre)}</b>${u.id === Auth.user.id ? ' <span class="tag">Tú</span>' : ''}<div class="small muted">@${esc(u.usuario)}${u.puesto ? ' · ' + esc(u.puesto) : ''}</div></div></div></td>
      <td><span class="role ${u.rol}">${CONFIG.ROLES[u.rol].nombre}</span></td>
      <td>${accesosUsuarioHTML(u)}</td>
      <td><span class="pill ${u.activo ? 'verde' : ''}"><i></i>${u.activo ? 'Activo' : 'Inactivo'}</span>${u.debeCambiar ? ' <span class="tag" title="Debe cambiar su contraseña">Clave temporal</span>' : ''}</td>
      <td class="small">${fmtDT(u.ultimoAcceso)}</td>
      <td class="actions"><button type="button" class="icon-btn" data-action="editUser" data-id="${u.id}" aria-label="Editar ${esc(u.nombre)}" title="Editar">${icon('edit', 16)}</button><button type="button" class="icon-btn" data-action="resetPw" data-id="${u.id}" aria-label="Restablecer contraseña" title="Restablecer contraseña">${icon('key', 16)}</button><button type="button" class="icon-btn del" data-action="delUser" data-id="${u.id}" aria-label="Eliminar ${esc(u.nombre)}" title="Eliminar" ${u.id === Auth.user.id ? 'disabled' : ''}>${icon('trash', 16)}</button></td></tr>`).join('')}
    </tbody></table></div></div>`;
}
function rolesHTML() {
  const P = [['Ver pantalla de inicio', 1, 1], ['Capturar y editar la información de sus áreas', 1, 1], ['Editar la información de cualquier área', 1, 0], ['Importar Excel', 1, 'Solo sus áreas'], ['Exportar Excel y plantilla', 'Todo', 'Solo sus áreas'], ['Dashboard ejecutivo y vista por área', 1, 0], ['Modo presentación y exportar PDF', 1, 0], ['Crear usuarios y asignar roles y accesos', 1, 0], ['Configurar áreas, umbrales y objetivos', 1, 0], ['Consultar la bitácora', 1, 0]];
  const cell = v => v === 1 ? `<span class="perm ok">${icon('check', 14)}</span>` : v === 0 ? '<span class="perm no">—</span>' : `<span class="pill amarillo"><i></i>${esc(v)}</span>`;
  return `<div class="home-grid"><div class="card"><h3 style="margin-bottom:4px">Matriz de permisos</h3><p class="small muted" style="margin:0 0 14px">Qué puede hacer cada rol dentro de la plataforma.</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="static">Permiso</th>${Object.values(CONFIG.ROLES).map(r => `<th class="static" style="text-align:center">${r.nombre}</th>`).join('')}</tr></thead><tbody>${P.map(([p, a, d]) => `<tr><td>${p}</td><td style="text-align:center">${cell(a)}</td><td style="text-align:center">${cell(d)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h3 style="margin-bottom:4px">Mapa de accesos por área</h3><p class="small muted" style="margin:0 0 14px">Usuarios de dirección activos que pueden editar cada área.</p>
    <div class="log">${S().areas.map(a => { const us = Auth.db.users.filter(u => u.activo && u.rol === 'direccion' && u.areas.includes(a)); return `<div class="log-item" style="grid-template-columns:1fr auto"><b>${esc(a)}</b><div class="chips" style="justify-content:flex-end">${us.map(u => `<span class="pill azul" title="@${esc(u.usuario)}"><i></i>${esc(u.nombre)}</span>`).join('') || '<span class="tag danger">Sin usuario</span>'}</div></div>`; }).join('')}</div></div></div>`;
}
const fld = (k, l, input, req, full) => `<div class="field ${full ? 'full' : ''}"><label for="u_${k}">${l}${req ? ' <span class="req">*</span>' : ''}</label>${input}<span class="err" id="e_${k}"></span></div>`;
function showErrs(form, errs) { $$('.err', form).forEach(e => e.textContent = ''); $$('.input', form).forEach(i => i.setAttribute('aria-invalid', 'false')); Object.entries(errs).forEach(([k, m]) => { const e = $('#e_' + k); if (e) e.textContent = m; const i = $('#u_' + k); if (i) i.setAttribute('aria-invalid', 'true'); }); const k = Object.keys(errs)[0]; if (k) { $('#u_' + k)?.focus(); toast('Revisa los campos marcados.', 'error'); } return !k; }
function modalShell(title, sub, body, submit = 'Guardar', extraBtn = '') {
  return `<div class="modal-bg" data-action="modalBg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle"><form id="uForm" novalidate>
    <header><div><h2 id="mTitle">${title}</h2><span class="small muted">${sub}</span></div><button type="button" class="icon-btn" data-action="closeModal" aria-label="Cerrar" style="margin-left:auto">${icon('x')}</button></header>
    <div class="body">${body}</div><footer>${extraBtn}<button type="button" class="btn" data-action="closeModal">Cancelar</button><button type="submit" class="btn primary">${icon('check', 16)}${submit}</button></footer></form></div></div>`;
}
function openUserForm(id) {
  const u = id ? Auth.db.users.find(x => x.id === id) : null;
  const v = u || { nombre: '', usuario: '', puesto: '', rol: 'direccion', areas: [], accesos: [], activo: true, debeCambiar: true };
  const accesosActuales = Array.isArray(v.accesos) ? v.accesos : [];
  const tieneAcceso = (unidadId, areaId) => accesosActuales.some(a => a.unidadId === unidadId && a.areaId === areaId);
  const unidadesHTML = (S().unidadesNegocio || []).map(unidad => `
    <div class="user-access-unit">
      <div class="user-access-head"><div><b>${esc(unidad.nombre)}</b><small>Selecciona las áreas que puede editar</small></div>
        <button type="button" class="btn sm" data-access-all="${esc(unidad.id)}">Seleccionar todas</button></div>
      <div class="user-access-areas">${(unidad.areas || []).length ? (unidad.areas || []).map(area => `
        <label class="access-check"><input type="checkbox" name="accesos" value="${esc(unidad.id)}|${esc(area.id)}" data-unidad="${esc(unidad.id)}" data-area="${esc(area.id)}" ${tieneAcceso(unidad.id, area.id) ? 'checked' : ''}>
          <span></span><div><b>${esc(area.nombre)}</b><small>${esc(unidad.nombre)}</small></div></label>`).join('') : '<div class="empty-sm">Esta unidad todavía no tiene áreas.</div>'}</div>
    </div>`).join('');
  lastFocus = document.activeElement;
  $('#modalRoot').innerHTML = modalShell(u ? 'Editar usuario' : 'Nuevo usuario', 'Define el rol y los accesos por unidad de negocio y área', `
    ${fld('nombre', 'Nombre completo', `<input id="u_nombre" name="nombre" class="input" value="${esc(v.nombre)}">`, 1)}
    ${fld('usuario', 'Usuario', `<input id="u_usuario" name="usuario" class="input" value="${esc(v.usuario)}" autocomplete="off" autocapitalize="none" placeholder="ej. logistica">`, 1)}
    ${fld('puesto', 'Puesto', `<input id="u_puesto" name="puesto" class="input" value="${esc(v.puesto || '')}">`)}
    ${fld('pass', u ? 'Nueva contraseña' : 'Contraseña', `<input id="u_pass" name="pass" type="password" class="input" autocomplete="new-password" placeholder="${u ? 'Vacío = no cambiar' : 'Mínimo 8 caracteres'}">`, !u)}
    <div class="field full"><span class="flabel">Rol <span class="req">*</span></span><div class="role-pick">${Object.entries(CONFIG.ROLES).map(([k, r]) => `<label class="role-opt"><input type="radio" name="rol" value="${k}" ${v.rol === k ? 'checked' : ''}><span class="ro-ic">${icon(k === 'admin' ? 'shield' : 'pen', 18)}</span><span><b>${r.nombre}</b><small>${r.desc}</small></span></label>`).join('')}</div><span class="err" id="e_rol"></span></div>
    <div class="field full" id="u_accesosBox" ${v.rol === 'admin' ? 'hidden' : ''}><span class="flabel">Unidades y áreas con acceso <span class="req">*</span></span><p class="small muted" style="margin:3px 0 10px">Marca exactamente qué áreas puede editar dentro de cada unidad de negocio.</p><div class="user-access-list">${unidadesHTML || '<div class="empty-sm">Primero configura las unidades de negocio y sus áreas.</div>'}</div><span class="err" id="e_accesos"></span></div>
    <div class="field full"><div class="chips"><label class="chip"><input type="checkbox" name="activo" ${v.activo ? 'checked' : ''}>Usuario activo</label><label class="chip"><input type="checkbox" name="debeCambiar" ${v.debeCambiar ? 'checked' : ''}>Pedir cambio de contraseña al entrar</label></div></div>`);
  const form = $('#uForm');
  const syncRol = () => { $('#u_accesosBox').hidden = form.elements.rol.value === 'admin'; };
  form.addEventListener('change', syncRol);
  $$('[data-access-all]', form).forEach(boton => boton.addEventListener('click', () => {
    const checks = $$(`input[name="accesos"][data-unidad="${boton.dataset.accessAll}"]`, form);
    const marcar = checks.some(check => !check.checked);
    checks.forEach(check => check.checked = marcar);
    boton.textContent = marcar ? 'Quitar todas' : 'Seleccionar todas';
  }));
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const accesos = $$('input[name="accesos"]:checked', form).map(input => ({ unidadId: input.dataset.unidad, areaId: input.dataset.area }));
    const d = { nombre: form.nombre.value.trim(), usuario: form.usuario.value.trim().toLowerCase(), puesto: form.puesto.value.trim(), rol: form.elements.rol.value, accesos, areas: [], activo: form.activo.checked, debeCambiar: form.debeCambiar.checked };
    d.areas = [...new Set(d.accesos.map(accesoNombre).filter(Boolean).map(n => n.split(' -> ').pop()))];
    const pass = form.pass.value, e = {};
    if (!d.nombre) e.nombre = 'Campo obligatorio';
    if (!/^[a-z0-9._-]{3,30}$/.test(d.usuario)) e.usuario = 'De 3 a 30 caracteres: letras, números, punto o guion';
    else if (Auth.db.users.some(x => x.usuario === d.usuario && x.id !== u?.id)) e.usuario = 'Ese usuario ya existe';
    if ((!u || pass) && pass.length < 8) e.pass = 'Mínimo 8 caracteres';
    if (d.rol === 'direccion' && !d.accesos.length) e.accesos = 'Asigna al menos una unidad y un área';
    const otrosAdmins = Auth.db.users.filter(x => x.rol === 'admin' && x.activo && x.id !== u?.id).length;
    if (u?.rol === 'admin' && (d.rol !== 'admin' || !d.activo) && !otrosAdmins) e.rol = 'Debe existir al menos un administrador activo';
    if (u?.id === Auth.user.id && !d.activo) e.rol = 'No puedes desactivar tu propio usuario';
    if (!showErrs(form, e)) return;
    if (d.rol === 'admin') { d.accesos = []; d.areas = []; }
    if (u) { Object.assign(u, d); if (pass) u.hash = pwHash(u.id, pass); }
    else { const nid = uid(); Auth.db.users.push({ id: nid, ...d, ultimoAcceso: '', hash: pwHash(nid, pass) }); }
    const detalle = d.rol === 'admin' ? 'Acceso total' : d.accesos.map(accesoNombre).filter(Boolean).join(', ');
    Auth.log(u ? 'Usuario editado' : 'Usuario creado', `${d.nombre} · ${CONFIG.ROLES[d.rol].nombre} · ${detalle}`);
    closeModal(); renderAll(); toast(u ? 'Usuario actualizado' : 'Usuario creado', 'ok');
  });
  setTimeout(() => $('#u_nombre')?.focus(), 30);
}
function openAccount(forced) {
  lastFocus = document.activeElement;
  $('#modalRoot').innerHTML = modalShell('Cambiar contraseña', forced ? 'Estás usando una contraseña temporal; crea una personal.' : esc(Auth.user.nombre), `
    ${fld('actual', 'Contraseña actual', '<input id="u_actual" name="actual" type="password" class="input" autocomplete="current-password">', 1, 1)}
    ${fld('nueva', 'Nueva contraseña', '<input id="u_nueva" name="nueva" type="password" class="input" autocomplete="new-password" placeholder="Mínimo 8 caracteres">', 1)}
    ${fld('conf', 'Confirmar', '<input id="u_conf" name="conf" type="password" class="input" autocomplete="new-password">', 1)}`, 'Cambiar contraseña');
  const form = $('#uForm');
  form.addEventListener('submit', ev => {
    ev.preventDefault(); const u = Auth.user, e = {};
    if (u.hash !== pwHash(u.id, form.actual.value)) e.actual = 'La contraseña actual no coincide';
    if (form.nueva.value.length < 8) e.nueva = 'Mínimo 8 caracteres';
    else if (form.nueva.value === form.actual.value) e.nueva = 'Debe ser distinta a la actual';
    if (form.conf.value !== form.nueva.value) e.conf = 'No coincide';
    if (!showErrs(form, e)) return;
    u.hash = pwHash(u.id, form.nueva.value); u.debeCambiar = false; Auth.log('Cambio de contraseña');
    closeModal(); renderAll(); toast('Contraseña actualizada', 'ok');
  });
  setTimeout(() => $('#u_actual')?.focus(), 30);
}