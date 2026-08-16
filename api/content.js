// API gộp nội dung nhẹ của trang chủ: thông tin chung (site_config),
// câu hỏi thường gặp (faqs), đánh giá khách hàng (reviews), phụ kiện (accessories), chatbot tư vấn —
// gộp chung 1 file để không vượt giới hạn 12 Serverless Functions của gói Hobby trên Vercel.
// api/fleet.js tách riêng vì có thêm phần upload ảnh.
//
// GET  /api/content?type=config|faqs|reviews|accessories  — công khai (chỉ mục đang bật,
//      trừ khi gửi đúng x-admin-key thì trả cả mục đang ẩn)
// POST /api/content  { type, action: add|update|delete, ... }  — luôn cần ADMIN_KEY
// POST /api/content  { type: "chatbot", message, history }     — công khai, không cần ADMIN_KEY
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
function rowToAccessory(row) {
  return {
    id: row.id, name: row.name, price: Number(row.price) || 0, img: row.image_url,
    url: row.product_url, source: row.source || 'VinFast', active: row.active,
    sortOrder: row.sort_order
  };
}

const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

async function buildChatbotContext() {
  const [cfgRes, faqRes, carRes] = await Promise.all([
    supabase.from('site_config').select('*').eq('id', 1).maybeSingle(),
    supabase.from('faqs').select('question,answer').eq('active', true).order('sort_order', { ascending: true }),
    supabase.from('fleet_cars').select('name,segment_label,seats,range_text,price_day,price_month,over_km').eq('active', true).order('sort_order', { ascending: true })
  ]);
  const cfg = cfgRes.data || {};
  const faqs = faqRes.data || [];
  const cars = carRes.data || [];

  const carLines = cars.map((c) =>
    `- ${c.name} (${c.segment_label || ''}, ${c.seats || '?'} chỗ, ${c.range_text || '?'}): ${money(c.price_day)}/ngày, ${money(c.price_month)}/tháng, phụ phí vượt km ${money(c.over_km)}/km`
  ).join('\n') || '(chưa có dữ liệu xe)';

  const faqLines = faqs.map((f) => `Hỏi: ${f.question}\nĐáp: ${f.answer}`).join('\n\n') || '(chưa có FAQ)';

  return `Bạn là trợ lý tư vấn khách hàng trên website của "${cfg.brand || 'TimXeDien.com'}" — dịch vụ cho thuê xe điện tại Cần Thơ.
Thông tin liên hệ: Hotline ${cfg.hotline_display || cfg.hotline || ''}, Zalo ${cfg.zalo || ''}, Địa chỉ: ${cfg.address || ''}.

DANH SÁCH XE ĐANG CHO THUÊ:
${carLines}

CÂU HỎI THƯỜNG GẶP:
${faqLines}

QUY TẮC TRẢ LỜI:
- Trả lời bằng tiếng Việt, ngắn gọn, thân thiện, tối đa 4-5 câu.
- CHỈ dùng thông tin ở trên để trả lời về giá, xe, chính sách. Nếu không có đủ thông tin để trả lời chính xác, hãy nói thật là chưa rõ và mời khách gọi hotline hoặc nhắn Zalo — TUYỆT ĐỐI không bịa số liệu, giá cả hay chính sách.
- Chỉ tư vấn các chủ đề liên quan đến thuê xe điện của công ty, từ chối lịch sự nếu khách hỏi ngoài chủ đề.
- Trả lời bằng văn bản thuần, TUYỆT ĐỐI không dùng ký hiệu markdown (không **, không #, không danh sách gạch đầu dòng phức tạp) vì khung chat chỉ hiển thị được chữ thường.`;
}

async function handleChatbot(req, res, body) {
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Chatbot chưa được cấu hình' });

  const message = clip(body.message, 500);
  if (!message) return res.status(400).json({ error: 'Thiếu nội dung tin nhắn' });

  const rawHistory = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const history = rawHistory
    .filter((h) => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string')
    .map((h) => ({ role: h.role, parts: [{ text: clip(h.text, 500) }] }));

  try {
    const systemPrompt = await buildChatbotContext();
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.4 }
      })
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('gemini error', data);
      return res.status(502).json({ error: 'Chatbot đang bận, vui lòng thử lại hoặc nhắn Zalo giúp mình.' });
    }
    const cand = data && data.candidates && data.candidates[0];
    const parts = cand && cand.content && cand.content.parts;
    const reply = (parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
    if (reply && cand.finishReason && cand.finishReason !== 'STOP') console.error('gemini finishReason', cand.finishReason);
    if (!reply) return res.status(502).json({ error: 'Chatbot chưa trả lời được, vui lòng thử lại.' });
    return res.status(200).json({ ok: true, reply });
  } catch (e) {
    console.error('chatbot error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
}

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
      if (type === 'accessories') {
        let q = supabase.from('accessory_products').select('*').order('sort_order', { ascending: true });
        if (!isAdmin(req)) q = q.eq('active', true);
        const { data, error } = await q;
        if (error) throw error;
        return res.status(200).json({ ok: true, accessories: data.map(rowToAccessory) });
      }
      return res.status(400).json({ error: 'Thiếu type hợp lệ (config | faqs | reviews | accessories)' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body || {};
    const action = String(body.action || '');

    if (type === 'chatbot') return handleChatbot(req, res, body);

    if (!isAdmin(req)) return res.status(401).json({ error: 'Sai mật khẩu quản trị' });

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

    // ---------- Phụ kiện chính hãng ----------
    if (type === 'accessories') {
      if (action === 'add') {
        const id = clip(body.id, 100), name = clip(body.name, 250);
        const imageUrl = clip(body.img, 1000), productUrl = clip(body.url, 1000);
        if (!id || !name || !imageUrl || !productUrl) return res.status(400).json({ error: 'Cần nhập đủ mã, tên, ảnh và liên kết sản phẩm' });
        const { data: maxRow } = await supabase.from('accessory_products').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
        const { data, error } = await supabase.from('accessory_products').insert({
          id, name, price: Math.max(0, Number(body.price) || 0), image_url: imageUrl,
          product_url: productUrl, source: clip(body.source || 'VinFast', 100),
          sort_order: (maxRow ? maxRow.sort_order : 0) + 1, active: body.active !== false
        }).select().single();
        if (error) throw error;
        return res.status(200).json({ ok: true, accessory: rowToAccessory(data) });
      }
      if (action === 'update') {
        const id = clip(body.id, 100);
        if (!id) return res.status(400).json({ error: 'Thiếu mã sản phẩm' });
        const patch = { updated_at: new Date().toISOString() };
        if (body.name !== undefined) patch.name = clip(body.name, 250);
        if (body.price !== undefined) patch.price = Math.max(0, Number(body.price) || 0);
        if (body.img !== undefined) patch.image_url = clip(body.img, 1000);
        if (body.url !== undefined) patch.product_url = clip(body.url, 1000);
        if (body.source !== undefined) patch.source = clip(body.source, 100);
        if (body.active !== undefined) patch.active = !!body.active;
        if (body.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder) || 0;
        const { data, error } = await supabase.from('accessory_products').update(patch).eq('id', id).select().maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        return res.status(200).json({ ok: true, accessory: rowToAccessory(data) });
      }
      if (action === 'delete') {
        const id = clip(body.id, 100);
        if (!id) return res.status(400).json({ error: 'Thiếu mã sản phẩm' });
        const { error } = await supabase.from('accessory_products').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'Hành động không hợp lệ' });
    }

    return res.status(400).json({ error: 'Thiếu type hợp lệ (config | faqs | reviews | accessories)' });
  } catch (e) {
    console.error('content error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
