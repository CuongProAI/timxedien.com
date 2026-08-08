// API đơn thuê xe TimXeDien — lưu tại Supabase (bảng "orders")
// - POST (không có action): khách tạo đơn mới (kèm token nếu đã đăng nhập)
// - GET  + Authorization: khách xem đơn của chính mình
// - GET  + x-admin-key:   admin xem toàn bộ đơn
// - POST + x-admin-key {action: status|note|delete}: admin xử lý đơn
const crypto = require('crypto');
const { supabase } = require('./_lib');

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_KEY || 'txd-doi-secret-khi-deploy';
const STATUSES = ['new', 'confirmed', 'delivering', 'renting', 'completed', 'cancelled'];

const phoneKey = (p) => String(p || '').replace(/\D/g, '');

function verifyToken(token) {
  try {
    const [payload, sig] = String(token || '').split('.');
    const good = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch (e) { return null; }
}

function rowToOrder(r) {
  return {
    code: r.code, name: r.name, phone: r.phone, car: r.car, carId: r.car_id,
    mode: r.mode, time: r.time_range, pickup: r.pickup, total: Number(r.total) || 0,
    note: r.note, adminNote: r.admin_note, userPhone: r.user_phone, status: r.status,
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

// Gắn contractSignedAt vào danh sách đơn (lấy lần ký gần nhất mỗi mã đơn)
async function withContractStatus(orders) {
  const codes = orders.map((o) => o.code);
  if (!codes.length) return orders;
  const { data, error } = await supabase.from('contracts').select('order_code, signed_at').in('order_code', codes);
  if (error || !data) return orders;
  const signedMap = {};
  data.forEach((c) => {
    if (!signedMap[c.order_code] || c.signed_at > signedMap[c.order_code]) signedMap[c.order_code] = c.signed_at;
  });
  return orders.map((o) => ({ ...o, contractSignedAt: signedMap[o.code] || null }));
}

async function notifyTelegram(text) {
  const tg = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!tg || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${tg}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text })
    });
  } catch (e) { /* không chặn */ }
}

module.exports = async (req, res) => {
  const adminKey = req.headers['x-admin-key'] || (req.query && req.query.key) || '';
  const isAdmin = !!process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY;
  const auth = verifyToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));

  try {
    // ----- Xem đơn -----
    if (req.method === 'GET') {
      if (isAdmin) {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ ok: true, orders: await withContractStatus(data.map(rowToOrder)) });
      }
      if (auth) {
        const { data, error } = await supabase
          .from('orders').select('*')
          .eq('user_phone', phoneKey(auth.p))
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ ok: true, orders: await withContractStatus(data.map(rowToOrder)) });
      }
      return res.status(401).json({ error: 'Cần đăng nhập' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body || {};

    // ----- Admin xử lý đơn -----
    if (body.action) {
      if (!isAdmin) return res.status(401).json({ error: 'Sai mật khẩu quản trị' });
      const code = String(body.code || '').toUpperCase();
      if (!/^TXD-[A-Z0-9]{4,10}$/.test(code)) return res.status(400).json({ error: 'Mã đơn không hợp lệ' });

      if (body.action === 'delete') {
        const { error } = await supabase.from('orders').delete().eq('code', code);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      const patch = { updated_at: new Date().toISOString() };
      if (body.action === 'status') {
        if (!STATUSES.includes(body.status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        patch.status = body.status;
      } else if (body.action === 'note') {
        patch.admin_note = String(body.note || '').slice(0, 500);
      } else {
        return res.status(400).json({ error: 'Hành động không hợp lệ' });
      }

      const { data, error } = await supabase.from('orders').update(patch).eq('code', code).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Không tìm thấy đơn ' + code });
      return res.status(200).json({ ok: true, order: rowToOrder(data) });
    }

    // ----- Khách tạo đơn mới -----
    const name = String(body.name || '').trim().slice(0, 100);
    const phone = String(body.phone || '').trim().slice(0, 15);
    if (!name || !/^(84|0)\d{9,10}$/.test(phoneKey(phone))) {
      return res.status(400).json({ error: 'Vui lòng nhập họ tên và số điện thoại hợp lệ.' });
    }
    let code = String(body.code || '').toUpperCase();
    if (!/^TXD-[A-Z0-9]{4,10}$/.test(code)) {
      code = 'TXD-' + crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
    }

    const row = {
      code, name, phone,
      car: String(body.car || '').slice(0, 80),
      car_id: String(body.carId || '').slice(0, 30),
      mode: body.mode === 'month' ? 'month' : 'day',
      time_range: String(body.time || '').slice(0, 120),
      pickup: String(body.pickup || '').slice(0, 120),
      total: Math.max(0, Number(body.total) || 0),
      note: String(body.note || '').slice(0, 500),
      user_phone: auth ? phoneKey(auth.p) : null,
      status: 'new'
    };
    const { data, error } = await supabase.from('orders').insert(row).select().single();
    if (error) throw error;
    const order = rowToOrder(data);

    await notifyTelegram(
      `🚗 ĐƠN THUÊ XE MỚI — TIMXEDIEN.COM\n🎫 ${code}\n👤 ${name}\n📞 ${phone}\n🚙 ${order.car}\n🗓 ${order.time}\n📍 ${order.pickup}\n💰 Tạm tính: ${order.total.toLocaleString('vi-VN')}đ${order.note ? '\n💬 ' + order.note : ''}${auth ? '\n👥 Khách có tài khoản' : ''}`
    );

    return res.status(200).json({ ok: true, code, order });
  } catch (e) {
    console.error('orders error', e);
    return res.status(500).json({ error: 'Hệ thống bận, vui lòng gọi hotline.' });
  }
};
