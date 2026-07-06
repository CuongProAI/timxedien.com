// API quản trị danh sách khách hàng đã đăng ký — yêu cầu ADMIN_KEY
const { list } = require('@vercel/blob');

const TOKEN_BLOB = process.env.BLOB_READ_WRITE_TOKEN;

async function fetchBlobJson(url) {
  const bust = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
  let r = await fetch(bust, { headers: { authorization: `Bearer ${TOKEN_BLOB}` } });
  if (!r.ok) r = await fetch(bust);
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

module.exports = async (req, res) => {
  const key = req.headers['x-admin-key'] || (req.query && req.query.key) || '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Sai mật khẩu quản trị' });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { blobs } = await list({ prefix: 'users/', limit: 1000 });
    const users = (await Promise.all(blobs.map((b) => fetchBlobJson(b.url))))
      .filter(Boolean)
      .map((u) => ({ name: u.name, phone: u.phone, createdAt: u.createdAt })) // không trả mật khẩu băm
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return res.status(200).json({ ok: true, users });
  } catch (e) {
    console.error('users error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
