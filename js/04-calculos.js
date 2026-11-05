-- Plataforma_Portafolio_Modular
-- Migración incremental: configuración central del Periodo de análisis
-- Conserva todos los registros existentes. No modifica las llaves periodo_id
-- de Cierre, Plan de acciones críticas, KPIs, Reflexión ni OKRs.

begin;

alter table public.configuracion_plataforma
  add column if not exists periodo_analisis_anio integer,
  add column if not exists periodo_analisis_tipo public.tipo_periodo,
  add column if not exists periodo_analisis_trimestre public.trimestre,
  add column if not exists periodo_analisis_etiqueta text;

-- Inicialización compatible con la configuración vigente. Solo llena valores
-- faltantes; no sobrescribe una configuración central previamente definida.
update public.configuracion_plataforma
set
  periodo_analisis_anio = coalesce(periodo_analisis_anio, anio_planeacion),
  periodo_analisis_tipo = coalesce(periodo_analisis_tipo, 'Anual'::public.tipo_periodo),
  periodo_analisis_trimestre = case
    when coalesce(periodo_analisis_tipo, 'Anual'::public.tipo_periodo) = 'Anual'
      then null
    else periodo_analisis_trimestre
  end
where id = true;

alter table public.configuracion_plataforma
  alter column periodo_analisis_anio set default 2026,
  alter column periodo_analisis_anio set not null,
  alter column periodo_analisis_tipo set default 'Anual'::public.tipo_periodo,
  alter column periodo_analisis_tipo set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.configuracion_plataforma'::regclass
      and conname = 'configuracion_periodo_analisis_anio_ck'
  ) then
    alter table public.configuracion_plataforma
      add constraint configuracion_periodo_analisis_anio_ck
      check (periodo_analisis_anio between 2000 and 2100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.configuracion_plataforma'::regclass
      and conname = 'configuracion_periodo_analisis_tipo_trimestre_ck'
  ) then
    alter table public.configuracion_plataforma
      add constraint configuracion_periodo_analisis_tipo_trimestre_ck
      check (
        (periodo_analisis_tipo = 'Anual' and periodo_analisis_trimestre is null)
        or
        (periodo_analisis_tipo = 'Trimestral' and periodo_analisis_trimestre is not null)
      );
  end if;
end $$;

-- Garantiza que el contexto inicial tenga su fila estructurada en el catálogo
-- de periodos. No se altera ni elimina ningún periodo existente.
insert into public.periodos (anio, tipo, trimestre)
select periodo_analisis_anio, periodo_analisis_tipo, periodo_analisis_trimestre
from public.configuracion_plataforma
where id = true
on conflict do nothing;

comment on column public.configuracion_plataforma.periodo_analisis_anio is
  'Año del contexto central de análisis.';
comment on column public.configuracion_plataforma.periodo_analisis_tipo is
  'Tipo estructurado del contexto central: Anual o Trimestral.';
comment on column public.configuracion_plataforma.periodo_analisis_trimestre is
  'T1-T4 cuando el tipo central es Trimestral; nulo para Anual.';
comment on column public.configuracion_plataforma.periodo_analisis_etiqueta is
  'Etiqueta descriptiva opcional de corte; no forma parte de la llave de datos.';

commit;
