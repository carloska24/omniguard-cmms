-- CRIAÇÃO DAS TABELAS (OmniGuard CMMS)

-- 1. Tabela de Ativos (Assets)
create table public.assets (
  id text primary key,
  name text not null,
  code text,
  model text,
  manufacturer text,
  serial_number text,
  location text,
  status text check (status in ('operational', 'maintenance', 'stopped')),
  criticality text check (criticality in ('low', 'medium', 'high')),
  image text,
  mtbf integer, -- Mean Time Between Failures (horas)
  mttr integer, -- Mean Time To Repair (horas)
  cost numeric,
  parent_id text references public.assets(id),
  qr_code text,
  acquisition_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Estoque/Peças (Inventory)
create table public.inventory (
  id text primary key,
  code text,
  name text not null,
  quantity integer default 0,
  min_level integer default 0,
  cost numeric default 0,
  criticality text check (criticality in ('low', 'medium', 'high')),
  location text,
  category text,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de Chamados/Tickets (Maintenance Tickets)
create table public.tickets (
  id text primary key,
  title text not null,
  description text,
  requester text,
  asset_id text references public.assets(id),
  type text, -- mechanical, electrical, etc.
  urgency text check (urgency in ('low', 'medium', 'high', 'critical')),
  status text check (status in ('open', 'assigned', 'in-progress', 'waiting-parts', 'done')),
  assignee text, -- Nome do técnico responsável (simples por enquanto)
  occurrence_date timestamp with time zone,
  closed_at timestamp with time zone,
  solution_notes text,
  total_cost numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabela de Log de Uso de Peças em Tickets
create table public.ticket_part_usages (
  id text primary key,
  ticket_id text references public.tickets(id),
  part_id text references public.inventory(id),
  part_name text, -- Redundância para histórico
  quantity integer not null,
  unit_cost numeric,
  total_cost numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabela de Atividades do Ticket (Audit Log)
create table public.ticket_activities (
  id text primary key,
  ticket_id text references public.tickets(id),
  user_id text,
  user_name text,
  action text not null,
  type text, -- status_change, comment, part_usage, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (Opicional para inicio, mas boa prática)
-- Por enquanto vamos deixar aberto para facilitar o protótipo (Policies Public)
alter table public.assets enable row level security;
alter table public.inventory enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_part_usages enable row level security;
alter table public.ticket_activities enable row level security;

-- Policies Abertas (Permitir tudo para Anon Key por enquanto - DEV MODE)
create policy "Enable all access for all users" on public.assets for all using (true) with check (true);
create policy "Enable all access for all users" on public.inventory for all using (true) with check (true);
create policy "Enable all access for all users" on public.tickets for all using (true) with check (true);
create policy "Enable all access for all users" on public.ticket_part_usages for all using (true) with check (true);
create policy "Enable all access for all users" on public.ticket_activities for all using (true) with check (true);
