const { toMemberRow } = require('./memberMapper');
const { supabase } = require('./supabase');

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ดึง discord_id ทั้งหมดที่ยังอยู่ใน Server จาก DB (แบ่งหน้าทีละ 1000)
async function getActiveIdsFromDb() {
  const ids = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from('members')
      .select('discord_id')
      .eq('is_in_server', true)
      .range(from, from + page - 1);
    if (error) throw new Error(`อ่านข้อมูลจาก DB ไม่ได้: ${error.message}`);
    ids.push(...data.map((d) => d.discord_id));
    if (data.length < page) break;
  }
  return ids;
}

// Sync สมาชิกทั้ง Server → Supabase
async function syncGuild(guild) {
  const started = Date.now();

  const members = await guild.members.fetch(); // ต้องเปิด Server Members Intent
  const now = new Date().toISOString();
  const rows = members.map((m) => ({
    ...toMemberRow(m),
    is_in_server: true,
    synced_at: now,
  }));

  // Upsert เป็นชุดละ 500 คน (Discord ID ซ้ำ = อัปเดตแถวเดิม)
  for (const part of chunk(rows, 500)) {
    const { error } = await supabase.from('members').upsert(part, { onConflict: 'discord_id' });
    if (error) throw new Error(`Upsert ไม่สำเร็จ: ${error.message}`);
  }

  // คนที่ออกจาก Server แล้ว → ไม่ลบทิ้ง แค่ทำเครื่องหมาย is_in_server = false
  const current = new Set(rows.map((r) => r.discord_id));
  const dbIds = await getActiveIdsFromDb();
  const left = dbIds.filter((id) => !current.has(id));
  for (const part of chunk(left, 100)) {
    const { error } = await supabase
      .from('members')
      .update({ is_in_server: false })
      .in('discord_id', part);
    if (error) throw new Error(`อัปเดตสมาชิกที่ออกไม่สำเร็จ: ${error.message}`);
  }

  return {
    total: rows.length,
    bots: rows.filter((r) => r.is_bot).length,
    left: left.length,
    ms: Date.now() - started,
  };
}

// ดึง Banner ทีละคน (ช้า เพราะ Discord ต้องเรียกแยกคน) ใช้เฉพาะเมื่อสั่ง /sync banners:True
async function syncBanners(guild) {
  const members = await guild.members.fetch();
  let updated = 0;
  for (const member of members.values()) {
    if (member.user.bot) continue;
    try {
      const user = await guild.client.users.fetch(member.id, { force: true });
      const url = user.bannerURL({ size: 1024 }) ?? null;
      const { error } = await supabase
        .from('members')
        .update({ discord_banner: url })
        .eq('discord_id', member.id);
      if (!error) updated++;
    } catch (err) {
      console.warn(`ดึง Banner ไม่ได้: ${member.id}`, err.message);
    }
    await sleep(250); // เว้นจังหวะ กัน rate limit
  }
  return updated;
}

// พิมพ์รายการ Role + ID ไว้ให้ copy ไปใส่ roleMapping.js
async function printRoles(guild) {
  const roles = await guild.roles.fetch();
  console.log('--- Roles ใน Server (copy ID ไปใส่ bot/config/roleMapping.js) ---');
  console.table(
    roles
      .filter((r) => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.id, name: r.name }))
  );
}

module.exports = { syncGuild, syncBanners, printRoles };
