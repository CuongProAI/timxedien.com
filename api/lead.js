// API nhận đơn đặt xe & đăng ký tư vấn từ TimXeDien.com — lưu vào Vercel Blob
// Cần bật Vercel Blob cho project (Storage → Create Blob store).
// Tùy chọn: đặt biến môi trường TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID để nhận thông báo tức thì.
const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0, 100);
    const phone = String(body.phone || '').trim().slice(0, 15);
    const topic = String(body.topic || '').trim().slice(0, 150);
    const message = String(body.message || '').trim().slice(0, 1000);
    const source = String(body.source || 'timxedien').trim().slice(0, 60);
    // Chi tiết đơn đặt xe (nếu là booking) — giữ nguyên để admin xem
    const booking = body.booking && typeof body.booking === 'object' ? body.booking : null;

    if (!name || !/^[0-9+ .\-]{9,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Vui lòng nhập họ tên và số điện thoại hợp lệ.' });
    }

    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    const lead = {
      id, name, phone, topic, message, source, booking,
      status: 'new',
      createdAt: new Date().toISOString()
    };

    const payload = JSON.stringify(lead);
    const opts = { contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true };
    try {
      await put(`leads/${id}.json`, payload, { ...opts, access: 'private' });
    } catch (e) {
      // Kho blob cũ chỉ hỗ trợ access public
      await put(`leads/${id}.json`, payload, { ...opts, access: 'public' });
    }

    // Báo Telegram nếu đã cấu hình
    const tg = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (tg && chat) {
      try {
        const extra = booking
          ? `\n🚗 ${booking.car}\n🗓 ${booking.time}\n📍 ${booking.pickup}\n💰 Tạm tính: ${Number(booking.total || 0).toLocaleString('vi-VN')}đ\n🎫 Mã đơn: ${booking.code}`
          : '';
        await fetch(`https://api.telegram.org/bot${tg}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chat,
            text: `🔔 ${booking ? 'ĐƠN ĐẶT XE MỚI' : 'KHÁCH ĐĂNG KÝ TƯ VẤN'} — TIMXEDIEN.COM\n👤 ${name}\n📞 ${phone}\n🎯 ${topic}${extra}\n💬 ${message || '(không có lời nhắn)'}\n📍 Nguồn: ${source}`
          })
        });
      } catch (e) { /* không chặn việc lưu đơn */ }
    }

    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error('lead error', e);
    return res.status(500).json({ error: 'Hệ thống bận, vui lòng gọi hotline.' });
  }
};
