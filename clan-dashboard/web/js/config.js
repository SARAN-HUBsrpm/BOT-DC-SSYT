// ตั้งค่าเว็บไซต์ (ไฟล์นี้เปิดเผยต่อสาธารณะได้ → ใส่เฉพาะ Publishable key เท่านั้น!)
// ห้ามใส่ Secret key / Token ในไฟล์นี้เด็ดขาด
window.CONFIG = {
  SUPABASE_URL: 'https://gaxlkttxsnqxqpfgmnqh.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_UAXl9n90KKiwVgjpHQVSQQ_W-VUkf05',

  CLAN_NAME_FALLBACK: 'SSYT PAINFUL1',
  REFRESH_MS: 30000, // รีเฟรชสถานะสมาชิกทุกกี่ ms (หน้า Members)

  // หมวดหมู่สมาชิก: slug ต้องตรงกับ category ใน bot/config/roleMapping.js
  // (Phase 7 จะย้ายไปจัดการใน Database)
  CATEGORIES: [
    { slug: 'sword',         name: 'สายดาบ',        icon: '⚔️', color: '#ff4d6d' },
    { slug: 'gun',           name: 'สายปืน',        icon: '🔫', color: '#38bdf8' },
    { slug: 'skilled-build', name: 'Skilled Build', icon: '🧠', color: '#c084fc' },
    { slug: 'dark-shizu',    name: 'Dark Shizu',    icon: '🌑', color: '#818cf8' },
  ],
};
