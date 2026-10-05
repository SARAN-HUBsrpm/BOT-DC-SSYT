// Role Mapping: ใช้ Role ID เป็นหลัก (ชื่อ Role เปลี่ยนได้ แต่ ID ไม่เปลี่ยน)
// วิธีหา Role ID: ตอนเปิดบอท Terminal จะพิมพ์ตาราง Role พร้อม ID ให้เลย
// แล้วนำ ID มาแทนที่ PUT_..._HERE ด้านล่าง
const ROLE_MAPPING = [
  { roleId: '1556374732004130877',   category: 'sword',         name: 'สายดาบ',        icon: '⚔️', order: 1 },
  { roleId: '1556374781799043112',     category: 'gun',           name: 'สายปืน',        icon: '🔫', order: 2 },
  { roleId: '1556374831396687987', category: 'skilled-build', name: 'Skilled Build', icon: '🧠', order: 3 },
  { roleId: '1556374865903362089',   category: 'dark-shizu',    name: 'Dark Shizu',    icon: '🌑', order: 4 },
];

// รับ array ของ Role ID → คืนรายชื่อ category (ไม่ซ้ำ เรียงตาม order)
// สมาชิกมีหลาย Role = ได้หลาย category
function getBuilds(roleIds) {
  const set = new Set(roleIds);
  return ROLE_MAPPING
    .filter((m) => set.has(m.roleId))
    .sort((a, b) => a.order - b.order)
    .map((m) => m.category);
}

module.exports = { ROLE_MAPPING, getBuilds };
