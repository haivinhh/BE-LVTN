const BaseRepository = require('../repositories/baseRepository');

const shipRepo = new BaseRepository('donvivanchuyen');

const shipController = {
  getAllDVVC: async (req, res, next) => {
    try { res.json(await shipRepo.findAll()); } catch (err) { next(err); }
  },
  addDVVC: async (req, res, next) => {
    try {
      const item = await shipRepo.insert({ tenDonVi: req.body.tenDonVi });
      res.status(201).json({ message: 'Thêm đơn vị vận chuyển thành công', id: item.idDonViVanChuyen });
    } catch (err) { next(err); }
  },
  updateDVVC: async (req, res, next) => {
    try {
      const updated = await shipRepo.update('idDonViVanChuyen', req.params.idDonViVanChuyen, { tenDonVi: req.body.tenDonVi });
      if (!updated) return res.status(404).json({ message: 'Không tìm thấy đơn vị vận chuyển' });
      res.json({ message: 'Cập nhật đơn vị vận chuyển thành công' });
    } catch (err) { next(err); }
  },
  deleteDVVC: async (req, res, next) => {
    try {
      const deleted = await shipRepo.delete('idDonViVanChuyen', req.params.idDonViVanChuyen);
      if (!deleted) return res.status(404).json({ message: 'Không tìm thấy đơn vị vận chuyển' });
      res.json({ message: 'Xóa đơn vị vận chuyển thành công' });
    } catch (err) { next(err); }
  },
};

module.exports = shipController;
