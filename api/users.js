// API quản trị danh sách khách hàng đã đăng ký — yêu cầu ADMIN_KEY
// Lưu tại Supabase (bảng "users")
const { supabase } = require('./_lib');

module.exports = async (req, res) => {
  const key = req.headers['x-admin-key'] || (req.query && req.query.key) || '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Sai mật khẩu quản trị' });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Không lấy salt/pass_hash — admin không cần và không nên thấy
    const { data, error } = await supabase
      .from('users').select('name, phone, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const users = data.map((u) => ({ name: u.name, phone: u.phone, createdAt: u.created_at }));
    return res.status(200).json({ ok: true, users });
  } catch (e) {
    console.error('users error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
