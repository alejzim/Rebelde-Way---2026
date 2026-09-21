-- Ejecutar completo en Supabase > SQL Editor. Se puede volver a ejecutar.
-- La API de servidor utiliza SUPABASE_SECRET_KEY. El navegador no accede a las tablas.
begin;

create table if not exists public.respuestas (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  nombre text not null check (char_length(nombre) between 2 and 30),
  pregunta1 text not null check (char_length(pregunta1) between 1 and 1000),
  pregunta2 text not null check (char_length(pregunta2) between 1 and 1000),
  pregunta3 text not null check (char_length(pregunta3) between 1 and 1000),
  pregunta4 text not null check (char_length(pregunta4) between 1 and 1000),
  pregunta5 text not null check (char_length(pregunta5) between 1 and 1000),
  resultado text not null check (resultado in ('marizza', 'mia', 'pablo', 'manuel')),
  created_at timestamptz not null default now()
);
create index if not exists respuestas_created_at_idx on public.respuestas (created_at desc, id desc);
create index if not exists respuestas_resultado_created_at_idx on public.respuestas (resultado, created_at desc);
alter table public.respuestas enable row level security;
revoke all on public.respuestas from public, anon, authenticated;
grant select, insert, delete on public.respuestas to service_role;

comment on column public.respuestas.submission_id is 'UUIDv4 del envío: evita duplicados por reintentos.';
comment on column public.respuestas.request_hash is 'SHA256 de nombre normalizado y opciones: impide modificar un envío reutilizando su UUID.';

create table if not exists public.rate_limits (
  key text primary key check (key ~ '^[a-f0-9]{64}$'),
  attempts integer not null check (attempts > 0),
  expires_at timestamptz not null
);
create index if not exists rate_limits_expiration_idx on public.rate_limits (expires_at);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated, service_role;

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_attempts integer;
  bucket_now timestamptz := clock_timestamp();
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$'
     or p_limit is null or p_limit < 1 or p_limit > 1000
     or p_window_seconds is null or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit parameters';
  end if;
  -- Contadores compartidos entre instancias serverless. No guardan la IP original.
  delete from public.rate_limits where expires_at <= bucket_now;
  insert into public.rate_limits as bucket (key, attempts, expires_at)
    values (p_key, 1, bucket_now + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    attempts = case when bucket.expires_at <= bucket_now then 1 else least(bucket.attempts + 1, p_limit + 1) end,
    expires_at = case when bucket.expires_at <= bucket_now then bucket_now + make_interval(secs => p_window_seconds) else bucket.expires_at end
  returning attempts into current_attempts;
  return current_attempts <= p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create or replace function public.response_counts()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('totalAll', count(*), 'counts', jsonb_build_object(
    'marizza', count(*) filter (where resultado = 'marizza'),
    'mia', count(*) filter (where resultado = 'mia'),
    'pablo', count(*) filter (where resultado = 'pablo'),
    'manuel', count(*) filter (where resultado = 'manuel')
  )) from public.respuestas;
$$;
revoke all on function public.response_counts() from public, anon, authenticated;
grant execute on function public.response_counts() to service_role;
commit;
