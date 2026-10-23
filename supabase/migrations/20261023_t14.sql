-- Segunda entrega: Formulario único de reubicación, modelo T-14 (/t14).
-- Cada registro tiene un enlace personal (token). El resultado se guarda una sola vez en "asignaciones".

alter table public.registros add column if not exists token uuid not null default gen_random_uuid();
create unique index if not exists registros_token_key on public.registros (token);
alter table public.registros add column if not exists t14_enlace_enviado_en timestamptz;
alter table public.registros add column if not exists t14_anuncio_enviado_en timestamptz;

create table if not exists public.asignaciones (
  id bigint generated always as identity primary key,
  registro_id bigint not null unique references public.registros (id) on delete cascade,
  respuestas jsonb not null,
  resultado jsonb not null,
  categoria text not null check (categoria in ('A', 'B', 'ESPERA')),
  centro text,
  funcion text,
  sector smallint,
  creado_en timestamptz not null default now(),
  brevo_sincronizado_en timestamptz
);
comment on table public.asignaciones is 'Resultado del formulario T-14: una sola radicación por registro';
alter table public.asignaciones enable row level security;
revoke all on public.asignaciones from anon, authenticated;

-- Configuración privada de la función t14 (la clave de administración se inserta aparte, no va en el repositorio).
create table if not exists public.t14_config (
  clave text primary key,
  valor text not null
);
alter table public.t14_config enable row level security;
revoke all on public.t14_config from anon, authenticated;

-- Acciones de administración desde el editor SQL de Supabase:
--   select public.t14_admin('anunciar', '{"prueba": "tu@correo.com"}');  -- un solo correo de prueba
--   select public.t14_admin('anunciar', '{"limite": 150}');              -- envío real, por tandas
--   select public.t14_admin('sincronizar');                              -- copia enlaces y resultados a Brevo
-- La respuesta queda en: select status_code, content from net._http_response order by id desc limit 1;
create or replace function public.t14_admin(accion text, opciones jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_clave text;
  v_pedido bigint;
begin
  select c.valor into v_clave from public.t14_config c where c.clave = 'admin_key';
  if v_clave is null then
    raise exception 'Falta la clave admin_key en public.t14_config';
  end if;
  select net.http_post(
    url := 'https://jcsdruohnwkfsonesonx.supabase.co/functions/v1/t14',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-t14-admin', v_clave),
    body := jsonb_build_object('accion', accion) || coalesce(opciones, '{}'::jsonb),
    timeout_milliseconds := 120000
  ) into v_pedido;
  return v_pedido;
end;
$$;
revoke all on function public.t14_admin(text, jsonb) from public, anon, authenticated;
