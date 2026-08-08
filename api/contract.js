// API hợp đồng thuê xe điện — sinh nội dung theo đơn + ghi nhận xác nhận điện tử của khách
// - GET  ?code=TXD-XXX (Bearer token): xem nội dung hợp đồng của đơn (đã ký hay chưa)
// - POST { code }      (Bearer token): xác nhận ký — yêu cầu tài khoản đã xác minh CCCD/GPLX
const crypto = require('crypto');
const { supabase } = require('./_lib');

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_KEY || 'txd-doi-secret-khi-deploy';
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

function buildContract(order, user) {
  const now = new Date();
  return `HỢP ĐỒNG THUÊ XE ĐIỆN
Số: ${order.code}
Ngày lập: ${now.toLocaleString('vi-VN')}

BÊN CHO THUÊ (Bên A): TimXeDien.com
Hotline: 0939.099.018 · Email: timxedien@gmail.com
Địa chỉ: TP. Cần Thơ

BÊN THUÊ (Bên B):
Họ và tên: ${user.name}
Số điện thoại: ${user.phone}

THÔNG TIN XE THUÊ
Xe: ${order.car}
Thời gian thuê: ${order.time_range}
Điểm nhận xe: ${order.pickup}
Tổng giá thuê (tạm tính): ${Number(order.total || 0).toLocaleString('vi-VN')}đ

ĐIỀU KHOẢN
1. Bên B cam kết đã cung cấp CCCD và Giấy phép lái xe hợp lệ, đúng sự thật, chịu trách nhiệm trước pháp luật về tính chính xác của giấy tờ đã cung cấp và đã được TimXeDien.com xác minh.
2. Bên B có trách nhiệm sử dụng xe đúng mục đích, không giao xe cho người khác điều khiển, không dùng xe vào mục đích vi phạm pháp luật.
3. Tiền cọc giữ chỗ được trừ vào tổng tiền thuê; cọc trách nhiệm (nếu có) hoàn lại đầy đủ khi trả xe không phát sinh hư hỏng, vi phạm.
4. Xe hư hỏng, mất mát do lỗi Bên B trong thời gian thuê — Bên B bồi thường theo giá trị thực tế.
5. Bên A đảm bảo xe hoạt động tốt tại thời điểm giao xe; hỗ trợ đổi xe hoặc hoàn phần tiền chưa sử dụng nếu xe gặp sự cố không do lỗi Bên B.
6. Hợp đồng có hiệu lực kể từ thời điểm Bên B xác nhận điện tử dưới đây cho đến khi hoàn tất trả xe.

XÁC NHẬN ĐIỆN TỬ CỦA BÊN B
Bằng việc bấm "Xác nhận ký hợp đồng", Bên B xác nhận đã đọc, hiểu rõ và đồng ý với toàn bộ nội dung trên.`;
}

module.exports = async (req, res) => {
  const auth = verifyToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  if (!auth) return res.status(401).json({ error: 'Cần đăng nhập' });
  const phone = phoneKey(auth.p);

  const code = String((req.method === 'GET' ? (req.query || {}).code : (req.body || {}).code) || '').toUpperCase();
  if (!/^TXD-[A-Z0-9]{4,10}$/.test(code)) return res.status(400).json({ error: 'Mã đơn không hợp lệ' });

  try {
    const { data: order, error: oErr } = await supabase.from('orders').select('*').eq('code', code).maybeSingle();
    if (oErr) throw oErr;
    if (!order || phoneKey(order.user_phone) !== phone) {
      return res.status(404).json({ error: 'Không tìm thấy đơn của bạn' });
    }

    const { data: user, error: uErr } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
    if (uErr) throw uErr;
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });

    const { data: existing, error: cErr } = await supabase
      .from('contracts').select('*').eq('order_code', code)
      .order('signed_at', { ascending: false }).limit(1).maybeSingle();
    if (cErr) throw cErr;

    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        verifyStatus: user.verify_status,
        signed: !!existing,
        signedAt: existing ? existing.signed_at : null,
        content: existing ? existing.content : buildContract(order, user)
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (existing) {
      return res.status(200).json({ ok: true, signed: true, signedAt: existing.signed_at, content: existing.content });
    }
    if (user.verify_status !== 'verified') {
      return res.status(403).json({ error: 'Tài khoản chưa xác minh CCCD/GPLX — vui lòng nộp và chờ duyệt trước khi ký hợp đồng.' });
    }

    const content = buildContract(order, user);
    const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim();
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);

    const { data: row, error: insErr } = await supabase
      .from('contracts')
      .insert({ order_code: code, user_phone: phone, content, ip, user_agent: userAgent })
      .select().single();
    if (insErr) throw insErr;

    return res.status(200).json({ ok: true, signed: true, signedAt: row.signed_at, content: row.content });
  } catch (e) {
    console.error('contract error', e);
    return res.status(500).json({ error: 'Hệ thống bận, vui lòng thử lại.' });
  }
};
