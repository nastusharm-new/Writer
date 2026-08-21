-- Migration for existing projects that already applied schema.sql before
-- the sidebar/project-tree feature. Adds nesting to `projects`.
-- Run this once in the Supabase SQL Editor.

alter table projects
  add column if not exists parent_id uuid references projects (id) on delete cascade;

create index if not exists projects_parent_id_idx on projects (parent_id);
