// เก็บ/อัปเดต ความสัมพันธ์ Discord ID → Roblox User ID ใน Supabase
const { supabase } = require('./supabase');
const { toMemberRow } = require('./memberMapper');
const roblox = require('./roblox');

// ให้แน่ใจว่ามีแถวสมาชิกในตาราง (กรณีเพิ่งเข้า Server แล้วยังไม่ถูก sync)
async function ensureMember(member) {
  const { error } = await supabase.from('members').upsert(
    { ...toMemberRow(member), is_in_server: true, synced_at: new Date().toISOString() },
    { onConflict: 'discord_id' }
  );
  if (error) throw new Error(`บันทึกสมาชิกไม่สำเร็จ: ${error.message}`);
}

async function getRow(discordId) {
  const { data, error } = await supabase.from('members').select('*').eq('discord_id', discordId).maybeSingle();
  if (error) throw new Error(`อ่านข้อมูลไม่สำเร็จ: ${error.message}`);
  return data;
}

// คืน discord_id ของคนที่เชื่อมบัญชี Roblox นี้อยู่ (หรือ null)
async function findOwnerOfRoblox(robloxId) {
  const { data, error } = await supabase.from('members').select('discord_id').eq('roblox_id', Number(robloxId)).limit(1);
  if (error) throw new Error(`อ่านข้อมูลไม่สำเร็จ: ${error.message}`);
  return data?.[0]?.discord_id ?? null;
}

async function linkRoblox(discordId, profile, { verified }) {
  const taken = await findOwnerOfRoblox(profile.roblox_id);
  if (taken && taken !== discordId) return { ok: false, reason: 'taken' };

  const { error } = await supabase
    .from('members')
    .update({ ...profile, roblox_verified: Boolean(verified), roblox_linked_at: new Date().toISOString() })
    .eq('discord_id', discordId);
  if (error) {
    if (error.code === '23505') return { ok: false, reason: 'taken' };
    throw new Error(`บันทึกไม่สำเร็จ: ${error.message}`);
  }
  return { ok: true };
}

async function unlinkRoblox(discordId) {
  const { error } = await supabase
    .from('members')
    .update({
      roblox_id: null, roblox_username: null, roblox_display_name: null,
      roblox_avatar: null, roblox_headshot: null, roblox_friends: null,
      roblox_followers: null, roblox_avatar_updated_at: null,
      roblox_verified: false, roblox_linked_at: null,
    })
    .eq('discord_id', discordId);
  if (error) throw new Error(`ยกเลิกไม่สำเร็จ: ${error.message}`);
}

// รีเฟรชข้อมูล Roblox ของทุกคนที่เชื่อมไว้ (ชื่อ, Avatar ล่าสุด, Friends/Followers)
async function refreshLinkedRoblox() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('members')
      .select('discord_id, roblox_id')
      .not('roblox_id', 'is', null)
      .eq('is_in_server', true)
      .range(from, from + 999);
    if (error) throw new Error(`อ่านข้อมูลไม่สำเร็จ: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  if (!rows.length) return { linked: 0, updated: 0, failed: 0 };

  const profiles = await roblox.fetchProfiles(rows.map((r) => r.roblox_id));
  let updated = 0, failed = 0;
  for (const r of rows) {
    const p = profiles.get(String(r.roblox_id));
    if (!p) { failed++; continue; }
    const { roblox_id, ...rest } = p;
    const { error } = await supabase.from('members').update(rest).eq('discord_id', r.discord_id);
    if (error) failed++; else updated++;
  }
  return { linked: rows.length, updated, failed };
}

module.exports = { ensureMember, getRow, findOwnerOfRoblox, linkRoblox, unlinkRoblox, refreshLinkedRoblox };
