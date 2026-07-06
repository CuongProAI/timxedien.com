// API đơn thuê xe TimXeDien — lưu tại Blob: orders/<mã đơn>.json
// - POST (không có action): khách tạo đơn mới (kèm token nếu đã đăng nhập)
// - GET  + Authorization: khách xem đơn của chính mình
// - GET  + x-admin-key:   admin xem toàn bộ đơn
// - POST + x-admin-key {action: status|note|delete}: admin xử lý đơn
const { put, head, del, list } = require('@vercel/blob');
const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_KEY || 'txd-doi-secret-khi-deploy';
const TOKEN_BLOB = process.env.BLOB_READ_WRITE_TOKEN;
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

async function fetchBlobJson(url) {
  const bust = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
  let r = await fetch(bust, { headers: { authorization: `Bearer ${TOKEN_BLOB}` } });
  if (!r.ok) r = await fetch(bust);
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

async function writeBlobJson(pathname, obj) {
  const payload = JSON.stringify(obj);
  const opts = { contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true };
  try {
    await put(pathname, payload, { ...opts, access: 'private' });
  } catch (e) {
    await put(pathname, payload, { ...opts, access: 'public' });
  }
}

async function allOrders() {
  const { blobs } = await list({ prefix: 'orders/', limit: 1000 });
  const orders = (await Promise.all(blobs.map((b) => fetchBlobJson(b.url)))).filter(Boolean);
  return orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
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
        return res.status(200).json({ ok: true, orders: await allOrders() });
      }
      if (auth) {
        const mine = (await allOrders()).filter((o) => phoneKey(o.phone) === phoneKey(auth.p));
        return res.status(200).json({ ok: true, orders: mine });
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
      const pathname = `orders/${code}.json`;
      const meta = await head(pathname).catch(() => null);
      if (!meta) return res.status(404).json({ error: 'Không tìm thấy đơn ' + code });

      if (body.action === 'delete') {
        await del(meta.url);
        return res.status(200).json({ ok: true });
      }
      const order = await fetchBlobJson(meta.url);
      if (!order) return res.status(404).json({ error: 'Không đọc được đơn' });

      if (body.action === 'status') {
        if (!STATUSES.includes(body.status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        order.status = body.status;
      } else if (body.action === 'note') {
        order.adminNote = String(body.note || '').slice(0, 500);
      } else {
        return res.status(400).json({ error: 'Hành động không hợp lệ' });
      }
      order.updatedAt = new Date().toISOString();
      await writeBlobJson(pathname, order);
      return res.status(200).json({ ok: true, order });
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

    const order = {
      code, name, phone,
      car: String(body.car || '').slice(0, 80),
      carId: String(body.carId || '').slice(0, 30),
      mode: body.mode === 'month' ? 'month' : 'day',
      time: String(body.time || '').slice(0, 120),
      pickup: String(body.pickup || '').slice(0, 120),
      total: Math.max(0, Number(body.total) || 0),
      note: String(body.note || '').slice(0, 500),
      userPhone: auth ? phoneKey(auth.p) : null,
      status: 'new',
      createdAt: new Date().toISOString()
    };
    await writeBlobJson(`orders/${code}.json`, order);

    await notifyTelegram(
      `🚗 ĐƠN THUÊ XE MỚI — TIMXEDIEN.COM\n🎫 ${code}\n👤 ${name}\n📞 ${phone}\n🚙 ${order.car}\n🗓 ${order.time}\n📍 ${order.pickup}\n💰 Tạm tính: ${order.total.toLocaleString('vi-VN')}đ${order.note ? '\n💬 ' + order.note : ''}${auth ? '\n👥 Khách có tài khoản' : ''}`
    );

    return res.status(200).json({ ok: true, code, order });
  } catch (e) {
    console.error('orders error', e);
    return res.status(500).json({ error: 'Hệ thống bận, vui lòng gọi hotline.' });
  }
};
