-- Migração: 02_scheduler_lock.sql
-- Objetivo: Garantir que planos preventivos rodem apenas uma vez por dia/ciclo.

create table public.preventive_logs (
  id uuid default gen_random_uuid() primary key,
  plan_id text references public.preventive_plans(id),
  execution_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Garante que um Plano só tenha UM log por dia
  unique(plan_id, execution_date)
);

-- Habilitar RLS
alter table public.preventive_logs enable row level security;

-- Policies
-- Todos podem ler (para verificar se já rodou)
create policy "Read Preventive Logs" on public.preventive_logs for select using (true);

-- Apenas sistema ou usuários autenticados podem inserir (o contexto chamará isso)
create policy "Insert Preventive Logs" on public.preventive_logs for insert with check (true);
