-- =====================================================
-- Phase 4 : Roblox
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run
-- (รันหลัง schema.sql และ phase3.sql) รันซ้ำได้ ไม่พัง
-- =====================================================

alter table public.members add column if not exists roblox_headshot  text;
alter table public.members add column if not exists roblox_friends   integer;
alter table public.members add column if not exists roblox_followers integer;
alter table public.members add column if not exists roblox_verified  boolean not null default false;
alter table public.members add column if not exists roblox_linked_at timestamptz;

-- View สาธารณะ: เพิ่มคอลัมน์ Roblox ต่อท้ายของเดิม
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
  coalesce(m.discord_id = (select owner_discord_id from public.clan_settings where id = 1), false) as is_owner,
  m.roblox_headshot,
  m.roblox_friends,
  m.roblox_followers,
  m.roblox_verified
from public.members m
where m.is_in_server and not m.is_bot;

grant select on public.public_members to anon, authenticated;
