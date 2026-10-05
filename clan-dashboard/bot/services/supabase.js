require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // ใส่ค่า Secret key ที่นี่ (Backend เท่านั้น)

if (!url || !key) {
  console.error('✗ ขาด SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ใน .env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = { supabase };
