-- Tienda de la novela: ventas pagadas con Wompi, precios configurables y archivos privados.

-- Configuración editable desde el editor SQL (precios en pesos, fechas ISO con zona horaria).
create table if not exists public.tienda_config (
  clave text primary key,
  valor text not null
);
alter table public.tienda_config enable row level security;
revoke all on public.tienda_config from anon, authenticated;

insert into public.tienda_config (clave, valor) values
  ('precio_normal', '30000'),                         -- PROVISIONAL
  ('precio_lanzamiento', '20000'),                    -- PROVISIONAL
  ('apertura', '2026-11-01T00:00:00-05:00'),          -- PROVISIONAL: antes de esta hora /comprar dice "Muy pronto"
  ('lanzamiento_hasta', '2026-11-08T23:59:59-05:00'), -- PROVISIONAL
  ('limite_descargas', '5')
on conflict (clave) do nothing;

create table if not exists public.ventas (
  id bigint generated always as identity primary key,
  referencia text not null unique,
  registro_id bigint references public.registros (id) on delete set null,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 100),
  correo text not null check (char_length(correo) <= 254),
  monto_centavos bigint not null check (monto_centavos > 0),
  tipo_precio text not null check (tipo_precio in ('lanzamiento', 'normal')),
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR')),
  wompi_id text,
  metodo text,
  token_descarga uuid not null default gen_random_uuid() unique,
  descargas jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  aprobado_en timestamptz,
  correo_enviado_en timestamptz
);
comment on table public.ventas is 'Compras de la novela por Wompi. Solo la función "tienda" lee y escribe.';
create index if not exists ventas_correo_idx on public.ventas (lower(correo));
alter table public.ventas enable row level security;
revoke all on public.ventas from anon, authenticated;

-- Archivos: originales/ (los sube el autor) y personalizados/<referencia>/ (los genera la función).
insert into storage.buckets (id, name, public)
values ('libro', 'libro', false)
on conflict (id) do nothing;

-- Correo de lanzamiento por tandas (2 nov 2026): marca de envío y comando de administración.
alter table public.registros add column if not exists lanzamiento_enviado_en timestamptz;

-- select public.tienda_admin('lanzar', '{"prueba": "tu@correo.com"}');      -- un solo correo de prueba
-- select public.tienda_admin('lanzar', '{"limite": 100, "solo_t14": true}'); -- tanda real
-- select public.tienda_admin('cupo');                                         -- cuántos correos quedan hoy en Brevo
create or replace function public.tienda_admin(accion text, opciones jsonb default '{}'::jsonb)
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
    url := 'https://jcsdruohnwkfsonesonx.supabase.co/functions/v1/tienda',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-t14-admin', v_clave),
    body := jsonb_build_object('accion', accion) || coalesce(opciones, '{}'::jsonb),
    timeout_milliseconds := 150000
  ) into v_pedido;
  return v_pedido;
end;
$$;
revoke all on function public.tienda_admin(text, jsonb) from public, anon, authenticated;
