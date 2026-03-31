const { dongDTService } = require('../services/categoryService');

const dongDTController = {
  getAlldongDT: async (req, res, next) => {
    try { res.json(await dongDTService.getAll()); } catch (err) { next(err); }
  },
  addDongDT: async (req, res, next) => {
    try {
      const item = await dongDTService.add({ tenDongDT: req.body.tenDongDT, loaiDienThoai: req.body.loaiDienThoai });
      res.status(201).json({ message: 'Thêm dòng điện thoại thành công', id: item.idDongDT });
    } catch (err) { next(err); }
  },
  updateDongDT: async (req, res, next) => {
    try {
      await dongDTService.update(req.params.idDongDT, { tenDongDT: req.body.tenDongDT, loaiDienThoai: req.body.loaiDienThoai });
      res.json({ message: 'Cập nhật dòng điện thoại thành công' });
    } catch (err) { next(err); }
  },
  deleteDongDT: async (req, res, next) => {
    try {
      const result = await dongDTService.delete(req.params.idDongDT);
      res.json(result);
    } catch (err) { next(err); }
  },
};

module.exports = dongDTController;
