-- Lavender schema: profiles, style preferences, clothing, outfits, outfit pieces, planned outfits.
-- Every table is owner-scoped with row-level security. Photos live in a private storage bucket
-- under a folder named after the owner's user id.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  favorite_colors text[] not null default '{}',
  avoided_colors text[] not null default '{}',
  styling_goals text[] not null default '{}',
  preferred_categories text[] not null default '{}',
  typical_occasions text[] not null default '{}',
  preferred_fit text check (preferred_fit in ('fitted', 'regular', 'relaxed', 'oversized')),
  budget_amount numeric(12, 2) check (budget_amount >= 0),
  budget_currency text check (char_length(budget_currency) = 3),
  settings jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.style_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  aesthetic text not null check (char_length(aesthetic) between 1 and 40),
  preference_strength smallint not null check (preference_strength between 1 and 3),
  created_at timestamptz not null default now(),
  unique (user_id, aesthetic)
);

-- ---------------------------------------------------------------------------
-- Clothing
-- ---------------------------------------------------------------------------
create table public.clothing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null check (category in (
    'tops', 'tshirts', 'shirts', 'knitwear', 'trousers', 'jeans', 'skirts', 'shorts', 'dresses',
    'jumpsuits', 'outerwear', 'shoes', 'bags', 'jewelry', 'accessories', 'other')),
  subcategory text,
  image_path text,
  colors text[] not null check (cardinality(colors) between 1 and 4),
  pattern text not null default 'solid' check (pattern in (
    'solid', 'striped', 'floral', 'plaid', 'checked', 'polka-dot', 'graphic', 'animal', 'textured', 'other')),
  style_tags text[] not null default '{}' check (cardinality(style_tags) <= 12),
  seasons text[] not null default '{}' check (seasons <@ array['spring', 'summer', 'autumn', 'winter']),
  occasions text[] not null default '{}',
  fit text check (fit in ('fitted', 'regular', 'relaxed', 'oversized')),
  favorite boolean not null default false,
  times_worn integer not null default 0 check (times_worn >= 0),
  last_worn_at timestamptz,
  brand text check (char_length(brand) <= 60),
  notes text check (char_length(notes) <= 500),
  purchase jsonb,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Storage paths must sit inside the owner's folder.
  constraint image_path_owned check (image_path is null or image_path like user_id::text || '/%')
);

create index clothing_items_user_created_idx on public.clothing_items (user_id, created_at desc);
create index clothing_items_user_category_idx on public.clothing_items (user_id, category);
create index clothing_items_style_tags_idx on public.clothing_items using gin (style_tags);

-- ---------------------------------------------------------------------------
-- Outfits
-- ---------------------------------------------------------------------------
create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  style_tags text[] not null default '{}',
  occasion text,
  notes text check (char_length(notes) <= 500),
  favorite boolean not null default false,
  times_worn integer not null default 0 check (times_worn >= 0),
  last_worn_at timestamptz,
  parent_outfit_id uuid references public.outfits (id) on delete set null,
  source text not null default 'studio' check (source in ('studio', 'stylist', 'sample')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outfits_user_idx on public.outfits (user_id, updated_at desc);

-- Join table: deleting a clothing item removes it from outfits; deleting an outfit removes its links.
create table public.outfit_items (
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  item_id uuid not null references public.clothing_items (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position smallint not null default 0,
  primary key (outfit_id, item_id)
);

create index outfit_items_item_idx on public.outfit_items (item_id);

-- ---------------------------------------------------------------------------
-- Calendar
-- ---------------------------------------------------------------------------
create table public.planned_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  date date not null,
  occasion text check (char_length(occasion) <= 60),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Prevents accidentally planning the same outfit twice on one day.
  unique (user_id, outfit_id, date)
);

create index planned_outfits_user_date_idx on public.planned_outfits (user_id, date);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger clothing_items_touch before update on public.clothing_items for each row execute function public.touch_updated_at();
create trigger outfits_touch before update on public.outfits for each row execute function public.touch_updated_at();
create trigger planned_outfits_touch before update on public.planned_outfits for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: owners only
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.style_preferences enable row level security;
alter table public.clothing_items enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.planned_outfits enable row level security;

create policy "profiles: owner" on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "style_preferences: owner" on public.style_preferences
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "clothing_items: owner" on public.clothing_items
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "outfits: owner" on public.outfits
  for all using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (parent_outfit_id is null or exists (select 1 from public.outfits p where p.id = parent_outfit_id and p.user_id = (select auth.uid())))
  );

-- A link is only valid when both the outfit and the piece belong to the caller.
create policy "outfit_items: owner" on public.outfit_items
  for all using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid()))
    and exists (select 1 from public.clothing_items i where i.id = item_id and i.user_id = (select auth.uid()))
  );

create policy "planned_outfits: owner" on public.planned_outfits
  for all using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Private photo storage: <user id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe-images', 'wardrobe-images', false, 12582912, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "wardrobe images: owner read" on storage.objects
  for select using (bucket_id = 'wardrobe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "wardrobe images: owner insert" on storage.objects
  for insert with check (bucket_id = 'wardrobe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "wardrobe images: owner update" on storage.objects
  for update using (bucket_id = 'wardrobe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "wardrobe images: owner delete" on storage.objects
  for delete using (bucket_id = 'wardrobe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
