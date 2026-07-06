// API quản trị đơn/leads TimXeDien — yêu cầu biến môi trường ADMIN_KEY
const { list, head, del, put } = require('@vercel/blob');

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

async function fetchBlobJson(url) {
  // Kho private cần Authorization; kho public thì không
  const bust = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
  let r = await fetch(bust, { headers: { authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) r = await fetch(bust);
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

module.exports = async (req, res) => {
  const key = req.headers['x-admin-key'] || (req.query && req.query.key) || '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Sai mật khẩu quản trị' });
  }

  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: 'leads/', limit: 1000 });
      const leads = (await Promise.all(blobs.map(b => fetchBlobJson(b.url))))
        .filter(Boolean)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return res.status(200).json({ ok: true, leads });
    }

    if (req.method === 'POST') {
      const { action, id, status } = req.body || {};
      if (!id || !/^[a-z0-9-]+$/i.test(id)) return res.status(400).json({ error: 'Thiếu id' });
      const pathname = `leads/${id}.json`;
      const meta = await head(pathname).catch(() => null);
      if (!meta) return res.status(404).json({ error: 'Không tìm thấy đơn' });

      if (action === 'delete') {
        await del(meta.url);
        return res.status(200).json({ ok: true });
      }

      if (action === 'status' || action === 'note') {
        const lead = await fetchBlobJson(meta.url);
        if (!lead) return res.status(404).json({ error: 'Không đọc được đơn' });
        if (action === 'status') {
          const allowed = ['new', 'contacted', 'closed'];
          if (!allowed.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
          lead.status = status;
        } else {
          lead.note = String((req.body || {}).note || '').slice(0, 500);
        }
        lead.updatedAt = new Date().toISOString();
        const payload = JSON.stringify(lead);
        const opts = { contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true };
        try {
          await put(pathname, payload, { ...opts, access: 'private' });
        } catch (e) {
          await put(pathname, payload, { ...opts, access: 'public' });
        }
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Hành động không hợp lệ' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('leads error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
