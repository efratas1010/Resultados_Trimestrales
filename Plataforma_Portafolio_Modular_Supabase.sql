-- ============================================================================
-- Plataforma_Portafolio_Modular · Frutas Chanitos
-- Base PostgreSQL para Supabase · instalación inicial
-- Generado: 2026-10-30
--
-- IMPORTANTE
-- 1) Este archivo CREA el modelo; no conecta ni modifica por sí solo un proyecto.
-- 2) Está pensado para ejecutarse UNA VEZ en un proyecto Supabase nuevo.
-- 3) No crea usuarios dentro de auth.users. Esos usuarios se crean con Supabase Auth.
-- 4) No incluye ninguna service_role key ni credencial.
-- ============================================================================

begin;

-- Evita dos instalaciones simultáneas de este mismo esquema.
select pg_advisory_xact_lock(hashtext('plataforma_portafolio_modular_v1'));

create schema if not exists extensions;
create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- 1. TIPOS DE DOMINIO
-- ----------------------------------------------------------------------------

do $$ begin
  create type public.rol_plataforma as enum ('admin', 'direccion');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_periodo as enum ('Anual', 'Trimestral');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trimestre as enum ('T1', 'T2', 'T3', 'T4');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sentido_indicador as enum ('Mayor es mejor', 'Menor es mejor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.color_semaforo as enum ('Verde', 'Amarillo', 'Rojo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estatus_accion as enum
    ('No iniciada', 'En proceso', 'Completada', 'Retrasada', 'Cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.prioridad as enum ('Alta', 'Media', 'Baja');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.frecuencia_kpi as enum
    ('Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. FUNCIONES PURAS DE CÁLCULO
-- ----------------------------------------------------------------------------

create or replace function public.calcular_cumplimiento(
  p_meta numeric,
  p_real numeric,
  p_sentido public.sentido_indicador
)
returns numeric
language sql
immutable
parallel safe
set search_path = public, pg_temp
as $$
  select case
    when p_meta is null or p_real is null then null
    when coalesce(p_sentido, 'Mayor es mejor'::public.sentido_indicador)
         = 'Menor es mejor'::public.sentido_indicador
      then case
        when p_real <= 0 then case when p_meta >= 0 then 150::numeric else 0::numeric end
        else (p_meta / p_real) * 100
      end
    when p_meta = 0 then case when p_real >= 0 then 100::numeric else 0::numeric end
    else (p_real / p_meta) * 100
  end;
$$;

create or replace function public.calcular_semaforo(
  p_cumplimiento numeric,
  p_forzado public.color_semaforo,
  p_umbral_verde numeric,
  p_umbral_amarillo numeric
)
returns public.color_semaforo
language sql
immutable
parallel safe
set search_path = public, pg_temp
as $$
  select case
    when p_forzado is not null then p_forzado
    when p_cumplimiento is null then null
    when p_cumplimiento >= p_umbral_verde then 'Verde'::public.color_semaforo
    when p_cumplimiento >= p_umbral_amarillo then 'Amarillo'::public.color_semaforo
    else 'Rojo'::public.color_semaforo
  end;
$$;

create or replace function public.trimestre_de_fecha(p_fecha date)
returns public.trimestre
language sql
immutable
parallel safe
set search_path = public, pg_temp
as $$
  select case extract(quarter from p_fecha)::integer
    when 1 then 'T1'::public.trimestre
    when 2 then 'T2'::public.trimestre
    when 3 then 'T3'::public.trimestre
    when 4 then 'T4'::public.trimestre
    else null
  end;
$$;

-- ----------------------------------------------------------------------------
-- 3. CONFIGURACIÓN Y CATÁLOGOS
-- ----------------------------------------------------------------------------

create table if not exists public.configuracion_plataforma (
  id boolean primary key default true check (id),
  empresa text not null default 'Frutas Chanitos',
  nombre_aplicacion text not null default 'Portafolio Estratégico',
  anio_cierre integer not null default 2025 check (anio_cierre between 2000 and 2100),
  anio_planeacion integer not null default 2026 check (anio_planeacion between 2000 and 2100),
  configuracion_extra jsonb not null default '{}'::jsonb
    check (jsonb_typeof(configuracion_extra) = 'object'),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users(id) on delete set null
);

create table if not exists public.umbrales_semaforo (
  id boolean primary key default true check (id),
  verde_desde numeric(7,2) not null default 95,
  amarillo_desde numeric(7,2) not null default 85,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint umbrales_orden_correcto check (
    amarillo_desde >= 0
    and verde_desde > amarillo_desde
    and verde_desde <= 150
  )
);

create table if not exists public.unidades_negocio (
  id uuid primary key default extensions.gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  orden integer not null default 0,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint unidad_codigo_formato check (codigo ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
  constraint unidad_nombre_no_vacio check (btrim(nombre) <> '')
);

create unique index if not exists unidades_negocio_codigo_uq
  on public.unidades_negocio (lower(codigo));
create unique index if not exists unidades_negocio_nombre_uq
  on public.unidades_negocio (lower(nombre));

create table if not exists public.areas (
  id uuid primary key default extensions.gen_random_uuid(),
  unidad_negocio_id uuid not null
    references public.unidades_negocio(id) on delete restrict,
  nombre text not null,
  orden integer not null default 0,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint area_nombre_no_vacio check (btrim(nombre) <> ''),
  constraint areas_unidad_id_id_uq unique (unidad_negocio_id, id)
);

-- El nombre solo es único DENTRO de una unidad. Por eso "Finanzas" puede existir
-- en Comercializadora y también en Productora, con UUID independientes.
create unique index if not exists areas_nombre_por_unidad_uq
  on public.areas (unidad_negocio_id, lower(nombre));
create index if not exists areas_unidad_idx
  on public.areas (unidad_negocio_id, activa, orden);

create table if not exists public.periodos (
  id uuid primary key default extensions.gen_random_uuid(),
  anio integer not null check (anio between 2000 and 2100),
  tipo public.tipo_periodo not null,
  trimestre public.trimestre,
  abierto boolean not null default true,
  fecha_inicio date,
  fecha_fin date,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint periodo_tipo_trimestre_ck check (
    (tipo = 'Anual' and trimestre is null)
    or
    (tipo = 'Trimestral' and trimestre is not null)
  ),
  constraint periodo_fechas_ck check (
    fecha_inicio is null or fecha_fin is null or fecha_inicio <= fecha_fin
  )
);

create unique index if not exists periodos_anual_uq
  on public.periodos (anio) where tipo = 'Anual';
create unique index if not exists periodos_trimestral_uq
  on public.periodos (anio, trimestre) where tipo = 'Trimestral';
create index if not exists periodos_orden_idx
  on public.periodos (anio desc, tipo, trimestre);

create table if not exists public.objetivos_estrategicos (
  id uuid primary key default extensions.gen_random_uuid(),
  nombre text not null,
  descripcion text,
  orden integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint objetivo_nombre_no_vacio check (btrim(nombre) <> '')
);

create unique index if not exists objetivos_estrategicos_nombre_uq
  on public.objetivos_estrategicos (lower(nombre));

-- ----------------------------------------------------------------------------
-- 4. USUARIOS Y PERMISOS
-- ----------------------------------------------------------------------------

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  correo text,
  usuario text,
  nombre_completo text not null default '',
  puesto text not null default '',
  rol public.rol_plataforma not null default 'direccion',
  activo boolean not null default true,
  debe_cambiar_contrasena boolean not null default false,
  ultimo_acceso_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint perfil_nombre_no_vacio check (btrim(nombre_completo) <> '')
);

create unique index if not exists perfiles_correo_uq
  on public.perfiles (lower(correo)) where correo is not null;
create unique index if not exists perfiles_usuario_uq
  on public.perfiles (lower(usuario)) where usuario is not null;

create table if not exists public.accesos_usuario_area (
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  unidad_negocio_id uuid not null,
  area_id uuid not null,
  asignado_en timestamptz not null default now(),
  asignado_por uuid references auth.users(id) on delete set null,
  primary key (usuario_id, area_id),
  constraint acceso_area_pertenece_unidad_fk
    foreign key (unidad_negocio_id, area_id)
    references public.areas(unidad_negocio_id, id)
    on delete cascade
);

create index if not exists accesos_usuario_idx
  on public.accesos_usuario_area (usuario_id, unidad_negocio_id);
create index if not exists accesos_area_idx
  on public.accesos_usuario_area (area_id, usuario_id);

-- ----------------------------------------------------------------------------
-- 5. HOJAS DEL PORTAFOLIO
-- Todas conservan el contexto Área + Periodo. La unidad se obtiene desde Área.
-- ----------------------------------------------------------------------------

create table if not exists public.cierre_resultados (
  id uuid primary key default extensions.gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete restrict,
  periodo_id uuid not null references public.periodos(id) on delete restrict,
  indicador text not null,
  unidad_medida text,
  sentido public.sentido_indicador not null default 'Mayor es mejor',
  meta numeric(20,6) not null,
  real numeric(20,6) not null,
  cumplimiento numeric(20,6) generated always as
    (public.calcular_cumplimiento(meta, real, sentido)) stored,
  semaforo_forzado public.color_semaforo,
  comentarios text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint cierre_indicador_no_vacio check (btrim(indicador) <> '')
);

create index if not exists cierre_area_periodo_idx
  on public.cierre_resultados (area_id, periodo_id);
create index if not exists cierre_periodo_idx
  on public.cierre_resultados (periodo_id);

create table if not exists public.quien_que_cuando (
  id uuid primary key default extensions.gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete restrict,
  periodo_id uuid not null references public.periodos(id) on delete restrict,
  cierre_resultado_id uuid references public.cierre_resultados(id) on delete set null,
  semaforo_origen public.color_semaforo not null,
  indicador_problema text not null,
  causa_raiz text not null,
  accion text not null,
  responsable text not null,
  fecha_compromiso date not null,
  estatus public.estatus_accion not null default 'No iniciada',
  avance numeric(5,2) not null default 0 check (avance between 0 and 100),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint qqc_semaforo_origen_ck check (semaforo_origen in ('Rojo', 'Amarillo')),
  constraint qqc_indicador_no_vacio check (btrim(indicador_problema) <> ''),
  constraint qqc_causa_no_vacia check (btrim(causa_raiz) <> ''),
  constraint qqc_accion_no_vacia check (btrim(accion) <> ''),
  constraint qqc_responsable_no_vacio check (btrim(responsable) <> '')
);

create index if not exists qqc_area_periodo_idx
  on public.quien_que_cuando (area_id, periodo_id);
create index if not exists qqc_responsable_idx
  on public.quien_que_cuando (responsable);
create index if not exists qqc_fecha_estatus_idx
  on public.quien_que_cuando (fecha_compromiso, estatus);

create table if not exists public.propuestas_sin_inversiones (
  id uuid primary key default extensions.gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete restrict,
  periodo_id uuid not null references public.periodos(id) on delete restrict,
  nombre text not null,
  descripcion text not null,
  beneficio_esperado text not null,
  prioridad public.prioridad not null default 'Media',
  responsable text not null,
  trimestre_arranque public.trimestre,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint propuesta_nombre_no_vacio check (btrim(nombre) <> ''),
  constraint propuesta_descripcion_no_vacia check (btrim(descripcion) <> ''),
  constraint propuesta_beneficio_no_vacio check (btrim(beneficio_esperado) <> ''),
  constraint propuesta_responsable_no_vacio check (btrim(responsable) <> '')
);

create index if not exists propuestas_area_periodo_idx
  on public.propuestas_sin_inversiones (area_id, periodo_id);

create table if not exists public.kpis (
  id uuid primary key default extensions.gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete restrict,
  periodo_id uuid not null references public.periodos(id) on delete restrict,
  kpi text not null,
  unidad_medida text,
  linea_base numeric(20,6),
  meta numeric(20,6) not null,
  frecuencia public.frecuencia_kpi not null default 'Mensual',
  formula_fuente text,
  responsable text not null,
  meta_t1 numeric(20,6),
  meta_t2 numeric(20,6),
  meta_t3 numeric(20,6),
  meta_t4 numeric(20,6),
  variacion_vs_base numeric(20,6) generated always as (
    case
      when linea_base is null or meta is null or linea_base = 0 then null
      else ((meta - linea_base) / abs(linea_base)) * 100
    end
  ) stored,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint kpi_nombre_no_vacio check (btrim(kpi) <> ''),
  constraint kpi_responsable_no_vacio check (btrim(responsable) <> '')
);

create index if not exists kpis_area_periodo_idx
  on public.kpis (area_id, periodo_id);

create table if not exists public.reflexiones (
  id uuid primary key default extensions.gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete restrict,
  periodo_id uuid not null references public.periodos(id) on delete restrict,
  logros text not null default '',
  aprendizajes text not null default '',
  obstaculos text not null default '',
  que_hariamos_distinto text not null default '',
  apoyos_necesarios text not null default '',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint reflexion_una_por_contexto_uq unique (area_id, periodo_id)
);

create index if not exists reflexiones_periodo_idx
  on public.reflexiones (periodo_id);

-- Una fila representa un Key Result; el texto del objetivo se repite para agrupar
-- de la misma forma que la hoja actual.
create table if not exists public.okrs (
  id uuid primary key default extensions.gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete restrict,
  periodo_id uuid not null references public.periodos(id) on delete restrict,
  objetivo text not null,
  objetivo_estrategico_id uuid
    references public.objetivos_estrategicos(id) on delete restrict,
  key_result text not null,
  linea_base numeric(20,6),
  meta numeric(20,6) not null,
  unidad_medida text,
  responsable text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint okr_objetivo_no_vacio check (btrim(objetivo) <> ''),
  constraint okr_kr_no_vacio check (btrim(key_result) <> ''),
  constraint okr_responsable_no_vacio check (btrim(responsable) <> '')
);

create index if not exists okrs_area_periodo_idx
  on public.okrs (area_id, periodo_id);
create index if not exists okrs_objetivo_idx
  on public.okrs (area_id, periodo_id, objetivo);
create index if not exists okrs_alineacion_idx
  on public.okrs (objetivo_estrategico_id);

-- ----------------------------------------------------------------------------
-- 6. BITÁCORA
-- Captura cambios de filas y también eventos manuales de la aplicación.
-- ----------------------------------------------------------------------------

create table if not exists public.bitacora_actividad (
  id bigint generated always as identity primary key,
  ocurrido_en timestamptz not null default now(),
  usuario_id uuid references auth.users(id) on delete set null,
  correo_usuario text,
  tipo_evento text not null check (tipo_evento in ('INSERT', 'UPDATE', 'DELETE', 'EVENT')),
  accion text not null,
  detalle text,
  tabla text,
  registro_id text,
  -- Se guardan como UUID históricos sin FK para que la bitácora sobreviva a bajas.
  unidad_negocio_id uuid,
  area_id uuid,
  periodo_id uuid,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  contexto jsonb not null default '{}'::jsonb
    check (jsonb_typeof(contexto) = 'object')
);

create index if not exists bitacora_fecha_idx
  on public.bitacora_actividad (ocurrido_en desc);
create index if not exists bitacora_usuario_idx
  on public.bitacora_actividad (usuario_id, ocurrido_en desc);
create index if not exists bitacora_area_idx
  on public.bitacora_actividad (area_id, ocurrido_en desc);
create index if not exists bitacora_tabla_idx
  on public.bitacora_actividad (tabla, ocurrido_en desc);

-- ----------------------------------------------------------------------------
-- 7. FUNCIONES DE AUTORIZACIÓN (RLS)
-- Se mantienen fuera de public para no exponerlas como RPC del Data API.
-- ----------------------------------------------------------------------------

create or replace function private.usuario_actual_activo()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.activo
  );
$$;

create or replace function private.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.activo
      and p.rol = 'admin'
  );
$$;

create or replace function private.puede_acceder_area(p_area_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when not private.usuario_actual_activo() then false
    when private.es_admin() then true
    else exists (
      select 1
      from public.accesos_usuario_area aua
      where aua.usuario_id = auth.uid()
        and aua.area_id = p_area_id
    )
  end;
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.usuario_actual_activo() from public;
revoke all on function private.es_admin() from public;
revoke all on function private.puede_acceder_area(uuid) from public;
grant execute on function private.usuario_actual_activo() to authenticated;
grant execute on function private.es_admin() to authenticated;
grant execute on function private.puede_acceder_area(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 8. TRIGGERS DE CONSISTENCIA Y AUDITORÍA
-- ----------------------------------------------------------------------------

create or replace function private.preparar_auditoria_fila()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.creado_en := coalesce(new.creado_en, now());
    new.actualizado_en := now();
    new.creado_por := coalesce(auth.uid(), new.creado_por);
    new.actualizado_por := coalesce(auth.uid(), new.actualizado_por, new.creado_por);
  else
    new.creado_en := old.creado_en;
    new.creado_por := old.creado_por;
    new.actualizado_en := now();
    new.actualizado_por := coalesce(auth.uid(), old.actualizado_por);
  end if;
  return new;
end;
$$;

create or replace function private.preparar_actualizacion_configuracion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.actualizado_en := now();
  new.actualizado_por := coalesce(auth.uid(), old.actualizado_por);
  return new;
end;
$$;

create or replace function private.preparar_actualizacion_perfil()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create or replace function private.proteger_ultimo_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quita_admin boolean;
  v_otros integer;
begin
  if tg_op = 'DELETE' then
    v_quita_admin := old.rol = 'admin' and old.activo;
  else
    v_quita_admin := old.rol = 'admin' and old.activo
      and (new.rol <> 'admin' or not new.activo);
  end if;

  if v_quita_admin then
    select count(*) into v_otros
    from public.perfiles p
    where p.id <> old.id
      and p.rol = 'admin'
      and p.activo;

    if v_otros = 0 then
      raise exception 'Debe existir al menos un administrador activo.'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.validar_contexto_qqc()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_area uuid;
  v_periodo uuid;
begin
  if new.cierre_resultado_id is null then
    return new;
  end if;

  select c.area_id, c.periodo_id
    into v_area, v_periodo
  from public.cierre_resultados c
  where c.id = new.cierre_resultado_id;

  if v_area is null then
    raise exception 'El cierre de resultados indicado no existe.'
      using errcode = 'foreign_key_violation';
  end if;

  if v_area <> new.area_id or v_periodo <> new.periodo_id then
    raise exception 'La acción QQC y el cierre relacionado deben pertenecer a la misma área y periodo.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create or replace function private.registrar_cambio()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_registro_id text;
  v_area_id uuid;
  v_unidad_id uuid;
  v_periodo_id uuid;
begin
  if tg_op = 'INSERT' then
    v_old := null;
    v_new := to_jsonb(new);
    v_row := v_new;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row := v_new;
  else
    v_old := to_jsonb(old);
    v_new := null;
    v_row := v_old;
  end if;

  v_registro_id := coalesce(v_row ->> 'id', '');

  if nullif(v_row ->> 'area_id', '') is not null then
    v_area_id := (v_row ->> 'area_id')::uuid;
  end if;
  if nullif(v_row ->> 'unidad_negocio_id', '') is not null then
    v_unidad_id := (v_row ->> 'unidad_negocio_id')::uuid;
  elsif v_area_id is not null then
    select a.unidad_negocio_id into v_unidad_id
    from public.areas a where a.id = v_area_id;
  end if;
  if nullif(v_row ->> 'periodo_id', '') is not null then
    v_periodo_id := (v_row ->> 'periodo_id')::uuid;
  end if;

  insert into public.bitacora_actividad (
    usuario_id,
    correo_usuario,
    tipo_evento,
    accion,
    tabla,
    registro_id,
    unidad_negocio_id,
    area_id,
    periodo_id,
    datos_anteriores,
    datos_nuevos
  ) values (
    auth.uid(),
    auth.jwt() ->> 'email',
    tg_op,
    tg_op || ' en ' || tg_table_name,
    tg_table_schema || '.' || tg_table_name,
    nullif(v_registro_id, ''),
    v_unidad_id,
    v_area_id,
    v_periodo_id,
    v_old,
    v_new
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.registrar_evento(
  p_accion text,
  p_detalle text default null,
  p_contexto jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null or not private.usuario_actual_activo() then
    raise exception 'Se requiere un usuario autenticado y activo.'
      using errcode = 'insufficient_privilege';
  end if;
  if nullif(btrim(p_accion), '') is null then
    raise exception 'La acción es obligatoria.'
      using errcode = 'not_null_violation';
  end if;
  if p_contexto is null or jsonb_typeof(p_contexto) <> 'object' then
    raise exception 'El contexto debe ser un objeto JSON.'
      using errcode = 'check_violation';
  end if;

  insert into public.bitacora_actividad (
    usuario_id, correo_usuario, tipo_evento, accion, detalle, contexto
  ) values (
    auth.uid(), auth.jwt() ->> 'email', 'EVENT', btrim(p_accion), p_detalle, p_contexto
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.registrar_evento(text, text, jsonb) from public;
grant execute on function public.registrar_evento(text, text, jsonb) to authenticated;

-- Sincronización auth.users -> public.perfiles.
-- El rol SIEMPRE inicia como Dirección para evitar autoescalación por metadata.
create or replace function private.sincronizar_perfil_auth()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nombre_metadata text;
  v_nombre_inicial text;
  v_puesto_metadata text;
begin
  v_nombre_metadata := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), '')
  );
  v_nombre_inicial := coalesce(
    v_nombre_metadata,
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Usuario'
  );
  v_puesto_metadata := nullif(btrim(new.raw_user_meta_data ->> 'job_title'), '');

  insert into public.perfiles (
    id, correo, nombre_completo, puesto, rol, activo
  ) values (
    new.id, new.email, v_nombre_inicial, coalesce(v_puesto_metadata, ''), 'direccion', true
  )
  on conflict (id) do update set
    correo = excluded.correo,
    nombre_completo = coalesce(v_nombre_metadata, public.perfiles.nombre_completo),
    puesto = coalesce(v_puesto_metadata, public.perfiles.puesto),
    actualizado_en = now();

  return new;
end;
$$;

-- Instala/renueva triggers de Auth.
drop trigger if exists al_crear_usuario_auth on auth.users;
create trigger al_crear_usuario_auth
  after insert on auth.users
  for each row execute function private.sincronizar_perfil_auth();

drop trigger if exists al_actualizar_usuario_auth on auth.users;
create trigger al_actualizar_usuario_auth
  after update of email, raw_user_meta_data on auth.users
  for each row execute function private.sincronizar_perfil_auth();

-- Trigger de protección del último administrador.
drop trigger if exists perfiles_proteger_ultimo_admin on public.perfiles;
create trigger perfiles_proteger_ultimo_admin
  before update of rol, activo or delete on public.perfiles
  for each row execute function private.proteger_ultimo_admin();

drop trigger if exists perfiles_actualizado_en on public.perfiles;
create trigger perfiles_actualizado_en
  before update on public.perfiles
  for each row execute function private.preparar_actualizacion_perfil();

drop trigger if exists qqc_validar_contexto on public.quien_que_cuando;
create trigger qqc_validar_contexto
  before insert or update of cierre_resultado_id, area_id, periodo_id
  on public.quien_que_cuando
  for each row execute function private.validar_contexto_qqc();

-- Auditoría de fechas/usuarios en tablas con columnas creado_por/actualizado_por.
do $$
declare
  t text;
begin
  foreach t in array array[
    'unidades_negocio', 'areas', 'periodos', 'objetivos_estrategicos',
    'cierre_resultados', 'quien_que_cuando', 'propuestas_sin_inversiones',
    'kpis', 'reflexiones', 'okrs'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_preparar_auditoria', t);
    execute format(
      'create trigger %I before insert or update on public.%I '
      'for each row execute function private.preparar_auditoria_fila()',
      t || '_preparar_auditoria', t
    );
  end loop;
end $$;

-- Actualización de configuración singleton.
do $$
declare
  t text;
begin
  foreach t in array array['configuracion_plataforma', 'umbrales_semaforo'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_actualizado_en', t);
    execute format(
      'create trigger %I before update on public.%I '
      'for each row execute function private.preparar_actualizacion_configuracion()',
      t || '_actualizado_en', t
    );
  end loop;
end $$;

-- Bitácora automática en catálogos, seguridad y hojas.
do $$
declare
  t text;
begin
  foreach t in array array[
    'configuracion_plataforma', 'umbrales_semaforo',
    'unidades_negocio', 'areas', 'periodos', 'objetivos_estrategicos',
    'perfiles', 'accesos_usuario_area',
    'cierre_resultados', 'quien_que_cuando', 'propuestas_sin_inversiones',
    'kpis', 'reflexiones', 'okrs'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_bitacora', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I '
      'for each row execute function private.registrar_cambio()',
      t || '_bitacora', t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 9. VISTAS PARA LA APLICACIÓN Y EL DASHBOARD
-- security_invoker hace que las vistas respeten el RLS de las tablas base.
-- ----------------------------------------------------------------------------

create or replace view public.v_cierre_resultados
with (security_invoker = true)
as
select
  c.id,
  un.id as unidad_negocio_id,
  un.nombre as unidad_negocio,
  a.id as area_id,
  a.nombre as area,
  p.id as periodo_id,
  p.anio,
  p.tipo as tipo_periodo,
  p.trimestre as trimestre_periodo,
  c.indicador,
  c.unidad_medida,
  c.sentido,
  c.meta,
  c.real,
  c.cumplimiento,
  c.semaforo_forzado,
  public.calcular_semaforo(
    c.cumplimiento,
    c.semaforo_forzado,
    u.verde_desde,
    u.amarillo_desde
  ) as semaforo,
  c.comentarios,
  c.creado_en,
  c.actualizado_en,
  c.creado_por,
  c.actualizado_por
from public.cierre_resultados c
join public.areas a on a.id = c.area_id
join public.unidades_negocio un on un.id = a.unidad_negocio_id
join public.periodos p on p.id = c.periodo_id
cross join public.umbrales_semaforo u
where u.id = true;

create or replace view public.v_quien_que_cuando
with (security_invoker = true)
as
select
  q.id,
  un.id as unidad_negocio_id,
  un.nombre as unidad_negocio,
  a.id as area_id,
  a.nombre as area,
  p.id as periodo_id,
  p.anio,
  p.tipo as tipo_periodo,
  p.trimestre as trimestre_periodo,
  q.cierre_resultado_id,
  q.semaforo_origen,
  q.indicador_problema,
  q.causa_raiz,
  q.accion,
  q.responsable,
  q.fecha_compromiso,
  public.trimestre_de_fecha(q.fecha_compromiso) as trimestre_fecha,
  q.estatus,
  q.avance,
  (
    q.fecha_compromiso < current_date
    and q.estatus not in ('Completada', 'Cancelada')
  ) as vencida,
  q.creado_en,
  q.actualizado_en,
  q.creado_por,
  q.actualizado_por
from public.quien_que_cuando q
join public.areas a on a.id = q.area_id
join public.unidades_negocio un on un.id = a.unidad_negocio_id
join public.periodos p on p.id = q.periodo_id;

create or replace view public.v_kpis
with (security_invoker = true)
as
select
  k.id,
  un.id as unidad_negocio_id,
  un.nombre as unidad_negocio,
  a.id as area_id,
  a.nombre as area,
  p.id as periodo_id,
  p.anio,
  p.tipo as tipo_periodo,
  p.trimestre as trimestre_periodo,
  k.kpi,
  k.unidad_medida,
  k.linea_base,
  k.meta,
  k.frecuencia,
  k.formula_fuente,
  k.responsable,
  k.meta_t1,
  k.meta_t2,
  k.meta_t3,
  k.meta_t4,
  k.variacion_vs_base,
  k.creado_en,
  k.actualizado_en,
  k.creado_por,
  k.actualizado_por
from public.kpis k
join public.areas a on a.id = k.area_id
join public.unidades_negocio un on un.id = a.unidad_negocio_id
join public.periodos p on p.id = k.periodo_id;

create or replace view public.v_catalogo_areas
with (security_invoker = true)
as
select
  un.id as unidad_negocio_id,
  un.codigo as unidad_codigo,
  un.nombre as unidad_negocio,
  un.activa as unidad_activa,
  a.id as area_id,
  a.nombre as area,
  a.activa as area_activa,
  a.orden
from public.unidades_negocio un
join public.areas a on a.unidad_negocio_id = un.id;

-- ----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.configuracion_plataforma enable row level security;
alter table public.umbrales_semaforo enable row level security;
alter table public.unidades_negocio enable row level security;
alter table public.areas enable row level security;
alter table public.periodos enable row level security;
alter table public.objetivos_estrategicos enable row level security;
alter table public.perfiles enable row level security;
alter table public.accesos_usuario_area enable row level security;
alter table public.cierre_resultados enable row level security;
alter table public.quien_que_cuando enable row level security;
alter table public.propuestas_sin_inversiones enable row level security;
alter table public.kpis enable row level security;
alter table public.reflexiones enable row level security;
alter table public.okrs enable row level security;
alter table public.bitacora_actividad enable row level security;

-- Catálogos: cualquier usuario activo consulta; solo Admin modifica.
do $$
declare
  t text;
begin
  foreach t in array array[
    'configuracion_plataforma', 'umbrales_semaforo',
    'unidades_negocio', 'areas', 'periodos', 'objetivos_estrategicos'
  ] loop
    execute format('drop policy if exists lectura_autenticada on public.%I', t);
    execute format(
      'create policy lectura_autenticada on public.%I for select to authenticated '
      'using (private.usuario_actual_activo())', t
    );
    execute format('drop policy if exists administracion_total on public.%I', t);
    execute format(
      'create policy administracion_total on public.%I for all to authenticated '
      'using (private.es_admin()) with check (private.es_admin())', t
    );
  end loop;
end $$;

-- Perfiles: cada persona consulta su perfil; Admin consulta y administra todos.
drop policy if exists perfil_propio_lectura on public.perfiles;
create policy perfil_propio_lectura
  on public.perfiles for select to authenticated
  using (id = auth.uid() and activo);

drop policy if exists perfiles_admin_total on public.perfiles;
create policy perfiles_admin_total
  on public.perfiles for all to authenticated
  using (private.es_admin())
  with check (private.es_admin());

-- Asignaciones: Dirección ve las propias; Admin administra todas.
drop policy if exists accesos_propios_lectura on public.accesos_usuario_area;
create policy accesos_propios_lectura
  on public.accesos_usuario_area for select to authenticated
  using (usuario_id = auth.uid() and private.usuario_actual_activo());

drop policy if exists accesos_admin_total on public.accesos_usuario_area;
create policy accesos_admin_total
  on public.accesos_usuario_area for all to authenticated
  using (private.es_admin())
  with check (private.es_admin());

-- Hojas: Admin tiene todas las áreas; Dirección solo las áreas asignadas.
do $$
declare
  t text;
begin
  foreach t in array array[
    'cierre_resultados', 'quien_que_cuando', 'propuestas_sin_inversiones',
    'kpis', 'reflexiones', 'okrs'
  ] loop
    execute format('drop policy if exists lectura_por_area on public.%I', t);
    execute format(
      'create policy lectura_por_area on public.%I for select to authenticated '
      'using (private.puede_acceder_area(area_id))', t
    );

    execute format('drop policy if exists insercion_por_area on public.%I', t);
    execute format(
      'create policy insercion_por_area on public.%I for insert to authenticated '
      'with check (private.puede_acceder_area(area_id))', t
    );

    execute format('drop policy if exists actualizacion_por_area on public.%I', t);
    execute format(
      'create policy actualizacion_por_area on public.%I for update to authenticated '
      'using (private.puede_acceder_area(area_id)) '
      'with check (private.puede_acceder_area(area_id))', t
    );

    execute format('drop policy if exists eliminacion_por_area on public.%I', t);
    execute format(
      'create policy eliminacion_por_area on public.%I for delete to authenticated '
      'using (private.puede_acceder_area(area_id))', t
    );
  end loop;
end $$;

-- Bitácora: solo Admin consulta. Las escrituras vienen de triggers/RPC.
drop policy if exists bitacora_admin_lectura on public.bitacora_actividad;
create policy bitacora_admin_lectura
  on public.bitacora_actividad for select to authenticated
  using (private.es_admin());

-- ----------------------------------------------------------------------------
-- 11. PRIVILEGIOS SQL
-- RLS sigue siendo la capa que decide qué filas puede usar cada persona.
-- ----------------------------------------------------------------------------

revoke all on table public.configuracion_plataforma from anon;
revoke all on table public.umbrales_semaforo from anon;
revoke all on table public.unidades_negocio from anon;
revoke all on table public.areas from anon;
revoke all on table public.periodos from anon;
revoke all on table public.objetivos_estrategicos from anon;
revoke all on table public.perfiles from anon;
revoke all on table public.accesos_usuario_area from anon;
revoke all on table public.cierre_resultados from anon;
revoke all on table public.quien_que_cuando from anon;
revoke all on table public.propuestas_sin_inversiones from anon;
revoke all on table public.kpis from anon;
revoke all on table public.reflexiones from anon;
revoke all on table public.okrs from anon;
revoke all on table public.bitacora_actividad from anon;

revoke all on table public.configuracion_plataforma from authenticated;
revoke all on table public.umbrales_semaforo from authenticated;
revoke all on table public.unidades_negocio from authenticated;
revoke all on table public.areas from authenticated;
revoke all on table public.periodos from authenticated;
revoke all on table public.objetivos_estrategicos from authenticated;
revoke all on table public.perfiles from authenticated;
revoke all on table public.accesos_usuario_area from authenticated;
revoke all on table public.cierre_resultados from authenticated;
revoke all on table public.quien_que_cuando from authenticated;
revoke all on table public.propuestas_sin_inversiones from authenticated;
revoke all on table public.kpis from authenticated;
revoke all on table public.reflexiones from authenticated;
revoke all on table public.okrs from authenticated;
revoke all on table public.bitacora_actividad from authenticated;

grant select, insert, update, delete on table
  public.configuracion_plataforma,
  public.umbrales_semaforo,
  public.unidades_negocio,
  public.areas,
  public.periodos,
  public.objetivos_estrategicos,
  public.perfiles,
  public.accesos_usuario_area,
  public.cierre_resultados,
  public.quien_que_cuando,
  public.propuestas_sin_inversiones,
  public.kpis,
  public.reflexiones,
  public.okrs
  to authenticated;

grant select on table public.bitacora_actividad to authenticated;

grant select on table
  public.v_cierre_resultados,
  public.v_quien_que_cuando,
  public.v_kpis,
  public.v_catalogo_areas
  to authenticated;

revoke all on table
  public.v_cierre_resultados,
  public.v_quien_que_cuando,
  public.v_kpis,
  public.v_catalogo_areas
  from anon;

-- ----------------------------------------------------------------------------
-- 12. DATOS BASE
-- ----------------------------------------------------------------------------

insert into public.configuracion_plataforma (
  id, empresa, nombre_aplicacion, anio_cierre, anio_planeacion
) values (
  true, 'Frutas Chanitos', 'Portafolio Estratégico', 2025, 2026
)
on conflict (id) do nothing;

insert into public.umbrales_semaforo (id, verde_desde, amarillo_desde)
values (true, 95, 85)
on conflict (id) do nothing;

insert into public.unidades_negocio (id, codigo, nombre, orden)
values
  ('00000000-0000-4000-8000-000000000001', 'comercializadora', 'Comercializadora', 1),
  ('00000000-0000-4000-8000-000000000002', 'productora', 'Productora', 2)
on conflict (id) do update set
  codigo = excluded.codigo,
  nombre = excluded.nombre,
  orden = excluded.orden;

-- Se crean periodos Anual y T1-T4 de 2024 a 2030, igual que el rango actual.
insert into public.periodos (anio, tipo, trimestre)
select y, 'Anual'::public.tipo_periodo, null::public.trimestre
from generate_series(2024, 2030) as y
on conflict do nothing;

insert into public.periodos (anio, tipo, trimestre)
select y, 'Trimestral'::public.tipo_periodo, q
from generate_series(2024, 2030) as y
cross join unnest(enum_range(null::public.trimestre)) as q
on conflict do nothing;

insert into public.objetivos_estrategicos (nombre, orden)
values
  ('Crecimiento rentable', 1),
  ('Excelencia operativa', 2),
  ('Calidad y satisfacción del cliente', 3),
  ('Desarrollo del talento', 4),
  ('Transformación digital', 5),
  ('Sostenibilidad', 6)
on conflict do nothing;

-- Las áreas NO se inventan aquí: el código original aún las conserva como lista
-- legacy y las dos unidades no contienen una asignación oficial. Agrégalas después
-- de confirmar su unidad. Este ejemplo demuestra nombres repetidos con UUID distintos:
--
-- insert into public.areas (unidad_negocio_id, nombre, orden) values
--   ('00000000-0000-4000-8000-000000000001', 'Finanzas', 1),
--   ('00000000-0000-4000-8000-000000000002', 'Finanzas', 1);

commit;

-- ============================================================================
-- ACCIONES POSTERIORES (NO SON PARTE DE LA TRANSACCIÓN)
-- ============================================================================
--
-- A) Crear usuarios en Authentication > Users de Supabase. El trigger genera
--    automáticamente public.perfiles con rol "direccion".
--
-- B) Promover UNA cuenta existente como primer Administrador. Sustituye el correo:
--
-- update public.perfiles
-- set rol = 'admin', activo = true
-- where id = (select id from auth.users where lower(email) = lower('tu-correo@empresa.com'));
--
-- C) Agregar áreas reales a cada unidad y asignarlas a usuarios Dirección.
--
-- D) Verificación rápida:
--
-- select * from public.unidades_negocio order by orden;
-- select * from public.periodos order by anio, tipo, trimestre;
-- select * from public.objetivos_estrategicos order by orden;
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
-- order by tablename;
--
-- E) Eventos de aplicación no asociados a cambios de fila:
--
-- select public.registrar_evento(
--   'Exportación a Excel',
--   'Portafolio completo',
--   jsonb_build_object('formato', 'xlsx')
-- );
