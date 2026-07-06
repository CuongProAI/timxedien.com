// API tài khoản khách hàng TimXeDien — đăng ký / đăng nhập / lấy thông tin
// Lưu tại Blob: users/<sđt>.json. Token HMAC hạn 90 ngày.
// Nên đặt biến môi trường SESSION_SECRET (chuỗi ngẫu nhiên dài) khi deploy.
const { put, head } = require('@vercel/blob');
const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_KEY || 'txd-doi-secret-khi-deploy';
const TOKEN_BLOB = process.env.BLOB_READ_WRITE_TOKEN;

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

async function readBlobJson(pathname) {
  const meta = await head(pathname).catch(() => null);
  if (!meta) return null;
  const bust = meta.url + (meta.url.includes('?') ? '&' : '?') + '_=' + Date.now();
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

function hashPass(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

module.exports = async (req, res) => {
  try {
    // GET + Authorization → thông tin tài khoản hiện tại
    if (req.method === 'GET') {
      const auth = verifyToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
      if (!auth) return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
      const user = await readBlobJson(`users/${phoneKey(auth.p)}.json`);
      if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
      return res.status(200).json({ ok: true, user: { name: user.name, phone: user.phone, createdAt: user.createdAt } });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body || {};
    const action = String(body.action || '');
    const phone = phoneKey(body.phone);
    const password = String(body.password || '');

    if (!/^(84|0)\d{9,10}$/.test(phone)) {
      return res.status(400).json({ error: 'Số điện thoại chưa đúng định dạng Việt Nam.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu cần tối thiểu 6 ký tự.' });
    }

    const pathname = `users/${phone}.json`;

    if (action === 'register') {
      const name = String(body.name || '').trim().slice(0, 100);
      if (!name) return res.status(400).json({ error: 'Vui lòng nhập họ tên.' });
      const existed = await readBlobJson(pathname);
      if (existed) return res.status(409).json({ error: 'Số điện thoại này đã có tài khoản — hãy đăng nhập.' });

      const salt = crypto.randomBytes(16).toString('hex');
      const user = {
        phone, name, salt,
        passHash: hashPass(password, salt),
        createdAt: new Date().toISOString()
      };
      await writeBlobJson(pathname, user);
      return res.status(200).json({ ok: true, token: signToken(user), user: { name, phone } });
    }

    if (action === 'login') {
      const user = await readBlobJson(pathname);
      if (!user) return res.status(404).json({ error: 'Chưa có tài khoản với số này — hãy đăng ký.' });
      const tryHash = hashPass(password, user.salt);
      if (!crypto.timingSafeEqual(Buffer.from(tryHash), Buffer.from(user.passHash))) {
        return res.status(401).json({ error: 'Mật khẩu chưa đúng.' });
      }
      return res.status(200).json({ ok: true, token: signToken(user), user: { name: user.name, phone: user.phone } });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e) {
    console.error('auth error', e);
    return res.status(500).json({ error: 'Hệ thống bận, vui lòng thử lại.' });
  }
};

module.exports.verifyToken = verifyToken;
