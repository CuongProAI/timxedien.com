// Thư viện dùng chung cho các API — kết nối Supabase.
// File bắt đầu bằng "_" nên Vercel KHÔNG coi đây là 1 route riêng.
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = { supabase };
