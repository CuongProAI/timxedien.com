// Câu hỏi thường gặp ở trang chủ — admin thêm/sửa/xoá trong trang quản trị.
// GET công khai (chỉ câu đang bật, trừ khi gửi đúng x-admin-key thì trả cả câu đang ẩn).
// POST luôn cần ADMIN_KEY — action add | update | delete
const { supabase } = require('./_lib');

function isAdmin(req) {
  const key = req.headers['x-admin-key'] || '';
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

function rowToFaq(row) {
  return { id: row.id, q: row.question, a: row.answer, active: row.active, sortOrder: row.sort_order };
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      let q = supabase.from('faqs').select('*').order('sort_order', { ascending: true });
      if (!isAdmin(req)) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ ok: true, faqs: data.map(rowToFaq) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!isAdmin(req)) return res.status(401).json({ error: 'Sai mật khẩu quản trị' });

    const body = req.body || {};
    const action = String(body.action || '');
    const clip = (v, n) => String(v || '').trim().slice(0, n);

    if (action === 'add') {
      const q = clip(body.q, 300), a = clip(body.a, 2000);
      if (!q || !a) return res.status(400).json({ error: 'Cần nhập đủ câu hỏi và câu trả lời' });
      const { data: maxRow } = await supabase.from('faqs').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await supabase.from('faqs').insert({
        question: q, answer: a, sort_order: (maxRow ? maxRow.sort_order : 0) + 1, active: body.active !== false
      }).select().single();
      if (error) throw error;
      return res.status(200).json({ ok: true, faq: rowToFaq(data) });
    }

    if (action === 'update') {
      const id = Number(body.id);
      if (!id) return res.status(400).json({ error: 'Thiếu id' });
      const patch = { updated_at: new Date().toISOString() };
      if (body.q !== undefined) patch.question = clip(body.q, 300);
      if (body.a !== undefined) patch.answer = clip(body.a, 2000);
      if (body.active !== undefined) patch.active = !!body.active;
      if (body.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder) || 0;
      const { data, error } = await supabase.from('faqs').update(patch).eq('id', id).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
      return res.status(200).json({ ok: true, faq: rowToFaq(data) });
    }

    if (action === 'delete') {
      const id = Number(body.id);
      if (!id) return res.status(400).json({ error: 'Thiếu id' });
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e) {
    console.error('faqs error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
