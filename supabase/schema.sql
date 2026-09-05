-- LizamaBet - esquema inicial Supabase
-- Ejecutar completo en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.site_settings(key,value) values
('hero_title','Pronósticos analizados con estadísticas que importan'),
('hero_subtitle','Datos, valor esperado y seguimiento en vivo para tomar decisiones mejor informadas.'),
('primary_color','#83ff35'),
('accent_color','#c9ff52'),
('donation_text','LizamaBet es gratuito. Si deseas apoyar su mantenimiento y nuevas funciones, puedes realizar una donación voluntaria.')
on conflict (key) do nothing;

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('football','tennis','basketball')),
  name text not null,
  country text,
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  unique(sport,name)
);

insert into public.leagues(sport,name,featured,sort_order) values
('football','Primera División Chile',true,1),
('football','Premier League',true,2),
('football','LaLiga',true,3),
('football','Serie A',false,10),
('football','Bundesliga',false,11),
('football','Champions League',true,4),
('football','Copa Libertadores',true,5),
('football','Copa Sudamericana',false,12),
('tennis','ATP',true,1),
('tennis','WTA',true,2),
('tennis','Grand Slams',true,3),
('basketball','NBA',true,1),
('basketball','EuroLeague',true,2),
('basketball','ACB',false,10)
on conflict (sport,name) do nothing;

create table if not exists public.events (
  id text primary key,
  sport text not null,
  league text,
  home_name text,
  away_name text,
  starts_at timestamptz,
  status text,
  source text not null default 'SportScore',
  raw jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.live_stats (
  id bigint generated always as identity primary key,
  event_id text references public.events(id) on delete cascade,
  captured_at timestamptz not null default now(),
  minute integer,
  score_home integer,
  score_away integer,
  payload jsonb
);

create table if not exists public.odds (
  id bigint generated always as identity primary key,
  event_id text references public.events(id) on delete cascade,
  bookmaker text not null,
  market text not null,
  selection text not null,
  odds numeric(10,3),
  captured_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  event_id text references public.events(id) on delete cascade,
  market text not null,
  selection text not null,
  model_probability numeric(6,3),
  fair_odds numeric(10,3),
  market_odds numeric(10,3),
  ev numeric(10,4),
  category text check (category in ('alto_valor','valor','observar','sin_entrada')),
  published boolean not null default false,
  result text,
  created_at timestamptz not null default now()
);

create table if not exists public.combo_predictions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  risk text check (risk in ('conservadora','bomba','arriesgada')),
  selections jsonb not null default '[]',
  combined_odds numeric(10,3),
  joint_probability numeric(6,3),
  confidence numeric(6,3),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.site_settings enable row level security;
alter table public.leagues enable row level security;
alter table public.events enable row level security;
alter table public.live_stats enable row level security;
alter table public.odds enable row level security;
alter table public.predictions enable row level security;
alter table public.combo_predictions enable row level security;
alter table public.admin_audit_log enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admins a where a.user_id = auth.uid());
$$;

drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select using (true);
drop policy if exists "admin write settings" on public.site_settings;
create policy "admin write settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read leagues" on public.leagues;
create policy "public read leagues" on public.leagues for select using (active = true or public.is_admin());
drop policy if exists "admin write leagues" on public.leagues;
create policy "admin write leagues" on public.leagues for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events for select using (true);
drop policy if exists "public read stats" on public.live_stats;
create policy "public read stats" on public.live_stats for select using (true);
drop policy if exists "public read odds" on public.odds;
create policy "public read odds" on public.odds for select using (true);
drop policy if exists "public read predictions" on public.predictions;
create policy "public read predictions" on public.predictions for select using (published = true or public.is_admin());
drop policy if exists "public read combos" on public.combo_predictions;
create policy "public read combos" on public.combo_predictions for select using (published = true or public.is_admin());

drop policy if exists "admin manage predictions" on public.predictions;
create policy "admin manage predictions" on public.predictions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage combos" on public.combo_predictions;
create policy "admin manage combos" on public.combo_predictions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin read admins" on public.admins;
create policy "admin read admins" on public.admins for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin audit read" on public.admin_audit_log;
create policy "admin audit read" on public.admin_audit_log for select using (public.is_admin());
drop policy if exists "admin audit insert" on public.admin_audit_log;
create policy "admin audit insert" on public.admin_audit_log for insert with check (public.is_admin());

-- IMPORTANTE: después de crear tu usuario en Authentication > Users,
-- copia su UUID y ejecuta:
-- insert into public.admins(user_id) values ('AQUI-EL-UUID-DEL-USUARIO');
