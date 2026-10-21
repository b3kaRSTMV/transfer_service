-- 1. Создаёт таблицу цен.
create table if not exists public.prices (
    id text primary key,
    category text not null,
    name text not null,
    price integer not null check (price >= 0),
    sort_order integer not null default 0,
    updated_at timestamptz not null default now()
);

alter table public.prices enable row level security;

-- Читать цены могут все посетители сайта.
create policy "Public can read prices"
on public.prices for select
to anon, authenticated
using (true);

-- ВАЖНО: замените EMAIL_ОТЦА на email, который создадите в Authentication > Users.
create policy "Owner can add prices"
on public.prices for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'EMAIL_ОТЦА');

create policy "Owner can update prices"
on public.prices for update
to authenticated
using ((auth.jwt() ->> 'email') = 'EMAIL_ОТЦА')
with check ((auth.jwt() ->> 'email') = 'EMAIL_ОТЦА');

create policy "Owner can delete prices"
on public.prices for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'EMAIL_ОТЦА');
