-- Singleton site settings for the owner admin panel (ads + future knobs).
create table if not exists site_settings (
  id integer primary key check (id = 1),
  owner_user_id text,
  ads_enabled boolean not null default false,
  adsense_publisher_id text not null default '',
  adsense_slot_id text not null default '',
  site_notice text not null default '',
  tagline text not null default 'Convert, sign, and scan. Files never leave this device.',
  updated_at timestamptz not null default now()
);

insert into site_settings (id)
values (1)
on conflict (id) do nothing;
