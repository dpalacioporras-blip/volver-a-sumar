-- Registro de la configuración aplicada en Supabase para el correo de bienvenida.
alter table public.registros add column if not exists bienvenida_enviada_en timestamptz;

create extension if not exists pg_net with schema extensions;

-- Cada registro nuevo llama a la función "bienvenida" (Brevo). La clave es la anon pública.
create or replace function public.enviar_bienvenida()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://jcsdruohnwkfsonesonx.supabase.co/functions/v1/bienvenida',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer <ANON_KEY>'),
    body := jsonb_build_object('record', jsonb_build_object('id', new.id)),
    timeout_milliseconds := 20000
  );
  return new;
end;
$$;

create trigger registros_enviar_bienvenida
  after insert on public.registros
  for each row execute function public.enviar_bienvenida();
