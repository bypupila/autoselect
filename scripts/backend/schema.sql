create table if not exists leads (
  id bigserial primary key,
  install_id text not null unique,
  email text,
  plan_type text not null default 'free',
  consent_marketing boolean not null default false,
  consent_at timestamptz,
  source text,
  unsubscribed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists license_events (
  id bigserial primary key,
  install_id text not null,
  event_type text not null,
  plan_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_license_events_install_id on license_events (install_id);
create index if not exists idx_license_events_type on license_events (event_type);
