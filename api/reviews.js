// Đánh giá khách hàng ở trang chủ — admin thêm/sửa/xoá trong trang quản trị.
// GET công khai (chỉ đánh giá đang bật, trừ khi gửi đúng x-admin-key thì trả cả cái đang ẩn).
// POST luôn cần ADMIN_KEY — action add | update | delete
const { supabase } = require('./_lib');

function isAdmin(req) {
  const key = req.headers['x-admin-key'] || '';
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

function rowToReview(row) {
  return { id: row.id, name: row.name, role: row.role, stars: row.stars, text: row.text, active: row.active, sortOrder: row.sort_order };
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      let q = supabase.from('reviews').select('*').order('sort_order', { ascending: true });
      if (!isAdmin(req)) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ ok: true, reviews: data.map(rowToReview) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!isAdmin(req)) return res.status(401).json({ error: 'Sai mật khẩu quản trị' });

    const body = req.body || {};
    const action = String(body.action || '');
    const clip = (v, n) => String(v || '').trim().slice(0, n);

    if (action === 'add') {
      const name = clip(body.name, 100), text = clip(body.text, 1000);
      if (!name || !text) return res.status(400).json({ error: 'Cần nhập đủ tên và nội dung đánh giá' });
      const { data: maxRow } = await supabase.from('reviews').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await supabase.from('reviews').insert({
        name, role: clip(body.role, 150), stars: Math.min(5, Math.max(1, Number(body.stars) || 5)),
        text, sort_order: (maxRow ? maxRow.sort_order : 0) + 1, active: body.active !== false
      }).select().single();
      if (error) throw error;
      return res.status(200).json({ ok: true, review: rowToReview(data) });
    }

    if (action === 'update') {
      const id = Number(body.id);
      if (!id) return res.status(400).json({ error: 'Thiếu id' });
      const patch = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) patch.name = clip(body.name, 100);
      if (body.role !== undefined) patch.role = clip(body.role, 150);
      if (body.stars !== undefined) patch.stars = Math.min(5, Math.max(1, Number(body.stars) || 5));
      if (body.text !== undefined) patch.text = clip(body.text, 1000);
      if (body.active !== undefined) patch.active = !!body.active;
      if (body.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder) || 0;
      const { data, error } = await supabase.from('reviews').update(patch).eq('id', id).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
      return res.status(200).json({ ok: true, review: rowToReview(data) });
    }

    if (action === 'delete') {
      const id = Number(body.id);
      if (!id) return res.status(400).json({ error: 'Thiếu id' });
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e) {
    console.error('reviews error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
