// API hợp đồng thuê xe điện — sinh nội dung theo đơn + ghi nhận xác nhận điện tử của khách
// - GET  ?code=TXD-XXX (Bearer token): xem nội dung hợp đồng của đơn (đã ký hay chưa)
// - POST { code }      (Bearer token): xác nhận ký — yêu cầu tài khoản đã xác minh CCCD/GPLX
//   và đã điền hồ sơ pháp lý (CCCD, GPLX, địa chỉ) trong trang tài khoản.
const crypto = require('crypto');
const { supabase } = require('./_lib');

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_KEY || 'txd-doi-secret-khi-deploy';
const phoneKey = (p) => String(p || '').replace(/\D/g, '');
const BLANK = '……………………';

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

const val = (v) => (v ? v : BLANK);
function fmtDate(d) {
  if (!d) return BLANK;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? BLANK : dt.toLocaleDateString('vi-VN');
}

function buildContract(order, user) {
  const now = new Date();
  const total = Number(order.total || 0);

  return `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
-------------oOo-------------

HỢP ĐỒNG THUÊ XE ĐIỆN TỰ LÁI
(Số: ${order.code}/HĐCTXTL)

- Căn cứ Bộ luật Dân sự số 91/2015/QH13 có hiệu lực thi hành từ 01/01/2017;
- Căn cứ Luật Thương mại số 36/2005/QH11 có hiệu lực thi hành từ 01/01/2006;

Hôm nay, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}, tại TP. Cần Thơ, chúng tôi gồm:

BÊN CHO THUÊ XE (BÊN A): TIMXEDIEN.COM
Địa chỉ: TP. Cần Thơ
Điện thoại: 0939.099.018
Email: timxedien@gmail.com

BÊN THUÊ XE (BÊN B):
Họ và tên: ${user.name}
CCCD số: ${val(user.id_number)}  cấp ngày ${fmtDate(user.id_issued_at)}  tại ${val(user.id_issued_by)}
GPLX số: ${val(user.license_number)}  cấp ngày ${fmtDate(user.license_issued_at)}  tại ${val(user.license_issued_by)}
Địa chỉ thường trú: ${val(user.address_perm)}
Địa chỉ tạm trú: ${user.address_temp || '(không có)'}
Điện thoại: ${user.phone}

Sau khi bàn bạc, hai Bên cùng thống nhất ký kết Hợp đồng cho thuê xe ô tô tự lái với các điều khoản sau:

ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG
Bên B có nhu cầu thuê xe ô tô điện tự lái và Bên A đồng ý cho Bên B thuê 01 (một) chiếc xe ô tô có thông tin như sau:
Biển số xe: ${val(order.car_plate)}       Nhãn hiệu: ${order.car}
Sản xuất năm: ${val(order.car_year)}       Màu: ${val(order.car_color)}
Giấy đăng ký ô tô số: ${val(order.car_reg_no)}    Ngày cấp: ${fmtDate(order.car_reg_date)}    Tên chủ xe: ${order.car_reg_owner || 'TimXeDien.com'}

ĐIỀU 2: THỜI GIAN THUÊ, PHỤ PHÍ PHÁT SINH
Thời gian thuê: ${order.time_range}
Phụ phí phát sinh (nếu có): tính theo bảng giá hiện hành của Bên A đối với phần vượt giới hạn km hoặc vượt thời gian thuê đã thoả thuận.

ĐIỀU 3: GIÁ TRỊ HỢP ĐỒNG, HÌNH THỨC THANH TOÁN
Đơn giá thuê xe: theo bảng giá Bên A công bố tại thời điểm đặt xe (${order.mode === 'month' ? 'tính theo tháng' : 'tính theo ngày'}).
Giá trị hợp đồng (tạm tính): ${total.toLocaleString('vi-VN')}đ
Hình thức thanh toán: Bên B đã thanh toán tiền cọc giữ chỗ 500.000đ (trừ vào giá trị hợp đồng); số tiền còn lại Bên B thanh toán cho Bên A khi nhận xe bằng tiền mặt hoặc chuyển khoản.

ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A
1. Giao xe đúng tình trạng, đủ giấy tờ hợp lệ, sạc đầy pin tại thời điểm giao xe cho Bên B.
2. Hướng dẫn Bên B sử dụng xe, hệ thống sạc và cách xử lý tình huống khẩn cấp.
3. Hỗ trợ cứu hộ, đổi xe tương đương nếu xe gặp sự cố kỹ thuật không do lỗi Bên B.
4. Hoàn trả đầy đủ tiền cọc trách nhiệm (nếu có) khi Bên B trả xe đúng thoả thuận, không phát sinh hư hỏng.

ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B
1. Sử dụng xe đúng mục đích, đúng người đứng tên hợp đồng, không giao xe cho người khác điều khiển.
2. Không sử dụng xe vào mục đích vi phạm pháp luật, vận chuyển hàng cấm, đua xe.
3. Bảo quản xe, chịu trách nhiệm bồi thường theo giá trị thực tế nếu xe hư hỏng, mất mát do lỗi của Bên B trong thời gian thuê.
4. Trả xe đúng thời gian, địa điểm đã thoả thuận; báo ngay cho Bên A qua hotline nếu có sự cố phát sinh.
5. Thanh toán đầy đủ, đúng hạn giá trị hợp đồng và các khoản phụ phí phát sinh (nếu có) cho Bên A.

ĐIỀU 6: ĐIỀU KHOẢN CHUNG
Hợp đồng này được lập dưới hình thức điện tử. Việc Bên B xác nhận đồng ý bằng thao tác điện tử (tích chọn và xác nhận trên hệ thống TimXeDien.com) có giá trị pháp lý tương đương chữ ký tay, theo quy định của Luật Giao dịch điện tử. Hợp đồng có hiệu lực kể từ thời điểm Bên B xác nhận điện tử cho đến khi hai Bên hoàn tất thủ tục trả xe.

XÁC NHẬN ĐIỆN TỬ CỦA BÊN B
Bằng việc bấm "Xác nhận ký hợp đồng", Bên B xác nhận đã đọc, hiểu rõ và đồng ý với toàn bộ nội dung Hợp đồng nêu trên.`;
}

function legalComplete(user) {
  return !!(String(user.id_number || '').trim() && String(user.license_number || '').trim() && String(user.address_perm || '').trim());
}

module.exports = async (req, res) => {
  const adminKey = req.headers['x-admin-key'] || (req.query && req.query.key) || '';
  const isAdmin = !!process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY;

  // Admin: xem danh sách hợp đồng của toàn bộ đơn và mở bản đã ký/bản nháp.
  if (req.method === 'GET' && isAdmin) {
    try {
      const requestedCode = String(((req.query || {}).code) || '').toUpperCase();
      const { data: orders, error: oErr } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (oErr) throw oErr;
      const codes = (orders || []).map((o) => o.code);
      const { data: signedRows, error: cErr } = codes.length
        ? await supabase.from('contracts').select('*').in('order_code', codes).order('signed_at', { ascending: false })
        : { data: [], error: null };
      if (cErr) throw cErr;
      const latest = {};
      (signedRows || []).forEach((c) => { if (!latest[c.order_code]) latest[c.order_code] = c; });

      if (requestedCode) {
        if (!/^TXD-[A-Z0-9]{4,10}$/.test(requestedCode)) return res.status(400).json({ error: 'Mã đơn không hợp lệ' });
        const order = (orders || []).find((o) => o.code === requestedCode);
        if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn' });
        const contract = latest[requestedCode];
        if (contract) return res.status(200).json({ ok: true, signed: true, signedAt: contract.signed_at, content: contract.content });
        const phone = phoneKey(order.user_phone || order.phone);
        const { data: user, error: uErr } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
        if (uErr) throw uErr;
        if (!user) return res.status(404).json({ error: 'Khách chưa có tài khoản để lập hợp đồng' });
        return res.status(200).json({ ok: true, signed: false, signedAt: null, content: buildContract(order, user) });
      }

      const contracts = (orders || []).map((o) => {
        const c = latest[o.code];
        return {
          code: o.code, customer: o.name, phone: o.phone, car: o.car,
          time: o.time_range, total: Number(o.total) || 0, orderStatus: o.status,
          orderCreatedAt: o.created_at, signed: !!c, signedAt: c ? c.signed_at : null,
          hasAccount: !!o.user_phone
        };
      });
      return res.status(200).json({ ok: true, contracts });
    } catch (e) {
      console.error('admin contract error', e);
      return res.status(500).json({ error: 'Không tải được danh sách hợp đồng.' });
    }
  }

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
        legalComplete: legalComplete(user),
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
    if (!legalComplete(user)) {
      return res.status(400).json({ error: 'Vui lòng hoàn thiện hồ sơ pháp lý (số CCCD, GPLX, địa chỉ thường trú) trong trang tài khoản trước khi ký hợp đồng.' });
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
