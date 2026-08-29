-- Tracks each paid order and the license key issued for it — written only
-- by the payment webhook (api/yookassa-webhook.ts), using the service-role
-- key, which bypasses RLS. Nothing here is ever read or written by the
-- app's own users, so no policies are granted to anon/authenticated roles;
-- RLS is enabled purely so a future policy has to be added deliberately.
--
-- The unique constraint on provider_payment_id is what makes the webhook
-- idempotent: ЮKassa retries notifications until it gets a 2xx back, and a
-- retry must not re-issue (and re-email) a second license for the same
-- payment.
create table license_orders (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'yookassa',
  provider_payment_id text not null unique,
  email text not null,
  amount numeric(10, 2) not null,
  currency text not null,
  license_key text not null,
  created_at timestamptz not null default now()
);

create index license_orders_email_idx on license_orders (email);

alter table license_orders enable row level security;
