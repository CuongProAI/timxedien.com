// API quản trị danh sách khách hàng đã đăng ký — yêu cầu ADMIN_KEY
// Lưu tại Supabase (bảng "users"), ảnh CCCD/GPLX ở Storage bucket "documents"
const { supabase } = require('./_lib');

const COLUMN = { cccd_front: 'id_front_path', cccd_back: 'id_back_path', license: 'license_path' };

function rowToUser(u) {
  return {
    name: u.name, phone: u.phone, createdAt: u.created_at,
    verifyStatus: u.verify_status, verifyNote: u.verify_note, verifiedAt: u.verified_at,
    uploaded: {
      cccd_front: !!u.id_front_path,
      cccd_back: !!u.id_back_path,
      license: !!u.license_path
    }
  };
}

module.exports = async (req, res) => {
  const key = req.headers['x-admin-key'] || (req.query && req.query.key) || '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Sai mật khẩu quản trị' });
  }

  try {
    if (req.method === 'GET') {
      // Không lấy salt/pass_hash — admin không cần và không nên thấy
      const { data, error } = await supabase
        .from('users')
        .select('name, phone, created_at, verify_status, verify_note, verified_at, id_front_path, id_back_path, license_path')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ ok: true, users: data.map(rowToUser) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body || {};
    const action = String(body.action || '');
    const phone = String(body.phone || '').replace(/\D/g, '');
    if (!phone) return res.status(400).json({ error: 'Thiếu số điện thoại' });

    // ----- Lấy link tạm xem 1 ảnh giấy tờ -----
    if (action === 'doc-url') {
      const col = COLUMN[body.docType];
      if (!col) return res.status(400).json({ error: 'Loại giấy tờ không hợp lệ' });
      const { data: user, error } = await supabase.from('users').select(col).eq('phone', phone).maybeSingle();
      if (error) throw error;
      const path = user && user[col];
      if (!path) return res.status(404).json({ error: 'Khách chưa nộp giấy tờ này' });
      const { data: signed, error: sErr } = await supabase.storage.from('documents').createSignedUrl(path, 300);
      if (sErr) throw sErr;
      return res.status(200).json({ ok: true, url: signed.signedUrl });
    }

    // ----- Duyệt / từ chối xác minh -----
    if (action === 'verify') {
      const status = body.status === 'verified' ? 'verified' : body.status === 'rejected' ? 'rejected' : null;
      if (!status) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
      const patch = {
        verify_status: status,
        verify_note: status === 'rejected' ? String(body.note || '').slice(0, 500) : null,
        verified_at: status === 'verified' ? new Date().toISOString() : null
      };
      const { data, error } = await supabase.from('users').update(patch).eq('phone', phone).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
      return res.status(200).json({ ok: true, user: rowToUser(data) });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e) {
    console.error('users error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
