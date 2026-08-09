// API gộp 3 loại nội dung nhẹ của trang chủ: thông tin chung (site_config),
// câu hỏi thường gặp (faqs), đánh giá khách hàng (reviews) — gộp chung 1 file
// để không vượt giới hạn 12 Serverless Functions của gói Hobby trên Vercel.
// api/fleet.js tách riêng vì có thêm phần upload ảnh.
//
// GET  /api/content?type=config|faqs|reviews  — công khai (chỉ mục đang bật,
//      trừ khi gửi đúng x-admin-key thì trả cả mục đang ẩn)
// POST /api/content  { type, action: add|update|delete, ... }  — luôn cần ADMIN_KEY
const { supabase } = require('./_lib');

function isAdmin(req) {
  const key = req.headers['x-admin-key'] || '';
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}
const clip = (v, n) => String(v || '').trim().slice(0, n);

function rowToConfig(row) {
  if (!row) return null;
  return {
    brand: row.brand, slogan: row.slogan, hotline: row.hotline, hotlineDisplay: row.hotline_display,
    zalo: row.zalo, email: row.email, address: row.address, mapLink: row.map_link,
    facebook: row.facebook, tiktok: row.tiktok
  };
}
function rowToFaq(row) { return { id: row.id, q: row.question, a: row.answer, active: row.active, sortOrder: row.sort_order }; }
function rowToReview(row) { return { id: row.id, name: row.name, role: row.role, stars: row.stars, text: row.text, active: row.active, sortOrder: row.sort_order }; }

module.exports = async (req, res) => {
  try {
    const type = String((req.query && req.query.type) || (req.body && req.body.type) || '');

    if (req.method === 'GET') {
      if (type === 'config') {
        const { data, error } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle();
        if (error) throw error;
        return res.status(200).json({ ok: true, config: rowToConfig(data) });
      }
      if (type === 'faqs') {
        let q = supabase.from('faqs').select('*').order('sort_order', { ascending: true });
        if (!isAdmin(req)) q = q.eq('active', true);
        const { data, error } = await q;
        if (error) throw error;
        return res.status(200).json({ ok: true, faqs: data.map(rowToFaq) });
      }
      if (type === 'reviews') {
        let q = supabase.from('reviews').select('*').order('sort_order', { ascending: true });
        if (!isAdmin(req)) q = q.eq('active', true);
        const { data, error } = await q;
        if (error) throw error;
        return res.status(200).json({ ok: true, reviews: data.map(rowToReview) });
      }
      return res.status(400).json({ error: 'Thiếu type hợp lệ (config | faqs | reviews)' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!isAdmin(req)) return res.status(401).json({ error: 'Sai mật khẩu quản trị' });

    const body = req.body || {};
    const action = String(body.action || '');

    // ---------- Thông tin chung ----------
    if (type === 'config') {
      const patch = { id: 1, updated_at: new Date().toISOString() };
      const map = { brand: 'brand', slogan: 'slogan', hotline: 'hotline', hotlineDisplay: 'hotline_display', zalo: 'zalo', email: 'email', address: 'address', mapLink: 'map_link', facebook: 'facebook', tiktok: 'tiktok' };
      Object.keys(map).forEach((k) => { if (body[k] !== undefined) patch[map[k]] = clip(body[k], k === 'address' ? 300 : k === 'mapLink' ? 300 : 200); });
      const { data, error } = await supabase.from('site_config').upsert(patch).select().maybeSingle();
      if (error) throw error;
      return res.status(200).json({ ok: true, config: rowToConfig(data) });
    }

    // ---------- FAQ ----------
    if (type === 'faqs') {
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
    }

    // ---------- Đánh giá khách hàng ----------
    if (type === 'reviews') {
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
    }

    return res.status(400).json({ error: 'Thiếu type hợp lệ (config | faqs | reviews)' });
  } catch (e) {
    console.error('content error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
