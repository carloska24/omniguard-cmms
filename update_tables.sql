-- ATUALIZAÇÃO DO BANCO (Tabelas Faltantes)

-- 1. Tabela de Técnicos (Technicians)
create table if not exists public.technicians (
  id text primary key,
  name text not null,
  role text,
  email text,
  status text check (status in ('active', 'inactive', 'on-leave')),
  avatar text,
  skills text[], -- Array de strings para especialidades
  shift text check (shift in ('morning', 'afternoon', 'night')),
  efficiency integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Planos Preventivos (Preventive Plans)
create table if not exists public.preventive_plans (
  id text primary key,
  asset_id text references public.assets(id),
  title text not null,
  frequency text,
  assigned_to text,
  next_due_date timestamp with time zone,
  tasks jsonb, -- Lista de tarefas como JSON
  estimated_duration integer, -- em minutos
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Habilitar RLS e Policies
alter table public.technicians enable row level security;
alter table public.preventive_plans enable row level security;

create policy "Enable all access for all users" on public.technicians for all using (true) with check (true);
create policy "Enable all access for all users" on public.preventive_plans for all using (true) with check (true);
