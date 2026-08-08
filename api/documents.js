// API nộp CCCD + GPLX để xác minh tài khoản — lưu vào Supabase Storage
// (bucket riêng tư "documents"), cập nhật trạng thái verify_status trong bảng "users".
// - GET  (Bearer token): xem trạng thái xác minh của chính mình
// - POST (Bearer token): nộp 1 ảnh — { docType: cccd_front|cccd_back|license, dataUrl }
const crypto = require('crypto');
const { supabase } = require('./_lib');

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_KEY || 'txd-doi-secret-khi-deploy';
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 4 * 1024 * 1024; // 4MB sau khi giải mã base64
const COLUMN = { cccd_front: 'id_front_path', cccd_back: 'id_back_path', license: 'license_path' };

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

module.exports = async (req, res) => {
  const auth = verifyToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  if (!auth) return res.status(401).json({ error: 'Cần đăng nhập' });
  const phone = phoneKey(auth.p);

  try {
    if (req.method === 'GET') {
      const { data: user, error } = await supabase
        .from('users')
        .select('id_front_path, id_back_path, license_path, verify_status, verify_note, verified_at')
        .eq('phone', phone).maybeSingle();
      if (error) throw error;
      if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
      return res.status(200).json({
        ok: true,
        verifyStatus: user.verify_status,
        verifyNote: user.verify_note,
        verifiedAt: user.verified_at,
        uploaded: {
          cccd_front: !!user.id_front_path,
          cccd_back: !!user.id_back_path,
          license: !!user.license_path
        }
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body || {};
    const docType = String(body.docType || '');
    if (!COLUMN[docType]) return res.status(400).json({ error: 'Loại giấy tờ không hợp lệ' });

    const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(String(body.dataUrl || ''));
    if (!m || !MIME_EXT[m[1]]) return res.status(400).json({ error: 'Ảnh không hợp lệ — chỉ nhận JPG/PNG/WEBP' });
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length) return res.status(400).json({ error: 'Ảnh trống' });
    if (buf.length > MAX_BYTES) return res.status(400).json({ error: 'Ảnh quá lớn — vui lòng chọn ảnh dưới 4MB' });

    const path = `${phone}/${docType}.${MIME_EXT[m[1]]}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(path, buf, {
      contentType: m[1], upsert: true
    });
    if (upErr) throw upErr;

    const { data: user, error } = await supabase
      .from('users').update({ [COLUMN[docType]]: path }).eq('phone', phone).select().single();
    if (error) throw error;

    const allUploaded = !!(user.id_front_path && user.id_back_path && user.license_path);
    if (allUploaded) {
      const { data: updated, error: pErr } = await supabase
        .from('users')
        .update({ verify_status: 'pending', verify_note: null, verified_at: null })
        .eq('phone', phone).select().single();
      if (pErr) throw pErr;
      return res.status(200).json({ ok: true, verifyStatus: updated.verify_status, allUploaded: true });
    }
    return res.status(200).json({ ok: true, verifyStatus: user.verify_status, allUploaded: false });
  } catch (e) {
    console.error('documents error', e);
    return res.status(500).json({ error: 'Hệ thống bận, vui lòng thử lại.' });
  }
};
