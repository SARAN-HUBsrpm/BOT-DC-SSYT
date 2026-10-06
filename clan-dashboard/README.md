# Clan Dashboard — Phase 5 (Auto Sync)

1. Supabase → SQL Editor → รัน `supabase/schema.sql`, `supabase/phase3.sql`, `supabase/phase4.sql` ตามลำดับ (Phase 5 ไม่ต้องเพิ่มตารางใหม่)
2. รัน `npm.cmd run deploy` เพื่อลงทะเบียน `/health` เพิ่มจากคำสั่งเดิม
3. รัน `npm.cmd run bot`
4. รัน `npm.cmd run web` → เปิด `http://localhost:3000`

## Phase 5 ทำอะไรอัตโนมัติ

- สมาชิกเข้า/ออก Server จะอัปเดต Supabase เอง
- Role, ชื่อเล่น, Display name, Username, Avatar และ Status จะเข้าคิวอัปเดตเอง
- Role ถูกเปลี่ยนชื่อ/ลบ จะอัปเดต `roles` และ `builds` ของสมาชิกที่เกี่ยวข้อง
- Roblox profile/avatar/friends/followers จะรีเฟรชเป็นรอบ
- Full sync จะรันเป็นรอบเพื่อเป็นตาข่ายนิรภัย
- `/health` ใช้ดูสถานะ queue, Roblox refresh, full sync และสั่ง shutdown แบบ flush queue ก่อนปิดได้

## ตัวแปรเสริมใน `.env`

ไม่ใส่ก็ใช้ค่า default ได้:

```env
MEMBER_QUEUE_FLUSH_MS=5000
MEMBER_QUEUE_MAX_BATCH=250
ROBLOX_REFRESH_INTERVAL_MINUTES=20
FULL_SYNC_INTERVAL_MINUTES=60
```

## คำสั่ง Discord

- `/health action:status` ตรวจสถานะระบบ
- `/health action:refresh-roblox` รีเฟรช Roblox ทันที
- `/health action:full-sync` Sync Discord ทั้ง Server ทันที
- `/health action:shutdown` ปิดบอทอย่างปลอดภัย
