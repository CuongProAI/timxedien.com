// Đội xe cho thuê hiển thị ở trang chủ — admin quản lý (giá, mô tả, ảnh, ẩn/hiện,
// thêm/xoá xe) trong trang quản trị, không cần sửa code nữa.
// - GET  : công khai, trả các xe đang bật (active) — trang web cần đọc mọi lúc.
//          Nếu gửi kèm x-admin-key đúng thì trả TẤT CẢ xe (kể cả đang ẩn) cho trang quản trị.
// - POST : luôn cần ADMIN_KEY — action add | update | delete | upload-image
const { supabase } = require('./_lib');

const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'car-images';

function isAdmin(req) {
  const key = req.headers['x-admin-key'] || '';
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

function rowToCar(row) {
  return {
    id: row.id,
    name: row.name,
    segment: row.segment,
    segmentLabel: row.segment_label,
    seats: row.seats,
    range: row.range_text,
    priceDay: Number(row.price_day) || 0,
    priceMonth: Number(row.price_month) || 0,
    overKm: Number(row.over_km) || 0,
    img: row.img_path,
    tag: row.tag || '',
    desc: row.description || '',
    features: Array.isArray(row.features) ? row.features : [],
    active: row.active,
    sortOrder: row.sort_order
  };
}

function slugify(name, existing) {
  let base = String(name || 'xe')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'xe';
  let id = base, n = 1;
  while (existing.has(id)) { id = `${base}-${++n}`; }
  return id;
}

async function ensureBucket() {
  try { await supabase.storage.createBucket(BUCKET, { public: true }); } catch (e) { /* đã tồn tại thì bỏ qua */ }
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      let q = supabase.from('fleet_cars').select('*').order('sort_order', { ascending: true });
      if (!isAdmin(req)) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ ok: true, cars: data.map(rowToCar) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!isAdmin(req)) return res.status(401).json({ error: 'Sai mật khẩu quản trị' });

    const body = req.body || {};
    const action = String(body.action || '');
    const clip = (v, n) => String(v || '').trim().slice(0, n);

    if (action === 'add') {
      const { data: existingRows, error: exErr } = await supabase.from('fleet_cars').select('id');
      if (exErr) throw exErr;
      const id = slugify(body.name, new Set((existingRows || []).map((r) => r.id)));
      const { data: maxRow } = await supabase.from('fleet_cars').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const patch = {
        id,
        name: clip(body.name, 100) || 'Xe mới',
        segment: clip(body.segment, 30) || 'suv',
        segment_label: clip(body.segmentLabel, 60),
        seats: Number(body.seats) || 5,
        range_text: clip(body.range, 40),
        price_day: Number(body.priceDay) || 0,
        price_month: Number(body.priceMonth) || 0,
        over_km: Number(body.overKm) || 0,
        img_path: clip(body.img, 300),
        tag: clip(body.tag, 30),
        description: clip(body.desc, 1000),
        features: Array.isArray(body.features) ? body.features.map((f) => String(f).slice(0, 200)).slice(0, 10) : [],
        sort_order: (maxRow ? maxRow.sort_order : 0) + 1,
        active: body.active !== false
      };
      const { data, error } = await supabase.from('fleet_cars').insert(patch).select().single();
      if (error) throw error;
      return res.status(200).json({ ok: true, car: rowToCar(data) });
    }

    if (action === 'update') {
      const id = String(body.id || '');
      if (!id) return res.status(400).json({ error: 'Thiếu id xe' });
      const patch = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) patch.name = clip(body.name, 100);
      if (body.segment !== undefined) patch.segment = clip(body.segment, 30);
      if (body.segmentLabel !== undefined) patch.segment_label = clip(body.segmentLabel, 60);
      if (body.seats !== undefined) patch.seats = Number(body.seats) || 0;
      if (body.range !== undefined) patch.range_text = clip(body.range, 40);
      if (body.priceDay !== undefined) patch.price_day = Number(body.priceDay) || 0;
      if (body.priceMonth !== undefined) patch.price_month = Number(body.priceMonth) || 0;
      if (body.overKm !== undefined) patch.over_km = Number(body.overKm) || 0;
      if (body.img !== undefined) patch.img_path = clip(body.img, 300);
      if (body.tag !== undefined) patch.tag = clip(body.tag, 30);
      if (body.desc !== undefined) patch.description = clip(body.desc, 1000);
      if (body.features !== undefined) patch.features = Array.isArray(body.features) ? body.features.map((f) => String(f).slice(0, 200)).slice(0, 10) : [];
      if (body.active !== undefined) patch.active = !!body.active;
      if (body.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder) || 0;

      const { data, error } = await supabase.from('fleet_cars').update(patch).eq('id', id).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Không tìm thấy xe' });
      return res.status(200).json({ ok: true, car: rowToCar(data) });
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      if (!id) return res.status(400).json({ error: 'Thiếu id xe' });
      const { error } = await supabase.from('fleet_cars').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'upload-image') {
      const id = String(body.id || '');
      const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(String(body.dataUrl || ''));
      if (!m || !MIME_EXT[m[1]]) return res.status(400).json({ error: 'Ảnh không hợp lệ — chỉ nhận JPG/PNG/WEBP' });
      const buf = Buffer.from(m[2], 'base64');
      if (!buf.length) return res.status(400).json({ error: 'Ảnh trống' });
      if (buf.length > MAX_BYTES) return res.status(400).json({ error: 'Ảnh quá lớn — vui lòng chọn ảnh dưới 5MB' });

      await ensureBucket();
      const path = `${id || 'tmp'}-${Date.now()}.${MIME_EXT[m[1]]}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: m[1], upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub.publicUrl;

      if (id) {
        const { error } = await supabase.from('fleet_cars').update({ img_path: url, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
      }
      return res.status(200).json({ ok: true, url });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e) {
    console.error('fleet error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
