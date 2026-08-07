// API quản trị đơn/leads TimXeDien — yêu cầu biến môi trường ADMIN_KEY
// Lưu tại Supabase (bảng "leads")
const { supabase } = require('./_lib');

function rowToLead(r) {
  return {
    id: r.id, name: r.name, phone: r.phone, topic: r.topic, message: r.message,
    source: r.source, booking: r.booking, status: r.status, note: r.note,
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

module.exports = async (req, res) => {
  const key = req.headers['x-admin-key'] || (req.query && req.query.key) || '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Sai mật khẩu quản trị' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ ok: true, leads: data.map(rowToLead) });
    }

    if (req.method === 'POST') {
      const { action, id, status } = req.body || {};
      if (!id || !/^[a-z0-9-]+$/i.test(id)) return res.status(400).json({ error: 'Thiếu id' });

      if (action === 'delete') {
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      if (action === 'status' || action === 'note') {
        const patch = { updated_at: new Date().toISOString() };
        if (action === 'status') {
          const allowed = ['new', 'contacted', 'closed'];
          if (!allowed.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
          patch.status = status;
        } else {
          patch.note = String((req.body || {}).note || '').slice(0, 500);
        }
        const { data, error } = await supabase.from('leads').update(patch).eq('id', id).select().maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Không tìm thấy đơn' });
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
