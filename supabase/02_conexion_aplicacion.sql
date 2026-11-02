-- Ejecutar DESPUÉS del esquema original. No reinstala ni borra tablas.
begin;
create or replace function public.guardar_lote_portafolio(p_operaciones jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  item jsonb; t text; op text; r jsonb; result jsonb := '[]'::jsonb;
  cols text; vals text; sets text; actual jsonb; n integer;
  permitidas text[] := array['unidades_negocio','areas','objetivos_estrategicos','configuracion_plataforma','umbrales_semaforo','cierre_resultados','quien_que_cuando','propuestas_sin_inversiones','kpis','reflexiones','okrs'];
begin
  if auth.uid() is null then raise exception 'Se requiere sesión autenticada'; end if;
  if jsonb_typeof(p_operaciones) <> 'array' or jsonb_array_length(p_operaciones)>5000 then raise exception 'Lote no válido'; end if;
  for item in select value from jsonb_array_elements(p_operaciones) loop
    t:=item->>'table';op:=item->>'op';r:=item->'row';
    if t is null or not(t=any(permitidas)) or op is null or op not in ('insert','update','delete') then raise exception 'Operación no permitida'; end if;
    if jsonb_typeof(r)<>'object' or not(r?'id') then raise exception 'Fila sin identificador'; end if;
    if exists(select 1 from jsonb_object_keys(r) k where k in ('creado_en','actualizado_en','creado_por','actualizado_por','cumplimiento','variacion_vs_base')) then raise exception 'Columna reservada'; end if;
    if exists(select 1 from jsonb_object_keys(r) k where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=t and c.column_name=k and c.is_generated='NEVER')) then raise exception 'Columna no válida'; end if;
    if op in ('update','delete') then
      execute format('select to_jsonb(x) from public.%I x where id::text=$1 for update',t) into actual using r->>'id';
      if actual is null then raise exception 'Registro no disponible o sin permiso en %',t; end if;
      if item->>'expected' is null or (actual->>'actualizado_en')::timestamptz <> (item->>'expected')::timestamptz then
        raise exception 'Conflicto: otro usuario cambió %. Recarga antes de continuar.',t;
      end if;
    end if;
    select string_agg(format('%I',key),',' order by key),string_agg(format('p.%I',key),',' order by key),string_agg(format('%I=p.%I',key,key),',' order by key) into cols,vals,sets from jsonb_object_keys(r) key;
    if op='insert' then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) p returning to_jsonb(%I.*)',t,cols,vals,t,t) into actual using r;
    elsif op='update' then
      execute format('update public.%I x set %s from jsonb_populate_record(null::public.%I,$1) p where x.id=p.id returning to_jsonb(x.*)',t,sets,t) into actual using r;
      get diagnostics n=row_count;if n<>1 then raise exception 'No se pudo actualizar %',t;end if;
    else
      execute format('delete from public.%I where id::text=$1',t) using r->>'id';
      get diagnostics n=row_count;if n<>1 then raise exception 'No se pudo eliminar %',t;end if;
      actual:=null;
    end if;
    result:=result||jsonb_build_array(jsonb_build_object('table',t,'op',op,'id',r->>'id','row',actual));
  end loop;
  return result;
end;$$;
revoke all on function public.guardar_lote_portafolio(jsonb) from public,anon;
grant execute on function public.guardar_lote_portafolio(jsonb) to authenticated;

-- Solo service_role (Edge Function) puede aplicar perfil + permisos atómicamente.
create or replace function public.aplicar_perfil_accesos(p_id uuid,p_nombre text,p_puesto text,p_rol public.rol_plataforma,p_activo boolean,p_accesos jsonb)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare a jsonb;
begin
  if nullif(btrim(p_nombre),'') is null then raise exception 'Nombre obligatorio';end if;
  if jsonb_typeof(p_accesos)<>'array' then raise exception 'Accesos no válidos';end if;
  update public.perfiles set nombre_completo=p_nombre,puesto=coalesce(p_puesto,''),rol=p_rol,activo=p_activo where id=p_id;
  if not found then raise exception 'Perfil no encontrado';end if;
  delete from public.accesos_usuario_area where usuario_id=p_id;
  if p_rol='direccion' then
    if jsonb_array_length(p_accesos)=0 then raise exception 'Dirección requiere al menos un área';end if;
    for a in select value from jsonb_array_elements(p_accesos) loop
      insert into public.accesos_usuario_area(usuario_id,unidad_negocio_id,area_id) values(p_id,(a->>'unidadId')::uuid,(a->>'areaId')::uuid);
    end loop;
  end if;
end;$$;
revoke all on function public.aplicar_perfil_accesos(uuid,text,text,public.rol_plataforma,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.aplicar_perfil_accesos(uuid,text,text,public.rol_plataforma,boolean,jsonb) to service_role;
commit;
