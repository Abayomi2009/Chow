create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'driver', 'admin');
create type public.order_status as enum (
  'pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  description text not null default '',
  image_url text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  delivery_minutes integer not null default 30 check (delivery_minutes > 0),
  rating numeric(2, 1) not null default 5.0 check (rating between 0 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  description text not null default '',
  image_url text not null default '',
  price numeric(10, 2) not null check (price > 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  restaurant_id uuid not null references public.restaurants (id),
  driver_id uuid references public.profiles (id),
  status public.order_status not null default 'pending',
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  delivery_address text not null,
  delivery_latitude double precision not null,
  delivery_longitude double precision not null,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'failed')),
  payment_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id),
  item_name text not null,
  unit_price numeric(10, 2) not null check (unit_price > 0),
  quantity integer not null check (quantity between 1 and 30),
  line_total numeric(10, 2) not null check (line_total > 0)
);

create table public.driver_locations (
  driver_id uuid primary key references public.profiles (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  heading double precision check (heading between 0 and 360),
  updated_at timestamptz not null default now()
);

create table public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

create index orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index orders_driver_status_idx on public.orders (driver_id, status);
create index orders_restaurant_status_idx on public.orders (restaurant_id, status);
create index menu_items_restaurant_idx on public.menu_items (restaurant_id, is_available);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create or replace function public.is_order_participant(target_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = target_order
      and (o.customer_id = (select auth.uid()) or o.driver_id = (select auth.uid()))
  );
$$;

create or replace function public.admin_dashboard_metrics()
returns table (total_orders bigint, pending_orders bigint, delivered_revenue numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Admin access required';
  end if;
  return query
    select count(*),
      count(*) filter (where o.status in ('accepted', 'preparing') and o.payment_status = 'paid'),
      coalesce(sum(o.total) filter (where o.status = 'delivered' and o.payment_status = 'paid'), 0)
    from public.orders o;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.guard_order_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status
    and new.status not in ('pending', 'cancelled')
    and new.payment_status <> 'paid'
  then
    raise exception 'An order must be paid before it can be prepared or delivered';
  end if;
  if (select auth.role()) <> 'service_role' and not (select public.is_admin()) then
    if old.driver_id is distinct from (select auth.uid())
      or old.status not in ('ready', 'picked_up')
      or (old.status = 'ready' and new.status <> 'picked_up')
      or (old.status = 'picked_up' and new.status <> 'delivered')
    then
      raise exception 'Driver order status transition is not allowed';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_order_updates
  before update on public.orders
  for each row execute procedure public.guard_order_updates();

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.driver_locations enable row level security;
alter table public.push_tokens enable row level security;

create policy "Profiles readable by owner and admins" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Users update own non-role profile fields" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Active restaurants are public" on public.restaurants
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "Admins manage restaurants" on public.restaurants
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Available menu is public" on public.menu_items
  for select to anon, authenticated using (
    is_available
    and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.is_active)
    or (select public.is_admin())
  );
create policy "Admins manage menu" on public.menu_items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Participants and admins read orders" on public.orders
  for select to authenticated using (
    customer_id = (select auth.uid())
    or driver_id = (select auth.uid())
    or (select public.is_admin())
  );
create policy "Assigned drivers update order status" on public.orders
  for update to authenticated
  using (driver_id = (select auth.uid()))
  with check (driver_id = (select auth.uid()));
create policy "Admins manage orders" on public.orders
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Order participants read items" on public.order_items
  for select to authenticated using (
    (select public.is_order_participant(order_id)) or (select public.is_admin())
  );
create policy "Drivers and admins read locations" on public.driver_locations
  for select to authenticated using (
    driver_id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.orders o
      where o.driver_id = driver_locations.driver_id
        and o.customer_id = (select auth.uid())
        and o.status in ('accepted', 'preparing', 'ready', 'picked_up')
    )
  );
create policy "Drivers publish own location" on public.driver_locations
  for insert to authenticated with check (
    driver_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = driver_id and p.role = 'driver')
  );
create policy "Drivers update own location" on public.driver_locations
  for update to authenticated using (driver_id = (select auth.uid()))
  with check (
    driver_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = driver_id and p.role = 'driver')
  );
create policy "Users manage own push tokens" on public.push_tokens
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.restaurants, public.menu_items to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant select on public.orders to authenticated;
grant update (status, updated_at, driver_id) on public.orders to authenticated;
grant insert, update, delete on public.restaurants, public.menu_items to authenticated;
grant select on public.order_items to authenticated;
grant select, insert, update on public.driver_locations to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;
revoke all on function public.admin_dashboard_metrics() from public, anon;
grant execute on function public.admin_dashboard_metrics() to authenticated;

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.driver_locations;

insert into public.restaurants (id, name, category, description, image_url, latitude, longitude, delivery_fee, delivery_minutes, rating)
values
  ('00000000-0000-4000-8000-000000000001', 'The Green Bowl', 'Healthy · Bowls', 'Fresh bowls made to order.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900', 6.4281, 3.4219, 900, 25, 4.8),
  ('00000000-0000-4000-8000-000000000002', 'Mama T’s Kitchen', 'Nigerian · Local', 'Comforting local favourites.', 'https://images.unsplash.com/photo-1547592180-85f173990554?w=900', 6.435, 3.413, 700, 35, 4.9),
  ('00000000-0000-4000-8000-000000000003', 'Burger District', 'Burgers · Fast food', 'Smash burgers and sides.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900', 6.4225, 3.433, 1200, 20, 4.6);

insert into public.menu_items (id, restaurant_id, name, description, image_url, price)
select m.id, r.id, m.name, m.description, m.image_url, m.price
from (values
  ('00000000-0000-4000-8000-000000000101', 'The Green Bowl', 'Lagos crunch bowl', 'Grilled chicken, avocado, sweet corn and house dressing.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500', 6800::numeric),
  ('00000000-0000-4000-8000-000000000102', 'The Green Bowl', 'Spicy plantain bowl', 'Roasted plantain, greens, black beans and pepper sauce.', 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500', 5200::numeric),
  ('00000000-0000-4000-8000-000000000103', 'Mama T’s Kitchen', 'Jollof & grilled chicken', 'Smoky party jollof, grilled chicken and fried plantain.', 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=500', 7500::numeric),
  ('00000000-0000-4000-8000-000000000104', 'Burger District', 'Classic smash burger', 'Double smash patty, cheddar, pickles and district sauce.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500', 8900::numeric)
) as m(id, restaurant_name, name, description, image_url, price)
join public.restaurants r on r.name = m.restaurant_name;
