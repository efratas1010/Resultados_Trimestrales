'use strict';
/* Adaptador Supabase. La base remota es la fuente de verdad.
   Los borradores incompletos se mantienen en memoria y NO se anuncian como guardados.
   Nunca se leen ni sobrescriben las claves legacy de localStorage. */
const Cloud = {
  client: null, baseline: {}, periods: [], objectives: [], ready: false,
  pending: false, saving: false, timer: null, draftCount: 0,
  specs: {
    cierre: {table:'cierre_resultados', map:{indicador:'indicador',unidad:'unidad_medida',sentido:'sentido',meta:'meta',real:'real',semaforo:'semaforo_forzado',comentarios:'comentarios'}, required:['indicador','meta','real'], nums:['meta','real']},
    qqc: {table:'quien_que_cuando',map:{cierreId:'cierre_resultado_id',semaforo:'semaforo_origen',indicador:'indicador_problema',accion:'accion',responsable:'responsable',cuando:'cuando_texto',resultado:'resultado_esperado',estatus:'estatus',observaciones:'observaciones'},required:['cierreId','semaforo','indicador'],nullable:['accion','responsable','cuando','resultado','estatus','observaciones'],nums:[]},
    kpis: {table:'kpis',map:{kpi:'kpi',unidad:'unidad_medida',base:'linea_base',meta:'meta',frecuencia:'frecuencia',formula:'formula_fuente',responsable:'responsable',t1:'meta_t1',t2:'meta_t2',t3:'meta_t3',t4:'meta_t4'},required:['kpi','meta','frecuencia','responsable'],nums:['base','meta','t1','t2','t3','t4']},
    reflexion: {table:'reflexiones',map:{logros:'logros',aprendizajes:'aprendizajes',obstaculos:'obstaculos',distinto:'que_hariamos_distinto',apoyos:'apoyos_necesarios'},required:[],nums:[]},
    okrs: {table:'okrs',map:{objetivo:'objetivo',kr:'key_result',base:'linea_base',meta:'meta',unidad:'unidad_medida',responsable:'responsable'},required:['objetivo','kr','meta','responsable','alineacion'],nums:['base','meta']}
  },
  async checked(request) { const r = await request; if(r.error) throw new Error(r.error.message); return r.data; },
  async all(table) {
    const result=[];
    for(let offset=0;;offset+=500){
      let query=this.client.from(table).select('*');

      /*
         El Cierre debe conservar la secuencia de origen. Antes se ordenaba
         siempre por UUID (`id`), lo que cambiaba la posicion de los
         indicadores al recargar y esa secuencia alterada llegaba intacta a
         filtros, dashboard y presentacion. La tabla no tiene una columna
         funcional de orden; `creado_en` es la unica secuencia de origen
         persistida disponible. `id` solo desempata sin usar nombre, valor,
         cumplimiento ni semaforo.
      */
      if(table==='cierre_resultados') {
        query=query.order('creado_en',{ascending:true}).order('id',{ascending:true});
      } else {
        const order = table==='accesos_usuario_area' ? 'usuario_id' : 'id';
        query=query.order(order);
        if(table==='accesos_usuario_area') query=query.order('area_id');
      }

      const rows=await this.checked(query.range(offset,offset+499));
      result.push(...rows); if(rows.length<500) return result;
    }
  },
  profile(p, accesses) { return {id:p.id,nombre:p.nombre_completo,usuario:p.correo||p.usuario||'',correo:p.correo,puesto:p.puesto,rol:p.rol,activo:p.activo,debeCambiar:p.debe_cambiar_contrasena,ultimoAcceso:p.ultimo_acceso_en,accesos:accesses.filter(a=>a.usuario_id===p.id).map(a=>({unidadId:a.unidad_negocio_id,areaId:a.area_id})),areas:[]}; },
  async load() {
    const auth=await this.checked(this.client.auth.getUser());
    const me=await this.checked(this.client.from('perfiles').select('*').eq('id',auth.user.id).single());
    if(!me.activo) throw new Error('Tu perfil est\u00E1 inactivo.');
    const tables=['configuracion_plataforma','umbrales_semaforo','unidades_negocio','areas','periodos','objetivos_estrategicos','perfiles','accesos_usuario_area',...Object.values(this.specs).map(s=>s.table)];
    const values=await Promise.all(tables.map(t=>this.all(t)));
    const db=Object.fromEntries(tables.map((t,i)=>[t,values[i]]));
    const state=Store.empty(); state.sample=false; state.empresa=db.configuracion_plataforma[0]?.empresa||CONFIG.EMPRESA;
    state.umbrales={verde:Number(db.umbrales_semaforo[0]?.verde_desde??95),amarillo:Number(db.umbrales_semaforo[0]?.amarillo_desde??85)};
    this.periods=db.periodos; this.objectives=db.objetivos_estrategicos;
    state.objetivos=this.objectives.filter(o=>o.activo).sort((a,b)=>a.orden-b.orden).map(o=>o.nombre);
    state.unidadesNegocio=db.unidades_negocio.filter(u=>u.activa).sort((a,b)=>a.orden-b.orden).map(u=>({id:u.id,nombre:u.nombre,areas:db.areas.filter(a=>a.activa&&a.unidad_negocio_id===u.id).sort((a,b)=>a.orden-b.orden).map(a=>({id:a.id,nombre:a.nombre}))}));
    state.areas=[...new Set(state.unidadesNegocio.flatMap(u=>u.areas.map(a=>a.nombre)))];
    for(const [key,spec] of Object.entries(this.specs)) {
      state.data[key]=db[spec.table].map(row=>{
        const a=db.areas.find(a=>a.id===row.area_id),u=db.unidades_negocio.find(u=>u.id===a?.unidad_negocio_id),p=db.periodos.find(p=>p.id===row.periodo_id);
        const r={id:row.id,areaId:row.area_id,area:a?.nombre||'',unidadNegocioId:u?.id||'',unidadNegocio:u?.nombre||'',anio:String(p?.anio||''),tipoPer:p?.tipo||'',trimPer:p?.trimestre||''};
        for(const [local,remote] of Object.entries(spec.map)) r[local]=row[remote]??'';
        if(key==='cierre') r.semaforo=row.semaforo_forzado||'Autom\u00E1tico';
        if(key==='okrs') r.alineacion=this.objectives.find(o=>o.id===row.objetivo_estrategico_id)?.nombre||'';
        return r;
      });
    }
    Store.state=state;
    Auth.db={users:db.perfiles.map(p=>this.profile(p,db.accesos_usuario_area)),log:[]};
    Auth.user=Auth.db.users.find(p=>p.id===me.id);
    Auth.db.users.forEach(u=>u.areas=[...new Set(u.accesos.map(x=>db.areas.find(a=>a.id===x.areaId)?.nombre).filter(Boolean))]);
    if(Auth.isAdmin()) {
      const logs=await this.checked(this.client.from('bitacora_actividad').select('*').order('ocurrido_en',{ascending:false}).limit(300));
      Auth.db.log=logs.map(l=>({t:l.ocurrido_en,u:l.correo_usuario||'Sistema',accion:l.accion,detalle:l.detalle||l.tabla||''}));
    }
    this.baseline={};
    for(const [t,rows] of Object.entries(db)) this.baseline[t]=new Map(rows.map(r=>[String(r.id),r]));
    this.ready=true;this.pending=false;this.draftCount=0;
  },
  uuid(obj) { if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(obj.id))) obj.id=crypto.randomUUID(); return obj.id; },
  uuidOrdenado(posicion=0) {
    const compacto=crypto.randomUUID().replace(/-/g,'').split('');
    const tiempo=(Date.now()+posicion).toString(16).padStart(12,'0').slice(-12);
    for(let i=0;i<12;i++) compacto[i]=tiempo[i];
    compacto[12]='7';
    compacto[16]=((parseInt(compacto[16],16)&3)|8).toString(16);
    const h=compacto.join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  },
  serialize(key,r) {
    const spec=this.specs[key];
    if(spec.required.some(k=>r[k]===null||r[k]===undefined||String(r[k]).trim()==='')) return null;
    if(!r.areaId||!r.unidadNegocioId) return null;
    const unit=S().unidadesNegocio.find(u=>u.id===r.unidadNegocioId);
    if(!unit?.areas.some(a=>a.id===r.areaId)) return null;
    const p=this.periods.find(p=>String(p.anio)===String(r.anio)&&p.tipo===r.tipoPer&&(p.trimestre||'')===(r.tipoPer==='Trimestral'?r.trimPer:''));
    if(!p) return null;
    const row={id:this.uuid(r),area_id:r.areaId,periodo_id:p.id};
    for(const [local,remote] of Object.entries(spec.map)) {
      let v=r[local];
      if(spec.nums.includes(local)){v=v===''||v==null?null:toNum(v);if((v===null&&r[local]!==''&&r[local]!=null)||(v!==null&&!Number.isFinite(v)))return null;}
      else if(v==null||String(v).trim()==='') v=(spec.nullable||[]).includes(local)?null:'';
      else v=String(v);
      if(key==='cierre'&&local==='semaforo') v=['Verde','Amarillo','Rojo'].includes(v)?v:null;
      row[remote]=v;
    }
    if(key==='okrs'){
      const obj=this.objectives.find(o=>o.nombre===r.alineacion);if(!obj)return null;row.objetivo_estrategico_id=obj.id;
    }
    return row;
  },
  plan() {
    const operations=[], drafts=[];
    const add=(table,row)=>{
      const old=this.baseline[table]?.get(String(row.id));
      if(old&&Object.keys(row).every(k=>JSON.stringify(row[k])===JSON.stringify(old[k])))return;
      operations.push({table,op:old?'update':'insert',row,expected:old?.actualizado_en||null});
    };
    const remove=(table,ids)=>{
      for(const [id,old] of this.baseline[table]||[]) if(old.activa!==false&&!ids.has(id))operations.push({table,op:'delete',row:{id:old.id},expected:old.actualizado_en||null});
    };
    if(Auth.isAdmin()){
      const units=new Set(),areas=new Set();
      S().unidadesNegocio.forEach((u,i)=>{
        this.uuid(u);units.add(u.id);
        const old=this.baseline.unidades_negocio?.get(u.id);
        add('unidades_negocio',{id:u.id,codigo:old?.codigo||'u-'+u.id,nombre:u.nombre,orden:i,activa:true});
        u.areas.forEach((a,j)=>{this.uuid(a);areas.add(a.id);add('areas',{id:a.id,unidad_negocio_id:u.id,nombre:a.nombre,orden:j,activa:true});});
      });
      add('configuracion_plataforma',{id:true,empresa:S().empresa});
      add('umbrales_semaforo',{id:true,verde_desde:Number(S().umbrales.verde),amarillo_desde:Number(S().umbrales.amarillo)});
      S().objetivos.forEach((name,i)=>{
        let o=this.objectives.find(o=>o.nombre===name);
        if(!o){o={id:crypto.randomUUID(),nombre:name};this.objectives.push(o);}
        add('objetivos_estrategicos',{id:o.id,nombre:name,orden:i,activo:true});
      });
      for(const o of this.objectives)if(!S().objetivos.includes(o.nombre)&&this.baseline.objetivos_estrategicos?.has(o.id))add('objetivos_estrategicos',{id:o.id,nombre:o.nombre,activo:false});
      this.catalogDeletes=()=>{remove('areas',areas);remove('unidades_negocio',units);};
    }
    let posicionCierreNuevo=0;
    for(const [key,spec] of Object.entries(this.specs)) {
      const ids=new Set();
      for(const r of S().data[key]){
        /*
           Los cierres nuevos reciben un UUID temporalmente ordenable antes de
           insertarse. Asi, incluso cuando un lote comparte `creado_en`, el
           desempate por `id` conserva la secuencia del arreglo de origen.
        */
        if(key==='cierre'&&!this.baseline[spec.table]?.has(String(r.id))){
          const version=String(r.id).replace(/-/g,'')[12];
          if(version!=='7') r.id=this.uuidOrdenado(posicionCierreNuevo);
          posicionCierreNuevo++;
        }
        const row=this.serialize(key,r);ids.add(String(r.id));
        if(!row){drafts.push(`${SHEET(key).corto}: ${r.indicador||r.kpi||r.nombre||r.objetivo||r.area||'fila incompleta'}`);continue;}
        add(spec.table,row);
      }
      remove(spec.table,ids);
    }
    // Elimina dependientes antes que cat\u00E1logos.
    if(Auth.isAdmin())this.catalogDeletes();
    const rank=t=>t==='quien_que_cuando'?0:t==='areas'?2:t==='unidades_negocio'?3:1;
    const inserts=operations.filter(o=>o.op!=='delete'),deletes=operations.filter(o=>o.op==='delete').sort((a,b)=>rank(a.table)-rank(b.table));
    return {operations:[...inserts,...deletes],drafts};
  },
  schedule() { if(!this.ready)return;this.pending=true;setSaveStatus('saving');clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),600); },
  async flush() {
    if(!this.ready||this.saving)return;
    this.saving=true;this.pending=false;this.failed=false;
    try{
      const {operations,drafts}=this.plan();this.draftCount=drafts.length;
      if(operations.length){
        const result=await this.checked(this.client.rpc('guardar_lote_portafolio',{p_operaciones:operations}));
        for(const item of result){
          const map=this.baseline[item.table]||=new Map();
          if(item.op==='delete')map.delete(String(item.id));else map.set(String(item.row.id),item.row);
        }
      }
      if(drafts.length){
        setSaveStatus('error');$('#saveStatus .txt').textContent=`${drafts.length} borrador(es) sin enviar`;
        $('#saveStatus').title='Completa los campos y el periodo. Borradores solo en memoria: se pierden al recargar.';
      }else{setSaveStatus('ok');$('#saveStatus .txt').textContent='Guardado en Supabase';}
    }catch(e){this.failed=true;this.pending=true;setSaveStatus('error');toast('No se guard\u00F3 en Supabase: '+e.message,'error');console.error(e);}
    finally{this.saving=false;if(this.pending&&!this.failed){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),600);}}
  },
  async adminUser(payload) {
    const {data,error}=await this.client.functions.invoke('usuarios-admin',{body:payload});
    if(error||data?.error)throw new Error(data?.error||error.message);
    return data;
  }
};

// Sustituciones controladas de persistencia y autenticaci\u00F3n.
Store.load=()=>false;
Store.save=()=>Cloud.schedule();
Auth.load=()=>{Auth.db={users:[],log:[]};};
Auth.persist=()=>{};
Auth.restore=()=>false;
Auth.login=()=>{throw new Error('Utiliza el acceso de Supabase.');};
Auth.log=(accion,detalle='')=>{
  if(!Cloud.ready||!Auth.user)return;
  Auth.db.log.unshift({t:new Date().toISOString(),u:Auth.user.nombre,accion,detalle});
  Cloud.client.rpc('registrar_evento',{p_accion:accion,p_detalle:detalle,p_contexto:{}}).then(({error})=>{if(error)console.warn('Bit\u00E1cora:',error.message);});
};

const loginOriginal=renderLogin;
renderLogin=function(msg=''){
  loginOriginal(msg);
  const input=$('#lgU');if(input){input.type='email';input.placeholder='correo@empresa.com';input.autocomplete='username';}
  const label=document.querySelector('label[for="lgU"]');if(label)label.textContent='Correo de Supabase';
  document.querySelectorAll('[data-action="demoUser"]').forEach(el=>el.remove());
};
doLogin=async function(form){
  const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
  try{
    if(!Cloud.client)throw new Error('No se carg\u00F3 la conexi\u00F3n de Supabase. Revisa tu conexi\u00F3n.');
    await Cloud.checked(Cloud.client.auth.signInWithPassword({email:form.u.value.trim(),password:form.p.value}));
    await Cloud.load();enterApp();Auth.log('Inicio de sesi\u00F3n');
  }catch(e){Cloud.ready=false;Auth.user=null;Store.state=Store.empty();if(Cloud.client)await Cloud.client.auth.signOut();$('#lgErr').textContent=e.message;}
  finally{if(button)button.disabled=false;}
};
Actions.logout=async()=>{
  if(Cloud.pending||Cloud.draftCount){if(!confirm('Hay cambios pendientes o borradores sin enviar. \u00BFSalir y descartarlos?'))return;}
  if(Cloud.saving)return toast('Espera a que termine el guardado.','error');
  try{await Cloud.checked(Cloud.client.auth.signOut());}catch(e){return toast(e.message,'error');}
  clearTimeout(Cloud.timer);Cloud.ready=false;Cloud.baseline={};Cloud.pending=false;Cloud.draftCount=0;Auth.user=null;Auth.db={users:[],log:[]};Store.state=Store.empty();
  if(!$('#slides').hidden)Slides.close();UI.view='inicio';UI.unidadId='';UI.areaId='';UI.homeUnidadId='';renderLogin();
};
for(const key of ['loadSample','clearSample','clearAll','clearLog','delArea','migrateLegacyArea'])Actions[key]=()=>toast('Esta acci\u00F3n legacy est\u00E1 deshabilitada en la versi\u00F3n Supabase. No se modific\u00F3 la base.','error');
Actions.resetPw=async b=>{
  const user=Auth.db.users.find(u=>u.id===b.dataset.id);if(!user)return;
  if(!confirm('\u00BFEnviar recuperaci\u00F3n de contrase\u00F1a a '+user.correo+'?'))return;
  const {error}=await Cloud.client.auth.resetPasswordForEmail(user.correo,{redirectTo:location.origin+location.pathname});
  toast(error?error.message:'Correo de recuperaci\u00F3n solicitado.',error?'error':'ok');
};
Actions.delUser=async b=>{
  if(!confirm('\u00BFEliminar esta cuenta de Supabase? Sus registros operativos se conservan.'))return;
  try{await Cloud.adminUser({op:'delete',id:b.dataset.id});await Cloud.load();renderAll();toast('Usuario eliminado','ok');}catch(e){toast(e.message,'error');}
};
openAccount=function(){
  $('#modalRoot').innerHTML=modalShell('Cambiar contrase\u00F1a','Se actualizar\u00E1 en Supabase Auth.',fld('nueva','Nueva contrase\u00F1a','<input class="input" type="password" name="nueva" id="u_nueva" minlength="8" required autocomplete="new-password">',1)+fld('confirmar','Confirmar contrase\u00F1a','<input class="input" type="password" name="confirmar" id="u_confirmar" required autocomplete="new-password">',1));
  $('#uForm').onsubmit=async e=>{e.preventDefault();const f=e.target;if(f.nueva.value.length<8||f.nueva.value!==f.confirmar.value)return toast('M\u00EDnimo 8 caracteres y ambas contrase\u00F1as iguales.','error');try{await Cloud.checked(Cloud.client.auth.updateUser({password:f.nueva.value}));closeModal();toast('Contrase\u00F1a actualizada en Supabase','ok');}catch(err){toast(err.message,'error');}};
};
openUserForm=function(id){
  if(Cloud.saving||Cloud.pending||Cloud.draftCount)return toast('Termina de guardar antes de administrar usuarios.','error');
  const u=Auth.db.users.find(u=>u.id===id);
  const selected=(unit,area)=>(u?.accesos||[]).some(a=>a.unidadId===unit&&a.areaId===area);
  const html=fld('nombre','Nombre completo',`<input class="input" name="nombre" id="u_nombre" value="${esc(u?.nombre||'')}" required>`,1)+fld('correo','Correo',`<input class="input" name="correo" type="email" id="u_correo" value="${esc(u?.correo||'')}" ${u?'readonly':''} required>`,1)+fld('puesto','Puesto',`<input class="input" name="puesto" id="u_puesto" value="${esc(u?.puesto||'')}">`)+(!u?fld('pass','Contrase\u00F1a inicial','<input class="input" name="pass" id="u_pass" type="password" minlength="8" required autocomplete="new-password">',1):'')+`<div class="field"><label>Rol</label><select class="input" name="rol"><option value="direccion">Direcci\u00F3n</option><option value="admin" ${u?.rol==='admin'?'selected':''}>Administrador</option></select></div><div class="field"><label><input type="checkbox" name="activo" ${!u||u.activo?'checked':''}> Activo</label></div><div class="field full">${S().unidadesNegocio.map(unit=>`<fieldset><legend>${esc(unit.nombre)}</legend>${unit.areas.map(a=>`<label style="display:block;padding:6px"><input type="checkbox" name="acceso" data-unidad="${esc(unit.id)}" value="${esc(a.id)}" ${selected(unit.id,a.id)?'checked':''}> ${esc(a.nombre)}</label>`).join('')}</fieldset>`).join('')}</div>`;
  $('#modalRoot').innerHTML=modalShell(u?'Editar usuario':'Nuevo usuario','Requiere la funci\u00F3n usuarios-admin desplegada en Supabase.',html);
  $('#uForm').onsubmit=async e=>{
    e.preventDefault();const f=e.target,button=f.querySelector('[type="submit"]');if(button)button.disabled=true;
    try{
      const accesos=[...f.querySelectorAll('[name="acceso"]:checked')].map(x=>({unidadId:x.dataset.unidad,areaId:x.value}));
      if(f.rol.value==='direccion'&&!accesos.length)throw new Error('Selecciona al menos un \u00E1rea.');
      await Cloud.adminUser({op:u?'update':'create',id:u?.id,email:f.correo.value.trim(),password:u?undefined:f.pass.value,nombre:f.nombre.value.trim(),puesto:f.puesto.value.trim(),rol:f.rol.value,activo:f.activo.checked,accesos:f.rol.value==='admin'?[]:accesos});
      await Cloud.load();closeModal();renderAll();toast('Usuario guardado en Supabase','ok');
    }catch(err){toast(err.message,'error');}finally{if(button)button.disabled=false;}
  };
};
window.addEventListener('beforeunload',e=>{if(Cloud.pending||Cloud.saving||Cloud.draftCount){e.preventDefault();e.returnValue='';}});

// Reflexi\u00F3n requiere un periodo expl\u00EDcito; no se inventa un a\u00F1o por defecto.
const panelOriginal=sheetPanel;
sheetPanel=function(area,sh){
  if(sh.key!=='reflexion')return panelOriginal(area,sh);
  const p=Cloud.periods.find(p=>p.id===UI.reflPeriodId);
  const rows=S().data.reflexion.filter(r=>r.areaId===UI.areaId&&r.unidadNegocioId===UI.unidadId&&String(r.anio)===String(p?.anio)&&r.tipoPer===p?.tipo&&(r.trimPer||'')===(p?.trimestre||''));
  const r=rows[0]||{};
  return `<div class="sheet-head"><h2>Reflexi\u00F3n del \u00E1rea</h2></div><div class="field"><label for="reflPeriodo">Periodo de esta reflexi\u00F3n</label><select id="reflPeriodo" class="input" data-change="cloudReflectionPeriod"><option value="">Selecciona periodo\u2026</option>${[...Cloud.periods].sort((a,b)=>b.anio-a.anio||a.tipo.localeCompare(b.tipo)||(a.trimestre||'').localeCompare(b.trimestre||'')).map(x=>`<option value="${x.id}" ${p?.id===x.id?'selected':''}>${x.tipo==='Anual'?'Anual':x.trimestre} ${x.anio}</option>`).join('')}</select></div>${!p?'<p>Selecciona un periodo antes de escribir.</p>':`<div class="refl-grid">${sh.cols.filter(c=>c.t!=='area').map(c=>`<div class="refl-card"><label for="rf_${c.k}"><b>${esc(c.l)}</b></label><textarea id="rf_${c.k}" class="input" data-input="refl" data-k="${c.k}">${esc(r[c.k]||'')}</textarea><span id="cnt_${c.k}">${String(r[c.k]||'').length} caracteres</span></div>`).join('')}</div>`}`;
};
Changes.cloudReflectionPeriod=el=>{UI.reflPeriodId=el.value;renderRegistro();};
onReflInput=function(el){
  const p=Cloud.periods.find(p=>p.id===UI.reflPeriodId);if(!p)return toast('Selecciona periodo.','error');
  let r=S().data.reflexion.find(r=>r.areaId===UI.areaId&&r.unidadNegocioId===UI.unidadId&&String(r.anio)===String(p.anio)&&r.tipoPer===p.tipo&&(r.trimPer||'')===(p.trimestre||''));
  if(!r){r={id:uid(),areaId:UI.areaId,unidadNegocioId:UI.unidadId,area:areaEdicionActual()?.nombre||'',unidadNegocio:unidadEdicionActual()?.nombre||'',anio:String(p.anio),tipoPer:p.tipo,trimPer:p.trimestre||''};S().data.reflexion.push(r);}
  r[el.dataset.k]=el.value;$('#cnt_'+el.dataset.k).textContent=el.value.length+' caracteres';Store.save();
};

// Excel: conserva el contexto expl\u00EDcito y no borra bloques ausentes del archivo.
exportExcel=function(vacia=false){
  if(!excelOk())return;
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
    ['Plantilla Supabase: Unidad de negocio + \u00C1rea + A\u00F1o + Tipo de periodo + Trimestre del periodo'],
    ['No cambies los encabezados. ID vac\u00EDo crea una fila; ID existente actualiza esa misma fila.'],
    ['Las filas ausentes NO se eliminan. Fechas AAAA-MM-DD. No se importan configuraci\u00F3n ni usuarios.'],
    ['Reflexi\u00F3n: solo una fila por Unidad + \u00C1rea + Periodo. Completa todos los campos obligatorios.']
  ]),'Instrucciones');
  for(const sh of SHEETS){
    const cols=sh.cols.filter(c=>!['area','anio','tipoPer','trimPer'].includes(c.k)&&c.t!=='calc');
    const headers=['ID','Unidad de negocio','\u00C1rea','A\u00F1o','Tipo de periodo','Trimestre del periodo',...cols.map(c=>c.l)];
    const rows=vacia?[]:S().data[sh.key].filter(r=>Auth.canAccess(r.unidadNegocioId,r.areaId)).map(r=>[r.id,r.unidadNegocio,r.area,r.anio,r.tipoPer,r.trimPer,...cols.map(c=>exportVal(c,r))]);
    const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);ws['!cols']=headers.map(()=>({wch:24}));XLSX.utils.book_append_sheet(wb,ws,sh.hoja);
  }
  XLSX.writeFile(wb,vacia?'Plantilla_Supabase.xlsx':'Portafolio_Supabase.xlsx');
};
importExcel=async function(file){
  if(!excelOk()||!file)return;
  if(Cloud.saving||Cloud.pending||Cloud.draftCount)return toast('Termina de guardar o descarta los borradores antes de importar.','error');
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}),changes=[],seen=new Set();
    for(const sh of SHEETS){
      const ws=wb.Sheets[sh.hoja];if(!ws)continue;
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      for(let i=0;i<rows.length;i++){
        const src=rows[i];if(Object.values(src).every(v=>String(v).trim()===''))continue;
        const context=`${sh.hoja}, fila ${i+2}`;
        const u=S().unidadesNegocio.find(u=>norm(u.nombre)===norm(src['Unidad de negocio']));
        const a=u?.areas.find(a=>norm(a.nombre)===norm(src['\u00C1rea']));
        if(!u||!a||!Auth.canAccess(u.id,a.id))throw new Error(context+': Unidad/\u00C1rea no v\u00E1lida o sin permiso.');
        const r={id:String(src.ID||'').trim()||uid(),unidadNegocioId:u.id,unidadNegocio:u.nombre,areaId:a.id,area:a.nombre,anio:String(src['A\u00F1o']||''),tipoPer:src['Tipo de periodo'],trimPer:src['Trimestre del periodo']||''};
        if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(r.id))throw new Error(context+': ID no v\u00E1lido.');
        for(const c of sh.cols){
          if(['area','anio','tipoPer','trimPer'].includes(c.k)||c.t==='calc')continue;
          let v=src[c.l]??'';
          if(c.t==='date'&&typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);v=`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
          r[c.k]=v;
        }
        const old=S().data[sh.key].find(x=>x.id===r.id);
        if(old&&(old.areaId!==r.areaId||old.unidadNegocioId!==r.unidadNegocioId))throw new Error(context+': no se permite cambiar el contexto de un ID existente.');
        if(!old&&src.ID)throw new Error(context+': ID desconocido. D\u00E9jalo vac\u00EDo para crear una fila.');
        const unique=sh.key+':'+r.id;if(seen.has(unique))throw new Error(context+': ID repetido en el archivo.');seen.add(unique);
        if(sh.key==='qqc'){
          const cierre=S().data.cierre.find(c=>c.areaId===r.areaId&&String(c.anio)===String(r.anio)&&c.tipoPer===r.tipoPer&&(c.trimPer||'')===(r.trimPer||'')&&norm(c.indicador)===norm(src.Indicador||''));
          if(!cierre)throw new Error(context+': el Indicador no coincide con un registro del Cierre en la misma Unidad, Área y periodo.');
          r.cierreId=cierre.id;r.semaforo=Calc.semaforo(cierre);r.indicador=cierre.indicador;
        }
        if(!Cloud.serialize(sh.key,r))throw new Error(context+': faltan campos obligatorios o el periodo no existe.');
        if(sh.key==='reflexion'){
          const same=S().data.reflexion.find(x=>x.areaId===r.areaId&&x.anio===r.anio&&x.tipoPer===r.tipoPer&&(x.trimPer||'')===(r.trimPer||''));
          if(same&&same.id!==r.id)throw new Error(context+': ya existe una reflexi\u00F3n para ese periodo. Exporta y conserva su ID.');
          const reflKey=`refl:${r.areaId}:${r.anio}:${r.tipoPer}:${r.trimPer}`;
          if(seen.has(reflKey))throw new Error(context+': reflexi\u00F3n repetida para el mismo periodo.');seen.add(reflKey);
        }
        changes.push({key:sh.key,r,old});
      }
    }
    if(!changes.length)return toast('No se encontraron filas para importar.','error');
    if(!confirm(`Importar ${changes.length} filas: ${changes.filter(c=>!c.old).length} nuevas y ${changes.filter(c=>c.old).length} actualizaciones. No se eliminar\u00E1n filas ausentes. \u00BFContinuar?`))return;
    for(const c of changes){if(c.old)Object.assign(c.old,c.r);else S().data[c.key].push(c.r);}
    Cloud.pending=true;await Cloud.flush();renderAll();
    if(!Cloud.failed)toast('Importaci\u00F3n guardada en Supabase.','ok');
  }catch(e){toast('No se import\u00F3: '+e.message,'error');}
};
