const { danhMucService } = require('../services/categoryService');

const danhMucSPController = {
  getAlldanhMucSP: async (req, res, next) => {
    try { res.json(await danhMucService.getAll()); } catch (err) { next(err); }
  },
  addDanhMucSP: async (req, res, next) => {
    try {
      const item = await danhMucService.add({ tenDanhMuc: req.body.tenDanhMuc });
      res.status(201).json({ message: 'Thêm danh mục sản phẩm thành công', id: item.idDanhMuc });
    } catch (err) { next(err); }
  },
  updateDanhMucSP: async (req, res, next) => {
    try {
      await danhMucService.update(req.params.idDanhMuc, { tenDanhMuc: req.body.tenDanhMuc });
      res.json({ message: 'Cập nhật danh mục sản phẩm thành công' });
    } catch (err) { next(err); }
  },
  deleteDanhMucSP: async (req, res, next) => {
    try {
      const result = await danhMucService.delete(req.params.idDanhMuc);
      res.json(result);
    } catch (err) { next(err); }
  },
};

module.exports = danhMucSPController;
