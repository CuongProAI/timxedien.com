// API quản trị danh sách tài xế (dịch vụ thuê xe có tài xế) — yêu cầu ADMIN_KEY
// - GET: liệt kê tài xế
// - POST {action: add|update|delete|status}
const { supabase } = require('./_lib');

function rowToDriver(d) {
  return {
    id: d.id, name: d.name, phone: d.phone, licenseNumber: d.license_number,
    status: d.status, note: d.note, createdAt: d.created_at
  };
}

module.exports = async (req, res) => {
  const key = req.headers['x-admin-key'] || (req.query && req.query.key) || '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Sai mật khẩu quản trị' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('drivers').select('*').order('name');
      if (error) throw error;
      return res.status(200).json({ ok: true, drivers: data.map(rowToDriver) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body || {};
    const action = String(body.action || '');

    if (action === 'add') {
      const name = String(body.name || '').trim();
      const phone = String(body.phone || '').trim();
      if (!name || !phone) return res.status(400).json({ error: 'Vui lòng nhập tên và số điện thoại tài xế.' });
      const row = {
        name: name.slice(0, 100), phone: phone.slice(0, 15),
        license_number: String(body.licenseNumber || '').trim().slice(0, 20),
        note: String(body.note || '').trim().slice(0, 300),
        status: 'available'
      };
      const { data, error } = await supabase.from('drivers').insert(row).select().single();
      if (error) throw error;
      return res.status(200).json({ ok: true, driver: rowToDriver(data) });
    }

    const id = Number(body.id);
    if (!id) return res.status(400).json({ error: 'Thiếu id tài xế' });

    if (action === 'update') {
      const patch = {
        name: String(body.name || '').trim().slice(0, 100),
        phone: String(body.phone || '').trim().slice(0, 15),
        license_number: String(body.licenseNumber || '').trim().slice(0, 20),
        note: String(body.note || '').trim().slice(0, 300)
      };
      const { data, error } = await supabase.from('drivers').update(patch).eq('id', id).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Không tìm thấy tài xế' });
      return res.status(200).json({ ok: true, driver: rowToDriver(data) });
    }

    if (action === 'status') {
      const allowed = ['available', 'busy', 'off'];
      if (!allowed.includes(body.status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
      const { data, error } = await supabase.from('drivers').update({ status: body.status }).eq('id', id).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Không tìm thấy tài xế' });
      return res.status(200).json({ ok: true, driver: rowToDriver(data) });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e) {
    console.error('drivers error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
