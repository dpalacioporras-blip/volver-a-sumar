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
