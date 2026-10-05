-- =====================================================
-- Phase 3 : ตั้งค่า Clan + Owner สำหรับเว็บไซต์
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run
-- (ต้องรัน schema.sql ของ Phase 2 มาก่อนแล้ว) รันซ้ำได้ ไม่พัง
-- =====================================================

create table if not exists public.clan_settings (
  id               int primary key default 1 check (id = 1),   -- มีแถวเดียว
  clan_name        text not null default 'My Clan',
  description      text,
  logo_url         text,
  cover_url        text,
  owner_discord_id text,        -- Discord ID ของ Owner (ไม่ hardcode ในโค้ด)
  discord_url      text,
  tiktok_url       text,
  youtube_url      text,
  facebook_url     text,
  updated_at       timestamptz not null default now()
);

-- แถวเริ่มต้น (แก้ค่าได้ที่ Table Editor → clan_settings)
insert into public.clan_settings (id, clan_name, description, owner_discord_id)
values (1, 'SSYT PAINFUL1', 'Clan Community', '956211423879499806')
on conflict (id) do nothing;

alter table public.clan_settings enable row level security;
revoke all on public.clan_settings from anon, authenticated;

-- ข้อมูล Clan ที่เปิดให้เว็บอ่าน (ไม่มี owner_discord_id)
create or replace view public.public_clan as
select
  c.clan_name,
  c.description,
  c.logo_url,
  c.cover_url,
  c.discord_url,
  c.tiktok_url,
  c.youtube_url,
  c.facebook_url,
  (select m.id from public.members m where m.discord_id = c.owner_discord_id) as owner_member_id
from public.clan_settings c;

grant select on public.public_clan to anon, authenticated;

-- เพิ่มคอลัมน์ is_owner ให้ View สมาชิก (ต่อท้ายคอลัมน์เดิม)
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
  m.updated_at,
  coalesce(m.discord_id = (select owner_discord_id from public.clan_settings where id = 1), false) as is_owner
from public.members m
where m.is_in_server and not m.is_bot;

grant select on public.public_members to anon, authenticated;
