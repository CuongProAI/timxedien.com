// API quản trị kho xe (từng chiếc, theo biển số) — yêu cầu ADMIN_KEY
// - GET  [?carId=vf3][&status=available]: liệt kê xe (lọc theo dòng xe / trạng thái)
// - POST {action: add|update|delete|status}
const { supabase } = require('./_lib');

function rowToVehicle(v) {
  return {
    id: v.id, carId: v.car_id, carName: v.car_name, plate: v.plate,
    color: v.color, year: v.year, regNo: v.reg_no, regDate: v.reg_date, regOwner: v.reg_owner,
    status: v.status, note: v.note, createdAt: v.created_at
  };
}

module.exports = async (req, res) => {
  const key = req.headers['x-admin-key'] || (req.query && req.query.key) || '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Sai mật khẩu quản trị' });
  }

  try {
    if (req.method === 'GET') {
      let q = supabase.from('vehicles').select('*').order('car_id').order('plate');
      const { carId, status } = req.query || {};
      if (carId) q = q.eq('car_id', carId);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ ok: true, vehicles: data.map(rowToVehicle) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body || {};
    const action = String(body.action || '');

    if (action === 'add') {
      const carId = String(body.carId || '').trim();
      const carName = String(body.carName || '').trim();
      const plate = String(body.plate || '').trim().toUpperCase();
      if (!carId || !carName || !plate) {
        return res.status(400).json({ error: 'Vui lòng chọn dòng xe và nhập biển số.' });
      }
      const row = {
        car_id: carId, car_name: carName, plate,
        color: String(body.color || '').trim().slice(0, 40),
        year: String(body.year || '').trim().slice(0, 10),
        reg_no: String(body.regNo || '').trim().slice(0, 40),
        reg_date: body.regDate || null,
        reg_owner: String(body.regOwner || '').trim().slice(0, 150),
        status: 'available'
      };
      const { data, error } = await supabase.from('vehicles').insert(row).select().single();
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Biển số này đã có trong kho xe.' });
        throw error;
      }
      return res.status(200).json({ ok: true, vehicle: rowToVehicle(data) });
    }

    const id = Number(body.id);
    if (!id) return res.status(400).json({ error: 'Thiếu id xe' });

    if (action === 'update') {
      const patch = {
        car_id: String(body.carId || '').trim(),
        car_name: String(body.carName || '').trim(),
        plate: String(body.plate || '').trim().toUpperCase(),
        color: String(body.color || '').trim().slice(0, 40),
        year: String(body.year || '').trim().slice(0, 10),
        reg_no: String(body.regNo || '').trim().slice(0, 40),
        reg_date: body.regDate || null,
        reg_owner: String(body.regOwner || '').trim().slice(0, 150)
      };
      const { data, error } = await supabase.from('vehicles').update(patch).eq('id', id).select().maybeSingle();
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Biển số này đã có trong kho xe.' });
        throw error;
      }
      if (!data) return res.status(404).json({ error: 'Không tìm thấy xe' });
      return res.status(200).json({ ok: true, vehicle: rowToVehicle(data) });
    }

    if (action === 'status') {
      const allowed = ['available', 'rented', 'maintenance', 'inactive'];
      if (!allowed.includes(body.status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
      const { data, error } = await supabase.from('vehicles').update({ status: body.status }).eq('id', id).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Không tìm thấy xe' });
      return res.status(200).json({ ok: true, vehicle: rowToVehicle(data) });
    }

    if (action === 'delete') {
      const { data: used } = await supabase.from('orders').select('code').eq('vehicle_id', id).limit(1).maybeSingle();
      if (used) return res.status(409).json({ error: 'Xe đang gắn với đơn ' + used.code + ' — hãy gỡ xe khỏi đơn trước khi xoá.' });
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e) {
    console.error('vehicles error', e);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
};
