-- Grab House Challenge - run once in Supabase SQL editor.

create table if not exists grab_people (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  name text not null,
  department text not null,
  email text not null unique,
  phone text not null,
  house text not null check (house in ('blue','red','green','yellow')),
  created_at timestamptz not null default now(),
  checked_in_at timestamptz,
  gift_claimed_at timestamptz
);

create table if not exists grab_scores (
  id bigserial primary key,
  challenge text not null,
  house text not null,
  points numeric not null,
  note text,
  by_name text,
  created_at timestamptz not null default now()
);

alter table grab_people enable row level security;
alter table grab_scores enable row level security;

-- Demo-grade policies (anon key can read/write). Tighten before a public launch.
create policy "people all" on grab_people for all using (true) with check (true);
create policy "scores all" on grab_scores for all using (true) with check (true);

alter publication supabase_realtime add table grab_people;
alter publication supabase_realtime add table grab_scores;
