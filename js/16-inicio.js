'use strict';
/* =======================================================================
   MÓDULO 15 · INICIO
   ======================================================================= */
(function init() {
  let theme = null; try { theme = localStorage.getItem(CONFIG.THEME_KEY); } catch (e) {}
  document.documentElement.dataset.theme = theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (!Store.load()) { Store.state = sampleData(); Store.save(); }
  Auth.load();
  if (Auth.restore()) { $('#app').hidden = false; UI.area = Auth.areas()[0] || null; renderAll(); setSaveStatus('ok'); }
  else renderLogin();
})();
