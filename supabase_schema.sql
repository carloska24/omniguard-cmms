-- CRIAÇÃO DAS TABELAS (OmniGuard CMMS - Updated)

-- 0. Tabela de Perfis de Usuário (Vinculada ao Auth do Supabase)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text check (role in ('admin', 'manager', 'technician', 'requester')),
  name text,
  department text, -- Para Solicitantes (RH, Produção, etc)
  avatar_url text,
  shift text check (shift in ('morning', 'afternoon', 'night')), -- Para Técnicos
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger para criar profile automaticamente ao registrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, name, role)
  values (
    new.id, 
    new.email, 
    'requester', -- Default role
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger ativação (comente se não tiver acesso de superuser para criar trigger, mas em dev local usually ok)
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();

-- 1. Tabela de Ativos (Assets) - Atualizada com Specs Técnicas
create table public.assets (
  id text primary key,
  name text not null,
  code text, -- Patrimônio
  model text,
  manufacturer text,
  serial_number text,
  location text,
  status text check (status in ('operational', 'maintenance', 'stopped', 'inactive')),
  criticality text check (criticality in ('low', 'medium', 'high')),
  
  -- Novos Campos Técnicos (Seção 3.1)
  power text, -- Ex: 10CV
  capacity text, -- Ex: 5000L
  voltage text, -- Ex: 220V
  acquisition_date date,
  acquisition_cost numeric,
  
  image text, -- Imagem principal
  documents text[], -- Array de URLs para manuais/esquemas
  
  mtbf integer, 
  mttr integer, 
  parent_id text references public.assets(id),
  qr_code text,
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

-- 3. Tabela de Chamados/Tickets (Maintenance Tickets) - Update Workflow
create table public.tickets (
  id text primary key,
  title text not null,
  description text,
  requester_id uuid references public.profiles(id), -- Link real para usuário
  requester_name text, -- Denormalized para facilidade
  asset_id text references public.assets(id),
  
  type text, 
  urgency text check (urgency in ('low', 'medium', 'high')), -- Solicitante define
  priority text check (priority in ('low', 'medium', 'high', 'critical')), -- Gestor define
  
  status text check (status in ('open', 'analyzing', 'assigned', 'in-progress', 'waiting-parts', 'done', 'cancelled')),
  
  assignee_id uuid references public.profiles(id), -- Técnico Responsável
  
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
  part_name text, 
  quantity integer not null,
  unit_cost numeric,
  total_cost numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabela de Planos Preventivos (Preventive Plans) - Nova Tabela
create table public.preventive_plans (
  id text primary key,
  name text not null,
  description text,
  frequency_type text check (frequency_type in ('time', 'usage')),
  frequency_value integer,
  frequency_unit text, -- days, months, hours
  tasks jsonb, -- Array de checkist itens
  
  asset_ids text[], -- Array de IDs de assets
  assigned_team_id text, -- Opcional
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.tickets enable row level security;

-- Policies (Simplificadas para Dev, mas estruturadas)
-- Profiles: Leitura publica (para ver nomes), Escrita self ou admin
create policy "Public Profiles Read" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Assets: Leitura Todos, Escrita Manager/Admin
create policy "Assets Read All" on public.assets for select using (true);
create policy "Assets Write Admin" on public.assets for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);

-- Tickets: 
-- Leitura: Requester vê seus, Tech/Manager vê todos
create policy "Tickets Read Logic" on public.tickets for select using (
  (auth.uid() = requester_id) or 
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'technician'))
);
-- Escrita:
-- Requester pode criar (INSERT)
-- Requester pode editar (UPDATE) apenas se status = 'open'
-- Tech/Manager pode editar tudo
create policy "Tickets Insert All" on public.tickets for insert with check (true);
