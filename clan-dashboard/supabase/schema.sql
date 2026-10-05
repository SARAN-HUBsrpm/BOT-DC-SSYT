-- =====================================================
-- Clan Dashboard : Phase 2 schema
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run
-- รันซ้ำได้ ไม่พัง
-- =====================================================

create table if not exists public.members (
  id                        uuid primary key default gen_random_uuid(),
  discord_id                text not null unique,          -- Identifier หลัก (ห้ามใช้ username)
  discord_username          text not null,
  discord_display_name      text,
  discord_server_nickname   text,
  discord_avatar            text,
  discord_banner            text,
  discord_status            text not null default 'offline'
                            check (discord_status in ('online','idle','dnd','offline')),

  -- ช่อง Roblox (เตรียมไว้ จะใช้ใน Phase 4)
  roblox_id                 bigint unique,
  roblox_username           text,
  roblox_display_name       text,
  roblox_avatar             text,
  roblox_avatar_updated_at  timestamptz,

  roles                     jsonb not null default '[]'::jsonb,  -- [{id,name}]
  builds                    text[] not null default '{}',        -- หมวดหมู่ที่คำนวณจาก Role Mapping

  is_bot                    boolean not null default false,
  is_in_server              boolean not null default true,       -- false = ออกจาก Server แล้ว
  joined_at                 timestamptz,
  synced_at                 timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists members_builds_idx on public.members using gin (builds);
create index if not exists members_status_idx on public.members (discord_status);

-- อัปเดต updated_at อัตโนมัติ
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

-- =====================================================
-- SECURITY (RLS)
-- ตาราง members ปิดไม่ให้เว็บอ่านตรง (มี discord_id และ role id)
-- เว็บอ่านผ่าน View "public_members" ที่ไม่มีข้อมูลภายในเท่านั้น
-- Bot ใช้ Secret key จึงเข้าถึงตารางเต็มได้
-- =====================================================
alter table public.members enable row level security;

revoke all on public.members from anon, authenticated;

create or replace view public.public_members as
select
  m.id,
  m.discord_username,
  m.discord_display_name,
  m.discord_server_nickname,
  m.discord_avatar,
  m.discord_banner,
  m.discord_status,
  m.roblox_id,
  m.roblox_username,
  m.roblox_display_name,
  m.roblox_avatar,
  m.builds,
  coalesce((select jsonb_agg(r->>'name') from jsonb_array_elements(m.roles) r), '[]'::jsonb) as role_names,
  m.joined_at,
  m.updated_at
from public.members m
where m.is_in_server and not m.is_bot;

grant select on public.public_members to anon, authenticated;
