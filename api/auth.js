// API tài khoản khách hàng TimXeDien — đăng ký / đăng nhập / lấy thông tin
// Lưu tại Supabase (bảng "users"). Token HMAC hạn 90 ngày.
// Nên đặt biến môi trường SESSION_SECRET (chuỗi ngẫu nhiên dài) khi deploy.
const crypto = require('crypto');
const { supabase } = require('./_lib');

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_KEY || 'txd-doi-secret-khi-deploy';

const b64u = (s) => Buffer.from(s).toString('base64url');
const phoneKey = (p) => String(p || '').replace(/\D/g, '');

function signToken(user) {
  const payload = b64u(JSON.stringify({ p: user.phone, n: user.name, exp: Date.now() + 90 * 864e5 }));
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifyToken(token) {
  try {
    const [payload, sig] = String(token || '').split('.');
    const good = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data; // { p: phone, n: name }
  } catch (e) { return null; }
}

function hashPass(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

// Thông tin tài khoản trả về cho khách — không bao giờ gồm salt/pass_hash
function rowToProfile(u) {
  return {
    name: u.name, phone: u.phone, createdAt: u.created_at,
    idNumber: u.id_number, idIssuedAt: u.id_issued_at, idIssuedBy: u.id_issued_by,
    licenseNumber: u.license_number, licenseIssuedAt: u.license_issued_at, licenseIssuedBy: u.license_issued_by,
    addressPerm: u.address_perm, addressTemp: u.address_temp,
    verifyStatus: u.verify_status
  };
}

module.exports = async (req, res) => {
  try {
    // GET + Authorization → thông tin tài khoản hiện tại
    if (req.method === 'GET') {
      const auth = verifyToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
      if (!auth) return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
      const { data: user, error } = await supabase
        .from('users').select('*')
        .eq('phone', phoneKey(auth.p)).maybeSingle();
      if (error) throw error;
      if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
      return res.status(200).json({ ok: true, user: rowToProfile(user) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body || {};
    const action = String(body.action || '');

    // ----- Cập nhật họ tên (cần đăng nhập) -----
    if (action === 'update-name') {
      const auth = verifyToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
      if (!auth) return res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.' });
      const name = String(body.name || '').trim().slice(0, 100);
      if (!name) return res.status(400).json({ error: 'Vui lòng nhập họ tên.' });

      const { data: user, error } = await supabase
        .from('users').update({ name }).eq('phone', phoneKey(auth.p)).select().maybeSingle();
      if (error) throw error;
      if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
      return res.status(200).json({
        ok: true,
        token: signToken({ phone: user.phone, name: user.name }),
        user: { name: user.name, phone: user.phone }
      });
    }

    // ----- Cập nhật hồ sơ pháp lý: CCCD, GPLX, địa chỉ (cần đăng nhập) -----
    if (action === 'update-legal') {
      const auth = verifyToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
      if (!auth) return res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.' });

      const clip = (v, n) => String(v || '').trim().slice(0, n);
      const patch = {
        id_number: clip(body.idNumber, 20),
        id_issued_at: body.idIssuedAt || null,
        id_issued_by: clip(body.idIssuedBy, 150),
        license_number: clip(body.licenseNumber, 20),
        license_issued_at: body.licenseIssuedAt || null,
        license_issued_by: clip(body.licenseIssuedBy, 150),
        address_perm: clip(body.addressPerm, 250),
        address_temp: clip(body.addressTemp, 250)
      };
      const { data: user, error } = await supabase
        .from('users').update(patch).eq('phone', phoneKey(auth.p)).select().maybeSingle();
      if (error) throw error;
      if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
      return res.status(200).json({ ok: true, user: rowToProfile(user) });
    }

    // ----- Đổi mật khẩu (cần đăng nhập) -----
    if (action === 'change-password') {
      const auth = verifyToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
      if (!auth) return res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.' });
      const curPass = String(body.currentPassword || '');
      const newPass = String(body.newPassword || '');
      if (newPass.length < 6) return res.status(400).json({ error: 'Mật khẩu mới cần tối thiểu 6 ký tự.' });

      const { data: user, error } = await supabase.from('users').select('*').eq('phone', phoneKey(auth.p)).maybeSingle();
      if (error) throw error;
      if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });

      const tryHash = hashPass(curPass, user.salt);
      const a = Buffer.from(tryHash), b = Buffer.from(user.pass_hash);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Mật khẩu hiện tại chưa đúng.' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passHash = hashPass(newPass, salt);
      const { error: upErr } = await supabase.from('users').update({ salt, pass_hash: passHash }).eq('phone', user.phone);
      if (upErr) throw upErr;
      return res.status(200).json({ ok: true });
    }

    // ----- Đăng nhập / đăng ký bằng Google (Google Identity Services idToken) -----
    if (action === 'google') {
      const idToken = String(body.idToken || '');
      const clientId = process.env.GOOGLE_CLIENT_ID || '';
      if (!idToken) return res.status(400).json({ error: 'Thiếu thông tin đăng nhập Google.' });
      if (!clientId) return res.status(500).json({ error: 'Đăng nhập Google chưa được cấu hình trên hệ thống.' });

      let payload;
      try {
        const gr = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
        if (!gr.ok) throw new Error('bad token');
        payload = await gr.json();
      } catch (e) {
        return res.status(401).json({ error: 'Không xác thực được tài khoản Google, vui lòng thử lại.' });
      }
      if (payload.aud !== clientId || !payload.sub) {
        return res.status(401).json({ error: 'Không xác thực được tài khoản Google, vui lòng thử lại.' });
      }

      const googleId = String(payload.sub);
      const email = String(payload.email || '');
      const gName = String(payload.name || email || 'Khách Google').trim().slice(0, 100);

      const { data: existing, error: exErr } = await supabase.from('users').select('*').eq('google_id', googleId).maybeSingle();
      if (exErr) throw exErr;
      if (existing) {
        return res.status(200).json({ ok: true, token: signToken({ phone: existing.phone, name: existing.name }), user: rowToProfile(existing) });
      }

      const gPhone = phoneKey(body.phone);
      if (!gPhone) {
        return res.status(200).json({ ok: true, needPhone: true, suggestedName: gName });
      }
      if (!/^(84|0)\d{9,10}$/.test(gPhone)) {
        return res.status(400).json({ error: 'Số điện thoại chưa đúng định dạng Việt Nam.' });
      }

      const { data: byPhone, error: pErr } = await supabase.from('users').select('*').eq('phone', gPhone).maybeSingle();
      if (pErr) throw pErr;

      if (byPhone) {
        const { data: linked, error: lErr } = await supabase
          .from('users').update({ google_id: googleId, email: email || byPhone.email }).eq('phone', gPhone).select().maybeSingle();
        if (lErr) throw lErr;
        return res.status(200).json({ ok: true, token: signToken({ phone: linked.phone, name: linked.name }), user: rowToProfile(linked) });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passHash = hashPass(crypto.randomBytes(24).toString('hex'), salt);
      const { data: created, error: cErr } = await supabase
        .from('users').insert({ phone: gPhone, name: gName, salt, pass_hash: passHash, google_id: googleId, email }).select().maybeSingle();
      if (cErr) throw cErr;
      return res.status(200).json({ ok: true, token: signToken({ phone: created.phone, name: created.name }), user: rowToProfile(created) });
    }

    const phone = phoneKey(body.phone);
    const password = String(body.password || '');

    if (!/^(84|0)\d{9,10}$/.test(phone)) {
      return res.status(400).json({ error: 'Số điện thoại chưa đúng định dạng Việt Nam.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu cần tối thiểu 6 ký tự.' });
    }

    if (action === 'register') {
      const name = String(body.name || '').trim().slice(0, 100);
      if (!name) return res.status(400).json({ error: 'Vui lòng nhập họ tên.' });

      const { data: existed, error: exErr } = await supabase.from('users').select('phone').eq('phone', phone).maybeSingle();
      if (exErr) throw exErr;
      if (existed) return res.status(409).json({ error: 'Số điện thoại này đã có tài khoản — hãy đăng nhập.' });

      const salt = crypto.randomBytes(16).toString('hex');
      const passHash = hashPass(password, salt);
      const { error } = await supabase.from('users').insert({ phone, name, salt, pass_hash: passHash });
      if (error) throw error;
      return res.status(200).json({ ok: true, token: signToken({ phone, name }), user: { name, phone } });
    }

    if (action === 'login') {
      const { data: user, error } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
      if (error) throw error;
      if (!user) return res.status(404).json({ error: 'Chưa có tài khoản với số này — hãy đăng ký.' });
      const tryHash = hashPass(password, user.salt);
      const a = Buffer.from(tryHash), b = Buffer.from(user.pass_hash);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Mật khẩu chưa đúng.' });
      }
      return res.status(200).json({ ok: true, token: signToken({ phone: user.phone, name: user.name }), user: rowToProfile(user) });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e) {
    console.error('auth error', e);
    return res.status(500).json({ error: 'Hệ thống bận, vui lòng thử lại.' });
  }
};

module.exports.verifyToken = verifyToken;
