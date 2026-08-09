// Thông tin chung của website (hotline, địa chỉ, Zalo...) — admin sửa được
// trong trang quản trị, không cần đụng vào code. GET công khai (mọi trang cần
// đọc để hiện số hotline/Zalo...), POST cần ADMIN_KEY.
const { supabase } = require('./_lib');

function rowToConfig(row) {
  if (!row) return null;
  return {
    brand: row.brand,
    slogan: row.slogan,
    hotline: row.hotline,
    hotlineDisplay: row.hotline_display,
    zalo: row.zalo,
    email: row.email,
    address: row.address,
    mapLink: row.map_link,
    facebook: row.facebook,
    tiktok: row.tiktok
  };
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return res.status(200).json({ ok: true, config: rowToConfig(data) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const key = req.headers['x-admin-key'] || '';
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Sai mật khẩu quản trị' });
    }

    const body = req.body || {};
    const clip = (v, n) => (v === undefined ? undefined : String(v || '').trim().slice(0, n));
    const patch = {
      id: 1,
      brand: clip(body.brand, 100),
      slogan: clip(body.slogan, 200),
      hotline: clip(body.hotline, 20),
      hotline_display: clip(body.hotlineDisplay, 20),
      zalo: clip(body.zalo, 200),
      email: clip(body.email, 100),
      address: clip(body.address, 300),
      map_link: clip(body.mapLink, 300),
      facebook: clip(body.facebook, 200),
      tiktok: clip(body.tiktok, 200),
      updated_at: new Date().toISOString()
    };
    Object.keys(patch).forEach((k) => { if (patch[k] === undefined) delete patch[k]; });

    const { data, error } = await supabase.from('site_config').upsert(patch).select().maybeSingle();
    if (error) throw error;
    return res.status(200).json({ ok: true, config: rowToConfig(data) });
  } catch (e) {
    console.error('site-config error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
