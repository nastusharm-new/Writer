-- Adds image attachments (sketches/reference images, stored as data URIs)
-- and soft-delete (archive) support to cards. Run against an already-
-- deployed project; schema.sql already has these for fresh installs.

alter table cards add column if not exists images jsonb not null default '[]'::jsonb;
alter table cards add column if not exists archived_at timestamptz;

create index if not exists cards_archived_at_idx on cards (project_id, archived_at);
