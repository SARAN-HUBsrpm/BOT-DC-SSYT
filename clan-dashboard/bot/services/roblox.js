// เรียก Roblox Public API (ไม่ต้องใช้ API key)
// Endpoint ที่ใช้ (ตรวจกับเอกสารแล้ว):
//   POST users.roblox.com/v1/usernames/users      ชื่อ → ID
//   GET  users.roblox.com/v1/users/{id}           ข้อมูลผู้ใช้ (รวม description)
//   POST users.roblox.com/v1/users                ข้อมูลผู้ใช้หลายคน
//   GET  friends.roblox.com/v1/users/{id}/friends/count
//   GET  friends.roblox.com/v1/users/{id}/followers/count
//   GET  thumbnails.roblox.com/v1/users/avatar | avatar-headshot

const USERS = 'https://users.roblox.com';
const FRIENDS = 'https://friends.roblox.com';
const THUMBS = 'https://thumbnails.roblox.com';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function rbxFetch(url, options = {}, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    let res;
    try {
      res = await fetch(url, {
        ...options,
        headers: { Accept: 'application/json', 'User-Agent': 'ClanDashboardBot/1.0', ...(options.headers || {}) },
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      if (i < retries) { await sleep(1000 * (i + 1)); continue; }
      throw new Error('เชื่อมต่อ Roblox ไม่ได้ ลองใหม่ภายหลัง');
    }
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after')) || 2 * (i + 1);
      await sleep(wait * 1000);
      continue;
    }
    if (res.status >= 500 && i < retries) { await sleep(1000 * (i + 1)); continue; }
    return res;
  }
  throw new Error('Roblox API ถูกใช้งานหนาแน่น (rate limit) ลองใหม่ภายหลัง');
}

async function getJson(url, options) {
  const res = await rbxFetch(url, options);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Roblox API error ${res.status}`);
  return res.json();
}

// ชื่อผู้ใช้ → { id, name, displayName } หรือ null
async function findByUsername(username) {
  const json = await getJson(`${USERS}/v1/usernames/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
  });
  return json?.data?.[0] ?? null;
}

// ID → ข้อมูลผู้ใช้ (มี description ไว้ใช้ยืนยันความเป็นเจ้าของ) หรือ null
async function getUser(id) {
  return getJson(`${USERS}/v1/users/${id}`);
}

// รับ username หรือ User ID จากผู้ใช้ → { id, name, displayName, description, isBanned } หรือ null
async function resolveUser(input) {
  const text = String(input || '').trim().replace(/^@/, '');
  if (/^\d{1,15}$/.test(text)) return getUser(text);
  if (!/^[A-Za-z0-9_]{3,20}$/.test(text)) {
    throw new Error('รูปแบบชื่อ Roblox ไม่ถูกต้อง (ใช้ a-z, 0-9, _ ยาว 3-20 ตัว) หรือใส่เป็น User ID ตัวเลข');
  }
  const found = await findByUsername(text);
  return found ? getUser(found.id) : null;
}

async function getUsersByIds(ids) {
  const out = new Map();
  for (const part of chunk(ids, 100)) {
    const json = await getJson(`${USERS}/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: part.map(Number), excludeBannedUsers: false }),
    });
    for (const u of json?.data ?? []) out.set(String(u.id), u);
  }
  return out;
}

async function getCount(kind, id) {
  try {
    const json = await getJson(`${FRIENDS}/v1/users/${id}/${kind}/count`);
    return typeof json?.count === 'number' ? json.count : null;
  } catch { return null; }
}

// ดึงรูป Thumbnail เป็นชุด คืน Map(id → imageUrl) เฉพาะที่ state = Completed
// รูปที่ยัง "Pending" จะลองใหม่ให้อีก 2 ครั้ง
async function getThumbs(type, size, ids) {
  const result = new Map();
  let remaining = ids.map(String);
  for (let attempt = 0; attempt < 3 && remaining.length; attempt++) {
    if (attempt > 0) await sleep(1500);
    const stillPending = [];
    for (const part of chunk(remaining, 50)) {
      const json = await getJson(
        `${THUMBS}/v1/users/${type}?userIds=${part.join(',')}&size=${size}&format=Png&isCircular=false`
      );
      for (const item of json?.data ?? []) {
        if (item.state === 'Completed' && item.imageUrl) result.set(String(item.targetId), item.imageUrl);
        else if (item.state === 'Pending') stillPending.push(String(item.targetId));
      }
    }
    remaining = stillPending;
  }
  return result;
}

// ดึงโปรไฟล์ Roblox หลายคนพร้อมกัน → Map(id → object พร้อมอัปเดตลง DB)
// ค่าที่ดึงไม่สำเร็จจะ "ไม่ใส่" ใน object เพื่อไม่ให้เขียนทับข้อมูลเดิมด้วยค่าว่าง
async function fetchProfiles(ids) {
  const unique = [...new Set(ids.map(String))];
  const out = new Map();
  if (!unique.length) return out;

  const users = await getUsersByIds(unique);
  const bodies = await getThumbs('avatar', '420x420', unique);
  const heads = await getThumbs('avatar-headshot', '150x150', unique);

  for (const id of unique) {
    const u = users.get(id);
    if (!u && !bodies.has(id)) continue; // ไม่พบบัญชีเลย
    const friends = await getCount('friends', id);
    const followers = await getCount('followers', id);
    await sleep(150); // เว้นจังหวะ กัน rate limit

    const row = {
      roblox_id: Number(id),
      roblox_username: u?.name,
      roblox_display_name: u?.displayName,
      roblox_avatar: bodies.get(id),
      roblox_headshot: heads.get(id),
      roblox_friends: friends,
      roblox_followers: followers,
      roblox_avatar_updated_at: bodies.has(id) ? new Date().toISOString() : undefined,
    };
    for (const k of Object.keys(row)) if (row[k] === undefined || row[k] === null) delete row[k];
    out.set(id, row);
  }
  return out;
}

async function fetchProfile(id) {
  return (await fetchProfiles([id])).get(String(id)) ?? null;
}

module.exports = { resolveUser, getUser, findByUsername, fetchProfiles, fetchProfile, getThumbs };
