const { loaiDTService } = require('../services/categoryService');

const loaiDienThoaiController = {
  getAllloaiDT: async (req, res, next) => {
    try { res.json(await loaiDTService.getAll()); } catch (err) { next(err); }
  },
  addLoaiDT: async (req, res, next) => {
    try {
      const item = await loaiDTService.add({ tenLoaiDT: req.body.tenLoaiDT });
      res.status(201).json({ message: 'Thêm loại điện thoại thành công', id: item.idLoaiDT });
    } catch (err) { next(err); }
  },
  updateLoaiDT: async (req, res, next) => {
    try {
      await loaiDTService.update(req.params.idLoaiDT, { tenLoaiDT: req.body.tenLoaiDT });
      res.json({ message: 'Cập nhật loại điện thoại thành công' });
    } catch (err) { next(err); }
  },
  deleteLoaiDT: async (req, res, next) => {
    try {
      const result = await loaiDTService.delete(req.params.idLoaiDT);
      res.json(result);
    } catch (err) { next(err); }
  },
};

module.exports = loaiDienThoaiController;
