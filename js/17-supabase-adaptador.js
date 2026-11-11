'use strict';
/* Adaptador Supabase. La base remota es la fuente de verdad.
   Los borradores incompletos se mantienen en memoria y NO se anuncian como guardados.
   Nunca se leen ni sobrescriben las claves legacy de localStorage. */
const Cloud = {
  client: null, baseline: {}, periods: [], objectives: [], ready: false,
  pending: false, saving: false, timer: null, draftCount: 0, drafts: [],
  reflectionMaps: {
    reflexion: {logros:'logros',aprendizajes:'aprendizajes',obstaculos:'obstaculos',distinto:'que_hariamos_distinto',apoyos:'apoyos_necesarios'},
    reflexionPersonal: {aporteLider:'aporte_lider',evitado:'evitado',crecimiento:'crecimiento',freno:'freno',compromisoPersonal:'compromiso_personal'}
  },
  specs: {
    cierre: {table:'cierre_resultados', map:{indicador:'indicador',unidad:'unidad_medida',sentido:'sentido',meta:'meta',real:'real',semaforo:'semaforo_forzado',comentarios:'comentarios'}, required:['indicador','meta','real'], nums:['meta','real']},
    qqc: {table:'quien_que_cuando',map:{cierreId:'cierre_resultado_id',semaforo:'semaforo_origen',indicador:'indicador_problema',accion:'accion',responsable:'responsable',cuando:'cuando_texto',resultado:'resultado_esperado',estatus:'estatus',observaciones:'observaciones'},required:['cierreId','semaforo','indicador'],nullable:['accion','responsable','cuando','resultado','estatus','observaciones'],nums:[]},
    kpis: {table:'kpis',map:{kpi:'kpi',unidad:'unidad_medida',metaVerde:'meta_verde',metaAmarilla:'meta_amarilla',metaRoja:'meta_roja',responsable:'responsable'},required:['kpi','metaVerde','metaAmarilla','metaRoja','responsable'],nums:['metaVerde','metaAmarilla','metaRoja']},
    reflexion: {table:'reflexiones',map:{logros:'logros',aprendizajes:'aprendizajes',obstaculos:'obstaculos',distinto:'que_hariamos_distinto',apoyos:'apoyos_necesarios'},required:[],nums:[]},
    okrs: {table:'okrs',map:{objetivo:'objetivo',kr:'key_result',base:'linea_base',meta:'meta',unidad:'unidad_medida',responsable:'responsable'},required:['objetivo','kr','meta','responsable','alineacion'],nums:['base','meta']}
  },
  specFor(key) {
    if(key==='reflexionPersonal') return {...this.specs.reflexion,map:this.reflectionMaps.reflexionPersonal};
    return this.specs[key];
  },
  periodSheets() { return [...SHEETS,RP_SECCION_PERSONAL]; },
  dataSheets() {
    const keys=['cierre','qqc','kpis','reflexion','reflexionPersonal','okrs'];
    return keys.map(SHEET).filter(Boolean);
  },
  excelCols(sh) {
    if(sh.key!=='qqc') return sh.cols.filter(c=>!['area','anio','tipoPer','trimPer'].includes(c.k)&&c.t!=='calc');
    return [
      {k:'cierreId',l:'ID de Cierre',t:'text'},
      {k:'semaforo',l:'SemÃ¡foro origen',t:'text'},
      {k:'indicador',l:'Indicador / problema',t:'text'},
      {k:'responsable',l:'Responsable',t:'text'},
      {k:'accion',l:'AcciÃ³n',t:'textarea'},
      {k:'cuando',l:'CuÃ¡ndo',t:'text'},
      {k:'resultado',l:'Resultado esperado',t:'textarea'},
      {k:'estatus',l:'Estatus',t:'text'},
      {k:'observaciones',l:'Observaciones',t:'textarea'}
    ];
  },
  reflectionRemoteFields() { return [...Object.values(this.reflectionMaps).flatMap(m=>Object.values(m))]; },
  hasReflectionValues(row,key) { return Object.values(this.reflectionMaps[key]).some(remote=>String(row[remote]??'').trim()!==''); },
  async checked(request) { const r = await request; if(r.error) throw new Error(r.error.message); return r.data; },
  async all(table) {
    const result=[];
    let orderByCreation=['cierre_resultados','kpis','okrs'].includes(table);
    for(let offset=0;;offset+=500){
      const buildQuery=()=>{
        let query=this.client.from(table).select('*');
        if(orderByCreation) return query.order('creado_en',{ascending:true}).order('id',{ascending:true});
        const order=table==='accesos_usuario_area'?'usuario_id':'id';
        query=query.order(order);
        if(table==='accesos_usuario_area')query=query.order('area_id');
        return query;
      };
      let rows;
      try{rows=await this.checked(buildQuery().range(offset,offset+499));}
      catch(e){
        if(!orderByCreation||!/creado_en/i.test(e.message))throw e;
        orderByCreation=false;
        rows=await this.checked(buildQuery().range(offset,offset+499));
      }
      result.push(...rows);if(rows.length<500)return result;
    }
  },
  profile(p, accesses) { return {id:p.id,nombre:p.nombre_completo,usuario:p.correo||p.usuario||'',correo:p.correo,puesto:p.puesto,rol:p.rol,activo:p.activo,debeCambiar:p.debe_cambiar_contrasena,ultimoAcceso:p.ultimo_acceso_en,accesos:accesses.filter(a=>a.usuario_id===p.id).map(a=>({unidadId:a.unidad_negocio_id,areaId:a.area_id})),areas:[]}; },
  async load() {
    const auth=await this.checked(this.client.auth.getUser());
    const me=await this.checked(this.client.from('perfiles').select('*').eq('id',auth.user.id).single());
    if(!me.activo) throw new Error('Tu perfil est\u00E1 inactivo.');
    const tables=[...new Set(['configuracion_plataforma','umbrales_semaforo','unidades_negocio','areas','periodos','objetivos_estrategicos','perfiles','accesos_usuario_area',...Object.values(this.specs).map(s=>s.table)])];
    const values=await Promise.all(tables.map(t=>this.all(t)));
    const db=Object.fromEntries(tables.map((t,i)=>[t,values[i]]));
    const state=Store.empty();
    const cfg=db.configuracion_plataforma[0]||{};
    state.sample=false; state.empresa=cfg.empresa||CONFIG.EMPRESA;
    const tipoPeriodo=cfg.periodo_analisis_tipo==='Trimestral'?'Trimestral':'Anual';
    const anioConfigurado = cfg.periodo_analisis_anio ?? cfg.anio_planeacion ?? CONFIG.PERIODO_ANALISIS?.anio;
    if (anioConfigurado == null || String(anioConfigurado).trim() === '') {
      throw new Error('Falta configurar el aÃ±o del periodo de anÃ¡lisis en Supabase. No se asignarÃ¡ un aÃ±o automÃ¡ticamente.');
    }
    const periodoLegacy={
      anio:String(anioConfigurado),
      tipoPer:tipoPeriodo,
      trimPer:tipoPeriodo==='Trimestral'?String(cfg.periodo_analisis_trimestre||''):'',
      etiqueta:String(cfg.periodo_analisis_etiqueta||'')
    };
    let periodosConfigurados=cfg.periodos_analisis_seccion||{};
    if(typeof periodosConfigurados==='string'){
      try{periodosConfigurados=JSON.parse(periodosConfigurados);}catch(_){periodosConfigurados={};}
    }
    state.periodoAnalisis={...periodoLegacy};
    state.periodosAnalisis=Object.fromEntries(this.periodSheets().map(sh=>{
      const base=CONFIG.PERIODOS_ANALISIS?.[sh.key]||CONFIG.PERIODO_ANALISIS||{};
      const raw=periodosConfigurados?.[sh.key]||periodoLegacy;
      const tipo=raw.tipoPer==='Trimestral'?'Trimestral':'Anual';
      return [sh.key,{
        anio:String(raw.anio||periodoLegacy.anio||base.anio||''),
        tipoPer:tipo,
        trimPer:tipo==='Trimestral'?String(raw.trimPer||''):'',
        etiqueta:String(raw.etiqueta||'')
      }];
    }));
    state.umbrales={verde:Number(db.umbrales_semaforo[0]?.verde_desde??95),amarillo:Number(db.umbrales_semaforo[0]?.amarillo_desde??85)};
    this.periods=db.periodos; this.objectives=db.objetivos_estrategicos;
    state.objetivos=this.objectives.filter(o=>o.activo).sort((a,b)=>a.orden-b.orden).map(o=>o.nombre);
    state.unidadesNegocio=db.unidades_negocio.filter(u=>u.activa).sort((a,b)=>a.orden-b.orden).map(u=>({id:u.id,nombre:u.nombre,areas:db.areas.filter(a=>a.activa&&a.unidad_negocio_id===u.id).sort((a,b)=>a.orden-b.orden).map(a=>({id:a.id,nombre:a.nombre}))}));
    state.areas=[...new Set(state.unidadesNegocio.flatMap(u=>u.areas.map(a=>a.nombre)))];
    const baseRecord=row=>{
      const a=db.areas.find(a=>a.id===row.area_id),u=db.unidades_negocio.find(u=>u.id===a?.unidad_negocio_id),p=db.periodos.find(p=>p.id===row.periodo_id);
      return {id:row.id,areaId:row.area_id,area:a?.nombre||'',unidadNegocioId:u?.id||'',unidadNegocio:u?.nombre||'',anio:String(p?.anio||''),tipoPer:p?.tipo||'',trimPer:p?.trimestre||''};
    };
    for(const [key,spec] of Object.entries(this.specs)) {
      if(key==='reflexion')continue;
      state.data[key]=db[spec.table].map(row=>{
        const r=baseRecord(row);
        for(const [local,remote] of Object.entries(spec.map))r[local]=row[remote]??'';
        if(key==='cierre')r.semaforo=row.semaforo_forzado||'AutomÃ¡tico';
        if(key==='okrs')r.alineacion=this.objectives.find(o=>o.id===row.objetivo_estrategico_id)?.nombre||'';
        return r;
      });
    }
    state.data.reflexion=[];state.data.reflexionPersonal=[];
    for(const row of db.reflexiones){
      for(const key of ['reflexion','reflexionPersonal']){
        if(!this.hasReflectionValues(row,key))continue;
        const r=baseRecord(row);
        for(const [local,remote] of Object.entries(this.reflectionMaps[key]))r[local]=row[remote]??'';
        state.data[key].push(r);
      }
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
    this.ready=true;this.pending=false;this.draftCount=0;this.drafts=[];
    await this.loadSectionProgress();
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
    const spec=this.specFor(key);
    if(!spec)return null;
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
      const periodos=Object.fromEntries(this.periodSheets().map(sh=>[sh.key,Calc.periodoAnalisis(sh.key)]));
      const periodo=periodos.cierre;
      add('configuracion_plataforma',{
        id:true,
        empresa:S().empresa,
        periodo_analisis_anio:Number(periodo.anio),
        periodo_analisis_tipo:periodo.tipoPer,
        periodo_analisis_trimestre:periodo.tipoPer==='Trimestral'?periodo.trimPer:null,
        periodo_analisis_etiqueta:periodo.etiqueta||null,
        periodos_analisis_seccion:periodos
      });
      add('umbrales_semaforo',{id:true,verde_desde:Number(S().umbrales.verde),amarillo_desde:Number(S().umbrales.amarillo)});
      S().objetivos.forEach((name,i)=>{
        let o=this.objectives.find(o=>o.nombre===name);
        if(!o){o={id:crypto.randomUUID(),nombre:name};this.objectives.push(o);}
        add('objetivos_estrategicos',{id:o.id,nombre:name,orden:i,activo:true});
      });
      for(const o of this.objectives)if(!S().objetivos.includes(o.nombre)&&this.baseline.objetivos_estrategicos?.has(o.id))add('objetivos_estrategicos',{id:o.id,nombre:o.nombre,activo:false});
      for(const [id,old] of this.baseline.areas||[])if(old.activa!==false&&!areas.has(id))add('areas',{id:old.id,unidad_negocio_id:old.unidad_negocio_id,nombre:old.nombre,orden:old.orden,activa:false});
      for(const [id,old] of this.baseline.unidades_negocio||[])if(old.activa!==false&&!units.has(id))add('unidades_negocio',{id:old.id,codigo:old.codigo,nombre:old.nombre,orden:old.orden,activa:false});
    }
    let posicionCierreNuevo=0;
    for(const [key,spec] of Object.entries(this.specs)) {
      if(key==='reflexion')continue;
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
        if(key==='qqc'&&!S().data.cierre.some(c=>c.id===r.cierreId))continue;
        const row=this.serialize(key,r);ids.add(String(r.id));
        if(!row){drafts.push({key,areaId:r.areaId,unidadNegocioId:r.unidadNegocioId,label:`${SHEET(key)?.corto||key}: ${r.indicador||r.kpi||r.nombre||r.objetivo||r.area||'fila incompleta'}`});continue;}
        add(spec.table,row);
      }
      remove(spec.table,ids);
    }
    const reflectionIds=new Set(),combined=new Map(),seenParts=new Set();
    for(const key of ['reflexion','reflexionPersonal']){
      for(const r of S().data[key]||[]){
        reflectionIds.add(String(r.id));
        const row=this.serialize(key,r);
        if(!row){drafts.push({key,areaId:r.areaId,unidadNegocioId:r.unidadNegocioId,label:`${SHEET(key)?.corto||key}: ${r.area||'fila incompleta'}`});continue;}
        const context=`${row.area_id}|${row.periodo_id}`;
        const part=`${key}|${context}`;
        if(seenParts.has(part)){drafts.push({key,areaId:r.areaId,unidadNegocioId:r.unidadNegocioId,label:`${SHEET(key)?.corto||key}: registro repetido para el periodo`});continue;}
        seenParts.add(part);
        const oldById=this.baseline.reflexiones?.get(String(row.id));
        const oldByContext=[...(this.baseline.reflexiones?.values()||[])].find(x=>x.area_id===row.area_id&&x.periodo_id===row.periodo_id);
        const current=combined.get(context),old=oldById||oldByContext;
        const id=current?.id||old?.id||row.id;
        r.id=id;reflectionIds.add(String(id));
        const merged=current||{id,area_id:row.area_id,periodo_id:row.periodo_id,...Object.fromEntries(this.reflectionRemoteFields().map(field=>[field,old?.[field]??'']))};
        Object.assign(merged,row,{id});combined.set(context,merged);
      }
    }
    for(const row of combined.values())add('reflexiones',row);
    remove('reflexiones',reflectionIds);
    // Elimina dependientes antes que registros principales.
    const rank=t=>t==='quien_que_cuando'?0:t==='areas'?2:t==='unidades_negocio'?3:1;
    const inserts=operations.filter(o=>o.op!=='delete'),deletes=operations.filter(o=>o.op==='delete').sort((a,b)=>rank(a.table)-rank(b.table));
    return {operations:[...inserts,...deletes],drafts};
  },
  schedule() { if(!this.ready)return;this.pending=true;setSaveStatus('saving');clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),600); },
  async flush() {
    if(!this.ready||this.saving)return;
    this.saving=true;this.pending=false;this.failed=false;
    try{
      const {operations,drafts}=this.plan();this.drafts=drafts;this.draftCount=drafts.length;
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


/* Persistencia exclusiva del avance confirmado por el boton. No usa localStorage. */
Cloud.sectionProgress = [];
Cloud.sectionProgressReady = false;
Cloud.sectionProgressError = '';
Cloud.loadSectionProgress = async function() {
  this.sectionProgress = [];
  this.sectionProgressReady = false;
  this.sectionProgressError = '';
  try {
    const rows = [];
    for (let offset = 0;; offset += 500) {
      const page = await this.checked(this.client.from('avance_secciones_portafolio')
        .select('usuario_id,area_id,contexto,seccion,guardado_en')
        .eq('usuario_id', Auth.user.id)
        .order('area_id').order('contexto').order('seccion').range(offset, offset + 499));
      rows.push(...page);
      if (page.length < 500) break;
    }
    this.sectionProgress = rows;
    this.sectionProgressReady = true;
  } catch (e) {
    this.sectionProgressError = e.message;
    console.warn('Avance de secciones no disponible:', e.message);
  }
};
Cloud.saveSectionConfirmed = async function({key, areaId, unidadId, contexto}) {
  if (!this.ready || !Auth.user) throw new Error('La conexi\u00f3n no est\u00e1 lista.');
  if (!Auth.canAccess(unidadId, areaId)) throw new Error('No tienes acceso a esta unidad y \u00e1rea.');
  if (!RP_FLUJO_SECCIONES.includes(key)) throw new Error('Secci\u00f3n no v\u00e1lida.');
  const usuarioId = Auth.user.id;
  const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));
  const limite = Date.now() + 30000;
  clearTimeout(this.timer);
  while (this.saving) {
    if (Date.now() > limite) throw new Error('El guardado sigue ocupado. Intenta nuevamente.');
    await esperar(50);
  }
  if (!Auth.isAdmin() && !this.sectionProgressReady) {
    await this.loadSectionProgress();
    if (!this.sectionProgressReady) throw new Error('No se pudo consultar el avance. Instala el SQL de candados y revisa los permisos.');
  }
  this.pending = true;
  clearTimeout(this.timer);
  await this.flush();
  if (this.failed) throw new Error('Supabase rechaz\u00f3 el guardado.');
  const borradoresSeccion=(this.drafts||[]).filter(d=>d.key===key&&d.areaId===areaId&&d.unidadNegocioId===unidadId);
  if (borradoresSeccion.length) throw new Error('Hay borradores incompletos en esta secci\u00f3n. Corr\u00edgelos antes de confirmar.');
  if (this.pending || this.saving) throw new Error('A\u00fan hay cambios pendientes. Intenta nuevamente.');
  if (!this.ready || Auth.user?.id !== usuarioId) throw new Error('La sesi\u00f3n cambi\u00f3 durante el guardado.');
  if (Auth.isAdmin()) return {admin:true};
  /* La funcion SQL vuelve a comprobar permisos y secuencia en el servidor. */
  const row = await this.checked(this.client.rpc('confirmar_seccion_portafolio', {
    p_area_id: areaId, p_contexto: contexto, p_seccion: key
  }));
  if (!row || row.usuario_id !== usuarioId || row.area_id !== areaId ||
      row.contexto !== contexto || row.seccion !== key || !row.guardado_en) {
    throw new Error('No se recibi\u00f3 una confirmaci\u00f3n v\u00e1lida del avance.');
  }
  this.sectionProgress = this.sectionProgress.filter(r => !(r.usuario_id === usuarioId &&
    r.area_id === areaId && r.contexto === contexto && r.seccion === key));
  this.sectionProgress.push(row);
  return row;
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
  clearTimeout(Cloud.timer);Cloud.ready=false;Cloud.baseline={};Cloud.pending=false;Cloud.draftCount=0;Cloud.drafts=[];Auth.user=null;Auth.db={users:[],log:[]};Store.state=Store.empty();
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

// ReflexiÃ³n de Ãrea y ReflexiÃ³n Personal usan periodos independientes,
// pero se consolidan de forma segura en la tabla remota de reflexiones.

// Excel: conserva el contexto explÃ­cito, incluye las seis secciones operativas
// y no borra bloques ausentes del archivo.
exportExcel=function(vacia=false){
  if(!excelOk())return;
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
    [`Plantilla Supabase. Periodos por secciÃ³n: ${Calc.resumenPeriodosAnalisis()}`],
    ['No cambies los encabezados. ID vacÃ­o crea una fila; ID existente actualiza esa misma fila.'],
    ['En filas nuevas no se repiten AÃ±o, Tipo de periodo ni Trimestre; la aplicaciÃ³n usa la configuraciÃ³n de cada secciÃ³n.'],
    ['Las filas ausentes NO se eliminan. No se importan configuraciÃ³n ni usuarios.'],
    ['ReflexiÃ³n de Ãrea y ReflexiÃ³n Personal: una fila por Unidad + Ãrea + Periodo.'],
    ['QuiÃ©nâ€“QuÃ©â€“CuÃ¡ndo: conserva ID de Cierre para permitir exportar y reimportar sin perder la relaciÃ³n.']
  ]),'Instrucciones');
  for(const sh of Cloud.dataSheets()){
    const cols=Cloud.excelCols(sh);
    const headers=vacia
      ? ['ID','Unidad de negocio','Ãrea',...cols.map(c=>c.l)]
      : ['ID','Unidad de negocio','Ãrea','AÃ±o','Tipo de periodo','Trimestre del periodo',...cols.map(c=>c.l)];
    const rows=vacia?[]:(S().data[sh.key]||[]).filter(r=>Auth.canAccess(r.unidadNegocioId,r.areaId)).map(r=>[r.id,r.unidadNegocio,r.area,r.anio,r.tipoPer,r.trimPer,...cols.map(c=>exportVal(c,r))]);
    const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
    ws['!cols']=headers.map((h,i)=>({wch:i===0?38:Math.max(18,Math.min(42,String(h).length+4))}));
    XLSX.utils.book_append_sheet(wb,ws,sh.hoja);
  }
  XLSX.writeFile(wb,vacia?'Plantilla_Supabase.xlsx':'Portafolio_Supabase.xlsx');
};
importExcel=async function(file){
  if(!excelOk()||!file)return;
  if(Cloud.saving||Cloud.pending||Cloud.draftCount)return toast('Termina de guardar o descarta los borradores antes de importar.','error');
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}),changes=[],seen=new Set();
    for(const sh of Cloud.dataSheets()){
      const ws=wb.Sheets[sh.hoja];if(!ws)continue;
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      const cols=Cloud.excelCols(sh);
      for(let i=0;i<rows.length;i++){
        const src=rows[i];if(Object.values(src).every(v=>String(v).trim()===''))continue;
        const context=`${sh.hoja}, fila ${i+2}`;
        const u=S().unidadesNegocio.find(u=>norm(u.nombre)===norm(src['Unidad de negocio']));
        const a=u?.areas.find(a=>norm(a.nombre)===norm(src['Ãrea']));
        if(!u||!a||!Auth.canAccess(u.id,a.id))throw new Error(context+': Unidad/Ãrea no vÃ¡lida o sin permiso.');
        const id=String(src.ID||'').trim()||uid();
        const old=(S().data[sh.key]||[]).find(x=>x.id===id);
        const periodo=old?{anio:old.anio,tipoPer:old.tipoPer,trimPer:old.trimPer||''}:Calc.camposPeriodoAnalisis(sh.key);
        const r={id,unidadNegocioId:u.id,unidadNegocio:u.nombre,areaId:a.id,area:a.nombre,...periodo};
        if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(r.id))throw new Error(context+': ID no vÃ¡lido.');
        for(const c of cols){
          let v=src[c.l]??'';
          if(c.t==='date'&&typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);v=`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
          r[c.k]=v;
        }
        if(old&&(old.areaId!==r.areaId||old.unidadNegocioId!==r.unidadNegocioId))throw new Error(context+': no se permite cambiar el contexto de un ID existente.');
        if(!old&&src.ID)throw new Error(context+': ID desconocido. DÃ©jalo vacÃ­o para crear una fila.');
        const unique=sh.key+':'+r.id;if(seen.has(unique))throw new Error(context+': ID repetido en el archivo.');seen.add(unique);
        if(sh.key==='qqc'){
          const indicadorHeader=cols.find(c=>c.k==='indicador')?.l||'Indicador / problema';
          const cierreId=String(r.cierreId||'').trim();
          let cierre=(S().data.cierre||[]).find(c=>c.id===cierreId&&c.unidadNegocioId===r.unidadNegocioId&&c.areaId===r.areaId);
          if(!cierre)cierre=(S().data.cierre||[]).find(c=>c.unidadNegocioId===r.unidadNegocioId&&c.areaId===r.areaId&&Calc.coincidePeriodoAnalisis(c,'cierre')&&norm(c.indicador)===norm(src[indicadorHeader]||''));
          if(!cierre)throw new Error(context+': el ID/Indicador no coincide con un registro del Cierre de la misma Unidad y Ãrea.');
          r.cierreId=cierre.id;r.semaforo=Calc.semaforo(cierre);r.indicador=cierre.indicador;
        }
        if(!Cloud.serialize(sh.key,r))throw new Error(context+': faltan campos obligatorios o el periodo no existe.');
        if(['reflexion','reflexionPersonal'].includes(sh.key)){
          const same=(S().data[sh.key]||[]).find(x=>x.areaId===r.areaId&&String(x.anio)===String(r.anio)&&x.tipoPer===r.tipoPer&&(x.trimPer||'')===(r.trimPer||''));
          if(same&&same.id!==r.id)throw new Error(context+': ya existe un registro para ese periodo. Exporta y conserva su ID.');
          const reflKey=`${sh.key}:${r.areaId}:${r.anio}:${r.tipoPer}:${r.trimPer}`;
          if(seen.has(reflKey))throw new Error(context+': registro repetido para el mismo periodo.');seen.add(reflKey);
        }
        changes.push({key:sh.key,r,old});
      }
    }
    if(!changes.length)return toast('No se encontraron filas para importar.','error');
    if(!confirm(`Importar ${changes.length} filas: ${changes.filter(c=>!c.old).length} nuevas y ${changes.filter(c=>c.old).length} actualizaciones. No se eliminarÃ¡n filas ausentes. Â¿Continuar?`))return;
    for(const c of changes){if(c.old)Object.assign(c.old,c.r);else S().data[c.key].push(c.r);}
    Cloud.pending=true;await Cloud.flush();renderAll();
    if(!Cloud.failed)toast(Cloud.draftCount?'ImportaciÃ³n aplicada; quedan borradores sin enviar.':'ImportaciÃ³n guardada en Supabase.',Cloud.draftCount?'error':'ok');
  }catch(e){toast('No se importÃ³: '+e.message,'error');}
};