-- Draft — schema for the MVP described in the brief (section 4).
-- Run this against a fresh Supabase project (SQL editor, or `supabase db push`).

create extension if not exists "pgcrypto";

create type card_status as enum ('spark', 'draft', 'rough', 'done');

-- ---------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Черновик',
  -- Self-referencing: lets a project nest arbitrarily deep in the sidebar
  -- (part -> chapter -> scene, or however deep the author wants). Null is
  -- a root-level project.
  parent_id uuid references projects (id) on delete cascade
);

create index projects_user_id_idx on projects (user_id);
create index projects_parent_id_idx on projects (parent_id);

alter table projects enable row level security;

create policy "projects: owner can select" on projects
  for select using (auth.uid() = user_id);

create policy "projects: owner can insert" on projects
  for insert with check (auth.uid() = user_id);

create policy "projects: owner can update" on projects
  for update using (auth.uid() = user_id);

create policy "projects: owner can delete" on projects
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------
create table cards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  text text not null,
  status card_status not null default 'spark',
  created_at timestamptz not null default now(),
  -- Set once the author drags a card into a manual position in the
  -- timeline; null means it hasn't been placed yet ("пока вне сюжета").
  manual_order integer,
  -- "Pinned" position in the cloud's force simulation (d3-force fixed
  -- position). Null means the card is free to move with the simulation.
  fx double precision,
  fy double precision
);

create index cards_project_id_idx on cards (project_id);
create index cards_project_manual_order_idx on cards (project_id, manual_order);

alter table cards enable row level security;

create policy "cards: owner can select" on cards
  for select using (
    exists (
      select 1 from projects
      where projects.id = cards.project_id and projects.user_id = auth.uid()
    )
  );

create policy "cards: owner can insert" on cards
  for insert with check (
    exists (
      select 1 from projects
      where projects.id = cards.project_id and projects.user_id = auth.uid()
    )
  );

create policy "cards: owner can update" on cards
  for update using (
    exists (
      select 1 from projects
      where projects.id = cards.project_id and projects.user_id = auth.uid()
    )
  );

create policy "cards: owner can delete" on cards
  for delete using (
    exists (
      select 1 from projects
      where projects.id = cards.project_id and projects.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- card_links — schema laid down for the MVP per the brief, no UI yet.
-- ---------------------------------------------------------------------
create table card_links (
  card_id uuid not null references cards (id) on delete cascade,
  linked_card_id uuid not null references cards (id) on delete cascade,
  type text not null default 'sequence',
  primary key (card_id, linked_card_id)
);

alter table card_links enable row level security;

create policy "card_links: owner can select" on card_links
  for select using (
    exists (
      select 1 from cards
      join projects on projects.id = cards.project_id
      where cards.id = card_links.card_id and projects.user_id = auth.uid()
    )
  );

create policy "card_links: owner can insert" on card_links
  for insert with check (
    exists (
      select 1 from cards
      join projects on projects.id = cards.project_id
      where cards.id = card_links.card_id and projects.user_id = auth.uid()
    )
  );

create policy "card_links: owner can delete" on card_links
  for delete using (
    exists (
      select 1 from cards
      join projects on projects.id = cards.project_id
      where cards.id = card_links.card_id and projects.user_id = auth.uid()
    )
  );
